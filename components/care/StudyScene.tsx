'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CP, DAILY } from '@/lib/petCare';
import { playChime, playPop, playSoftDown } from '@/lib/sound';
import { QuizQuestion, answerQuiz, getQuizQuestion } from '@/app/diary/petActions';
import { PetSprite, SpeechBubble, Talk, useParticles } from './common';
import { SceneCtx } from './types';

type Subject = 'mix' | 'english' | 'math';

interface Feedback {
  correct: boolean;
  answer: string;
  explain: string;
  levelChange: number;
  cpFull: boolean;
}

/** After a miss, wait this long before the next question (no rapid guessing). */
const WRONG_WAIT_MS = 4000;

/** Shows the phrase with the studied word in bold. */
function Highlighted({ text, word }: { text: string; word?: string }) {
  if (!word) return <>{text}</>;
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="rounded-md bg-amber-200 px-1">{text.slice(i, i + word.length)}</span>
      {text.slice(i + word.length)}
    </>
  );
}

/**
 * 🧠 공부방: care points (⭐) come from here. Questions are made and checked
 * on the server; only correct answers pay, misses teach the right answer.
 */
export default function StudyScene({ ctx, talk }: { ctx: SceneCtx; talk: Talk | null }) {
  const { pet, say } = ctx;
  const ref = useRef<HTMLDivElement>(null);
  const { spawn, layer } = useParticles();
  const [subject, setSubject] = useState<Subject>('mix');
  const [q, setQ] = useState<QuizQuestion | null>(null);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [solved, setSolved] = useState(0);
  const [act, setAct] = useState<{ name: string; key: number } | null>(null);

  // Ticks the countdowns (wrong-answer wait, pause).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const next = useCallback(
    async (subj: Subject = subject) => {
      setBusy(true);
      setFeedback(null);
      setTyped('');
      try {
        const res = await getQuizQuestion(subj);
        if (!res.ok) {
          setQ(null);
          if ('pauseUntil' in res && typeof res.pauseUntil === 'number') setWaitUntil(res.pauseUntil);
          ctx.showBlock(res.block);
          return;
        }
        setQ(res.question);
      } finally {
        setBusy(false);
      }
    },
    [subject, ctx]
  );

  useEffect(() => {
    next();
    const t = setTimeout(() => say('quizStart', 'happy'), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (given: string) => {
    if (!q || busy || feedback) return;
    setBusy(true);
    try {
      const res = await answerQuiz(q.id, given);
      if (!res.ok) {
        // Too fast: same question stays; just explain.
        playSoftDown();
        ctx.showBlock(res.block);
        return;
      }
      ctx.patchPet({
        cp: res.cp,
        quizLevel: q.subject === 'math' ? { ...pet.quizLevel, math: res.level } : { ...pet.quizLevel, english: res.level },
      });
      setFeedback({ correct: res.correct, answer: res.answer, explain: res.explain, levelChange: res.levelChange, cpFull: res.cpFull });
      const el = ref.current;
      if (res.correct) {
        playChime();
        setSolved((n) => n + 1);
        setAct({ name: 'tada', key: Date.now() });
        if (el) spawn(['⭐', '✨', '🌟'], el.clientWidth / 2, el.clientHeight * 0.35, { count: 10, spread: 90, rise: 90 });
        say('quizRight', 'happy');
      } else {
        playSoftDown();
        setWaitUntil(res.pauseUntil ?? Date.now() + WRONG_WAIT_MS);
        say('quizWrong', 'sad');
      }
    } finally {
      setBusy(false);
    }
  };

  const waiting = waitUntil > now;
  const waitSec = Math.ceil((waitUntil - now) / 1000);
  const activitiesLeft = Math.max(0, pet.daily.limit - pet.daily.activities);

  return (
    <div ref={ref} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-sky-100 via-indigo-50 to-violet-100">
      <div className="mx-auto max-w-lg px-4 pb-6 pt-3">
        {/* Points & today */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-3.5 py-2.5 text-white shadow-sm">
            <p className="text-[11px] font-semibold text-white/85">돌봄 포인트</p>
            <p className="text-[22px] font-bold leading-tight">
              ⭐ {pet.cp} <span className="text-[12px] font-semibold text-white/80">/ {CP.max}</span>
            </p>
          </div>
          <div className="flex-1 rounded-2xl bg-white px-3.5 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold text-[#8e8e93]">오늘 남은 돌봄</p>
            <p className="text-[22px] font-bold leading-tight text-[#1c1c1e]">
              {activitiesLeft}
              <span className="text-[12px] font-semibold text-[#8e8e93]"> / {pet.daily.limit}번</span>
            </p>
          </div>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-[#8e8e93]">
          다음 돌봄은 ⭐ {pet.daily.nextCost}개 · 돌봄을 많이 할수록 조금씩 더 필요해요 · 오늘 푼 문제 {solved}개
        </p>

        {/* Subject */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/70 p-1">
          {(
            [
              ['mix', '🎲 섞어서'],
              ['english', `🔤 영어 Lv.${pet.quizLevel.english}`],
              ['math', `🔢 수학 Lv.${pet.quizLevel.math}`],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s}
              onClick={() => {
                playPop();
                setSubject(s);
                if (!feedback && !waiting) next(s);
              }}
              className={`rounded-xl py-2 text-[12px] font-bold ${subject === s ? 'bg-white text-[#1c1c1e] shadow-sm' : 'text-[#8e8e93]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Buddy cheering */}
        <div className="relative mt-3 flex h-[110px] items-end justify-center">
          <PetSprite emoji={ctx.emoji} size={86} pose={feedback?.correct ? 'dance' : 'idle'} act={act?.name} actKey={act?.key} hue={pet.furHue} facing={1} accessories={ctx.accessories} />
          <SpeechBubble talk={talk} style={{ bottom: 96 }} />
        </div>

        {/* Question */}
        <div className="mt-2 rounded-3xl bg-white p-4 shadow-sm">
          {!q ? (
            <div className="py-8 text-center">
              {waiting ? (
                <>
                  <p className="text-4xl">🧘</p>
                  <p className="mt-2 text-[15px] font-bold text-[#1c1c1e]">잠깐 쉬어가요… {waitSec}초</p>
                  <p className="mt-1 text-[12px] text-[#8e8e93]">연속으로 틀리면 잠깐 쉬었다가 다시 풀어요</p>
                </>
              ) : (
                <button onClick={() => next()} disabled={busy} className="rounded-2xl bg-violet-500 px-5 py-3 text-[15px] font-bold text-white">
                  {busy ? '문제 가져오는 중…' : '📝 문제 받기'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                  {q.subject === 'math' ? `🔢 수학 Lv.${q.level}` : `🔤 영어 Lv.${q.level}`}
                </span>
                <span className="text-[11px] font-bold text-amber-500">맞히면 ⭐ +1</span>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-[#8e8e93]">{q.ask}</p>
              <p className="mt-1 text-center text-[26px] font-bold leading-snug text-[#1c1c1e]">
                <Highlighted text={q.prompt} word={q.highlight} />
              </p>

              {q.choices ? (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {q.choices.map((c) => {
                    const isAnswer = feedback && c === feedback.answer;
                    return (
                      <button
                        key={c}
                        onClick={() => submit(c)}
                        disabled={busy || !!feedback}
                        className={`rounded-2xl px-4 py-3 text-left text-[15px] font-bold transition-all active:scale-[0.98] ${
                          isAnswer ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'bg-black/[0.04] text-[#1c1c1e]'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="mx-auto mb-2 flex h-14 max-w-[200px] items-center justify-center rounded-2xl bg-black/[0.04] text-[30px] font-bold text-[#1c1c1e]">
                    {typed || <span className="text-[#c7c7cc]">?</span>}
                  </div>
                  <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인'].map((k) => (
                      <button
                        key={k}
                        disabled={busy || !!feedback || (k === '확인' && !typed)}
                        onClick={() => {
                          if (k === '⌫') setTyped((t) => t.slice(0, -1));
                          else if (k === '확인') submit(typed);
                          else setTyped((t) => (t.length < 5 ? t + k : t));
                        }}
                        className={`rounded-2xl py-3 text-[20px] font-bold active:scale-95 disabled:opacity-40 ${
                          k === '확인' ? 'bg-violet-500 text-[15px] text-white' : 'bg-black/[0.05] text-[#1c1c1e]'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {feedback && (
                <div className={`animate-pop-in mt-4 rounded-2xl px-4 py-3 ${feedback.correct ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <p className={`text-[16px] font-bold ${feedback.correct ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {feedback.correct ? (feedback.cpFull ? '⭕ 정답! (⭐ 주머니가 가득 찼어요)' : '⭕ 정답! ⭐ +1') : `❌ 아쉬워요! 정답은 "${feedback.answer}"`}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#3a3a3c]">{feedback.explain}</p>
                  {feedback.levelChange > 0 && <p className="mt-1 text-[12px] font-bold text-violet-600">🎉 3문제 연속 정답! 문제가 한 단계 어려워져요</p>}
                  {feedback.levelChange < 0 && <p className="mt-1 text-[12px] font-bold text-sky-600">조금 쉬운 문제로 다시 연습해요</p>}
                  <button
                    onClick={() => next()}
                    disabled={busy || waiting}
                    className="mt-3 w-full rounded-xl bg-violet-500 py-3 text-[15px] font-bold text-white active:scale-[0.98] disabled:bg-black/15"
                  >
                    {waiting ? `정답을 기억해요… ${waitSec}` : '다음 문제 ➜'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* How studying pays */}
        <div className="mt-3 rounded-3xl bg-white/80 p-4">
          <p className="text-[13px] font-bold text-[#1c1c1e]">📚 공부하면 받는 보상</p>
          <ul className="mt-2 space-y-1.5 text-[12px] text-[#3a3a3c]">
            <li>🧠 여기서 문제를 맞히면 → ⭐ 돌봄 포인트 1개</li>
            <li>📔 일기를 끝까지 쓰면 → 🍎 사과 2개 + ⭐ 3개</li>
            <li>🔤 영어 단어 앱에서 별을 모으면 → 💎 보석 + 🍪 쿠키 + ⭐ + 💞 우정</li>
            <li>
              ⏰ 돌봄은 하루 {DAILY.activities}번까지 · 우정은 하루 {DAILY.xpBuddy}까지 자라요
            </li>
          </ul>
        </div>
      </div>
      {layer}
    </div>
  );
}
