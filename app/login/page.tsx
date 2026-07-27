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

      const data = await response.json();

      if (response.ok) {
        setToast(`어서와! 반가워 🥰`);
        setTimeout(() => {
          router.push(`/${role}`);
        }, 500);
      } else {
        setError('앗! 비밀번호가 달라요 🙈');
      }
    } catch (err) {
      setError('오류가 발생했어요');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const title = role === 'parent' ? '👨‍👩‍👧 부모님 비밀번호를 눌러주세요' : '🧒 내 비밀번호를 눌러주세요';

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8">
      <h1 className="text-xl font-bold text-center text-purple-700 mb-8">
        {title}
      </h1>

      <PinPad onSubmit={handleSubmit} isLoading={isLoading} error={error} />

      <button
        onClick={() => router.push('/')}
        className="mt-6 w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 active:scale-95 transition-all"
      >
        ← 뒤로 가기
      </button>

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
