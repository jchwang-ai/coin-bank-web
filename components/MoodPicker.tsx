'use client';

import { MOODS } from '@/lib/diary';

interface MoodPickerProps {
  value: string | null;
  onChange: (moodId: string) => void;
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
      {MOODS.map((mood) => {
        const isActive = value === mood.id;
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(mood.id)}
            aria-pressed={isActive}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all active:scale-95 hover:-translate-y-0.5 ${
              isActive
                ? `${mood.activeClass} ring-2 scale-105 shadow-sm`
                : 'bg-black/[0.03] ring-0 hover:bg-black/[0.05]'
            }`}
          >
            <span className={`leading-none transition-transform ${isActive ? 'text-[34px]' : 'text-[28px]'}`}>
              {mood.emoji}
            </span>
            <span
              className={`text-[11px] font-semibold ${isActive ? 'text-[#1c1c1e]' : 'text-[#8e8e93]'}`}
            >
              {mood.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
