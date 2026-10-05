'use client';

import { useEffect, useRef, useState } from 'react';
import { foodById } from '@/lib/petCare';
import { playBoing, playFanfare, playPop, playSparkle, playSplash, playStep, playTweet } from '@/lib/sound';
import { PetSprite, SceneButton, SpeechBubble, Talk, useParticles } from './common';
import { SceneCtx } from './types';

/** Walk length in screen widths. */
const ROUTE = 8;
/** Screen widths per second while walking. */
const SPEED = 0.42;
const PET_X = 0.3;

type EventKind = 'butterfly' | 'flower' | 'puddle' | 'poop' | 'friend' | 'sniff';

interface WalkEvent {
  kind: EventKind;
  at: number;
  done: boolean;
  friend?: string;
}

const DECOR = ['🌳', '🌲', '🏠', '🌳', '🏡', '🌻', '🌳', '🚏', '⛲', '🌲', '🏫', '🌷'];
const FRIENDS = ['🐕', '🐈', '🐿️', '🦔', '🐥', '🐩'];

function makeEvents(): WalkEvent[] {
  const kinds: EventKind[] = ['butterfly', 'flower', 'puddle', 'poop', 'friend', 'sniff'];
  // Shuffle, keep five, spread along the route.
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.slice(0, 5).map((kind, i) => ({
    kind,
    at: 1.1 + i * 1.35 + Math.random() * 0.4,
    done: false,
    friend: FRIENDS[Math.floor(Math.random() * FRIENDS.length)],
  }));
}

const PROMPT: Record<EventKind, string> = {
  butterfly: '나비를 눌러봐요!',
  flower: '꽃 냄새 맡게 해줘요!',
  puddle: '눌러서 점프!',
  poop: '🧻 눌러서 치워요!',
  friend: '친구에게 인사해요!',
  sniff: '킁킁! 눌러서 파봐요',
};

