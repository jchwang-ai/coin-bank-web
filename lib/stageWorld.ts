// The character stage's little world: every creature is an Actor with its own
// brain (what it wants to do next) and simple physics. No React here — the
// stage component calls stepWorld() every animation frame and copies actor
// positions/poses onto DOM nodes.
//
// Coordinates are 2.5D: (x, y) is a point on the ground plane (y = depth,
// further down = closer to the viewer) and z is height above it. Shadows sit
// at (x, y), the drawing at y - z. Walkers keep z ≈ 0, flyers cruise high,
// and anything on the ground pushes neighbours away so nobody ends up
// standing on top of someone else.

import { Creature, Voice, isAirborneLoco } from './creatures';
import { TrickId } from './petCare';

export type Pose =
  | 'idle' | 'walk' | 'run' | 'crawl' | 'sleep' | 'held' | 'eat' | 'dance'
  | 'fly' | 'glide' | 'perch' | 'peck' | 'swim' | 'hover';

type Brain =
  | 'idle' | 'goto' | 'sleep' | 'eat' | 'dance' | 'held' | 'fall' | 'chase' | 'goEat' | 'dash'
  | 'air' | 'land' | 'perched' | 'tohead' | 'headperch';

export type SoundName = Voice | 'boing' | 'chomp' | 'melody' | 'sparkle';

export interface Actor {
  key: string;
  c: Creature;
  isMain: boolean;
  /** Size in px at unit 1 (scaled by world.unit into `size`). */
  base: number;
  size: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  tx: number;
  ty: number;
  tz: number;
  facing: 1 | -1;
  tilt: number;
  brain: Brain;
  until: number;
  speedMul: number;
  pose: Pose;
  act: string | null;
  actUntil: number;
  /** Bumped whenever an action (re)starts so the DOM can replay it. */
  actSeq: number;
  flapUntil: number;
  glideUntil: number;
  peckUntil: number;
  nextPeck: number;
  angle: number;
  hopRest: number;
  overlap: number;
  nextTrail: number;
  nextAmbient: number;
  visit: string | null;
  seed: number;
}

export interface Thing {
  kind: 'food' | 'ball';
  emoji: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  size: number;
  /** Food: 1 = whole, shrinks as it's eaten. */
  left: number;
  landed: boolean;
}

export interface FxSpec {
  char: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dur: number;
  size: number;
  kind?: 'float' | 'emote' | 'ripple';
  rot?: number;
  scale?: number;
  delay?: number;
}

export interface WorldProps {
  tricks: TrickId[];
  hungry: boolean;
  sad: boolean;
  happy: boolean;
  isEgg: boolean;
  night: boolean;
  /** Emoji of an equipped sparkle effect, drifting up around the main buddy. */
  effect: string | null;
  aura: boolean;
}

export interface World {
  w: number;
  h: number;
  unit: number;
  gMin: number;
  gMax: number;
  /** Space kept clear at the top (toolbar in fullscreen). */
  topPad: number;
  now: number;
  actors: Actor[];
  food: Thing | null;
  ball: Thing | null;
  flowers: Array<{ x: number; y: number; h: number }>;
  partyUntil: number;
  props: WorldProps;
  fxQueue: FxSpec[];
  sound: (name: SoundName) => void;
  /** Called when the main buddy finishes a meal. */
  onAte?: () => void;
  /** The main buddy wants to say something (speech bubble + voice). */
  onTalk?: (a: Actor, key: 'tap' | 'eat' | 'hungry' | 'tired' | 'dirty' | 'pat') => void;
}

// ── helpers ────────────────────────────────────────────────────────────

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EMOTES = ['💕', '🎵', '😆', '✨', '❗', '💫', '🥰', '😊'];
const SING = ['🎵', '🎶', '🎼'];
const RAINBOW = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪'];

const isFlyer = (a: Actor) => isAirborneLoco(a.c.loco);
const canLand = (a: Actor) =>
  a.c.loco === 'fly' || a.c.loco === 'flutter' || (a.c.loco === 'buzz' && a.c.art.kind !== 'emoji');
const mainOf = (w: World) => w.actors.find((a) => a.isMain);

function marginX(a: Actor) {
  return a.size * 0.5 + 6;
}

/** Highest z that keeps the drawing inside the stage. */
function maxZ(w: World, a: Actor, y: number) {
  return Math.max(0, y - a.size - w.topPad - 4);
}

function speedOf(w: World, a: Actor) {
  let s = a.c.speed * w.unit * a.speedMul;
  if (a.isMain) {
    if (w.props.hungry) s *= 0.6;
    else if (w.props.sad) s *= 0.75;
    else if (w.props.happy) s *= 1.15;
  }
  return s;
}

export function fx(w: World, spec: FxSpec) {
  if (w.fxQueue.length < 40) w.fxQueue.push(spec);
}

/** Screen-space point above an actor's head. */
function headPoint(a: Actor) {
  return { x: a.x, y: a.y - a.z - a.size };
}

export function emote(w: World, a: Actor, char: string) {
  const p = headPoint(a);
  fx(w, { char, x: p.x, y: p.y - 2, dx: 0, dy: 0, dur: 1400, size: 18, kind: 'emote' });
}

function burst(w: World, x: number, y: number, chars: string[], count: number, dist: number, size = 20) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
    const d = dist * rand(0.7, 1.2);
    fx(w, {
      char: pick(chars),
      x,
      y,
      dx: Math.cos(ang) * d,
      dy: Math.sin(ang) * d,
      dur: rand(800, 1300),
      size: size * rand(0.8, 1.2),
      rot: rand(-90, 90),
    });
  }
}

function act(a: Actor, name: string, ms: number, now: number) {
  a.act = name;
  a.actUntil = now + ms;
  a.actSeq++;
}

function voice(w: World, a: Actor) {
  w.sound(a.c.voice);
}

// ── spawning & roster ──────────────────────────────────────────────────

export interface RosterEntry {
  key: string;
  creature: Creature;
  isMain: boolean;
  base: number;
}

