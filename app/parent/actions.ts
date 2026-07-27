'use server';

import { sql } from '@vercel/postgres';

export async function getParentData() {
  try {
    const [child, shops, transactions] = await Promise.all([
      sql`SELECT id, balance, name, photo_data FROM child_account LIMIT 1`,
      sql`SELECT id, emoji, name, price FROM shop_items ORDER BY created_at`,
      sql`SELECT type, amount, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 50`,
    ]);

    return {
      child: child.rows[0],
      shops: shops.rows,
      transactions: transactions.rows,
    };
  } catch (error) {
    console.error('Error fetching parent data:', error);
    throw error;
  }
}

export async function giveCoins(amount: number, description: string) {
  try {
    const [child] = await Promise.all([
      sql`SELECT balance FROM child_account LIMIT 1`,
      sql`
        INSERT INTO transactions (type, amount, description)
        VALUES ('give', ${amount}, ${description})
      `,
      sql`
        UPDATE child_account
        SET balance = balance + ${amount}
        WHERE id = (SELECT id FROM child_account LIMIT 1)
      `,
    ]);

    return { success: true, newBalance: (child.rows[0] as any).balance + amount };
  } catch (error) {
    console.error('Error giving coins:', error);
    throw error;
  }
}

export async function addShopItem(emoji: string, name: string, price: number) {
  try {
    const result = await sql`
      INSERT INTO shop_items (emoji, name, price)
      VALUES (${emoji}, ${name}, ${price})
      RETURNING id, emoji, name, price
    `;

    return { success: true, item: result.rows[0] };
  } catch (error) {
    console.error('Error adding shop item:', error);
    throw error;
  }
}

export async function updateShopItem(id: string, name: string, price: number) {
  try {
    await sql`
      UPDATE shop_items
      SET name = ${name}, price = ${price}
      WHERE id = ${id}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error updating shop item:', error);
    throw error;
  }
}

export async function deleteShopItem(id: string) {
  try {
    await sql`DELETE FROM shop_items WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Error deleting shop item:', error);
    throw error;
  }
}

export async function updateChildPin(newPin: string) {
  try {
    const hashedPin = Buffer.from(newPin).toString('base64');
    await sql`
      UPDATE child_account
      SET pin = ${hashedPin}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;

    return { success: true };
  } catch (error) {
    console.error('Error updating child PIN:', error);
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

export async function getAccessLogs() {
  try {
    const result = await sql`
      SELECT role, user_agent, logged_in_at, logged_out_at
      FROM access_logs
      ORDER BY logged_in_at DESC
      LIMIT 50
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching access logs:', error);
    throw error;
  }
}
