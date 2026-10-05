'use client';

// All sounds are synthesized with the Web Audio API (no audio files needed).
// iOS/mobile browsers only allow audio to start from within a user gesture,
// so call unlockAudio() from an early tap/click handler to warm up the
// context; later programmatic calls (e.g. triggered by polling) then work.

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gain = 0.15,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function unlockAudio() {
  getContext();
  preloadAnimalSounds();
}

/** Cheerful ascending chime — for receiving hearts / approvals. */
export function playChime() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(ctx, f, now + i * 0.09, 0.35, 0.16, 'triangle'));
}

/** Soft whoosh — for sending a request. */
export function playSend() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 440, now, 0.1, 0.1, 'sine');
  tone(ctx, 660, now + 0.06, 0.14, 0.12, 'sine');
}

/** Light tap feedback — for small UI confirmations. */
export function playPop() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 880, now, 0.1, 0.1, 'square');
}

/** Gentle low tone — for rejections, kept soft/non-punitive. */
export function playSoftDown() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 392, now, 0.18, 0.1, 'sine');
  tone(ctx, 330, now + 0.1, 0.22, 0.09, 'sine');
}

/** Short two-note blip — for a diary draft being tucked away. */
export function playSaveBlip() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 587.33, now, 0.12, 0.1, 'triangle'); // D5
  tone(ctx, 784, now + 0.08, 0.16, 0.1, 'triangle'); // G5
}

/** Pitch glide from f1 to f2 — the building block for creature voices. */
function sweep(
  ctx: AudioContext,
  f1: number,
  f2: number,
  startTime: number,
  duration: number,
  gain = 0.1,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, startTime);
  osc.frequency.exponentialRampToValueAtTime(f2, startTime + duration);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Bird chirp: two quick rising whistles. */
export function playTweet() {
  if (playClip(CREATURE_CLIPS.tweet, 0.95 + Math.random() * 0.15)) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 2200, 3400, now, 0.08, 0.07);
  sweep(ctx, 2600, 3900, now + 0.11, 0.09, 0.07);
}

/** Insect buzz. */
export function playBuzz() {
  if (playClip(CREATURE_CLIPS.buzz, 1, 0.45)) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 190, 260, now, 0.3, 0.05, 'sawtooth');
}

/** Small-animal squeak. */
export function playSqueak() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 900, 1500, now, 0.12, 0.08, 'triangle');
}

/** Baby-dragon / dino "rawr" — low but cute, never scary. */
export function playRoar() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 260, 140, now, 0.35, 0.09, 'sawtooth');
}

/** Bubbly blub for fish and whales. */
export function playBlub() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 300, 700, now, 0.09, 0.08);
  sweep(ctx, 400, 900, now + 0.1, 0.08, 0.07);
}

/** Springy boing for jumps and ball kicks. */
export function playBoing() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 180, 620, now, 0.22, 0.09, 'triangle');
}

/** Nom — one bite of food. */
export function playChomp() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 320, 120, now, 0.09, 0.12, 'square');
}

/** Short happy tune for singing / parties. */
export function playMelody() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 1046.5];
  notes.forEach((f, i) => tone(ctx, f, now + i * 0.16, 0.22, 0.1, 'triangle'));
}

/**
 * Pitch contour through several points, with optional vibrato — enough to
 * fake a meow, a bark or a neigh with nothing but an oscillator.
 */
function contour(
  ctx: AudioContext,
  points: Array<[number, number]>,
  startTime: number,
  gain = 0.1,
  type: OscillatorType = 'sine',
  vibrato = 0
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  const end = startTime + points[points.length - 1][0];
  osc.frequency.setValueAtTime(points[0][1], startTime);
  for (const [t, f] of points.slice(1)) osc.frequency.linearRampToValueAtTime(f, startTime + t);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = vibrato;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(startTime);
    lfo.stop(end + 0.05);
  }
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  g.gain.setValueAtTime(gain, Math.max(startTime + 0.02, end - 0.06));
  g.gain.exponentialRampToValueAtTime(0.001, end);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(end + 0.05);
}

/** Short burst of filtered noise — water, scrubbing, rustling. */
function noise(ctx: AudioContext, startTime: number, duration: number, gain = 0.08, freq = 1200, q = 0.8) {
  const len = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + duration);
}

/** Synthesized stand-in, used until the recorded clips have loaded. */
function synthAnimalVoice(animalId: string | null | undefined, mood: 'happy' | 'sad' | 'normal' = 'normal') {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const k = mood === 'happy' ? 1.12 : mood === 'sad' ? 0.82 : 1;
  switch (animalId) {
    case 'dog': // 멍멍!
      contour(ctx, [[0, 620 * k], [0.09, 380 * k]], t, 0.12, 'square');
      contour(ctx, [[0, 680 * k], [0.1, 400 * k]], t + 0.17, 0.12, 'square');
      break;
    case 'cat': // 야옹~
      contour(ctx, [[0, 480 * k], [0.18, 820 * k], [0.45, 560 * k]], t, 0.1, 'triangle', 12);
      break;
    case 'rabbit':
      contour(ctx, [[0, 1300 * k], [0.06, 1700 * k]], t, 0.07, 'sine');
      contour(ctx, [[0, 1400 * k], [0.06, 1800 * k]], t + 0.1, 0.07, 'sine');
      break;
    case 'panda':
      contour(ctx, [[0, 210 * k], [0.12, 260 * k], [0.3, 170 * k]], t, 0.12, 'triangle');
      break;
    case 'fox':
      contour(ctx, [[0, 900 * k], [0.08, 1350 * k], [0.16, 1000 * k]], t, 0.09, 'sawtooth');
      break;
    case 'penguin':
      contour(ctx, [[0, 480 * k], [0.1, 720 * k], [0.25, 420 * k]], t, 0.08, 'sawtooth', 20);
      break;
    case 'unicorn': // 히힝~
      contour(ctx, [[0, 950 * k], [0.15, 1200 * k], [0.55, 520 * k]], t, 0.08, 'triangle', 40);
      break;
    default: // chick: 삐약삐약
      contour(ctx, [[0, 2100 * k], [0.07, 2900 * k]], t, 0.07, 'sine');
      contour(ctx, [[0, 2200 * k], [0.08, 3100 * k]], t + 0.12, 0.07, 'sine');
  }
}

