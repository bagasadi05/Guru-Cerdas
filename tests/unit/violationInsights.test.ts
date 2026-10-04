import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({ supabase: {} }));

import { getFrequentViolations, buildViolationStatusMap } from '../../src/components/pages/mass-input/violationInsights';

const row = (over: Record<string, unknown>) => ({
    student_id: 's-1', date: '2026-10-03', description: 'Terlambat masuk sekolah',
    points: 3, semester_id: 'sem-1', type: '01', ...over,
});

describe('getFrequentViolations', () => {
    it('ranks by frequency and maps legacy "general" rows by description', () => {
        const rows = [
            row({ type: '02', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)' }),
            row({ type: 'general', description: 'Tidak memperhatikan saat KBM' }),
            row({ type: '11', description: 'Tidak memperhatikan saat KBM' }),
            row({ type: '11', description: 'Tidak memperhatikan saat KBM' }),
        ];
        const codes = getFrequentViolations(rows, 3).map((v) => v.code);
        expect(codes).toEqual(['11', '02', '01']);
    });

    it('falls back to catalogue order with no history', () => {
        expect(getFrequentViolations(undefined, 2).map((v) => v.code)).toEqual(['01', '02']);
    });
});

describe('buildViolationStatusMap', () => {
    const rows = [
        row({}),
        row({ date: '2026-09-01' }),
        row({ student_id: 's-2', semester_id: 'old', date: '2026-10-03' }),
        row({ student_id: 's-3', description: 'Berkata kotor', points: 10 }),
    ];

    it('flags same violation on the same date and sums semester points', () => {
        const map = buildViolationStatusMap(rows, { description: 'Terlambat masuk sekolah', date: '2026-10-03', semesterId: 'sem-1' });
        expect(map.get('s-1')).toEqual({ recordedOnDate: true, semesterPoints: 6 });
        // Other semester: the save guard wouldn't match it, so neither does the badge.
        expect(map.get('s-2')).toBeUndefined();
        expect(map.get('s-3')).toEqual({ recordedOnDate: false, semesterPoints: 10 });
    });

    it('does not flag anything when no violation is chosen', () => {
        const map = buildViolationStatusMap(rows, { date: '2026-10-03', semesterId: 'sem-1' });
        expect([...map.values()].some((s) => s.recordedOnDate)).toBe(false);
    });
});
