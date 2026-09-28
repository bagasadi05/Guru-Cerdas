import { describe, it, expect } from 'vitest';
import {
  calculateRme,
  getDefaultNationalKaldik,
  KaldikWeek,
  WeekType,
  getSemesterMonths,
  isEffectiveWeek,
  isActiveWeek,
  SEMESTER_1_MONTHS,
  SEMESTER_2_MONTHS,
} from '@/utils/kaldikEngine';
import {
  DEFAULT_NATIONAL_KALDIK_PRESET,
  getWeeksForSemester,
  getEffectiveWeeksCount,
  getMonthIndexInSemester,
  getMonthFromSemesterIndex,
  getSemesterForMonth,
  getWeekTypeMetadata,
} from '@/data/defaultKaldikPresets';


/**
 * Helper to build 30 week slots for a semester with default KBM or custom overrides.
 * Semester 1: months 7, 8, 9, 10, 11, 12
 * Semester 2: months 1, 2, 3, 4, 5, 6
 */
function createSemesterWeeks(
  semester: 1 | 2,
  overrides?: Array<{ month: number; weekNumber: number; type: WeekType; label?: string }>
): KaldikWeek[] {
  const months = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
  const weeks: KaldikWeek[] = [];

  for (const month of months) {
    for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
      const override = overrides?.find((o) => o.month === month && o.weekNumber === weekNumber);
      weeks.push({
        month,
        weekNumber,
        type: override ? override.type : 'KBM',
        label: override?.label,
      });
    }
  }

  return weeks;
}

