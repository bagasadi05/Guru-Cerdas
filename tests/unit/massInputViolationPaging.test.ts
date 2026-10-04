import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({ supabase: {} }));

import { fetchAllViolationPages } from '../../src/components/pages/mass-input/hooks/useMassInputData';

const rows = (n: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: `v-${offset + i}`, student_id: 's-1' }));

describe('fetchAllViolationPages', () => {
    it('keeps requesting until a short page, so >1000 rows are not truncated', async () => {
        const fetchPage = vi.fn(async (from: number, to: number) => {
            const total = 1116;
            const n = Math.max(0, Math.min(to, total - 1) - from + 1);
            return { data: rows(n, from), error: null };
        });

        const result = await fetchAllViolationPages(fetchPage);

        expect(result).toHaveLength(1116);
        expect(fetchPage.mock.calls).toEqual([[0, 999], [1000, 1999]]);
        expect(new Set(result.map((r) => r.id)).size).toBe(1116);
    });

    it('stops after one request when the first page is short', async () => {
        const fetchPage = vi.fn(async () => ({ data: rows(30), error: null }));
        expect(await fetchAllViolationPages(fetchPage)).toHaveLength(30);
        expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('propagates errors', async () => {
        const fetchPage = vi.fn(async () => ({ data: null, error: new Error('boom') }));
        await expect(fetchAllViolationPages(fetchPage)).rejects.toThrow('boom');
    });
});
