'use client';

import { useEffect, useRef, useState } from 'react';
import { playBubble, playFanfare, playPop, playScrub, playSplash, playSqueak } from '@/lib/sound';
import { PetSprite, SceneButton, SpeechBubble, Talk, capturePointer, localPoint, useParticles } from './common';
import { SceneCtx } from './types';

type Step = 'ready' | 'soap' | 'rinse' | 'dry' | 'done';

const STEPS: Array<{ id: Step; label: string; tool: string; hint: string }> = [
  { id: 'soap', label: '비누칠', tool: '🧼', hint: '친구 몸을 문질러서 거품을 내요' },
  { id: 'rinse', label: '헹구기', tool: '🚿', hint: '샤워기로 거품을 씻어내요' },
  { id: 'dry', label: '말리기', tool: '🧣', hint: '수건으로 문질러 말려요' },
];

/** 욕실: soap → shower → towel, hands-on; plus 양치 (teeth brushing). */
export default function BathScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [step, setStep] = useState<Step>('ready');
  const [foam, setFoam] = useState(0);
  const [dirt, setDirt] = useState(() => (pet.clean < 60 ? (60 - pet.clean) / 60 + 0.15 : 0.15));
  const [dry, setDry] = useState(0);
  const [wet, setWet] = useState(false);
  const [tool, setTool] = useState<{ x: number; y: number } | null>(null);
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [teeth, setTeeth] = useState(false);
  const last = useRef<{ x: number; y: number; sound: number; talked: number } | null>(null);
  const holding = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => say(pet.clean < 35 ? 'dirty' : pet.clean >= 90 ? 'cleanAlready' : 'bathSoap'), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Pet centre inside the scene, for "is the tool on the pet?" checks. */
  const petBox = () => {
    const el = ref.current;
    const w = el?.clientWidth ?? 300;
    const h = el?.clientHeight ?? 500;
    return { x: w / 2, y: h * 0.62 - size * 0.45, r: size * 0.62 };
  };

  const finishing = useRef(false);
  const finish = async () => {
    // State updaters may run twice (StrictMode) — only ever finish once.
    if (finishing.current) return;
    finishing.current = true;
    setStep('done');
    setWet(false);
    setAct({ name: 'wiggle', key: Date.now() });
    playFanfare();
    const b = petBox();
    spawn(['✨', '🌟', '🫧', '💖'], b.x, b.y, { count: 16, spread: 120, rise: 120, size: 24 });
    say('bathDone', 'happy');
    const res = await ctx.care('bath');
    if (res) setResult(res.xpGained ? `깨끗함 100%! 💞 우정 +${res.xpGained}` : '깨끗함 100%! 반짝반짝 ✨');
  };

  const work = (x: number, y: number) => {
    const l = last.current;
    if (!l) return;
    const d = Math.hypot(x - l.x, y - l.y);
    l.x = x;
    l.y = y;
    const b = petBox();
    const onPet = Math.hypot(x - b.x, y - b.y) < b.r;
    const now = Date.now();

    if (step === 'soap' && onPet) {
      setFoam((f) => {
        const next = Math.min(1, f + d / 900);
        if (next >= 1 && f < 1) setTimeout(() => {
          setStep('rinse');
          say({ text: '거품 가득! 이제 헹궈줘!' }, 'happy');
        }, 200);
        return next;
      });
      setDirt((v) => Math.max(0, v - d / 700));
      if (Math.random() < d / 60) spawn('🫧', x, y, { rise: 50, spread: 30, size: 18 });
      if (now - l.sound > 160) {
        l.sound = now;
        playScrub();
      }
      if (now - l.talked > 2600) {
        l.talked = now;
        say('bathSoap', 'happy');
      }
    }

    if (step === 'rinse') {
      if (Math.random() < 0.6) spawn('💧', x, y + 30, { rise: -120, spread: 14, size: 16, dur: 700 });
      if (now - l.sound > 380) {
        l.sound = now;
        playSplash();
      }
      if (onPet) {
        setFoam((f) => {
          const next = Math.max(0, f - d / 650 - 0.01);
          if (next <= 0 && f > 0) setTimeout(() => {
            setWet(true);
            setStep('dry');
            say({ text: '다 헹궜다! 이제 수건으로 닦아줘~' });
          }, 150);
          return next;
        });
        if (Math.random() < 0.15) playBubble();
        if (now - l.talked > 2600) {
          l.talked = now;
          say('bathRinse', 'happy');
        }
      }
    }

    if (step === 'dry' && onPet) {
      setDry((v) => {
        const next = Math.min(1, v + d / 800);
        if (next >= 1 && v < 1) setTimeout(finish, 100);
        return next;
      });
      if (now - l.sound > 220) {
        l.sound = now;
        playScrub();
      }
      if (now - l.talked > 2600) {
        l.talked = now;
        say('bathDry', 'happy');
      }
    }
  };

  // The shower keeps running while held still over the pet.
  useEffect(() => {
    if (step !== 'rinse') return;
    const t = setInterval(() => {
      if (holding.current && tool) work(tool.x + 0.01, tool.y);
    }, 120);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tool]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (step === 'ready' || step === 'done') return;
    const p = localPoint(e, ref.current);
    holding.current = true;
    last.current = { x: p.x, y: p.y, sound: 0, talked: Date.now() };
    setTool(p);
    capturePointer(e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!holding.current) return;
    const p = localPoint(e, ref.current);
    setTool(p);
    work(p.x, p.y);
  };
  const onUp = () => {
    holding.current = false;
    last.current = null;
  };

  const current = STEPS.find((s) => s.id === step);
  const progress = step === 'soap' ? foam : step === 'rinse' ? 1 - foam : step === 'dry' ? dry : step === 'done' ? 1 : 0;

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="absolute inset-0 bg-[conic-gradient(#E0F2FE_0_25%,#F0F9FF_0_50%,#E0F2FE_0_75%,#F0F9FF_0)] bg-[length:40px_40px]" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-sky-200" />
      <span className="absolute right-[8%] top-[10%] text-[40px]">🪞</span>
      <span className="absolute left-[6%] top-[12%] text-[34px]">🧴</span>

      {/* Pet in the tub */}
      <div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ bottom: '30%' }}>
        <PetSprite
          emoji={ctx.emoji}
          size={size}
          pose={step === 'done' ? 'dance' : 'idle'}
          act={act?.name}
          actKey={act?.key}
          hue={pet.furHue}
          dirt={dirt}
          foam={foam}
          wet={wet}
          accessories={undefined}
        />
        <SpeechBubble talk={talk} style={{ bottom: size + 10 }} />
      </div>

      {/* Tub front (drawn over the pet's lower half) */}
      <div className="absolute bottom-[14%] left-1/2 z-20 h-[22%] w-[82%] -translate-x-1/2 rounded-b-[48px] rounded-t-xl bg-gradient-to-b from-white to-slate-100 shadow-lg ring-1 ring-black/5">
        <div className="absolute -top-3 inset-x-2 h-5 rounded-full bg-sky-300/80" />
        {(foam > 0.2 || step === 'rinse') &&
          [12, 30, 52, 70, 86].map((x, i) => (
            <span key={x} className="absolute -top-6 text-[22px]" style={{ left: `${x}%`, opacity: 0.4 + foam * 0.6, animationDelay: `${i * 0.3}s` }}>
              🫧
            </span>
          ))}
        <button
          onClick={() => {
            playSqueak();
            say({ text: '꽥꽥! 오리랑 놀자!' }, 'happy');
          }}
          className="care-duck absolute -top-9 right-[10%] text-[34px]"
        >
          🦆
        </button>
      </div>

      {/* Tool under the finger */}
      {tool && current && step !== 'done' && (
        <span
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[46px] drop-shadow-lg"
          style={{ left: tool.x, top: tool.y }}
        >
          {current.tool}
        </span>
      )}

      {/* Steps */}
      <div className="absolute inset-x-3 top-3 z-30 rounded-2xl bg-white/90 px-3 py-2 shadow-sm">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => {
            const idx = STEPS.findIndex((x) => x.id === step);
            const doneStep = step === 'done' || i < idx;
            return (
              <div
                key={s.id}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-bold ${
                  s.id === step ? 'bg-sky-500 text-white' : doneStep ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.04] text-[#8e8e93]'
                }`}
              >
                {doneStep ? '✅' : s.tool} {s.label}
              </div>
            );
          })}
        </div>
        {current && (
          <>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-center text-[11px] font-semibold text-[#1c1c1e]">👆 {current.hint}</p>
          </>
        )}
        {result && <p className="mt-1 text-center text-[12px] font-bold text-emerald-600">{result}</p>}
      </div>

      {/* Buttons */}
      <div className="absolute inset-x-4 bottom-3 z-30 flex gap-2">
        {(step === 'ready' || step === 'done') && (
          <SceneButton
            tone="sky"
            className="flex-1"
            onClick={() => {
              playPop();
              finishing.current = false;
              setStep('soap');
              setFoam(0);
              setDry(0);
              setResult(null);
              setDirt(pet.clean < 60 ? (60 - pet.clean) / 60 + 0.15 : 0.15);
              say({ text: '목욕 시간이다! 첨벙!' }, 'happy');
            }}
          >
            🛁 {step === 'done' ? '또 목욕하기' : '목욕 시작'}
          </SceneButton>
        )}
        <SceneButton tone="emerald" className="flex-1" onClick={() => setTeeth(true)}>
          🪥 양치하기
        </SceneButton>
      </div>

      {teeth && (
        <TeethGame
          onDone={async () => {
            setTeeth(false);
            say('teethDone', 'happy');
            await ctx.care('teeth');
          }}
          onClose={() => setTeeth(false)}
          say={say}
        />
      )}

      {layer}
    </div>
  );
}

/** Mini game: scrub the germs off each tooth with the brush. */
function TeethGame({ onDone, onClose, say }: { onDone: () => void; onClose: () => void; say: SceneCtx['say'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dirt, setDirt] = useState([1, 1, 1, 1, 1, 1, 1, 1]);
  const [brush, setBrush] = useState<{ x: number; y: number } | null>(null);
  const { spawn, layer } = useParticles();
  const lastSound = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    say('teeth', 'happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrub = (e: React.PointerEvent) => {
    const p = localPoint(e, ref.current);
    setBrush(p);
    if (!(e.buttons & 1) && e.pointerType === 'mouse') return;
    const teethEls = ref.current?.querySelectorAll<HTMLElement>('[data-tooth]') ?? [];
    const box = ref.current!.getBoundingClientRect();
    setDirt((prev) => {
      const next = [...prev];
      teethEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left - box.left + r.width / 2;
        const cy = r.top - box.top + r.height / 2;
        const i = Number(el.dataset.tooth);
        if (Math.hypot(p.x - cx, p.y - cy) < r.width * 0.9 && next[i] > 0) {
          next[i] = Math.max(0, next[i] - 0.08);
          if (next[i] === 0) spawn(['✨', '⭐'], cx, cy, { count: 3, spread: 20 });
        }
      });
      if (!finished.current && next.every((v) => v === 0)) {
        finished.current = true;
        playFanfare();
        setTimeout(onDone, 700);
      }
      return next;
    });
    if (Math.random() < 0.3) spawn('🫧', p.x, p.y, { rise: 30, spread: 20, size: 14 });
    if (Date.now() - lastSound.current > 150) {
      lastSound.current = Date.now();
      playScrub();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 px-6">
      <div ref={ref} className="relative w-full max-w-xs rounded-3xl bg-white p-5" style={{ touchAction: 'none' }} onPointerMove={scrub} onPointerDown={scrub}>
        <p className="text-center text-[16px] font-bold text-[#1c1c1e]">🪥 치카치카 양치하기</p>
        <p className="text-center text-[11px] text-[#8e8e93]">칫솔로 세균 🦠 을 문질러 없애요</p>
        <div className="mx-auto mt-4 rounded-[40%] bg-rose-400 px-4 py-5">
          {[0, 1].map((row) => (
            <div key={row} className={`flex justify-center gap-1.5 ${row ? 'mt-3' : ''}`}>
              {[0, 1, 2, 3].map((c) => {
                const i = row * 4 + c;
                return (
                  <div
                    key={i}
                    data-tooth={i}
                    className="relative flex h-10 w-9 items-center justify-center rounded-lg bg-white shadow-inner"
                    style={{ background: `color-mix(in srgb, #FDE68A ${Math.round(dirt[i] * 70)}%, white)` }}
                  >
                    {dirt[i] > 0.05 && (
                      <span className="text-[18px]" style={{ opacity: dirt[i] }}>
                        🦠
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {brush && (
          <span className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[40px]" style={{ left: brush.x, top: brush.y }}>
            🪥
          </span>
        )}
        {layer}
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-black/5 py-2.5 text-[13px] font-semibold text-[#8e8e93]">
          그만하기
        </button>
      </div>
    </div>
  );
}
