'use client';

import { useEffect, useRef, useState } from 'react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
  onErrorClear?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({ onSubmit, isLoading, error }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const submittedRef = useRef(false);

  const appendDigit = (num: string) => {
    if (isLoading) return;
    setPin((prev) => (prev.length < 4 ? prev + num : prev));
  };

  const backspace = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  // Auto-submit once 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !submittedRef.current && !isLoading) {
      submittedRef.current = true;
      onSubmit(pin);
    }
    if (pin.length < 4) {
      submittedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Clear + shake on error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t1 = setTimeout(() => setShake(false), 400);
      const t2 = setTimeout(() => setPin(''), 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [error]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (e.key >= '0' && e.key <= '9') {
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Enter' && pin.length === 4) {
        submittedRef.current = true;
        onSubmit(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isLoading]);

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* PIN Dots */}
      <div
        className={`flex justify-center gap-4 mb-10 transition-transform ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
              i < pin.length
                ? error
                  ? 'bg-red-500 scale-110'
                  : 'bg-[#7c3aed] scale-110'
                : 'bg-black/10'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 justify-items-center">
        {KEYS.map((key, idx) => {
          if (key === '') return <div key={idx} />;
          if (key === 'del') {
            return (
              <button
                key={idx}
                onClick={backspace}
                disabled={isLoading}
                className="w-16 h-16 flex items-center justify-center rounded-full text-[#1c1c1e]/60 active:bg-black/5 transition-colors disabled:opacity-40"
                aria-label="지우기"
              >
                <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
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
              key={idx}
              onClick={() => appendDigit(key)}
              disabled={isLoading || pin.length >= 4}
              className="w-16 h-16 rounded-full bg-black/[0.04] text-2xl font-medium text-[#1c1c1e] active:bg-black/10 active:scale-95 transition-all disabled:opacity-40"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      <div className="h-6 mt-6 text-center">
        {error && <p className="text-red-500 font-medium text-sm">{error}</p>}
        {isLoading && <p className="text-black/40 font-medium text-sm">확인 중...</p>}
      </div>
    </div>
  );
}
