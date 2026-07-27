'use client';

import { useRef, useState } from 'react';

interface SwipeableViewsProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: React.ReactNode[];
}

export default function SwipeableViews({ activeIndex, onIndexChange, children }: SwipeableViewsProps) {
  const count = children.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const verticalGesture = useRef(false);
  const width = useRef(0);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    verticalGesture.current = false;
    width.current = containerRef.current?.offsetWidth || 1;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!verticalGesture.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      verticalGesture.current = true;
    }
    if (verticalGesture.current) return;

    // Rubber-band resistance past the first/last panel
    let next = dx;
    if (activeIndex === 0 && dx > 0) next = dx * 0.35;
    if (activeIndex === count - 1 && dx < 0) next = dx * 0.35;
    setDragX(next);
  };

  const finish = (newIndex: number) => {
    setDragX(0);
    setIsDragging(false);
    startX.current = null;
    startY.current = null;
    if (newIndex !== activeIndex) onIndexChange(newIndex);
  };

  const onTouchEnd = () => {
    if (verticalGesture.current || startX.current === null) {
      setDragX(0);
      setIsDragging(false);
      startX.current = null;
      startY.current = null;
      return;
    }
    const threshold = width.current * 0.18;
    if (dragX < -threshold && activeIndex < count - 1) {
      finish(activeIndex + 1);
    } else if (dragX > threshold && activeIndex > 0) {
      finish(activeIndex - 1);
    } else {
      finish(activeIndex);
    }
  };

  const dragPercent = width.current ? (dragX / width.current) * 100 : 0;
  const translate = -(activeIndex * 100) + dragPercent;

  return (
    <div ref={containerRef} className="overflow-hidden touch-pan-y">
      <div
        className="flex items-start"
        style={{
          transform: `translateX(${translate}%)`,
          transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children.map((child, i) => (
          <div key={i} className="w-full shrink-0 px-5">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