/** Picks a ground point with room around it, preferring some travel. */
export function pickGroundSpot(w: World, self?: Actor, near?: { x: number; y: number }, radius = 0) {
  const size = self?.size ?? 40 * w.unit;
  const mx = size * 0.5 + 6;
  let best = { x: w.w / 2, y: (w.gMin + w.gMax) / 2 };
  let bestScore = -Infinity;

  for (let i = 0; i < 14; i++) {
    const x = near ? clamp(near.x + rand(-radius, radius), mx, w.w - mx) : rand(mx, w.w - mx);
    const y = near
      ? clamp(near.y + rand(-radius * 0.3, radius * 0.3), w.gMin, w.gMax)
      : rand(w.gMin, w.gMax);

    let minGap = Infinity;
    for (const o of w.actors) {
      if (o === self || o.c.loco === 'orbit' || o.z > o.size * 0.4) continue;
      // Respect where others are heading too, so two friends don't pick the same spot.
      const ox = o.brain === 'goto' || o.brain === 'chase' || o.brain === 'goEat' ? o.tx : o.x;
      const oy = o.brain === 'goto' || o.brain === 'chase' || o.brain === 'goEat' ? o.ty : o.y;
      const gap = Math.hypot(x - ox, (y - oy) * 2.2) - (o.size + size) * 0.5;
      minGap = Math.min(minGap, gap);
    }
    if (minGap === Infinity) minGap = w.w;
    const travel = self && !near ? Math.min(Math.hypot(x - self.x, y - self.y), w.w * 0.35) * 0.4 : 0;
    const score = minGap + travel;
    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}

function setAirTarget(w: World, a: Actor) {
  const mx = marginX(a);
  // Prefer a real flight across the stage over a short hop sideways.
  a.tx = rand(mx, w.w - mx);
  for (let i = 0; i < 4 && Math.abs(a.tx - a.x) < w.w * 0.35; i++) a.tx = rand(mx, w.w - mx);
  a.ty = rand(w.gMin, w.gMax);
  const top = maxZ(w, a, a.ty);
  const low = a.c.loco === 'swim' || a.c.loco === 'drift' ? 0.25 : 0.35;
  a.tz = rand(top * low, top * 0.95);
  // Swallows love long swoops across the whole stage.
  if (a.c.art.kind === 'bird' && a.c.art.species === 'swallow') {
    a.tx = a.x < w.w / 2 ? rand(w.w * 0.65, w.w - mx) : rand(mx, w.w * 0.35);
  }
  a.brain = 'air';
  // Safety net: if the target turns out unreachable, re-plan instead of hovering forever.
  a.until = w.now + 7000;
}

export function syncRoster(w: World, roster: RosterEntry[]) {
  const keep = new Set(roster.map((r) => r.key));
  w.actors = w.actors.filter((a) => keep.has(a.key));

  for (const r of roster) {
    const existing = w.actors.find((a) => a.key === r.key);
    if (existing) {
      existing.c = r.creature;
      existing.base = r.base;
      existing.size = r.base * w.unit;
      continue;
    }
    const a: Actor = {
      key: r.key,
      c: r.creature,
      isMain: r.isMain,
      base: r.base,
      size: r.base * w.unit,
      x: w.w / 2,
      y: (w.gMin + w.gMax) / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      tx: 0,
      ty: 0,
      tz: 0,
      facing: chance(0.5) ? 1 : -1,
      tilt: 0,
      brain: 'idle',
      until: w.now + rand(600, 2200),
      speedMul: 1,
      pose: 'idle',
      act: null,
      actUntil: 0,
      actSeq: 0,
      flapUntil: 0,
      glideUntil: 0,
      peckUntil: 0,
      nextPeck: 0,
      angle: rand(0, Math.PI * 2),
      hopRest: 0,
      overlap: 0,
      nextTrail: 0,
      nextAmbient: w.now + rand(500, 3000),
      visit: null,
      seed: Math.random() * 1000,
    };

    if (r.isMain) {
      a.x = w.w / 2;
      a.y = w.gMin + (w.gMax - w.gMin) * 0.55;
    } else {
      const spot = pickGroundSpot(w, a);
      a.x = spot.x;
      a.y = spot.y;
    }
    if (isFlyer(a)) {
      a.z = maxZ(w, a, a.y) * rand(0.4, 0.8);
      setAirTarget(w, a);
    }
    // New arrivals pop in with a little sparkle.
    if (w.now > 1500) {
      act(a, 'appear', 700, w.now);
      burst(w, a.x, a.y - a.z - a.size / 2, ['✨', '⭐'], 8, 40 * w.unit, 16);
    } else {
      act(a, 'appear', 700, w.now);
    }
    w.actors.push(a);
  }
}

/** Re-scales everything after the stage changes size (e.g. fullscreen). */
export function resizeWorld(w: World, width: number, height: number, unit: number, full: boolean) {
  const sx = w.w ? width / w.w : 1;
  const oldMin = w.gMin;
  const oldSpan = w.gMax - w.gMin || 1;

  w.w = width;
  w.h = height;
  w.unit = unit;
  w.gMin = height * (full ? 0.55 : 0.62);
  w.gMax = height * 0.93;
  w.topPad = full ? 64 : 4;
  w.flowers = [
    { x: width * 0.1, y: w.gMin + (w.gMax - w.gMin) * 0.3, h: 18 * unit },
    { x: width * 0.88, y: w.gMin + (w.gMax - w.gMin) * 0.55, h: 18 * unit },
    ...(full ? [{ x: width * 0.5, y: w.gMax - 4, h: 18 * unit }] : []),
  ];

  for (const a of w.actors) {
    a.size = a.base * unit;
    a.x = clamp(a.x * sx, marginX(a), width - marginX(a));
    a.y = w.gMin + ((a.y - oldMin) / oldSpan) * (w.gMax - w.gMin);
    a.y = clamp(a.y, w.gMin, w.gMax);
    a.z = Math.min(a.z, maxZ(w, a, a.y));
    if (isFlyer(a) && a.brain === 'air') setAirTarget(w, a);
    else if (a.brain === 'goto') a.brain = 'idle';
  }
}

// ── per-frame update ───────────────────────────────────────────────────

export function stepWorld(w: World, dt: number) {
  const now = w.now;
  for (const a of w.actors) {
    if (a.act && now > a.actUntil) a.act = null;
    if (a.brain === 'held') {
      a.pose = 'held';
      continue;
    }
    if (a.c.loco === 'orbit') stepOrbit(w, a, dt);
    else if (isFlyer(a)) stepFlyer(w, a, dt, now);
    else stepWalker(w, a, dt, now);
    ambient(w, a, now);
  }
  separate(w, dt, now);
  stepThings(w, dt, now);
  if (w.partyUntil > now && chance(dt * 14)) {
    fx(w, {
      char: pick(['🎊', '🎉', '⭐', '💖', '🎈', '✨']),
      x: rand(0, w.w),
      y: rand(0, w.h * 0.2),
      dx: rand(-40, 40),
      dy: w.h * rand(0.6, 0.9),
      dur: rand(1600, 2400),
      size: rand(16, 26) * Math.min(1.6, w.unit),
      rot: rand(-360, 360),
    });
  }
}

// ── walkers / hoppers / crawlers ───────────────────────────────────────

function stepWalker(w: World, a: Actor, dt: number, now: number) {
  const u = w.unit;
  const g = 1500 * u;

  // Main buddy still in its egg: just sits there (taps make it wobble).
  if (a.isMain && w.props.isEgg) {
    a.pose = 'idle';
    if (a.z > 0 || a.vz > 0) {
      a.vz -= g * dt;
      a.z = Math.max(0, a.z + a.vz * dt);
      if (a.z === 0) a.vz = 0;
    }
    return;
  }

  // Vertical motion: jumps, hops, falling after being dropped.
  if (a.z > 0 || a.vz > 0) {
    a.vz -= g * dt;
    a.z += a.vz * dt;
    if (a.brain === 'fall') {
      a.x += a.vx * dt;
      if (a.x < marginX(a) || a.x > w.w - marginX(a)) a.vx = -a.vx * 0.6;
    }
    if (a.z <= 0) {
      const impact = -a.vz;
      a.z = 0;
      a.vz = 0;
      if (a.c.loco === 'hop') {
        a.vx = 0;
        a.vy = 0;
        a.hopRest = rand(0.08, 0.25);
      }
      if (impact > 520 * u) {
        act(a, 'squash', 450, now);
        burst(w, a.x, a.y, ['💨'], 4, 26 * u, 14);
      }
      if (a.brain === 'fall') {
        a.vx = 0;
        a.brain = 'idle';
        a.until = now + rand(700, 1400);
        emote(w, a, pick(['😵', '💫', '😆', '😝']));
      }
    }
  }
  if (a.hopRest > 0) a.hopRest -= dt;

  switch (a.brain) {
    case 'idle':
      if (a.z === 0 && a.c.loco !== 'hop') {
        a.vx = 0;
        a.vy = 0;
      }
      if (now > a.until) decideWalker(w, a, now);
      break;

    case 'goto':
    case 'chase':
    case 'goEat':
    case 'dash': {
      // Blocked by friends for too long → give up and pick something else.
      if (a.brain === 'goto' && now > a.until + 9000) {
        a.brain = 'idle';
        a.until = now + 500;
        break;
      }
      if (a.brain === 'chase') {
        if (!w.ball) {
          a.brain = 'idle';
          break;
        }
        a.tx = w.ball.x;
        a.ty = w.ball.y;
      }
      const mul = a.brain === 'dash' ? 3.6 : a.brain === 'goto' ? 1 : 1.6;
      const arrived = walkToward(w, a, dt, speedOf(w, a) * mul);
      if (a.brain === 'dash' && chance(dt * 30)) {
        fx(w, { char: pick(RAINBOW), x: a.x, y: a.y - a.size * 0.3, dx: 0, dy: rand(-6, 6), dur: 900, size: 12 * u, scale: 0.4 });
      }
      if (a.brain === 'chase' && w.ball) {
        const b = w.ball;
        if (Math.hypot(b.x - a.x, (b.y - a.y) * 2) < (a.size + b.size) * 0.5 && b.z < a.size * 0.6) kick(w, a, now);
      } else if (arrived) {
        onWalkerArrive(w, a, now);
      }
      break;
    }

    case 'sleep':
      a.vx = a.vy = 0;
      if (now > a.until) {
        a.brain = 'idle';
        a.until = now + rand(800, 1600);
        emote(w, a, '🥱');
      }
      break;

    case 'eat': {
      a.vx = a.vy = 0;
      const f = w.food;
      if (f) {
        f.left = Math.max(0.15, (a.until - now) / 2400);
        if (chance(dt * 3)) {
          w.sound('chomp');
          burst(w, f.x, f.y - f.size * 0.4, ['·', '✦'], 3, 18 * u, 10);
        }
      }
      if (now > a.until) finishEating(w, a, now);
      break;
    }

    case 'dance':
      a.vx = a.vy = 0;
      if (chance(dt * 2.5)) {
        const p = headPoint(a);
        fx(w, { char: pick(SING), x: p.x + rand(-10, 10), y: p.y, dx: rand(-30, 30), dy: -40 * u, dur: 1200, size: 16 * u });
      }
      if (now > a.until) {
        a.brain = 'idle';
        a.until = now + rand(600, 1400);
      }
      break;
  }

  // Pose
  const moving = Math.hypot(a.vx, a.vy) > 6 * u;
  if (a.brain === 'sleep') a.pose = 'sleep';
  else if (a.brain === 'eat') a.pose = 'eat';
  else if (a.brain === 'dance' || w.partyUntil > now) a.pose = 'dance';
  else if (a.c.loco === 'hop') a.pose = 'idle';
  else if (moving) a.pose = a.c.loco === 'crawl' ? 'crawl' : a.brain === 'goto' ? 'walk' : 'run';
  else a.pose = 'idle';
  a.tilt = 0;
}

/** Moves toward (tx, ty). Returns true on arrival. */
function walkToward(w: World, a: Actor, dt: number, speed: number) {
  const dx = a.tx - a.x;
  const dy = a.ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 3 * w.unit) return true;

  if (a.c.loco === 'hop') {
    // Hoppers only travel while in the air: launch a hop, coast, land, rest.
    if (a.z === 0 && a.vz === 0 && a.hopRest <= 0) {
      const g = 1500 * w.unit;
      a.vz = rand(300, 360) * w.unit;
      const airTime = (2 * a.vz) / g;
      const hop = Math.min(d, speed * 0.75);
      a.vx = (dx / d) * (hop / airTime);
      a.vy = (dy / d) * (hop / airTime);
    }
  } else {
    const s = Math.min(speed, d * 5);
    a.vx = (dx / d) * s;
    a.vy = (dy / d) * s * 0.75;
  }
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  if (Math.abs(a.vx) > 4) a.facing = a.vx > 0 ? 1 : -1;
  return false;
}

