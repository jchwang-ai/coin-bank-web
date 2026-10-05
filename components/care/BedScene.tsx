'use client';

import { useEffect, useRef, useState } from 'react';
import { playFanfare, playLullaby, playPop } from '@/lib/sound';
import { PetSprite, SceneButton, SpeechBubble, Talk, useParticles } from './common';
import { SceneCtx } from './types';

const DREAMS = ['🍖', '🦋', '⭐', '🍎', '🎈', '🌈', '🍪', '🏖️', '🎠'];
const SLEEP_MS = 9000;

/** 침실: lights off, a lullaby, pat it to sleep — energy refills. */
export default function BedScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [phase, setPhase] = useState<'awake' | 'sleeping' | 'done'>('awake');
  const [progress, setProgress] = useState(0);
  const [dream, setDream] = useState(DREAMS[0]);
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => say(pet.energy < 40 ? 'tired' : 'notSleepy'), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'sleeping') return;
    playLullaby();
    const lull = setInterval(playLullaby, 3200);
    const start = performance.now();
    const tick = setInterval(() => {
      const p = Math.min(1, progressRef.current + 100 / SLEEP_MS);
      progressRef.current = p;
      setProgress(p);
      const el = ref.current;
      if (Math.random() < 0.25 && el) {
        spawn(['💤', 'Z', 'z'], el.clientWidth * 0.55, el.clientHeight * 0.48, { rise: 70, spread: 30, size: 22, dur: 1800 });
      }
      if (p >= 1) finish();
    }, 100);
    const dreams = setInterval(() => setDream(DREAMS[Math.floor(Math.random() * DREAMS.length)]), 1500);
    const mumble = setInterval(() => say('dream'), 4200);
    void start;
    return () => {
      clearInterval(lull);
      clearInterval(tick);
      clearInterval(dreams);
      clearInterval(mumble);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finished = useRef(false);
  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    setPhase('done');
    playFanfare();
    setAct({ name: 'tada', key: Date.now() });
    say('wake', 'happy');
    const res = await ctx.care('sleep');
    if (res) setResult(`⚡ 에너지 100%!${res.xpGained ? ` 💞 우정 +${res.xpGained}` : ''}`);
  };

  const start = () => {
    if (pet.energy >= 85) {
      setAct({ name: 'spin', key: Date.now() });
      say('notSleepy', 'happy');
      return;
    }
    if (!ctx.precheck(true)) return;
    playPop();
    progressRef.current = 0;
    finished.current = false;
    setProgress(0);
    setResult(null);
    setPhase('sleeping');
    say('sleepy');
  };

  const pat = () => {
    progressRef.current = Math.min(1, progressRef.current + 0.07);
    const el = ref.current;
    if (el) spawn(['💕', '✨'], el.clientWidth * 0.5, el.clientHeight * 0.55, { count: 2, spread: 30 });
  };

  const asleep = phase === 'sleeping';

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-200 to-indigo-200" />
      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[#C4B5FD]" />
      <div className="absolute left-[8%] top-[10%] h-[24%] w-[32%] rounded-t-full border-[6px] border-white bg-gradient-to-b from-indigo-900 to-indigo-600">
        <span className="absolute right-3 top-3 text-2xl">🌙</span>
        <span className="animate-twinkle absolute left-4 top-6 text-xs">⭐</span>
        <span className="animate-twinkle absolute bottom-4 left-10 text-xs" style={{ animationDelay: '0.8s' }}>
          ⭐
        </span>
      </div>
      <span className={`absolute right-[8%] top-[18%] text-[40px] transition-opacity duration-700 ${asleep ? 'opacity-30' : ''}`}>💡</span>
      <span className="absolute bottom-[20%] right-[6%] text-[44px]">🧸</span>

      {/* Bed */}
      <div className="absolute bottom-[12%] left-1/2 h-[30%] w-[78%] -translate-x-1/2">
        <div className="absolute bottom-[30%] left-0 h-[85%] w-[16%] rounded-t-3xl bg-amber-700" />
        <div className="absolute bottom-[18%] left-[4%] right-0 h-[38%] rounded-2xl bg-white shadow" />
        <div className="absolute bottom-[50%] left-[12%] h-[22%] w-[24%] rounded-2xl bg-sky-100 shadow-inner" />
      </div>

      {/* Pet */}
      <div
        className="absolute z-10 transition-all duration-700"
        style={{
          left: asleep ? '30%' : '50%',
          bottom: asleep ? '27%' : '14%',
          transform: `translateX(-50%) ${asleep ? 'rotate(-80deg)' : ''}`,
        }}
      >
        <PetSprite
          emoji={ctx.emoji}
          size={size * 0.85}
          pose={asleep ? 'sleep' : phase === 'done' ? 'dance' : 'idle'}
          act={act?.name}
          actKey={act?.key}
          hue={pet.furHue}
          facing={1}
          accessories={asleep ? undefined : ctx.accessories}
        />
        {!asleep && <SpeechBubble talk={talk} style={{ bottom: size * 0.85 + 10 }} />}
      </div>

      {/* Blanket over the sleeper */}
      {asleep && (
        <div className="absolute bottom-[22%] left-[22%] z-20 h-[13%] w-[62%] rounded-t-[40px] bg-gradient-to-r from-pink-300 to-rose-300 shadow-md">
          <div className="absolute inset-x-0 top-2 h-1 bg-white/40" />
        </div>
      )}

      {/* Dream bubble */}
      {asleep && (
        <div className="absolute left-[46%] top-[26%] z-30">
          <div className="animate-pop-in flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-[38px] shadow-md">
            <span key={dream} className="animate-pop-in">{dream}</span>
          </div>
          <span className="absolute -bottom-3 left-2 h-3 w-3 rounded-full bg-white/90" />
          <span className="absolute -bottom-6 -left-1 h-2 w-2 rounded-full bg-white/90" />
          {talk && <p className="mt-6 text-center text-[12px] font-bold text-white drop-shadow">{talk.text}</p>}
        </div>
      )}

      {/* Lights */}
      <div className={`pointer-events-none absolute inset-0 z-[25] bg-indigo-950 transition-opacity duration-1000 ${asleep ? 'opacity-60' : 'opacity-0'}`} />

      {(asleep || result) && (
        <div className="absolute inset-x-3 top-3 z-30 rounded-2xl bg-white/90 px-3 py-2 shadow-sm">
          {asleep ? (
            <>
              <p className="text-center text-[12px] font-bold text-[#1c1c1e]">쿨쿨… 토닥토닥 해주면 더 빨리 잠들어요</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-center text-[13px] font-bold text-emerald-600">{result}</p>
          )}
        </div>
      )}

      <div className="absolute inset-x-4 bottom-3 z-30 flex gap-2">
        {asleep ? (
          <>
            <SceneButton tone="violet" className="flex-1" onClick={pat}>
              🤲 토닥토닥
            </SceneButton>
            <SceneButton
              tone="slate"
              onClick={() => {
                setPhase('awake');
                say({ text: '으응… 더 자고 싶었는데' }, 'sad');
              }}
            >
              깨우기
            </SceneButton>
          </>
        ) : (
          <SceneButton tone="slate" className="flex-1" onClick={start}>
            🌙 불 끄고 재우기
          </SceneButton>
        )}
      </div>

      {layer}
    </div>
  );
}
