'use client';

import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { EmojiBody } from '@/components/CreatureArt';
import { LineKey, pickLine } from '@/lib/petLines';
import { playAnimalVoice } from '@/lib/sound';

// ── The buddy, drawn big for the care room ─────────────────────────────

export type SpritePose = 'idle' | 'walk' | 'run' | 'eat' | 'sleep' | 'dance' | 'held' | 'swim';

const FACE_ONLY = new Set(['🐶', '🐱', '🐰', '🐼', '🦊', '🐹', '🐸', '🐨', '🐣']);

/** Fixed spots for dirt / foam / tangles so they sit on the body. */
export const BODY_SPOTS = [
  { x: 30, y: 38 },
  { x: 66, y: 30 },
  { x: 48, y: 58 },
  { x: 24, y: 66 },
  { x: 72, y: 62 },
  { x: 52, y: 22 },
];

interface PetSpriteProps {
  emoji: string;
  size: number;
  pose?: SpritePose;
  /** Re-plays a one-shot action (spin, tada, squash…) whenever `actKey` changes. */
  act?: string | null;
  actKey?: number;
  hue?: number;
  /** 0–1: brown smudges. */
  dirt?: number;
  /** 0–1: soap foam. */
  foam?: number;
  /** Water drops dripping off. */
  wet?: boolean;
  shiny?: boolean;
  facing?: 1 | -1;
  accessories?: { hat?: string; face?: string; held?: string };
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function PetSprite({
  emoji,
  size,
  pose = 'idle',
  act,
  actKey,
  hue = 0,
  dirt = 0,
  foam = 0,
  wet,
  shiny,
  facing = 1,
  accessories,
  children,
  style,
  className = '',
}: PetSpriteProps) {
  return (
    <div
      data-pose={pose}
      data-act={act || undefined}
      className={`relative ${className}`}
      style={{ width: size, height: size, fontSize: size, '--fur-hue': `${hue}deg`, ...style } as CSSProperties}
    >
      {shiny && <span className="care-shine" />}
      <div className="cr-face" style={{ transform: `scaleX(${-facing})` }}>
        <div key={actKey} className="cr-act">
          <div className="cr-loco">
            <div className="cr-art">
              <EmojiBody emoji={emoji} feet={FACE_ONLY.has(emoji)} />
              {accessories?.hat && (
                <span className="cr-acc" style={{ fontSize: '0.46em', top: '-0.22em', left: '50%', transform: 'translateX(-50%)' }}>
                  {accessories.hat}
                </span>
              )}
              {accessories?.face && (
                <span className="cr-acc" style={{ fontSize: '0.36em', top: '0.3em', left: '50%', transform: 'translateX(-50%)' }}>
                  {accessories.face}
                </span>
              )}
              {accessories?.held && (
                <span className="cr-acc" style={{ fontSize: '0.4em', right: '-0.22em', bottom: '0.05em' }}>
                  {accessories.held}
                </span>
              )}
              {dirt > 0.02 &&
                BODY_SPOTS.slice(0, 5).map((p, i) => (
                  <span
                    key={`d${i}`}
                    className="care-dirt"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: Math.min(1, dirt * (1.3 - i * 0.12)) }}
                  />
                ))}
              {foam > 0.02 &&
                BODY_SPOTS.map((p, i) => (
                  <span
                    key={`f${i}`}
                    className="care-foam"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      opacity: Math.min(1, foam * 1.6 - i * 0.12),
                      transform: `translate(-50%, -50%) scale(${0.6 + foam * 0.7})`,
                    }}
                  />
                ))}
              {wet &&
                [20, 45, 70].map((x, i) => (
                  <span key={`w${i}`} className="care-drip" style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }}>
                    💧
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Speech: bubble + animal voice + (optional) read-aloud ──────────────

const TTS_KEY = 'pet-tts';

export function readTts(): boolean {
  try {
    return localStorage.getItem(TTS_KEY) !== '0';
  } catch {
    return true;
  }
}

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const clean = text.replace(/[\p{Extended_Pictographic}‍️~!…]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ko-KR';
    const ko = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ko'));
    if (ko) u.voice = ko;
    u.pitch = 1.7;
    u.rate = 1.08;
    u.volume = 0.9;
    synth.speak(u);
  } catch {
    /* read-aloud is a bonus; never break the page over it */
  }
}

