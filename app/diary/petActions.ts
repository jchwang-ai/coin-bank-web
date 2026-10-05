'use server';

import { sql } from '@vercel/postgres';
import { getEarnedGems } from '@/lib/vocabGems';
import { ensurePetTables, getSpentGems, koreaDay } from '@/lib/petDb';
import { itemById } from '@/lib/characterShop';
import { QuizSubject, makeEnglish, makeMath, normalizeAnswer } from '@/lib/quiz';
import { EGG_BLOCK, cpBlock, limitBlock } from '@/lib/petBlocks';
import {
  Block,
  CARE,
  CP,
  CareKind,
  DAILY,
  DECAY_PER_HOUR,
  DIARIES_PER_CAKE,
  FAVORITE_FOOD,
  FOODS,
  FRIEND_ACTIONS,
  FULL_LIMIT,
  FUR_COLORS,
  FoodId,
  FriendAction,
  PetState,
  STARS_PER_XP,
  StatId,
  WALK_FINDS_PER_DAY,
  WALK_FIND_POOL,
  activityCost,
  clampStat,
  decayStat,
  earnedFood,
  foodById,
  friendLevelOf,
  friendshipLevel,
} from '@/lib/petCare';

// Expected "can't do that now" outcomes are RETURNED as { ok: false, block }
// (never thrown): thrown messages are hidden in production, and the child
// must always see *why* and *what to do*.
type Fail = { ok: false; block: Block };

async function requireChildId(): Promise<string> {
  const result = await sql`SELECT id FROM child_account LIMIT 1`;
  if (!result.rows.length) throw new Error('아이 계정을 찾을 수 없어요');
  return (result.rows[0] as { id: string }).id;
}

/** Midnight in Korea, as a Date. */
function koreaDayStart(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3_600_000);
}

type Row = Record<string, unknown>;

interface Loaded {
  userId: string;
  animal: string | null;
  isEgg: boolean;
  state: PetState;
}

// ── loading (with study-reward claims) ─────────────────────────────────

