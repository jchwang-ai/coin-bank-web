'use client';

import { useState } from 'react';
import EmojiPicker from './EmojiPicker';
import NumberStepper from './NumberStepper';

interface MissionProposalSheetProps {
  onClose: () => void;
  onSubmit: (data: { emoji: string; name: string; reward: number }) => Promise<void>;
}

export default function MissionProposalSheet({ onClose, onSubmit }: MissionProposalSheetProps) {
  const [emoji, setEmoji] = useState('🎯');
  const [name, setName] = useState('');
  const [reward, setReward] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('어떤 미션인지 적어주세요');
      return;
    }
    if (!reward || reward < 1) {
      setError('몇 하트인지 적어주세요');
      return;
    }
    setError('');
    try {
      setIsSubmitting(true);
      await onSubmit({ emoji, name: name.trim(), reward });
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

        <p className="text-[17px] font-bold text-[#1c1c1e] mb-1">🎯 새 미션 만들어달라고 하기</p>
        <p className="text-[13px] text-[#8e8e93] mb-4">이런 미션이 있으면 좋겠다고 부모님께 제안해봐요</p>

        <div className="flex items-center gap-2 mb-3">
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 강아지 산책시키기"
            className="flex-1 min-w-0 px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <p className="text-[13px] font-semibold text-[#8e8e93] mb-2 px-1">완료하면 몇 하트면 될까요?</p>
        <div className="mb-1">
          <NumberStepper value={reward} onChange={setReward} />
        </div>
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