describe('Kaldik & RME Engine (Pure Domain Tests - Zero Mocks)', () => {
  // =========================================================================
  // TIER 1: Feature Coverage (Core Happy Path)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Core Happy Path)', () => {
    it('Tier 1 (F1-F2): should generate 30 week slots for Semester 1 (months 7-12, 5 weeks each)', () => {
      const weeks = createSemesterWeeks(1);
      expect(weeks).toHaveLength(30);

      const months = Array.from(new Set(weeks.map((w) => w.month)));
      expect(months).toEqual([7, 8, 9, 10, 11, 12]);

      for (const m of months) {
        const monthWeeks = weeks.filter((w) => w.month === m);
        expect(monthWeeks).toHaveLength(5);
        expect(monthWeeks.map((w) => w.weekNumber)).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it('Tier 1 (F1-F2): should generate 30 week slots for Semester 2 (months 1-6, 5 weeks each)', () => {
      const weeks = createSemesterWeeks(2);
      expect(weeks).toHaveLength(30);

      const months = Array.from(new Set(weeks.map((w) => w.month)));
      expect(months).toEqual([1, 2, 3, 4, 5, 6]);

      for (const m of months) {
        const monthWeeks = weeks.filter((w) => w.month === m);
        expect(monthWeeks).toHaveLength(5);
      }
    });

    it('Tier 1 (F4): should calculate RME correctly for Semester 1 with standard effective and ineffective weeks', () => {
      // 18 effective KBM weeks, 12 non-effective weeks (2 MPLS, 2 STS, 2 SAS, 2 RAPOR, 4 LIBUR_SEMESTER)
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'LIBUR_SEMESTER' },
        { month: 7, weekNumber: 2, type: 'MPLS' },
        { month: 7, weekNumber: 3, type: 'MPLS' },
        { month: 9, weekNumber: 4, type: 'STS' },
        { month: 9, weekNumber: 5, type: 'STS' },
        { month: 12, weekNumber: 1, type: 'SAS' },
        { month: 12, weekNumber: 2, type: 'SAS' },
        { month: 12, weekNumber: 3, type: 'RAPOR' },
        { month: 12, weekNumber: 4, type: 'RAPOR' },
        { month: 12, weekNumber: 5, type: 'LIBUR_SEMESTER' },
        { month: 11, weekNumber: 4, type: 'LIBUR_SEMESTER' },
        { month: 11, weekNumber: 5, type: 'LIBUR_SEMESTER' },
      ]);

      const rme = calculateRme(weeks, 1, 4);

      expect(rme.semesterNumber).toBe(1);
      expect(rme.totalWeeks).toBe(30);
      expect(rme.effectiveWeeks).toBe(18);
      expect(rme.nonEffectiveWeeks).toBe(12);
      expect(rme.effectiveWeeks + rme.nonEffectiveWeeks).toBe(rme.totalWeeks);
    });

    it('Tier 1 (F4): should provide an exact breakdown of non-effective weeks categorized by WeekType', () => {
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 2, type: 'MPLS' },
        { month: 7, weekNumber: 3, type: 'MPLS' },
        { month: 9, weekNumber: 4, type: 'STS' },
        { month: 10, weekNumber: 1, type: 'LIBUR_NASIONAL' },
        { month: 12, weekNumber: 2, type: 'SAS' },
        { month: 12, weekNumber: 3, type: 'RAPOR' },
        { month: 12, weekNumber: 4, type: 'LIBUR_SEMESTER' },
        { month: 12, weekNumber: 5, type: 'LIBUR_SEMESTER' },
      ]);

      const rme = calculateRme(weeks, 1, 4);

      expect(rme.nonEffectiveWeeks).toBe(8);
      expect(rme.nonEffectiveBreakdown.MPLS).toBe(2);
      expect(rme.nonEffectiveBreakdown.STS).toBe(1);
      expect(rme.nonEffectiveBreakdown.LIBUR_NASIONAL).toBe(1);
      expect(rme.nonEffectiveBreakdown.SAS).toBe(1);
      expect(rme.nonEffectiveBreakdown.RAPOR).toBe(1);
      expect(rme.nonEffectiveBreakdown.LIBUR_SEMESTER).toBe(2);
      expect(rme.nonEffectiveBreakdown.KEGIATAN_KHUSUS).toBe(0);
      expect(rme.nonEffectiveBreakdown.NON_ACTIVE).toBe(0);

      const sumBreakdown = Object.values(rme.nonEffectiveBreakdown).reduce((a, b) => a + b, 0);
      expect(sumBreakdown).toBe(rme.nonEffectiveWeeks);
    });

    it('Tier 1 (F5): should calculate total available teaching hours based on weekly quota (MEB x weeklyJpQuota)', () => {
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'MPLS' },
        { month: 7, weekNumber: 2, type: 'MPLS' },
      ]); // 28 effective weeks

      const rme4 = calculateRme(weeks, 1, 4);
      expect(rme4.weeklyJpQuota).toBe(4);
      expect(rme4.effectiveWeeks).toBe(28);
      expect(rme4.totalAvailableJp).toBe(28 * 4); // 112 JP

      const rme5 = calculateRme(weeks, 1, 5);
      expect(rme5.totalAvailableJp).toBe(28 * 5); // 140 JP
    });

    it('Tier 1 (F5, F11): should correctly compute net teaching hours after deducting reserve hours (Jam Cadangan)', () => {
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'MPLS' },
        { month: 7, weekNumber: 2, type: 'MPLS' },
      ]); // 28 effective weeks -> 112 JP gross at 4 JP/wk

      const rmeWithReserve = calculateRme(weeks, 1, 4, 8);
      expect(rmeWithReserve.totalAvailableJp).toBe(112);
      expect(rmeWithReserve.reserveJp).toBe(8);
      expect(rmeWithReserve.netTeachingJp).toBe(104);

      // Default reserveJp is 0
      const rmeDefault = calculateRme(weeks, 1, 4);
      expect(rmeDefault.reserveJp).toBe(0);
      expect(rmeDefault.netTeachingJp).toBe(112);
    });

    it('Tier 1 (F6): should load default national Kaldik preset for academic year with valid 60-week structure', () => {
      const preset = getDefaultNationalKaldik('2026/2027');
      expect(preset).toBeDefined();
      expect(preset.length).toBe(60);

      // Standard preset has MPLS in July (month 7)
      const julyMpls = preset.filter((w) => w.month === 7 && w.type === 'MPLS');
      expect(julyMpls.length).toBeGreaterThanOrEqual(1);

      // Standard preset has SAS in December (month 12)
      const decSas = preset.filter((w) => w.month === 12 && (w.type === 'SAS' || w.type === 'RAPOR'));
      expect(decSas.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('Tier 2 (Boundary): should handle an all-holiday semester with 0 effective weeks without errors', () => {
      const weeks = createSemesterWeeks(1).map((w) => ({
        ...w,
        type: 'LIBUR_SEMESTER' as WeekType,
      }));

      const rme = calculateRme(weeks, 1, 4, 0);
      expect(rme.effectiveWeeks).toBe(0);
      expect(rme.nonEffectiveWeeks).toBe(30);
      expect(rme.totalAvailableJp).toBe(0);
      expect(rme.netTeachingJp).toBe(0);
      expect(rme.nonEffectiveBreakdown.LIBUR_SEMESTER).toBe(30);
    });

    it('Tier 2 (Boundary): should handle a 100% effective teaching semester where all 30 weeks are KBM', () => {
      const weeks = createSemesterWeeks(1); // all KBM by default

      const rme = calculateRme(weeks, 1, 4);
      expect(rme.effectiveWeeks).toBe(30);
      expect(rme.nonEffectiveWeeks).toBe(0);
      expect(rme.totalAvailableJp).toBe(120);
      expect(rme.netTeachingJp).toBe(120);

      const nonZeroBreakdowns = Object.values(rme.nonEffectiveBreakdown).filter((v) => v > 0);
      expect(nonZeroBreakdowns).toHaveLength(0);
    });

    it('Tier 2 (Boundary): should correctly classify NON_ACTIVE 5th weeks in 4-calendar-week months (e.g. February)', () => {
      // February (month 2) has 4 active weeks; week 5 is NON_ACTIVE
      const weeks = createSemesterWeeks(2, [
        { month: 2, weekNumber: 5, type: 'NON_ACTIVE' },
      ]);

      const rme = calculateRme(weeks, 2, 4);
      expect(rme.effectiveWeeks).toBe(29);
      expect(rme.nonEffectiveWeeks).toBe(1);
      expect(rme.nonEffectiveBreakdown.NON_ACTIVE).toBe(1);
    });

    it('Tier 2 (Boundary): should clamp netTeachingJp to 0 when reserve hours equal or exceed total available hours', () => {
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'KBM' },
        ...Array.from({ length: 29 }, (_, i) => ({
          month: [7, 8, 9, 10, 11, 12][Math.floor((i + 1) / 5)],
          weekNumber: ((i + 1) % 5) + 1,
          type: 'LIBUR_SEMESTER' as WeekType,
        })),
      ]);

      // 1 effective week x 4 JP/wk = 4 JP totalAvailable
      const rmeEqual = calculateRme(weeks, 1, 4, 4);
      expect(rmeEqual.totalAvailableJp).toBe(4);
      expect(rmeEqual.reserveJp).toBe(4);
      expect(rmeEqual.netTeachingJp).toBe(0);

      // Reserve exceeds total available: netTeachingJp must not be negative
      const rmeExceed = calculateRme(weeks, 1, 4, 10);
      expect(rmeExceed.totalAvailableJp).toBe(4);
      expect(rmeExceed.netTeachingJp).toBe(0);
    });

    it('Tier 2 (Boundary): should handle minimal boundary: 1 effective week with 1 JP weekly quota', () => {
      const weeks: KaldikWeek[] = [
        { month: 7, weekNumber: 1, type: 'KBM' },
        ...Array.from({ length: 29 }, (_, i) => ({
          month: [7, 8, 9, 10, 11, 12][Math.floor((i + 1) / 5)],
          weekNumber: ((i + 1) % 5) + 1,
          type: 'LIBUR_SEMESTER' as WeekType,
        })),
      ];

      const rme = calculateRme(weeks, 1, 1, 0);
      expect(rme.effectiveWeeks).toBe(1);
      expect(rme.totalAvailableJp).toBe(1);
      expect(rme.netTeachingJp).toBe(1);
    });

    it('Tier 2 (Boundary): should handle high teaching quota load of 10 JP weekly quota', () => {
      const weeks = createSemesterWeeks(1, [
        ...Array.from({ length: 10 }, (_, i) => ({
          month: 11 + Math.floor(i / 5),
          weekNumber: (i % 5) + 1,
          type: 'LIBUR_SEMESTER' as WeekType,
        })),
      ]); // 20 effective weeks

      const rme = calculateRme(weeks, 1, 10);
      expect(rme.effectiveWeeks).toBe(20);
      expect(rme.totalAvailableJp).toBe(200);
      expect(rme.netTeachingJp).toBe(200);
    });

    it('Tier 2 (Boundary): should handle empty weeks array gracefully without throwing', () => {
      const rme = calculateRme([], 1, 4);
      expect(rme.totalWeeks).toBe(0);
      expect(rme.effectiveWeeks).toBe(0);
      expect(rme.nonEffectiveWeeks).toBe(0);
      expect(rme.totalAvailableJp).toBe(0);
      expect(rme.netTeachingJp).toBe(0);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations & State Shifts
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations & State Transitions', () => {
    it('Tier 3 (State Transition): should immediately decrement effective weeks and available hours when toggling 1 week from KBM to STS', () => {
      const baseWeeks = createSemesterWeeks(1);
      const rmeBefore = calculateRme(baseWeeks, 1, 4);

      expect(rmeBefore.effectiveWeeks).toBe(30);
      expect(rmeBefore.totalAvailableJp).toBe(120);

      // Mutate 1 week to STS
      const mutatedWeeks = baseWeeks.map((w) =>
        w.month === 9 && w.weekNumber === 4 ? { ...w, type: 'STS' as WeekType } : w
      );
      const rmeAfter = calculateRme(mutatedWeeks, 1, 4);

      expect(rmeAfter.effectiveWeeks).toBe(29);
      expect(rmeAfter.nonEffectiveWeeks).toBe(1);
      expect(rmeAfter.nonEffectiveBreakdown.STS).toBe(1);
      expect(rmeAfter.totalAvailableJp).toBe(116);
      expect(rmeBefore.totalAvailableJp - rmeAfter.totalAvailableJp).toBe(4);
    });

    it('Tier 3 (State Transition): should dynamically update available hours when weeklyJpQuota changes without changing calendar weeks', () => {
      const weeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'MPLS' },
        { month: 7, weekNumber: 2, type: 'MPLS' },
      ]); // 28 effective weeks

      const rme2 = calculateRme(weeks, 1, 2);
      const rme4 = calculateRme(weeks, 1, 4);
      const rme6 = calculateRme(weeks, 1, 6);

      expect(rme2.totalAvailableJp).toBe(56);
      expect(rme4.totalAvailableJp).toBe(112);
      expect(rme6.totalAvailableJp).toBe(168);
      expect(rme6.totalAvailableJp - rme4.totalAvailableJp).toBe(56);
    });

    it('Tier 3 (Cross-Semester Isolation): should isolate Semester 1 calculations from Semester 2 weeks when passed the entire annual calendar', () => {
      const all60Weeks = [
        ...createSemesterWeeks(1, [{ month: 7, weekNumber: 1, type: 'MPLS' }]),
        ...createSemesterWeeks(2, [
          { month: 1, weekNumber: 1, type: 'LIBUR_SEMESTER' },
          { month: 1, weekNumber: 2, type: 'LIBUR_SEMESTER' },
        ]),
      ];
      expect(all60Weeks).toHaveLength(60);

      const rmeSem1 = calculateRme(all60Weeks, 1, 4);
      expect(rmeSem1.semesterNumber).toBe(1);
      expect(rmeSem1.totalWeeks).toBe(30);
      expect(rmeSem1.effectiveWeeks).toBe(29);
      expect(rmeSem1.nonEffectiveWeeks).toBe(1);

      const rmeSem2 = calculateRme(all60Weeks, 2, 4);
      expect(rmeSem2.semesterNumber).toBe(2);
      expect(rmeSem2.totalWeeks).toBe(30);
      expect(rmeSem2.effectiveWeeks).toBe(28);
      expect(rmeSem2.nonEffectiveWeeks).toBe(2);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Indonesian Academic Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Indonesian Academic Scenarios', () => {
    it('Tier 4 (Scenario A): should accurately model SD Kurikulum Merdeka Semester 1 (July - December 2026)', () => {
      // Real Indonesian SD Academic Calendar:
      // July: W1 Libur Semester, W2-W3 MPLS, W4-W5 KBM (2 effective)
      // August: 5 KBM (5 effective)
      // September: W1-W3 KBM, W4 STS, W5 KBM (4 effective)
      // October: 5 KBM (5 effective)
      // November: W1-W4 KBM, W5 Libur Nasional (4 effective)
      // December: W1-W2 SAS, W3 Rapor, W4-W5 Libur Semester (0 effective)
      // Total effective: 2 + 5 + 4 + 5 + 4 + 0 = 20 effective weeks
      const sdWeeks = createSemesterWeeks(1, [
        { month: 7, weekNumber: 1, type: 'LIBUR_SEMESTER', label: 'Libur Kenaikan Kelas' },
        { month: 7, weekNumber: 2, type: 'MPLS', label: 'MPLS Hari 1-3' },
        { month: 7, weekNumber: 3, type: 'MPLS', label: 'MPLS Lanjutan' },
        { month: 9, weekNumber: 4, type: 'STS', label: 'Asesmen Tengah Semester 1' },
        { month: 11, weekNumber: 5, type: 'LIBUR_NASIONAL', label: 'Hari Guru Nasional & Cuti' },
        { month: 12, weekNumber: 1, type: 'SAS', label: 'Sumatif Akhir Semester 1' },
        { month: 12, weekNumber: 2, type: 'SAS', label: 'Sumatif Akhir Semester 1' },
        { month: 12, weekNumber: 3, type: 'RAPOR', label: 'Pengolahan & Penyerahan Rapor' },
        { month: 12, weekNumber: 4, type: 'LIBUR_SEMESTER', label: 'Libur Semester 1' },
        { month: 12, weekNumber: 5, type: 'LIBUR_SEMESTER', label: 'Libur Semester 1' },
      ]);

      // IPAS SD: 5 JP/week, 5 JP Jam Cadangan
      const rme = calculateRme(sdWeeks, 1, 5, 5);

      expect(rme.totalWeeks).toBe(30);
      expect(rme.effectiveWeeks).toBe(20);
      expect(rme.nonEffectiveWeeks).toBe(10);
      expect(rme.totalAvailableJp).toBe(100);
      expect(rme.reserveJp).toBe(5);
      expect(rme.netTeachingJp).toBe(95);

      expect(rme.nonEffectiveBreakdown.MPLS).toBe(2);
      expect(rme.nonEffectiveBreakdown.STS).toBe(1);
      expect(rme.nonEffectiveBreakdown.SAS).toBe(2);
      expect(rme.nonEffectiveBreakdown.RAPOR).toBe(1);
      expect(rme.nonEffectiveBreakdown.LIBUR_SEMESTER).toBe(3);
      expect(rme.nonEffectiveBreakdown.LIBUR_NASIONAL).toBe(1);
    });

    it('Tier 4 (Scenario B): should accurately model SMP Kurikulum Merdeka Semester 2 (January - June 2027) with Ramadhan & SAT', () => {
      // Semester 2:
      // January: W1 Libur Semester, W2-W5 KBM (4 effective)
      // February: W1-W4 KBM, W5 Non-Active (4 effective)
      // March: W1-W2 KBM, W3 STS, W4-W5 Libur Ramadhan (2 effective)
      // April: W1-W2 Libur Idul Fitri, W3-W5 KBM (3 effective)
      // May: W1-W4 KBM, W5 Libur Nasional (4 effective)
      // June: W1-W2 SAT/SAS, W3 Rapor, W4-W5 Libur Semester (0 effective)
      // Total effective = 4 + 4 + 2 + 3 + 4 + 0 = 17 effective weeks
      const smpWeeks = createSemesterWeeks(2, [
        { month: 1, weekNumber: 1, type: 'LIBUR_SEMESTER', label: 'Libur Semester Ganjil' },
        { month: 2, weekNumber: 5, type: 'NON_ACTIVE', label: 'Februari 4 Pekan' },
        { month: 3, weekNumber: 3, type: 'STS', label: 'Sumatif Tengah Semester Genap' },
        { month: 3, weekNumber: 4, type: 'KEGIATAN_KHUSUS', label: 'Libur Awal Ramadhan' },
        { month: 3, weekNumber: 5, type: 'KEGIATAN_KHUSUS', label: 'Pesantren Kilat' },
        { month: 4, weekNumber: 1, type: 'LIBUR_NASIONAL', label: 'Libur Idul Fitri' },
        { month: 4, weekNumber: 2, type: 'LIBUR_NASIONAL', label: 'Cuti Bersama Idul Fitri' },
        { month: 5, weekNumber: 5, type: 'LIBUR_NASIONAL', label: 'Hari Raya Waisak' },
        { month: 6, weekNumber: 1, type: 'SAS', label: 'Sumatif Akhir Tahun' },
        { month: 6, weekNumber: 2, type: 'SAS', label: 'Sumatif Akhir Tahun' },
        { month: 6, weekNumber: 3, type: 'RAPOR', label: 'Pembagian Buku Laporan Hasil Belajar' },
        { month: 6, weekNumber: 4, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran' },
        { month: 6, weekNumber: 5, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran' },
      ]);

      // SMP Matematika: 4 JP/week, 4 JP reserve
      const rme = calculateRme(smpWeeks, 2, 4, 4);

      expect(rme.totalWeeks).toBe(30);
      expect(rme.effectiveWeeks).toBe(17);
      expect(rme.nonEffectiveWeeks).toBe(13);
      expect(rme.totalAvailableJp).toBe(68);
      expect(rme.reserveJp).toBe(4);
      expect(rme.netTeachingJp).toBe(64);
      expect(rme.nonEffectiveBreakdown.KEGIATAN_KHUSUS).toBe(2);
      expect(rme.nonEffectiveBreakdown.NON_ACTIVE).toBe(1);
    });
  });

  // =========================================================================
  // TIER 5: Preset Helpers, Invariants & Pure Utilities
  // =========================================================================
  describe('Tier 5: Preset Helpers & Pure Utilities', () => {
    it('generates exactly 60 slots in default national Kaldik preset (12 months x 5 weeks)', () => {
      const kaldik = getDefaultNationalKaldik('2024/2025');
      expect(kaldik).toHaveLength(60);
    });

    it('has exactly 30 slots for Semester 1 and 30 slots for Semester 2', () => {
      const kaldik = getDefaultNationalKaldik();
      const sem1 = getWeeksForSemester(kaldik, 1);
      const sem2 = getWeeksForSemester(kaldik, 2);
      expect(sem1).toHaveLength(30);
      expect(sem2).toHaveLength(30);
    });

    it('has 19 Effective Teaching Weeks (MEB) in Semester 1 national preset', () => {
      const kaldik = getDefaultNationalKaldik();
      const mebSem1 = getEffectiveWeeksCount(kaldik, 1);
      expect(mebSem1).toBe(19);
    });

    it('has 19 Effective Teaching Weeks (MEB) in Semester 2 national preset', () => {
      const kaldik = getDefaultNationalKaldik();
      const mebSem2 = getEffectiveWeeksCount(kaldik, 2);
      expect(mebSem2).toBe(19);
    });

    it('designates February Week 5 as NON_ACTIVE', () => {
      const kaldik = getDefaultNationalKaldik();
      const febW5 = kaldik.find((w) => w.month === 2 && w.weekNumber === 5);
      expect(febW5).toBeDefined();
      expect(febW5?.type).toBe('NON_ACTIVE');
    });

    it('supports bijective two-way mapping between calendar months and Promes monthIndex', () => {
      // Semester 1: Juli (7) s.d. Desember (12) -> monthIndex 0..5
      for (let m = 7; m <= 12; m++) {
        const idx = getMonthIndexInSemester(m);
        expect(idx).toBe(m - 7);
        expect(getMonthFromSemesterIndex(1, idx)).toBe(m);
      }
      // Semester 2: Januari (1) s.d. Juni (6) -> monthIndex 0..5
      for (let m = 1; m <= 6; m++) {
        const idx = getMonthIndexInSemester(m);
        expect(idx).toBe(m - 1);
        expect(getMonthFromSemesterIndex(2, idx)).toBe(m);
      }
    });

    it('throws RangeError for invalid monthIndex in getMonthFromSemesterIndex', () => {
      expect(() => getMonthFromSemesterIndex(1, -1)).toThrow(RangeError);
      expect(() => getMonthFromSemesterIndex(2, 6)).toThrow(RangeError);
    });

    it('guarantees immutability of constant preset against caller mutation', () => {
      const kaldik1 = getDefaultNationalKaldik();
      const kaldik2 = getDefaultNationalKaldik();
      kaldik1[0].type = 'KBM';
      expect(kaldik2[0].type).toBe('LIBUR_SEMESTER');
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].type).toBe('LIBUR_SEMESTER');
    });

    it('returns correct semester months for Semester 1 and Semester 2', () => {
      expect(getSemesterMonths(1)).toEqual(SEMESTER_1_MONTHS);
      expect(getSemesterMonths(2)).toEqual(SEMESTER_2_MONTHS);
      expect(SEMESTER_1_MONTHS).toEqual([7, 8, 9, 10, 11, 12]);
      expect(SEMESTER_2_MONTHS).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('maps calendar months to correct semester number', () => {
      [7, 8, 9, 10, 11, 12].forEach((m) => expect(getSemesterForMonth(m)).toBe(1));
      [1, 2, 3, 4, 5, 6].forEach((m) => expect(getSemesterForMonth(m)).toBe(2));
    });

    it('provides complete WeekType metadata including colors and badges', () => {
      const kbmMeta = getWeekTypeMetadata('KBM');
      expect(kbmMeta.isEffective).toBe(true);
      expect(kbmMeta.isLockedInPromes).toBe(false);
      expect(kbmMeta.color).toBe('emerald');

      const mplsMeta = getWeekTypeMetadata('MPLS');
      expect(mplsMeta.isEffective).toBe(false);
      expect(mplsMeta.isLockedInPromes).toBe(true);
      expect(mplsMeta.color).toBe('sky');

      const nonActiveMeta = getWeekTypeMetadata('NON_ACTIVE');
      expect(nonActiveMeta.isEffective).toBe(false);
      expect(nonActiveMeta.isLockedInPromes).toBe(true);
      expect(nonActiveMeta.color).toBe('slate');
    });

    it('correctly evaluates predicate functions isEffectiveWeek and isActiveWeek', () => {
      expect(isEffectiveWeek('KBM')).toBe(true);
      expect(isEffectiveWeek('MPLS')).toBe(false);
      expect(isEffectiveWeek('STS')).toBe(false);
      expect(isEffectiveWeek('SAS')).toBe(false);
      expect(isEffectiveWeek('NON_ACTIVE')).toBe(false);

      expect(isActiveWeek('KBM')).toBe(true);
      expect(isActiveWeek('STS')).toBe(true);
      expect(isActiveWeek('LIBUR_SEMESTER')).toBe(true);
      expect(isActiveWeek('NON_ACTIVE')).toBe(false);
    });
  });
});

