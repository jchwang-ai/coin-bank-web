'use server';

import { sql } from '@vercel/postgres';

export async function getChildData() {
  try {
    const [child, shops, coupons, transactions] = await Promise.all([
      sql`SELECT id, balance FROM child_account LIMIT 1`,
      sql`SELECT id, emoji, name, price FROM shop_items ORDER BY created_at`,
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
    ]);

    return {
      child: child.rows[0],
      shops: shops.rows,
      coupons: coupons.rows,
      transactions: transactions.rows,
    };
  } catch (error) {
    console.error('Error fetching child data:', error);
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
      throw new Error('코인이 부족합니다');
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
