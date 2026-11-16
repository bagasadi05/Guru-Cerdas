import { describe, it, expect } from 'vitest';
import {
    ACADEMIC_TONE_THRESHOLDS,
    averageScore,
    attendanceRate,
    computeSubjectAverages,
    computeTrendFromRecords,
    engagementScore,
    getAcademicTone,
    getAttendanceTone,
    getBehaviorTone,
} from '../../src/services/childDevelopmentStats';

describe('childDevelopmentStats — averageScore (CD2 canonical)', () => {
    it('uses the mean of ALL records, not a mean of per-subject means', () => {
        // Matematika: 3 record rata 90; Seni: 1 record 60.
        // Mean-of-means = 75; mean-all = (90*3 + 60) / 4 = 82.5 -> 83.
        const records = [
            { subject: 'Matematika', score: 90 },
            { subject: 'Matematika', score: 90 },
            { subject: 'Matematika', score: 90 },
            { subject: 'Seni', score: 60 },
        ];
        expect(averageScore(records)).toBe(83);
    });

    it('returns 0 for empty input', () => {
        expect(averageScore([])).toBe(0);
    });
});

describe('childDevelopmentStats — engagementScore (CD4 single source)', () => {
    it('prefers total points when any exist', () => {
        expect(engagementScore([{ points: 30 }, { points: 5 }])).toBe(100);
        expect(engagementScore([{ points: 10 }])).toBe(50);
    });

    it('falls back to activity count when no points exist', () => {
        expect(engagementScore([{ points: 0 }, { points: 0 }, { points: 0 }, { points: 0 }])).toBe(60);
    });
});

describe('childDevelopmentStats — attendanceRate', () => {
    it('normalizes status case/whitespace and returns 100 for empty', () => {
        expect(attendanceRate([{ status: ' hadir ' }, { status: 'Hadir' }, { status: 'alpa' }])).toBe(67);
        expect(attendanceRate([])).toBe(100);
    });
});

describe('childDevelopmentStats — tone thresholds (CD4)', () => {
    it('academic tone follows the canonical 85/75/65 scale', () => {
        expect(getAcademicTone(ACADEMIC_TONE_THRESHOLDS.sangatBaik)).toBe('success');
        expect(getAcademicTone(84)).toBe('info');
        expect(getAcademicTone(ACADEMIC_TONE_THRESHOLDS.baik)).toBe('info');
        expect(getAcademicTone(ACADEMIC_TONE_THRESHOLDS.cukup)).toBe('warning');
        expect(getAcademicTone(64)).toBe('danger');
    });

    it('attendance and behavior tones follow their canonical scales', () => {
        expect(getAttendanceTone(95)).toBe('success');
        expect(getAttendanceTone(74)).toBe('danger');
        expect(getBehaviorTone(0)).toBe('success');
        expect(getBehaviorTone(11)).toBe('warning');
        expect(getBehaviorTone(26)).toBe('danger');
    });
});

describe('childDevelopmentStats — computeTrendFromRecords (CD3 honest trend)', () => {
    it('returns null when records have fewer than two distinct dates', () => {
        const records = [
            { score: 80, date: '2026-11-01' },
            { score: 85, date: '2026-11-01' },
            { score: 90, date: '2026-11-01' },
            { score: 95, date: '2026-11-01' },
        ];
        expect(computeTrendFromRecords(records).trend).toBeNull();
    });

    it('returns null when there are fewer than 4 dated records', () => {
        const records = [
            { score: 80, date: '2026-10-01' },
            { score: 90, date: '2026-11-01' },
        ];
        expect(computeTrendFromRecords(records).trend).toBeNull();
    });

    it('compares records before vs on/after the median date', () => {
        const records = [
            { score: 60, date: '2026-10-01' },
            { score: 62, date: '2026-10-08' },
            { score: 64, date: '2026-10-15' },
            { score: 80, date: '2026-11-05' },
            { score: 84, date: '2026-11-12' },
        ];
        const result = computeTrendFromRecords(records);
        expect(result.trend).toBe('up');
        expect(result.delta).toBeGreaterThan(5);
    });

    it('supports created_at when date is absent', () => {
        const records = [
            { score: 60, created_at: '2026-10-01T00:00:00Z' },
            { score: 62, created_at: '2026-10-08T00:00:00Z' },
            { score: 64, created_at: '2026-10-15T00:00:00Z' },
            { score: 86, created_at: '2026-11-05T00:00:00Z' },
        ];
        expect(computeTrendFromRecords(records).trend).toBe('up');
    });

    it('reports stable within the ±5 band', () => {
        const records = [
            { score: 70, date: '2026-10-01' },
            { score: 71, date: '2026-10-08' },
            { score: 72, date: '2026-10-15' },
            { score: 73, date: '2026-11-05' },
        ];
        expect(computeTrendFromRecords(records).trend).toBe('stable');
    });
});

describe('childDevelopmentStats — computeSubjectAverages', () => {
    it('groups by subject with a Lainnya fallback', () => {
        const averages = computeSubjectAverages([
            { subject: 'Matematika', score: 80 },
            { subject: 'Matematika', score: 90 },
            { score: 70 },
        ]);
        expect(averages).toContainEqual({ subject: 'Matematika', average: 85 });
        expect(averages).toContainEqual({ subject: 'Lainnya', average: 70 });
    });
});
