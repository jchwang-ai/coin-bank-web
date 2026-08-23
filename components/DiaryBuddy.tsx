'use client';

import { BUDDY_ANIMALS, STICKERS, animalOf, computeGrowth } from '@/lib/diaryPet';

interface DiaryBuddyProps {
  animalId: string | null;
  completedCount: number;
  onPick: () => void;
}

/**
 * The motivation centerpiece: the child's chosen animal, which visibly grows
 * (bigger, fancier decor) as they complete diaries, plus a sticker shelf that
 * fills in at milestones.
 */
export default function DiaryBuddy({ animalId, completedCount, onPick }: DiaryBuddyProps) {
  const animal = animalOf(animalId);
  const growth = computeGrowth(completedCount);

  // Not chosen yet — invite the child to pick a friend.
  if (!animal) {
    return (
      <button
        onClick={onPick}
        className="mb-4 w-full rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-6 text-center transition-transform active:scale-[0.98]"
      >
        <div className="flex justify-center gap-1 text-3xl">
          {BUDDY_ANIMALS.slice(0, 5).map((a) => (
            <span key={a.id}>{a.emoji}</span>
          ))}
        </div>
        <p className="mt-3 text-[17px] font-bold text-violet-700">일기 친구를 골라주세요!</p>
        <p className="mt-1 text-[13px] text-violet-500">일기를 쓸수록 친구가 자라나요 🌱</p>
      </button>
    );
  }

  const isEgg = growth.stage.level === 1;

  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      {/* Buddy stage */}
      <div className={`relative bg-gradient-to-br ${animal.gradient} px-5 py-6`}>
        <button
          onClick={onPick}
          className="absolute right-3 top-3 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-[#1c1c1e] backdrop-blur transition-transform active:scale-90"
        >
          친구 바꾸기
        </button>

        <div className="flex items-center gap-4">
          <div className="relative flex h-[124px] w-[124px] shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-white/30 blur-xl" />
            <span
              className="relative leading-none drop-shadow-sm transition-all duration-500"
              style={{ fontSize: `${growth.stage.size}px` }}
            >
              {isEgg ? '🥚' : animal.emoji}
            </span>
            <span className="absolute -bottom-1 -right-1 text-3xl drop-shadow-sm">
              {growth.stage.decor}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-black/50">
              Lv.{growth.stage.level} · {growth.stage.name}
            </p>
            <p className="truncate text-[22px] font-bold leading-tight text-black/80">
              {animal.name}
            </p>
            <p className="mt-0.5 text-[12px] font-semibold text-black/50">
              일기 {completedCount}개 완성
            </p>

            {growth.nextStage ? (
              <>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-white/90 transition-all duration-700"
                    style={{ width: `${growth.progress}%` }}
                  />
                </div>
                {/* Every stage name ends in a vowel or ㄹ, so '로' is always
                    the correct particle — no (으)로 hedging needed. */}
                <p className="mt-1.5 text-[11px] font-bold leading-snug text-black/55">
                  {growth.remaining}개 더 쓰면 {growth.nextStage.name}로 자라요!
                </p>
              </>
            ) : (
              <p className="mt-2.5 text-[12px] font-bold text-black/60">
                👑 최고 단계! 정말 대단해요
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sticker shelf */}
      <div className="px-4 py-3.5">
        <p className="mb-2 text-[12px] font-bold text-[#8e8e93]">
          내 스티커 {growth.earnedStickers.length}/{STICKERS.length}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STICKERS.map((s) => {
            const earned = completedCount >= s.at;
            return (
              <div
                key={s.at}
                title={`${s.label} 스티커`}
                className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl transition-all ${
                  earned ? 'animate-pop-in bg-amber-50 ring-1 ring-amber-200' : 'bg-black/[0.04]'
                }`}
              >
                <span className={`text-[20px] leading-none ${earned ? '' : 'opacity-25 grayscale'}`}>
                  {earned ? s.emoji : '🔒'}
                </span>
                <span
                  className={`mt-0.5 text-[9px] font-bold ${earned ? 'text-amber-700' : 'text-[#c7c7cc]'}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {growth.nextSticker && (
          <p className="mt-1.5 text-[11px] text-[#8e8e93]">
            다음 스티커까지 {growth.nextSticker.at - completedCount}개! {growth.nextSticker.emoji}
          </p>
        )}
      </div>
    </div>
  );
}
