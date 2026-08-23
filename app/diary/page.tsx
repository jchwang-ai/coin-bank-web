'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import EmojiBurst from '@/components/EmojiBurst';
import DiaryCalendar, { DiaryMark } from '@/components/DiaryCalendar';
import DiaryBuddy from '@/components/DiaryBuddy';
import BuddyPickerSheet from '@/components/BuddyPickerSheet';
import { useUnlockAudio } from '@/hooks/useUnlockAudio';
import { playChime, playPop } from '@/lib/sound';
import { formatCardDate, isToday, moodOf, todayKey } from '@/lib/diary';
import { getDiaryOverview, setDiaryPet, DiaryListItem } from './actions';

export default function DiaryPage() {
  const router = useRouter();
  useUnlockAudio();

  const [recent, setRecent] = useState<DiaryListItem[]>([]);
  const [marks, setMarks] = useState<Record<string, DiaryMark>>({});
  const [monthCount, setMonthCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [toast, setToast] = useState('');
  const [burst, setBurst] = useState(0);
  const [petAnimal, setPetAnimal] = useState<string | null>(null);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDiaryOverview()
      .then((data) => {
        if (cancelled) return;
        setRecent(data.recent);
        setMarks(data.marks);
        setMonthCount(data.monthCount);
        setStreak(data.streak);
        setPetAnimal(data.petAnimal);
        setTotalCompleted(data.totalCompleted);
        // Small welcome-back celebration when today is already done.
        const today = todayKey();
        if (data.recent.some((d) => d.diary_date === today && d.status === 'completed')) {
          setBurst((b) => b + 1);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setToast('일기를 불러오지 못했어요');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayKey();
  const todayDiary = recent.find((d) => d.diary_date === today);

  const todayLabel = !todayDiary
    ? '오늘 일기 쓰기'
    : todayDiary.status === 'completed'
      ? '오늘 일기 보기'
      : '오늘 일기 이어쓰기';

  const openDate = (dateKey: string) => {
    playPop();
    router.push(`/diary/${dateKey}`);
  };

  const handlePickBuddy = async (animalId: string) => {
    await setDiaryPet(animalId);
    setPetAnimal(animalId);
    setPickerOpen(false);
    playChime();
    setBurst((b) => b + 1);
    setToast('새 친구가 생겼어요! 🌱');
  };

  if (isLoading) {
    return <div className="pt-24 text-center text-[#8e8e93]">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto w-full max-w-lg px-5 pt-6 safe-top">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[24px] font-bold leading-tight text-[#1c1c1e]">튼튼일기 🌱</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">오늘 있었던 일을 기록해보세요.</p>
          </div>
          <button
            onClick={() => router.push('/child')}
            className="shrink-0 rounded-full bg-black/5 px-3 py-1.5 text-[13px] font-medium text-[#8e8e93] transition-colors active:bg-black/10"
          >
            돌아가기
          </button>
        </div>

        {/* Growing buddy — the main motivation hook */}
        <DiaryBuddy
          animalId={petAnimal}
          completedCount={totalCompleted}
          onPick={() => {
            playPop();
            setPickerOpen(true);
          }}
        />

        {/* Streak + this month */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-medium text-[#8e8e93]">연속 기록</p>
            <p className="mt-0.5 text-[19px] font-bold text-[#1c1c1e]">
              {streak > 0 ? `🔥 ${streak}일 연속!` : '🌱 시작해봐요'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-medium text-[#8e8e93]">이번 달</p>
            <p className="mt-0.5 text-[19px] font-bold text-[#1c1c1e]">{monthCount}일 기록 🌱</p>
          </div>
        </div>

        {/* Today's diary — the main call to action */}
        <div className="relative mb-4">
          <button
            onClick={() => openDate(today)}
            className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 p-6 text-left shadow-lg shadow-teal-500/20 transition-transform active:scale-[0.98]"
          >
            <div className="absolute -right-6 -top-8 text-8xl opacity-20">📔</div>
            <p className="relative text-[13px] font-medium text-white/80">{formatCardDate(today)}</p>
            <p className="relative mt-1 text-[26px] font-bold leading-tight text-white">{todayLabel}</p>
            <p className="relative mt-1 text-[12px] font-medium text-white/70">
              {todayDiary?.status === 'completed' ? '오늘 기록 완료! 잘했어요 🎉' : '눌러서 시작하기 →'}
            </p>
          </button>
          <EmojiBurst trigger={burst} emojis={['🌱', '✨', '📔']} />
        </div>

        {/* View toggle */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-black/[0.04] p-1">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                playPop();
              }}
              className={`rounded-xl py-2.5 text-[14px] font-bold transition-all ${
                view === v ? 'bg-white text-[#1c1c1e] shadow-sm' : 'text-[#8e8e93]'
              }`}
            >
              {v === 'list' ? '📋 목록' : '📅 달력'}
            </button>
          ))}
        </div>

        {view === 'calendar' ? (
          <DiaryCalendar marks={marks} onSelectDate={openDate} />
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-white py-14 text-center shadow-sm">
            <p className="text-4xl">🌱</p>
            <p className="mt-3 text-[15px] font-semibold text-[#1c1c1e]">아직 일기가 없어요</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">오늘 첫 일기를 써볼까요?</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((d, idx) => {
              const mood = moodOf(d.mood);
              const preview = (d.content || '').trim().replace(/\s+/g, ' ');
              return (
                <button
                  key={d.id}
                  onClick={() => openDate(d.diary_date)}
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  className="animate-sprout flex w-full gap-3 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#8e8e93]">
                      <span>{formatCardDate(d.diary_date)}</span>
                      {mood && <span className="text-[15px] leading-none">{mood.emoji}</span>}
                      {isToday(d.diary_date) && (
                        <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-600">
                          오늘
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-[16px] font-bold text-[#1c1c1e]">
                      {d.title?.trim() || '(제목 없음)'}
                    </p>
                    {preview && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#8e8e93]">{preview}</p>
                    )}
                    <p className="mt-1.5 text-[11px] font-semibold">
                      {d.status === 'completed' ? (
                        <span className="text-emerald-600">✅ 완성</span>
                      ) : (
                        <span className="text-amber-600">✏️ 쓰는 중</span>
                      )}
                      {d.image_count > 0 && (
                        <span className="ml-1.5 text-[#8e8e93]">📷 {d.image_count}</span>
                      )}
                    </p>
                  </div>

                  {d.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.thumbnail}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl border border-black/5 object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pickerOpen && (
        <BuddyPickerSheet
          current={petAnimal}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickBuddy}
        />
      )}

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
