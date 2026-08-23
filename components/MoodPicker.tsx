'use client';

import { MOODS } from '@/lib/diary';

interface MoodPickerProps {
  value: string | null;
  onChange: (moodId: string) => void;
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {MOODS.map((mood) => {
        const isActive = value === mood.id;
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(mood.id)}
            aria-pressed={isActive}
            className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all active:scale-95 ${
              isActive
                ? `${mood.activeClass} ring-2 scale-105 shadow-sm`
                : 'bg-black/[0.03] ring-0'
            }`}
          >
            <span className={`leading-none transition-transform ${isActive ? 'text-[38px]' : 'text-[32px]'}`}>
              {mood.emoji}
            </span>
            <span
              className={`text-[12px] font-semibold ${isActive ? 'text-[#1c1c1e]' : 'text-[#8e8e93]'}`}
            >
              {mood.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
