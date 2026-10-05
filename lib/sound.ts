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
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  sweep(ctx, 2200, 3400, now, 0.08, 0.07);
  sweep(ctx, 2600, 3900, now + 0.11, 0.09, 0.07);
}

/** Insect buzz. */
export function playBuzz() {
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

/** Sparkly flourish — for finishing a diary entry. */
export function playSparkle() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [659.25, 880, 1174.66, 1567.98]; // E5 A5 D6 G6
  notes.forEach((f, i) => tone(ctx, f, now + i * 0.07, 0.3, 0.12, 'triangle'));
}
