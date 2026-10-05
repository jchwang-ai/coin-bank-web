'use server';

import { sql } from '@vercel/postgres';
import { Motion, Rarity, ShopItem, itemById, SLOTS, SlotId } from '@/lib/characterShop';
import { inferItem } from '@/lib/customItem';
import { getEarnedGems } from '@/lib/vocabGems';
import { getSpentGems } from '@/lib/petDb';

/**
 * Child-invented items live in the DB (they're created at runtime) while the
 * built-in catalog lives in code. Their ids are prefixed so the two can share
 * one id space in character_items / character_equipped.
 */
const CUSTOM_PREFIX = 'custom:';

function customItemId(rowId: string) {
  return `${CUSTOM_PREFIX}${rowId}`;
}

function isCustomId(id: string) {
  return id.startsWith(CUSTOM_PREFIX);
}

function rowToShopItem(row: any): ShopItem {
  return {
    id: customItemId(row.id),
    slot: (row.slot || 'held') as SlotId,
    name: row.name,
    emoji: row.emoji || '🎁',
    cost: Number(row.cost) || 35,
    rarity: (row.rarity || 'rare') as Rarity,
    motion: (row.motion || undefined) as Motion | undefined,
  };
}

/** Looks an item up in the code catalog first, then the child's own items. */
async function resolveItem(itemId: string): Promise<ShopItem | undefined> {
  if (!isCustomId(itemId)) return itemById(itemId);

  const rowId = itemId.slice(CUSTOM_PREFIX.length);
  // Guard: a malformed id must not blow up the uuid cast.
  if (!/^[0-9a-f-]{36}$/i.test(rowId)) return undefined;

  const r = await sql`SELECT id, name, emoji, slot, motion, cost, rarity FROM item_wishes WHERE id = ${rowId}`;
  if (!r.rows.length) return undefined;
  return rowToShopItem(r.rows[0]);
}

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

export interface ItemWish {
  id: string;
  name: string;
  note: string | null;
  status: string;
  created_at: string;
}

/** A child-made item, shaped like a catalog item so the shop can render it. */
export interface CustomItem extends ShopItem {
  /** DB row id, used for deletion. */
  rowId: string;
  note: string | null;
}

export async function getShopState() {
  try {
    const userId = await requireChildId();

    const [earned, spent, owned, equipped, wishes] = await Promise.all([
      getEarnedGems(),
      getSpentGems(userId),
      sql`SELECT item_id, cost_paid, acquired_at FROM character_items WHERE user_id = ${userId}`,
      sql`SELECT slot, item_id FROM character_equipped WHERE user_id = ${userId}`,
      sql`
        SELECT id, name, note, emoji, slot, motion, cost, rarity, status, created_at
        FROM item_wishes WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 40
      `,
    ]);

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
      customItems: (wishes.rows as any[]).map(
        (r): CustomItem => ({ ...rowToShopItem(r), rowId: r.id as string, note: r.note ?? null })
      ),
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
    const item = await resolveItem(itemId);
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

    const item = await resolveItem(itemId);
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

/**
 * "이런 아이템 만들어주세요" — creates the item immediately, no parent
 * approval: the emoji, slot, movement and price are inferred from the name
 * and it lands in the shop ready to buy.
 */
export async function createCustomItem(name: string, note: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('어떤 아이템인지 적어주세요');

    const userId = await requireChildId();
    const inferred = inferItem(trimmed);

    const r = await sql`
      INSERT INTO item_wishes (user_id, name, note, emoji, slot, motion, cost, rarity, status)
      VALUES (
        ${userId}, ${trimmed.slice(0, 100)}, ${note.trim().slice(0, 300) || null},
        ${inferred.emoji}, ${inferred.slot}, ${inferred.motion ?? null},
        ${inferred.cost}, ${inferred.rarity}, 'ready'
      )
      RETURNING id, name, note, emoji, slot, motion, cost, rarity
    `;

    const row = r.rows[0] as any;
    return {
      success: true,
      item: { ...rowToShopItem(row), rowId: row.id as string, note: row.note ?? null } as CustomItem,
    };
  } catch (error) {
    console.error('Error creating custom item:', error);
    throw error;
  }
}

/**
 * Deletes a child-made item. Also removes the purchase record so the gems
 * spent on it are returned to the balance — deleting your own creation
 * shouldn't quietly cost you 70 gems.
 */
export async function deleteCustomItem(rowId: string) {
  try {
    const userId = await requireChildId();
    const fullId = customItemId(rowId);

    await sql`DELETE FROM character_equipped WHERE user_id = ${userId} AND item_id = ${fullId}`;
    await sql`DELETE FROM character_items WHERE user_id = ${userId} AND item_id = ${fullId}`;

    const r = await sql`DELETE FROM item_wishes WHERE id = ${rowId} AND user_id = ${userId}`;
    if (r.rowCount === 0) throw new Error('지울 수 없어요');

    return { success: true };
  } catch (error) {
    console.error('Error deleting custom item:', error);
    throw error;
  }
}
