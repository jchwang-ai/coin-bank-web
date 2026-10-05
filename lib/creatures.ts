// How each stage creature looks and moves.
//
// Kept apart from the shop catalog so prices/names stay simple there. Every
// item resolves to a Creature: known ids get a hand-tuned entry, anything
// else (including child-invented items) is inferred from its emoji, name and
// motion, so nothing ever renders as a frozen sticker.

import { ShopItem } from './characterShop';
import { BuddyAnimal } from './diaryPet';

/**
 * Movement style on the stage.
 *  walk    — strolls on the ground       hop    — bounces along the ground
 *  crawl   — slow creep (snail, turtle)  fly    — flaps, glides, lands, pecks (birds)
 *  flutter — erratic butterfly flight    buzz   — darting insect flight with hovering
 *  drift   — slow glowing float          swim   — undulates through the air in a bubble
 *  orbit   — circles the main buddy
 */
export type Loco = 'walk' | 'hop' | 'crawl' | 'fly' | 'flutter' | 'buzz' | 'drift' | 'swim' | 'orbit';

export type BirdSpecies = 'songbird' | 'sparrow' | 'swallow' | 'parrot' | 'hummingbird' | 'owl' | 'phoenix';

export type Art =
  | { kind: 'emoji'; emoji: string }
  | { kind: 'bird'; species: BirdSpecies }
  | { kind: 'butterfly'; wing: string; wing2: string; edge: string }
  | { kind: 'bee' }
  | { kind: 'dragonfly' }
  | { kind: 'firefly' }
  | { kind: 'fish'; body: string; fin: string; stripes?: boolean };

export type Voice = 'tweet' | 'buzz' | 'squeak' | 'roar' | 'blub' | 'pop';

export interface Creature {
  loco: Loco;
  art: Art;
  /** Base size in px at stage scale 1. */
  size: number;
  /** Cruise speed in px/s at stage scale 1. */
  speed: number;
  voice: Voice;
  /** Leaves a particle trail while moving (phoenix embers, fish bubbles…). */
  trail?: string;
}

const emoji = (e: string): Art => ({ kind: 'emoji', emoji: e });
const bird = (species: BirdSpecies): Art => ({ kind: 'bird', species });

/** Hand-tuned creatures for catalog items. */
const BY_ID: Record<string, Creature> = {
  // 친구 (characters)
  char_dragon: { loco: 'fly', art: emoji('🐉'), size: 66, speed: 70, voice: 'roar', trail: '✨' },
  char_axolotl: { loco: 'crawl', art: emoji('🦎'), size: 50, speed: 30, voice: 'squeak' },
  char_owl: { loco: 'fly', art: bird('owl'), size: 58, speed: 60, voice: 'tweet' },
  char_hamster: { loco: 'hop', art: emoji('🐹'), size: 46, speed: 60, voice: 'squeak' },
  char_frog: { loco: 'hop', art: emoji('🐸'), size: 48, speed: 70, voice: 'pop' },
  char_koala: { loco: 'walk', art: emoji('🐨'), size: 54, speed: 28, voice: 'squeak' },
  char_swan: { loco: 'walk', art: emoji('🦢'), size: 58, speed: 32, voice: 'tweet' },
  char_whale: { loco: 'swim', art: emoji('🐳'), size: 66, speed: 34, voice: 'blub', trail: '🫧' },
  char_dino: { loco: 'walk', art: emoji('🦖'), size: 62, speed: 48, voice: 'roar' },
  char_peacock: { loco: 'walk', art: emoji('🦚'), size: 62, speed: 32, voice: 'tweet' },
  char_phoenix: { loco: 'fly', art: bird('phoenix'), size: 70, speed: 110, voice: 'tweet', trail: '🔥' },

  // 새
  comp_sparrow: { loco: 'fly', art: bird('sparrow'), size: 40, speed: 95, voice: 'tweet' },
  comp_bird: { loco: 'fly', art: bird('songbird'), size: 42, speed: 90, voice: 'tweet' },
  comp_swallow: { loco: 'fly', art: bird('swallow'), size: 44, speed: 150, voice: 'tweet' },
  comp_parrot: { loco: 'fly', art: bird('parrot'), size: 52, speed: 85, voice: 'tweet' },
  comp_hummingbird: { loco: 'fly', art: bird('hummingbird'), size: 34, speed: 120, voice: 'tweet' },

  // 곤충
  comp_butterfly: { loco: 'flutter', art: { kind: 'butterfly', wing: '#FFD43B', wing2: '#FFA94D', edge: '#5C3D1E' }, size: 38, speed: 55, voice: 'pop' },
  comp_morpho: { loco: 'flutter', art: { kind: 'butterfly', wing: '#2F9BFF', wing2: '#6741D9', edge: '#101A3A' }, size: 46, speed: 60, voice: 'pop', trail: '✨' },
  face_rainbow: { loco: 'flutter', art: { kind: 'butterfly', wing: '#FF8FC7', wing2: '#B197FC', edge: '#5F3DC4' }, size: 42, speed: 58, voice: 'pop' },
  comp_bee: { loco: 'buzz', art: { kind: 'bee' }, size: 34, speed: 110, voice: 'buzz' },
  comp_dragonfly: { loco: 'buzz', art: { kind: 'dragonfly' }, size: 50, speed: 130, voice: 'buzz' },
  comp_firefly: { loco: 'drift', art: { kind: 'firefly' }, size: 30, speed: 30, voice: 'pop' },
  comp_ladybug: { loco: 'crawl', art: emoji('🐞'), size: 28, speed: 26, voice: 'pop' },

  // 땅 친구
  comp_snail: { loco: 'crawl', art: emoji('🐌'), size: 34, speed: 9, voice: 'pop' },
  comp_turtle: { loco: 'crawl', art: emoji('🐢'), size: 42, speed: 16, voice: 'pop' },
  comp_chick: { loco: 'hop', art: emoji('🐥'), size: 36, speed: 55, voice: 'tweet' },
  comp_bunny: { loco: 'hop', art: emoji('🐇'), size: 44, speed: 80, voice: 'squeak' },
  comp_puppy: { loco: 'walk', art: emoji('🐕'), size: 50, speed: 70, voice: 'squeak' },
  comp_kitten: { loco: 'walk', art: emoji('🐈'), size: 46, speed: 55, voice: 'squeak' },

  // 물 친구
  comp_fish: { loco: 'swim', art: { kind: 'fish', body: '#FF922B', fin: '#FFF3BF', stripes: true }, size: 46, speed: 40, voice: 'blub', trail: '🫧' },
  comp_goldfish: { loco: 'swim', art: { kind: 'fish', body: '#FCC419', fin: '#FF6B6B' }, size: 42, speed: 36, voice: 'blub', trail: '🫧' },

  // 하늘
  comp_moon: { loco: 'orbit', art: emoji('🌙'), size: 30, speed: 0, voice: 'pop' },
  comp_star: { loco: 'orbit', art: emoji('⭐'), size: 28, speed: 0, voice: 'pop' },
  comp_ufo: { loco: 'buzz', art: emoji('🛸'), size: 48, speed: 120, voice: 'buzz', trail: '✨' },
};

