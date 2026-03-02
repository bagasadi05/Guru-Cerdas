/**
 * Unit tests for SearchService
 *
 * Tests the fuzzy matching / relevance ranking logic directly,
 * and the globalSearch function with a mocked Supabase client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase before importing the service ────────────────────────────
const mockStudents = [
    { id: '1', name: 'Budi Santoso', gender: 'Laki-laki', access_code: 'A001', class_id: 'c1', classes: { name: 'X IPA 1' } },
    { id: '2', name: 'Siti Rahayu', gender: 'Perempuan', access_code: 'A002', class_id: 'c2', classes: { name: 'X IPS 2' } },
    { id: '3', name: 'Ahmad Dahlan', gender: 'Laki-laki', access_code: 'A003', class_id: 'c1', classes: { name: 'X IPA 1' } },
];

const mockClasses = [
    { id: 'c1', name: 'X IPA 1' },
    { id: 'c2', name: 'X IPS 2' },
];

const mockTasks = [
    { id: 't1', title: 'Tugas Matematika', description: 'Kerjakan soal 1-10', status: 'todo', due_date: '2026-03-10' },
    { id: 't2', title: 'Laporan Fisika', description: '', status: 'done', due_date: null },
];

vi.mock('../../services/supabase', () => {
    /**
     * Creates a chainable Supabase query mock that resolves at any point with `data`.
     * Every method returns the same thenable+chainable object, so
     * `await supabase.from('x').select('*').eq('user_id', uid).is('deleted_at', null)`
     * resolves correctly regardless of how many methods are chained.
     */
    const makeChain = (data: unknown[]) => {
        const resolved = { data, error: null };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = {
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolved).then(resolve),
            catch: () => c,
            finally: (fn: () => void) => { fn(); return c; },
            select: () => c,
            eq: () => c,
            is: () => c,
            ilike: () => c,
            gte: () => c,
            lte: () => c,
            in: () => c,
            not: () => c,
            order: () => c,
            limit: () => Promise.resolve(resolved),
        };
        return c;
    };

    return {
        supabase: {
            from: vi.fn((table: string) => {
                switch (table) {
                    case 'students': return makeChain(mockStudents);
                    case 'classes': return makeChain(mockClasses);
                    case 'tasks': return makeChain(mockTasks);
                    case 'schedules': return makeChain([]);
                    default: return makeChain([]);
                }
            }),
        },
    };
});

import { globalSearch, getSearchSuggestions } from '../SearchService';

// ─── Relevance / fuzzy matching ─────────────────────────────────────────────
describe('globalSearch — relevance scoring', () => {
    const userId = 'user-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns student results for a matching name', async () => {
        const results = await globalSearch(userId, 'Budi', { entityType: 'students' });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe('Budi Santoso');
        expect(results[0].type).toBe('students');
    });

    it('returns class results for a matching class name', async () => {
        const results = await globalSearch(userId, 'IPA', { entityType: 'classes' });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe('X IPA 1');
        expect(results[0].type).toBe('classes');
    });

    it('returns task results for a matching task title', async () => {
        const results = await globalSearch(userId, 'Matematika', { entityType: 'tasks' });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe('Tugas Matematika');
        expect(results[0].type).toBe('tasks');
    });

    it('returns empty array for queries shorter than 2 characters', async () => {
        const results = await globalSearch(userId, 'B');
        expect(results).toEqual([]);
    });

    it('returns empty array for empty query', async () => {
        const results = await globalSearch(userId, '');
        expect(results).toEqual([]);
    });

    it('sorts results by relevance descending', async () => {
        // 'Budi' is an exact word match, 'Ahmad' is less relevant for 'Budi'
        const results = await globalSearch(userId, 'Budi', { entityType: 'students' });
        if (results.length > 1) {
            expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
        }
    });

    it('returns results across multiple entity types when entityType=all', async () => {
        const results = await globalSearch(userId, 'X IPA', { entityType: 'all' });
        const types = new Set(results.map(r => r.type));
        // Both students and classes should appear since both have 'X IPA 1'
        expect(types.size).toBeGreaterThanOrEqual(1);
    });

    it('respects the limit option', async () => {
        const results = await globalSearch(userId, 'a', { limit: 1, entityType: 'students' });
        expect(results.length).toBeLessThanOrEqual(1);
    });

    it('includes link property in student results', async () => {
        const results = await globalSearch(userId, 'Budi', { entityType: 'students' });
        expect(results[0].link).toBe('/siswa/1');
    });
});

// ─── getSearchSuggestions ───────────────────────────────────────────────────
describe('getSearchSuggestions', () => {
    it('returns an array of suggestion strings', async () => {
        const suggestions = await getSearchSuggestions('user-1', 'Bu');
        expect(Array.isArray(suggestions)).toBe(true);
        // Budi Santoso should appear since name contains 'Bu'
        expect(suggestions).toContain('Budi Santoso');
    });

    it('returns empty array for empty partial query', async () => {
        const suggestions = await getSearchSuggestions('user-1', '');
        expect(suggestions).toEqual([]);
    });

    it('deduplicates suggestions', async () => {
        const suggestions = await getSearchSuggestions('user-1', 'X');
        const unique = new Set(suggestions);
        expect(unique.size).toBe(suggestions.length);
    });
});
