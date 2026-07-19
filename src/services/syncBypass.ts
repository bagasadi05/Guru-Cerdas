/**
 * Sync Bypass Service
 * 
 * Provides a counter-based state to safe-guard against race conditions
 * when multiple sync processes (e.g. focus sync, online event, manual sync)
 * are running concurrently.
 * 
 * @module services/syncBypass
 * @since 2.1.0
 */

let bypassDepth = 0;

export const beginSyncBypass = (): void => {
  bypassDepth++;
};

export const endSyncBypass = (): void => {
  bypassDepth = Math.max(0, bypassDepth - 1);
};

export const isSyncBypassActive = (): boolean => {
  return bypassDepth > 0;
};
