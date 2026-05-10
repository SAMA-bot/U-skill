// XP-based level system
// Level n requires (n-1) * BASE_XP cumulative XP, with linear growth.
// Tiers give recognizable rank names.

const BASE_XP = 200; // XP per level

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelXp: number; // xp earned within the current level
  nextLevelXp: number;    // xp needed to reach next level (size of current level band)
  progressPct: number;    // 0–100 progress into current level
  totalXp: number;
}

const tierTitles = [
  "Novice",        // 1
  "Apprentice",    // 2
  "Learner",       // 3
  "Practitioner",  // 4
  "Skilled",       // 5
  "Proficient",    // 6
  "Expert",        // 7
  "Mentor",        // 8
  "Master",        // 9
  "Grandmaster",   // 10+
];

export function getLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp || 0);
  const level = Math.floor(safeXp / BASE_XP) + 1;
  const currentLevelXp = safeXp - (level - 1) * BASE_XP;
  const nextLevelXp = BASE_XP;
  const progressPct = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));
  const title = tierTitles[Math.min(level - 1, tierTitles.length - 1)];
  return { level, title, currentLevelXp, nextLevelXp, progressPct, totalXp: safeXp };
}
