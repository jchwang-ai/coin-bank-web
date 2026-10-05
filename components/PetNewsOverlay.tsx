'use client';

import { Trick } from '@/lib/petCare';
import EmojiBurst from './EmojiBurst';

/** Bump when there's a new batch of features to announce to the child. */
export const FEATURE_INTRO_KEY = 'diary-feature-intro-v4';

export function hasSeenFeatureIntro() {
  try {
    return localStorage.getItem(FEATURE_INTRO_KEY) === '1';
  } catch {
    return true;
  }
}

export function markFeatureIntroSeen() {
  try {
    localStorage.setItem(FEATURE_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

const NEWS = [
  { emoji: '🧠', title: '공부방이 생겼어요!', body: '문제를 맞히면 ⭐ 돌봄 포인트가 생겨요. 영어 단어와 수학 문제가 나와요' },
  { emoji: '⭐', title: '돌봄은 ⭐로 해요', body: '목욕·빗질·산책·재우기에 ⭐가 필요해요. 일기를 쓰거나 영어 단어를 공부해도 ⭐가 생겨요' },
  { emoji: '🐾', title: '상점 친구들도 키워요', body: '무대에서 친구를 누르고 💞 돌봐주기! 레벨이 오르면 조금씩 커져요' },
  { emoji: '💞', title: '영어 공부로도 우정이 자라요', body: '우정은 하루에 조금씩만 자라요. 매일 오면 쑥쑥!' },
  { emoji: '⏰', title: '하루 돌봄은 12번까지', body: '다 쓰면 💖 하트 1개로 4번 더 할 수 있어요' },
  { emoji: '🔒', title: '잠긴 건 눌러보세요', body: '왜 잠겼는지, 어떻게 하면 열리는지 알려줘요' },
];

export function FeatureIntroOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
      <div className="animate-stamp-in relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white px-5 py-5 shadow-2xl">
        <p className="text-center text-5xl">🎁</p>
        <p className="mt-2 text-center text-[21px] font-bold text-[#1c1c1e]">새로운 기능이 생겼어요!</p>
        <p className="mt-0.5 text-center text-[13px] text-[#8e8e93]">공부하면 친구를 더 많이 돌볼 수 있어요</p>

        <div className="mt-4 space-y-2">
          {NEWS.map((n, i) => (
            <div
              key={n.title}
              className="animate-sprout flex items-start gap-3 rounded-2xl bg-violet-50/70 px-3 py-2.5"
              style={{ animationDelay: `${150 + i * 90}ms` }}
            >
              <span className="text-[26px] leading-none">{n.emoji}</span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-[#1c1c1e]">{n.title}</p>
                <p className="text-[12px] leading-snug text-[#8e8e93]">{n.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-[16px] font-bold text-white transition-transform active:scale-[0.98]"
        >
          친구 만나러 가기!
        </button>
        <EmojiBurst trigger={1} emojis={['🎉', '✨', '🛁', '🌳']} count={14} />
      </div>
    </div>
  );
}

export function TrickUnlockOverlay({ trick, level, onClose }: { trick: Trick; level: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="animate-flash-out pointer-events-none absolute inset-0 bg-white" />
      <div className="animate-reveal-pop relative w-full max-w-xs rounded-3xl bg-white px-7 py-8 text-center shadow-2xl">
        <p className="text-[13px] font-bold text-violet-500">💞 우정 Lv.{level} 달성!</p>
        <p className="mt-3 text-7xl leading-none">{trick.emoji}</p>
        <p className="mt-3 text-[20px] font-bold text-[#1c1c1e]">새 재주를 배웠어요!</p>
        <p className="mt-1 text-[17px] font-bold text-violet-600">{trick.name}</p>
        <p className="mt-1 text-[13px] text-[#8e8e93]">{trick.desc}</p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
        >
          보여줘!
        </button>
        <EmojiBurst trigger={1} emojis={['🎉', '⭐', '💖', trick.emoji]} count={16} />
      </div>
    </div>
  );
}
