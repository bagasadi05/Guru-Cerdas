import { describe, it, expect } from 'vitest';
import { findSemesterForDate } from '../../src/utils/semesterUtils';

const semesters = [
    { id: 'ganjil-26', start_date: '2026-07-01', end_date: '2026-12-31', deleted_at: null },
    { id: 'genap-27', start_date: '2027-01-01', end_date: '2027-06-30', deleted_at: null },
    { id: 'old', start_date: '2026-07-01', end_date: '2026-12-31', deleted_at: '2026-08-01' },
];

describe('findSemesterForDate', () => {
    it('files a back-dated December record under Ganjil even when Genap is active', () => {
        expect(findSemesterForDate(semesters, '2026-12-20')?.id).toBe('ganjil-26');
    });

    it('includes both boundary days', () => {
        expect(findSemesterForDate(semesters, '2026-12-31')?.id).toBe('ganjil-26');
        expect(findSemesterForDate(semesters, '2027-01-01')?.id).toBe('genap-27');
    });

    it('accepts full ISO timestamps', () => {
        expect(findSemesterForDate(semesters, '2027-02-10T08:00:00Z')?.id).toBe('genap-27');
    });

    it('returns null outside every range or without input', () => {
        expect(findSemesterForDate(semesters, '2025-01-01')).toBeNull();
        expect(findSemesterForDate(undefined, '2026-10-03')).toBeNull();
        expect(findSemesterForDate(semesters, '')).toBeNull();
    });
});
