'use client';

import { useEffect, useRef, useState } from 'react';
import { ShopItem } from '@/lib/characterShop';
import { creatureForItem } from '@/lib/creatures';
import { DAILY, FOODS, FRIEND_ACTIONS, FriendAction, PetState, Block, friendLevelOf } from '@/lib/petCare';
import { limitBlock } from '@/lib/petBlocks';
import { playChime, playFanfare, playVoice } from '@/lib/sound';
import { careFriend } from '@/app/diary/petActions';
import { ItemIcon } from '@/components/CreatureArt';
import { useParticles } from './common';

const FRIEND_TALK = ['안녕!', '나도 놀아줘!', '헤헤 좋아!', '같이 놀자!', '고마워!', '최고야!'];

/**
 * Raising a shop friend: pat it (free), give it a snack from the fridge, or
 * play together (costs ⭐). Each friend has its own level and grows a little
 * bigger on the stage as it levels up.
 */
export default function FriendCareSheet({
  item,
  pet,
  onState,
  showBlock,
  onClose,
}: {
  item: ShopItem;
  pet: PetState;
  onState: (s: PetState) => void;
  showBlock: (b: Block) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const voice = creatureForItem(item).voice;
  const fr = pet.friends[item.id] ?? { xp: 0, xpToday: 0 };
  const lv = friendLevelOf(fr.xp);
  const [busy, setBusy] = useState<FriendAction | null>(null);
  const [pickFood, setPickFood] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null);
  const [bounce, setBounce] = useState(0);

  const talk = (text: string) => setBubble({ text, key: Date.now() });

  useEffect(() => {
    playVoice(voice);
    talk(FRIEND_TALK[Math.floor(Math.random() * FRIEND_TALK.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const burst = (chars: string[]) => {
    const el = ref.current;
    if (el) spawn(chars, el.clientWidth / 2, 110, { count: 10, spread: 90, rise: 80 });
  };

  const run = async (action: FriendAction, foodId?: string) => {
    if (busy) return;
    const meta = FRIEND_ACTIONS[action];
    // Explain limits before asking the server.
    if (meta.counts && pet.daily.activities >= pet.daily.limit) return showBlock(limitBlock(pet));
    setBusy(action);
    try {
      const res = await careFriend(item.id, action, foodId);
      if (!res.ok) {
        showBlock(res.block);
        return;
      }
      onState(res.state);
      playVoice(voice);
      setBounce((b) => b + 1);
      burst(action === 'snack' ? ['😋', '💖', '✨'] : action === 'play' ? ['🎾', '⭐', '💫'] : ['💕', '💗']);
      if (res.friendLevelUp) {
        playFanfare();
        talk(`레벨 ${res.friendLevelUp}! 나 더 커졌어!`);
        burst(['🎉', '🌟', '✨', '💖']);
      } else if (res.xpGained > 0) {
        playChime();
        talk(`💞 +${res.xpGained}! ${FRIEND_TALK[Math.floor(Math.random() * FRIEND_TALK.length)]}`);
      } else if (res.patRepeat) {
        talk('헤헤 좋아~ (쓰다듬기 성장은 하루 한 번)');
      } else if (res.xpCapped) {
        talk(`오늘은 충분히 컸어! 내일 또 자랄게 (${DAILY.xpFriend}/${DAILY.xpFriend})`);
      } else {
        talk(FRIEND_TALK[Math.floor(Math.random() * FRIEND_TALK.length)]);
      }
    } finally {
      setBusy(null);
      setPickFood(false);
    }
  };

  const foods = FOODS.filter((f) => (pet.foods.find((x) => x.id === f.id)?.left ?? 0) > 0);
  const left = Math.max(0, pet.daily.limit - pet.daily.activities);

  return (
    <div className="fixed inset-0 z-[88] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={ref}
        className="animate-sheet-up safe-bottom relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white px-5 pb-6 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/10" />

        {/* Friend */}
        <div className="relative flex flex-col items-center">
          {bubble && (
            <div key={bubble.key} className="care-bubble" style={{ top: -6, bottom: 'auto' }}>
              {bubble.text}
            </div>
          )}
          <div
            key={bounce}
            data-pose={busy ? 'fly' : 'perch'}
            className={`mt-9 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100 ${bounce ? 'animate-reveal-pop' : ''}`}
          >
            <ItemIcon item={item} size={Math.round(70 + lv.level * 6)} />
          </div>
          <p className="mt-2 text-[18px] font-bold text-[#1c1c1e]">{item.name}</p>
          <p className="text-[12px] font-bold text-violet-600">
            💞 Lv.{lv.level} {lv.toNext !== null ? `· 다음 레벨까지 ${lv.toNext}` : '· 최고 레벨!'}
          </p>
          <div className="mt-1.5 h-2.5 w-48 overflow-hidden rounded-full bg-black/[0.07]">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${lv.progress}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-[#8e8e93]">
            오늘 성장 {fr.xpToday}/{DAILY.xpFriend} · 레벨이 오르면 무대에서 조금씩 커져요
          </p>
        </div>

        {/* Actions */}
        {pickFood ? (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-bold text-[#1c1c1e]">어떤 간식을 줄까요?</p>
            {foods.length === 0 ? (
              <p className="rounded-2xl bg-black/[0.03] py-4 text-center text-[12px] text-[#8e8e93]">
                냉장고가 비었어요 · 일기를 쓰면 🍎, 영어 공부를 하면 🍪가 생겨요
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {foods.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => run('snack', f.id)}
                    disabled={!!busy}
                    className="flex flex-col items-center rounded-2xl bg-amber-50 py-2 ring-1 ring-amber-200 active:scale-90"
                  >
                    <span className="text-[24px] leading-none">{f.emoji}</span>
                    <span className="mt-0.5 text-[10px] font-bold">×{pet.foods.find((x) => x.id === f.id)?.left}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setPickFood(false)} className="mt-2 w-full rounded-xl bg-black/5 py-2.5 text-[13px] font-semibold text-[#8e8e93]">
              뒤로
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => run('pat')}
              disabled={!!busy}
              className="flex flex-col items-center rounded-2xl bg-pink-50 py-3 ring-1 ring-pink-200 active:scale-95"
            >
              <span className="text-[28px] leading-none">🤲</span>
              <span className="mt-1 text-[12px] font-bold text-[#1c1c1e]">쓰다듬기</span>
              <span className="text-[10px] text-[#8e8e93]">무료</span>
            </button>
            <button
              onClick={() => setPickFood(true)}
              disabled={!!busy}
              className="flex flex-col items-center rounded-2xl bg-amber-50 py-3 ring-1 ring-amber-200 active:scale-95"
            >
              <span className="text-[28px] leading-none">🍪</span>
              <span className="mt-1 text-[12px] font-bold text-[#1c1c1e]">간식 주기</span>
              <span className="text-[10px] text-[#8e8e93]">냉장고 먹이 1개</span>
            </button>
            <button
              onClick={() => run('play')}
              disabled={!!busy}
              className="flex flex-col items-center rounded-2xl bg-sky-50 py-3 ring-1 ring-sky-200 active:scale-95"
            >
              <span className="text-[28px] leading-none">🎾</span>
              <span className="mt-1 text-[12px] font-bold text-[#1c1c1e]">같이 놀기</span>
              <span className="text-[10px] text-[#8e8e93]">⭐ {pet.daily.nextCost}개</span>
            </button>
          </div>
        )}

        <p className="mt-3 text-center text-[11px] text-[#8e8e93]">
          ⭐ {pet.cp}개 있어요 · 오늘 남은 돌봄 {left}번
        </p>
        {layer}
      </div>
    </div>
  );
}
