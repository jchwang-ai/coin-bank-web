'use client';

import { useRef, useState } from 'react';
import { MAX_DIARY_IMAGES } from '@/lib/diary';
import { playPop } from '@/lib/sound';

interface DiaryImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * This project has no object storage (no S3 / Vercel Blob / Supabase), so
 * photos follow the pattern already proven here for avatars and mission
 * photos: resize on the client, then store a base64 data URL in Postgres.
 * Capped at MAX_DIARY_IMAGES and downscaled hard to keep rows small.
 */
function resizeImage(file: File, maxDim = 900): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DiaryImagePicker({ images, onChange }: DiaryImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const remaining = MAX_DIARY_IMAGES - images.length;

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, remaining);
    if (!files.length) return;
    try {
      setIsBusy(true);
      const resized = await Promise.all(files.map((f) => resizeImage(f)));
      onChange([...images, ...resized].slice(0, MAX_DIARY_IMAGES));
      playPop();
    } catch (err) {
      console.error('Diary photo resize error:', err);
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="mb-2.5 grid grid-cols-3 gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="animate-pop-in relative overflow-hidden rounded-xl border border-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`일기 사진 ${idx + 1}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[12px] text-white active:scale-90 transition-transform"
                aria-label="사진 지우기"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="w-full rounded-2xl border-2 border-dashed border-black/10 py-3.5 text-[14px] font-semibold text-[#8e8e93] transition-colors active:scale-[0.99] disabled:opacity-50"
        >
          {isBusy ? '불러오는 중...' : `📷 사진 넣기 (${images.length}/${MAX_DIARY_IMAGES})`}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePick}
      />
    </div>
  );
}
