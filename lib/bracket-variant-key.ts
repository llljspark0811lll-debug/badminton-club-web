export type LevelMode = "none" | "separate" | "filter";
export type BracketMode = "STANDARD" | "TEAM_BATTLE";
export type BracketDoublesMode = "RANDOM" | "MIXED_PRIORITY" | "GENDER_SEPARATED";

export function normalizeBracketDoublesMode(
  value: string | null | undefined,
  separateByGender = false
): BracketDoublesMode {
  if (value === "MIXED_PRIORITY" || value === "GENDER_SEPARATED" || value === "RANDOM") {
    return value;
  }
  return separateByGender ? "GENDER_SEPARATED" : "RANDOM";
}

export function getVariantKey(
  mode: BracketMode,
  levelMode: LevelMode = "none",
  doublesMode: BracketDoublesMode = "RANDOM"
): string {
  return mode === "STANDARD"
    ? `STANDARD_${levelMode}_${doublesMode}`
    : `TEAM_BATTLE_${doublesMode}`;
}

export function normalizeLevelMode(value: string | null | undefined): LevelMode {
  if (value === "separate" || value === "filter") return value;
  return "none";
}
