'use client';

import { useState } from 'react';

const EMOJI_OPTIONS = [
  '🎮', '📺', '🎨', '📚', '🧸', '🎵', '⚽', '🎾', '🏀', '🚴', '🎪', '🎢',
  '🎡', '🍦', '🍕', '🍿', '🍩', '🍪', '🧁', '🍭', '🍫', '🍓', '🎂', '🥤',
  '⭐', '🌟', '✨', '💫', '🌈', '🎈', '🎉', '🎊', '🏆', '🥇', '🎁', '💝',
  '💖', '🦄', '🐶', '🐱', '🐰', '🐼', '🦋', '🌸', '🛏️', '🧹', '🦷', '📖',
  '✏️', '🎒', '👟', '🚲', '🏠', '🚗', '😴', '🍽️', '🧺', '🪥',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-14 h-14 rounded-2xl bg-black/[0.03] border border-black/5 flex items-center justify-center text-2xl shrink-0 active:scale-95 transition-transform"
        aria-label="아이콘 고르기"
      >
        {value}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 safe-bottom animate-sheet-up max-h-[70vh] flex flex-col">
            <div className="w-10 h-1.5 bg-black/10 rounded-full mx-auto mb-4 shrink-0" />
            <p className="text-[17px] font-bold text-[#1c1c1e] mb-3 shrink-0">아이콘을 골라주세요</p>
            <div className="grid grid-cols-6 gap-2 overflow-y-auto">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-2xl active:scale-90 transition-all ${
                    emoji === value ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-black/[0.03]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