function onWalkerArrive(w: World, a: Actor, now: number) {
  if (a.brain === 'goEat') {
    const f = w.food;
    if (f && f.landed) {
      a.facing = f.x > a.x ? 1 : -1;
      a.brain = 'eat';
      a.until = now + 2400;
      return;
    }
  }
  a.brain = 'idle';
  a.until = now + (a.c.loco === 'crawl' ? rand(2500, 5000) : rand(1200, 3600));
  if (a.visit) {
    const friend = w.actors.find((o) => o.key === a.visit);
    if (friend) {
      a.facing = friend.x > a.x ? 1 : -1;
      emote(w, a, pick(['💕', '👋', '😊']));
    }
    a.visit = null;
  }
}

function decideWalker(w: World, a: Actor, now: number) {
  const p = w.props;

  if (a.isMain && w.food?.landed) return goEat(w, a);
  if (w.ball && (a.isMain ? chance(0.85) : chance(0.45))) {
    a.brain = 'chase';
    return;
  }
  if (a.isMain && p.hungry && chance(0.35)) {
    if (w.onTalk && chance(0.4)) w.onTalk(a, 'hungry');
    else emote(w, a, pick(['🍎', '🍪', '😢']));
  }
  if (a.isMain && p.sad && chance(0.25)) emote(w, a, '💭');

  if (p.night && chance(a.isMain ? 0.22 : 0.18)) {
    a.brain = 'sleep';
    a.until = now + rand(6000, 12000);
    return;
  }
  if (a.isMain && p.happy && p.tricks.includes('dance') && chance(0.12)) {
    a.brain = 'dance';
    a.until = now + 2600;
    return;
  }

  const r = Math.random();
  if (r < 0.58) {
    const spot = pickGroundSpot(w, a);
    a.tx = spot.x;
    a.ty = spot.y;
    a.brain = 'goto';
  } else if (r < 0.72) {
    a.facing = a.facing === 1 ? -1 : 1;
    a.until = now + rand(800, 1800);
  } else if (r < 0.86) {
    const friends = w.actors.filter((o) => o !== a && !isFlyer(o) && o.c.loco !== 'orbit');
    if (friends.length) {
      const f = pick(friends);
      const side = a.x < f.x ? -1 : 1;
      a.tx = clamp(f.x + side * (f.size + a.size) * 0.62, marginX(a), w.w - marginX(a));
      a.ty = clamp(f.y + rand(-6, 6), w.gMin, w.gMax);
      a.visit = f.key;
      a.brain = 'goto';
    } else {
      a.until = now + rand(1200, 2400);
    }
  } else {
    a.until = now + rand(1500, 3000);
    if (chance(0.55)) emote(w, a, pick(EMOTES));
  }
}

