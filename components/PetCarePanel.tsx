'use client';

import { useState } from 'react';
import {
  FOODS,
  FoodId,
  PetState,
  TRICKS,
  friendshipLevel,
  moodOf,
} from '@/lib/petCare';

interface PetCarePanelProps {
  state: PetState | null;
  isEgg: boolean;
  buddyName: string;
  onFeed: (foodId: FoodId) => Promise<void>;
  /** Compact row for the fullscreen footer. */
  compact?: boolean;
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.round(value)}%` }} />
    </div>
  );
}

/**
 * 친구 키우기: feed the buddy with food earned from diaries (🍎🍰) and
 * English study (🍪). Feeding raises friendship XP; every level teaches the
 * buddy a new trick, so the child always has a next thing to work toward.
 */
export default function PetCarePanel({ state, isEgg, buddyName, onFeed, compact }: PetCarePanelProps) {
  const [busy, setBusy] = useState<FoodId | null>(null);
  const [message, setMessage] = useState('');
  const [showTricks, setShowTricks] = useState(false);

  if (!state) {
    return compact ? null : (
      <div className="mb-4 rounded-3xl border border-black/5 bg-white p-4 text-center text-[13px] text-[#8e8e93] shadow-sm">
        친구 상태를 불러오는 중…
      </div>
    );
  }

  const mood = moodOf(state.fullness, state.happiness);
  const lv = friendshipLevel(state.xp);
  const nextTrick = TRICKS.find((t) => t.level === lv.level + 1);

  const feed = async (id: FoodId) => {
    if (busy) return;
    setMessage('');
    const left = state.foods.find((f) => f.id === id)?.left ?? 0;
    const food = FOODS.find((f) => f.id === id)!;
    if (isEgg) {
      setMessage('아직 알이에요! 일기를 1개 쓰면 태어나요 🥚');
      return;
    }
    if (left <= 0) {
      setMessage(`${food.emoji} ${food.name}가 없어요 — ${food.howTo}`);
      return;
    }
    try {
      setBusy(id);
      await onFeed(id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '먹이를 주지 못했어요');
    } finally {
      setBusy(null);
    }
  };

  const foodButtons = (
    <div className="grid grid-cols-3 gap-2">
      {FOODS.map((f) => {
        const left = state.foods.find((s) => s.id === f.id)?.left ?? 0;
        return (
          <button
            key={f.id}
            onClick={() => feed(f.id)}
            disabled={busy !== null}
            className={`relative flex flex-col items-center rounded-2xl py-2 transition-all active:scale-95 disabled:opacity-60 ${
              left > 0 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-black/[0.03]'
            }`}
          >
            <span className={`text-[26px] leading-none ${left > 0 ? '' : 'opacity-35 grayscale'} ${busy === f.id ? 'animate-bounce' : ''}`}>
              {f.emoji}
            </span>
            <span className="mt-0.5 text-[12px] font-bold text-[#1c1c1e]">
              {f.name} ×{left}
            </span>
            {!compact && <span className="text-[9px] font-semibold text-[#8e8e93]">{f.howTo}</span>}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-3 text-[11px] font-bold text-[#1c1c1e]">
          <span className="shrink-0">🍚</span>
          <Bar value={state.fullness} color="bg-orange-400" />
          <span className="shrink-0">😊</span>
          <Bar value={state.happiness} color="bg-pink-400" />
          <span className="shrink-0 text-violet-600">💞 Lv.{lv.level}</span>
        </div>
        {foodButtons}
        {message && <p className="mt-1.5 text-center text-[12px] font-semibold text-amber-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="px-4 pt-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-[#1c1c1e]">🍼 {buddyName} 키우기</p>
          <button
            onClick={() => setShowTricks((v) => !v)}
            className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-600 active:scale-95"
          >
            💞 우정 Lv.{lv.level} · 재주 {Math.min(lv.level, TRICKS.length)}/{TRICKS.length}
          </button>
        </div>

        {/* Friendship XP */}
        <div className="mt-2">
          <Bar value={lv.progress} color="bg-gradient-to-r from-violet-400 to-fuchsia-400" />
          <p className="mt-1 text-[11px] font-semibold text-[#8e8e93]">
            {nextTrick
              ? `밥을 주면 우정이 자라요! 다음 재주: ${nextTrick.emoji} ${nextTrick.name} (${lv.toNext} 남음)`
              : '👑 모든 재주를 배웠어요! 최고의 친구예요'}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 flex justify-between text-[11px] font-bold text-[#1c1c1e]">
              <span>🍚 배부름</span>
              <span className={mood.hungry ? 'text-red-500' : 'text-[#8e8e93]'}>{mood.fullnessLabel}</span>
            </p>
            <Bar value={state.fullness} color={mood.hungry ? 'bg-red-400' : 'bg-orange-400'} />
          </div>
          <div>
            <p className="mb-1 flex justify-between text-[11px] font-bold text-[#1c1c1e]">
              <span>😊 기분</span>
              <span className={mood.sad ? 'text-red-500' : 'text-[#8e8e93]'}>{mood.happinessLabel}</span>
            </p>
            <Bar value={state.happiness} color="bg-pink-400" />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3.5 pt-3">
        {foodButtons}
        {message ? (
          <p className="mt-2 text-center text-[12px] font-semibold text-amber-600">{message}</p>
        ) : (
          <p className="mt-2 text-center text-[11px] text-[#8e8e93]">
            {mood.hungry
              ? '배고파해요! 일기를 쓰거나 영어 공부를 하면 먹이가 생겨요 🍎🍪'
              : `일기를 ${state.nextCakeIn}개 더 쓰면 🍰 케이크가 생겨요`}
          </p>
        )}
        {!state.vocabConnected && (
          <p className="mt-1 text-center text-[10px] text-amber-600">영어 단어 앱과 연결되면 🍪 쿠키가 생겨요</p>
        )}
      </div>

      {showTricks && (
        <div className="border-t border-black/5 bg-violet-50/40 px-4 py-3">
          <p className="mb-2 text-[12px] font-bold text-[#1c1c1e]">배운 재주 (콕 누르면 해요!)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TRICKS.map((t) => {
              const learned = t.level <= lv.level;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${learned ? 'bg-white ring-1 ring-violet-200' : 'bg-black/[0.03]'}`}
                >
                  <span className={`text-[20px] leading-none ${learned ? '' : 'opacity-30 grayscale'}`}>
                    {learned ? t.emoji : '🔒'}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-[12px] font-bold ${learned ? 'text-[#1c1c1e]' : 'text-[#c7c7cc]'}`}>
                      {t.name}
                    </p>
                    <p className="truncate text-[9px] text-[#8e8e93]">{learned ? t.desc : `우정 Lv.${t.level}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
