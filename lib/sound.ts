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