// ── flyers: birds, butterflies, bees, fireflies, swimmers ──────────────

function stepFlyer(w: World, a: Actor, dt: number, now: number) {
  const u = w.unit;
  const L = a.c.loco;
  const speed = speedOf(w, a) * (w.partyUntil > now ? 1.6 : 1);

  switch (a.brain) {
    case 'air':
    case 'land':
    case 'tohead': {
      if (a.brain === 'tohead') {
        const m = mainOf(w);
        if (!m || m.brain === 'held') {
          setAirTarget(w, a);
        } else {
          a.tx = m.x;
          a.ty = m.y + 1;
          a.tz = m.z + m.size * 0.86;
        }
      }
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dz = a.tz - a.z;
      const d = Math.hypot(dx, dy * 1.5, dz) || 0.01;
      const desired = Math.min(speed, d * 2.4);
      const k = L === 'fly' ? 2.4 : L === 'swim' || L === 'drift' ? 1.3 : 3.6;
      a.vx += ((dx / d) * desired - a.vx) * k * dt;
      a.vy += ((dy / d) * desired - a.vy) * k * dt;
      a.vz += ((dz / d) * desired - a.vz) * k * dt;

      // Each kind of flight has its own wobble.
      if (L === 'flutter') {
        a.vx += rand(-1, 1) * 300 * u * dt;
        a.vz += Math.sin(now / 170 + a.seed) * 260 * u * dt;
      } else if (L === 'buzz') {
        a.vz += Math.sin(now / 80 + a.seed) * 200 * u * dt;
        a.vx += Math.cos(now / 130 + a.seed) * 120 * u * dt;
      } else if (L === 'fly') {
        a.vz += Math.sin(now / 380 + a.seed) * 45 * u * dt;
      } else {
        a.vz += Math.sin(now / 650 + a.seed) * 35 * u * dt;
      }

      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;

      if (d < 7 * u || (a.brain !== 'tohead' && now > a.until)) onFlyerArrive(w, a, now);
      break;
    }

    case 'perched':
      a.vx = a.vy = a.vz = 0;
      a.z = a.tz;
      if (now > a.nextPeck && a.c.art.kind === 'bird') {
        a.peckUntil = now + rand(500, 1100);
        a.nextPeck = now + rand(1400, 3200);
        // Little hop to a new spot now and then, like a real sparrow.
        if (chance(0.4)) {
          a.facing = chance(0.5) ? 1 : -1;
          a.x = clamp(a.x + a.facing * rand(6, 14) * u, marginX(a), w.w - marginX(a));
        }
      }
      if (now > a.until || w.partyUntil > now) takeOff(w, a);
      break;

    case 'headperch': {
      const m = mainOf(w);
      if (!m || m.brain === 'held' || m.brain === 'dash' || m.z > 4 || Math.hypot(m.vx, m.vy) > 80 * u) {
        takeOff(w, a);
        if (m) emote(w, a, '❗');
        break;
      }
      a.x = m.x;
      a.y = m.y + 1;
      a.z = m.z + m.size * 0.86;
      a.vx = a.vy = a.vz = 0;
      if (now > a.nextPeck) {
        a.peckUntil = now + 600;
        a.nextPeck = now + rand(1800, 3500);
      }
      if (now > a.until) takeOff(w, a);
      break;
    }
  }

  // Keep inside the stage.
  const mx = marginX(a);
  if (a.x < mx || a.x > w.w - mx) {
    a.x = clamp(a.x, mx, w.w - mx);
    a.vx *= -0.5;
  }
  a.y = clamp(a.y, w.gMin, w.gMax);
  if (a.brain !== 'headperch') a.z = clamp(a.z, 0, maxZ(w, a, a.y));

  // Facing & body angle
  if (Math.abs(a.vx) > 8 * u) a.facing = a.vx > 0 ? 1 : -1;
  if (L === 'fly') a.tilt = clamp(-a.vz * 0.12, -28, 28);
  else if (L === 'swim') a.tilt = clamp(-a.vz * 0.15, -18, 18);
  else if (L === 'flutter') a.tilt = clamp(a.vx * 0.06, -16, 16) * a.facing;
  else a.tilt = 0;
  if (a.brain === 'perched' || a.brain === 'headperch') a.tilt = 0;

  a.pose = flyerPose(a, now, u);
}

