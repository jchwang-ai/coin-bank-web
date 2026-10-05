'use client';

import { useRef, useState } from 'react';
import { FAVORITE_FOOD, FOODS, FULL_LIMIT, Food } from '@/lib/petCare';
import { playChomp, playPop, playSoftDown, playSparkle } from '@/lib/sound';
import { PetSprite, SpeechBubble, SpritePose, Talk, useParticles } from './common';
import { SceneCtx } from './types';

/** 부엌: pick food from the fridge (or buy it with study gems) and watch it eat. */
export default function KitchenScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [tab, setTab] = useState<'fridge' | 'shop'>('fridge');
  const [pose, setPose] = useState<SpritePose>('idle');
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [toss, setToss] = useState<{ emoji: string; key: number } | null>(null);
  const [inBowl, setInBowl] = useState<string | null>(null);
  const [bowlLeft, setBowlLeft] = useState(1);
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const favorite = ctx.animalId ? FAVORITE_FOOD[ctx.animalId] : undefined;
  const stock = (id: string) => pet.foods.find((f) => f.id === id)?.left ?? 0;
  const inFridge = FOODS.filter((f) => stock(f.id) > 0);

  const bowlPoint = () => {
    const el = ref.current;
    return { x: (el?.clientWidth ?? 300) * 0.66, y: (el?.clientHeight ?? 400) * 0.5 };
  };

  const feed = async (food: Food) => {
    if (busy) return;
    if (pet.fullness >= FULL_LIMIT) {
      playSoftDown();
      setAct({ name: 'wiggle', key: Date.now() });
      say('full');
      return;
    }
    setBusy(true);
    playPop();
    setToss({ emoji: food.emoji, key: Date.now() });
    const result = ctx.feed(food.id);

    setTimeout(() => {
      setToss(null);
      setInBowl(food.emoji);
      setBowlLeft(1);
      setPose('eat');
      // Munch munch: bites shrink the food, crumbs fly.
      let bites = 0;
      const chew = setInterval(() => {
        bites += 1;
        playChomp();
        setBowlLeft(1 - bites / 6);
        const b = bowlPoint();
        spawn(['·', '✦', food.emoji], b.x, b.y, { count: 2, spread: 30, rise: 30, size: 12 });
        if (bites >= 6) clearInterval(chew);
      }, 320);
    }, 650);

    const res = await result;
    setTimeout(() => {
      setPose('idle');
      setInBowl(null);
      setBusy(false);
      if (!res) return;
      const b = bowlPoint();
      if (res.favorite) {
        playSparkle();
        setAct({ name: 'flip', key: Date.now() });
        spawn(['💖', '😍', '✨', '💕'], b.x - 60, b.y - size * 0.5, { count: 14, spread: 110, rise: 110, size: 26 });
        say('favorite', 'happy');
      } else {
        setAct({ name: 'tada', key: Date.now() });
        spawn(['💖', '✨'], b.x - 60, b.y - size * 0.4, { count: 6, spread: 60 });
        say('eat', 'happy');
      }
    }, 2700);
  };

  const buy = async (food: Food, qty: number) => {
    if (buying) return;
    if (ctx.gemsLeft < food.price * qty) {
      playSoftDown();
      ctx.toast(`보석이 ${food.price * qty - ctx.gemsLeft}개 더 필요해요 💎 영어 공부로 모아요!`);
      return;
    }
    setBuying(`${food.id}${qty}`);
    const ok = await ctx.buy(food.id, qty);
    setBuying(null);
    if (ok) {
      playSparkle();
      const el = ref.current;
      spawn([food.emoji, '🛍️', '✨'], (el?.clientWidth ?? 300) / 2, (el?.clientHeight ?? 400) * 0.45, { count: 8, spread: 80 });
      say(food.id === favorite ? 'favorite' : 'shopThanks', 'happy');
    }
  };

  return (
    <div ref={ref} className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Kitchen */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 bg-[conic-gradient(#FFF8E7_0_25%,#FDEBC8_0_50%,#FFF8E7_0_75%,#FDEBC8_0)] bg-[length:44px_44px]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[#E9C79B]" />
        <div className="absolute left-[4%] top-[8%] h-[62%] w-[24%] rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 shadow-md ring-1 ring-black/5">
          <div className="absolute inset-x-0 top-[38%] h-[2px] bg-black/10" />
          <div className="absolute right-2 top-[18%] h-6 w-1.5 rounded-full bg-slate-400" />
          <div className="absolute right-2 top-[52%] h-8 w-1.5 rounded-full bg-slate-400" />
          <span className="absolute left-2 top-2 text-lg">🧲</span>
        </div>
        <div className="absolute right-[4%] top-[14%] text-[40px]">🕰️</div>

        {/* Bowl */}
        <div className="absolute bottom-[12%] left-[66%] z-10 -translate-x-1/2 text-center">
          {inBowl && (
            <span
              className="absolute bottom-[55%] left-1/2 -translate-x-1/2 text-[34px] leading-none transition-transform"
              style={{ transform: `translateX(-50%) scale(${Math.max(0.15, bowlLeft)})` }}
            >
              {inBowl}
            </span>
          )}
          <span className="text-[54px] leading-none">🥣</span>
        </div>

        {toss && (
          <span key={toss.key} className="care-toss" style={{ left: '66%' }}>
            {toss.emoji}
          </span>
        )}

        {/* Pet next to the bowl */}
        <div className="absolute bottom-[9%] z-10" style={{ left: '38%', transform: 'translateX(-50%)' }}>
          <div className="absolute -bottom-2 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/15 blur-[2px]" />
          <PetSprite
            emoji={ctx.emoji}
            size={size * 0.9}
            pose={pose}
            act={act?.name}
            actKey={act?.key}
            hue={pet.furHue}
            dirt={pet.clean < 50 ? (50 - pet.clean) / 50 : 0}
            facing={1}
            accessories={ctx.accessories}
          />
          <SpeechBubble talk={talk} style={{ bottom: size * 0.9 + 10 }} />
        </div>
        {layer}
      </div>

      {/* Fridge / shop panel */}
      <div className="h-[44%] shrink-0 rounded-t-3xl bg-white px-3 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
          {(['fridge', 'shop'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                playPop();
                setTab(t);
              }}
              className={`rounded-xl py-2 text-[13px] font-bold ${tab === t ? 'bg-white text-[#1c1c1e] shadow-sm' : 'text-[#8e8e93]'}`}
            >
              {t === 'fridge' ? `🧊 냉장고 (${inFridge.reduce((n, f) => n + stock(f.id), 0)})` : `🛒 먹이 가게 💎${ctx.gemsLeft}`}
            </button>
          ))}
        </div>

        <div className="h-[calc(100%-52px)] overflow-y-auto pb-3">
          {tab === 'fridge' ? (
            inFridge.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-3xl">🧊</p>
                <p className="mt-1 text-[13px] font-bold text-[#1c1c1e]">냉장고가 비었어요</p>
                <p className="mt-0.5 text-[11px] text-[#8e8e93]">일기 쓰면 🍎, 영어 공부하면 🍪 · 💎보석으로 살 수도 있어요</p>
                <button onClick={() => setTab('shop')} className="mt-2 rounded-full bg-violet-100 px-3 py-1.5 text-[12px] font-bold text-violet-600">
                  🛒 먹이 가게 가기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {inFridge.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => feed(f)}
                    disabled={busy}
                    className="relative flex flex-col items-center rounded-2xl bg-amber-50 py-2 ring-1 ring-amber-200 active:scale-90 disabled:opacity-50"
                  >
                    {f.id === favorite && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-pink-500 px-1.5 text-[9px] font-bold text-white">최애</span>
                    )}
                    <span className="text-[28px] leading-none">{f.emoji}</span>
                    <span className="mt-0.5 text-[11px] font-bold text-[#1c1c1e]">
                      {f.name} ×{stock(f.id)}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <p className="mb-2 text-center text-[11px] text-[#8e8e93]">영어 공부로 모은 💎 보석으로 먹이를 사요</p>
              <div className="grid grid-cols-2 gap-2">
                {FOODS.map((f) => (
                  <div key={f.id} className="relative flex items-center gap-2 rounded-2xl bg-black/[0.03] p-2">
                    {f.id === favorite && (
                      <span className="absolute -left-1 -top-1 rounded-full bg-pink-500 px-1.5 text-[9px] font-bold text-white">최애</span>
                    )}
                    <span className="text-[30px] leading-none">{f.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-[#1c1c1e]">
                        {f.name} <span className="text-[#c7c7cc]">×{stock(f.id)}</span>
                      </p>
                      <div className="mt-1 flex gap-1">
                        {[1, 3].map((q) => (
                          <button
                            key={q}
                            onClick={() => buy(f, q)}
                            disabled={!!buying}
                            className={`flex-1 rounded-lg py-1 text-[10px] font-bold active:scale-90 disabled:opacity-50 ${
                              ctx.gemsLeft >= f.price * q ? 'bg-sky-500 text-white' : 'bg-black/10 text-[#8e8e93]'
                            }`}
                          >
                            {buying === `${f.id}${q}` ? '…' : `${q}개 💎${f.price * q}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
