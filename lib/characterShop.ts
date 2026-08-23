// 캐릭터 꾸미기 상점 — catalog lives in code (easy to extend, no migration),
// ownership/equipment lives in the DB.
//
// Gems ("보석") are earned in the English-vocabulary app and read read-only
// from there (see lib/vocabGems.ts); spending is recorded here.

export type SlotId = 'character' | 'hat' | 'face' | 'held' | 'background' | 'effect';

export interface Slot {
  id: SlotId;
  label: string;
  emoji: string;
}

/** Equipment slots, in the order they're shown in the shop. */
export const SLOTS: Slot[] = [
  { id: 'character', label: '친구', emoji: '🐣' },
  { id: 'hat', label: '모자', emoji: '🎩' },
  { id: 'face', label: '얼굴', emoji: '🕶️' },
  { id: 'held', label: '손에 든 것', emoji: '🎈' },
  { id: 'background', label: '배경', emoji: '🌈' },
  { id: 'effect', label: '반짝임', emoji: '✨' },
];

export type Rarity = 'common' | 'rare' | 'epic' | 'legend';

export interface RarityStyle {
  label: string;
  ring: string;
  chip: string;
  glow: string;
}

export const RARITY: Record<Rarity, RarityStyle> = {
  common: { label: '노멀', ring: 'ring-slate-300', chip: 'bg-slate-100 text-slate-600', glow: 'shadow-slate-300/40' },
  rare: { label: '레어', ring: 'ring-sky-400', chip: 'bg-sky-100 text-sky-700', glow: 'shadow-sky-400/50' },
  epic: { label: '에픽', ring: 'ring-violet-400', chip: 'bg-violet-100 text-violet-700', glow: 'shadow-violet-400/50' },
  legend: { label: '레전드', ring: 'ring-amber-400', chip: 'bg-amber-100 text-amber-700', glow: 'shadow-amber-400/60' },
};

export interface ShopItem {
  id: string;
  slot: SlotId;
  name: string;
  /** Emoji shown on the character / in the shop tile. */
  emoji: string;
  cost: number;
  rarity: Rarity;
  /** Hidden items show only a silhouette until bought — the surprise is the point. */
  hidden?: boolean;
  /**
   * Vague hint shown while the item is still hidden. `name` always holds the
   * REAL name so that buying it actually reveals something.
   */
  teaser?: string;
  /** For 'background' items: a Tailwind gradient applied behind the character. */
  gradient?: string;
}

