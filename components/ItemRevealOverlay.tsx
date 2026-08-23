'use client';

import { RARITY, ShopItem } from '@/lib/characterShop';

interface ItemRevealOverlayProps {
  item: ShopItem;
  /** True when the item was a hidden/mystery one — gets a louder reveal. */
  wasHidden: boolean;
  onDone: () => void;
}

const SPARK_EMOJI = ['✨', '⭐', '🌟', '💫', '🎉', '💖'];

/**
 * The "번쩍번쩍" purchase moment: white flash, spinning light rays, the item
 * bursting in, and sparkles flying outward. Tapping anywhere dismisses it.
 */
export default function ItemRevealOverlay({ item, wasHidden, onDone }: ItemRevealOverlayProps) {
  const rarity = RARITY[item.rarity];

  // 14 sparks on a circle around the item.
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 110 + (i % 3) * 34;
    return {
      dx: `${Math.cos(angle) * distance}px`,
      dy: `${Math.sin(angle) * distance}px`,
      emoji: SPARK_EMOJI[i % SPARK_EMOJI.length],
      delay: (i % 5) * 0.06,
      size: 20 + (i % 3) * 8,
    };
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/55 px-6 backdrop-blur-sm"
      onClick={onDone}
    >
      {/* Camera-flash whiteout at the moment of reveal */}
      <div className="animate-flash-out pointer-events-none absolute inset-0 bg-white" />

      {/* Rotating light rays */}
      <div
        className="animate-shine-spin pointer-events-none absolute h-[520px] w-[520px] rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(255,255,255,0.85) 0deg 12deg, transparent 12deg 30deg, rgba(255,255,255,0.85) 30deg 42deg, transparent 42deg 60deg, rgba(255,255,255,0.85) 60deg 72deg, transparent 72deg 90deg, rgba(255,255,255,0.85) 90deg 102deg, transparent 102deg 120deg, rgba(255,255,255,0.85) 120deg 132deg, transparent 132deg 150deg, rgba(255,255,255,0.85) 150deg 162deg, transparent 162deg 180deg)',
        }}
      />

      {/* Flying sparks */}
      <div className="pointer-events-none absolute left-1/2 top-1/2">
        {sparks.map((s, i) => (
          <span
            key={i}
            className="animate-spark-fly absolute leading-none"
            style={
              {
                '--dx': s.dx,
                '--dy': s.dy,
                fontSize: `${s.size}px`,
                animationDelay: `${s.delay}s`,
              } as React.CSSProperties
            }
          >
            {s.emoji}
          </span>
        ))}
      </div>

      {/* The card */}
      <div className="animate-reveal-pop relative w-full max-w-xs rounded-3xl bg-white px-7 py-8 text-center shadow-2xl">
        <p className="text-[13px] font-bold text-[#8e8e93]">
          {wasHidden ? '🎁 히든 아이템 발견!' : '새 아이템 획득!'}
        </p>

        <div
          className={`mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-white to-black/[0.04] ring-4 ${rarity.ring} shadow-xl ${rarity.glow}`}
        >
          <span className="text-6xl leading-none drop-shadow">{item.emoji}</span>
        </div>

        <span
          className={`mt-4 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${rarity.chip}`}
        >
          {rarity.label}
        </span>

        <p className="mt-2 text-[20px] font-bold leading-tight text-[#1c1c1e]">{item.name}</p>
        <p className="mt-1 text-[13px] text-[#8e8e93]">바로 입혀줬어요! 💎 {item.cost} 사용</p>

        <button
          onClick={onDone}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
        >
          좋아요!
        </button>
      </div>
    </div>
  );
}
