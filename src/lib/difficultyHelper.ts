import { PS3Trophy } from "../types";

export const MIN_DIFFICULTY_GAP_MS = 60 * 60 * 1000; // 1 hour

export function isHighDifficultyTrophy(trophy: PS3Trophy): boolean {
  const hardKeywords = ["hard", "difícil", "crushing", "insane", "professional", "veteran", "nightmare", "platina", "platinum"];
  const name = trophy.name.toLowerCase();
  const detail = (trophy.description || "").toLowerCase();
  
  if (trophy.type === "Platinum" || name.includes("platinum") || name.includes("platina")) return true;
  
  return hardKeywords.some(kw => name.includes(kw) || detail.includes(kw));
}
