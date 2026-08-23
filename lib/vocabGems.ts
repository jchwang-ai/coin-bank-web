import { createPool } from '@vercel/postgres';

/**
 * Reads earned gems from the English-vocabulary app ('초등학교 영어 단어 학습 앱',
 * project `tera-vocab` / pulley-english-test), which lives in a *different*
 * Neon database than this app.
 *
 * Strictly read-only: we only SELECT `total_stars` from that app's
 * `tera_vocab_stats`. Nothing here writes to it, so studying English keeps
 * working exactly as before and its data is never mutated by the diary app.
 *
 * Spending is tracked on our side (character_items.cost_paid), so the gem
 * balance is `earned (there) - spent (here)`.
 *
 * Requires env VOCAB_DATABASE_URL. Optional VOCAB_PROFILE narrows to one
 * learner profile; unset means "sum every profile", which is right while the
 * vocab app has a single profile for this child.
 */

let pool: ReturnType<typeof createPool> | null = null;

function getPool() {
  const connectionString = process.env.VOCAB_DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) pool = createPool({ connectionString });
  return pool;
}

export interface EarnedGems {
  stars: number;
  /** False when the vocab DB isn't configured or unreachable. */
  connected: boolean;
}

export async function getEarnedGems(): Promise<EarnedGems> {
  const p = getPool();
  if (!p) return { stars: 0, connected: false };

  try {
    const profile = process.env.VOCAB_PROFILE;
    const result = profile
      ? await p.sql`SELECT COALESCE(SUM(total_stars), 0) AS stars FROM tera_vocab_stats WHERE profile = ${profile}`
      : await p.sql`SELECT COALESCE(SUM(total_stars), 0) AS stars FROM tera_vocab_stats`;

    return { stars: Number((result.rows[0] as any).stars) || 0, connected: true };
  } catch (error) {
    // Never let the vocab app being down break the diary/shop UI — the child
    // just sees 0 earned until it's reachable again.
    console.error('Error reading vocab gems:', error);
    return { stars: 0, connected: false };
  }
}
