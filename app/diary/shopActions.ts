'use server';

import { sql } from '@vercel/postgres';
import { itemById, SLOTS, SlotId } from '@/lib/characterShop';
import { getEarnedGems } from '@/lib/vocabGems';

/**
 * Owner is resolved server-side from the singleton child account — the same
 * way every other action in this app does it — and every query is scoped by
 * it, so item ids passed from the client can only ever affect this child.
 */
async function requireChildId(): Promise<string> {
  const result = await sql`SELECT id FROM child_account LIMIT 1`;
  if (!result.rows.length) throw new Error('아이 계정을 찾을 수 없어요');
  return (result.rows[0] as any).id as string;
}

async function getSpentGems(userId: string): Promise<number> {
  const r = await sql`
    SELECT COALESCE(SUM(cost_paid), 0) AS spent FROM character_items WHERE user_id = ${userId}
  `;
  return Number((r.rows[0] as any).spent) || 0;
}

export interface ItemWish {
  id: string;
  name: string;
  note: string | null;
  status: string;
  created_at: string;
}

export async function getShopState() {
  try {
    const userId = await requireChildId();

    const [earned, owned, equipped, wishes] = await Promise.all([
      getEarnedGems(),
      sql`SELECT item_id, cost_paid, acquired_at FROM character_items WHERE user_id = ${userId}`,
      sql`SELECT slot, item_id FROM character_equipped WHERE user_id = ${userId}`,
      sql`
        SELECT id, name, note, status, created_at
        FROM item_wishes WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 20
      `,
    ]);

    const spent = (owned.rows as any[]).reduce((sum, r) => sum + (Number(r.cost_paid) || 0), 0);

    return {
      gemsEarned: earned.stars,
      gemsSpent: spent,
      gemsLeft: Math.max(0, earned.stars - spent),
      vocabConnected: earned.connected,
      ownedIds: (owned.rows as any[]).map((r) => r.item_id as string),
      equipped: (equipped.rows as any[]).reduce<Record<string, string>>((acc, r) => {
        acc[r.slot] = r.item_id;
        return acc;
      }, {}),
      wishes: wishes.rows as unknown as ItemWish[],
    };
  } catch (error) {
    console.error('Error fetching shop state:', error);
    throw error;
  }
}

/**
 * Buys one catalog item. The price is taken from the server-side catalog (not
 * from the client), affordability is re-checked here, and the UNIQUE
 * constraint makes a double-tap a no-op rather than a double charge.
 */
export async function buyItem(itemId: string) {
  try {
    const item = itemById(itemId);
    if (!item) throw new Error('그런 아이템이 없어요');

    const userId = await requireChildId();

    const already = await sql`
      SELECT 1 FROM character_items WHERE user_id = ${userId} AND item_id = ${itemId}
    `;
    if (already.rows.length) throw new Error('이미 가지고 있어요');

    const [earned, spent] = await Promise.all([getEarnedGems(), getSpentGems(userId)]);
    if (!earned.connected) {
      throw new Error('보석을 불러올 수 없어요. 잠시 후 다시 해주세요');
    }

    const left = earned.stars - spent;
    if (left < item.cost) {
      throw new Error(`보석이 ${item.cost - left}개 더 필요해요`);
    }

    await sql`
      INSERT INTO character_items (user_id, item_id, cost_paid)
      VALUES (${userId}, ${itemId}, ${item.cost})
      ON CONFLICT (user_id, item_id) DO NOTHING
    `;

    // Newly bought items are worn immediately — that's what a child expects.
    await sql`
      INSERT INTO character_equipped (user_id, slot, item_id)
      VALUES (${userId}, ${item.slot}, ${itemId})
      ON CONFLICT (user_id, slot) DO UPDATE
        SET item_id = EXCLUDED.item_id, updated_at = CURRENT_TIMESTAMP
    `;

    return { success: true, gemsLeft: left - item.cost, item };
  } catch (error) {
    console.error('Error buying item:', error);
    throw error;
  }
}

/** Wears an already-owned item (or clears the slot when itemId is null). */
export async function equipItem(slot: SlotId, itemId: string | null) {
  try {
    if (!SLOTS.some((s) => s.id === slot)) throw new Error('잘못된 칸이에요');
    const userId = await requireChildId();

    if (itemId === null) {
      await sql`DELETE FROM character_equipped WHERE user_id = ${userId} AND slot = ${slot}`;
      return { success: true };
    }

    const item = itemById(itemId);
    if (!item || item.slot !== slot) throw new Error('이 칸에 넣을 수 없어요');

    const owned = await sql`
      SELECT 1 FROM character_items WHERE user_id = ${userId} AND item_id = ${itemId}
    `;
    if (!owned.rows.length) throw new Error('아직 가지고 있지 않아요');

    await sql`
      INSERT INTO character_equipped (user_id, slot, item_id)
      VALUES (${userId}, ${slot}, ${itemId})
      ON CONFLICT (user_id, slot) DO UPDATE
        SET item_id = EXCLUDED.item_id, updated_at = CURRENT_TIMESTAMP
    `;

    return { success: true };
  } catch (error) {
    console.error('Error equipping item:', error);
    throw error;
  }
}

/** "이런 아이템 만들어주세요" — the child's own idea for the shop. */
export async function submitItemWish(name: string, note: string) {
  try {
    if (!name.trim()) throw new Error('어떤 아이템인지 적어주세요');
    const userId = await requireChildId();

    await sql`
      INSERT INTO item_wishes (user_id, name, note)
      VALUES (${userId}, ${name.trim().slice(0, 100)}, ${note.trim().slice(0, 300) || null})
    `;

    return { success: true };
  } catch (error) {
    console.error('Error submitting item wish:', error);
    throw error;
  }
}

export async function deleteItemWish(id: string) {
  try {
    const userId = await requireChildId();
    const r = await sql`
      DELETE FROM item_wishes WHERE id = ${id} AND user_id = ${userId} AND status = 'pending'
    `;
    if (r.rowCount === 0) throw new Error('지울 수 없어요');
    return { success: true };
  } catch (error) {
    console.error('Error deleting item wish:', error);
    throw error;
  }
}
