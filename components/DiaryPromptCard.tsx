'use client';

import { useState } from 'react';
import { DIARY_PROMPTS } from '@/lib/diary';
import { playPop } from '@/lib/sound';

/**
 * "뭘 써야 할지 모르겠어요 🤔" — tap to reveal a random writing prompt.
 * Prompts are a front-end array (no DB), and never repeat twice in a row.
 */
export default function DiaryPromptCard() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);

  const pick = () => {
    let next = prompt;
    while (next === prompt && DIARY_PROMPTS.length > 1) {
      next = DIARY_PROMPTS[Math.floor(Math.random() * DIARY_PROMPTS.length)];
    }
    setPrompt(next ?? DIARY_PROMPTS[0]);
    setSpin((s) => s + 1);
    playPop();
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-4">
      <button
        type="button"
        onClick={pick}
        className="flex w-full items-center justify-between gap-2 text-left active:scale-[0.99] transition-transform"
      >
        <span className="text-[14px] font-bold text-amber-700">뭘 써야 할지 모르겠어요 🤔</span>
        <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm">
          {prompt ? '다른 질문' : '질문 받기'}
        </span>
      </button>

      {prompt && (
        <p key={spin} className="animate-pop-in mt-3 rounded-xl bg-white/80 px-4 py-3 text-[15px] font-semibold text-[#1c1c1e]">
          💬 {prompt}
        </p>
      )}
    </div>
  );
}
