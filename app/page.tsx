'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8">
      <h1 className="text-4xl font-bold text-center text-purple-700 mb-2">
        🪙 나의 코인 은행
      </h1>
      <p className="text-center text-gray-400 text-sm mb-8">
        누구로 들어갈까요?
      </p>

      <div className="flex flex-col gap-4">
        <Link href="/login?role=parent">
          <button className="w-full bg-blue-100 text-blue-700 font-bold py-12 px-6 rounded-3xl text-xl hover:bg-blue-200 active:scale-95 transition-all">
            <span className="text-6xl block mb-3">👨‍👩‍👧</span>
            부모님
          </button>
        </Link>

        <Link href="/login?role=child">
          <button className="w-full bg-pink-100 text-pink-700 font-bold py-12 px-6 rounded-3xl text-xl hover:bg-pink-200 active:scale-95 transition-all">
            <span className="text-6xl block mb-3">🧒</span>
            아이
          </button>
        </Link>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
        <p className="text-xs text-yellow-800 text-center">
          💡 QR코드를 스캔하셨나요?<br/>
          <span className="font-bold">비밀번호로 역할이 결정돼요!</span>
        </p>
      </div>
    </div>
  );
}
