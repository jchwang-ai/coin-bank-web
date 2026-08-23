// Shared 튼튼일기 constants and helpers.
// Pure data + date math only — no DB access, so this is safe to import from
// both client components and server actions.

export type DiaryStatus = 'draft' | 'completed';

export interface Mood {
  id: string;
  emoji: string;
  label: string;
  /** Tailwind classes for the selected state. */
  activeClass: string;
}

export const MOODS: Mood[] = [
  { id: 'excited', emoji: '😆', label: '신나요', activeClass: 'bg-amber-100 ring-amber-400' },
  { id: 'happy', emoji: '😊', label: '좋아요', activeClass: 'bg-pink-100 ring-pink-400' },
  { id: 'soso', emoji: '😐', label: '그냥 그래요', activeClass: 'bg-slate-100 ring-slate-400' },
  { id: 'sad', emoji: '😢', label: '속상해요', activeClass: 'bg-sky-100 ring-sky-400' },
  { id: 'angry', emoji: '😡', label: '화나요', activeClass: 'bg-red-100 ring-red-400' },
  { id: 'tired', emoji: '😴', label: '피곤해요', activeClass: 'bg-violet-100 ring-violet-400' },
];

export function moodOf(id: string | null | undefined): Mood | undefined {
  if (!id) return undefined;
  return MOODS.find((m) => m.id === id);
}

/** Writing prompts for when the child doesn't know what to write about. */
export const DIARY_PROMPTS = [
  '오늘 가장 재미있었던 일은 뭐였어?',
  '오늘 가장 기억에 남는 사람은 누구야?',
  '오늘 새롭게 알게 된 것은 뭐야?',
  '오늘 다시 하고 싶은 일이 있어?',
  '오늘 속상했던 일이 있었어?',
  '오늘 제일 맛있었던 음식은?',
  '내일 꼭 하고 싶은 일은?',
  '오늘 내가 잘했다고 생각하는 일은?',
  '오늘 고마웠던 사람은 누구야?',
  '오늘 웃었던 순간은 언제야?',
];

export const MAX_DIARY_IMAGES = 3;
export const MAX_TITLE_LENGTH = 50;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' in the viewer's local time (never UTC-shifted). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parses 'YYYY-MM-DD' as a *local* date (new Date('...') would treat it as UTC). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = parseDateKey(key);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === key;
}

/** '2026년 8월 23일 일요일' */
export function formatLongDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

/** '8월 23일 일요일' */
export function formatCardDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export function isToday(key: string): boolean {
  return key === todayKey();
}

export function isFuture(key: string): boolean {
  return key > todayKey();
}

/**
 * Consecutive-day streak of *completed* diaries, counted by diary_date
 * (not created_at) and de-duplicated per day. The streak is still "alive"
 * if the most recent entry is today or yesterday — that way it doesn't
 * reset to 0 just because today's diary isn't written yet.
 */
export function calculateStreak(completedDateKeys: string[]): number {
  if (completedDateKeys.length === 0) return 0;

  const days = new Set(completedDateKeys);
  const today = todayKey();
  const yesterdayDate = parseDateKey(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateKey(yesterdayDate);

  let cursor: Date;
  if (days.has(today)) cursor = parseDateKey(today);
  else if (days.has(yesterday)) cursor = parseDateKey(yesterday);
  else return 0;

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
