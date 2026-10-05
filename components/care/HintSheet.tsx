'use client';

import { Block } from '@/lib/petCare';

export interface HintAction {
  label: string;
  onClick: () => void;
  tone?: 'primary' | 'plain';
}

/**
 * "Why is this locked / used up — and what can I do?" Pops up whenever the
 * child taps something that isn't available, instead of a dead button.
 */
export default function HintSheet({
  block,
  actions = [],
  onClose,
}: {
  block: Block;
  actions?: HintAction[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="animate-sheet-up safe-bottom relative w-full max-w-lg rounded-t-3xl bg-white px-5 pb-6 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10" />
        <div className="flex items-start gap-3">
          <span className="animate-pop-in text-[44px] leading-none">{block.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold leading-snug text-[#1c1c1e]">{block.title}</p>
            {block.reason && <p className="mt-1 text-[14px] leading-snug text-[#3a3a3c]">{block.reason}</p>}
          </div>
        </div>

        {block.howTo.length > 0 && (
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3">
            <p className="mb-1.5 text-[12px] font-bold text-violet-600">이렇게 하면 돼요</p>
            <ul className="space-y-1.5">
              {block.howTo.map((h) => (
                <li key={h} className="text-[14px] leading-snug text-[#1c1c1e]">
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`rounded-2xl py-3.5 text-[15px] font-bold transition-transform active:scale-[0.98] ${
                a.tone === 'plain' ? 'bg-black/5 text-[#1c1c1e]' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
              }`}
            >
              {a.label}
            </button>
          ))}
          <button onClick={onClose} className="rounded-2xl bg-black/5 py-3 text-[14px] font-semibold text-[#8e8e93] active:scale-[0.98]">
            알겠어요
          </button>
        </div>
      </div>
    </div>
  );
}
