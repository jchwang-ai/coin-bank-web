'use client';

import { useState } from 'react';
import {
  HIDDEN_COUNT,
  RARITY,
  SHOP_ITEMS,
  SLOTS,
  ShopItem,
  SlotId,
  displayName,
  itemsForSlot,
} from '@/lib/characterShop';
import { playPop, playSoftDown } from '@/lib/sound';

interface CustomShopItem extends ShopItem {
  rowId: string;
}

interface CharacterShopSheetProps {
  gemsLeft: number;
  ownedIds: string[];
  equipped: Record<string, string>;
  customItems: CustomShopItem[];
  onClose: () => void;
  onBuy: (item: ShopItem) => Promise<void>;
  onEquip: (slot: SlotId, itemId: string | null) => Promise<void>;
  onDeleteCustom: (rowId: string) => Promise<void>;
  onOpenWishes: () => void;
}

export default function CharacterShopSheet({
  gemsLeft,
  ownedIds,
  equipped,
  customItems,
  onClose,
  onBuy,
  onEquip,
  onDeleteCustom,
  onOpenWishes,
}: CharacterShopSheetProps) {
  const [slot, setSlot] = useState<SlotId>('hat');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const owned = new Set(ownedIds);
  const hiddenFound = SHOP_ITEMS.filter((i) => i.hidden && owned.has(i.id)).length;
  const customById = new Map(customItems.map((c) => [c.id, c]));

  const handleTap = async (item: ShopItem) => {
    setError('');
    const isOwned = owned.has(item.id);
    const isWorn = equipped[item.slot] === item.id;

    try {
      setBusyId(item.id);
      if (!isOwned) {
        if (gemsLeft < item.cost) {
          playSoftDown();
          setError(`보석이 ${item.cost - gemsLeft}개 더 필요해요 💎`);
          return;
        }
        await onBuy(item);
      } else {
        playPop();
        await onEquip(item.slot, isWorn ? null : item.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 생겼어요');
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up safe-bottom relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10" />

        {/* Header + gem balance */}
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-[18px] font-bold text-[#1c1c1e]">캐릭터 상점 🛍️</p>
            <p className="mt-0.5 text-[12px] text-[#8e8e93]">
              히든 아이템 {hiddenFound}/{HIDDEN_COUNT} 발견
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-3.5 py-1.5 shadow-sm">
            <p className="text-[15px] font-bold text-white">💎 {gemsLeft}</p>
          </div>
        </div>

        {/* Slot tabs */}
        <div className="mb-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSlot(s.id);
                setError('');
                playPop();
              }}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[13px] font-bold transition-all active:scale-95 ${
                slot === s.id ? 'bg-[#1c1c1e] text-white' : 'bg-black/[0.04] text-[#8e8e93]'
              }`}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-2 shrink-0 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-500">
            {error}
          </p>
        )}

        {/* Item grid */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Child-made items come first so a brand-new creation is right there. */}
            {[...customItems.filter((c) => c.slot === slot), ...itemsForSlot(slot)].map((item) => {
              const custom = customById.get(item.id);
              const isOwned = owned.has(item.id);
              const isWorn = equipped[item.slot] === item.id;
              const mystery = item.hidden && !isOwned;
              const affordable = gemsLeft >= item.cost;
              const rarity = RARITY[item.rarity];

              return (
                <div key={item.id} className="relative">
                {/* Delete is a sibling, not nested — nested buttons are invalid HTML */}
                {custom && (
                  <button
                    onClick={async () => {
                      if (!window.confirm(`'${item.name}' 아이템을 지울까요?`)) return;
                      try {
                        setBusyId(item.id);
                        await onDeleteCustom(custom.rowId);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : '지우지 못했어요');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow active:scale-90"
                    aria-label="내가 만든 아이템 지우기"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={() => handleTap(item)}
                  disabled={busyId === item.id}
                  className={`relative flex w-full flex-col items-center gap-1 rounded-2xl p-2.5 pt-3 transition-all active:scale-95 disabled:opacity-60 ${
                    isWorn
                      ? `bg-violet-50 ring-2 ${rarity.ring}`
                      : isOwned
                        ? 'bg-black/[0.03] ring-1 ring-black/5'
                        : affordable
                          ? `bg-white ring-1 ${rarity.ring}`
                          : 'bg-black/[0.03] ring-1 ring-black/5'
                  }`}
                >
                  {/* Rarity chip */}
                  <span
                    className={`absolute left-1.5 top-1.5 rounded-full px-1.5 text-[9px] font-bold ${rarity.chip}`}
                  >
                    {rarity.label}
                  </span>

                  {isWorn && !custom && (
                    <span className="absolute right-1.5 top-1.5 text-[11px]">✅</span>
                  )}

                  {custom && (
                    <span className="absolute left-1.5 top-[18px] rounded-full bg-amber-100 px-1.5 text-[8px] font-bold text-amber-700">
                      내가 만든
                    </span>
                  )}

                  {item.motion && (
                    <span className="absolute right-1.5 bottom-1.5 text-[9px]" title="움직여요">
                      {item.motion === 'fly' ? '🪽' : item.motion === 'hop' ? '👟' : item.motion === 'orbit' ? '🌀' : '💨'}
                    </span>
                  )}

                  {/* Icon — silhouette while it's a mystery */}
                  <span
                    className={`mt-3 text-[34px] leading-none ${
                      mystery ? 'animate-mystery brightness-0 opacity-40' : ''
                    } ${!isOwned && !affordable && !mystery ? 'opacity-45 grayscale' : ''}`}
                  >
                    {item.emoji}
                  </span>

                  <span className="line-clamp-1 text-[11px] font-bold text-[#1c1c1e]">
                    {displayName(item, isOwned)}
                  </span>

                  {mystery && item.teaser && (
                    <span className="line-clamp-1 px-0.5 text-[9px] font-semibold text-violet-400">
                      {item.teaser}
                    </span>
                  )}

                  {isOwned ? (
                    <span className="text-[10px] font-bold text-emerald-600">
                      {isWorn ? '입고 있어요' : '눌러서 입기'}
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] font-bold ${affordable ? 'text-sky-600' : 'text-[#c7c7cc]'}`}
                    >
                      💎 {item.cost}
                    </span>
                  )}
                </button>
                </div>
              );
            })}
          </div>

          {/* Wish box */}
          <button
            onClick={onOpenWishes}
            className="mt-3 w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 px-4 py-3.5 text-center transition-transform active:scale-[0.99]"
          >
            <p className="text-[14px] font-bold text-amber-700">✏️ 추가하고 싶은 아이템을 적으세요</p>
            <p className="mt-0.5 text-[11px] text-amber-600">원하는 아이템을 말해주면 만들어드려요!</p>
          </button>
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
