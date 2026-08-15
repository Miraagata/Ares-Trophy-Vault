export interface PS3Trophy {
  id: number;
  name: string;
  description: string;
  detail?: string;
  type: string;
  hidden: boolean;
  unlocked: boolean;
  synced: boolean;
  timestamp?: string | null | Date;
  iconDataUrl?: string;
  groupId?: string;
}

export interface PS3TrophyGroup {
  id: string;
  name: string;
  iconDataUrl?: string;
}

export interface PS3GameInfo {
  titleId: string;
  title: string;
  accountId: string;
  groups: PS3TrophyGroup[];
  hasIcon: boolean;
  iconDataUrl: string;
  completionPercentage: number;
  unlockedTrophies: number;
  totalTrophies: number;
  earnedPoints: number;
  totalPoints: number;
  counts: {
    platinum: { unlocked: number, total: number };
    gold: { unlocked: number, total: number };
    silver: { unlocked: number, total: number };
    bronze: { unlocked: number, total: number };
  };
}

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning" | "info";
  trophyId: number;
  trophyName: string;
  title: string;
  message: string;
}

export interface RoutineConfig {
  enabled: boolean;
  sleepStart: string;
  sleepEnd: string;
  workStart: string;
  workEnd: string;
  minIntervalMins?: number;
  maxIntervalMins?: number;
  ensurePlatinumLast?: boolean;
}

export interface PresetGame {
  titleId: string;
  name: string;
}

export interface RandomizeConfig {
  startDate: string | Date;
  endDate?: string | Date;
}
