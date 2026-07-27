'use client';

import { useState } from 'react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
}

export default function PinPad({ onSubmit, isLoading, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      onSubmit(pin);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="w-full max-w-sm">
      {/* PIN Display */}
      <div className="flex justify-center gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              i < pin.length ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* PIN Pad Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(String(num))}
            disabled={isLoading || pin.length >= 4}
            className="py-4 text-xl font-bold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95 transition-transform disabled:opacity-50"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={handleBackspace}
          className="py-3 text-sm font-bold rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 active:scale-95 transition-transform"
        >
          ← 뒤로
        </button>
        <button
          onClick={() => handleKeyPress('0')}
          disabled={isLoading || pin.length >= 4}
          className="py-4 text-xl font-bold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleClear}
          className="py-3 text-sm font-bold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-transform"
        >
          지우기
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || pin.length !== 4}
        className="w-full py-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 mb-4"
      >
        {isLoading ? '확인 중...' : '로그인'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="text-center text-red-600 font-bold text-sm animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
}
