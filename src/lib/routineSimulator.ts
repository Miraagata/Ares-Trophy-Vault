import { PS3Trophy } from "../types";
import { isHighDifficultyTrophy, MIN_DIFFICULTY_GAP_MS } from "./difficultyHelper";

export interface RoutineConfig {
  enabled: boolean;
  sleepStart: string; // "23:30"
  sleepEnd: string;   // "07:30"
  workStart: string;  // "08:00"
  workEnd: string;    // "17:00"
  minIntervalMins?: number; // e.g. 15
  maxIntervalMins?: number; // e.g. 60
  ensurePlatinumLast?: boolean;
}

export const DEFAULT_ROUTINE_CONFIG: RoutineConfig = {
  enabled: true,
  sleepStart: "23:30",
  sleepEnd: "07:30",
  workStart: "08:00",
  workEnd: "17:00",
  minIntervalMins: 15,
  maxIntervalMins: 60,
  ensurePlatinumLast: true,
};

/**
 * Converts "HH:mm" string to minutes from midnight (0 - 1439).
 */
export function parseTimeMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
  return (h % 24) * 60 + (m % 60);
}

/**
 * Checks if a given time minute (0 - 1439) falls inside a window [start, end].
 */
export function isMinuteInWindow(curMins: number, startStr: string, endStr: string): { isBlocked: boolean; endMins: number; isOvernight: boolean } {
  const startMins = parseTimeMinutes(startStr);
  const endMins = parseTimeMinutes(endStr);

  if (startMins === endMins) {
    return { isBlocked: false, endMins, isOvernight: false };
  }

  const isOvernight = startMins > endMins;

  if (isOvernight) {
    // e.g. 23:30 (1410) to 07:30 (450)
    const isBlocked = curMins >= startMins || curMins < endMins;
    return { isBlocked, endMins, isOvernight: true };
  } else {
    // e.g. 08:00 (480) to 17:00 (1020)
    const isBlocked = curMins >= startMins && curMins < endMins;
    return { isBlocked, endMins, isOvernight: false };
  }
}

/**
 * Fast-forwards a date to the next available free time outside sleep and work windows.
 */
export function getNextFreeRoutineTime(inputDate: Date, config: RoutineConfig): Date {
  if (!config.enabled) return new Date(inputDate);

  let currentDate = new Date(inputDate);
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    attempts++;
    const curMins = currentDate.getHours() * 60 + currentDate.getMinutes();

    // Check Sleep Window
    const sleepCheck = isMinuteInWindow(curMins, config.sleepStart, config.sleepEnd);
    if (sleepCheck.isBlocked) {
      const endMins = sleepCheck.endMins;
      const targetDate = new Date(currentDate);

      if (sleepCheck.isOvernight && curMins >= parseTimeMinutes(config.sleepStart)) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      targetDate.setHours(Math.floor(endMins / 60), (endMins % 60) + 1, 0, 0);
      currentDate = targetDate;
      continue;
    }

    // Check Work Window
    const workCheck = isMinuteInWindow(curMins, config.workStart, config.workEnd);
    if (workCheck.isBlocked) {
      const endMins = workCheck.endMins;
      const targetDate = new Date(currentDate);

      if (workCheck.isOvernight && curMins >= parseTimeMinutes(config.workStart)) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      targetDate.setHours(Math.floor(endMins / 60), (endMins % 60) + 1, 0, 0);
      currentDate = targetDate;
      continue;
    }

    // Free time found
    break;
  }

  return currentDate;
}

/**
 * Distributes trophies sequentially with human routine jitter and blocked zone skipping.
 */
export function distributeTrophies(
  trophies: PS3Trophy[],
  startDateStr: string | Date,
  config: RoutineConfig
): PS3Trophy[] {
  if (trophies.length === 0) return trophies;

  const minInterval = (config.minIntervalMins ?? 15) * 60 * 1000;
  const maxInterval = (config.maxIntervalMins ?? 60) * 60 * 1000;

  let currentPointer = new Date(startDateStr);
  if (isNaN(currentPointer.getTime())) {
    currentPointer = new Date("2024-01-01T10:00:00Z");
  }

  currentPointer = getNextFreeRoutineTime(currentPointer, config);
  const journeyStartMs = currentPointer.getTime();

  const nonPlatinumTrophies = trophies.filter((t) => t.type !== "Platinum");
  const platinumTrophy = trophies.find((t) => t.type === "Platinum");

  const updatedMap = new Map<number, string>();

  nonPlatinumTrophies.forEach((t) => {
    const interval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    let nextMs = currentPointer.getTime() + interval;

    if (isHighDifficultyTrophy(t)) {
      nextMs = Math.max(nextMs, journeyStartMs + MIN_DIFFICULTY_GAP_MS);
    }

    currentPointer = getNextFreeRoutineTime(new Date(nextMs), config);
    updatedMap.set(t.id, currentPointer.toISOString());
  });

  if (platinumTrophy) {
    if (config.ensurePlatinumLast ?? true) {
      const platDelay = (15 + Math.floor(Math.random() * 15)) * 60 * 1000;
      let platTime = new Date(currentPointer.getTime() + platDelay);
      platTime = getNextFreeRoutineTime(platTime, config);
      updatedMap.set(platinumTrophy.id, platTime.toISOString());
    } else {
      const platDelay = 15 * 60 * 1000;
      let platTime = new Date(currentPointer.getTime() + platDelay);
      platTime = getNextFreeRoutineTime(platTime, config);
      updatedMap.set(platinumTrophy.id, platTime.toISOString());
    }
  }

  return trophies.map((t) => {
    const newTs = updatedMap.get(t.id);
    if (newTs) {
      return {
        ...t,
        unlocked: true,
        timestamp: newTs,
      };
    }
    return t;
  });
}
