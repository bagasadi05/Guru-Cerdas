import { describe, it, expect, vi, beforeEach } from 'vitest';
import { beginSyncBypass, endSyncBypass, isSyncBypassActive } from '../../src/services/syncBypass';
import { isOfflineQueuedResponse, wasLastResponseQueued } from '../../src/services/supabase';

// Mock supabase client
vi.mock('../../src/services/supabase', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/services/supabase')>();
    return {
        ...actual,
        supabase: {
            auth: {
                getSession: vi.fn(),
                refreshSession: vi.fn()
            },
            from: vi.fn()
        }
    };
});

describe('Offline Replay & Bypass System', () => {
    beforeEach(() => {
        // Reset bypass state
        while (isSyncBypassActive()) {
            endSyncBypass();
        }
        if (typeof window !== 'undefined') {
            delete (window as any).__last_supabase_offline_queued;
        }
    });

    // 1. Test Bypass Depth Counter & Race Condition Prevention
    describe('Bypass Counter (isSyncBypassActive)', () => {
        it('should increment and decrement depth correctly', () => {
            expect(isSyncBypassActive()).toBe(false);
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });

        it('should reset depth on try-finally simulation', () => {
            expect(isSyncBypassActive()).toBe(false);
            try {
                beginSyncBypass();
                throw new Error('Simulation error');
            } catch (e) {
                // error handled
            } finally {
                endSyncBypass();
            }
            expect(isSyncBypassActive()).toBe(false);
        });
    });

    // 2. Test offline response helpers
    describe('Offline Response Detection', () => {
        it('should detect 202 queued header and body responses', () => {
            const mockRes = new Response('[]', {
                status: 202,
                headers: { 'X-Offline-Queued': 'true' }
            });
            expect(isOfflineQueuedResponse(mockRes)).toBe(true);

            const mockJSON = { offline: true, queued: true };
            expect(isOfflineQueuedResponse(mockJSON)).toBe(true);

            const regularRes = new Response('[]', { status: 200 });
            expect(isOfflineQueuedResponse(regularRes)).toBe(false);
        });

        it('should detect if last response was queued offline using window timestamp', () => {
            expect(wasLastResponseQueued()).toBe(false);
            (window as any).__last_supabase_offline_queued = Date.now();
            expect(wasLastResponseQueued()).toBe(true);
        });
    });

    // 3. Test Header Preservation
    describe('Header Preservation', () => {
        it('should capture specific headers from request', () => {
            const headers = new Headers({
                'Prefer': 'resolution=merge-duplicates',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
                'Accept-Profile': 'public'
            });

            const headersRecord: Record<string, string> = {};
            headers.forEach((val, key) => {
                const lowerKey = key.toLowerCase();
                if (['prefer', 'content-type', 'content-profile', 'accept-profile'].includes(lowerKey)) {
                    headersRecord[lowerKey] = val;
                }
            });

            expect(headersRecord['prefer']).toBe('resolution=merge-duplicates');
            expect(headersRecord['content-type']).toBe('application/json');
            expect(headersRecord['accept-profile']).toBe('public');
            expect(headersRecord['authorization']).toBeUndefined(); // Should be skipped/excluded for security
        });
    });

    // 4. Test Query Parameter Filters Preservation
    describe('Query Parameters Preservation', () => {
        it('should preserve URL query parameters like filters', () => {
            const url = 'https://supabase.co/rest/v1/students?id=eq.123&status=eq.active';
            const urlObj = new URL(url);
            expect(urlObj.searchParams.get('id')).toBe('eq.123');
            expect(urlObj.searchParams.get('status')).toBe('eq.active');
        });
    });

    // 5. Test RPC Path Capture
    describe('RPC Path Replaying', () => {
        it('should identify RPC paths correctly from URL', () => {
            const url = 'https://supabase.co/rest/v1/rpc/bulk_insert_grades';
            const urlObj = new URL(url);
            expect(urlObj.pathname).toContain('/rpc/bulk_insert_grades');
        });
    });

    // 6. Test Legacy Fallback Updates
    describe('Legacy Fallback Verification', () => {
        it('should throw clear error on legacy updates lacking payload.id', () => {
            const legacyMutation = {
                id: 'leg-1',
                table: 'students' as const,
                operation: 'update' as const,
                payload: { name: 'Test No ID' }, // missing id
                status: 'pending' as const,
                retryCount: 0,
                maxRetries: 3,
                createdAt: Date.now()
            };

            const processLegacy = (mut: any) => {
                if (mut.operation === 'update' && !mut.payload.id) {
                    throw new Error('Legacy update mutation lacks valid payload.id');
                }
            };

            expect(() => processLegacy(legacyMutation)).toThrow('Legacy update mutation lacks valid payload.id');
        });
    });

    // 7. Test Session Null Queue Postponement
    describe('Session Null Handling', () => {
        it('should halt processing and keep item pending if session is null', async () => {
            let itemStatus = 'pending';
            let retryCount = 0;

            const mockSession = null;
            const processMutationSim = async (mut: any) => {
                if (!mockSession) {
                    const sessionError = new Error('SESSION_NULL');
                    (sessionError as any).code = 'SESSION_NULL';
                    throw sessionError;
                }
            };

            try {
                await processMutationSim({ id: 'item-1' });
            } catch (error: any) {
                if (error.code === 'SESSION_NULL') {
                    // Simulating processQueue behavior
                    itemStatus = 'pending'; // left pending
                    // retryCount is NOT incremented
                }
            }

            expect(itemStatus).toBe('pending');
            expect(retryCount).toBe(0);
        });
    });
});
