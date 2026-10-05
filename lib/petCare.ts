// 친구 키우기 (tamagotchi-style care) — pure rules shared by server and client.
//
// Food comes from the two habits this app wants more of: writing diaries
// gives apples/cakes, studying English gives cookies — and the gems earned
// in the English app can buy any food in the 먹이 가게. Stock is derived
// (earned + bought/found − eaten), so only purchases and meals are logged.
//
// Stats decay with time so the buddy needs looking after again the next
// day — a gentle reason to come back, write and study. It never dies or gets
// sick; at worst it looks hungry, grubby or sleepy.

export type FoodId =
  | 'apple' | 'cookie' | 'cake'
  | 'carrot' | 'corn' | 'bamboo' | 'milk' | 'banana' | 'strawberry'
  | 'fish' | 'meat' | 'watermelon' | 'honey' | 'donut';

export interface Food {
  id: FoodId;
  emoji: string;
  name: string;
  fullness: number;
  happiness: number;
  xp: number;
  /** Price in 💎 at the food shop. */
  price: number;
  /** How the child earns it for free, if they can. */
  howTo?: string;
}

export const FOODS: Food[] = [
  { id: 'apple', emoji: '🍎', name: '사과', fullness: 25, happiness: 6, xp: 4, price: 8, howTo: '일기 1개 = 🍎2' },
  { id: 'cookie', emoji: '🍪', name: '쿠키', fullness: 15, happiness: 15, xp: 4, price: 10, howTo: '영어 ⭐5개 = 🍪1' },
  { id: 'cake', emoji: '🍰', name: '케이크', fullness: 35, happiness: 30, xp: 12, price: 30, howTo: '일기 3개 = 🍰1' },
  { id: 'carrot', emoji: '🥕', name: '당근', fullness: 20, happiness: 6, xp: 3, price: 6 },
  { id: 'corn', emoji: '🌽', name: '옥수수', fullness: 22, happiness: 6, xp: 3, price: 6 },
  { id: 'bamboo', emoji: '🎋', name: '대나무', fullness: 22, happiness: 6, xp: 3, price: 7 },
  { id: 'milk', emoji: '🥛', name: '우유', fullness: 15, happiness: 10, xp: 3, price: 7 },
  { id: 'banana', emoji: '🍌', name: '바나나', fullness: 22, happiness: 8, xp: 3, price: 8 },
  { id: 'strawberry', emoji: '🍓', name: '딸기', fullness: 15, happiness: 14, xp: 4, price: 10 },
  { id: 'fish', emoji: '🐟', name: '생선', fullness: 30, happiness: 10, xp: 5, price: 12 },
  { id: 'meat', emoji: '🍖', name: '고기', fullness: 35, happiness: 12, xp: 5, price: 14 },
  { id: 'watermelon', emoji: '🍉', name: '수박', fullness: 25, happiness: 14, xp: 4, price: 12 },
  { id: 'honey', emoji: '🍯', name: '꿀', fullness: 12, happiness: 20, xp: 5, price: 15 },
  { id: 'donut', emoji: '🍩', name: '도넛', fullness: 10, happiness: 25, xp: 5, price: 18 },
];

export function foodById(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}

/** Each buddy animal has a favourite — feeding it gets a big reaction. */
export const FAVORITE_FOOD: Record<string, FoodId> = {
  chick: 'corn',
  dog: 'meat',
  cat: 'fish',
  rabbit: 'carrot',
  panda: 'bamboo',
  fox: 'strawberry',
  penguin: 'fish',
  unicorn: 'honey',
};

/** A starter pack so the feature can be tried the moment it appears. */
export const WELCOME_FOOD: Partial<Record<FoodId, number>> = { apple: 3, cookie: 3, cake: 1 };
export const APPLES_PER_DIARY = 2;
export const STARS_PER_COOKIE = 5;
export const DIARIES_PER_CAKE = 3;

/**
 * Free food earned since the feature started. Counts are measured from a
 * baseline snapshot taken when the pet was first cared for, so it rewards
 * *new* diaries and study, not the backlog.
 */
export function earnedFood(diariesSince: number, starsSince: number): Partial<Record<FoodId, number>> {
  const d = Math.max(0, diariesSince);
  const s = Math.max(0, starsSince);
  return {
    apple: (WELCOME_FOOD.apple ?? 0) + d * APPLES_PER_DIARY,
    cookie: (WELCOME_FOOD.cookie ?? 0) + Math.floor(s / STARS_PER_COOKIE),
    cake: (WELCOME_FOOD.cake ?? 0) + Math.floor(d / DIARIES_PER_CAKE),
  };
}

// ── stats ──────────────────────────────────────────────────────────────

