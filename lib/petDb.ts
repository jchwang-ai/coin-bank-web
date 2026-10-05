import { sql } from '@vercel/postgres';

/**
 * Server-only helpers shared by the pet and shop actions.
 *
 * Tables are also created by /api/init-db, but that only runs when someone
 * calls it after a deploy — so make sure here too, once per server instance.
 */
let tablesReady = false;
export async function ensurePetTables() {
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
  await sql`ALTER TABLE pet_care ADD COLUMN IF NOT EXISTS clean REAL NOT NULL DEFAULT 80`;
  await sql`ALTER TABLE pet_care ADD COLUMN IF NOT EXISTS energy REAL NOT NULL DEFAULT 80`;
  await sql`ALTER TABLE pet_care ADD COLUMN IF NOT EXISTS fur_hue INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE pet_care ADD COLUMN IF NOT EXISTS groomed_until TIMESTAMP WITH TIME ZONE`;
  // { bath: iso, walk: iso, … } — last time each care action counted.
  await sql`ALTER TABLE pet_care ADD COLUMN IF NOT EXISTS last_care JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`
    CREATE TABLE IF NOT EXISTS pet_feedings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES child_account(id) ON DELETE CASCADE,
      food_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  // Food bought with gems (cost_paid > 0) or found on walks (cost_paid = 0).
  // cost_paid is part of the gem spend ledger, next to character_items.
  await sql`
    CREATE TABLE IF NOT EXISTS pet_food_stock (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES child_account(id) ON DELETE CASCADE,
      food_id VARCHAR(20) NOT NULL,
      qty INTEGER NOT NULL,
      cost_paid INTEGER NOT NULL DEFAULT 0,
      source VARCHAR(20) NOT NULL DEFAULT 'shop',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  tablesReady = true;
}

/** Every gem spent in this app: dress-up items + food. */
export async function getSpentGems(userId: string): Promise<number> {
  await ensurePetTables();
  const r = await sql`
    SELECT
      (SELECT COALESCE(SUM(cost_paid), 0) FROM character_items WHERE user_id = ${userId}) +
      (SELECT COALESCE(SUM(cost_paid), 0) FROM pet_food_stock WHERE user_id = ${userId}) AS spent
  `;
  return Number((r.rows[0] as { spent: unknown }).spent) || 0;
}
