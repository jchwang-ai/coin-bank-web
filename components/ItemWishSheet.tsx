'use client';

import { useState } from 'react';
import { ItemWish } from '@/app/diary/shopActions';

interface ItemWishSheetProps {
  wishes: ItemWish[];
  onClose: () => void;
  onSubmit: (name: string, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const IDEAS = ['공룡 친구', '우주복', '무지개 날개', '고양이 귀', '축구공', '케이크'];

/** "추가하고 싶은 아이템을 적으세요" — the child proposes new shop items. */
export default function ItemWishSheet({ wishes, onClose, onSubmit, onDelete }: ItemWishSheetProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('어떤 아이템인지 적어주세요');
      return;
    }
    try {
      setError('');
      setIsSaving(true);
      await onSubmit(name, note);
      setName('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '보내지 못했어요');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up safe-bottom relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10" />

        <p className="shrink-0 text-[18px] font-bold text-[#1c1c1e]">✏️ 아이템 만들어주세요</p>
        <p className="mb-3 mt-0.5 shrink-0 text-[12px] text-[#8e8e93]">
          갖고 싶은 아이템을 적어주면 상점에 만들어드려요!
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="예: 무지개 날개"
            className="w-full rounded-2xl bg-black/[0.03] px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => setName(idea)}
                className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 active:scale-95"
              >
                {idea}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="어떤 모양이면 좋을지 자유롭게 적어보세요 (안 적어도 괜찮아요)"
            rows={3}
            className="mt-3 w-full resize-none rounded-2xl bg-black/[0.03] px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          {error && (
            <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-500">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? '보내는 중...' : '보내기 💌'}
          </button>

          {wishes.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-bold text-[#8e8e93]">내가 적은 아이템</p>
              <div className="overflow-hidden rounded-2xl bg-black/[0.02]">
                {wishes.map((w, idx) => (
                  <div
                    key={w.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      idx !== wishes.length - 1 ? 'border-b border-black/[0.06]' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#1c1c1e]">{w.name}</p>
                      {w.note && <p className="line-clamp-1 text-[11px] text-[#8e8e93]">{w.note}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-[#8e8e93]">
                      {w.status === 'pending' ? '⏳ 기다리는 중' : '✅ 만들었어요'}
                    </span>
                    {w.status === 'pending' && (
                      <button
                        onClick={() => onDelete(w.id)}
                        className="shrink-0 text-[13px] text-red-400 active:scale-90"
                        aria-label="지우기"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 shrink-0 rounded-xl bg-black/5 py-3.5 font-semibold text-[#8e8e93] transition-transform active:scale-[0.98]"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
