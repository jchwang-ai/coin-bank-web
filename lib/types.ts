export type Role = 'parent' | 'child';

export interface ParentConfig {
  id: string;
  pin: string;
  email: string;
  created_at: Date;
}

export interface ChildAccount {
  id: string;
  pin: string;
  balance: number;
  created_at: Date;
}

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  created_at: Date;
}

export interface Coupon {
  id: string;
  shop_item_id: string;
  shop_item?: ShopItem;
  used: boolean;
  purchased_at: Date;
  used_at: Date | null;
}

export interface Transaction {
  id: string;
  type: 'give' | 'buy' | 'use';
  amount: number;
  description: string;
  created_at: Date;
}

export interface AccessLog {
  id: string;
  role: Role;
  user_agent: string;
  ip_address: string;
  logged_in_at: Date;
  logged_out_at: Date | null;
}

export interface Session {
  role: Role;
  logId: string;
  loginTime: Date;
}
