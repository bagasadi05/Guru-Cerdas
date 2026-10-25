import { describe, it, expect } from 'vitest';
import * as offlineFacade from '../../src/services/offlineQueue';
import * as offlineModule from '../../src/services/offline';

describe('Offline Modular Services', () => {
    it('re-exports all functional and class-based queue primitives from facade', () => {
        expect(typeof offlineFacade.addToQueue).toBe('function');
        expect(typeof offlineFacade.getQueue).toBe('function');
        expect(typeof offlineFacade.clearQueue).toBe('function');
        expect(typeof offlineFacade.processQueue).toBe('function');
        expect(typeof offlineFacade.detectConflict).toBe('function');
        expect(typeof offlineFacade.resolveConflict).toBe('function');
        expect(typeof offlineFacade.cacheData).toBe('function');
        expect(typeof offlineFacade.getCachedData).toBe('function');
        expect(typeof offlineFacade.invalidateCache).toBe('function');
        expect(typeof offlineFacade.registerBackgroundSync).toBe('function');

        expect(offlineFacade.addToQueue).toBe(offlineModule.addToQueue);
        expect(offlineFacade.detectConflict).toBe(offlineModule.detectConflict);
        expect(offlineFacade.resolveConflict).toBe(offlineModule.resolveConflict);
        expect(offlineFacade.offlineQueue).toBe(offlineModule.offlineQueue);
    });

    describe('Conflict Resolver Module', () => {
        type TestRecord = { id: string; name: string; note: string; _localTimestamp?: string; updated_at?: string };

        const local: TestRecord = {
            id: 'rec-1',
            name: 'Local Name',
            note: 'Local Note',
            _localTimestamp: '2026-10-25T10:00:00Z',
        };

        const server: TestRecord = {
            id: 'rec-1',
            name: 'Server Name',
            note: 'Server Note',
            updated_at: '2026-10-25T11:00:00Z',
        };

        it('detects a conflict when server timestamp is newer than local timestamp', () => {
            expect(offlineModule.detectConflict(local, server)).toBe(true);
        });

        it('does not detect conflict when server is null or older', () => {
            expect(offlineModule.detectConflict(local, null)).toBe(false);
            const olderServer: TestRecord = { ...server, updated_at: '2026-10-25T09:00:00Z' };
            expect(offlineModule.detectConflict(local, olderServer)).toBe(false);
        });

        it('resolves with local_wins strategy', () => {
            const result = offlineModule.resolveConflict(local, server, 'local_wins');
            expect(result).toEqual(local);
        });

        it('resolves with server_wins strategy', () => {
            const result = offlineModule.resolveConflict(local, server, 'server_wins');
            expect(result).toEqual(server);
        });

        it('resolves with merge strategy favoring newer local fields', () => {
            const localNewer: TestRecord = {
                ...local,
                _localTimestamp: '2026-10-25T12:00:00Z',
                name: 'Brand New Local Name',
            };
            const result = offlineModule.resolveConflict(localNewer, server, 'merge');
            expect(result).toEqual({
                id: 'rec-1',
                name: 'Brand New Local Name',
                note: 'Local Note',
                updated_at: '2026-10-25T11:00:00Z',
            });
        });

        it('flags needsManualResolution when strategy is manual', () => {
            const result = offlineModule.resolveConflict(local, server, 'manual');
            expect(result).toEqual({
                local,
                server,
                needsManualResolution: true,
            });
        });
    });

    describe('OfflineQueueService Instance', () => {
        it('provides singleton methods on offlineQueue', () => {
            expect(offlineModule.offlineQueue).toBeDefined();
            expect(typeof offlineModule.offlineQueue.add).toBe('function');
            expect(typeof offlineModule.offlineQueue.getQueue).toBe('function');
            expect(typeof offlineModule.offlineQueue.clear).toBe('function');
            expect(typeof offlineModule.offlineQueue.subscribe).toBe('function');
        });
    });
});