function flyerPose(a: Actor, now: number, u: number): Pose {
  const L = a.c.loco;
  if (L === 'swim') return 'swim';
  if (a.brain === 'perched' || a.brain === 'headperch') return now < a.peckUntil ? 'peck' : 'perch';
  if (L !== 'fly' || a.c.art.kind !== 'bird') return 'fly';

  const species = a.c.art.species;
  if (species === 'hummingbird') return 'fly';
  if (a.vz > 30 * u || Math.hypot(a.vx, a.vy) < 30 * u) return 'fly';
  if (a.vz < -35 * u) return 'glide';
  // Real birds alternate bursts of flapping with glides.
  if (now < a.flapUntil) return 'fly';
  if (now < a.glideUntil) return 'glide';
  const glidey = species === 'swallow' || species === 'owl' || species === 'phoenix';
  a.flapUntil = now + rand(450, glidey ? 800 : 1300);
  a.glideUntil = a.flapUntil + rand(300, glidey ? 1200 : 700);
  return 'fly';
}

function onFlyerArrive(w: World, a: Actor, now: number) {
  if (a.brain === 'land') {
    a.brain = 'perched';
    a.until = now + rand(2500, 6500);
    a.nextPeck = now + rand(300, 1200);
    a.vx = a.vy = a.vz = 0;
    return;
  }
  if (a.brain === 'tohead') {
    a.brain = 'headperch';
    a.until = now + rand(3500, 7000);
    a.nextPeck = now + 800;
    return;
  }

  const m = mainOf(w);
  const r = Math.random();
  if (canLand(a) && w.partyUntil < now && r < 0.24) {
    landSomewhere(w, a);
  } else if (
    canLand(a) &&
    w.partyUntil < now &&
    r < 0.34 &&
    m &&
    !w.props.isEgg &&
    a.size < m.size * 0.8 &&
    !w.actors.some((o) => o.brain === 'tohead' || o.brain === 'headperch')
  ) {
    a.brain = 'tohead';
  } else if (a.c.loco === 'buzz' && r < 0.6) {
    // Hover a moment, then dart a short way.
    a.tx = clamp(a.x + rand(-60, 60) * w.unit, marginX(a), w.w - marginX(a));
    a.ty = clamp(a.y + rand(-10, 10), w.gMin, w.gMax);
    a.tz = clamp(a.z + rand(-30, 30) * w.unit, 10, maxZ(w, a, a.ty));
  } else {
    setAirTarget(w, a);
  }
}

function landSomewhere(w: World, a: Actor) {
  const insect = a.c.loco !== 'fly';
  if (insect && w.flowers.length && chance(0.7)) {
    const f = pick(w.flowers);
    a.tx = f.x;
    a.ty = f.y + 1;
    a.tz = f.h;
  } else {
    const spot = pickGroundSpot(w, a);
    a.tx = spot.x;
    a.ty = spot.y;
    a.tz = 0;
  }
  a.brain = 'land';
  a.until = w.now + 7000;
}

function takeOff(w: World, a: Actor) {
  setAirTarget(w, a);
  a.vz = 160 * w.unit;
  a.flapUntil = w.now + 900;
}

// ── orbiters ───────────────────────────────────────────────────────────

function stepOrbit(w: World, a: Actor, dt: number) {
  const m = mainOf(w);
  if (!m) return;
  const dir = a.seed > 500 ? 1 : -1;
  a.angle += dt * (w.partyUntil > w.now ? 3 : 1.1) * dir;
  const R = m.size * 0.7 + a.size * 0.6;
  a.x = m.x + Math.cos(a.angle) * R;
  a.y = m.y + Math.sin(a.angle) * R * 0.25;
  a.z = m.z + m.size * 0.45 + Math.sin(a.angle * 2) * 6 * w.unit;
  a.facing = 1;
  a.pose = 'idle';
}

// ── keeping friends apart ──────────────────────────────────────────────