export interface Talk {
  text: string;
  key: number;
}

/**
 * `say('pat')` shows a random line in a bubble, plays the animal's own cry
 * and (if enabled) reads it aloud in a high cute voice.
 */
export function usePetTalk(animalId: string | null) {
  const [talk, setTalk] = useState<Talk | null>(null);
  const [tts, setTtsState] = useState(true);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTtsState(readTts());
  }, []);

  const setTts = useCallback((on: boolean) => {
    setTtsState(on);
    try {
      localStorage.setItem(TTS_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!on) window.speechSynthesis?.cancel();
  }, []);

  const say = useCallback(
    (key: LineKey | { text: string }, mood: 'happy' | 'sad' | 'normal' = 'normal') => {
      const text = typeof key === 'string' ? pickLine(key, animalId) : key.text;
      seq.current += 1;
      setTalk({ text, key: seq.current });
      playAnimalVoice(animalId, mood);
      if (tts) setTimeout(() => speak(text), 280);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTalk(null), 2800);
    },
    [animalId, tts]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    },
    []
  );

  return { talk, say, tts, setTts };
}

export function SpeechBubble({ talk, style }: { talk: Talk | null; style?: CSSProperties }) {
  if (!talk) return null;
  return (
    <div key={talk.key} className="care-bubble" style={style}>
      {talk.text}
    </div>
  );
}

// ── Particles ──────────────────────────────────────────────────────────

interface Particle {
  id: number;
  char: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  dur: number;
  rot: number;
}

/** Floating emoji particles in px relative to their container. */
export function useParticles() {
  const [items, setItems] = useState<Particle[]>([]);
  const seq = useRef(0);

  const spawn = useCallback(
    (char: string | string[], x: number, y: number, opts: { count?: number; spread?: number; rise?: number; size?: number; dur?: number } = {}) => {
      const { count = 1, spread = 40, rise = 60, size = 22, dur = 1100 } = opts;
      const chars = Array.isArray(char) ? char : [char];
      const added: Particle[] = Array.from({ length: count }, () => ({
        id: ++seq.current,
        char: chars[Math.floor(Math.random() * chars.length)],
        x,
        y,
        dx: (Math.random() - 0.5) * spread * 2,
        dy: -rise * (0.6 + Math.random() * 0.8),
        size: size * (0.8 + Math.random() * 0.4),
        dur: dur * (0.8 + Math.random() * 0.4),
        rot: (Math.random() - 0.5) * 120,
      }));
      setItems((prev) => [...prev.slice(-50), ...added]);
      const ids = new Set(added.map((a) => a.id));
      setTimeout(() => setItems((prev) => prev.filter((p) => !ids.has(p.id))), dur * 1.3);
    },
    []
  );

  const layer = (
    <>
      {items.map((p) => (
        <span
          key={p.id}
          className="fx"
          style={
            {
              left: p.x,
              top: p.y,
              fontSize: p.size,
              zIndex: 50,
              animationDuration: `${p.dur}ms`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
    </>
  );

  return { spawn, layer };
}

/** Keeps receiving moves after the finger leaves the element (best effort). */
export function capturePointer(e: React.PointerEvent) {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* not supported / pointer already gone */
  }
}

/** Pointer position relative to an element. */
export function localPoint(e: { clientX: number; clientY: number }, el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
}

/** Big rounded action button used across scenes. */
export function SceneButton({
  children,
  onClick,
  disabled,
  tone = 'violet',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'violet' | 'sky' | 'amber' | 'emerald' | 'slate';
  className?: string;
}) {
  const tones = {
    violet: 'from-violet-500 to-fuchsia-500',
    sky: 'from-sky-500 to-cyan-500',
    amber: 'from-amber-400 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    slate: 'from-slate-600 to-slate-800',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl bg-gradient-to-r ${tones[tone]} px-4 py-3 text-[15px] font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
