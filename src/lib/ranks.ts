export interface Rank {
  index: number;
  name: string;
  emoji: string;
  threshold: number; // points needed to reach this rank
}

export const RANKS: Rank[] = [
  { index: 0, name: "Novice Thinker",    emoji: "🌱", threshold: 0 },
  { index: 1, name: "Curious Mind",      emoji: "🔍", threshold: 100 },
  { index: 2, name: "Sharp Debater",     emoji: "⚔️", threshold: 300 },
  { index: 3, name: "Logician",          emoji: "♟️", threshold: 600 },
  { index: 4, name: "Rhetor",            emoji: "🎭", threshold: 1000 },
  { index: 5, name: "Philosopher",       emoji: "📜", threshold: 1600 },
  { index: 6, name: "Sage",              emoji: "🦉", threshold: 2400 },
  { index: 7, name: "Socrates Reborn",   emoji: "👑", threshold: 3500 },
];

export function rankFromScore(score: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.threshold) current = r;
  }
  return current;
}

export function nextRank(score: number): Rank | null {
  const current = rankFromScore(score);
  return RANKS[current.index + 1] ?? null;
}

export function progressToNextRank(score: number): number {
  const current = rankFromScore(score);
  const next = nextRank(score);
  if (!next) return 100;
  const span = next.threshold - current.threshold;
  const earned = score - current.threshold;
  return Math.min(100, Math.max(0, Math.round((earned / span) * 100)));
}
