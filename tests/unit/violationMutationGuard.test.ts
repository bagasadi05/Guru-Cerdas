import { describe, it, expect, vi, beforeEach } from 'vitest';

const inCalls: string[][] = [];
const inserted: { student_id: string }[][] = [];

// Minimal chainable stand-in for the supabase query builder.
function guardQuery(existingIds: Set<string>) {
    let ids: string[] = [];
    const q: Record<string, unknown> = {
        select: () => q,
        in: (_col: string, values: string[]) => { ids = values; inCalls.push(values); return q; },
        eq: () => q,
        is: () => q,
        then: (resolve: (v: unknown) => void) =>
            resolve({ data: ids.filter((id) => existingIds.has(id)).map((student_id) => ({ student_id })), error: null }),
    };
    return q;
}

let existing = new Set<string>();
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: () => ({
            ...guardQuery(existing),
            insert: (rows: { student_id: string }[]) => {
                inserted.push(rows);
                return { select: async () => ({ data: rows.map((_, i) => ({ id: `v-${i}` })), error: null }) };
            },
        }),
    },
}));
vi.mock('../../src/services/UndoManager', () => ({ recordAction: vi.fn() }));

import { executeViolationMutation } from '../../src/components/pages/mass-input/hooks/mutations/useViolationMutation';

const base = {
    user: { id: 'u-1' } as never,
    selectedViolation: { code: '01', description: 'Terlambat masuk sekolah', points: 3, category: 'Ringan', bintangAspect: 'KEDISIPLINAN' } as const,
    violationDate: '2026-10-03',
    violationNotes: '',
    activeSemester: { id: 'sem-1' },
    shouldBypassGuard: false,
};

describe('executeViolationMutation duplicate guard', () => {
    beforeEach(() => { inCalls.length = 0; inserted.length = 0; existing = new Set(); });

    it('splits a large selection into chunks of 100 ids', async () => {
        const ids = Array.from({ length: 250 }, (_, i) => `s-${i}`);
        await executeViolationMutation({ ...base, selectedStudentIds: new Set(ids) });
        expect(inCalls.map((c) => c.length)).toEqual([100, 100, 50]);
        expect(inserted[0]).toHaveLength(250);
    });

    it('skips students found as duplicates in any chunk', async () => {
        existing = new Set(['s-5', 's-150']);
        const ids = Array.from({ length: 200 }, (_, i) => `s-${i}`);
        const msg = await executeViolationMutation({ ...base, selectedStudentIds: new Set(ids) });
        expect(inserted[0]).toHaveLength(198);
        expect(inserted[0].some((r) => r.student_id === 's-150')).toBe(false);
        expect(msg).toContain('2 siswa');
    });
});
