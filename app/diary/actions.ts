'use server';

import { sql } from '@vercel/postgres';
import { MAX_DIARY_IMAGES, MAX_TITLE_LENGTH, calculateStreak, isValidDateKey } from '@/lib/diary';
import { BUDDY_ANIMALS, levelFor } from '@/lib/diaryPet';

/**
 * Resolves the diary owner on the server — never from a client-supplied id.
 * Every query below is scoped by this value, so pasting someone else's diary
 * id into the URL can't read or mutate it. That scoping (not a session gate)
 * is what enforces "only your own diaries".
 *
 * Deliberately resolved the same way every other action in this app resolves
 * the child (`SELECT ... FROM child_account LIMIT 1`), rather than gating on
 * the login cookie. The login cookie expires after 24h and nothing else here
 * checks it — /child keeps working without it — so gating only the diary made
 * it break for a child who was otherwise using the app normally.
 */
async function requireChildId(): Promise<string> {
  const result = await sql`SELECT id FROM child_account LIMIT 1`;
  if (!result.rows.length) {
    throw new Error('아이 계정을 찾을 수 없어요');
  }
  return (result.rows[0] as any).id as string;
}

export interface DiaryListItem {
  id: string;
  diary_date: string;
  mood: string | null;
  title: string | null;
  content: string | null;
  status: string;
  image_count: number;
  thumbnail: string | null;
}

/** Main screen payload: recent diaries, this month's count, streak, calendar marks. */
export async function getDiaryOverview() {
  try {
    const userId = await requireChildId();

    const [recent, completedDates, monthCount, pet, totalCompleted] = await Promise.all([
      sql`
        SELECT d.id,
               to_char(d.diary_date, 'YYYY-MM-DD') AS diary_date,
               d.mood, d.title, d.content, d.status,
               (SELECT COUNT(*) FROM diary_images i WHERE i.diary_id = d.id) AS image_count,
               (SELECT i.image_data FROM diary_images i WHERE i.diary_id = d.id
                 ORDER BY i.sort_order, i.created_at LIMIT 1) AS thumbnail
        FROM diaries d
        WHERE d.user_id = ${userId}
        ORDER BY d.diary_date DESC
        LIMIT 30
      `,
      sql`
        SELECT to_char(diary_date, 'YYYY-MM-DD') AS diary_date
        FROM diaries
        WHERE user_id = ${userId} AND status = 'completed'
        ORDER BY diary_date DESC
        LIMIT 400
      `,
      sql`
        SELECT COUNT(*) AS count
        FROM diaries
        WHERE user_id = ${userId}
          AND status = 'completed'
          AND date_trunc('month', diary_date) = date_trunc('month', CURRENT_DATE)
      `,
      sql`SELECT animal FROM diary_pets WHERE user_id = ${userId} LIMIT 1`,
      sql`SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'`,
    ]);

    const recentRows = recent.rows as any[];

    return {
      recent: recentRows.map((r) => ({
        ...r,
        image_count: Number(r.image_count) || 0,
      })) as DiaryListItem[],
      // Calendar marks: every diary (draft or completed) with its mood.
      marks: recentRows.reduce<Record<string, { mood: string | null; status: string }>>((acc, r) => {
        acc[r.diary_date] = { mood: r.mood, status: r.status };
        return acc;
      }, {}),
      monthCount: Number((monthCount.rows[0] as any).count) || 0,
      streak: calculateStreak((completedDates.rows as any[]).map((r) => r.diary_date)),
      petAnimal: pet.rows.length ? ((pet.rows[0] as any).animal as string) : null,
      totalCompleted: Number((totalCompleted.rows[0] as any).count) || 0,
    };
  } catch (error) {
    console.error('Error fetching diary overview:', error);
    throw error;
  }
}

/** One day's diary (plus its photos), or null if nothing written yet. */
export async function getDiaryByDate(dateKey: string) {
  try {
    if (!isValidDateKey(dateKey)) {
      throw new Error('날짜가 올바르지 않아요');
    }
    const userId = await requireChildId();

    const diary = await sql`
      SELECT id,
             to_char(diary_date, 'YYYY-MM-DD') AS diary_date,
             mood, title, content, status, created_at, updated_at
      FROM diaries
      WHERE user_id = ${userId} AND diary_date = ${dateKey}::date
      LIMIT 1
    `;
    if (!diary.rows.length) return null;

    const row = diary.rows[0] as any;
    const images = await sql`
      SELECT id, image_data, sort_order
      FROM diary_images
      WHERE diary_id = ${row.id}
      ORDER BY sort_order, created_at
    `;

    return { ...row, images: images.rows };
  } catch (error) {
    console.error('Error fetching diary by date:', error);
    throw error;
  }
}

