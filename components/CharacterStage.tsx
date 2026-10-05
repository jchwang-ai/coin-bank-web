'use client';

import {
  CSSProperties,
  ReactNode,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ShopItem, itemById } from '@/lib/characterShop';
import { animalOf, computeGrowth } from '@/lib/diaryPet';
import { creatureForBuddy, creatureForItem, isRoamer } from '@/lib/creatures';
import { TrickId } from '@/lib/petCare';
import {
  Actor,
  FxSpec,
  RosterEntry,
  SoundName,
  World,
  dragTo,
  dropFood,
  grab,
  kickBallFrom,
  performTrick,
  release,
  removeBall,
  resizeWorld,
  startParty,
  stepWorld,
  syncRoster,
  tapActor,
  tapGround,
  throwBall,
} from '@/lib/stageWorld';
import {
  playBlub,
  playBoing,
  playBuzz,
  playChomp,
  playMelody,
  playPop,
  playRoar,
  playSparkle,
  playSqueak,
  playTweet,
} from '@/lib/sound';
import CreatureArt from './CreatureArt';

/** One-off things the page asks the stage to do (feed, show a new trick). */
export interface StageSignal {
  key: number;
  kind: 'feed' | 'trick';
  emoji?: string;
  trick?: TrickId;
}

interface CharacterStageProps {
  /** The free buddy animal picked in BuddyPickerSheet. */
  baseAnimalId: string | null;
  equipped: Record<string, string>;
  /** Everything owned — fullscreen gathers every friend at once. */
  ownedIds?: string[];
  completedCount: number;
  /** Child-made items, needed to resolve `custom:` ids. */
  customItems?: ShopItem[];
  tricks?: TrickId[];
  mood?: { hungry: boolean; sad: boolean; happy: boolean };
  signal?: StageSignal | null;
  /** Ball / party used — cheers the buddy up server-side. */
  onPlay?: () => void;
  /** Shown under the stage in fullscreen (e.g. the food bar). */
  fullscreenFooter?: ReactNode;
}

const CARD_HEIGHT = 230;

const SOUNDS: Record<SoundName, () => void> = {
  pop: playPop,
  tweet: playTweet,
  buzz: playBuzz,
  squeak: playSqueak,
  roar: playRoar,
  blub: playBlub,
  boing: playBoing,
  chomp: playChomp,
  melody: playMelody,
  sparkle: playSparkle,
};

function isNightNow() {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
}

