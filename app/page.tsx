'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-12">
        <div className="w-20 h-20 mx-auto mb-5 rounded-[22px] bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
          <span className="text-4xl">💖</span>
        </div>
        <h1 className="text-[28px] font-bold text-[#1c1c1e] tracking-tight">
          나의 하트 은행
        </h1>
        <p className="text-[#8e8e93] text-[15px] mt-1.5">누구로 들어갈까요?</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/login?role=parent">
          <button className="w-full bg-white rounded-2xl py-6 px-6 flex items-center gap-4 shadow-sm border border-black/5 active:scale-[0.98] active:bg-black/[0.02] transition-all">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-3xl shrink-0">
              👨‍👩‍👧
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[17px] text-[#1c1c1e]">부모님</p>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">하트 관리 & 쿠폰 설정</p>
            </div>
            <span className="text-[#c7c7cc] text-xl">›</span>
          </button>
        </Link>

        <Link href="/login?role=child">
          <button className="w-full bg-white rounded-2xl py-6 px-6 flex items-center gap-4 shadow-sm border border-black/5 active:scale-[0.98] active:bg-black/[0.02] transition-all">
            <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center text-3xl shrink-0">
              👧
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[17px] text-[#1c1c1e]">아이</p>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">내 하트와 쿠폰 상점</p>
            </div>
            <span className="text-[#c7c7cc] text-xl">›</span>
          </button>
        </Link>
      </div>

      <div className="mt-8 flex items-start gap-2.5 bg-amber-50 rounded-2xl p-4">
        <span className="text-lg leading-none">💡</span>
        <p className="text-[13px] text-amber-800 leading-snug">
          QR코드를 스캔하셨나요?{' '}
          <span className="font-semibold">비밀번호로 역할이 자동으로 결정돼요!</span>
        </p>
      </div>
    </div>
  );
}
