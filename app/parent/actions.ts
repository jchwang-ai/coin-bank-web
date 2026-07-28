'use server';

import { sql } from '@vercel/postgres';
import { logActivity } from '@/lib/activity';

export async function getParentData() {
  try {
    const [child, shops, transactions, missions, pendingRequests, pendingShopRequests] = await Promise.all([
      sql`SELECT id, balance, name, photo_data FROM child_account LIMIT 1`,
      sql`SELECT id, emoji, name, price, sort_order FROM shop_items ORDER BY sort_order NULLS LAST, created_at`,
      sql`SELECT type, amount, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT id, emoji, name, reward, sort_order FROM missions ORDER BY sort_order NULLS LAST, created_at`,
      sql`
        SELECT id, mission_id, is_custom, emoji, name, reward, photo_data, requested_at
        FROM mission_requests
        WHERE status = 'pending'
        ORDER BY requested_at ASC
      `,
      sql`
        SELECT id, emoji, name, requested_price, requested_at
        FROM shop_item_requests
        WHERE status = 'pending'
        ORDER BY requested_at ASC
      `,
    ]);

    return {
      child: child.rows[0],
      shops: shops.rows,
      transactions: transactions.rows,
      missions: missions.rows,
      pendingRequests: pendingRequests.rows,
      pendingShopRequests: pendingShopRequests.rows,
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
    await logActivity('parent', '쿠폰 추가', `${emoji} ${name} (${price}💖)`);
    return { success: true, item: result.rows[0] };
  } catch (error) {
    console.error('Error adding shop item:', error);
    throw error;
  }
}

export async function updateShopItem(id: string, name: string, price: number, emoji: string) {
  try {
    await sql`
      UPDATE shop_items
      SET name = ${name}, price = ${price}, emoji = ${emoji}
      WHERE id = ${id}
    `;
    await logActivity('parent', '쿠폰 수정', `${emoji} ${name} (${price}💖)`);
    return { success: true };
  } catch (error) {
    console.error('Error updating shop item:', error);
    throw error;
  }
}

export async function deleteShopItem(id: string) {
  try {
    const item = await sql`SELECT emoji, name FROM shop_items WHERE id = ${id}`;
    await sql`DELETE FROM shop_items WHERE id = ${id}`;
    if (item.rows.length) {
      const { emoji, name } = item.rows[0] as any;
      await logActivity('parent', '쿠폰 삭제', `${emoji} ${name}`);
    }
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
    await logActivity('parent', '자녀 비밀번호 변경');
    return { success: true };
  } catch (error) {
    console.error('Error updating child PIN:', error);
    throw error;
  }
}

export async function updateChildName(name: string) {
  try {
    const before = await sql`SELECT name FROM child_account LIMIT 1`;
    const oldName = before.rows[0] ? (before.rows[0] as any).name : null;
    await sql`
      UPDATE child_account
      SET name = ${name}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;
    await logActivity('parent', '자녀 이름 변경', oldName ? `${oldName} → ${name}` : name);
    return { success: true };
  } catch (error) {
    console.error('Error updating child name:', error);
    throw error;
  }
}

export async function addMission(emoji: string, name: string, reward: number) {
  try {
    const result = await sql`
      INSERT INTO missions (emoji, name, reward)
      VALUES (${emoji}, ${name}, ${reward})
      RETURNING id, emoji, name, reward
    `;
    await logActivity('parent', '미션 추가', `${emoji} ${name} (${reward}💖)`);
    return { success: true, mission: result.rows[0] };
  } catch (error) {
    console.error('Error adding mission:', error);
    throw error;
  }
}

export async function updateMission(id: string, name: string, reward: number, emoji: string) {
  try {
    await sql`
      UPDATE missions
      SET name = ${name}, reward = ${reward}, emoji = ${emoji}
      WHERE id = ${id}
    `;
    await logActivity('parent', '미션 수정', `${emoji} ${name} (${reward}💖)`);
    return { success: true };
  } catch (error) {
    console.error('Error updating mission:', error);
    throw error;
  }
}

export async function deleteMission(id: string) {
  try {
    const mission = await sql`SELECT emoji, name FROM missions WHERE id = ${id}`;
    await sql`DELETE FROM missions WHERE id = ${id}`;
    if (mission.rows.length) {
      const { emoji, name } = mission.rows[0] as any;
      await logActivity('parent', '미션 삭제', `${emoji} ${name}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting mission:', error);
    throw error;
  }
}

export async function approveMissionRequest(requestId: string, overrideReward?: number) {
  try {
    const request = await sql`
      SELECT reward, name, status FROM mission_requests WHERE id = ${requestId}
    `;
    if (!request.rows.length) {
      throw new Error('요청을 찾을 수 없습니다');
    }
    const { reward, name, status } = request.rows[0] as any;
    if (status !== 'pending') {
      throw new Error('이미 처리된 요청입니다');
    }

    const finalReward = reward ?? overrideReward;
    if (!finalReward || finalReward < 1) {
      throw new Error('하트 개수를 입력해주세요');
    }

    await sql`
      UPDATE child_account
      SET balance = balance + ${finalReward}
      WHERE id = (SELECT id FROM child_account LIMIT 1)
    `;

    await sql`
      INSERT INTO transactions (type, amount, description)
      VALUES ('give', ${finalReward}, ${`미션 완료: ${name}`})
    `;

    await sql`
      UPDATE mission_requests
      SET status = 'approved', reward = ${finalReward}, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    return { success: true, reward: finalReward };
  } catch (error) {
    console.error('Error approving mission request:', error);
    throw error;
  }
}

export async function rejectMissionRequest(requestId: string) {
  try {
    await sql`
      UPDATE mission_requests
      SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId} AND status = 'pending'
    `;
    return { success: true };
  } catch (error) {
    console.error('Error rejecting mission request:', error);
    throw error;
  }
}

export async function approveShopItemRequest(requestId: string, finalPrice: number) {
  try {
    if (!finalPrice || finalPrice < 1) {
      throw new Error('하트 개수를 입력해주세요');
    }

    const request = await sql`
      SELECT emoji, name, status FROM shop_item_requests WHERE id = ${requestId}
    `;
    if (!request.rows.length) {
      throw new Error('요청을 찾을 수 없습니다');
    }
    const { emoji, name, status } = request.rows[0] as any;
    if (status !== 'pending') {
      throw new Error('이미 처리된 요청입니다');
    }

    const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) as max_order FROM shop_items`;
    const nextOrder = (maxOrder.rows[0] as any).max_order + 1;

    await sql`
      INSERT INTO shop_items (emoji, name, price, sort_order)
      VALUES (${emoji}, ${name}, ${finalPrice}, ${nextOrder})
    `;

    await sql`
      UPDATE shop_item_requests
      SET status = 'approved', final_price = ${finalPrice}, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error approving shop item request:', error);
    throw error;
  }
}

export async function rejectShopItemRequest(requestId: string) {
  try {
    await sql`
      UPDATE shop_item_requests
      SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId} AND status = 'pending'
    `;
    return { success: true };
  } catch (error) {
    console.error('Error rejecting shop item request:', error);
    throw error;
  }
}

export async function getActivityLogs() {
  try {
    const result = await sql`
      SELECT actor, action, detail, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
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
