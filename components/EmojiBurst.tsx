'use client';

import { useEffect, useState } from 'react';

interface EmojiBurstProps {
  /** Change this value (e.g. a counter or Date.now()-like token) to fire a new burst. */
  trigger: number;
  emojis?: string[];
  count?: number;
}

interface Particle {
  id: number;
  emoji: string;
  left: number; // percent
  delay: number; // seconds
  size: number; // px
}

let particleSeq = 0;

export default function EmojiBurst({ trigger, emojis = ['💖', '✨', '🎉'], count = 10 }: EmojiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const next: Particle[] = Array.from({ length: count }, () => ({
      id: particleSeq++,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      left: 20 + Math.random() * 60,
      delay: Math.random() * 0.25,
      size: 20 + Math.random() * 16,
    }));
    setParticles(next);

    const timer = setTimeout(() => setParticles([]), 1300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animation: `float-up 1.1s ease-out ${p.delay}s both`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
