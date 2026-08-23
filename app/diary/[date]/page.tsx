'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from '@/components/Toast';
import MoodPicker from '@/components/MoodPicker';
import DiaryPromptCard from '@/components/DiaryPromptCard';
import DiaryImagePicker from '@/components/DiaryImagePicker';
import { useUnlockAudio } from '@/hooks/useUnlockAudio';
import { playSaveBlip, playSoftDown, playSparkle } from '@/lib/sound';
import {
  MAX_TITLE_LENGTH,
  formatLongDate,
  isFuture,
  isValidDateKey,
  moodOf,
} from '@/lib/diary';
import { deleteDiary, getDiaryByDate, saveDiary } from '../actions';

interface DraftCache {
  mood: string | null;
  title: string;
  content: string;
  savedAt: number;
}

export default function DiaryDatePage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const dateKey = typeof params.date === 'string' ? params.date : '';
  useUnlockAudio();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');

  const [diaryId, setDiaryId] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'completed'>('draft');
  const [mood, setMood] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [toast, setToast] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const hydrated = useRef(false);

  const localKey = `diary-draft:${dateKey}`;
  const valid = isValidDateKey(dateKey) && !isFuture(dateKey);

  // ── Load existing diary, then layer any newer local draft on top ─────────
  useEffect(() => {
    if (!valid) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    getDiaryByDate(dateKey)
      .then((row) => {
        if (cancelled) return;

        if (row) {
          setDiaryId(row.id);
          setStatus(row.status);
          setMood(row.mood);
          setTitle(row.title || '');
          setContent(row.content || '');
          setImages((row.images as any[]).map((i) => i.image_data));
          // A finished diary opens in read mode; a draft keeps writing.
          setMode(row.status === 'completed' ? 'view' : 'edit');
        }

        // Unsaved work rescued from a back-navigation / refresh.
        try {
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const cached: DraftCache = JSON.parse(raw);
            const serverUpdated = row ? new Date(row.updated_at).getTime() : 0;
            if (cached.savedAt > serverUpdated) {
              setMood(cached.mood);
              setTitle(cached.title);
              setContent(cached.content);
              setMode('edit');
              setToast('쓰던 내용을 불러왔어요 ✏️');
            }
          }
        } catch {
          /* ignore malformed cache */
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setToast('일기를 불러오지 못했어요');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          hydrated.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // ── Autosave to localStorage so a back-press never loses writing ─────────
  useEffect(() => {
    if (!hydrated.current || mode !== 'edit') return;
    if (!mood && !title.trim() && !content.trim()) return;

    const t = setTimeout(() => {
      try {
        const cache: DraftCache = { mood, title, content, savedAt: Date.now() };
        localStorage.setItem(localKey, JSON.stringify(cache));
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, title, content, mode]);

  const clearLocalDraft = useCallback(() => {
    try {
      localStorage.removeItem(localKey);
    } catch {
      /* ignore */
    }
  }, [localKey]);

  const handleSave = async (nextStatus: 'draft' | 'completed') => {
    try {
      setIsSaving(true);
      const result = await saveDiary({
        diaryDate: dateKey,
        mood,
        title,
        content,
        status: nextStatus,
        images,
      });

      setDiaryId(result.id);
      setStatus(nextStatus);
      clearLocalDraft();

      if (nextStatus === 'completed') {
        playSparkle();
        setCelebrate(true);
        setMode('view');
        setTimeout(() => {
          setCelebrate(false);
          router.push('/diary');
        }, 1600);
      } else {
        playSaveBlip();
        setToast('일기를 저장했어요! 🌱');
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : '저장하지 못했어요');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!diaryId) return;
    if (!window.confirm('정말 이 일기를 삭제할까요?')) return;
    try {
      setIsSaving(true);
      await deleteDiary(diaryId);
      clearLocalDraft();
      playSoftDown();
      router.push('/diary');
    } catch (error) {
      setToast(error instanceof Error ? error.message : '삭제하지 못했어요');
      console.error(error);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="pt-24 text-center text-[#8e8e93]">불러오는 중...</div>;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[720px] px-5 pt-24 text-center">
        <p className="text-4xl">🤔</p>
        <p className="mt-3 text-[16px] font-semibold text-[#1c1c1e]">볼 수 없는 날짜예요</p>
        <p className="mt-1 text-[13px] text-[#8e8e93]">오늘이나 지난 날짜만 쓸 수 있어요.</p>
        <button
          onClick={() => router.push('/diary')}
          className="mt-5 rounded-xl bg-[#1c1c1e] px-5 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          튼튼일기로 돌아가기
        </button>
      </div>
    );
  }

  const selectedMood = moodOf(mood);
  const charCount = content.length;

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto w-full max-w-[720px] px-5 pt-6 safe-top">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#8e8e93]">튼튼일기 🌱</p>
            <p className="text-[20px] font-bold leading-tight text-[#1c1c1e]">{formatLongDate(dateKey)}</p>
          </div>
          <button
            onClick={() => router.push('/diary')}
            className="shrink-0 rounded-full bg-black/5 px-3 py-1.5 text-[13px] font-medium text-[#8e8e93] transition-colors active:bg-black/10"
          >
            닫기
          </button>
        </div>

        {mode === 'view' ? (
          /* ── Read mode ─────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              {selectedMood && (
                <p className="mb-2 flex items-center gap-2">
                  <span className="text-[30px] leading-none">{selectedMood.emoji}</span>
                  <span className="text-[14px] font-semibold text-[#8e8e93]">{selectedMood.label}</span>
                </p>
              )}
              <p className="text-[20px] font-bold leading-snug text-[#1c1c1e]">
                {title.trim() || '(제목 없음)'}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-[16px] leading-relaxed text-[#1c1c1e]">
                {content.trim() || '내용이 없어요'}
              </p>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`일기 사진 ${i + 1}`}
                      className="aspect-square w-full rounded-xl border border-black/5 object-cover"
                    />
                  ))}
                </div>
              )}

              <p className="mt-4 text-[12px] font-semibold text-emerald-600">
                {status === 'completed' ? '✅ 완성한 일기예요' : '✏️ 아직 쓰는 중이에요'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('edit')}
                className="rounded-xl bg-[#1c1c1e] py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                ✏️ 수정하기
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded-xl bg-red-50 py-3.5 text-[15px] font-bold text-red-500 transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          /* ── Write / edit mode ─────────────────────────────────────── */
          <div className="space-y-5">
            <section>
              <p className="mb-2.5 px-1 text-[15px] font-bold text-[#1c1c1e]">오늘의 기분</p>
              <MoodPicker value={mood} onChange={setMood} />
            </section>

            <section>
              <p className="mb-2 px-1 text-[15px] font-bold text-[#1c1c1e]">오늘의 제목</p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder="오늘 하루를 한마디로 표현해보세요"
                className="w-full rounded-2xl bg-white px-4 py-3.5 text-[16px] shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <p className="mt-1 pr-1 text-right text-[11px] text-[#8e8e93]">
                {title.length}/{MAX_TITLE_LENGTH}자
              </p>
            </section>

            <section>
              <p className="mb-2 px-1 text-[15px] font-bold text-[#1c1c1e]">일기 내용</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘 어떤 일이 있었나요? 기억에 남는 일을 자유롭게 적어보세요."
                className="min-h-[260px] w-full resize-y rounded-2xl bg-white px-4 py-3.5 text-[17px] leading-relaxed shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-teal-300 sm:min-h-[300px]"
              />
              <p className="mt-1 pr-1 text-right text-[11px] text-[#8e8e93]">{charCount}자</p>
            </section>

            <section>
              <p className="mb-2 px-1 text-[15px] font-bold text-[#1c1c1e]">사진</p>
              <DiaryImagePicker images={images} onChange={setImages} />
            </section>

            <DiaryPromptCard />
          </div>
        )}
      </div>

      {/* Sticky save bar (write mode only) */}
      {mode === 'edit' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/85 backdrop-blur-xl safe-bottom">
          <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-3 px-5 py-3">
            <button
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              className="rounded-xl bg-black/5 py-3.5 text-[15px] font-bold text-[#8e8e93] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              임시 저장
            </button>
            <button
              onClick={() => handleSave('completed')}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '오늘 일기 완성하기'}
            </button>
          </div>
        </div>
      )}

      {/* Completion celebration */}
      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="animate-stamp-in rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <p className="text-6xl">🌱</p>
            <p className="mt-3 text-[19px] font-bold text-[#1c1c1e]">일기를 저장했어요!</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">오늘도 잘했어요 ✨</p>
          </div>
        </div>
      )}

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
