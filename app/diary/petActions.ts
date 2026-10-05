'use server';

import { sql } from '@vercel/postgres';
import { getEarnedGems } from '@/lib/vocabGems';
import { ensurePetTables, getSpentGems } from '@/lib/petDb';
import {
  CARE,
  CareKind,
  DECAY_PER_HOUR,
  DIARIES_PER_CAKE,
  FAVORITE_FOOD,
  FOODS,
  FULL_LIMIT,
  FUR_COLORS,
  FoodId,
  PetState,
  StatId,
  WALK_FINDS_PER_DAY,
  WALK_FIND_POOL,
  clampStat,
  decayStat,
  earnedFood,
  foodById,
  friendshipLevel,
} from '@/lib/petCare';

async function requireChildId(): Promise<string> {
  const result = await sql`SELECT id FROM child_account LIMIT 1`;
  if (!result.rows.length) throw new Error('아이 계정을 찾을 수 없어요');
  return (result.rows[0] as { id: string }).id;
}

/** Midnight in Korea, as a Date — "today" for the daily checklist. */
function koreaDayStart(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3_600_000);
}

interface Loaded {
  userId: string;
  animal: string | null;
  state: PetState;
}

type Row = Record<string, unknown>;

/**
 * Reads everything and applies time decay in memory. Decayed values are only
 * written back when something changes, together with a fresh updated_at, so
 * reads never compound the decay.
 */
async function load(): Promise<Loaded> {
  await ensurePetTables();
  const userId = await requireChildId();

  const [diaries, gems, pet] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'`,
    getEarnedGems(),
    sql`SELECT animal FROM diary_pets WHERE user_id = ${userId} LIMIT 1`,
  ]);
  const diaryCount = Number((diaries.rows[0] as Row).count) || 0;
  const stars = gems.connected ? gems.stars : null;

  // First visit: snapshot today's totals so only new effort earns free food.
  await sql`
    INSERT INTO pet_care (user_id, base_diaries, base_stars)
    VALUES (${userId}, ${diaryCount}, ${stars})
    ON CONFLICT (user_id) DO NOTHING
  `;
  if (stars !== null) {
    await sql`UPDATE pet_care SET base_stars = ${stars} WHERE user_id = ${userId} AND base_stars IS NULL`;
  }

  const dayStart = koreaDayStart().toISOString();
  const [careRes, fedRes, stockRes, lastFed] = await Promise.all([
    sql`
      SELECT fullness, happiness, clean, energy, xp, fur_hue, groomed_until, last_care,
             base_diaries, base_stars, updated_at
      FROM pet_care WHERE user_id = ${userId}
    `,
    sql`SELECT food_id, COUNT(*) AS count FROM pet_feedings WHERE user_id = ${userId} GROUP BY food_id`,
    sql`SELECT food_id, COALESCE(SUM(qty), 0) AS qty FROM pet_food_stock WHERE user_id = ${userId} GROUP BY food_id`,
    sql`SELECT MAX(created_at) AS at FROM pet_feedings WHERE user_id = ${userId} AND created_at >= ${dayStart}`,
  ]);
  const care = careRes.rows[0] as Row;
  const since = new Date(care.updated_at as string);

  const diariesSince = diaryCount - Number(care.base_diaries);
  const starsSince = stars !== null && care.base_stars !== null ? stars - Number(care.base_stars) : 0;
  const earned = earnedFood(diariesSince, starsSince);
  const fed = new Map((fedRes.rows as Row[]).map((r) => [r.food_id as string, Number(r.count) || 0]));
  const stock = new Map((stockRes.rows as Row[]).map((r) => [r.food_id as string, Number(r.qty) || 0]));

  const rawLast = (care.last_care || {}) as Record<string, string>;
  const lastCare: PetState['lastCare'] = {};
  for (const k of Object.keys(CARE) as CareKind[]) {
    if (rawLast[k]) lastCare[k] = new Date(rawLast[k]).getTime();
  }
  const dayMs = new Date(dayStart).getTime();
  const doneToday = (k: CareKind) => (lastCare[k] ?? 0) >= dayMs;

  const decay = (stat: StatId) => decayStat(Number(care[stat]), DECAY_PER_HOUR[stat], since);

  return {
    userId,
    animal: pet.rows.length ? ((pet.rows[0] as Row).animal as string) : null,
    state: {
      fullness: decay('fullness'),
      happiness: decay('happiness'),
      clean: decay('clean'),
      energy: decay('energy'),
      xp: Number(care.xp) || 0,
      furHue: Number(care.fur_hue) || 0,
      groomedUntil: care.groomed_until ? new Date(care.groomed_until as string).getTime() : 0,
      lastCare,
      today: {
        fed: !!(lastFed.rows[0] as Row)?.at,
        bath: doneToday('bath'),
        brush: doneToday('brush'),
        walk: doneToday('walk'),
        sleep: doneToday('sleep'),
      },
      foods: FOODS.map((f) => ({
        id: f.id,
        left: Math.max(0, (earned[f.id] ?? 0) + (stock.get(f.id) || 0) - (fed.get(f.id) || 0)),
      })),
      nextCakeIn: DIARIES_PER_CAKE - (Math.max(0, diariesSince) % DIARIES_PER_CAKE),
      vocabConnected: gems.connected,
    },
  };
}

