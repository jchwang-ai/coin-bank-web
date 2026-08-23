'use client';

import { useState } from 'react';
import { BUDDY_ANIMALS } from '@/lib/diaryPet';
import { playPop } from '@/lib/sound';

interface BuddyPickerSheetProps {
  current: string | null;
  onClose: () => void;
  onSelect: (animalId: string) => Promise<void>;
}

export default function BuddyPickerSheet({ current, onClose, onSelect }: BuddyPickerSheetProps) {
  const [picked, setPicked] = useState<string | null>(current);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!picked) return;
    try {
      setIsSaving(true);
      await onSelect(picked);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up safe-bottom relative w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />

        <p className="text-[17px] font-bold text-[#1c1c1e]">일기 친구 고르기 🌱</p>
        <p className="mb-4 mt-1 text-[13px] text-[#8e8e93]">
          일기를 쓸수록 친구가 알에서 태어나고 점점 자라요!
        </p>

        <div className="grid grid-cols-4 gap-2.5">
          {BUDDY_ANIMALS.map((a) => {
            const isPicked = picked === a.id;
            return (
              <button
                key={a.id}
                onClick={() => {
                  setPicked(a.id);
                  playPop();
                }}
                className={`flex flex-col items-center gap-1 rounded-2xl py-3 transition-all active:scale-95 ${
                  isPicked ? 'scale-105 bg-violet-100 ring-2 ring-violet-400' : 'bg-black/[0.03]'
                }`}
              >
                <span className={`leading-none ${isPicked ? 'text-[34px]' : 'text-[28px]'}`}>
                  {a.emoji}
                </span>
                <span
                  className={`text-[11px] font-semibold ${isPicked ? 'text-[#1c1c1e]' : 'text-[#8e8e93]'}`}
                >
                  {a.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-black/5 py-3.5 font-semibold text-[#8e8e93] transition-transform active:scale-[0.98]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!picked || isSaving}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 py-3.5 font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '이 친구로 할래요!'}
          </button>
        </div>
      </div>
    </div>
  );
}
