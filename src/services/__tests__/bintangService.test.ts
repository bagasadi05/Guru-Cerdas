import { describe, it, expect } from 'vitest';
import {
    pointsToGrade,
    getAspectForViolation,
    calculateAspectPoints,
    BINTANG_THRESHOLDS,
    type BintangGrade,
} from '../bintangService';

describe('pointsToGrade', () => {
    it('maps 0 points to A', () => {
        expect(pointsToGrade(0)).toBe('A');
    });

    it('maps 1-10 points to B', () => {
        expect(pointsToGrade(1)).toBe('B');
        expect(pointsToGrade(5)).toBe('B');
        expect(pointsToGrade(10)).toBe('B');
    });

    it('maps 11-20 points to C', () => {
        expect(pointsToGrade(11)).toBe('C');
        expect(pointsToGrade(15)).toBe('C');
        expect(pointsToGrade(20)).toBe('C');
    });

    it('maps 21+ points to D', () => {
        expect(pointsToGrade(21)).toBe('D');
        expect(pointsToGrade(50)).toBe('D');
    });

    it('handles negative points as A (treats as no violation)', () => {
        expect(pointsToGrade(-5)).toBe('A');
    });

    it('thresholds are consistent with grade mapping', () => {
        const byGrade = BINTANG_THRESHOLDS.find(t => t.grade === 'A')!;
        expect(byGrade.maxPoints).toBe(0);
        const d = BINTANG_THRESHOLDS.find(t => t.grade === 'D')!;
        expect(d.maxPoints).toBe(Infinity);
    });
});

describe('getAspectForViolation', () => {
    it('maps known violation descriptions exactly', () => {
        expect(getAspectForViolation('Terlambat masuk sekolah')).toBe('KEDISIPLINAN');
        expect(getAspectForViolation('Tidak bersepatu hitam dan berkaos kaki putih')).toBe('KERAPIAN');
        expect(getAspectForViolation('Membuang sampah sembarangan')).toBe('ADAB');
    });

    it('falls back to KEDISIPLINAN for unknown descriptions', () => {
        expect(getAspectForViolation('Deskripsi tidak dikenal XYZ')).toBe('KEDISIPLINAN');
    });

    it('matches partial/case-insensitive descriptions', () => {
        // "TERLAMBAT MASUK" adalah substring dari "Terlambat masuk sekolah" → KEDISIPLINAN
        expect(getAspectForViolation('TERLAMBAT MASUK')).toBe('KEDISIPLINAN');
        // "bersepatu" substring dari "Tidak bersepatu hitam..." → KERAPIAN
        expect(getAspectForViolation('bersepatu')).toBe('KERAPIAN');
    });
});

describe('calculateAspectPoints', () => {
    it('returns all-A summary for no violations', () => {
        const s = calculateAspectPoints([]);
        expect(s.ADAB.grade).toBe('A');
        expect(s.KEDISIPLINAN.grade).toBe('A');
        expect(s.KERAPIAN.grade).toBe('A');
        expect(s.ADAB.points).toBe(0);
        expect(s.ADAB.count).toBe(0);
    });

    it('tallies points and counts per aspect', () => {
        const s = calculateAspectPoints([
            { description: 'Terlambat masuk sekolah', points: 5 }, // KEDISIPLINAN
            { description: 'Tidak bersepatu hitam dan berkaos kaki putih', points: 3 }, // KERAPIAN
        ]);
        // Total points harus 8, terdistribusi ke aspek yang sesuai.
        const total = s.ADAB.points + s.KEDISIPLINAN.points + s.KERAPIAN.points;
        expect(total).toBe(8);
        const totalCount = s.ADAB.count + s.KEDISIPLINAN.count + s.KERAPIAN.count;
        expect(totalCount).toBe(2);
    });

    it('applies keaktifan offset greedily to highest aspect (grade reflects net)', () => {
        const s = calculateAspectPoints([
            { description: 'Terlambat masuk sekolah', points: 10 },
            { description: 'Tidak bersepatu hitam dan berkaos kaki putih', points: 8 },
        ], 5); // 5 poin keaktifan

        // points = raw (tidak dikurangi), grade = net (setelah offset)
        const totalRaw = s.ADAB.points + s.KEDISIPLINAN.points + s.KERAPIAN.points;
        expect(totalRaw).toBe(18);

        // Net points: 18 - 5 = 13 → aspek dengan poin tertinggi (10 → 5) jadi grade B,
        // aspek 8 → 8 net → B, dst. Setidaknya tidak ada yang D.
        const grades: BintangGrade[] = [s.ADAB.grade, s.KEDISIPLINAN.grade, s.KERAPIAN.grade];
        expect(grades).not.toContain('D');
    });

    it('keaktifan offset does not push grade below raw-based grade', () => {
        const s = calculateAspectPoints([
            { description: 'Terlambat masuk sekolah', points: 3 },
        ], 10); // offset lebih besar dari poin

        // points tetap raw (3), tapi grade harus A karena offset meniadakan semua poin
        expect(s.KEDISIPLINAN.points).toBe(3);
        expect(s.KEDISIPLINAN.grade).toBe('A');
    });

    it('computes grades based on net points after offset', () => {
        // 12 poin pelanggaran - 11 offset = 1 poin net → grade B
        const s = calculateAspectPoints([
            { description: 'Terlambat masuk sekolah', points: 12 },
        ], 11);
        const grades: BintangGrade[] = [s.ADAB.grade, s.KEDISIPLINAN.grade, s.KERAPIAN.grade];
        // Setidaknya satu aspek harus grade B atau lebih baik (karena offset besar)
        expect(grades).toContain('A');
        expect(grades).toContain('B');
    });

    it('zero violations with quiz points stays A (no phantom points)', () => {
        const s = calculateAspectPoints([], 50);
        expect(s.ADAB.grade).toBe('A');
        expect(s.KEDISIPLINAN.points).toBe(0);
    });
});