async function saveStats(userId: string, s: PetState, xp: number) {
  await sql`
    UPDATE pet_care
    SET fullness = ${s.fullness}, happiness = ${s.happiness}, clean = ${s.clean},
        energy = ${s.energy}, xp = ${xp}, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
  `;
}

function levelUp(beforeXp: number, afterXp: number) {
  const before = friendshipLevel(beforeXp).level;
  const after = friendshipLevel(afterXp).level;
  return after > before ? after : null;
}

export async function getPetState(): Promise<PetState> {
  try {
    return (await load()).state;
  } catch (error) {
    console.error('Error loading pet state:', error);
    throw error;
  }
}

/** Feeds one food. Favourite food gets extra happiness and XP. */
export async function feedPet(foodId: string) {
  try {
    const food = foodById(foodId);
    if (!food) throw new Error('그런 먹이는 없어요');

    const { userId, animal, state } = await load();
    const stock = state.foods.find((f) => f.id === food.id);
    if (!stock || stock.left <= 0) {
      throw new Error(food.howTo ? `${food.name}가 없어요. ${food.howTo}` : `${food.name}가 없어요. 먹이 가게에서 살 수 있어요`);
    }
    if (state.fullness >= FULL_LIMIT) throw new Error('배불러서 더 못 먹어요! 조금 있다 줘요 😋');

    const favorite = !!animal && FAVORITE_FOOD[animal] === food.id;
    const next: PetState = {
      ...state,
      fullness: clampStat(state.fullness + food.fullness),
      happiness: clampStat(state.happiness + food.happiness * (favorite ? 1.6 : 1)),
      foods: state.foods.map((f) => (f.id === food.id ? { ...f, left: f.left - 1 } : f)),
      today: { ...state.today, fed: true },
    };
    const xp = state.xp + food.xp + (favorite ? 2 : 0);

    await saveStats(userId, next, xp);
    await sql`INSERT INTO pet_feedings (user_id, food_id) VALUES (${userId}, ${food.id})`;

    return { state: { ...next, xp }, favorite, levelUpTo: levelUp(state.xp, xp) };
  } catch (error) {
    console.error('Error feeding pet:', error);
    throw error;
  }
}

/** Buys food at the 먹이 가게 with gems earned from English study. */
export async function buyFood(foodId: string, qty: number) {
  try {
    const food = foodById(foodId);
    if (!food) throw new Error('그런 먹이는 없어요');
    if (![1, 3, 5].includes(qty)) throw new Error('개수가 올바르지 않아요');

    const { userId, state } = await load();
    const [earned, spent] = await Promise.all([getEarnedGems(), getSpentGems(userId)]);
    if (!earned.connected) throw new Error('보석을 불러올 수 없어요. 잠시 후 다시 해주세요');

    const cost = food.price * qty;
    const left = earned.stars - spent;
    if (left < cost) throw new Error(`보석이 ${cost - left}개 더 필요해요 💎`);

    await sql`
      INSERT INTO pet_food_stock (user_id, food_id, qty, cost_paid, source)
      VALUES (${userId}, ${food.id}, ${qty}, ${cost}, 'shop')
    `;

    return {
      state: {
        ...state,
        foods: state.foods.map((f) => (f.id === food.id ? { ...f, left: f.left + qty } : f)),
      } as PetState,
      gemsLeft: left - cost,
    };
  } catch (error) {
    console.error('Error buying food:', error);
    throw error;
  }
}

