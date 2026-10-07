import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    rows: {} as Record<string, unknown[]>,
    failTable: null as string | null,
    maxRows: 1000,
}));

vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: (table: string) => {
            let from = 0;
            let to = Number.POSITIVE_INFINITY;
            const chain = {
                select: () => chain, eq: () => chain, is: () => chain, in: () => chain, or: () => chain,
                gte: () => chain, lte: () => chain, order: () => chain,
                range: (f: number, t: number) => { from = f; to = t; return chain; },
                then: (resolve: (value: unknown) => void) => {
                    if (table === db.failTable) return resolve({ data: null, error: { message: 'offline' } });
                    const all = db.rows[table] ?? [];
                    // PostgREST caps every response at max_rows, paged or not.
                    const end = Math.min(to + 1, from + db.maxRows);
                    resolve({ data: all.slice(from, end), error: null });
                },
            };
            return chain;
        },
    },
}));

import { fetchAnalyticsData } from '../../src/components/pages/analytics/fetchAnalyticsData';

const params = { userId: 'teacher', classIds: ['c1'], dateRange: '2026-08', semesterId: 'sem-1' };

describe('fetchAnalyticsData', () => {
    beforeEach(() => {
        db.failTable = null;
        db.rows = {
            students: [{ id: 's1', name: 'Ani', class_id: 'c1', gender: 'Perempuan' }],
            attendance: Array.from({ length: 2300 }, (_, i) => ({ student_id: 's1', date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`, status: 'Hadir', notes: null, id: `a${i}` })),
            academic_records: [],
            violations: [],
            quiz_points: [],
            tasks: [],
        };
    });

    it('pages past the 1000-row cap instead of silently truncating', async () => {
        const data = await fetchAnalyticsData(params);
        expect(data.attendance).toHaveLength(2300);
    });

    it.each(['students', 'attendance', 'academic_records', 'violations', 'quiz_points', 'tasks'])(
        'fails loudly when %s cannot be read',
        async (table) => {
            db.failTable = table;
            await expect(fetchAnalyticsData(params)).rejects.toBeTruthy();
        },
    );

    it('normalises subjects so case variants count as one subject', async () => {
        db.rows.academic_records = [
            { student_id: 's1', subject: 'Matematika', assessment_name: 'PH 1', score: 80, created_at: '2026-08-01T03:00:00Z', semester_id: 'sem-1', version: 1 },
            { student_id: 's1', subject: 'matematika ', assessment_name: 'PH 2', score: 70, created_at: '2026-08-08T03:00:00Z', semester_id: 'sem-1', version: 1 },
        ];
        const data = await fetchAnalyticsData(params);
        expect(new Set(data.academicRecords.map((r) => r.subject))).toEqual(new Set(['Matematika']));
    });
});
