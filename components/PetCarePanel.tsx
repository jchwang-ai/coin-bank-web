'use client';

import { useState } from 'react';
import { FOODS, FoodId, PetState, TRICKS, friendshipLevel, moodOf } from '@/lib/petCare';
import { SceneId } from './care/types';

interface PetCarePanelProps {
  state: PetState | null;
  isEgg: boolean;
  buddyName: string;
  onFeed: (foodId: FoodId) => Promise<void>;
  /** Opens the 친구 돌보기 rooms (optionally straight into one). */
  onOpenCare?: (scene?: SceneId) => void;
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

/** The three free foods always show (with how to earn them); bought ones show when in stock. */
const BASE_FOODS: FoodId[] = ['apple', 'cookie', 'cake'];

/**
 * 친구 키우기 summary on the diary page: stats, quick feeding, friendship
 * level and the way into the care rooms.
 */
export default function PetCarePanel({ state, isEgg, buddyName, onFeed, onOpenCare, compact }: PetCarePanelProps) {
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

  const mood = moodOf(state.fullness, state.happiness, state.clean, state.energy);
  const lv = friendshipLevel(state.xp);
  const nextTrick = TRICKS.find((t) => t.level === lv.level + 1);
  const left = (id: FoodId) => state.foods.find((f) => f.id === id)?.left ?? 0;
  const shown = FOODS.filter((f) => BASE_FOODS.includes(f.id) || left(f.id) > 0);
  const todayDone = Object.values(state.today).filter(Boolean).length;

  const feed = async (id: FoodId) => {
    if (busy) return;
    setMessage('');
    const food = FOODS.find((f) => f.id === id)!;
    if (isEgg) {
      setMessage('아직 알이에요! 일기를 1개 쓰면 태어나요 🥚');
      return;
    }
    if (left(id) <= 0) {
      setMessage(`${food.emoji} ${food.name}가 없어요 — ${food.howTo ?? '먹이 가게에서 살 수 있어요'}`);
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
    <div className={`grid gap-2 ${compact ? 'grid-flow-col auto-cols-[76px] overflow-x-auto pb-1' : 'grid-cols-4'}`}>
      {shown.map((f) => {
        const n = left(f.id);
        return (
          <button
            key={f.id}
            onClick={() => feed(f.id)}
            disabled={busy !== null}
            className={`relative flex flex-col items-center rounded-2xl py-2 transition-all active:scale-95 disabled:opacity-60 ${
              n > 0 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-black/[0.03]'
            }`}
          >
            <span className={`text-[24px] leading-none ${n > 0 ? '' : 'opacity-35 grayscale'} ${busy === f.id ? 'animate-bounce' : ''}`}>
              {f.emoji}
            </span>
            <span className="mt-0.5 text-[11px] font-bold text-[#1c1c1e]">
              {f.name} ×{n}
            </span>
            {!compact && f.howTo && <span className="text-[8px] font-semibold text-[#8e8e93]">{f.howTo}</span>}
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

  const stats: Array<{ icon: string; label: string; value: number; low: boolean; color: string; text: string }> = [
    { icon: '🍚', label: '배부름', value: state.fullness, low: mood.hungry, color: 'bg-orange-400', text: mood.fullnessLabel },
    { icon: '😊', label: '기분', value: state.happiness, low: mood.sad, color: 'bg-pink-400', text: mood.happinessLabel },
    { icon: '🧼', label: '깨끗함', value: state.clean, low: mood.dirty, color: 'bg-sky-400', text: mood.dirty ? '목욕하고 싶어요' : '깔끔해요' },
    { icon: '⚡', label: '에너지', value: state.energy, low: mood.tired, color: 'bg-amber-400', text: mood.tired ? '졸려요…' : '쌩쌩해요' },
  ];

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

        <div className="mt-2">
          <Bar value={lv.progress} color="bg-gradient-to-r from-violet-400 to-fuchsia-400" />
          <p className="mt-1 text-[11px] font-semibold text-[#8e8e93]">
            {nextTrick
              ? `잘 돌봐주면 우정이 자라요! 다음 재주: ${nextTrick.emoji} ${nextTrick.name} (${lv.toNext} 남음)`
              : '👑 모든 재주를 배웠어요! 최고의 친구예요'}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="mb-1 flex justify-between text-[11px] font-bold text-[#1c1c1e]">
                <span>
                  {s.icon} {s.label}
                </span>
                <span className={s.low ? 'text-red-500' : 'text-[#8e8e93]'}>{s.text}</span>
              </p>
              <Bar value={s.value} color={s.low ? 'bg-red-400' : s.color} />
            </div>
          ))}
        </div>

        {onOpenCare && !isEgg && (
          <button
            onClick={() => onOpenCare()}
            className="relative mt-3.5 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 py-3.5 text-left shadow-md shadow-fuchsia-500/20 transition-transform active:scale-[0.98]"
          >
            <span className="absolute -right-2 -top-3 text-6xl opacity-25">🏠</span>
            <p className="px-4 text-[16px] font-bold text-white">🏠 {buddyName} 돌보러 가기</p>
            <p className="px-4 text-[11px] font-semibold text-white/80">
              목욕 · 빗질 · 산책 · 재우기 · 먹이 가게 — 오늘의 돌봄 {todayDone}/5
            </p>
          </button>
        )}
      </div>

      <div className="px-4 pb-3.5 pt-3">
        {foodButtons}
        {message ? (
          <p className="mt-2 text-center text-[12px] font-semibold text-amber-600">{message}</p>
        ) : (
          <p className="mt-2 text-center text-[11px] text-[#8e8e93]">
            {mood.hungry
              ? '배고파해요! 일기·영어 공부로 먹이를 모으거나 💎로 사주세요'
              : `일기를 ${state.nextCakeIn}개 더 쓰면 🍰 케이크가 생겨요`}
            {onOpenCare && !isEgg && (
              <button onClick={() => onOpenCare('kitchen')} className="ml-1 font-bold text-sky-600">
                🛒 먹이 가게
              </button>
            )}
          </p>
        )}
        {!state.vocabConnected && (
          <p className="mt-1 text-center text-[10px] text-amber-600">영어 단어 앱과 연결되면 🍪 쿠키와 💎 보석이 생겨요</p>
        )}
      </div>

      {showTricks && (
        <div className="border-t border-black/5 bg-violet-50/40 px-4 py-3">
          <p className="mb-2 text-[12px] font-bold text-[#1c1c1e]">배운 재주 (무대에서 콕 누르면 해요!)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TRICKS.map((t) => {
              const learned = t.level <= lv.level;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${learned ? 'bg-white ring-1 ring-violet-200' : 'bg-black/[0.03]'}`}
                >
                  <span className={`text-[20px] leading-none ${learned ? '' : 'opacity-30 grayscale'}`}>{learned ? t.emoji : '🔒'}</span>
                  <div className="min-w-0">
                    <p className={`truncate text-[12px] font-bold ${learned ? 'text-[#1c1c1e]' : 'text-[#c7c7cc]'}`}>{t.name}</p>
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