/**
 * The catalog. Costs are tuned against the vocab app's star values
 * (easy=1 / medium=2 / hard=3 per word), so a few study sessions buys
 * something, and legendary/hidden pieces are a real goal.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // ── 친구 (extra characters beyond the 8 free ones) ────────────────
  { id: 'char_dragon', slot: 'character', name: '아기 드래곤', emoji: '🐲', cost: 220, rarity: 'epic' },
  { id: 'char_axolotl', slot: 'character', name: '우파루파', emoji: '🦎', cost: 150, rarity: 'rare' },
  { id: 'char_owl', slot: 'character', name: '부엉이', emoji: '🦉', cost: 120, rarity: 'rare' },
  { id: 'char_hamster', slot: 'character', name: '햄찌', emoji: '🐹', cost: 90, rarity: 'common' },
  { id: 'char_frog', slot: 'character', name: '개구리', emoji: '🐸', cost: 90, rarity: 'common' },
  { id: 'char_whale', slot: 'character', name: '아기 고래', emoji: '🐳', cost: 180, rarity: 'epic' },
  { id: 'char_phoenix', slot: 'character', name: '불꽃새 피닉스', emoji: '🔥', cost: 400, rarity: 'legend', hidden: true, teaser: '전설의 새래요' },

  // ── 모자 ──────────────────────────────────────────────────────────
  { id: 'hat_party', slot: 'hat', name: '파티 모자', emoji: '🎉', cost: 30, rarity: 'common' },
  { id: 'hat_cap', slot: 'hat', name: '야구 모자', emoji: '🧢', cost: 35, rarity: 'common' },
  { id: 'hat_grad', slot: 'hat', name: '학사모', emoji: '🎓', cost: 60, rarity: 'rare' },
  { id: 'hat_crown', slot: 'hat', name: '왕관', emoji: '👑', cost: 140, rarity: 'epic' },
  { id: 'hat_flower', slot: 'hat', name: '꽃 왕관', emoji: '🌸', cost: 70, rarity: 'rare' },
  { id: 'hat_tiara', slot: 'hat', name: '반짝이는 티아라', emoji: '💎', cost: 260, rarity: 'legend', hidden: true, teaser: '머리에 쓰는 것' },

  // ── 얼굴 ──────────────────────────────────────────────────────────
  { id: 'face_glasses', slot: 'face', name: '동그란 안경', emoji: '👓', cost: 30, rarity: 'common' },
  { id: 'face_sun', slot: 'face', name: '선글라스', emoji: '🕶️', cost: 45, rarity: 'common' },
  { id: 'face_mask', slot: 'face', name: '가면', emoji: '🎭', cost: 80, rarity: 'rare' },
  { id: 'face_star', slot: 'face', name: '별 스티커', emoji: '⭐', cost: 40, rarity: 'common' },
  { id: 'face_rainbow', slot: 'face', name: '나비 페이스페인팅', emoji: '🦋', cost: 200, rarity: 'epic', hidden: true, teaser: '얼굴에 그리는 것' },

  // ── 손에 든 것 ────────────────────────────────────────────────────
  { id: 'held_balloon', slot: 'held', name: '풍선', emoji: '🎈', cost: 25, rarity: 'common' },
  { id: 'held_book', slot: 'held', name: '책', emoji: '📖', cost: 30, rarity: 'common' },
  { id: 'held_icecream', slot: 'held', name: '아이스크림', emoji: '🍦', cost: 35, rarity: 'common' },
  { id: 'held_wand', slot: 'held', name: '요술 지팡이', emoji: '🪄', cost: 110, rarity: 'epic' },
  { id: 'held_guitar', slot: 'held', name: '기타', emoji: '🎸', cost: 95, rarity: 'rare' },
  { id: 'held_trophy', slot: 'held', name: '트로피', emoji: '🏆', cost: 130, rarity: 'epic' },
  { id: 'held_sword', slot: 'held', name: '용사의 검', emoji: '⚔️', cost: 300, rarity: 'legend', hidden: true, teaser: '용감한 사람이 드는 것' },

  // ── 배경 ──────────────────────────────────────────────────────────
  { id: 'bg_sky', slot: 'background', name: '맑은 하늘', emoji: '☁️', cost: 40, rarity: 'common', gradient: 'from-sky-300 via-cyan-200 to-blue-300' },
  { id: 'bg_sunset', slot: 'background', name: '노을', emoji: '🌇', cost: 60, rarity: 'rare', gradient: 'from-orange-300 via-rose-300 to-purple-400' },
  { id: 'bg_forest', slot: 'background', name: '숲속', emoji: '🌲', cost: 60, rarity: 'rare', gradient: 'from-emerald-300 via-green-300 to-teal-400' },
  { id: 'bg_night', slot: 'background', name: '별이 빛나는 밤', emoji: '🌌', cost: 120, rarity: 'epic', gradient: 'from-indigo-500 via-purple-600 to-slate-800' },
  { id: 'bg_rainbow', slot: 'background', name: '무지개', emoji: '🌈', cost: 150, rarity: 'epic', gradient: 'from-red-300 via-yellow-300 to-violet-400' },
  { id: 'bg_space', slot: 'background', name: '우주 정거장', emoji: '🚀', cost: 320, rarity: 'legend', hidden: true, teaser: '아주 아주 먼 곳', gradient: 'from-slate-900 via-indigo-800 to-fuchsia-700' },

  // ── 반짝임 (effects) ──────────────────────────────────────────────
  { id: 'fx_sparkle', slot: 'effect', name: '반짝반짝', emoji: '✨', cost: 50, rarity: 'common' },
  { id: 'fx_hearts', slot: 'effect', name: '하트 뿅뿅', emoji: '💖', cost: 55, rarity: 'common' },
  { id: 'fx_stars', slot: 'effect', name: '별가루', emoji: '🌟', cost: 90, rarity: 'rare' },
  { id: 'fx_music', slot: 'effect', name: '음표', emoji: '🎵', cost: 70, rarity: 'rare' },
  { id: 'fx_fire', slot: 'effect', name: '불꽃', emoji: '🔥', cost: 160, rarity: 'epic' },
  { id: 'fx_galaxy', slot: 'effect', name: '은하수', emoji: '💫', cost: 280, rarity: 'legend', hidden: true, teaser: '밤하늘에 흐르는 것' },
];

export function itemById(id: string | null | undefined): ShopItem | undefined {
  if (!id) return undefined;
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function itemsForSlot(slot: SlotId): ShopItem[] {
  // Cheapest first so the affordable things are what a child sees first.
  return SHOP_ITEMS.filter((i) => i.slot === slot).sort((a, b) => a.cost - b.cost);
}

/** Name to show in the UI — hidden items stay a mystery until owned. */
export function displayName(item: ShopItem, owned: boolean): string {
  if (item.hidden && !owned) return '???';
  return item.name;
}

export const HIDDEN_COUNT = SHOP_ITEMS.filter((i) => i.hidden).length;
