'use client';

import { useRef, useState } from 'react';

interface ReorderableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  disabled?: boolean;
}

export default function ReorderableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled,
}: ReorderableListProps<T>) {
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const startYRef = useRef(0);
  const rowHeightsRef = useRef<number[]>([]);
  const dragIndexRef = useRef<number>(-1);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    dragIndexRef.current = index;
    rowHeightsRef.current = items.map((it) => rowRefs.current.get(it.id)?.offsetHeight || 64);
    setDragId(id);
    setOverIndex(index);
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    e.stopPropagation();
    const dy = e.clientY - startYRef.current;
    setDragOffset(dy);

    const heights = rowHeightsRef.current;
    const idx = dragIndexRef.current;
    let target = idx;

    if (dy > 0) {
      let acc = 0;
      for (let i = idx; i < heights.length - 1; i++) {
        acc += heights[i + 1];
        if (dy > acc - heights[i + 1] / 2) target = i + 1;
      }
    } else if (dy < 0) {
      let acc = 0;
      for (let i = idx; i > 0; i--) {
        acc += heights[i - 1];
        if (-dy > acc - heights[i - 1] / 2) target = i - 1;
      }
    }
    target = Math.max(0, Math.min(items.length - 1, target));
    setOverIndex(target);
  };

  const finishDrag = () => {
    if (!dragId) return;
    const from = dragIndexRef.current;
    const to = overIndex ?? from;
    if (from !== to) {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    }
    setDragId(null);
    setDragOffset(0);
    setOverIndex(null);
    dragIndexRef.current = -1;
  };

  return (
    <div>
      {items.map((item, index) => {
        const isDragging = item.id === dragId;
        let translateY = 0;
        if (dragId && !isDragging && overIndex !== null) {
          const from = dragIndexRef.current;
          const to = overIndex;
          const h = rowRefs.current.get(item.id)?.offsetHeight || 64;
          if (from < to && index > from && index <= to) translateY = -h;
          else if (from > to && index >= to && index < from) translateY = h;
        }

        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) rowRefs.current.set(item.id, el);
            }}
            style={{
              transform: isDragging ? `translateY(${dragOffset}px)` : `translateY(${translateY}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              position: 'relative',
              zIndex: isDragging ? 10 : 1,
            }}
            className={isDragging ? 'shadow-xl bg-white rounded-2xl' : ''}
          >
            <div className="flex items-center">
              <div className="flex-1 min-w-0">{renderItem(item, isDragging)}</div>
              {!disabled && (
                <button
                  onPointerDown={(e) => handlePointerDown(e, item.id, index)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="w-10 h-10 flex items-center justify-center text-[#c7c7cc] text-xl shrink-0 cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  aria-label="순서 바꾸기"
                >
                  ⠿
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
