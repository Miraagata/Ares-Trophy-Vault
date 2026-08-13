import { PS3Trophy, ValidationIssue } from "../types";
import { isHighDifficultyTrophy } from "./difficultyHelper";
import { validateServerShutdown } from "./serverShutdownDb";

export function validateTrophySequence(
  trophies: PS3Trophy[],
  titleId?: string,
  gameTitle?: string
): {
  issues: ValidationIssue[];
  healthScore: number; // 0 to 100
} {
  const issues: ValidationIssue[] = [];
  const unlocked = trophies.filter((t) => t.unlocked && t.timestamp);

  // Check Server Shutdown Violations
  const shutdownIssues = validateServerShutdown(trophies, titleId, gameTitle);
  issues.push(...shutdownIssues);

  if (unlocked.length === 0) {
    return {
      issues: [
        ...issues,
        {
          id: "no-unlocked",
          severity: "info",
          title: "All Trophies Locked",
          message: "No trophies are currently unlocked. Use Quick Unlock or Smart Randomizer to unlock trophies.",
        },
      ],
      healthScore: shutdownIssues.length > 0 ? 50 : 100,
    };
  }

  // Parse timestamps
  const parsed = unlocked.map((t) => ({
    trophy: t,
    date: new Date(t.timestamp!),
    time: new Date(t.timestamp!).getTime(),
  }));

  // Sort by time
  parsed.sort((a, b) => a.time - b.time);

  // Check 1: Platinum trophy MUST be unlocked LAST
  const platinum = trophies.find((t) => t.type === "Platinum");
  if (platinum && platinum.unlocked && platinum.timestamp) {
    const platTime = new Date(platinum.timestamp).getTime();
    const latestOther = parsed.filter((p) => p.trophy.id !== platinum.id).pop();

    if (latestOther && platTime < latestOther.time) {
      issues.push({
        id: "plat-before-others",
        severity: "error",
        trophyId: platinum.id,
        trophyName: platinum.name,
        title: "Platinum Unlocked Out of Order!",
        message: `Platinum trophy "${platinum.name}" was unlocked BEFORE trophy "${latestOther.trophy.name}". Platinum must ALWAYS be the final trophy unlocked.`,
      });
    } else if (latestOther && platTime === latestOther.time) {
      issues.push({
        id: "plat-same-time",
        severity: "warning",
        trophyId: platinum.id,
        trophyName: platinum.name,
        title: "Platinum Exact Same Second as Final Trophy",
        message: `Platinum trophy was unlocked at the exact same second as "${latestOther.trophy.name}". PSN synchronization requires a 1-5 minute buffer.`,
      });
    }
  }

  // Check 2: Check for unlock bursts (< 5 seconds between multiple trophies)
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1];
    const curr = parsed[i];
    const diffSec = (curr.time - prev.time) / 1000;

    if (diffSec === 0) {
      issues.push({
        id: `burst-same-${i}`,
        severity: "error",
        trophyId: curr.trophy.id,
        trophyName: curr.trophy.name,
        title: "Duplicate Timestamp Burst",
        message: `"${curr.trophy.name}" and "${prev.trophy.name}" unlocked at the exact same millisecond (${curr.date.toLocaleTimeString()}). This flags auto-cheat filters.`,
      });
    } else if (diffSec < 3) {
      issues.push({
        id: `burst-fast-${i}`,
        severity: "warning",
        trophyId: curr.trophy.id,
        trophyName: curr.trophy.name,
        title: "Unrealistically Fast Unlock Interval",
        message: `Only ${diffSec.toFixed(1)} seconds elapsed between "${prev.trophy.name}" and "${curr.trophy.name}".`,
      });
    }
  }

  // Check 3: High Difficulty Trophy 24-Hour Campaign Interval Check
  const firstTrophyTime = parsed.length > 0 ? parsed[0].time : Date.now();
  parsed.forEach((p) => {
    if (isHighDifficultyTrophy(p.trophy)) {
      const hoursElapsed = (p.time - firstTrophyTime) / (1000 * 60 * 60);
      if (hoursElapsed < 24 && parsed.length > 1) {
        issues.push({
          id: `diff-24h-${p.trophy.id}`,
          severity: "warning",
          trophyId: p.trophy.id,
          trophyName: p.trophy.name,
          title: "High Difficulty Trophy Under 24 Hours",
          message: `Troféu de alta dificuldade "${p.trophy.name}" foi desbloqueado apenas ${hoursElapsed.toFixed(1)}h após o início da jornada. Recomendado mínimo de 24h de campanha para evitar sinalização na PSN.`,
        });
      }
    }
  });

  // Check 4: Future or invalid dates
  const now = Date.now();
  parsed.forEach((p) => {
    if (p.time > now + 3600000) {
      // 1 hour in future
      issues.push({
        id: `future-${p.trophy.id}`,
        severity: "error",
        trophyId: p.trophy.id,
        trophyName: p.trophy.name,
        title: "Timestamp in the Future",
        message: `Trophy "${p.trophy.name}" has timestamp set in the future (${p.date.toLocaleString()}).`,
      });
    } else if (p.time < new Date("2006-11-11").getTime()) {
      // Before PS3 launch date
      issues.push({
        id: `pre-ps3-${p.trophy.id}`,
        severity: "error",
        trophyId: p.trophy.id,
        trophyName: p.trophy.name,
        title: "Timestamp Before PS3 Release",
        message: `Trophy "${p.trophy.name}" date (${p.date.toLocaleDateString()}) is before the PS3 launch date (Nov 2006).`,
      });
    }
  });

  // Calculate health score
  let errorCount = issues.filter((i) => i.severity === "error").length;
  let warnCount = issues.filter((i) => i.severity === "warning").length;

  let healthScore = 100 - errorCount * 25 - warnCount * 10;
  if (healthScore < 0) healthScore = 0;

  return { issues, healthScore };
}
