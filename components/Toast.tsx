'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export default function Toast({ message, visible, onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    } else {
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '-8px'})`,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <div className="bg-black/80 backdrop-blur-xl rounded-full px-5 py-2.5 shadow-lg">
        <p className="text-white font-medium text-sm whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
}
