// 친구 키우기 (tamagotchi-style care) — pure rules shared by server and client.
//
// Food is never bought: it is *earned* by the two habits this app wants more
// of. Writing diaries gives apples/cakes, studying English (vocab-app stars)
// gives cookies. Like gems, food is derived (earned − eaten), so there is no
// stock counter to drift; only meals are logged (pet_feedings).
//
// Fullness/happiness decay with time, so the buddy gets hungry again by the
// next day — a gentle reason to come back, write and study. It never dies or
// gets sick; at worst it looks hungry and moves slowly.

export type FoodId = 'apple' | 'cookie' | 'cake';

export interface Food {
  id: FoodId;
  emoji: string;
  name: string;
  fullness: number;
  happiness: number;
  xp: number;
  /** How the child earns it, shown under the food button. */
  howTo: string;
}

export const FOODS: Food[] = [
  { id: 'apple', emoji: '🍎', name: '사과', fullness: 25, happiness: 6, xp: 4, howTo: '일기 1개 = 🍎2' },
  { id: 'cookie', emoji: '🍪', name: '쿠키', fullness: 15, happiness: 15, xp: 4, howTo: '영어 ⭐5개 = 🍪1' },
  { id: 'cake', emoji: '🍰', name: '케이크', fullness: 35, happiness: 30, xp: 12, howTo: '일기 3개 = 🍰1' },
];

export function foodById(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}

/** A starter pack so the feature can be tried the moment it appears. */
export const WELCOME_FOOD: Record<FoodId, number> = { apple: 3, cookie: 3, cake: 1 };
export const APPLES_PER_DIARY = 2;
export const STARS_PER_COOKIE = 5;
export const DIARIES_PER_CAKE = 3;

/**
 * Food earned since the feature started. Counts are measured from a baseline
 * snapshot taken when the pet was first cared for, so it rewards *new*
 * diaries and study, not the backlog.
 */
export function earnedFood(diariesSince: number, starsSince: number): Record<FoodId, number> {
  const d = Math.max(0, diariesSince);
  const s = Math.max(0, starsSince);
  return {
    apple: WELCOME_FOOD.apple + d * APPLES_PER_DIARY,
    cookie: WELCOME_FOOD.cookie + Math.floor(s / STARS_PER_COOKIE),
    cake: WELCOME_FOOD.cake + Math.floor(d / DIARIES_PER_CAKE),
  };
}

export const DECAY_PER_HOUR = { fullness: 4, happiness: 2 };
/** Above this the buddy politely refuses food, so a stockpile isn't wasted. */
export const FULL_LIMIT = 92;

export function clampStat(v: number) {
  return Math.max(0, Math.min(100, v));
}

export function decayStat(value: number, perHour: number, since: Date, now = new Date()) {
  const hours = Math.max(0, (now.getTime() - since.getTime()) / 3_600_000);
  return clampStat(value - hours * perHour);
}

// ── 우정 레벨 & 재주 ─────────────────────────────────────────────────────

export type TrickId =
  | 'jump'
  | 'spin'
  | 'ball'
  | 'dance'
  | 'flip'
  | 'sing'
  | 'hearts'
  | 'dash'
  | 'giant'
  | 'aura';

export interface Trick {
  level: number;
  id: TrickId;
  name: string;
  emoji: string;
  desc: string;
}

/** One new trick per friendship level — the long-term "growing" goal. */
export const TRICKS: Trick[] = [
  { level: 1, id: 'jump', name: '폴짝 점프', emoji: '🦘', desc: '콕 누르면 폴짝 뛰어요' },
  { level: 2, id: 'spin', name: '빙글빙글', emoji: '🌀', desc: '제자리에서 빙글 돌아요' },
  { level: 3, id: 'ball', name: '공놀이', emoji: '⚽', desc: '크게 보기에서 공을 던져줄 수 있어요' },
  { level: 4, id: 'dance', name: '신나는 춤', emoji: '💃', desc: '기분이 좋으면 춤을 춰요' },
  { level: 5, id: 'flip', name: '공중제비', emoji: '🤸', desc: '높이 뛰어 한 바퀴 돌아요' },
  { level: 6, id: 'sing', name: '노래하기', emoji: '🎤', desc: '음표를 날리며 노래해요' },
  { level: 7, id: 'hearts', name: '하트 뿅뿅', emoji: '💖', desc: '하트를 잔뜩 뿌려요' },
  { level: 8, id: 'dash', name: '무지개 달리기', emoji: '🌈', desc: '무지개를 그리며 달려요' },
  { level: 9, id: 'giant', name: '거대해지기', emoji: '🦖', desc: '잠깐 엄청 커져요' },
  { level: 10, id: 'aura', name: '황금 오라', emoji: '👑', desc: '언제나 반짝반짝 빛나요' },
];

/** Total friendship XP needed to reach each level (index 0 = Lv.1). */
export const XP_LEVELS = [0, 15, 40, 80, 130, 200, 290, 400, 540, 720];

export interface FriendshipLevel {
  level: number;
  /** 0–100 toward the next level. */
  progress: number;
  /** XP still needed for the next level, or null at max. */
  toNext: number | null;
}

export function friendshipLevel(xp: number): FriendshipLevel {
  let idx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) idx = i;
  const next = XP_LEVELS[idx + 1];
  if (next === undefined) return { level: idx + 1, progress: 100, toNext: null };
  const span = next - XP_LEVELS[idx];
  return {
    level: idx + 1,
    progress: Math.round(((xp - XP_LEVELS[idx]) / span) * 100),
    toNext: next - xp,
  };
}

export function tricksForLevel(level: number): TrickId[] {
  return TRICKS.filter((t) => t.level <= level).map((t) => t.id);
}

export interface PetMood {
  hungry: boolean;
  sad: boolean;
  happy: boolean;
  fullnessLabel: string;
  happinessLabel: string;
}

export function moodOf(fullness: number, happiness: number): PetMood {
  return {
    hungry: fullness < 30,
    sad: happiness < 30,
    happy: happiness >= 70 && fullness >= 40,
    fullnessLabel:
      fullness < 30 ? '배고파요 ㅠㅠ' : fullness < 60 ? '조금 출출해요' : fullness < 85 ? '든든해요' : '배불러요!',
    happinessLabel:
      happiness < 30 ? '심심해요…' : happiness < 60 ? '괜찮아요' : happiness < 85 ? '기분 좋아요' : '최고로 신나요!',
  };
}

/** Shape returned by the pet server actions. */
export interface PetState {
  fullness: number;
  happiness: number;
  xp: number;
  foods: Array<{ id: FoodId; left: number; earned: number }>;
  /** Diaries still needed for the next cake. */
  nextCakeIn: number;
  vocabConnected: boolean;
}
