'use server';

import { sql } from '@vercel/postgres';
import { getEarnedGems } from '@/lib/vocabGems';
import {
  DECAY_PER_HOUR,
  DIARIES_PER_CAKE,
  FOODS,
  FULL_LIMIT,
  PetState,
  clampStat,
  decayStat,
  earnedFood,
  foodById,
  friendshipLevel,
} from '@/lib/petCare';

/**
 * Tables are also created by /api/init-db, but that only runs when someone
 * calls it after a deploy — so make sure here too, once per server instance.
 */
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS pet_care (
      user_id UUID PRIMARY KEY REFERENCES child_account(id) ON DELETE CASCADE,
      fullness REAL NOT NULL DEFAULT 60,
      happiness REAL NOT NULL DEFAULT 70,
      xp INTEGER NOT NULL DEFAULT 0,
      base_diaries INTEGER NOT NULL DEFAULT 0,
      base_stars INTEGER,
      last_play_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pet_feedings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES child_account(id) ON DELETE CASCADE,
      food_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  tablesReady = true;
}

async function requireChildId(): Promise<string> {
  const result = await sql`SELECT id FROM child_account LIMIT 1`;
  if (!result.rows.length) throw new Error('아이 계정을 찾을 수 없어요');
  return (result.rows[0] as any).id as string;
}

interface Loaded {
  userId: string;
  state: PetState;
}

/**
 * Reads everything and applies time decay in memory. The decayed values are
 * only written back when something changes (feeding/playing), together with
 * a fresh updated_at, so reads never compound the decay.
 */
async function load(): Promise<Loaded> {
  await ensureTables();
  const userId = await requireChildId();

  const [diaries, gems] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'`,
    getEarnedGems(),
  ]);
  const diaryCount = Number((diaries.rows[0] as any).count) || 0;
  const stars = gems.connected ? gems.stars : null;

  // First visit: snapshot today's totals so only new effort earns food.
  await sql`
    INSERT INTO pet_care (user_id, base_diaries, base_stars)
    VALUES (${userId}, ${diaryCount}, ${stars})
    ON CONFLICT (user_id) DO NOTHING
  `;
  // The vocab DB may have been unreachable at snapshot time — fill it in late
  // rather than counting the whole study history as new.
  if (stars !== null) {
    await sql`UPDATE pet_care SET base_stars = ${stars} WHERE user_id = ${userId} AND base_stars IS NULL`;
  }

  const [careRes, fedRes] = await Promise.all([
    sql`SELECT fullness, happiness, xp, base_diaries, base_stars, updated_at FROM pet_care WHERE user_id = ${userId}`,
    sql`SELECT food_id, COUNT(*) AS count FROM pet_feedings WHERE user_id = ${userId} GROUP BY food_id`,
  ]);
  const care = careRes.rows[0] as any;
  const since = new Date(care.updated_at);

  const diariesSince = diaryCount - Number(care.base_diaries);
  const starsSince = stars !== null && care.base_stars !== null ? stars - Number(care.base_stars) : 0;
  const earned = earnedFood(diariesSince, starsSince);
  const fed = new Map((fedRes.rows as any[]).map((r) => [r.food_id as string, Number(r.count) || 0]));

  return {
    userId,
    state: {
      fullness: decayStat(Number(care.fullness), DECAY_PER_HOUR.fullness, since),
      happiness: decayStat(Number(care.happiness), DECAY_PER_HOUR.happiness, since),
      xp: Number(care.xp) || 0,
      foods: FOODS.map((f) => ({
        id: f.id,
        earned: earned[f.id],
        left: Math.max(0, earned[f.id] - (fed.get(f.id) || 0)),
      })),
      nextCakeIn: DIARIES_PER_CAKE - (Math.max(0, diariesSince) % DIARIES_PER_CAKE),
      vocabConnected: gems.connected,
    },
  };
}

export async function getPetState(): Promise<PetState> {
  try {
    return (await load()).state;
  } catch (error) {
    console.error('Error loading pet state:', error);
    throw error;
  }
}

/** Feeds one food. Returns the new state and the level reached, if it went up. */
export async function feedPet(foodId: string) {
  try {
    const food = foodById(foodId);
    if (!food) throw new Error('그런 먹이는 없어요');

    const { userId, state } = await load();
    const stock = state.foods.find((f) => f.id === food.id);
    if (!stock || stock.left <= 0) throw new Error(`${food.name}가 없어요. ${food.howTo}`);
    if (state.fullness >= FULL_LIMIT) throw new Error('배불러서 더 못 먹어요! 조금 있다 줘요 😋');

    const fullness = clampStat(state.fullness + food.fullness);
    const happiness = clampStat(state.happiness + food.happiness);
    const xp = state.xp + food.xp;

    await sql`
      UPDATE pet_care
      SET fullness = ${fullness}, happiness = ${happiness}, xp = ${xp}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;
    await sql`INSERT INTO pet_feedings (user_id, food_id) VALUES (${userId}, ${food.id})`;

    const before = friendshipLevel(state.xp).level;
    const after = friendshipLevel(xp).level;

    return {
      state: {
        ...state,
        fullness,
        happiness,
        xp,
        foods: state.foods.map((f) => (f.id === food.id ? { ...f, left: f.left - 1 } : f)),
      } as PetState,
      levelUpTo: after > before ? after : null,
    };
  } catch (error) {
    console.error('Error feeding pet:', error);
    throw error;
  }
}

/**
 * Playing (ball, party) cheers the buddy up. Throttled so it can't replace
 * feeding — and it gives no XP, so growing still needs diaries and study.
 */
export async function playWithPet() {
  try {
    const { userId, state } = await load();
    const r = await sql`
      SELECT last_play_at FROM pet_care WHERE user_id = ${userId}
    `;
    const last = (r.rows[0] as any)?.last_play_at;
    if (last && Date.now() - new Date(last).getTime() < 20 * 60_000) {
      return { state, cheered: false };
    }

    const happiness = clampStat(state.happiness + 10);
    await sql`
      UPDATE pet_care
      SET fullness = ${state.fullness}, happiness = ${happiness},
          last_play_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;
    return { state: { ...state, happiness } as PetState, cheered: true };
  } catch (error) {
    console.error('Error playing with pet:', error);
    throw error;
  }
}