function separate(w: World, dt: number, now: number) {
  const list = w.actors;
  const touched = new Set<Actor>();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.brain === 'held' || b.brain === 'held') continue;
      if (a.c.loco === 'orbit' || b.c.loco === 'orbit') continue;
      if (a.brain === 'headperch' || b.brain === 'headperch' || a.brain === 'tohead' || b.brain === 'tohead') continue;
      const aAir = a.z > a.size * 0.4;
      const bAir = b.z > b.size * 0.4;
      if (aAir !== bAir) continue;

      const dx = b.x - a.x;
      const dy = (b.y - a.y) * 2.2;
      const dz = aAir ? b.z - a.z : 0;
      const d = Math.hypot(dx, dy, dz) || 0.01;
      const min = (a.size + b.size) * (aAir ? 0.38 : 0.46);
      if (d >= min) continue;

      // Eaters and sleepers stay put; everyone else shuffles aside.
      const wa = a.brain === 'eat' || a.brain === 'sleep' ? 0.1 : 1;
      const wb = b.brain === 'eat' || b.brain === 'sleep' ? 0.1 : 1;
      const push = (min - d) * Math.min(1, dt * 7);
      const sum = wa + wb;
      a.x -= (dx / d) * push * (wa / sum);
      a.y -= (dy / d / 2.2) * push * (wa / sum);
      b.x += (dx / d) * push * (wb / sum);
      b.y += (dy / d / 2.2) * push * (wb / sum);
      if (aAir) {
        a.z -= (dz / d) * push * (wa / sum);
        b.z += (dz / d) * push * (wb / sum);
      }
      touched.add(a);
      touched.add(b);
    }
  }

  for (const a of list) {
    if (touched.has(a)) a.overlap += dt;
    else a.overlap = Math.max(0, a.overlap - dt);
    // Still squeezed together after a moment → walk somewhere roomier.
    if (a.overlap > 0.7 && a.brain === 'idle' && !isFlyer(a) && a.c.loco !== 'orbit') {
      const spot = pickGroundSpot(w, a);
      a.tx = spot.x;
      a.ty = spot.y;
      a.brain = 'goto';
      a.overlap = 0;
    }
    if (a.brain === 'held' || a.c.loco === 'orbit' || a.brain === 'headperch') continue;
    a.x = clamp(a.x, marginX(a), w.w - marginX(a));
    a.y = clamp(a.y, w.gMin, w.gMax);
  }
  void now;
}

// ── trails and idle sparkles ───────────────────────────────────────────

function ambient(w: World, a: Actor, now: number) {
  const u = w.unit;
  const moving = Math.hypot(a.vx, a.vy, a.vz) > 20 * u;

  if (a.c.trail && moving && now > a.nextTrail) {
    const bubble = a.c.trail === '🫧';
    a.nextTrail = now + (bubble ? 650 : 110);
    fx(w, {
      char: a.c.trail,
      x: a.x - a.facing * a.size * 0.4,
      y: a.y - a.z - a.size * 0.5,
      dx: -a.facing * rand(4, 16),
      dy: bubble ? -30 * u : rand(-8, 12),
      dur: bubble ? 1400 : 650,
      size: a.size * (bubble ? 0.28 : 0.3),
      scale: 0.3,
    });
  }

  if (now < a.nextAmbient) return;
  a.nextAmbient = now + rand(1100, 1700);

  if (a.brain === 'sleep') {
    const p = headPoint(a);
    fx(w, { char: '💤', x: p.x + a.size * 0.2, y: p.y + a.size * 0.2, dx: 18 * u, dy: -36 * u, dur: 1800, size: 15 * u });
  }
  if (a.isMain && !w.props.isEgg) {
    const p = headPoint(a);
    if (w.props.effect) {
      for (let i = 0; i < 2; i++) {
        fx(w, {
          char: w.props.effect,
          x: a.x + rand(-a.size * 0.6, a.size * 0.6),
          y: a.y - a.z - rand(0, a.size * 0.6),
          dx: rand(-10, 10),
          dy: -rand(40, 70) * u,
          dur: 1800,
          size: 18 * u,
          delay: i * 400,
        });
      }
    }
    if (w.props.aura) {
      fx(w, { char: '✨', x: p.x + rand(-a.size * 0.5, a.size * 0.5), y: p.y + a.size * 0.4, dx: 0, dy: -30 * u, dur: 1200, size: 14 * u });
    }
  }
}

// ── food & ball ────────────────────────────────────────────────────────

function stepThings(w: World, dt: number, now: number) {
  const u = w.unit;
  const g = 1500 * u;
  for (const t of [w.food, w.ball]) {
    if (!t) continue;
    if (t.z > 0 || t.vz > 0) {
      t.vz -= g * dt;
      t.z += t.vz * dt;
      if (t.z <= 0) {
        t.z = 0;
        if (t.vz < -160 * u) {
          t.vz = -t.vz * (t.kind === 'ball' ? 0.55 : 0.3);
          if (t.kind === 'ball') w.sound('boing');
        } else {
          t.vz = 0;
          t.landed = true;
        }
      }
    }
    if (t.z === 0) {
      const f = Math.max(0, 1 - (t.kind === 'ball' ? 1.4 : 6) * dt);
      t.vx *= f;
      t.vy *= f;
    }
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    const m = t.size * 0.5 + 4;
    if (t.x < m || t.x > w.w - m) {
      t.x = clamp(t.x, m, w.w - m);
      t.vx = -t.vx * 0.7;
    }
    if (t.y < w.gMin || t.y > w.gMax) {
      t.y = clamp(t.y, w.gMin, w.gMax);
      t.vy = -t.vy * 0.7;
    }
    if (t.kind === 'ball') t.rot += t.vx * dt * 2.4;
  }

  // As soon as food lands, the main buddy runs for it (if it's free).
  const main = mainOf(w);
  if (w.food?.landed && main && !w.props.isEgg && !['eat', 'goEat', 'held', 'fall'].includes(main.brain)) {
    goEat(w, main);
  }
  void now;
}

