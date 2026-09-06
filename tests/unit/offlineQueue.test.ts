import { describe, it, expect } from 'vitest';
import {
    detectConflict,
    resolveConflict,
} from '../../src/services/offlineQueue';

describe('offlineQueue — Conflict Detection & Resolution', () => {
    describe('detectConflict', () => {
        it('returns false when server record is null or undefined', () => {
            const local = { id: '1', name: 'Budi', updated_at: '2026-08-01T10:00:00Z' };
            expect(detectConflict(local, null)).toBe(false);
        });

        it('returns false when IDs do not match', () => {
            const local = { id: '1', name: 'Budi', updated_at: '2026-08-01T10:00:00Z' };
            const server = { id: '2', name: 'Ani', updated_at: '2026-08-01T11:00:00Z' };
            expect(detectConflict(local, server)).toBe(false);
        });

        it('returns false when local timestamp is newer than server', () => {
            const local = {
                id: '1',
                name: 'Budi Local',
                _localTimestamp: '2026-08-01T12:00:00Z',
                updated_at: '2026-08-01T10:00:00Z',
            };
            const server = {
                id: '1',
                name: 'Budi Server',
                updated_at: '2026-08-01T11:00:00Z',
            };
            expect(detectConflict(local, server)).toBe(false);
        });

        it('returns true when server timestamp is newer than local and IDs match', () => {
            const local = {
                id: '1',
                name: 'Budi Local',
                _localTimestamp: '2026-08-01T09:00:00Z',
                updated_at: '2026-08-01T09:00:00Z',
            };
            const server = {
                id: '1',
                name: 'Budi Server',
                updated_at: '2026-08-01T10:00:00Z',
            };
            expect(detectConflict(local, server)).toBe(true);
        });
    });

    describe('resolveConflict', () => {
        type TestRecord = { id: string; name: string; score: number; _localTimestamp?: string; updated_at?: string };
        const local: TestRecord = {
            id: '1',
            name: 'Budi Updated Local',
            score: 90,
            _localTimestamp: '2026-08-01T12:00:00Z',
        };
        const server: TestRecord = {
            id: '1',
            name: 'Budi Server Original',
            score: 80,
            updated_at: '2026-08-01T10:00:00Z',
        };

        it('resolves with local_wins strategy', () => {
            const result = resolveConflict(local, server, 'local_wins');
            expect(result).toEqual(local);
        });

        it('resolves with server_wins strategy', () => {
            const result = resolveConflict(local, server, 'server_wins');
            expect(result).toEqual(server);
        });

        it('resolves with merge strategy applying newer local fields', () => {
            const result = resolveConflict(local, server, 'merge') as Record<string, unknown>;
            expect(result.id).toBe('1');
            expect(result.name).toBe('Budi Updated Local');
            expect(result.score).toBe(90);
            expect(result._localTimestamp).toBeUndefined();
        });

        it('resolves with manual strategy returning both versions', () => {
            const result = resolveConflict(local, server, 'manual');
            expect(result).toEqual({
                local,
                server,
                needsManualResolution: true,
            });
        });
    });
});
