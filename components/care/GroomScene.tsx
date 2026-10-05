'use client';

import { useRef, useState } from 'react';
import { FUR_COLORS } from '@/lib/petCare';
import { playBrush, playFanfare, playPop, playSparkle } from '@/lib/sound';
import { BODY_SPOTS, PetSprite, SceneButton, SpeechBubble, Talk, localPoint, useParticles } from './common';
import { SceneCtx } from './types';

type Tab = 'brush' | 'dress' | 'dye';

/** 미용실: brush out the tangles, dress up, dye the fur. */
export default function GroomScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [tab, setTab] = useState<Tab>('brush');
  const [tangles, setTangles] = useState<number[]>(() => BODY_SPOTS.map(() => 1));
  const [brush, setBrush] = useState<{ x: number; y: number } | null>(null);
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [brushing, setBrushing] = useState(false);
  const meta = useRef({ sound: 0, talked: 0, done: false });

  const shiny = pet.groomedUntil > Date.now() || result !== null;
  const sprite = size * 1.05;

  const onBrush = (e: React.PointerEvent) => {
    if (tab !== 'brush' || !brushing) return;
    const p = localPoint(e, ref.current);
    setBrush(p);
    const pr = petRef.current?.getBoundingClientRect();
    const box = ref.current?.getBoundingClientRect();
    if (!pr || !box) return;
    const now = Date.now();
    setTangles((prev) => {
      const next = prev.map((v, i) => {
        const sx = pr.left - box.left + (BODY_SPOTS[i].x / 100) * pr.width;
        const sy = pr.top - box.top + (BODY_SPOTS[i].y / 100) * pr.height;
        if (v > 0 && Math.hypot(p.x - sx, p.y - sy) < sprite * 0.2) {
          const nv = Math.max(0, v - 0.12);
          if (nv === 0) spawn(['✨', '💫'], sx, sy, { count: 3, spread: 24 });
          return nv;
        }
        return v;
      });
      if (!meta.current.done && next.every((v) => v === 0)) {
        meta.current.done = true;
        setTimeout(finishBrush, 150);
      }
      return next;
    });
    if (now - meta.current.sound > 170) {
      meta.current.sound = now;
      playBrush();
      if (Math.random() < 0.3) spawn(['✨', '·'], p.x, p.y, { rise: 30, spread: 20, size: 12 });
    }
    if (now - meta.current.talked > 2500) {
      meta.current.talked = now;
      say('brush', 'happy');
    }
  };

  const finishBrush = async () => {
    playFanfare();
    setAct({ name: 'spin', key: Date.now() });
    const r = petRef.current?.getBoundingClientRect();
    const box = ref.current?.getBoundingClientRect();
    if (r && box) spawn(['✨', '🌟', '💖'], r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, { count: 16, spread: 120, rise: 110 });
    say('brushDone', 'happy');
    const res = await ctx.care('brush');
    setResult(res?.xpGained ? `털이 반짝반짝! 💞 우정 +${res.xpGained}` : '털이 반짝반짝! ✨');
  };

  const restartBrush = () => {
    meta.current.done = false;
    setTangles(BODY_SPOTS.map(() => 1));
    setResult(null);
  };

  const sparkleOnPet = (chars: string[]) => {
    const r = petRef.current?.getBoundingClientRect();
    const box = ref.current?.getBoundingClientRect();
    if (r && box) spawn(chars, r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, { count: 10, spread: 90, rise: 90 });
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setBrushing(true);
        onBrush(e);
      }}
      onPointerMove={onBrush}
      onPointerUp={() => setBrushing(false)}
      onPointerCancel={() => setBrushing(false)}
    >
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-100 via-fuchsia-50 to-violet-100" />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[repeating-linear-gradient(45deg,#F5D0FE_0_14px,#FAE8FF_14px_28px)]" />

        {/* Mirror with the reflection */}
        <div className="absolute right-[5%] top-[10%] flex h-[46%] w-[30%] items-end justify-center overflow-hidden rounded-[50%] border-[6px] border-amber-300 bg-gradient-to-b from-sky-100 to-white shadow-md">
          <div className="opacity-70" style={{ transform: 'translateY(12%)' }}>
            <PetSprite emoji={ctx.emoji} size={size * 0.55} hue={pet.furHue} facing={-1} accessories={ctx.accessories} shiny={shiny} />
          </div>
          <span className="absolute left-2 top-2 text-sm">✨</span>
        </div>

        {/* Pet on a cushion */}
        <div className="absolute bottom-[10%] left-[36%] z-10 -translate-x-1/2">
          <div className="absolute -bottom-3 left-1/2 h-7 w-[110%] -translate-x-1/2 rounded-[50%] bg-violet-400 shadow-md" />
          <div ref={petRef} className="relative">
            <PetSprite
              emoji={ctx.emoji}
              size={sprite}
              pose={brushing && tab === 'brush' ? 'dance' : 'idle'}
              act={act?.name}
              actKey={act?.key}
              hue={pet.furHue}
              shiny={shiny}
              facing={1}
              accessories={ctx.accessories}
            >
              {tab === 'brush' &&
                tangles.map((v, i) =>
                  v > 0 ? (
                    <span
                      key={i}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[0.2em]"
                      style={{ left: `${BODY_SPOTS[i].x}%`, top: `${BODY_SPOTS[i].y}%`, opacity: v }}
                    >
                      ➰
                    </span>
                  ) : null
                )}
            </PetSprite>
          </div>
          <SpeechBubble talk={talk} style={{ bottom: sprite + 12 }} />
        </div>

        {brush && tab === 'brush' && brushing && (
          <span className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[44px] drop-shadow-lg" style={{ left: brush.x, top: brush.y }}>
            🪮
          </span>
        )}

        {tab === 'brush' && (
          <div className="absolute inset-x-3 top-3 z-20 rounded-2xl bg-white/90 px-3 py-2 text-center shadow-sm">
            <p className="text-[12px] font-bold text-[#1c1c1e]">
              {result ?? `🪮 엉킨 털 ➰ 을 빗어주세요 (${tangles.filter((v) => v === 0).length}/${tangles.length})`}
            </p>
          </div>
        )}
        {layer}
      </div>

      {/* Panel */}
      <div className="h-[34%] shrink-0 rounded-t-3xl bg-white px-3 pt-3">
        <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
          {(
            [
              ['brush', '🪮 빗질'],
              ['dress', '🎀 꾸미기'],
              ['dye', '🎨 털 색'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => {
                playPop();
                setTab(t);
              }}
              className={`rounded-xl py-2 text-[13px] font-bold ${tab === t ? 'bg-white text-[#1c1c1e] shadow-sm' : 'text-[#8e8e93]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-[calc(100%-52px)] overflow-y-auto pb-3">
          {tab === 'brush' && (
            <div className="pt-2 text-center">
              <p className="text-[13px] text-[#8e8e93]">위에서 손가락으로 친구 털을 쓱쓱 빗어주세요</p>
              {result && (
                <SceneButton tone="violet" className="mt-3" onClick={restartBrush}>
                  🪮 한 번 더 빗기
                </SceneButton>
              )}
            </div>
          )}

          {tab === 'dress' &&
            (ctx.dressItems.length === 0 ? (
              <p className="pt-4 text-center text-[13px] text-[#8e8e93]">상점에서 모자·안경·소품을 사면 여기서 입혀줄 수 있어요 🛍️</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {ctx.dressItems.map((it) => {
                  const worn = ctx.equipped[it.slot] === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={async () => {
                        playPop();
                        await ctx.onEquip(it.slot, worn ? null : it.id);
                        setAct({ name: 'spin', key: Date.now() });
                        sparkleOnPet(['✨', '🎀', '⭐']);
                        if (!worn) say('dress', 'happy');
                      }}
                      className={`flex aspect-square items-center justify-center rounded-2xl text-[26px] active:scale-90 ${
                        worn ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-black/[0.04]'
                      }`}
                    >
                      {it.emoji}
                    </button>
                  );
                })}
              </div>
            ))}

          {tab === 'dye' && (
            <div className="grid grid-cols-3 gap-2">
              {FUR_COLORS.map((c) => (
                <button
                  key={c.hue}
                  onClick={async () => {
                    playSparkle();
                    await ctx.setHue(c.hue);
                    setAct({ name: 'tada', key: Date.now() });
                    sparkleOnPet(['🎨', '✨', '💖']);
                    say('dye', 'happy');
                  }}
                  className={`flex items-center gap-2 rounded-2xl px-2 py-2.5 active:scale-95 ${
                    pet.furHue === c.hue ? 'bg-violet-50 ring-2 ring-violet-400' : 'bg-black/[0.04]'
                  }`}
                >
                  <span className="h-6 w-6 shrink-0 rounded-full ring-2 ring-white" style={{ background: c.swatch }} />
                  <span className="text-[12px] font-bold text-[#1c1c1e]">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
