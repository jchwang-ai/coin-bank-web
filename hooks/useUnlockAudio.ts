'use client';

import { useEffect } from 'react';
import { unlockAudio } from '@/lib/sound';

/** Warms up the Web Audio context on the first tap so later programmatic
 * sounds (e.g. triggered by polling) aren't blocked by autoplay rules. */
export function useUnlockAudio() {
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
}