async function load(): Promise<Loaded> {
  await ensurePetTables();
  const userId = await requireChildId();
  const day = koreaDay();

  const [diaries, gems, pet] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM diaries WHERE user_id = ${userId} AND status = 'completed'`,
    getEarnedGems(),
    sql`SELECT animal FROM diary_pets WHERE user_id = ${userId} LIMIT 1`,
  ]);
  const diaryCount = Number((diaries.rows[0] as Row).count) || 0;
  const stars = gems.connected ? gems.stars : null;

  // First visit: snapshot today's totals so only new effort is rewarded.
  await sql`
    INSERT INTO pet_care (user_id, base_diaries, base_stars)
    VALUES (${userId}, ${diaryCount}, ${stars})
    ON CONFLICT (user_id) DO NOTHING
  `;
  if (stars !== null) {
    await sql`UPDATE pet_care SET base_stars = ${stars} WHERE user_id = ${userId} AND base_stars IS NULL`;
    await sql`UPDATE pet_care SET vocab_xp_stars = ${stars} WHERE user_id = ${userId} AND vocab_xp_stars IS NULL`;
    await sql`UPDATE pet_care SET vocab_cp_stars = ${stars} WHERE user_id = ${userId} AND vocab_cp_stars IS NULL`;
  }
  await sql`UPDATE pet_care SET diaries_claimed = ${diaryCount} WHERE user_id = ${userId} AND diaries_claimed IS NULL`;
  await sql`INSERT INTO pet_daily (user_id, day) VALUES (${userId}, ${day}) ON CONFLICT DO NOTHING`;

  const dayStart = koreaDayStart().toISOString();
  const [careRes, dailyRes, fedRes, stockRes, lastFed, friendRes] = await Promise.all([
    sql`
      SELECT fullness, happiness, clean, energy, xp, fur_hue, groomed_until, last_care, base_diaries, base_stars,
             updated_at, cp, quiz_level_en, quiz_level_math, vocab_xp_stars, vocab_cp_stars, diaries_claimed
      FROM pet_care WHERE user_id = ${userId}
    `,
    sql`SELECT activities, extensions, xp FROM pet_daily WHERE user_id = ${userId} AND day = ${day}`,
    sql`SELECT food_id, COUNT(*) AS count FROM pet_feedings WHERE user_id = ${userId} GROUP BY food_id`,
    sql`SELECT food_id, COALESCE(SUM(qty), 0) AS qty FROM pet_food_stock WHERE user_id = ${userId} GROUP BY food_id`,
    sql`SELECT MAX(created_at) AS at FROM pet_feedings WHERE user_id = ${userId} AND created_at >= ${dayStart}`,
    sql`SELECT item_id, xp, to_char(xp_day, 'YYYY-MM-DD') AS xp_day, xp_today FROM friend_care WHERE user_id = ${userId}`,
  ]);
  const care = careRes.rows[0] as Row;
  const dailyRow = dailyRes.rows[0] as Row;
  let cp = Number(care.cp) || 0;
  let xp = Number(care.xp) || 0;
  let dailyXp = Number(dailyRow.xp) || 0;

  // Study done elsewhere since last time → ⭐ and friendship XP.
  const claimedDiaries = Number(care.diaries_claimed) || 0;
  const diaryCp = Math.max(0, diaryCount - claimedDiaries) * CP.perDiary;
  let vocabCp = 0;
  let vocabXp = 0;
  let vocabCpStars = care.vocab_cp_stars === null ? null : Number(care.vocab_cp_stars);
  let vocabXpStars = care.vocab_xp_stars === null ? null : Number(care.vocab_xp_stars);
  if (stars !== null && vocabCpStars !== null && vocabXpStars !== null) {
    vocabCp = Math.max(0, Math.floor((stars - vocabCpStars) / CP.starsPerCp));
    vocabCpStars += vocabCp * CP.starsPerCp;
    // XP respects the daily growth cap; the rest waits for tomorrow.
    vocabXp = Math.max(0, Math.min(Math.floor((stars - vocabXpStars) / STARS_PER_XP), DAILY.xpBuddy - dailyXp));
    vocabXpStars += vocabXp * STARS_PER_XP;
  }
  const rewards = diaryCp || vocabCp || vocabXp ? { vocabXp, vocabCp, diaryCp } : null;
  if (rewards) {
    cp = Math.min(CP.max, cp + diaryCp + vocabCp);
    xp += vocabXp;
    dailyXp += vocabXp;
    await sql`
      UPDATE pet_care
      SET cp = ${cp}, xp = ${xp}, diaries_claimed = ${Math.max(claimedDiaries, diaryCount)},
          vocab_cp_stars = ${vocabCpStars}, vocab_xp_stars = ${vocabXpStars}
      WHERE user_id = ${userId}
    `;
    if (vocabXp) await sql`UPDATE pet_daily SET xp = xp + ${vocabXp} WHERE user_id = ${userId} AND day = ${day}`;
  }

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

  const activities = Number(dailyRow.activities) || 0;
  const extensions = Number(dailyRow.extensions) || 0;
  const friends: PetState['friends'] = {};
  for (const r of friendRes.rows as Row[]) {
    friends[r.item_id as string] = { xp: Number(r.xp) || 0, xpToday: r.xp_day === day ? Number(r.xp_today) || 0 : 0 };
  }

  return {
    userId,
    animal: pet.rows.length ? ((pet.rows[0] as Row).animal as string) : null,
    isEgg: diaryCount < 1,
    state: {
      fullness: decay('fullness'),
      happiness: decay('happiness'),
      clean: decay('clean'),
      energy: decay('energy'),
      xp,
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
      cp,
      daily: {
        activities,
        extensions,
        limit: DAILY.activities + extensions * DAILY.extendBy,
        xp: dailyXp,
        nextCost: activityCost(activities),
      },
      friends,
      quizLevel: { english: Number(care.quiz_level_en) || 1, math: Number(care.quiz_level_math) || 1 },
      rewards,
    },
  };
}

async function saveStats(userId: string, s: PetState) {
  await sql`
    UPDATE pet_care
    SET fullness = ${s.fullness}, happiness = ${s.happiness}, clean = ${s.clean},
        energy = ${s.energy}, xp = ${s.xp}, cp = ${s.cp}, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
  `;
}

/**
 * Books one activity for today: counts it, charges ⭐ and adds the buddy's
 * XP within the daily growth cap. Mutates `s` to match what was saved.
 */
async function bookActivity(userId: string, s: PetState, opts: { cost: number; xp: number; counts: boolean }) {
  const xpAdded = Math.max(0, Math.min(opts.xp, DAILY.xpBuddy - s.daily.xp));
  s.cp -= opts.cost;
  s.xp += xpAdded;
  s.daily = {
    ...s.daily,
    activities: s.daily.activities + (opts.counts ? 1 : 0),
    xp: s.daily.xp + xpAdded,
  };
  s.daily.nextCost = activityCost(s.daily.activities);
  await sql`
    UPDATE pet_daily
    SET activities = activities + ${opts.counts ? 1 : 0}, xp = xp + ${xpAdded}
    WHERE user_id = ${userId} AND day = ${koreaDay()}
  `;
  return { xpAdded, xpCapped: opts.xp > 0 && xpAdded < opts.xp };
}

function levelUp(beforeXp: number, afterXp: number) {
  const before = friendshipLevel(beforeXp).level;
  const after = friendshipLevel(afterXp).level;
  return after > before ? after : null;
}

// ── actions ────────────────────────────────────────────────────────────

export async function getPetState(): Promise<PetState> {
  return (await load()).state;
}

export async function feedPet(foodId: string) {
  const food = foodById(foodId);
  if (!food) return { ok: false, block: { code: 'other', emoji: '❓', title: '그런 먹이는 없어요', reason: '', howTo: [] } } as Fail;

  const { userId, animal, isEgg, state } = await load();
  if (isEgg) return { ok: false, block: EGG_BLOCK } as Fail;
  const stock = state.foods.find((f) => f.id === food.id);
  if (!stock || stock.left <= 0) {
    return {
      ok: false,
      block: {
        code: 'stock',
        emoji: food.emoji,
        title: `${food.name}가 없어요`,
        reason: '냉장고에 이 먹이가 남아있지 않아요.',
        howTo: [food.howTo ? `${food.howTo} 생겨요` : '먹이 가게에서 💎 보석으로 살 수 있어요', '💎 보석은 영어 단어를 공부하면 모여요'],
      },
    } as Fail;
  }
  if (state.fullness >= FULL_LIMIT) {
    return {
      ok: false,
      block: { code: 'full', emoji: '😋', title: '배불러서 못 먹어요', reason: '배부름이 거의 가득 찼어요.', howTo: ['산책을 하면 배가 고파져요', '시간이 조금 지나면 다시 먹을 수 있어요'] },
    } as Fail;
  }
  if (state.daily.activities >= state.daily.limit) return { ok: false, block: limitBlock(state) } as Fail;

  const favorite = !!animal && FAVORITE_FOOD[animal] === food.id;
  const before = state.xp;
  const s: PetState = {
    ...state,
    fullness: clampStat(state.fullness + food.fullness),
    happiness: clampStat(state.happiness + food.happiness * (favorite ? 1.6 : 1)),
    foods: state.foods.map((f) => (f.id === food.id ? { ...f, left: f.left - 1 } : f)),
    today: { ...state.today, fed: true },
  };
  const { xpCapped } = await bookActivity(userId, s, { cost: 0, xp: food.xp + (favorite ? 2 : 0), counts: true });
  await saveStats(userId, s);
  await sql`INSERT INTO pet_feedings (user_id, food_id) VALUES (${userId}, ${food.id})`;

  return { ok: true as const, state: s, favorite, xpCapped, levelUpTo: levelUp(before, s.xp) };
}

export async function buyFood(foodId: string, qty: number) {
  const food = foodById(foodId);
  if (!food || ![1, 3, 5].includes(qty)) {
    return { ok: false, block: { code: 'other', emoji: '❓', title: '살 수 없어요', reason: '', howTo: [] } } as Fail;
  }
  const { userId, state } = await load();
  const [earned, spent] = await Promise.all([getEarnedGems(), getSpentGems(userId)]);
  if (!earned.connected) {
    return {
      ok: false,
      block: { code: 'other', emoji: '📡', title: '보석을 불러올 수 없어요', reason: '영어 단어 앱과 잠깐 연결이 안 돼요.', howTo: ['잠시 후 다시 해주세요'] },
    } as Fail;
  }
  const cost = food.price * qty;
  const left = earned.stars - spent;
  if (left < cost) {
    return {
      ok: false,
      block: {
        code: 'other',
        emoji: '💎',
        title: `보석이 ${cost - left}개 더 필요해요`,
        reason: `${food.name} ${qty}개는 💎 ${cost}개예요. 지금 💎 ${left}개 있어요.`,
        howTo: ['🔤 영어 단어 앱에서 공부하면 💎 보석이 모여요', '📔 일기를 쓰면 🍎 사과는 공짜로 생겨요'],
      },
    } as Fail;
  }
  await sql`
    INSERT INTO pet_food_stock (user_id, food_id, qty, cost_paid, source)
    VALUES (${userId}, ${food.id}, ${qty}, ${cost}, 'shop')
  `;
  return {
    ok: true as const,
    state: { ...state, foods: state.foods.map((f) => (f.id === food.id ? { ...f, left: f.left + qty } : f)) } as PetState,
    gemsLeft: left - cost,
  };
}

/**
 * Finishes a care activity. Costs ⭐ and counts toward today's limit. XP only
 * counts once per cooldown and within the daily growth cap.
 */
export async function doCare(kind: string) {
  const rule = CARE[kind as CareKind];
  if (!rule) return { ok: false, block: { code: 'other', emoji: '❓', title: '알 수 없는 돌봄이에요', reason: '', howTo: [] } } as Fail;

  const { userId, isEgg, state } = await load();
  if (isEgg) return { ok: false, block: EGG_BLOCK } as Fail;
  if (rule.kind === 'walk' && state.energy < 15) {
    return {
      ok: false,
      block: { code: 'tired', emoji: '😴', title: '너무 졸려서 산책을 못 가요', reason: `에너지가 ${Math.round(state.energy)}%밖에 없어요.`, howTo: ['🌙 침실에서 재워주면 에너지가 가득 차요'] },
    } as Fail;
  }
  if (state.daily.activities >= state.daily.limit) return { ok: false, block: limitBlock(state) } as Fail;
  const cost = state.daily.nextCost;
  if (state.cp < cost) return { ok: false, block: cpBlock(state) } as Fail;

  const now = Date.now();
  const counts = now - (state.lastCare[rule.kind] ?? 0) >= rule.cooldownMin * 60_000;
  const before = state.xp;
  const s: PetState = { ...state, lastCare: { ...state.lastCare } };
  for (const [stat, delta] of Object.entries(rule.effect) as [StatId, number][]) {
    s[stat] = delta === 100 ? 100 : clampStat(s[stat] + delta);
  }

  let found: FoodId | null = null;
  if (counts && rule.kind === 'walk') {
    const r = await sql`
      SELECT COUNT(*) AS count FROM pet_food_stock
      WHERE user_id = ${userId} AND source = 'walk' AND created_at >= ${koreaDayStart().toISOString()}
    `;
    if ((Number((r.rows[0] as Row).count) || 0) < WALK_FINDS_PER_DAY) {
      found = WALK_FIND_POOL[Math.floor(Math.random() * WALK_FIND_POOL.length)];
      await sql`INSERT INTO pet_food_stock (user_id, food_id, qty, cost_paid, source) VALUES (${userId}, ${found}, 1, 0, 'walk')`;
      s.foods = s.foods.map((f) => (f.id === found ? { ...f, left: f.left + 1 } : f));
    }
  }

  const { xpAdded, xpCapped } = await bookActivity(userId, s, { cost, xp: counts ? rule.xp : 0, counts: true });
  await saveStats(userId, s);
  if (counts) {
    s.lastCare[rule.kind] = now;
    if (rule.kind !== 'teeth') s.today = { ...s.today, [rule.kind]: true };
    await sql`
      UPDATE pet_care
      SET last_care = last_care || ${JSON.stringify({ [rule.kind]: new Date(now).toISOString() })}::jsonb
      WHERE user_id = ${userId}
    `;
  }
  if (rule.kind === 'brush') {
    s.groomedUntil = now + 6 * 3_600_000;
    await sql`UPDATE pet_care SET groomed_until = ${new Date(s.groomedUntil).toISOString()} WHERE user_id = ${userId}`;
  }

  return { ok: true as const, state: s, xpGained: xpAdded, xpCapped, cpSpent: cost, found, levelUpTo: levelUp(before, s.xp) };
}

/** Raising a shop friend: snack (uses food), play (uses ⭐), pat (free). */
export async function careFriend(itemId: string, action: string, foodId?: string) {
  const act = FRIEND_ACTIONS[action as FriendAction];
  if (!act) return { ok: false, block: { code: 'other', emoji: '❓', title: '알 수 없는 행동이에요', reason: '', howTo: [] } } as Fail;

  const { userId, state } = await load();
  const owned = await sql`SELECT 1 FROM character_items WHERE user_id = ${userId} AND item_id = ${itemId}`;
  if (!owned.rows.length) {
    return { ok: false, block: { code: 'notOwned', emoji: '🛍️', title: '아직 내 친구가 아니에요', reason: '상점에서 데려온 친구만 키울 수 있어요.', howTo: ['🛍️ 상점에서 💎 보석으로 데려올 수 있어요'] } } as Fail;
  }

  const day = koreaDay();
  await sql`INSERT INTO friend_care (user_id, item_id) VALUES (${userId}, ${itemId}) ON CONFLICT DO NOTHING`;
  const fr = (await sql`
    SELECT xp, to_char(xp_day, 'YYYY-MM-DD') AS xp_day, xp_today, to_char(pat_day, 'YYYY-MM-DD') AS pat_day
    FROM friend_care WHERE user_id = ${userId} AND item_id = ${itemId}
  `).rows[0] as Row;
  const xpToday = fr.xp_day === day ? Number(fr.xp_today) || 0 : 0;
  const friendXp = Number(fr.xp) || 0;
  const name = itemById(itemId)?.name ?? '친구';

  let cost = 0;
  let food = undefined as ReturnType<typeof foodById>;
  if (act.counts && state.daily.activities >= state.daily.limit) return { ok: false, block: limitBlock(state) } as Fail;
  if (action === 'play') {
    cost = state.daily.nextCost;
    if (state.cp < cost) return { ok: false, block: cpBlock(state) } as Fail;
  }
  if (action === 'snack') {
    food = foodById(foodId ?? '');
    const left = state.foods.find((f) => f.id === food?.id)?.left ?? 0;
    if (!food || left <= 0) {
      return {
        ok: false,
        block: { code: 'stock', emoji: '🧊', title: '줄 간식이 없어요', reason: '냉장고에 먹이가 없어요.', howTo: ['📔 일기를 쓰면 🍎, 🔤 영어 공부를 하면 🍪가 생겨요', '부엌의 먹이 가게에서 💎로 살 수도 있어요'] },
      } as Fail;
    }
  }

  // Pats give XP once a day; everything respects the friend's daily cap.
  const wantXp = action === 'pat' ? (fr.pat_day === day ? 0 : act.xp) : act.xp;
  const xpAdded = Math.max(0, Math.min(wantXp, DAILY.xpFriend - xpToday));
  const newXp = friendXp + xpAdded;

  const s: PetState = { ...state };
  if (act.counts || cost) await bookActivity(userId, s, { cost, xp: 0, counts: act.counts });
  if (food) {
    await sql`INSERT INTO pet_feedings (user_id, food_id, target) VALUES (${userId}, ${food.id}, ${itemId})`;
    s.foods = s.foods.map((f) => (f.id === food!.id ? { ...f, left: f.left - 1 } : f));
  }
  if (cost) await saveStats(userId, s);
  await sql`
    UPDATE friend_care
    SET xp = ${newXp}, xp_day = ${day}, xp_today = ${xpToday + xpAdded},
        pat_day = CASE WHEN ${action} = 'pat' THEN ${day}::date ELSE pat_day END
    WHERE user_id = ${userId} AND item_id = ${itemId}
  `;
  s.friends = { ...s.friends, [itemId]: { xp: newXp, xpToday: xpToday + xpAdded } };

  const lvBefore = friendLevelOf(friendXp).level;
  const lvAfter = friendLevelOf(newXp).level;
  return {
    ok: true as const,
    state: s,
    xpGained: xpAdded,
    xpCapped: wantXp > 0 && xpAdded < wantXp,
    patRepeat: action === 'pat' && wantXp === 0,
    friendLevelUp: lvAfter > lvBefore ? lvAfter : null,
    name,
  };
}

/** Spend one 💖 heart for a few more care activities today. */
export async function extendPlayTime() {
  const { userId, state } = await load();
  if (state.daily.extensions >= DAILY.maxExtensions) {
    return {
      ok: false,
      block: { code: 'maxext', emoji: '🌙', title: '오늘은 더 늘릴 수 없어요', reason: `하트로 늘리기는 하루에 ${DAILY.maxExtensions}번까지예요.`, howTo: ['내일 다시 오면 친구가 기다리고 있을 거예요!'] },
    } as Fail;
  }
  const paid = await sql`
    UPDATE child_account SET balance = balance - 1
    WHERE id = ${userId} AND balance >= 1
    RETURNING balance
  `;
  if (!paid.rows.length) {
    return {
      ok: false,
      block: { code: 'nohearts', emoji: '💖', title: '하트가 없어요', reason: '시간을 늘리려면 💖 하트 1개가 필요해요.', howTo: ['🎯 미션을 하고 부모님께 하트를 받으면 쓸 수 있어요'] },
    } as Fail;
  }
  await sql`INSERT INTO transactions (type, amount, description) VALUES ('buy', -1, '🐾 친구 돌봄 시간 늘리기')`;
  await sql`UPDATE pet_daily SET extensions = extensions + 1 WHERE user_id = ${userId} AND day = ${koreaDay()}`;
  const extensions = state.daily.extensions + 1;
  return {
    ok: true as const,
    state: { ...state, daily: { ...state.daily, extensions, limit: DAILY.activities + extensions * DAILY.extendBy } } as PetState,
    heartsLeft: Number((paid.rows[0] as Row).balance) || 0,
  };
}

// ── study room ─────────────────────────────────────────────────────────

const MIN_ANSWER_MS = 1500;
const PAUSE_AFTER_MISSES = 3;
const PAUSE_SECONDS = 30;

export interface QuizQuestion {
  id: string;
  subject: QuizSubject;
  level: number;
  ask: string;
  prompt: string;
  highlight?: string;
  choices?: string[];
}

export async function getQuizQuestion(subject: string) {
  await ensurePetTables();
  const userId = await requireChildId();
  await sql`INSERT INTO pet_care (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
  const care = (await sql`SELECT quiz_level_en, quiz_level_math, quiz_pause_until FROM pet_care WHERE user_id = ${userId}`).rows[0] as Row;

  const pauseUntil = care.quiz_pause_until ? new Date(care.quiz_pause_until as string).getTime() : 0;
  if (pauseUntil > Date.now()) {
    const sec = Math.ceil((pauseUntil - Date.now()) / 1000);
    return {
      ok: false,
      block: { code: 'pause', emoji: '🧘', title: '잠깐 쉬어가요', reason: `연속으로 틀렸어요. ${sec}초 뒤에 다시 풀 수 있어요.`, howTo: ['문제를 천천히 끝까지 읽어봐요', '틀린 문제의 정답을 한 번 더 떠올려봐요'] },
      pauseUntil,
    } as Fail & { pauseUntil: number };
  }

  const subj: QuizSubject = subject === 'math' ? 'math' : subject === 'english' ? 'english' : Math.random() < 0.5 ? 'math' : 'english';
  const level = subj === 'math' ? Number(care.quiz_level_math) || 1 : Number(care.quiz_level_en) || 1;
  const q = subj === 'math' ? makeMath(level) : makeEnglish(level);
  const r = await sql`
    INSERT INTO pet_quiz (user_id, subject, level, answer, explain)
    VALUES (${userId}, ${q.subject}, ${q.level}, ${q.answer}, ${q.explain})
    RETURNING id
  `;
  return {
    ok: true as const,
    question: {
      id: (r.rows[0] as Row).id as string,
      subject: q.subject,
      level: q.level,
      ask: q.ask,
      prompt: q.prompt,
      highlight: q.highlight,
      choices: q.choices,
    } as QuizQuestion,
  };
}

/**
 * Checks an answer. Only a correct, first answer earns ⭐ — too-fast answers
 * are refused, misses show the right answer, and three misses in a row pause
 * the quiz briefly so random tapping doesn't pay.
 */
export async function answerQuiz(questionId: string, given: string) {
  await ensurePetTables();
  const userId = await requireChildId();
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) {
    return { ok: false, block: { code: 'other', emoji: '❓', title: '문제를 찾을 수 없어요', reason: '', howTo: ['새 문제를 받아주세요'] } } as Fail;
  }
  const q = (await sql`
    SELECT subject, level, answer, explain, answered_at,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - issued_at)) * 1000 AS age_ms
    FROM pet_quiz
    WHERE id = ${questionId} AND user_id = ${userId}
  `).rows[0] as Row | undefined;
  if (!q || q.answered_at) {
    return { ok: false, block: { code: 'other', emoji: '❓', title: '이미 푼 문제예요', reason: '', howTo: ['새 문제를 받아주세요'] } } as Fail;
  }
  // Measured on the DB clock only, so app/DB clock drift can't misfire it.
  if (Number(q.age_ms) < MIN_ANSWER_MS) {
    return {
      ok: false,
      block: { code: 'tooFast', emoji: '🐢', title: '너무 빨라요!', reason: '문제를 끝까지 읽지 않고 누른 것 같아요.', howTo: ['문제를 천천히 읽고 다시 골라봐요'] },
    } as Fail;
  }

  const correct = normalizeAnswer(given) === normalizeAnswer(String(q.answer));
  await sql`UPDATE pet_quiz SET given = ${given.slice(0, 200)}, correct = ${correct}, answered_at = CURRENT_TIMESTAMP WHERE id = ${questionId}`;

  const care = (await sql`
    SELECT cp, quiz_level_en, quiz_level_math, quiz_streak, quiz_wrong FROM pet_care WHERE user_id = ${userId}
  `).rows[0] as Row;
  let cp = Number(care.cp) || 0;
  let streak = Number(care.quiz_streak) || 0;
  let wrong = Number(care.quiz_wrong) || 0;
  const isMath = q.subject === 'math';
  let level = isMath ? Number(care.quiz_level_math) || 1 : Number(care.quiz_level_en) || 1;
  let levelChange = 0;
  let pauseUntil: number | null = null;
  let cpFull = false;

  if (correct) {
    if (cp >= CP.max) cpFull = true;
    cp = Math.min(CP.max, cp + CP.perCorrect);
    streak += 1;
    wrong = 0;
    if (streak >= 3 && level < 5) {
      level += 1;
      levelChange = 1;
      streak = 0;
    }
  } else {
    streak = 0;
    wrong += 1;
    if (wrong % 2 === 0 && level > 1) {
      level -= 1;
      levelChange = -1;
    }
    if (wrong >= PAUSE_AFTER_MISSES) {
      pauseUntil = Date.now() + PAUSE_SECONDS * 1000;
      wrong = 0;
    }
  }

  await sql`
    UPDATE pet_care
    SET cp = ${cp}, quiz_streak = ${streak}, quiz_wrong = ${wrong},
        quiz_level_en = ${isMath ? Number(care.quiz_level_en) || 1 : level},
        quiz_level_math = ${isMath ? level : Number(care.quiz_level_math) || 1},
        quiz_pause_until = ${pauseUntil ? new Date(pauseUntil).toISOString() : null}
    WHERE user_id = ${userId}
  `;

  return {
    ok: true as const,
    correct,
    answer: String(q.answer),
    explain: String(q.explain ?? ''),
    cp,
    cpFull,
    level,
    levelChange,
    streak,
    pauseUntil,
  };
}

// ── misc ───────────────────────────────────────────────────────────────

export async function setFurHue(hue: number) {
  if (!FUR_COLORS.some((c) => c.hue === hue)) return { ok: false };
  await ensurePetTables();
  const userId = await requireChildId();
  await sql`UPDATE pet_care SET fur_hue = ${hue} WHERE user_id = ${userId}`;
  return { ok: true };
}

/** Ball / party on the stage cheers the buddy up. Free, throttled, no XP. */
export async function playWithPet() {
  const { userId, state } = await load();
  const r = await sql`SELECT last_play_at FROM pet_care WHERE user_id = ${userId}`;
  const last = (r.rows[0] as Row)?.last_play_at as string | null;
  if (last && Date.now() - new Date(last).getTime() < 20 * 60_000) return { state, cheered: false };
  const s = { ...state, happiness: clampStat(state.happiness + 10), energy: clampStat(state.energy - 8) };
  await saveStats(userId, s);
  await sql`UPDATE pet_care SET last_play_at = CURRENT_TIMESTAMP WHERE user_id = ${userId}`;
  return { state: s, cheered: true };
}
