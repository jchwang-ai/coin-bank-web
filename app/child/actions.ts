'use server';

import { sql } from '@vercel/postgres';

export async function getChildData() {
  try {
    const [child, shops, coupons, transactions, missions, pendingRequests, myRequests, myShopRequests] = await Promise.all([
      sql`SELECT id, balance, name, photo_data FROM child_account LIMIT 1`,
      sql`SELECT id, emoji, name, price, sort_order FROM shop_items ORDER BY sort_order NULLS LAST, created_at`,
      sql`
        SELECT c.id, c.used, c.purchased_at, c.used_at,
               s.id as shop_item_id, s.emoji, s.name
        FROM coupons c
        JOIN shop_items s ON c.shop_item_id = s.id
        ORDER BY c.purchased_at DESC
      `,
      sql`
        SELECT type, amount, description, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 50
      `,
      sql`SELECT id, emoji, name, reward FROM missions ORDER BY created_at`,
      sql`SELECT mission_id, status FROM mission_requests WHERE status = 'pending'`,
      sql`
        SELECT id, emoji, name, reward, status, is_custom, requested_at
        FROM mission_requests
        ORDER BY requested_at DESC
        LIMIT 20
      `,
      sql`
        SELECT id, emoji, name, requested_price, final_price, status, requested_at
        FROM shop_item_requests
        ORDER BY requested_at DESC
        LIMIT 20
      `,
    ]);

    return {
      child: child.rows[0],
      shops: shops.rows,
      coupons: coupons.rows,
      transactions: transactions.rows,
      missions: missions.rows,
      pendingMissionIds: pendingRequests.rows.map((r: any) => r.mission_id),
      myRequests: myRequests.rows,
      myShopRequests: myShopRequests.rows,
    };
  } catch (error) {
    console.error('Error fetching child data:', error);
    throw error;
  }
}

export async function requestMission(missionId: string, photoData?: string | null) {
  try {
    const mission = await sql`SELECT emoji, name, reward FROM missions WHERE id = ${missionId}`;
    if (!mission.rows.length) {
      throw new Error('미션을 찾을 수 없습니다');
    }

    const existing = await sql`
      SELECT id FROM mission_requests
      WHERE mission_id = ${missionId} AND status = 'pending'
    `;
    if (existing.rows.length > 0) {
      throw new Error('이미 요청한 미션이에요');
    }

    const { emoji, name, reward } = mission.rows[0] as any;
    await sql`
      INSERT INTO mission_requests (mission_id, emoji, name, reward, photo_data)
      VALUES (${missionId}, ${emoji}, ${name}, ${reward}, ${photoData || null})
    `;

    return { success: true };
  } catch (error) {
    console.error('Error requesting mission:', error);
    throw error;
  }
}

export async function requestCustomMission(description: string, photoData?: string | null) {
  try {
    if (!description.trim()) {
      throw new Error('무엇을 했는지 적어주세요');
    }

    await sql`
      INSERT INTO mission_requests (mission_id, is_custom, emoji, name, reward, photo_data)
      VALUES (NULL, TRUE, '✨', ${description.trim()}, NULL, ${photoData || null})
    `;

    return { success: true };
  } catch (error) {
    console.error('Error requesting custom mission:', error);
    throw error;
  }
}

export async function proposeShopItem(emoji: string, name: string, requestedPrice: number) {
  try {
    if (!name.trim()) {
      throw new Error('이름을 적어주세요');
    }
    if (!requestedPrice || requestedPrice < 1) {
      throw new Error('하트 개수를 입력해주세요');
    }

    await sql`
      INSERT INTO shop_item_requests (emoji, name, requested_price)
      VALUES (${emoji}, ${name.trim()}, ${requestedPrice})
    `;

    return { success: true };
  } catch (error) {
    console.error('Error proposing shop item:', error);
    throw error;
  }
}

export async function reorderShopItems(orderedIds: string[]) {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        sql`UPDATE shop_items SET sort_order = ${index} WHERE id = ${id}`
      )
    );
    return { success: true };
  } catch (error) {
    console.error('Error reordering shop items:', error);
    throw error;
  }
}

export async function updateChildPhoto(photoData: string) {
  try {
    await sql`
      UPDATE child_account
      SET photo_data = ${photoData}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;
    return { success: true };
  } catch (error) {
    console.error('Error updating child photo:', error);
    throw error;
  }
}

export async function updateChildName(name: string) {
  try {
    await sql`
      UPDATE child_account
      SET name = ${name}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;
    return { success: true };
  } catch (error) {
    console.error('Error updating child name:', error);
    throw error;
  }
}

export async function buyCoupon(shopItemId: string) {
  try {
    const child = await sql`SELECT balance FROM child_account LIMIT 1`;
    const item = await sql`SELECT price FROM shop_items WHERE id = ${shopItemId}`;

    if (!item.rows.length) {
      throw new Error('쿠폰을 찾을 수 없습니다');
    }

    const price = (item.rows[0] as any).price;
    const balance = (child.rows[0] as any).balance;

    if (balance < price) {
      throw new Error('하트가 부족합니다');
    }

    // Insert coupon
    const coupon = await sql`
      INSERT INTO coupons (shop_item_id)
      VALUES (${shopItemId})
      RETURNING id
    `;

    // Deduct balance
    await sql`
      UPDATE child_account
      SET balance = balance - ${price}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;

    // Record transaction
    await sql`
      INSERT INTO transactions (type, amount, description)
      VALUES ('buy', ${-price}, (SELECT name FROM shop_items WHERE id = ${shopItemId}))
    `;

    return { success: true, couponId: (coupon.rows[0] as any).id };
  } catch (error) {
    console.error('Error buying coupon:', error);
    throw error;
  }
}

export async function useCoupon(couponId: string) {
  try {
    const coupon = await sql`
      SELECT c.id, s.name
      FROM coupons c
      JOIN shop_items s ON c.shop_item_id = s.id
      WHERE c.id = ${couponId}
    `;

    if (!coupon.rows.length) {
      throw new Error('쿠폰을 찾을 수 없습니다');
    }

    const couponName = (coupon.rows[0] as any).name;

    await sql`
      UPDATE coupons
      SET used = true, used_at = CURRENT_TIMESTAMP
      WHERE id = ${couponId}
    `;

    await sql`
      INSERT INTO transactions (type, amount, description)
      VALUES ('use', 0, ${couponName})
    `;

    return { success: true };
  } catch (error) {
    console.error('Error using coupon:', error);
    throw error;
  }
}
