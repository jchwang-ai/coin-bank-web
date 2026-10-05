import { ShopItem, SlotId } from '@/lib/characterShop';
import { CareKind, FoodId, PetState } from '@/lib/petCare';
import { LineKey } from '@/lib/petLines';

export type SceneId = 'living' | 'kitchen' | 'bath' | 'groom' | 'walk' | 'bed';

export const SCENES: Array<{ id: SceneId; label: string; emoji: string }> = [
  { id: 'living', label: '거실', emoji: '🏠' },
  { id: 'kitchen', label: '부엌', emoji: '🍽️' },
  { id: 'bath', label: '욕실', emoji: '🛁' },
  { id: 'groom', label: '미용실', emoji: '🪮' },
  { id: 'walk', label: '산책', emoji: '🌳' },
  { id: 'bed', label: '침실', emoji: '🌙' },
];

export interface CareResult {
  state: PetState;
  xpGained: number;
  found: FoodId | null;
}

/** Everything a scene needs, handed down by CareRoom. */
export interface SceneCtx {
  animalId: string | null;
  emoji: string;
  buddyName: string;
  pet: PetState;
  /** Sprite size that fits the screen. */
  size: number;
  accessories: { hat?: string; face?: string; held?: string };
  say: (key: LineKey | { text: string }, mood?: 'happy' | 'sad' | 'normal') => void;
  /** Finishes a care activity on the server (handles errors and level-ups). */
  care: (kind: CareKind) => Promise<CareResult | null>;
  feed: (foodId: FoodId) => Promise<{ favorite: boolean } | null>;
  buy: (foodId: FoodId, qty: number) => Promise<boolean>;
  setHue: (hue: number) => Promise<void>;
  gemsLeft: number;
  go: (scene: SceneId) => void;
  /** A little 💩 waiting to be cleaned up. */
  poop: boolean;
  setPoop: (v: boolean) => void;
  dressItems: ShopItem[];
  equipped: Record<string, string>;
  onEquip: (slot: SlotId, itemId: string | null) => Promise<void>;
  toast: (msg: string) => void;
}