/** 산책: hold to walk down the street; little things happen on the way. */
export default function WalkScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [phase, setPhase] = useState<'ready' | 'walking' | 'event' | 'done'>('ready');
  const [pos, setPos] = useState(0);
  const [events, setEvents] = useState<WalkEvent[]>(makeEvents);
  const [decor] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({ x: i * 0.42 + Math.random() * 0.2, e: DECOR[(i * 7 + 3) % DECOR.length] }))
  );
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [width, setWidth] = useState(375);
  const [flyAway, setFlyAway] = useState(false);
  const [dug, setDug] = useState<string | null>(null);
  const holding = useRef(false);
  const [held, setHeldState] = useState(false);
  const setHeld = (v: boolean) => {
    holding.current = v;
    setHeldState(v);
  };
  const posRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const tired = pet.energy < 15;
  const hour = new Date().getHours();
  const sky =
    hour >= 20 || hour < 6
      ? 'from-indigo-900 via-indigo-700 to-violet-500'
      : hour >= 17
        ? 'from-orange-300 via-rose-300 to-violet-300'
        : 'from-sky-400 via-sky-200 to-emerald-100';

  useEffect(() => {
    const fit = () => setWidth(ref.current?.clientWidth ?? 375);
    fit();
    window.addEventListener('resize', fit);
    const t = setTimeout(() => say(tired ? 'tooTired' : 'walkStart', tired ? 'sad' : 'happy'), 400);
    return () => {
      window.removeEventListener('resize', fit);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Walking loop.
  useEffect(() => {
    if (phase !== 'walking') return;
    let raf = 0;
    let last = performance.now();
    let nextStep = 0;
    let nextTalk = performance.now() + 5000;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (holding.current && phaseRef.current === 'walking') {
        let next = posRef.current + SPEED * dt;
        const ahead = events.find((e) => !e.done && e.at <= next);
        if (ahead) {
          next = ahead.at;
          setHeld(false);
          setPhase('event');
          if (ahead.kind === 'poop') {
            say('poop');
          } else if (ahead.kind === 'friend') {
            playTweet();
          }
        }
        if (next >= ROUTE) {
          next = ROUTE;
          setHeld(false);
          finish();
        }
        posRef.current = next;
        setPos(next);
        if (t > nextStep) {
          nextStep = t + 330;
          playStep();
        }
        if (t > nextTalk) {
          nextTalk = t + 6000 + Math.random() * 3000;
          say('walkStep', 'happy');
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, events]);

  const finish = async () => {
    setPhase('done');
    playFanfare();
    setAct({ name: 'tada', key: Date.now() });
    spawn(['🎉', '✨', '💖'], width * PET_X + size / 2, (ref.current?.clientHeight ?? 500) * 0.6, { count: 14, spread: 120, rise: 120 });
    say('walkDone', 'happy');
    const res = await ctx.care('walk');
    if (!res) return;
    const found = res.found ? foodById(res.found) : null;
    setResult(
      `😊 기분 +22 · ⚡ 에너지 -25${res.xpGained ? ` · 💞 우정 +${res.xpGained}` : ''}` +
        (found ? `\n${found.emoji} ${found.name}를 주웠어요! 냉장고에 넣어뒀어요` : '')
    );
    if (found) setTimeout(() => say({ text: `와! ${found.emoji} ${found.name} 찾았다!` }, 'happy'), 2600);
  };

  const resolve = (e: WalkEvent) => {
    if (phase !== 'event') return;
    const h = ref.current?.clientHeight ?? 500;
    const ex = width * PET_X + size * 0.9;
    const ey = h * 0.72;
    switch (e.kind) {
      case 'butterfly':
        setFlyAway(true);
        playTweet();
        setAct({ name: 'spin', key: Date.now() });
        say('butterfly', 'happy');
        break;
      case 'flower':
        setAct({ name: 'wiggle', key: Date.now() });
        spawn(['💕', '🌸', '✨'], ex, ey - 30, { count: 8, spread: 50 });
        say('flower', 'happy');
        break;
      case 'puddle':
        playSplash();
        playBoing();
        setAct({ name: 'flip', key: Date.now() });
        spawn('💧', ex, ey, { count: 10, spread: 60, rise: 70, size: 18 });
        say('puddle', 'happy');
        break;
      case 'poop':
        playSparkle();
        spawn(['✨', '🌟'], width * PET_X - size * 0.3, ey, { count: 8, spread: 40 });
        say('poopClean', 'happy');
        ctx.toast('🧻 착한 보호자! 산책길이 깨끗해졌어요');
        break;
      case 'friend':
        playPop();
        spawn(['💖', '👋', '💕'], ex, ey - 40, { count: 8, spread: 60 });
        setAct({ name: 'tada', key: Date.now() });
        say('friend', 'happy');
        break;
      case 'sniff': {
        const thing = ['🦴', '🌰', '🍂', '🪨', '🐛', '🍀'][Math.floor(Math.random() * 6)];
        setDug(thing);
        setAct({ name: 'shake', key: Date.now() });
        playPop();
        say({ text: thing === '🍀' ? '네잎클로버다! 행운이야!' : `킁킁… ${thing} 찾았다!` }, 'happy');
        break;
      }
    }
    setTimeout(() => {
      setFlyAway(false);
      setDug(null);
      setEvents((prev) => prev.map((x) => (x === e ? { ...x, done: true } : x)));
      setPhase('walking');
    }, 1300);
  };

  const restart = () => {
    posRef.current = 0;
    setPos(0);
    setEvents(makeEvents());
    setResult(null);
    setPhase('walking');
    say('walkStart', 'happy');
  };

  const moving = phase === 'walking' && held;
  const current = events.find((e) => !e.done && phase === 'event' && Math.abs(e.at - pos) < 0.01);
  const sx = (worldX: number, parallax = 1) => (worldX - pos * parallax) * width;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Sky & far hills */}
      <div className={`absolute inset-0 bg-gradient-to-b ${sky}`} />
      <span className="absolute right-[10%] top-[8%] text-[44px]">{hour >= 20 || hour < 6 ? '🌙' : '☀️'}</span>
      {[0.2, 0.9, 1.6, 2.4].map((c, i) => (
        <span
          key={i}
          className="absolute text-[40px] opacity-90"
          style={{ left: (((c - pos * 0.08) % 2.5) + 2.5) % 2.5 * width - 40, top: `${10 + (i % 2) * 10}%` }}
        >
          ☁️
        </span>
      ))}
      <div
        className="absolute inset-x-0 bottom-[30%] h-[22%]"
        style={{
          background: 'radial-gradient(ellipse 60% 100% at 30% 100%, #86EFAC 60%, transparent 61%), radial-gradient(ellipse 50% 90% at 80% 100%, #4ADE80 60%, transparent 61%)',
          backgroundSize: `${width * 1.2}px 100%`,
          backgroundPositionX: -pos * width * 0.3,
        }}
      />

      {/* Street-side decor */}
      {decor.map((d, i) => {
        const x = sx(d.x, 0.75);
        if (x < -80 || x > width + 40) return null;
        return (
          <span key={i} className="absolute bottom-[30%] text-[52px] leading-none" style={{ left: x }}>
            {d.e}
          </span>
        );
      })}

      {/* Path */}
      <div className="absolute inset-x-0 bottom-0 h-[31%] bg-[#D6B98C]" />
      <div
        className="absolute inset-x-0 bottom-[12%] h-[6px]"
        style={{
          background: 'repeating-linear-gradient(90deg, #fff8 0 40px, transparent 40px 80px)',
          backgroundPositionX: -pos * width,
        }}
      />
      <div className="absolute inset-x-0 bottom-[30%] h-3 bg-[#7BC67E]" />

      {/* Home sign at the end */}
      {sx(ROUTE + PET_X + 0.2) < width + 60 && (
        <span className="absolute bottom-[22%] text-[56px]" style={{ left: sx(ROUTE + PET_X + 0.15) }}>
          🏠
        </span>
      )}

      {/* Events */}
      {events.map((e, i) => {
        const x = width * PET_X + size * 0.55 + (e.at - pos) * width;
        if (x < -60 || x > width + 60) return null;
        const active = current === e;
        const content =
          e.kind === 'butterfly' ? (
            <span className={`inline-block ${active && flyAway ? 'care-fly-off' : 'animate-bounce'}`}>🦋</span>
          ) : e.kind === 'flower' ? (
            '🌷'
          ) : e.kind === 'puddle' ? (
            <span className="inline-block h-5 w-20 rounded-[50%] bg-sky-400/70 ring-2 ring-sky-200" />
          ) : e.kind === 'poop' ? (
            e.done ? null : (
              <span className="relative inline-block" style={{ left: -(size * 0.9) }}>
                💩{active && <span className="absolute -right-10 top-0 text-[30px]">🧻</span>}
              </span>
            )
          ) : e.kind === 'friend' ? (
            <span className="inline-block" style={{ transform: 'scaleX(1)' }}>
              {e.friend}
            </span>
          ) : (
            <span>{dug && active ? dug : '✨'}</span>
          );
        return (
          <button
            key={i}
            onClick={() => resolve(e)}
            disabled={!active}
            className="absolute z-20 text-[40px] leading-none"
            style={{ left: x, bottom: e.kind === 'butterfly' ? '30%' : '13%' }}
          >
            {content}
            {active && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-violet-600 shadow animate-pulse">
                {PROMPT[e.kind]}
              </span>
            )}
          </button>
        );
      })}

      {/* Leash + pet */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <path
          d={`M ${width * 0.04} ${(ref.current?.clientHeight ?? 500) * 0.97} Q ${width * 0.12} ${(ref.current?.clientHeight ?? 500) * 0.8} ${width * PET_X + size * 0.25} ${(ref.current?.clientHeight ?? 500) * 0.87 - size * 0.55}`}
          stroke="#E11D48"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute bottom-0 left-0 z-10 text-[38px]">✋</span>
      <div className="absolute z-10" style={{ left: width * PET_X - size * 0.25, bottom: '11%' }}>
        <div className="absolute -bottom-1 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/15 blur-[2px]" />
        <PetSprite
          emoji={ctx.emoji}
          size={size * 0.85}
          pose={moving ? 'walk' : 'idle'}
          act={act?.name}
          actKey={act?.key}
          hue={pet.furHue}
          dirt={pet.clean < 50 ? (50 - pet.clean) / 50 : 0}
          facing={1}
          accessories={ctx.accessories}
        />
        <SpeechBubble talk={talk} style={{ bottom: size * 0.85 + 10 }} />
      </div>

      {/* Progress */}
      <div className="absolute inset-x-3 top-3 z-20 rounded-2xl bg-white/90 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🐾</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(pos / ROUTE) * 100}%` }} />
          </div>
          <span className="text-[14px]">🏠</span>
        </div>
        {result && <p className="mt-1.5 whitespace-pre-line text-center text-[12px] font-bold text-emerald-600">{result}</p>}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-4 bottom-3 z-30 flex gap-2">
        {phase === 'ready' &&
          (tired ? (
            <SceneButton tone="slate" className="flex-1" onClick={() => ctx.go('bed')}>
              😴 너무 졸려요 · 침실로 가기
            </SceneButton>
          ) : (
            <SceneButton tone="emerald" className="flex-1" onClick={restart}>
              🦮 산책 출발!
            </SceneButton>
          ))}
        {phase === 'walking' && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              setHeld(true);
            }}
            onPointerUp={() => setHeld(false)}
            onPointerLeave={() => setHeld(false)}
            onPointerCancel={() => setHeld(false)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-[16px] font-bold text-white shadow-lg active:scale-95"
          >
            👣 꾹 누르고 있으면 걸어요
          </button>
        )}
        {phase === 'event' && (
          <p className="flex-1 rounded-2xl bg-white/90 py-3 text-center text-[14px] font-bold text-violet-600">
            앗! 뭔가 있어요 👀 위를 눌러보세요
          </p>
        )}
        {phase === 'done' && (
          <>
            <SceneButton tone="violet" className="flex-1" onClick={() => ctx.go('living')}>
              🏠 집으로
            </SceneButton>
            {pet.energy >= 15 && (
              <SceneButton tone="emerald" className="flex-1" onClick={restart}>
                🦮 한 번 더
              </SceneButton>
            )}
          </>
        )}
      </div>

      {layer}
    </div>
  );
}
