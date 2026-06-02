/**
 * @fileoverview Lightweight real-time clock hook.
 *
 * Isolates the 1-second `setInterval` so only the component that actually
 * displays the clock re-renders — not the entire 900+ line DashboardPage.
 *
 * @module hooks/useClock
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Returns the current `Date`, updated every second.
 *
 * The interval is cleaned up automatically on unmount.
 *
 * @example
 * ```tsx
 * function ClockBadge() {
 *   const currentTime = useClock();
 *   return <span>{currentTime.toLocaleTimeString('id-ID')}</span>;
 * }
 * ```
 */
export function useClock(intervalMs: number = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return now;
}