/**
 * Upsert one day's diary. Because of UNIQUE(user_id, diary_date) a repeat save
 * for the same day updates the existing row instead of piling up new ones.
 * Images are replaced wholesale with whatever the client currently shows.
 */
export async function saveDiary(input: {
  diaryDate: string;
  mood: string | null;
  title: string;
  content: string;
  status: 'draft' | 'completed';
  images?: string[];
}) {
  try {
    const { diaryDate, mood, title, content, status } = input;

    if (!isValidDateKey(diaryDate)) {
      throw new Error('날짜가 올바르지 않아요');
    }
    if (status !== 'draft' && status !== 'completed') {
      throw new Error('저장 상태가 올바르지 않아요');
    }
    if (status === 'completed') {
      if (!mood) throw new Error('오늘의 기분을 골라주세요');
      if (!title.trim()) throw new Error('오늘의 제목을 적어주세요');
      if (!content.trim()) throw new Error('일기 내용을 적어주세요');
    }

    const userId = await requireChildId();
    const images = (input.images || []).slice(0, MAX_DIARY_IMAGES);

    // Buddy growth is derived from the completed count, so to tell whether
    // *this* save levelled the buddy up we compare the count before/after.
    const before = await sql`
      SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'
    `;
    const countBefore = Number((before.rows[0] as any).count) || 0;

    const saved = await sql`
      INSERT INTO diaries (user_id, diary_date, mood, title, content, status)
      VALUES (
        ${userId}, ${diaryDate}::date, ${mood},
        ${title.trim().slice(0, MAX_TITLE_LENGTH)}, ${content}, ${status}
      )
      ON CONFLICT (user_id, diary_date) DO UPDATE
        SET mood = EXCLUDED.mood,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    const diaryId = (saved.rows[0] as any).id as string;

    // Replace the photo set: simplest correct behaviour for "these are the
    // photos on my diary right now", and keeps ordering in sync with the UI.
    await sql`DELETE FROM diary_images WHERE diary_id = ${diaryId}`;
    for (let i = 0; i < images.length; i++) {
      await sql`
        INSERT INTO diary_images (diary_id, image_data, sort_order)
        VALUES (${diaryId}, ${images[i]}, ${i})
      `;
    }

    const after = await sql`
      SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'
    `;
    const countAfter = Number((after.rows[0] as any).count) || 0;

    return {
      success: true,
      id: diaryId,
      status,
      totalCompleted: countAfter,
      leveledUp: levelFor(countAfter) > levelFor(countBefore),
      // A milestone sticker newly unlocked by this save, if any.
      newSticker: countAfter > countBefore ? countAfter : null,
    };
  } catch (error) {
    console.error('Error saving diary:', error);
    throw error;
  }
}

/** Picks (or changes) the diary buddy animal. */
export async function setDiaryPet(animal: string) {
  try {
    if (!BUDDY_ANIMALS.some((a) => a.id === animal)) {
      throw new Error('그런 친구는 없어요');
    }
    const userId = await requireChildId();

    await sql`
      INSERT INTO diary_pets (user_id, animal)
      VALUES (${userId}, ${animal})
      ON CONFLICT (user_id) DO UPDATE
        SET animal = EXCLUDED.animal, updated_at = CURRENT_TIMESTAMP
    `;

    return { success: true };
  } catch (error) {
    console.error('Error setting diary pet:', error);
    throw error;
  }
}

/** Deletes one diary (and its photos, via ON DELETE CASCADE). */
export async function deleteDiary(id: string) {
  try {
    const userId = await requireChildId();

    const result = await sql`
      DELETE FROM diaries WHERE id = ${id} AND user_id = ${userId}
    `;
    if (result.rowCount === 0) {
      throw new Error('일기를 찾을 수 없어요');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting diary:', error);
    throw error;
  }
}
