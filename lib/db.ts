import { sql } from '@vercel/postgres';

// Initialize database connection
export const db = sql;

// Create tables if they don't exist
export async function initializeDatabase() {
  try {
    // parent_config table
    await sql`
      CREATE TABLE IF NOT EXISTS parent_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pin VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // child_account table
    await sql`
      CREATE TABLE IF NOT EXISTS child_account (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pin VARCHAR(255) NOT NULL,
        balance INTEGER DEFAULT 0,
        name VARCHAR(50) DEFAULT '나',
        photo_data TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Migration: add columns if table already existed without them
    await sql`ALTER TABLE child_account ADD COLUMN IF NOT EXISTS name VARCHAR(50) DEFAULT '나'`;
    await sql`ALTER TABLE child_account ADD COLUMN IF NOT EXISTS photo_data TEXT`;

    // shop_items table
    await sql`
      CREATE TABLE IF NOT EXISTS shop_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        emoji VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // coupons table
    await sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
        used BOOLEAN DEFAULT FALSE,
        purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // access_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role VARCHAR(20) NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        logged_out_at TIMESTAMP WITH TIME ZONE
      );
    `;

    console.log('✓ Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Seed initial data
export async function seedDatabase() {
  try {
    // Check if parent_config already exists
    const parentExists = await sql`SELECT * FROM parent_config LIMIT 1`;
    if (parentExists.rows.length === 0) {
      const hashedPin = Buffer.from('1101').toString('base64');
      await sql`
        INSERT INTO parent_config (pin, email)
        VALUES (${hashedPin}, 'jchwang@pulleymath.com')
      `;
    }

    // Check if child_account already exists
    const childExists = await sql`SELECT * FROM child_account LIMIT 1`;
    if (childExists.rows.length === 0) {
      const hashedPin = Buffer.from('1202').toString('base64');
      await sql`
        INSERT INTO child_account (pin, balance)
        VALUES (${hashedPin}, 0)
      `;
    }

    // Check if shop_items already exist
    const shopExists = await sql`SELECT * FROM shop_items LIMIT 1`;
    if (shopExists.rows.length === 0) {
      const defaultItems = [
        { emoji: '📺', name: '유튜브 30분 보기', price: 5 },
        { emoji: '🍦', name: '아이스크림 사먹기', price: 7 },
        { emoji: '🎮', name: '게임 30분 하기', price: 8 },
        { emoji: '😴', name: '주말 늦잠 자기', price: 10 },
        { emoji: '🍕', name: '저녁 메뉴 정하기', price: 12 },
        { emoji: '🎡', name: '주말 나들이 가기', price: 30 },
      ];

      for (const item of defaultItems) {
        await sql`
          INSERT INTO shop_items (emoji, name, price)
          VALUES (${item.emoji}, ${item.name}, ${item.price})
        `;
      }
    }

    console.log('✓ Database seeded successfully');
  } catch (error) {
    console.error('Database seeding error:', error);
    throw error;
  }
}
