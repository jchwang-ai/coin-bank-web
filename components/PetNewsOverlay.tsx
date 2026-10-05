'use client';

import { Trick } from '@/lib/petCare';
import EmojiBurst from './EmojiBurst';

/** Bump when there's a new batch of features to announce to the child. */
export const FEATURE_INTRO_KEY = 'diary-feature-intro-v3';

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
  { emoji: '🏠', title: '친구 돌보기가 생겼어요!', body: '거실·부엌·욕실·미용실·산책·침실을 오가며 친구를 돌봐요' },
  { emoji: '🛒', title: '💎 보석으로 먹이를 사요', body: '영어 공부로 모은 보석으로 사 줄 수 있어요. 친구마다 제일 좋아하는 음식이 있어요!' },
  { emoji: '🛁', title: '목욕 · 양치 · 빗질', body: '거품 내고 헹구고 말려주면 반짝반짝해져요' },
  { emoji: '🌳', title: '같이 산책 가요', body: '길에서 나비·꽃·친구를 만나고, 간식을 주울 때도 있어요' },
  { emoji: '💬', title: '친구가 말을 해요', body: '누르면 이야기하고 울음소리를 내요 (🔊 버튼으로 켜고 끄기)' },
  { emoji: '🎨', title: '꾸미기 · 털 색 바꾸기', body: '미용실에서 옷을 입히고 털 색을 바꿔봐요' },
];

export function FeatureIntroOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
      <div className="animate-stamp-in relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white px-5 py-5 shadow-2xl">
        <p className="text-center text-5xl">🎁</p>
        <p className="mt-2 text-center text-[21px] font-bold text-[#1c1c1e]">새로운 기능이 또 생겼어요!</p>
        <p className="mt-0.5 text-center text-[13px] text-[#8e8e93]">진짜 반려동물처럼 돌봐줄 수 있어요</p>

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