function goEat(w: World, a: Actor) {
  const f = w.food;
  if (!f) return;
  const side = a.x < f.x ? -1 : 1;
  a.tx = clamp(f.x + side * (a.size * 0.42 + f.size * 0.3), marginX(a), w.w - marginX(a));
  a.ty = f.y;
  a.brain = 'goEat';
  if (chance(0.5)) emote(w, a, pick(['😋', '❗', '🤤']));
}

function finishEating(w: World, a: Actor, now: number) {
  const f = w.food;
  w.food = null;
  if (f) burst(w, f.x, f.y - 10, ['💖', '✨', '💕'], 10, 60 * w.unit, 18);
  a.brain = 'idle';
  a.until = now + rand(1200, 2000);
  a.vz = 360 * w.unit;
  act(a, 'tada', 900, now);
  if (w.onTalk) w.onTalk(a, 'eat');
  else emote(w, a, pick(['😋', '🥰', '💖']));
  w.sound('sparkle');
  w.onAte?.();
}

export function dropFood(w: World, emoji: string) {
  const main = mainOf(w);
  const spot = main
    ? pickGroundSpot(w, undefined, { x: main.x < w.w / 2 ? main.x + w.w * 0.25 : main.x - w.w * 0.25, y: main.y }, 30 * w.unit)
    : pickGroundSpot(w);
  w.food = {
    kind: 'food',
    emoji,
    x: spot.x,
    y: spot.y,
    z: Math.max(40, spot.y - w.topPad - 30),
    vx: 0,
    vy: 0,
    vz: 0,
    rot: 0,
    size: 34 * w.unit,
    left: 1,
    landed: false,
  };
  if (main) {
    main.facing = spot.x > main.x ? 1 : -1;
    emote(w, main, '❗');
  }
  // Friends look over curiously.
  for (const a of w.actors) {
    if (a.isMain || isFlyer(a) || a.c.loco === 'orbit') continue;
    a.facing = spot.x > a.x ? 1 : -1;
    if (chance(0.5)) emote(w, a, '👀');
  }
}

export function throwBall(w: World) {
  const m = mainOf(w);
  w.ball = {
    kind: 'ball',
    emoji: '⚽',
    x: m ? clamp(m.x + rand(-80, 80) * w.unit, 30, w.w - 30) : w.w / 2,
    y: rand(w.gMin, w.gMax),
    z: w.h * 0.4,
    vx: rand(-90, 90) * w.unit,
    vy: rand(-20, 20),
    vz: 0,
    rot: 0,
    size: 30 * w.unit,
    left: 1,
    landed: false,
  };
  for (const a of w.actors) {
    if (!isFlyer(a) && a.c.loco !== 'orbit' && a.brain !== 'held' && (a.isMain || chance(0.6))) {
      a.brain = 'chase';
    }
  }
}

export function removeBall(w: World) {
  w.ball = null;
  for (const a of w.actors) if (a.brain === 'chase') a.brain = 'idle';
}

function kick(w: World, a: Actor, now: number) {
  const b = w.ball;
  if (!b) return;
  const ang = Math.atan2((b.y - a.y) * 2.2, b.x - a.x) + rand(-0.7, 0.7);
  const sp = rand(230, 380) * w.unit;
  b.vx = Math.cos(ang) * sp;
  b.vy = Math.sin(ang) * sp * 0.35;
  b.vz = rand(200, 340) * w.unit;
  b.z = Math.max(b.z, 1);
  b.landed = false;
  act(a, 'kick', 350, now);
  w.sound('boing');
  a.brain = 'idle';
  a.until = now + rand(350, 900);
  if (chance(0.3)) emote(w, a, pick(['⚽', '😆', '💪']));
}

/** The child flicks the ball directly. */
export function kickBallFrom(w: World, sx: number) {
  const b = w.ball;
  if (!b) return;
  const dir = b.x > sx ? 1 : -1;
  b.vx = dir * rand(200, 320) * w.unit;
  b.vy = rand(-60, 60);
  b.vz = rand(320, 420) * w.unit;
  b.z = Math.max(b.z, 1);
  b.landed = false;
  w.sound('boing');
  for (const a of w.actors) if (a.brain === 'idle' && !isFlyer(a) && a.c.loco !== 'orbit') a.brain = 'chase';
}

// ── party & tricks ─────────────────────────────────────────────────────

export function startParty(w: World) {
  w.partyUntil = w.now + 6500;
  w.sound('melody');
  for (const a of w.actors) {
    if (isFlyer(a)) {
      if (a.brain === 'perched' || a.brain === 'headperch') takeOff(w, a);
    } else if (a.c.loco !== 'orbit' && a.brain !== 'held') {
      a.brain = 'dance';
      a.until = w.partyUntil;
    }
  }
}

export function performTrick(w: World, a: Actor, trick: TrickId, quiet = false) {
  const now = w.now;
  const u = w.unit;
  const p = headPoint(a);
  switch (trick) {
    case 'spin':
      a.vz = 260 * u;
      act(a, 'spin', 700, now);
      w.sound('boing');
      break;
    case 'dance':
      a.brain = 'dance';
      a.until = now + 2600;
      w.sound('melody');
      break;
    case 'flip':
      a.vz = 540 * u;
      act(a, 'flip', 800, now);
      w.sound('boing');
      break;
    case 'sing':
      act(a, 'sing', 2000, now);
      w.sound('melody');
      for (let i = 0; i < 6; i++) {
        fx(w, { char: pick(SING), x: p.x, y: p.y, dx: rand(-60, 60) * u, dy: -rand(50, 90) * u, dur: 1500, size: 18 * u, delay: i * 280 });
      }
      break;
    case 'hearts':
      act(a, 'tada', 900, now);
      burst(w, p.x, p.y + a.size * 0.4, ['💖', '💕', '💗', '💘'], 14, 80 * u, 20 * u);
      w.sound('sparkle');
      break;
    case 'dash': {
      a.brain = 'dash';
      a.tx = a.x < w.w / 2 ? w.w - marginX(a) : marginX(a);
      a.ty = clamp(a.y + rand(-10, 10), w.gMin, w.gMax);
      w.sound('boing');
      break;
    }
    case 'giant':
      act(a, 'giant', 2400, now);
      burst(w, p.x, p.y + a.size * 0.5, ['✨', '⭐', '🌟'], 12, 90 * u, 18 * u);
      w.sound('sparkle');
      break;
    case 'aura':
      act(a, 'tada', 900, now);
      burst(w, p.x, p.y + a.size * 0.5, ['🌟', '👑', '✨'], 12, 80 * u, 18 * u);
      w.sound('sparkle');
      break;
    default:
      // jump (and 'ball', which works through the ball button)
      a.vz = 430 * u;
      w.sound('boing');
  }
  if (!quiet && chance(0.6)) emote(w, a, pick(['😆', '🥰', '✨', '💕', '🎵']));
}

