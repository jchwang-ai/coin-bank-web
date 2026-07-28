'use client';

import { useRef, useState } from 'react';

interface MissionInfo {
  id: string;
  emoji: string;
  name: string;
  reward: number;
}

interface MissionRequestSheetProps {
  mission?: MissionInfo; // omit for a custom (free-text) request
  onClose: () => void;
  onSubmit: (data: { missionId?: string; description?: string; photoData: string | null }) => Promise<void>;
}

function resizeImageToMaxDimension(file: File, maxDim = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MissionRequestSheet({ mission, onClose, onSubmit }: MissionRequestSheetProps) {
  const isCustom = !mission;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const resized = await resizeImageToMaxDimension(file);
      setPhotoData(resized);
    } catch (err) {
      console.error('Photo resize error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (isCustom && !description.trim()) {
      setError('무엇을 했는지 적어주세요');
      return;
    }
    setError('');
    try {
      setIsSubmitting(true);
      await onSubmit({
        missionId: mission?.id,
        description: isCustom ? description.trim() : undefined,
        photoData,
      });
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

        {isCustom ? (
          <>
            <p className="text-[17px] font-bold text-[#1c1c1e] mb-1">✨ 직접 요청하기</p>
            <p className="text-[13px] text-[#8e8e93] mb-4">무엇을 했는지 부모님께 알려주세요</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 동생이랑 안 싸우고 사이좋게 놀았어요"
              rows={3}
              className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-1 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
            />
          </>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-2xl shrink-0">
              {mission!.emoji}
            </div>
            <div>
              <p className="text-[17px] font-bold text-[#1c1c1e]">{mission!.name}</p>
              <p className="text-[13px] font-semibold text-pink-500">완료하면 {mission!.reward} 💖</p>
            </div>
          </div>
        )}

        {/* Photo attach */}
        <div className="mt-3 mb-2">
          {photoData ? (
            <div className="relative w-full rounded-xl overflow-hidden border border-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoData} alt="첨부 사진" className="w-full max-h-56 object-cover" />
              <button
                onClick={() => setPhotoData(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3.5 rounded-xl border-2 border-dashed border-black/10 text-[#8e8e93] text-[14px] font-medium flex items-center justify-center gap-2 active:bg-black/[0.02] transition-colors disabled:opacity-50"
            >
              {isUploading ? '불러오는 중...' : (
                <>
                  <span>📷</span>
                  사진 첨부하기 (선택)
                </>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
        </div>

        {error && <p className="text-red-500 text-[13px] font-medium mb-2">{error}</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
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
            {isSubmitting ? '보내는 중...' : '요청 보내기 💌'}
          </button>
        </div>
      </div>
    </div>
  );
}
