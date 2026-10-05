'use client';

import { useEffect, useRef, useState } from 'react';
import { playBoing, playPop, playSparkle, playSqueak } from '@/lib/sound';
import { PetSprite, SpeechBubble, SpritePose, Talk, capturePointer, localPoint, useParticles } from './common';
import { SceneCtx, SceneId } from './types';
import { ShopItem } from '@/lib/characterShop';
import { friendLevelOf } from '@/lib/petCare';
import { ItemIcon } from '@/components/CreatureArt';

const CHECKLIST: Array<{ key: 'fed' | 'bath' | 'brush' | 'walk' | 'sleep'; label: string; emoji: string; scene: SceneId }> = [
  { key: 'fed', label: '밥', emoji: '🍽️', scene: 'kitchen' },
  { key: 'bath', label: '목욕', emoji: '🛁', scene: 'bath' },
  { key: 'brush', label: '빗질', emoji: '🪮', scene: 'groom' },
  { key: 'walk', label: '산책', emoji: '🌳', scene: 'walk' },
  { key: 'sleep', label: '잠', emoji: '🌙', scene: 'bed' },
];

const TAP_ACTS = ['tada', 'spin', 'squash', 'wiggle'];

/** 거실: pet, chat, stroke for cuddles, clean up after it, daily checklist. */
export default function LivingScene({
  ctx,
  talk,
  friends = [],
  onFriend,
}: {
  ctx: SceneCtx;
  talk: Talk | null;
  friends?: ShopItem[];
  onFriend?: (id: string) => void;
}) {
  const { pet, size, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [x, setX] = useState(50);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [pose, setPose] = useState<SpritePose>('idle');
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const stroke = useRef<{ x: number; y: number; dist: number; lastPat: number } | null>(null);
  const night = new Date().getHours() >= 20 || new Date().getHours() < 7;

  // Wander around the room now and then.
  useEffect(() => {
    let walkTimer: ReturnType<typeof setTimeout>;
    const t = setInterval(() => {
      if (stroke.current) return;
      setX((cur) => {
        const next = 25 + Math.random() * 50;
        setFacing(next > cur ? 1 : -1);
        return next;
      });
      setPose('walk');
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => setPose('idle'), 1400);
    }, 6500);
    return () => {
      clearInterval(t);
      clearTimeout(walkTimer);
    };
  }, []);

  const petCenter = () => {
    const el = ref.current;
    const w = el?.clientWidth ?? 300;
    const h = el?.clientHeight ?? 500;
    return { x: (x / 100) * w, y: h * 0.84 - size * 0.6 };
  };

  const doAct = (name: string) => setAct({ name, key: Date.now() });

  const onPetDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const p = localPoint(e, ref.current);
    stroke.current = { x: p.x, y: p.y, dist: 0, lastPat: 0 };
    capturePointer(e);
  };

  const onPetMove = (e: React.PointerEvent) => {
    const s = stroke.current;
    if (!s) return;
    const p = localPoint(e, ref.current);
    s.dist += Math.hypot(p.x - s.x, p.y - s.y);
    s.x = p.x;
    s.y = p.y;
    if (s.dist > 70) {
      s.dist = 0;
      spawn(['💕', '💗', '✨'], p.x, p.y, { count: 2, rise: 50 });
      setPose('dance');
      if (Date.now() - s.lastPat > 1800) {
        s.lastPat = Date.now();
        say('pat', 'happy');
      }
    }
  };

  const onPetUp = () => {
    const s = stroke.current;
    stroke.current = null;
    setPose('idle');
    if (s && s.lastPat === 0 && s.dist < 20) {
      // A plain tap: a little trick and a chat.
      doAct(TAP_ACTS[Math.floor(Math.random() * TAP_ACTS.length)]);
      playBoing();
      const c = petCenter();
      spawn(['💖', '⭐', '✨'], c.x, c.y - size * 0.3, { count: 4, spread: 60 });
      say(Math.random() < 0.25 ? 'study' : 'tap', 'happy');
    }
  };

  const cleanPoop = () => {
    if (sweeping) return;
    setSweeping(true);
    playPop();
    setTimeout(() => {
      const el = ref.current;
      spawn(['✨', '🌟'], (el?.clientWidth ?? 300) * 0.8, (el?.clientHeight ?? 500) * 0.82, { count: 8, spread: 50 });
      playSparkle();
      ctx.setPoop(false);
      setSweeping(false);
      say('poopClean', 'happy');
      doAct('tada');
    }, 800);
  };

  const done = CHECKLIST.filter((c) => pet.today[c.key]).length;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Room */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FDF0D5] to-[#F8E1B8]" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[repeating-linear-gradient(90deg,#C8925A_0_46px,#BC8650_46px_48px)]" />
      <div className="absolute inset-x-0 bottom-[30%] h-2 bg-[#A87443]" />
      <div
        className={`absolute left-[8%] top-[24%] aspect-[4/3] w-[34%] rounded-xl border-[6px] border-white shadow-inner ${
          night ? 'bg-gradient-to-b from-indigo-900 to-indigo-600' : 'bg-gradient-to-b from-sky-300 to-sky-100'
        }`}
      >
        <span className="absolute right-2 top-1 text-2xl">{night ? '🌙' : '☀️'}</span>
        <span className="absolute bottom-1 left-2 text-xl">{night ? '⭐' : '☁️'}</span>
      </div>
      <span className="absolute right-[8%] top-[24%] text-[44px]">🖼️</span>
      <div className="absolute right-[6%] top-[42%] w-[36%]">
        <div className="flex justify-around text-[28px] leading-none">
          <span>📚</span>
          <span>🏆</span>
          <span>🕰️</span>
        </div>
        <div className="mt-0.5 h-2 rounded-full bg-[#A87443] shadow" />
      </div>
      <span className="absolute bottom-[27%] right-[3%] text-[78px] leading-none">🛋️</span>
      <span className="absolute bottom-[28%] left-[2%] text-[56px] leading-none">🪴</span>
      <div className="absolute bottom-[8%] left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-[50%] bg-rose-300/60" />

      {/* Today's care checklist */}
      <div className="absolute inset-x-3 top-3 z-20 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-[12px] font-bold text-[#1c1c1e]">
          {done === CHECKLIST.length ? '🏆 오늘 최고의 보호자예요!' : `📋 오늘의 돌봄 ${done}/${CHECKLIST.length}`}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {CHECKLIST.map((c) => (
            <button
              key={c.key}
              onClick={() => ctx.go(c.scene)}
              className={`flex flex-1 flex-col items-center rounded-xl py-1 active:scale-90 ${
                pet.today[c.key] ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-black/[0.04]'
              }`}
            >
              <span className="text-[17px] leading-none">{pet.today[c.key] ? '✅' : c.emoji}</span>
              <span className="mt-0.5 text-[10px] font-bold text-[#1c1c1e]">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Friends from the shop live here too — tap one to look after it */}
      {friends.length > 0 && (
        <div className="absolute inset-x-3 top-[118px] z-20 rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
          <p className="text-[11px] font-bold text-[#1c1c1e]">🐾 같이 사는 친구들 · 눌러서 돌봐주기</p>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => onFriend?.(f.id)}
                className="flex shrink-0 flex-col items-center rounded-xl bg-violet-50 px-2 py-1 active:scale-90"
              >
                <ItemIcon item={f} size={30} />
                <span className="text-[9px] font-bold text-violet-600">Lv.{friendLevelOf(pet.friends[f.id]?.xp ?? 0).level}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toy */}
      <button
        className="absolute bottom-[10%] left-[10%] z-10 text-[40px] leading-none active:scale-90"
        onClick={() => {
          playSqueak();
          setFacing(-1);
          setX(26);
          setPose('run');
          setTimeout(() => {
            setPose('idle');
            doAct('spin');
            say({ text: '공 좋아! 또 던져줘!' }, 'happy');
          }, 1100);
        }}
      >
        🧸
      </button>

      {/* Poop */}
      {ctx.poop && (
        <button
          onClick={cleanPoop}
          className="absolute bottom-[12%] right-[14%] z-10 text-[38px] leading-none active:scale-90"
          aria-label="응가 치우기"
        >
          <span className={sweeping ? 'care-swept' : 'animate-bounce inline-block'}>💩</span>
          {sweeping && <span className="care-broom">🧹</span>}
          {!sweeping && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#1c1c1e]">
              눌러서 치우기
            </span>
          )}
        </button>
      )}

      {/* The buddy */}
      <div
        className="absolute z-10"
        style={{ left: `${x}%`, bottom: '14%', transform: 'translateX(-50%)', transition: 'left 1.4s ease-in-out' }}
        onPointerDown={onPetDown}
        onPointerMove={onPetMove}
        onPointerUp={onPetUp}
        onPointerCancel={onPetUp}
      >
        <div className="absolute -bottom-2 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/15 blur-[2px]" />
        <PetSprite
          emoji={ctx.emoji}
          size={size}
          pose={pose}
          act={act?.name}
          actKey={act?.key}
          hue={pet.furHue}
          dirt={pet.clean < 50 ? (50 - pet.clean) / 50 : 0}
          shiny={pet.groomedUntil > Date.now()}
          facing={facing}
          accessories={ctx.accessories}
        />
        <SpeechBubble talk={talk} style={{ bottom: size + 12 }} />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[11px] font-bold text-white/90 drop-shadow">
        콕 누르면 이야기해요 · 손가락으로 쓰다듬어 주세요
      </p>
      {layer}
    </div>
  );
}