/** Soapy scrub. */
export function playScrub() {
  const ctx = getContext();
  if (!ctx) return;
  noise(ctx, ctx.currentTime, 0.12, 0.05, 2400, 1.5);
}

/** Shower / splash. */
export function playSplash() {
  const ctx = getContext();
  if (!ctx) return;
  noise(ctx, ctx.currentTime, 0.35, 0.07, 3500, 0.6);
}

/** Bubble pop. */
export function playBubble() {
  const ctx = getContext();
  if (!ctx) return;
  sweep(ctx, 500 + Math.random() * 500, 1400, ctx.currentTime, 0.06, 0.06);
}

/** Brush stroke. */
export function playBrush() {
  const ctx = getContext();
  if (!ctx) return;
  noise(ctx, ctx.currentTime, 0.18, 0.05, 900, 2);
}

/** Footstep on the path. */
export function playStep() {
  const ctx = getContext();
  if (!ctx) return;
  noise(ctx, ctx.currentTime, 0.06, 0.05, 400, 1);
}

/** Soft lullaby for bedtime. */
export function playLullaby() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [392, 330, 392, 330, 349.23, 293.66, 261.63];
  notes.forEach((f, i) => tone(ctx, f, now + i * 0.42, 0.6, 0.07, 'sine'));
}

/** Little fanfare for finishing a care activity. */
export function playFanfare() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
    tone(ctx, f, now + i * 0.1, 0.25, 0.12, 'triangle')
  );
}

/** Sparkly flourish — for finishing a diary entry. */
export function playSparkle() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [659.25, 880, 1174.66, 1567.98]; // E5 A5 D6 G6
  notes.forEach((f, i) => tone(ctx, f, now + i * 0.07, 0.3, 0.12, 'triangle'));
}

// ── Recorded animal sounds ─────────────────────────────────────────────
// Real recordings (CC0 / CC BY, see public/sounds/animals/CREDITS.txt),
// trimmed to short cute clips. Decoded once into AudioBuffers; until a clip
// is ready the synthesized voice above plays instead, so taps never go silent.

const ANIMAL_CLIPS: Record<string, string[]> = {
  chick: ['chick-1', 'chick-2', 'chick-3'],
  dog: ['dog-1', 'dog-2', 'dog-3'],
  cat: ['cat-1', 'cat-2', 'cat-3', 'cat-4'],
  rabbit: ['rabbit-1', 'rabbit-2', 'rabbit-3'],
  panda: ['panda-1', 'panda-2'],
  fox: ['fox-1', 'fox-2'],
  penguin: ['penguin-1', 'penguin-2'],
  unicorn: ['unicorn-1', 'unicorn-2'],
};

const CREATURE_CLIPS = {
  tweet: ['bird-1', 'bird-2', 'bird-3'],
  hoot: ['owl-1'],
  croak: ['frog-1'],
  quack: ['duck-1'],
  buzz: ['bee-1'],
};

const clips = new Map<string, AudioBuffer | 'loading' | 'failed'>();

function loadClip(name: string) {
  const ctx = getContext();
  if (!ctx || clips.has(name)) return;
  clips.set(name, 'loading');
  fetch(`/sounds/animals/${name}.mp3`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => clips.set(name, buf))
    .catch(() => clips.set(name, 'failed'));
}

export function preloadAnimalSounds() {
  for (const list of [...Object.values(ANIMAL_CLIPS), ...Object.values(CREATURE_CLIPS)]) list.forEach(loadClip);
}

/** Plays a random clip from the list. Returns false if none is ready yet. */
function playClip(names: string[], rate = 1, gain = 0.7): boolean {
  const ctx = getContext();
  if (!ctx || !names.length) return false;
  const ready = names.filter((n) => clips.get(n) instanceof AudioBuffer);
  names.forEach(loadClip);
  if (!ready.length) return false;
  const buf = clips.get(ready[Math.floor(Math.random() * ready.length)]) as AudioBuffer;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(ctx.destination);
  src.start();
  return true;
}

/**
 * Each buddy animal's own real cry. Mood nudges the pitch: a happy pup
 * yips higher, a sad one lower. A little randomness keeps repeats lively.
 */
export function playAnimalVoice(animalId: string | null | undefined, mood: 'happy' | 'sad' | 'normal' = 'normal') {
  const list = ANIMAL_CLIPS[animalId ?? 'chick'] ?? ANIMAL_CLIPS.chick;
  const base = mood === 'happy' ? 1.08 : mood === 'sad' ? 0.88 : 1;
  if (!playClip(list, base * (0.96 + Math.random() * 0.1))) synthAnimalVoice(animalId, mood);
}

/** Cries for stage friends that have their own recording. */
export function playCreatureVoice(kind: keyof typeof CREATURE_CLIPS) {
  if (!playClip(CREATURE_CLIPS[kind], 0.95 + Math.random() * 0.12)) playPop();
}
