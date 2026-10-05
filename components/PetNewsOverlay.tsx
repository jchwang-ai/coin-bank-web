'use client';

import { Trick } from '@/lib/petCare';
import EmojiBurst from './EmojiBurst';

/** Bump when there's a new batch of features to announce to the child. */
export const FEATURE_INTRO_KEY = 'diary-feature-intro-v2';

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
  { emoji: '🍎', title: '친구에게 밥을 줄 수 있어요!', body: '일기를 쓰면 🍎 사과, 영어 공부를 하면 🍪 쿠키가 생겨요' },
  { emoji: '💞', title: '밥을 주면 우정이 자라요', body: '우정 레벨이 오를 때마다 새로운 재주를 배워요' },
  { emoji: '🐦', title: '친구들이 살아 움직여요', body: '새는 날갯짓하며 날고, 친구들끼리 겹치지 않게 놀아요' },
  { emoji: '👆', title: '콕 누르고, 끌어서 옮겨보세요', body: '빈 곳을 누르면 친구들이 달려와요' },
  { emoji: '⛶', title: '크게 보기', body: '전체 화면에서 파티와 공놀이를 할 수 있어요' },
];

export function FeatureIntroOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
      <div className="animate-stamp-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-white px-5 py-6 shadow-2xl">
        <p className="text-center text-5xl">🎁</p>
        <p className="mt-2 text-center text-[21px] font-bold text-[#1c1c1e]">새로운 기능이 생겼어요!</p>
        <p className="mt-0.5 text-center text-[13px] text-[#8e8e93]">이제 친구를 직접 키울 수 있어요</p>

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
        <EmojiBurst trigger={1} emojis={['🎉', '✨', '🍎', '🐦']} count={14} />
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
