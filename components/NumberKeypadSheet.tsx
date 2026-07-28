'use client';

import { useState } from 'react';

interface NumberKeypadSheetProps {
  initialValue: number;
  min?: number;
  max?: number;
  suffix?: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

export default function NumberKeypadSheet({
  initialValue,
  min = 1,
  max = 999,
  suffix = '💖',
  onConfirm,
  onClose,
}: NumberKeypadSheetProps) {
  const [value, setValue] = useState(String(initialValue));
  const [started, setStarted] = useState(false);
  const maxDigits = String(max).length;

  const pressDigit = (d: string) => {
    if (!started) {
      setValue(d);
      setStarted(true);
      return;
    }
    setValue((v) => {
      if (v.length >= maxDigits) return v;
      const next = v === '0' ? d : v + d;
      return next;
    });
  };

  const backspace = () => {
    setStarted(true);
    setValue((v) => (v.length <= 1 ? '0' : v.slice(0, -1)));
  };

  const clear = () => {
    setStarted(true);
    setValue('0');
  };

  const handleConfirm = () => {
    const num = parseInt(value, 10) || 0;
    const clamped = Math.max(min, Math.min(max, num));
    onConfirm(clamped);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 safe-bottom animate-sheet-up">
        <div className="w-10 h-1.5 bg-black/10 rounded-full mx-auto mb-5" />

        <p className="text-center text-[40px] font-bold text-[#1c1c1e] mb-6 tabular-nums">
          {value} <span className="text-2xl align-middle">{suffix}</span>
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {KEYS.map((key) => {
            if (key === 'clear') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={clear}
                  className="py-4 text-[14px] font-bold rounded-2xl bg-black/[0.04] text-[#8e8e93] active:scale-95 transition-transform"
                >
                  지우기
                </button>
              );
            }
            if (key === 'back') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={backspace}
                  className="py-4 rounded-2xl bg-black/[0.04] text-[#1c1c1e] active:scale-95 transition-transform flex items-center justify-center"
                  aria-label="지우기"
                >
                  <svg width="22" height="16" viewBox="0 0 24 18" fill="none">
                    <path
                      d="M8.5 1H21a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 21 17H8.5a1.5 1.5 0 0 1-1.1-.48L1 9l6.4-7.52A1.5 1.5 0 0 1 8.5 1Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M12.5 5.5 18 11M18 5.5l-5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => pressDigit(key)}
                className="py-4 text-2xl font-bold rounded-2xl bg-black/[0.04] text-[#1c1c1e] active:scale-95 transition-transform"
              >
                {key}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3.5 bg-black/5 text-[#8e8e93] font-semibold rounded-xl active:scale-[0.98] transition-all"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="py-3.5 bg-purple-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
