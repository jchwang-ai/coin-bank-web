'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import PinPad from '@/components/PinPad';
import Toast from '@/components/Toast';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (searchParams.get('role') as 'parent' | 'child') || 'parent';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const handleSubmit = async (pin: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin }),
      });

      if (response.ok) {
        setToast('어서와! 반가워 🥰');
        setTimeout(() => {
          router.push(`/${role}`);
        }, 400);
      } else {
        setIsLoading(false);
        setError('비밀번호가 달라요 🙈');
      }
    } catch (err) {
      setIsLoading(false);
      setError('오류가 발생했어요');
      console.error(err);
    }
  };

  const title = role === 'parent' ? '부모님' : '아이';
  const emoji = role === 'parent' ? '👨‍👩‍👧' : '👧';

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-md mx-auto">
      <button
        onClick={() => router.push('/')}
        className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] mb-8 active:bg-black/10 transition-colors"
        aria-label="뒤로 가기"
      >
        ‹
      </button>

      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-3xl mb-4">
          {emoji}
        </div>
        <h1 className="text-[20px] font-semibold text-[#1c1c1e] mb-10">
          {title} 비밀번호를 입력하세요
        </h1>

        <PinPad onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      </div>

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center pt-20 text-[#8e8e93]">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
