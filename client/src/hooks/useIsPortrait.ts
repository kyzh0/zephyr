import { useState, useEffect } from 'react';

export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handle = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  return isPortrait;
}
