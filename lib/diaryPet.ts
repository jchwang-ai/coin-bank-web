// 튼튼일기 buddy: a companion animal that visibly grows as the child writes.
//
// Deliberately kept as *derived* state: growth stage and earned stickers are
// computed from the number of completed diaries, so there is no separate
// counter to drift out of sync. The only thing stored is which animal the
// child picked.

export interface BuddyAnimal {
  id: string;
  emoji: string;
  name: string;
  /** Tailwind gradient for the buddy card background. */
  gradient: string;
}

export const BUDDY_ANIMALS: BuddyAnimal[] = [
  { id: 'chick', emoji: '🐣', name: '삐약이', gradient: 'from-amber-300 via-yellow-300 to-orange-300' },
  { id: 'dog', emoji: '🐶', name: '멍멍이', gradient: 'from-orange-300 via-amber-300 to-yellow-300' },
  { id: 'cat', emoji: '🐱', name: '야옹이', gradient: 'from-pink-300 via-rose-300 to-orange-300' },
  { id: 'rabbit', emoji: '🐰', name: '토실이', gradient: 'from-pink-200 via-fuchsia-200 to-violet-300' },
  { id: 'panda', emoji: '🐼', name: '판다', gradient: 'from-slate-300 via-gray-300 to-zinc-400' },
  { id: 'fox', emoji: '🦊', name: '여우', gradient: 'from-orange-400 via-amber-400 to-yellow-300' },
  { id: 'penguin', emoji: '🐧', name: '뽀글이', gradient: 'from-sky-300 via-cyan-300 to-blue-300' },
  { id: 'unicorn', emoji: '🦄', name: '유니콘', gradient: 'from-violet-300 via-purple-300 to-pink-300' },
];

export function animalOf(id: string | null | undefined): BuddyAnimal | undefined {
  if (!id) return undefined;
  return BUDDY_ANIMALS.find((a) => a.id === id);
}

export interface GrowthStage {
  level: number;
  name: string;
  /** Completed-diary count needed to reach this stage. */
  at: number;
  /** Relative emoji size for the buddy, in px. */
  size: number;
  /** Decoration shown around the buddy. */
  decor: string;
}

export const GROWTH_STAGES: GrowthStage[] = [
  { level: 1, name: '알', at: 0, size: 56, decor: '🌰' },
  { level: 2, name: '아기', at: 1, size: 68, decor: '🌱' },
  { level: 3, name: '어린이', at: 3, size: 84, decor: '🌿' },
  { level: 4, name: '씩씩이', at: 7, size: 100, decor: '🍀' },
  { level: 5, name: '멋쟁이', at: 14, size: 116, decor: '🌳' },
  { level: 6, name: '전설', at: 30, size: 132, decor: '👑' },
];

export interface StickerReward {
  at: number;
  emoji: string;
  label: string;
}

/** Milestone stickers — a small collection that fills in as the child writes. */
export const STICKERS: StickerReward[] = [
  { at: 1, emoji: '🌟', label: '첫 일기' },
  { at: 3, emoji: '🍪', label: '3일' },
  { at: 5, emoji: '🎈', label: '5일' },
  { at: 7, emoji: '🍭', label: '7일' },
  { at: 10, emoji: '🎁', label: '10일' },
  { at: 14, emoji: '🏅', label: '14일' },
  { at: 20, emoji: '🚀', label: '20일' },
  { at: 30, emoji: '🏆', label: '30일' },
  { at: 50, emoji: '💎', label: '50일' },
  { at: 100, emoji: '🦋', label: '100일' },
];

export interface BuddyGrowth {
  stage: GrowthStage;
  nextStage: GrowthStage | null;
  /** 0–100 progress toward the next stage. */
  progress: number;
  /** How many more diaries until the next stage. */
  remaining: number;
  earnedStickers: StickerReward[];
  nextSticker: StickerReward | null;
}

/** Everything about the buddy's current state, derived from completed diaries. */
export function computeGrowth(completedCount: number): BuddyGrowth {
  let stageIndex = 0;
  for (let i = 0; i < GROWTH_STAGES.length; i++) {
    if (completedCount >= GROWTH_STAGES[i].at) stageIndex = i;
  }
  const stage = GROWTH_STAGES[stageIndex];
  const nextStage = GROWTH_STAGES[stageIndex + 1] ?? null;

  let progress = 100;
  let remaining = 0;
  if (nextStage) {
    const span = nextStage.at - stage.at;
    const done = completedCount - stage.at;
    progress = span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100;
    remaining = Math.max(0, nextStage.at - completedCount);
  }

  return {
    stage,
    nextStage,
    progress,
    remaining,
    earnedStickers: STICKERS.filter((s) => completedCount >= s.at),
    nextSticker: STICKERS.find((s) => completedCount < s.at) ?? null,
  };
}

/** Stage level for a count — used to detect a level-up across a save. */
export function levelFor(completedCount: number): number {
  return computeGrowth(completedCount).stage.level;
}