/** Keyword rules for items that aren't in BY_ID (child-made ones). */
function infer(item: ShopItem): Creature {
  const name = item.name.replace(/\s+/g, '');
  const has = (...words: string[]) => words.some((w) => name.includes(w));

  if (has('피닉스', '불사조')) return { ...BY_ID.char_phoenix };
  if (has('부엉', '올빼미')) return { ...BY_ID.char_owl };
  if (has('앵무')) return { ...BY_ID.comp_parrot };
  if (has('벌새')) return { ...BY_ID.comp_hummingbird };
  if (has('제비')) return { ...BY_ID.comp_swallow };
  if (has('참새')) return { ...BY_ID.comp_sparrow };
  if (has('잠자리')) return { ...BY_ID.comp_dragonfly };
  if (has('반딧불')) return { ...BY_ID.comp_firefly };
  if (has('나비') || item.emoji === '🦋') return { ...BY_ID.comp_butterfly };
  if (has('꿀벌') || item.emoji === '🐝') return { ...BY_ID.comp_bee };
  if (has('금붕어')) return { ...BY_ID.comp_goldfish };
  if (has('물고기') || ['🐠', '🐟', '🐡'].includes(item.emoji)) return { ...BY_ID.comp_fish };
  if (has('새', '비둘기', '독수리') || ['🐦', '🕊️', '🦅', '🐤'].includes(item.emoji)) {
    return { ...BY_ID.comp_bird };
  }

  const e = emoji(item.emoji);
  switch (item.motion) {
    case 'fly':
      return { loco: 'fly', art: e, size: 44, speed: 80, voice: 'pop' };
    case 'hop':
      return { loco: 'hop', art: e, size: 44, speed: 65, voice: 'squeak' };
    case 'swim':
      return { loco: 'swim', art: e, size: 46, speed: 36, voice: 'blub', trail: '🫧' };
    case 'orbit':
      return { loco: 'orbit', art: e, size: 30, speed: 0, voice: 'pop' };
    default:
      return { loco: 'walk', art: e, size: item.slot === 'character' ? 56 : 44, speed: 45, voice: 'squeak' };
  }
}

export function creatureForItem(item: ShopItem): Creature {
  return BY_ID[item.id] ? { ...BY_ID[item.id] } : infer(item);
}

/** The child's own buddy. Hops if it's a hopper, otherwise walks. */
export function creatureForBuddy(animal: BuddyAnimal | undefined): Creature {
  const id = animal?.id;
  const loco: Loco = id === 'rabbit' || id === 'chick' ? 'hop' : 'walk';
  return {
    loco,
    art: emoji(animal?.emoji || '🐣'),
    size: 80,
    speed: id === 'penguin' ? 38 : id === 'unicorn' ? 70 : 55,
    voice: id === 'chick' || id === 'penguin' ? 'tweet' : 'squeak',
  };
}

/** Emoji drawn as a face only (no body) get little stepping feet when walking. */
const FACE_ONLY = new Set(['🐶', '🐱', '🐰', '🐼', '🦊', '🐹', '🐸', '🐨', '🐯', '🐮', '🐷', '🐵', '🐻', '🐭', '🐲', '🐣']);
export function needsFeet(art: Art) {
  return art.kind === 'emoji' && FACE_ONLY.has(art.emoji);
}

export function isAirborneLoco(loco: Loco) {
  return loco === 'fly' || loco === 'flutter' || loco === 'buzz' || loco === 'drift' || loco === 'swim';
}

/** Whether this item shows up on the stage as its own moving creature. */
export function isRoamer(item: ShopItem) {
  if (item.slot === 'character' || item.slot === 'companion') return true;
  return !!item.motion && item.motion !== 'float';
}