// ── touch ──────────────────────────────────────────────────────────────

export function tapActor(w: World, a: Actor) {
  const now = w.now;
  const u = w.unit;

  if (a.brain === 'sleep') {
    a.brain = 'idle';
    a.until = now + 1200;
    act(a, 'squash', 450, now);
    emote(w, a, '❗');
    w.sound('pop');
    return;
  }

  if (a.isMain) {
    if (w.props.isEgg) {
      act(a, 'shake', 500, now);
      burst(w, a.x, a.y - a.size * 0.6, ['✨', '💫'], 5, 34 * u, 14);
      w.sound('pop');
      return;
    }
    const tricks = w.props.tricks.filter((t) => t !== 'ball');
    if (!tricks.includes('jump')) tricks.unshift('jump');
    const newest = tricks[tricks.length - 1];
    performTrick(w, a, chance(0.35) ? newest : pick(tricks), !!w.onTalk);
    w.onTalk?.(a, w.props.hungry ? 'hungry' : 'tap');
    return;
  }

  if (isFlyer(a)) {
    if (a.brain === 'perched' || a.brain === 'headperch') {
      takeOff(w, a);
      a.vz = 280 * u;
    } else {
      act(a, 'loop', 900, now);
      a.vz += 220 * u;
      setAirTarget(w, a);
    }
    voice(w, a);
    burst(w, a.x, a.y - a.z - a.size / 2, ['✨', '💫'], 4, 30 * u, 13);
    return;
  }

  if (a.c.loco === 'orbit') {
    act(a, 'spin', 700, now);
    voice(w, a);
    return;
  }

  const r = Math.random();
  if (r < 0.4) a.vz = 400 * u;
  else if (r < 0.7) {
    a.vz = 240 * u;
    act(a, 'spin', 700, now);
  } else act(a, 'wiggle', 800, now);
  emote(w, a, pick(EMOTES));
  voice(w, a);
}

/** Tap on empty stage: everyone comes over (or flies to the spot). */
export function tapGround(w: World, sx: number, sy: number) {
  const u = w.unit;
  fx(w, { char: '', x: sx, y: sy, dx: 0, dy: 0, dur: 700, size: 10, kind: 'ripple' });
  fx(w, { char: '✨', x: sx, y: sy, dx: 0, dy: -24 * u, dur: 800, size: 16 * u });

  const onGround = sy >= w.gMin - 12;
  const gy = clamp(sy, w.gMin, w.gMax);

  for (const a of w.actors) {
    if (['held', 'eat', 'sleep', 'fall'].includes(a.brain) || a.c.loco === 'orbit') continue;
    if (a.isMain && w.props.isEgg) continue;

    if (isFlyer(a)) {
      if (onGround && canLand(a) && chance(0.6)) {
        const spot = pickGroundSpot(w, a, { x: sx, y: gy }, 50 * u);
        a.tx = spot.x;
        a.ty = spot.y;
        a.tz = 0;
        a.brain = 'land';
      } else {
        a.tx = clamp(sx + rand(-30, 30) * u, marginX(a), w.w - marginX(a));
        a.ty = rand(w.gMin, w.gMax);
        a.tz = clamp(a.ty - sy - a.size / 2, 10, maxZ(w, a, a.ty));
        a.brain = 'air';
      }
    } else if (onGround) {
      const spot = pickGroundSpot(w, a, { x: sx, y: gy }, (a.size + 30) * u * 0.8);
      a.tx = spot.x;
      a.ty = spot.y;
      a.brain = 'goto';
      a.speedMul = 1.6;
      setTimeout(() => (a.speedMul = 1), 2500);
    } else {
      a.facing = sx > a.x ? 1 : -1;
      if (a.z === 0) a.vz = 300 * u;
    }
  }
}

export function grab(a: Actor) {
  a.brain = 'held';
  a.pose = 'held';
  a.vx = a.vy = a.vz = 0;
  a.act = null;
}

/** Puts the actor's middle under the finger, lifting it off the ground. */
export function dragTo(w: World, a: Actor, sx: number, sy: number) {
  const feet = sy + a.size * 0.5;
  a.x = clamp(sx, marginX(a), w.w - marginX(a));
  a.y = clamp(feet, w.gMin, w.gMax);
  a.z = Math.max(0, a.y - feet);
  if (Math.abs(sx - a.x) > 1) a.facing = sx > a.x ? 1 : -1;
}

export function release(w: World, a: Actor, vx: number, vy: number) {
  const u = w.unit;
  if (isFlyer(a) && a.c.loco !== 'orbit') {
    setAirTarget(w, a);
    a.vx = clamp(vx, -400 * u, 400 * u);
    a.vz = clamp(-vy, -300 * u, 400 * u);
    voice(w, a);
    return;
  }
  if (a.c.loco === 'orbit') {
    a.brain = 'idle';
    return;
  }
  a.vx = clamp(vx * 0.6, -300 * u, 300 * u);
  a.vy = 0;
  a.vz = clamp(-vy * 0.4, -200 * u, 300 * u);
  if (a.z > 2 || a.vz > 0) {
    a.brain = 'fall';
  } else {
    a.brain = 'idle';
    a.until = w.now + rand(600, 1200);
    a.vx = 0;
  }
  voice(w, a);
}
