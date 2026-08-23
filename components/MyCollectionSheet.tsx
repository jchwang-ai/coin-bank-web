'use client';

import { RARITY, SHOP_ITEMS, SLOTS, SlotId, itemById } from '@/lib/characterShop';
import { playPop } from '@/lib/sound';

interface MyCollectionSheetProps {
  ownedIds: string[];
  equipped: Record<string, string>;
  gemsEarned: number;
  gemsSpent: number;
  onClose: () => void;
  onEquip: (slot: SlotId, itemId: string | null) => Promise<void>;
}

/** "내가 모은 것" — everything bought so far, grouped by slot, with equip toggles. */
export default function MyCollectionSheet({
  ownedIds,
  equipped,
  gemsEarned,
  gemsSpent,
  onClose,
  onEquip,
}: MyCollectionSheetProps) {
  const owned = new Set(ownedIds);
  const ownedItems = SHOP_ITEMS.filter((i) => owned.has(i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up safe-bottom relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10" />

        <p className="shrink-0 text-[18px] font-bold text-[#1c1c1e]">내가 모은 것 🎒</p>
        <p className="mb-3 mt-0.5 shrink-0 text-[12px] text-[#8e8e93]">
          모은 아이템 {ownedItems.length}/{SHOP_ITEMS.length} · 💎 모은 보석 {gemsEarned} · 쓴 보석 {gemsSpent}
        </p>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {ownedItems.length === 0 ? (
            <div className="rounded-2xl bg-black/[0.03] py-14 text-center">
              <p className="text-4xl">🎒</p>
              <p className="mt-3 text-[15px] font-semibold text-[#1c1c1e]">아직 모은 게 없어요</p>
              <p className="mt-1 text-[13px] text-[#8e8e93]">
                영어 단어를 공부해서 보석을 모아보세요!
              </p>
            </div>
          ) : (
            SLOTS.map((s) => {
              const items = ownedItems.filter((i) => i.slot === s.id);
              if (items.length === 0) return null;
              const wornHere = equipped[s.id];

              return (
                <div key={s.id} className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13px] font-bold text-[#1c1c1e]">
                      {s.emoji} {s.label} <span className="text-[#c7c7cc]">({items.length})</span>
                    </p>
                    {wornHere && (
                      <button
                        onClick={async () => {
                          playPop();
                          await onEquip(s.id, null);
                        }}
                        className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-bold text-[#8e8e93] active:scale-90"
                      >
                        벗기
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {items.map((item) => {
                      const isWorn = wornHere === item.id;
                      const rarity = RARITY[item.rarity];
                      return (
                        <button
                          key={item.id}
                          onClick={async () => {
                            playPop();
                            await onEquip(s.id, isWorn ? null : item.id);
                          }}
                          className={`animate-pop-in flex flex-col items-center gap-0.5 rounded-2xl py-2.5 transition-all active:scale-95 ${
                            isWorn ? `bg-violet-50 ring-2 ${rarity.ring}` : 'bg-black/[0.03]'
                          }`}
                        >
                          <span className="text-[26px] leading-none">{item.emoji}</span>
                          <span className="line-clamp-1 px-1 text-[9px] font-bold text-[#1c1c1e]">
                            {item.name}
                          </span>
                          {isWorn && <span className="text-[9px] font-bold text-violet-500">착용중</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 shrink-0 rounded-xl bg-black/5 py-3.5 font-semibold text-[#8e8e93] transition-transform active:scale-[0.98]"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
