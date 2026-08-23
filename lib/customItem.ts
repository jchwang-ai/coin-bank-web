import { Motion, Rarity, SlotId } from './characterShop';

/**
 * Turns a child's free-text item request into a real, immediately usable shop
 * item: guesses an emoji, which slot it belongs in, whether it should move,
 * and a fair price. No parent approval step — the child asks, it exists.
 *
 * Everything is a heuristic over Korean keywords with sane fallbacks, so an
 * unrecognised word still produces a valid, reasonably-priced item.
 */

interface Guess {
  emoji: string;
  slot: SlotId;
  motion?: Motion;
}

/** Keyword → emoji/slot/motion. First match wins, so put specifics first. */
const KEYWORDS: Array<[string[], Guess]> = [
  // 머리에 쓰는 것
  [['왕관', '티아라', '크라운'], { emoji: '👑', slot: 'hat' }],
  [['모자', '캡', '햇'], { emoji: '🧢', slot: 'hat' }],
  [['리본', '머리띠', '핀'], { emoji: '🎀', slot: 'hat' }],
  [['꽃'], { emoji: '🌸', slot: 'hat' }],
  [['헬멧'], { emoji: '⛑️', slot: 'hat' }],

  // 얼굴
  [['안경', '선글라스'], { emoji: '🕶️', slot: 'face' }],
  [['마스크', '가면'], { emoji: '🎭', slot: 'face' }],
  [['수염'], { emoji: '🥸', slot: 'face' }],

  // 먹을 것 / 손에 드는 것
  [['딸기'], { emoji: '🍓', slot: 'held' }],
  [['케이크', '케익'], { emoji: '🍰', slot: 'held' }],
  [['아이스크림'], { emoji: '🍦', slot: 'held' }],
  [['도넛'], { emoji: '🍩', slot: 'held' }],
  [['사탕', '캔디'], { emoji: '🍬', slot: 'held' }],
  [['초콜릿', '초코'], { emoji: '🍫', slot: 'held' }],
  [['피자'], { emoji: '🍕', slot: 'held' }],
  [['수박'], { emoji: '🍉', slot: 'held' }],
  [['바나나'], { emoji: '🍌', slot: 'held' }],
  [['사과'], { emoji: '🍎', slot: 'held' }],
  [['포도'], { emoji: '🍇', slot: 'held' }],
  [['우유', '음료', '주스'], { emoji: '🥤', slot: 'held' }],
  [['축구공', '공', '축구'], { emoji: '⚽', slot: 'held' }],
  [['농구'], { emoji: '🏀', slot: 'held' }],
  [['책', '동화책'], { emoji: '📖', slot: 'held' }],
  [['지팡이', '요술', '마법'], { emoji: '🪄', slot: 'held' }],
  [['기타', '악기'], { emoji: '🎸', slot: 'held' }],
  [['트로피', '상'], { emoji: '🏆', slot: 'held' }],
  [['인형', '곰돌이', '테디'], { emoji: '🧸', slot: 'held' }],
  [['우산'], { emoji: '☂️', slot: 'held' }],
  [['카메라'], { emoji: '📷', slot: 'held' }],
  [['풍선'], { emoji: '🎈', slot: 'held' }],

  // 배경
  [['하늘', '구름'], { emoji: '☁️', slot: 'background' }],
  [['바다', '해변'], { emoji: '🌊', slot: 'background' }],
  [['우주', '행성'], { emoji: '🪐', slot: 'background' }],
  [['숲', '나무', '정글'], { emoji: '🌲', slot: 'background' }],
  [['무지개'], { emoji: '🌈', slot: 'background' }],
  [['눈', '겨울'], { emoji: '❄️', slot: 'background' }],
  [['성', '캐슬'], { emoji: '🏰', slot: 'background' }],

  // 반짝임
  [['반짝', '빛', '스파클'], { emoji: '✨', slot: 'effect', motion: 'float' }],
  [['하트', '사랑'], { emoji: '💖', slot: 'effect', motion: 'float' }],
  [['음표', '노래', '음악'], { emoji: '🎵', slot: 'effect', motion: 'float' }],
  [['불', '불꽃'], { emoji: '🔥', slot: 'effect', motion: 'float' }],
  [['비눗방울', '방울'], { emoji: '🫧', slot: 'effect', motion: 'float' }],

  // 날아다니는 친구
  [['나비'], { emoji: '🦋', slot: 'companion', motion: 'fly' }],
  [['벌', '꿀벌'], { emoji: '🐝', slot: 'companion', motion: 'fly' }],
  [['새', '참새', '앵무'], { emoji: '🐦', slot: 'companion', motion: 'fly' }],
  [['잠자리'], { emoji: '🪰', slot: 'companion', motion: 'fly' }],
  [['물고기', '금붕어'], { emoji: '🐠', slot: 'companion', motion: 'fly' }],
  [['용', '드래곤'], { emoji: '🐲', slot: 'companion', motion: 'fly' }],
  [['유니콘'], { emoji: '🦄', slot: 'companion', motion: 'fly' }],
  [['날개'], { emoji: '🪽', slot: 'companion', motion: 'fly' }],
  [['별'], { emoji: '⭐', slot: 'companion', motion: 'orbit' }],
  [['달'], { emoji: '🌙', slot: 'companion', motion: 'orbit' }],

  // 뛰어다니는 친구
  [['토끼'], { emoji: '🐇', slot: 'companion', motion: 'hop' }],
  [['강아지', '개', '멍멍'], { emoji: '🐶', slot: 'companion', motion: 'hop' }],
  [['고양이', '냥'], { emoji: '🐱', slot: 'companion', motion: 'hop' }],
  [['병아리'], { emoji: '🐣', slot: 'companion', motion: 'hop' }],
  [['펭귄'], { emoji: '🐧', slot: 'companion', motion: 'hop' }],
  [['햄스터', '햄찌'], { emoji: '🐹', slot: 'companion', motion: 'hop' }],
  [['공룡'], { emoji: '🦕', slot: 'companion', motion: 'hop' }],
  [['거북'], { emoji: '🐢', slot: 'companion', motion: 'hop' }],
  [['무당벌레'], { emoji: '🐞', slot: 'companion', motion: 'hop' }],
  [['개구리'], { emoji: '🐸', slot: 'companion', motion: 'hop' }],
];

/** Base price per slot; moving companions cost a bit more. */
const BASE_COST: Record<SlotId, number> = {
  held: 35,
  face: 40,
  hat: 45,
  effect: 55,
  background: 60,
  companion: 70,
  character: 90,
};

export interface InferredItem {
  emoji: string;
  slot: SlotId;
  motion?: Motion;
  cost: number;
  rarity: Rarity;
}

export function inferItem(name: string): InferredItem {
  const text = name.replace(/\s+/g, '');

  let guess: Guess | undefined;
  for (const [words, g] of KEYWORDS) {
    if (words.some((w) => text.includes(w))) {
      guess = g;
      break;
    }
  }

  // Unrecognised words become a held trinket — always valid, never mispriced.
  const resolved: Guess = guess ?? { emoji: '🎁', slot: 'held' };
  const cost = BASE_COST[resolved.slot];

  return {
    emoji: resolved.emoji,
    slot: resolved.slot,
    motion: resolved.motion,
    // Child-made items are deliberately affordable, and marked 레어 so they
    // feel special next to the built-in commons.
    cost,
    rarity: 'rare',
  };
}