/**
 * Finishes a care activity (bath, brushing, walk, sleep…). Stat changes
 * always apply — the child did the work — but XP and the daily checklist
 * only count once per cooldown, so repeating it can't farm levels.
 */
export async function doCare(kind: string) {
  try {
    const rule = CARE[kind as CareKind];
    if (!rule) throw new Error('알 수 없는 돌봄이에요');

    const { userId, state } = await load();
    if (rule.kind === 'walk' && state.energy < 15) throw new Error('너무 졸려서 산책을 못 가요… 먼저 재워주세요 🌙');

    const now = Date.now();
    const counts = now - (state.lastCare[rule.kind] ?? 0) >= rule.cooldownMin * 60_000;

    const next: PetState = { ...state, lastCare: { ...state.lastCare } };
    for (const [stat, delta] of Object.entries(rule.effect) as [StatId, number][]) {
      // 'energy: 100' / 'clean: 100' mean "fill up", everything else is a delta.
      next[stat] = delta === 100 ? 100 : clampStat(next[stat] + delta);
    }
    const xp = state.xp + (counts ? rule.xp : 0);

    let found: FoodId | null = null;
    if (counts && rule.kind === 'walk') {
      const r = await sql`
        SELECT COUNT(*) AS count FROM pet_food_stock
        WHERE user_id = ${userId} AND source = 'walk' AND created_at >= ${koreaDayStart().toISOString()}
      `;
      if ((Number((r.rows[0] as Row).count) || 0) < WALK_FINDS_PER_DAY) {
        found = WALK_FIND_POOL[Math.floor(Math.random() * WALK_FIND_POOL.length)];
        await sql`
          INSERT INTO pet_food_stock (user_id, food_id, qty, cost_paid, source)
          VALUES (${userId}, ${found}, 1, 0, 'walk')
        `;
        next.foods = next.foods.map((f) => (f.id === found ? { ...f, left: f.left + 1 } : f));
      }
    }

    await saveStats(userId, next, xp);
    if (counts) {
      next.lastCare[rule.kind] = now;
      if (rule.kind !== 'teeth') next.today = { ...next.today, [rule.kind]: true };
      await sql`
        UPDATE pet_care
        SET last_care = last_care || ${JSON.stringify({ [rule.kind]: new Date(now).toISOString() })}::jsonb
        WHERE user_id = ${userId}
      `;
    }
    if (rule.kind === 'brush') {
      next.groomedUntil = now + 6 * 3_600_000;
      await sql`UPDATE pet_care SET groomed_until = ${new Date(next.groomedUntil).toISOString()} WHERE user_id = ${userId}`;
    }

    return {
      state: { ...next, xp } as PetState,
      xpGained: xp - state.xp,
      found,
      levelUpTo: levelUp(state.xp, xp),
    };
  } catch (error) {
    console.error('Error doing care:', error);
    throw error;
  }
}

/** Fur dye — free, purely for fun. */
export async function setFurHue(hue: number) {
  try {
    if (!FUR_COLORS.some((c) => c.hue === hue)) throw new Error('그런 색은 없어요');
    await ensurePetTables();
    const userId = await requireChildId();
    await sql`UPDATE pet_care SET fur_hue = ${hue} WHERE user_id = ${userId}`;
    return { success: true };
  } catch (error) {
    console.error('Error setting fur colour:', error);
    throw error;
  }
}

/**
 * Playing (ball, party) cheers the buddy up. Throttled and gives no XP, so
 * growing still needs diaries and study.
 */
export async function playWithPet() {
  try {
    const { userId, state } = await load();
    const r = await sql`SELECT last_play_at FROM pet_care WHERE user_id = ${userId}`;
    const last = (r.rows[0] as Row)?.last_play_at as string | null;
    if (last && Date.now() - new Date(last).getTime() < 20 * 60_000) {
      return { state, cheered: false };
    }
    const next = { ...state, happiness: clampStat(state.happiness + 10), energy: clampStat(state.energy - 8) };
    await saveStats(userId, next, state.xp);
    await sql`UPDATE pet_care SET last_play_at = CURRENT_TIMESTAMP WHERE user_id = ${userId}`;
    return { state: next, cheered: true };
  } catch (error) {
    console.error('Error playing with pet:', error);
    throw error;
  }
}
