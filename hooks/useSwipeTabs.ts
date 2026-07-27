'use client';

import { useRef } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Enables horizontal swipe-to-switch between tabs in a fixed order.
 * Swiping left moves to the next tab, swiping right moves to the previous tab.
 * Clamps at the first/last tab instead of wrapping around.
 */
export function useSwipeTabs(
  tabIds: string[],
  activeId: string,
  onChange: (id: string) => void,
  threshold = 45
): SwipeHandlers {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!tracking.current || startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // If the gesture is clearly more vertical than horizontal, stop tracking
    // so page scrolling isn't hijacked.
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      tracking.current = false;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!tracking.current || startX.current === null || startY.current === null) {
      startX.current = null;
      startY.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    startX.current = null;
    startY.current = null;
    tracking.current = false;

    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    const idx = tabIds.indexOf(activeId);
    if (idx === -1) return;

    if (dx < 0 && idx < tabIds.length - 1) {
      onChange(tabIds[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      onChange(tabIds[idx - 1]);
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
