import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query. Use it to render only the layout that is
 * actually visible, instead of rendering both and hiding one with CSS.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = () =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
