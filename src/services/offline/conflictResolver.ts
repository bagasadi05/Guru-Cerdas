import type { ConflictResolution } from './types';

/**
 * Resolves a synchronization conflict between local and server data states.
 *
 * Depending on the strategy selected, either the local state wins, the server
 * state wins, fields are merged based on the newest timestamp, or a flag is
 * returned indicating manual resolution is required.
 *
 * @template T - The record structure.
 * @param {T & { _localTimestamp?: string }} local - Local record data.
 * @param {T & { updated_at?: string }} server - Server record data.
 * @param {ConflictResolution} strategy - Resolution strategy to apply.
 * @returns {T | { local: T; server: T; needsManualResolution: true }} The resolved record or resolution details.
 */
export function resolveConflict<T extends Record<string, unknown>>(
    local: T & { _localTimestamp?: string },
    server: T & { updated_at?: string },
    strategy: ConflictResolution
): T | { local: T; server: T; needsManualResolution: true } {
    switch (strategy) {
        case 'local_wins':
            return local;

        case 'server_wins':
            return server;

        case 'merge': {
            // Merge strategy: newer field values win
            const merged = { ...server };
            for (const key of Object.keys(local) as (keyof T)[]) {
                const keyStr = String(key);
                if (keyStr.startsWith('_')) continue; // Skip internal fields

                const localTime = new Date(local._localTimestamp || 0).getTime();
                const serverTime = new Date(server.updated_at || 0).getTime();

                if (localTime > serverTime) {
                    (merged as Record<string, unknown>)[keyStr] = local[key];
                }
            }
            return merged as T;
        }

        case 'manual':
            // Return both for manual resolution
            return { local, server, needsManualResolution: true };

        default:
            return server;
    }
}

/**
 * Detects if a synchronization conflict exists between a local record and server record.
 *
 * A conflict is defined when the server record has a newer updated timestamp
 * than the local record's timestamp and both share the same identifier.
 *
 * @template T - The record structure.
 * @param {T} local - Local record data.
 * @param {T | null} server - Server record data.
 * @returns {boolean} True if a synchronization conflict is detected, otherwise false.
 */
export function detectConflict<T extends Record<string, unknown> & { id?: string; updated_at?: string; _localTimestamp?: string }>(
    local: T,
    server: T | null
): boolean {
    if (!server) return false;

    const localTime = new Date(local._localTimestamp || local.updated_at || 0).getTime();
    const serverTime = new Date(server.updated_at || 0).getTime();

    // Conflict if server has newer data than our local timestamp
    return serverTime > localTime && local.id === server.id;
}
