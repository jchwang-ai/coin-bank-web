// "Why can't I do this, and what do I do?" — the explanations shown when
// something is locked or used up. Shared by the server actions and the UI so
// a lock always reads the same wherever the child meets it.

import { Block, DAILY, PetState, TRICKS, Trick, XP_LEVELS, friendshipLevel } from './petCare';

export function limitBlock(s: PetState): Block {
  const extLeft = DAILY.maxExtensions - s.daily.extensions;
  return {
    code: 'limit',
    emoji: '⏰',
    title: '오늘 돌봄 시간이 끝났어요',
    reason: `오늘 친구를 ${s.daily.limit}번 돌봐줬어요. 오래 하면 눈이 피곤하니까 오늘은 여기까지!`,
    howTo: [
      '내일 다시 오면 또 돌볼 수 있어요 🌙',
      extLeft > 0
        ? `💖 하트 1개를 쓰면 ${DAILY.extendBy}번 더 할 수 있어요 (오늘 ${extLeft}번 가능)`
        : '하트로 시간 늘리기도 오늘은 다 썼어요',
      '쓰다듬기와 무대에서 놀기는 언제든 할 수 있어요',
    ],
  };
}

export function cpBlock(s: PetState): Block {
  return {
    code: 'cp',
    emoji: '⭐',
    title: '돌봄 포인트가 부족해요',
    reason: `이번 돌봄에는 ⭐ ${s.daily.nextCost}개가 필요한데, 지금 ⭐ ${s.cp}개 있어요.`,
    howTo: [
      '🧠 공부방에서 문제를 맞히면 ⭐ 1개씩 생겨요',
      '📔 일기를 끝까지 쓰면 ⭐ 3개',
      '🔤 영어 단어 앱에서 별 8개를 모으면 ⭐ 1개',
    ],
  };
}

export const EGG_BLOCK: Block = {
  code: 'egg',
  emoji: '🥚',
  title: '아직 알이에요',
  reason: '친구가 알 속에서 쿨쿨 자고 있어요.',
  howTo: ['📔 일기를 1개 끝까지 쓰면 알이 깨어나요', '깨어나면 밥 주기, 목욕, 산책을 할 수 있어요'],
};

/** 은/는 by the final consonant of the last Hangul syllable. */
function topic(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}은(는)`;
  return (c - 0xac00) % 28 ? `${word}은` : `${word}는`;
}

/** A trick that unlocks at a friendship level the buddy hasn't reached yet. */
export function trickBlock(trick: Trick, xp: number): Block {
  const lv = friendshipLevel(xp).level;
  const need = Math.max(0, XP_LEVELS[trick.level - 1] - xp);
  return {
    code: 'locked',
    emoji: '🔒',
    title: `${trick.emoji} ${topic(trick.name)} 아직 잠겨 있어요`,
    reason: `우정 Lv.${trick.level}이 되면 열려요. 지금은 Lv.${lv} — 우정 ${need}만큼 더 필요해요.`,
    howTo: [
      '🍎 밥을 주면 우정이 자라요',
      '🛁 목욕 · 🪮 빗질 · 🌳 산책으로 돌봐주면 우정이 자라요',
      '🔤 영어 단어를 공부하면 우정이 자라요',
      `우정은 하루에 ${DAILY.xpBuddy}까지만 자라요 — 매일 조금씩!`,
    ],
  };
}

export function trickById(id: string) {
  return TRICKS.find((t) => t.id === id);
}

/** Shown when today's growth is used up (things still work, XP just pauses). */
export const XP_CAP_NOTE = `오늘 자랄 만큼 다 자랐어요! 우정은 내일 또 자라요 (하루 ${DAILY.xpBuddy})`;