export type StatId = 'fullness' | 'happiness' | 'clean' | 'energy';

export const DECAY_PER_HOUR: Record<StatId, number> = {
  fullness: 4,
  happiness: 2,
  clean: 2.5,
  energy: 3,
};

/** Above this the buddy politely refuses food, so a stockpile isn't wasted. */
export const FULL_LIMIT = 92;

export function clampStat(v: number) {
  return Math.max(0, Math.min(100, v));
}

export function decayStat(value: number, perHour: number, since: Date, now = new Date()) {
  const hours = Math.max(0, (now.getTime() - since.getTime()) / 3_600_000);
  return clampStat(value - hours * perHour);
}

// ── care actions (each has its own scene in the care room) ─────────────

export type CareKind = 'bath' | 'teeth' | 'brush' | 'walk' | 'sleep';

export interface CareRule {
  kind: CareKind;
  name: string;
  emoji: string;
  /** Stat changes applied when done. */
  effect: Partial<Record<StatId, number>>;
  xp: number;
  /** Minutes before it counts again (prevents tapping for XP). */
  cooldownMin: number;
}

export const CARE: Record<CareKind, CareRule> = {
  bath: { kind: 'bath', name: '목욕', emoji: '🛁', effect: { clean: 100, happiness: 8 }, xp: 3, cooldownMin: 90 },
  teeth: { kind: 'teeth', name: '양치', emoji: '🪥', effect: { clean: 8, happiness: 4 }, xp: 1, cooldownMin: 120 },
  brush: { kind: 'brush', name: '빗질', emoji: '🪮', effect: { happiness: 12, clean: 10 }, xp: 2, cooldownMin: 60 },
  walk: { kind: 'walk', name: '산책', emoji: '🌳', effect: { happiness: 22, energy: -25, clean: -30, fullness: -10 }, xp: 4, cooldownMin: 45 },
  sleep: { kind: 'sleep', name: '잠자기', emoji: '🌙', effect: { energy: 100, happiness: 5 }, xp: 1, cooldownMin: 120 },
};

/** How many walks a day can turn up a free snack. */
export const WALK_FINDS_PER_DAY = 2;
export const WALK_FIND_POOL: FoodId[] = ['carrot', 'corn', 'banana', 'strawberry', 'apple', 'milk'];

/** Fur dye colours (CSS hue-rotate degrees). */
export const FUR_COLORS = [
  { hue: 0, name: '원래 색', swatch: '#F4D9A6' },
  { hue: 300, name: '분홍', swatch: '#F9A8D4' },
  { hue: 200, name: '하늘', swatch: '#93C5FD' },
  { hue: 250, name: '보라', swatch: '#C4B5FD' },
  { hue: 120, name: '민트', swatch: '#86EFAC' },
  { hue: 40, name: '노을', swatch: '#FDBA74' },
];

// ── 우정 레벨 & 재주 ─────────────────────────────────────────────────────

export type TrickId = 'jump' | 'spin' | 'ball' | 'dance' | 'flip' | 'sing' | 'hearts' | 'dash' | 'giant' | 'aura';

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
  dirty: boolean;
  tired: boolean;
  fullnessLabel: string;
  happinessLabel: string;
}

export function moodOf(fullness: number, happiness: number, clean = 100, energy = 100): PetMood {
  return {
    hungry: fullness < 30,
    sad: happiness < 30,
    happy: happiness >= 70 && fullness >= 40,
    dirty: clean < 35,
    tired: energy < 25,
    fullnessLabel:
      fullness < 30 ? '배고파요 ㅠㅠ' : fullness < 60 ? '조금 출출해요' : fullness < 85 ? '든든해요' : '배불러요!',
    happinessLabel:
      happiness < 30 ? '심심해요…' : happiness < 60 ? '괜찮아요' : happiness < 85 ? '기분 좋아요' : '최고로 신나요!',
  };
}

/** Today's care checklist — the "real pet owner" daily routine. */
export interface DailyCare {
  fed: boolean;
  bath: boolean;
  brush: boolean;
  walk: boolean;
  sleep: boolean;
}

/** Shape returned by the pet server actions. */
export interface PetState {
  fullness: number;
  happiness: number;
  clean: number;
  energy: number;
  xp: number;
  furHue: number;
  /** Fur is extra shiny until then (epoch ms), after brushing. */
  groomedUntil: number;
  /** Epoch ms of the last time each care action counted. */
  lastCare: Partial<Record<CareKind, number>>;
  today: DailyCare;
  foods: Array<{ id: FoodId; left: number }>;
  /** Diaries still needed for the next cake. */
  nextCakeIn: number;
  vocabConnected: boolean;
}
