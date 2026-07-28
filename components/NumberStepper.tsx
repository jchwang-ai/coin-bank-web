'use client';

import { useRef, useState } from 'react';
import NumberKeypadSheet from './NumberKeypadSheet';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** Optional sign shown right before the number, e.g. '+' or '−'. */
  signPrefix?: string;
  /** Tailwind text color class applied to the value + sign, e.g. 'text-pink-500'. */
  valueColorClassName?: string;
}

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 90;

export default function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix = '💖',
  signPrefix = '',
  valueColorClassName = 'text-[#1c1c1e]',
}: NumberStepperProps) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  const startHold = (delta: number) => {
    onChange(clamp(valueRef.current + delta));
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onChange(clamp(valueRef.current + delta));
      }, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  };

  const dec = () => startHold(-step);
  const inc = () => startHold(step);

  const [keypadOpen, setKeypadOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onPointerDown={dec}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        onPointerCancel={clearTimers}
        disabled={value <= min}
        className="w-11 h-11 rounded-xl bg-black/[0.04] text-xl font-bold text-[#1c1c1e] active:scale-90 transition-transform flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="줄이기"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => setKeypadOpen(true)}
        className={`flex-1 text-center text-[17px] font-bold bg-black/[0.03] rounded-xl py-2.5 active:bg-black/[0.06] transition-colors ${valueColorClassName}`}
      >
        {signPrefix}
        {value} {suffix}
      </button>
      <button
        type="button"
        onPointerDown={inc}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        onPointerCancel={clearTimers}
        disabled={value >= max}
        className="w-11 h-11 rounded-xl bg-black/[0.04] text-xl font-bold text-[#1c1c1e] active:scale-90 transition-transform flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="늘리기"
      >
        +
      </button>

      {keypadOpen && (
        <NumberKeypadSheet
          initialValue={value}
          min={min}
          max={max}
          suffix={suffix}
          onConfirm={(v) => {
            onChange(v);
            setKeypadOpen(false);
          }}
          onClose={() => setKeypadOpen(false)}
        />
      )}
    </div>
  );
}
