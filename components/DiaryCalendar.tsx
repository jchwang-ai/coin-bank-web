'use client';

import { useState } from 'react';
import { moodOf, toDateKey, todayKey } from '@/lib/diary';

export interface DiaryMark {
  mood: string | null;
  status: string;
}

interface DiaryCalendarProps {
  marks: Record<string, DiaryMark>;
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DiaryCalendar({ marks, onSelectDate }: DiaryCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const today = todayKey();

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#1c1c1e] transition-transform active:scale-90"
          aria-label="지난 달"
        >
          ←
        </button>
        <p className="text-[15px] font-bold text-[#1c1c1e]">
          {viewYear}년 {viewMonth + 1}월
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={isCurrentMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#1c1c1e] transition-transform active:scale-90 disabled:opacity-30"
          aria-label="다음 달"
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-center text-[11px] font-semibold ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-sky-400' : 'text-[#8e8e93]'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = toDateKey(new Date(viewYear, viewMonth, day));
          const mark = marks[key];
          const mood = moodOf(mark?.mood);
          const isFuture = key > today;
          const isToday = key === today;

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(key)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-90 disabled:opacity-25 ${
                isToday ? 'bg-pink-50 ring-2 ring-pink-300' : mark ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'
              }`}
            >
              <span
                className={`text-[12px] leading-none ${
                  isToday ? 'font-bold text-pink-600' : 'font-medium text-[#1c1c1e]'
                }`}
              >
                {day}
              </span>
              {mark ? (
                <span className="text-[15px] leading-none">
                  {mood ? mood.emoji : mark.status === 'completed' ? '🌱' : '✏️'}
                </span>
              ) : (
                <span className="h-[15px] leading-none" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-[#8e8e93]">
        날짜를 누르면 그날 일기를 볼 수 있어요 · ✏️ 는 임시 저장
      </p>
    </div>
  );
}
