import { sql } from '@vercel/postgres';
import { Role } from './types';

// Simple PIN verification (base64 encoding for demo - use bcrypt in production)
export function encryptPin(pin: string): string {
  return Buffer.from(pin).toString('base64');
}

export function verifyPin(inputPin: string, storedPin: string): boolean {
  return encryptPin(inputPin) === storedPin;
}

// Authenticate user by PIN
export async function authenticate(role: Role, pin: string) {
  try {
    if (role === 'parent') {
      const result = await sql`
        SELECT id, pin FROM parent_config LIMIT 1
      `;
      if (result.rows.length === 0) {
        return null;
      }
      const parent = result.rows[0] as any;
      if (verifyPin(pin, parent.pin)) {
        return { id: parent.id, role: 'parent' };
      }
    } else if (role === 'child') {
      const result = await sql`
        SELECT id, pin FROM child_account LIMIT 1
      `;
      if (result.rows.length === 0) {
        return null;
      }
      const child = result.rows[0] as any;
      if (verifyPin(pin, child.pin)) {
        return { id: child.id, role: 'child' };
      }
    }
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Log access
export async function logAccess(
  role: Role,
  userAgent: string,
  ipAddress: string
): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO access_logs (role, user_agent, ip_address)
      VALUES (${role}, ${userAgent}, ${ipAddress})
      RETURNING id
    `;
    return (result.rows[0] as any).id;
  } catch (error) {
    console.error('Error logging access:', error);
    throw error;
  }
}

// Log logout
export async function logLogout(logId: string) {
  try {
    await sql`
      UPDATE access_logs
      SET logged_out_at = CURRENT_TIMESTAMP
      WHERE id = ${logId}
    `;
  } catch (error) {
    console.error('Error logging logout:', error);
  }
}
