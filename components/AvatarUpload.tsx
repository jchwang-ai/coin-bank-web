'use client';

import { useRef, useState } from 'react';

interface AvatarUploadProps {
  photoUrl: string | null;
  editable?: boolean;
  size?: number;
  onUpload?: (dataUrl: string) => Promise<void>;
  fallbackEmoji?: string;
}

function resizeImageToSquare(file: File, targetSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));

        // Cover-crop to square from the center
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AvatarUpload({
  photoUrl,
  editable = false,
  size = 88,
  onUpload,
  fallbackEmoji = '🧒',
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const dataUrl = await resizeImageToSquare(file);
      setPreview(dataUrl);
      if (onUpload) await onUpload(dataUrl);
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const displayUrl = preview || photoUrl;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div
        className="rounded-full overflow-hidden bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center border-2 border-white shadow-md"
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="프로필 사진" className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.5 }}>{fallbackEmoji}</span>
        )}
      </div>

      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shadow-md active:scale-90 transition-transform disabled:opacity-50"
            aria-label="사진 변경"
          >
            {isUploading ? '⏳' : '📷'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
