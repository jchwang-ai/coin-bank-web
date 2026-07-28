'use client';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export default function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  suffix = '💖',
}: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="w-11 h-11 rounded-xl bg-black/[0.04] text-xl font-bold text-[#1c1c1e] active:scale-90 transition-transform flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="줄이기"
      >
        −
      </button>
      <div className="flex-1 text-center text-[17px] font-bold text-[#1c1c1e] bg-black/[0.03] rounded-xl py-2.5">
        {value} {suffix}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-11 h-11 rounded-xl bg-black/[0.04] text-xl font-bold text-[#1c1c1e] active:scale-90 transition-transform flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="늘리기"
      >
        +
      </button>
    </div>
  );
}
