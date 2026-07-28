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
  name: string;
  photo_data: string | null;
  created_at: Date;
}

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  sort_order: number | null;
  created_at: Date;
}

export type ShopItemRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ShopItemRequest {
  id: string;
  emoji: string;
  name: string;
  requested_price: number;
  final_price: number | null;
  status: ShopItemRequestStatus;
  requested_at: Date;
  resolved_at: Date | null;
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

export interface Mission {
  id: string;
  emoji: string;
  name: string;
  reward: number;
  sort_order: number | null;
  created_at: Date;
}

export type MissionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface MissionRequest {
  id: string;
  mission_id: string | null;
  is_custom: boolean;
  emoji: string;
  name: string;
  reward: number | null;
  photo_data: string | null;
  status: MissionRequestStatus;
  requested_at: Date;
  resolved_at: Date | null;
}

export interface AccessLog {
  id: string;
  role: Role;
  user_agent: string;
  ip_address: string;
  logged_in_at: Date;
  logged_out_at: Date | null;
}

export interface ActivityLog {
  id: string;
  actor: Role;
  action: string;
  detail: string | null;
  created_at: Date;
}

export interface Session {
  role: Role;
  logId: string;
  loginTime: Date;
}
