'use client';

import { useState } from 'react';
import EmojiPicker from './EmojiPicker';

interface ShopItemProposalSheetProps {
  onClose: () => void;
  onSubmit: (data: { emoji: string; name: string; price: number }) => Promise<void>;
}

export default function ShopItemProposalSheet({ onClose, onSubmit }: ShopItemProposalSheetProps) {
  const [emoji, setEmoji] = useState('🎁');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('갖고 싶은 걸 적어주세요');
      return;
    }
    const qty = parseInt(price, 10);
    if (!qty || qty < 1) {
      setError('몇 하트인지 적어주세요');
      return;
    }
    setError('');
    try {
      setIsSubmitting(true);
      await onSubmit({ emoji, name: name.trim(), price: qty });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 safe-bottom animate-sheet-up">
        <div className="w-10 h-1.5 bg-black/10 rounded-full mx-auto mb-4" />

        <p className="text-[17px] font-bold text-[#1c1c1e] mb-1">🛍️ 새 아이템 제안하기</p>
        <p className="text-[13px] text-[#8e8e93] mb-4">갖고 싶은 걸 부모님께 제안해봐요</p>

        <div className="flex items-center gap-2 mb-3">
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 놀이공원 가기"
            className="flex-1 min-w-0 px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="몇 하트면 될까요?"
          min="1"
          className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <p className="text-[12px] text-[#8e8e93] px-1 mb-3">* 부모님이 확인하고 하트 개수를 조정할 수 있어요</p>

        {error && <p className="text-red-500 text-[13px] font-medium mb-2">{error}</p>}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={onClose}
            className="py-3.5 bg-black/5 text-[#8e8e93] font-semibold rounded-xl active:scale-[0.98] transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? '보내는 중...' : '제안 보내기 💌'}
          </button>
        </div>
      </div>
    </div>
  );
}