export default function CharacterStage(props: CharacterStageProps) {
  const [full, setFull] = useState(false);

  const enter = () => {
    playPop();
    setFull(true);
    // Real fullscreen where the browser allows it (Android/desktop); on
    // iPhone the fixed overlay alone still fills the screen.
    try {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else el.webkitRequestFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  const exit = () => {
    playPop();
    setFull(false);
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  if (!full) return <StageView {...props} mode="card" onExpand={enter} />;

  return (
    <>
      <button
        onClick={enter}
        className="flex w-full items-center justify-center rounded-3xl bg-black/[0.05] text-[13px] font-bold text-[#8e8e93]"
        style={{ height: CARD_HEIGHT }}
      >
        크게 보는 중이에요 ⛶
      </button>
      {createPortal(
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#1c1c1e]">
          <StageView {...props} mode="full" onClose={exit} />
        </div>,
        document.body
      )}
    </>
  );
}

// ── particles ──────────────────────────────────────────────────────────

interface FxItem extends FxSpec {
  id: number;
  end: number;
}

interface FxHandle {
  spawn: (specs: FxSpec[]) => void;
}

const FxLayer = forwardRef<FxHandle>(function FxLayer(_, ref) {
  const [items, setItems] = useState<FxItem[]>([]);
  const seq = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      spawn(specs) {
        const now = performance.now();
        setItems((prev) => {
          const alive = prev.filter((p) => p.end > now);
          const added = specs.map((s) => ({ ...s, id: ++seq.current, end: now + s.dur + (s.delay || 0) }));
          return [...alive, ...added].slice(-90);
        });
      },
    }),
    []
  );

  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setItems((prev) => {
        const alive = prev.filter((p) => p.end > now);
        return alive.length === prev.length ? prev : alive;
      });
    }, 900);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {items.map((p) => (
        <span
          key={p.id}
          className={`fx ${p.kind === 'emote' ? 'fx-emote' : p.kind === 'ripple' ? 'fx-ripple' : ''}`}
          style={
            {
              left: p.x,
              top: p.y,
              fontSize: p.size,
              zIndex: 3000,
              animationDuration: `${p.dur}ms`,
              animationDelay: p.delay ? `${p.delay}ms` : undefined,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot || 0}deg`,
              '--s1': p.scale ?? 1,
            } as CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
    </>
  );
});

// ── the stage ──────────────────────────────────────────────────────────

interface StageViewProps extends CharacterStageProps {
  mode: 'card' | 'full';
  onExpand?: () => void;
  onClose?: () => void;
}

function StageView({
  mode,
  baseAnimalId,
  equipped,
  ownedIds = [],
  completedCount,
  customItems = [],
  tricks = ['jump'],
  mood,
  signal,
  onPlay,
  fullscreenFooter,
  onExpand,
  onClose,
}: StageViewProps) {
  const isFull = mode === 'full';
  const growth = computeGrowth(completedCount);
  const isEgg = growth.stage.level === 1;
  const animal = animalOf(baseAnimalId);
  const [night] = useState(isNightNow);

  const resolve = (id: string | undefined) =>
    id ? itemById(id) || customItems.find((c) => c.id === id) : undefined;

  const hat = resolve(equipped.hat);
  const face = resolve(equipped.face);
  const held = resolve(equipped.held);
  const background = resolve(equipped.background);
  const effect = resolve(equipped.effect);
  const bgGradient = background?.gradient || (animal?.gradient ?? 'from-violet-200 via-purple-200 to-pink-200');
  const aura = tricks.includes('aura');

  // Who is on stage: the child's own buddy, plus equipped friends (card) or
  // every friend they own (fullscreen). Bought characters JOIN the buddy.
  const roster = useMemo<RosterEntry[]>(() => {
    const mainCreature = creatureForBuddy(animal);
    if (isEgg) mainCreature.art = { kind: 'emoji', emoji: '🥚' };
    const list: RosterEntry[] = [
      { key: 'main', creature: mainCreature, isMain: true, base: growth.stage.size * 0.85 },
    ];
    const ids = isFull
      ? Array.from(new Set([...Object.values(equipped), ...ownedIds]))
      : Object.values(equipped);
    for (const id of ids) {
      const item = itemById(id) || customItems.find((c) => c.id === id);
      if (!item || !isRoamer(item)) continue;
      const c = creatureForItem(item);
      list.push({ key: item.id, creature: c, isMain: false, base: c.size });
      if (list.length >= (isFull ? 18 : 7)) break;
    }
    return list;
  }, [animal, isEgg, growth.stage.size, isFull, equipped, ownedIds, customItems]);

  const stageRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<FxHandle>(null);
  const actorEls = useRef(new Map<string, HTMLDivElement>());
  const shadowEls = useRef(new Map<string, HTMLDivElement>());
  const foodEl = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLDivElement>(null);
  const [hasBall, setHasBall] = useState(false);
  const [party, setParty] = useState(false);
  // Size-dependent decor, copied out of the world after each measure.
  const [layout, setLayout] = useState<{ flowers: World['flowers']; unit: number }>({ flowers: [], unit: 1 });

  // The world is a long-lived mutable object owned by the animation loop.
  const [world] = useState<World>(() => ({
    w: 0,
    h: 0,
    unit: 1,
    gMin: 0,
    gMax: 0,
    topPad: 4,
    now: 0,
    actors: [],
    food: null,
    ball: null,
    flowers: [],
    partyUntil: 0,
    props: { tricks: ['jump'], hungry: false, sad: false, happy: false, isEgg: false, night: false, effect: null, aura: false },
    fxQueue: [],
    sound: (name) => SOUNDS[name]?.(),
  }));

  const effectEmoji = effect?.emoji ?? null;
  useEffect(() => {
    world.props = {
      tricks,
      hungry: !!mood?.hungry,
      sad: !!mood?.sad,
      happy: !!mood?.happy,
      isEgg,
      night,
      effect: effectEmoji,
      aura,
    };
  });

  // Size tracking → world dimensions and creature scale.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const unit = isFull
        ? Math.min(2.4, Math.max(1.3, Math.min(r.width / 320, r.height / 560) * 1.35))
        : Math.min(1.3, Math.max(0.8, r.width / 360));
      resizeWorld(world, r.width, r.height, unit, isFull);
      setLayout({ flowers: world.flowers, unit });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [world, isFull]);

  // Keep actors in sync with the roster.
  const rosterKey = roster.map((r) => `${r.key}:${r.base}:${r.creature.art.kind}`).join('|');
  useEffect(() => {
    world.now = performance.now();
    syncRoster(world, roster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  // The animation loop: step the world, then copy it onto the DOM.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const actSeen = new Map<string, number>();

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      world.now = t;
      if (world.w > 0) stepWorld(world, dt);

      for (const a of world.actors) {
        const el = actorEls.current.get(a.key);
        if (!el) continue;
        const left = a.x - a.size / 2;
        const top = a.y - a.z - a.size;
        el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
        const sz = `${a.size.toFixed(1)}px`;
        if (el.style.fontSize !== sz) {
          el.style.width = sz;
          el.style.height = sz;
          el.style.fontSize = sz;
        }
        el.style.zIndex = String(Math.round(a.y) + (a.z > a.size * 0.6 ? 1000 : 0));
        if (el.dataset.pose !== a.pose) el.dataset.pose = a.pose;

        // Emoji face left, SVG drawings face right.
        const faceEl = el.firstElementChild as HTMLElement | null;
        if (faceEl) {
          const flip = a.c.art.kind === 'emoji' ? -a.facing : a.facing;
          faceEl.style.transform = `scaleX(${flip}) rotate(${a.tilt.toFixed(1)}deg)`;
        }

        // Replay one-shot actions by toggling the attribute.
        if (actSeen.get(a.key) !== a.actSeq) {
          actSeen.set(a.key, a.actSeq);
          el.removeAttribute('data-act');
          void el.offsetWidth;
          if (a.act) el.dataset.act = a.act;
        } else if (!a.act && el.dataset.act) {
          el.removeAttribute('data-act');
        }

        const sh = shadowEls.current.get(a.key);
        if (sh) {
          const sw = a.size * 0.72;
          const lift = Math.min(0.65, a.z / (world.h * 0.6));
          sh.style.width = `${sw}px`;
          sh.style.height = `${sw * 0.28}px`;
          sh.style.transform = `translate3d(${(a.x - sw / 2).toFixed(1)}px, ${(a.y - sw * 0.14).toFixed(1)}px, 0) scale(${1 - lift})`;
          sh.style.opacity = String(a.c.loco === 'orbit' ? 0 : 0.9 - lift);
          sh.style.zIndex = String(Math.round(a.y) - 1);
        }
      }

      for (const [thing, el] of [
        [world.food, foodEl.current],
        [world.ball, ballEl.current],
      ] as const) {
        if (!el) continue;
        if (!thing) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = 'block';
        const s = thing.size;
        const scale = thing.kind === 'food' ? 0.35 + thing.left * 0.65 : 1;
        el.style.transform = `translate3d(${(thing.x - s / 2).toFixed(1)}px, ${(thing.y - thing.z - s).toFixed(1)}px, 0) rotate(${thing.rot.toFixed(0)}deg) scale(${scale})`;
        el.style.fontSize = `${s}px`;
        el.style.zIndex = String(Math.round(thing.y));
      }

      if (world.fxQueue.length) {
        fxRef.current?.spawn(world.fxQueue);
        world.fxQueue = [];
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  // Feed / trick signals from the page.
  const lastSignal = useRef(signal?.key ?? 0);
  useEffect(() => {
    if (!signal || signal.key === lastSignal.current) return;
    lastSignal.current = signal.key;
    world.now = performance.now();
    if (signal.kind === 'feed' && signal.emoji) dropFood(world, signal.emoji);
    if (signal.kind === 'trick' && signal.trick) {
      const main = world.actors.find((a) => a.isMain);
      if (main) performTrick(world, main, signal.trick);
    }
  }, [signal, world]);

  // ── touch: tap = react, drag = carry, tap empty spot = "come here!" ──
  const drag = useRef<{
    key: string;
    id: number;
    sx: number;
    sy: number;
    moved: boolean;
    lx: number;
    ly: number;
    lt: number;
    vx: number;
    vy: number;
  } | null>(null);
  const groundTap = useRef<{ id: number; sx: number; sy: number } | null>(null);

  const local = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const p = local(e);
    world.now = performance.now();

    const actorEl = target.closest('[data-actor]') as HTMLElement | null;
    if (actorEl) {
      drag.current = {
        key: actorEl.dataset.actor!,
        id: e.pointerId,
        sx: p.x,
        sy: p.y,
        moved: false,
        lx: p.x,
        ly: p.y,
        lt: performance.now(),
        vx: 0,
        vy: 0,
      };
      try {
        stageRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (target.closest('[data-thing="ball"]')) {
      kickBallFrom(world, p.x);
      return;
    }
    groundTap.current = { id: e.pointerId, sx: p.x, sy: p.y };
  };

  const findActor = (key: string): Actor | undefined => world.actors.find((a) => a.key === key);

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = local(e);
    const a = findActor(d.key);
    if (!a) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) {
      d.moved = true;
      grab(a);
      if (a.c.voice) world.sound(a.c.voice);
    }
    if (d.moved) {
      const now = performance.now();
      const dt = Math.max(1, now - d.lt) / 1000;
      d.vx = d.vx * 0.5 + ((p.x - d.lx) / dt) * 0.5;
      d.vy = d.vy * 0.5 + ((p.y - d.ly) / dt) * 0.5;
      d.lx = p.x;
      d.ly = p.y;
      d.lt = now;
      dragTo(world, a, p.x, p.y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    world.now = performance.now();
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      drag.current = null;
      const a = findActor(d.key);
      if (a) {
        if (d.moved) release(world, a, d.vx, d.vy);
        else tapActor(world, a);
      }
      return;
    }
    const g = groundTap.current;
    if (g && g.id === e.pointerId) {
      groundTap.current = null;
      const p = local(e);
      if (Math.hypot(p.x - g.sx, p.y - g.sy) < 12) tapGround(world, p.x, p.y);
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const a = findActor(d.key);
      if (a && d.moved) release(world, a, 0, 0);
      drag.current = null;
    }
    groundTap.current = null;
  };

  const toggleBall = () => {
    world.now = performance.now();
    if (world.ball) {
      removeBall(world);
      setHasBall(false);
    } else {
      throwBall(world);
      setHasBall(true);
      onPlay?.();
    }
    playPop();
  };

  const party_ = () => {
    world.now = performance.now();
    startParty(world);
    setParty(true);
    onPlay?.();
    setTimeout(() => setParty(false), 6500);
  };

  const canBall = tricks.includes('ball');

  const stage = (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`relative isolate w-full select-none overflow-hidden bg-gradient-to-br ${bgGradient} ${
        isFull ? 'min-h-0 flex-1' : 'rounded-3xl'
      }`}
      style={{ height: isFull ? undefined : CARD_HEIGHT, touchAction: isFull ? 'none' : 'pan-y' }}
    >
      {/* Ground */}
      <div
        className="pointer-events-none absolute rounded-[50%] bg-white/25"
        style={{ left: '-15%', right: '-15%', top: isFull ? '50%' : '57%', bottom: '-30%' }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[8%] bg-gradient-to-t from-black/10 to-transparent" />

      {/* Night sky */}
      {night && (
        <div className="pointer-events-none absolute inset-0 bg-indigo-950/30">
          {[12, 30, 52, 70, 88].map((x, i) => (
            <span
              key={x}
              className="animate-twinkle absolute text-[10px]"
              style={{ left: `${x}%`, top: `${8 + (i % 3) * 9}%`, animationDelay: `${i * 0.4}s` }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}

      {/* Flowers the insects like to visit */}
      {layout.flowers.map((f, i) => (
        <span
          key={i}
          className="pointer-events-none absolute leading-none"
          style={{
            left: f.x,
            top: f.y,
            fontSize: 24 * layout.unit,
            transform: 'translate(-50%, -100%)',
            zIndex: Math.round(f.y) - 2,
          }}
        >
          {['🌷', '🌼', '🌻'][i % 3]}
        </span>
      ))}

      {/* Shadows, then creatures */}
      {roster.map((r) => (
        <div
          key={`sh-${r.key}`}
          className="cr-shadow"
          ref={(el) => {
            if (el) shadowEls.current.set(r.key, el);
            else shadowEls.current.delete(r.key);
          }}
        />
      ))}
      {roster.map((r) => (
        <div
          key={r.key}
          data-actor={r.key}
          className="cr-root"
          ref={(el) => {
            if (el) actorEls.current.set(r.key, el);
            else actorEls.current.delete(r.key);
          }}
          style={{ width: r.base, height: r.base }}
        >
          <div className="cr-face">
            <div className="cr-act">
              <div className="cr-loco">
                <CreatureArt
                  art={r.creature.art}
                  aura={r.isMain && aura && !isEgg}
                  accessories={
                    r.isMain && !isEgg
                      ? {
                          hat: hat && !isRoamer(hat) ? hat.emoji : undefined,
                          face: face && !isRoamer(face) ? face.emoji : undefined,
                          held: held && !isRoamer(held) ? held.emoji : undefined,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div ref={foodEl} className="pointer-events-none absolute left-0 top-0 leading-none" style={{ display: 'none' }}>
        {signal?.kind === 'feed' ? signal.emoji : '🍎'}
      </div>
      <div
        ref={ballEl}
        data-thing="ball"
        className="absolute left-0 top-0 leading-none"
        style={{ display: 'none', touchAction: 'none' }}
      >
        ⚽
      </div>

      <FxLayer ref={fxRef} />

      {party && <div className="stage-disco" />}

      {/* Overlay UI */}
      <div className="pointer-events-none absolute left-3 top-3 z-[4000] rounded-full bg-white/80 px-2.5 py-1 backdrop-blur">
        <p className="text-[11px] font-bold text-[#1c1c1e]">
          Lv.{growth.stage.level} · {growth.stage.name}
          {mood?.hungry && !isEgg ? ' · 배고파요 🍎' : ''}
        </p>
      </div>

      {isFull ? (
        <div className="absolute right-3 top-3 z-[4000] flex gap-1.5">
          <button
            onClick={party_}
            className="rounded-full bg-white/85 px-3 py-2 text-[13px] font-bold text-[#1c1c1e] shadow active:scale-90"
          >
            🎉 파티
          </button>
          <button
            onClick={() => (canBall ? toggleBall() : playPop())}
            className={`rounded-full px-3 py-2 text-[13px] font-bold shadow active:scale-90 ${
              canBall ? 'bg-white/85 text-[#1c1c1e]' : 'bg-white/50 text-black/40'
            }`}
          >
            {canBall ? (hasBall ? '⚽ 공 치우기' : '⚽ 공놀이') : '🔒 공놀이 Lv.3'}
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-[#1c1c1e]/80 px-3 py-2 text-[13px] font-bold text-white shadow active:scale-90"
            aria-label="작게 보기"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={onExpand}
          className="absolute right-3 top-3 z-[4000] rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#1c1c1e] shadow-sm backdrop-blur active:scale-90"
        >
          ⛶ 크게 보기
        </button>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[4000] text-center text-[10px] font-semibold text-black/40">
        {isEgg
          ? '일기를 1개 쓰면 친구가 태어나요!'
          : '콕 누르면 재주를 부려요 · 끌어서 옮기기 · 빈 곳을 누르면 달려와요'}
      </p>
    </div>
  );

  if (!isFull) return stage;

  return (
    <>
      {stage}
      {fullscreenFooter && <div className="safe-bottom shrink-0 bg-white px-4 pt-3">{fullscreenFooter}</div>}
    </>
  );
}
