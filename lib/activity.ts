import { sql } from '@vercel/postgres';

export async function logActivity(actor: 'parent' | 'child', action: string, detail?: string) {
  try {
    await sql`
      INSERT INTO activity_logs (actor, action, detail)
      VALUES (${actor}, ${action}, ${detail || null})
    `;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
