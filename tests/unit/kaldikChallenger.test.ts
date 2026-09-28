import { describe, it, expect } from 'vitest';
import {
  calculateRme,
  getDefaultNationalKaldik,
  WeekType,
  SEMESTER_1_MONTHS,
  SEMESTER_2_MONTHS,
} from '@/utils/kaldikEngine';
import {
  DEFAULT_NATIONAL_KALDIK_PRESET,
  getWeeksForSemester,
  getWeekTypeMetadata,
  WEEK_TYPE_METADATA,
} from '@/data/defaultKaldikPresets';

describe('Milestone M1 Challenger: Empirical Stress Tests for Kaldik & RME Engine', () => {
  // =========================================================================
  // 1. NATIONAL PRESET INVARIANTS & STRUCTURAL INTEGRITY
  // =========================================================================
  describe('1. National Preset Invariants & Structural Integrity', () => {
    it('empirical check: getDefaultNationalKaldik returns exactly 60 slots', () => {
      const presets = [
        getDefaultNationalKaldik(),
        getDefaultNationalKaldik('2024/2025'),
        getDefaultNationalKaldik('2025/2026'),
        getDefaultNationalKaldik('2026/2027'),
        getDefaultNationalKaldik(''),
      ];

      for (const preset of presets) {
        expect(preset).toHaveLength(60);
      }
    });

    it('empirical check: months are strictly 1 to 12 and month distribution is 5 weeks per month', () => {
      const preset = getDefaultNationalKaldik('2026/2027');

      const monthCounts = new Map<number, number>();
      for (const slot of preset) {
        expect(slot.month).toBeGreaterThanOrEqual(1);
        expect(slot.month).toBeLessThanOrEqual(12);
        expect(Number.isInteger(slot.month)).toBe(true);

        monthCounts.set(slot.month, (monthCounts.get(slot.month) || 0) + 1);
      }

      // Exactly 12 months present
      expect(monthCounts.size).toBe(12);

      // Each month has exactly 5 week slots
      for (let m = 1; m <= 12; m++) {
        expect(monthCounts.get(m)).toBe(5);

        // Verify week numbers are exactly 1, 2, 3, 4, 5
        const monthSlots = preset.filter((w) => w.month === m);
        const weekNums = monthSlots.map((w) => w.weekNumber);
        expect(weekNums).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it('empirical check: Semester 1 has strictly months 7..12 (30 slots)', () => {
      const preset = getDefaultNationalKaldik('2026/2027');
      const sem1 = getWeeksForSemester(preset, 1);

      expect(sem1).toHaveLength(30);
      const sem1Months = Array.from(new Set(sem1.map((w) => w.month)));
      expect(sem1Months).toEqual([7, 8, 9, 10, 11, 12]);
    });

    it('empirical check: Semester 2 has strictly months 1..6 (30 slots)', () => {
      const preset = getDefaultNationalKaldik('2026/2027');
      const sem2 = getWeeksForSemester(preset, 2);

      expect(sem2).toHaveLength(30);
      const sem2Months = Array.from(new Set(sem2.map((w) => w.month)));
      expect(sem2Months).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('empirical check: Semester 1 has exactly 19 MEB (effective) and 11 non-effective slots', () => {
      const preset = getDefaultNationalKaldik('2026/2027');
      const sem1 = getWeeksForSemester(preset, 1);

      const kbmSlots = sem1.filter((w) => w.type === 'KBM');
      const nonKbmSlots = sem1.filter((w) => w.type !== 'KBM');

      expect(kbmSlots).toHaveLength(19);
      expect(nonKbmSlots).toHaveLength(11);
      expect(kbmSlots.length + nonKbmSlots.length).toBe(30);

      const rme = calculateRme(preset, 1, 4);
      expect(rme.effectiveWeeks).toBe(19);
      expect(rme.nonEffectiveWeeks).toBe(11);
      expect(rme.totalWeeks).toBe(30);
      expect(rme.totalAvailableJp).toBe(19 * 4); // 76 JP
    });

    it('empirical check: Semester 2 has exactly 19 MEB (effective) and 11 non-effective slots, including Feb W5 NON_ACTIVE', () => {
      const preset = getDefaultNationalKaldik('2026/2027');
      const sem2 = getWeeksForSemester(preset, 2);

      const kbmSlots = sem2.filter((w) => w.type === 'KBM');
      const nonKbmSlots = sem2.filter((w) => w.type !== 'KBM');

      expect(kbmSlots).toHaveLength(19);
      expect(nonKbmSlots).toHaveLength(11);
      expect(kbmSlots.length + nonKbmSlots.length).toBe(30);

      // Verify February W5 is specifically NON_ACTIVE
      const febW5 = sem2.find((w) => w.month === 2 && w.weekNumber === 5);
      expect(febW5).toBeDefined();
      expect(febW5?.type).toBe('NON_ACTIVE');

      const rme = calculateRme(preset, 2, 4);
      expect(rme.effectiveWeeks).toBe(19);
      expect(rme.nonEffectiveWeeks).toBe(11);
      expect(rme.totalWeeks).toBe(30);
      expect(rme.nonEffectiveBreakdown.NON_ACTIVE).toBe(1);
      expect(rme.totalAvailableJp).toBe(19 * 4); // 76 JP
    });

    it('empirical check: non-effective breakdown sum strictly equals nonEffectiveWeeks in both semesters', () => {
      const preset = getDefaultNationalKaldik('2026/2027');

      for (const sem of [1, 2] as const) {
        const rme = calculateRme(preset, sem, 3);
        const sumBreakdown = Object.values(rme.nonEffectiveBreakdown).reduce((a, b) => a + b, 0);
        expect(sumBreakdown).toBe(rme.nonEffectiveWeeks);
        expect(rme.effectiveWeeks + rme.nonEffectiveWeeks).toBe(30);
      }
    });
  });

  // =========================================================================
  // 2. IMMUTABILITY STRESS HARNESS
  // =========================================================================
  describe('2. Preset Immutability & Defensive Isolation', () => {
    it('stress: modifying returned preset slots does NOT mutate subsequent factory calls', () => {
      const instance1 = getDefaultNationalKaldik('2026/2027');

      // Heavy destructive mutations on instance1
      instance1.forEach((slot, idx) => {
        slot.type = idx % 2 === 0 ? 'KEGIATAN_KHUSUS' : 'NON_ACTIVE';
        slot.label = `CORRUPTED_${idx}`;
        slot.weekNumber = 999;
        slot.month = -1;
      });
      instance1.splice(0, 30); // delete half array

      expect(instance1).toHaveLength(30);

      // Now request fresh instance2
      const instance2 = getDefaultNationalKaldik('2026/2027');
      expect(instance2).toHaveLength(60);
      expect(instance2[0].type).toBe('LIBUR_SEMESTER');
      expect(instance2[0].month).toBe(7);
      expect(instance2[0].weekNumber).toBe(1);
      expect(instance2[0].label).not.toContain('CORRUPTED');

      // Check constant preset object remains unmodified
      expect(DEFAULT_NATIONAL_KALDIK_PRESET).toHaveLength(60);
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].type).toBe('LIBUR_SEMESTER');
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].month).toBe(7);
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].weekNumber).toBe(1);
    });

    it('stress: DEFAULT_NATIONAL_KALDIK_PRESET is Object.isFrozen', () => {
      expect(Object.isFrozen(DEFAULT_NATIONAL_KALDIK_PRESET)).toBe(true);
    });
  });

  // =========================================================================
  // 3. REACTIVE CALENDAR TRANSITIONS & DYNAMIC HOUR UPDATES
  // =========================================================================
  describe('3. Reactive Calendar Transitions & Dynamic Teaching Hour Adjustments', () => {
    it('exhaustive stress: toggling every single slot in Semester 1 adjusts MEB by exactly ±1 and JP by ±(1 * quota)', () => {
      const quota = 5;
      const initialPreset = getDefaultNationalKaldik('2026/2027');
      const initialRme = calculateRme(initialPreset, 1, quota);
      expect(initialRme.effectiveWeeks).toBe(19);
      expect(initialRme.totalAvailableJp).toBe(95);

      const sem1Slots = initialPreset.filter((w) => w.month >= 7 && w.month <= 12);
      expect(sem1Slots).toHaveLength(30);

      for (let i = 0; i < sem1Slots.length; i++) {
        const slot = sem1Slots[i];
        const wasKbm = slot.type === 'KBM';

        // Create copy of entire preset and toggle this single slot
        const calendarCopy = getDefaultNationalKaldik('2026/2027');
        const targetIndex = calendarCopy.findIndex(
          (w) => w.month === slot.month && w.weekNumber === slot.weekNumber
        );
        expect(targetIndex).toBeGreaterThanOrEqual(0);

        if (wasKbm) {
          // Toggle KBM -> LIBUR_NASIONAL
          calendarCopy[targetIndex].type = 'LIBUR_NASIONAL';

          const updatedRme = calculateRme(calendarCopy, 1, quota);
          expect(updatedRme.effectiveWeeks).toBe(18);
          expect(updatedRme.nonEffectiveWeeks).toBe(12);
          expect(updatedRme.totalAvailableJp).toBe(90);
          expect(initialRme.totalAvailableJp - updatedRme.totalAvailableJp).toBe(quota);
          expect(updatedRme.nonEffectiveBreakdown.LIBUR_NASIONAL).toBe(
            initialRme.nonEffectiveBreakdown.LIBUR_NASIONAL + 1
          );
        } else {
          // Toggle Non-KBM -> KBM
          calendarCopy[targetIndex].type = 'KBM';

          const updatedRme = calculateRme(calendarCopy, 1, quota);
          expect(updatedRme.effectiveWeeks).toBe(20);
          expect(updatedRme.nonEffectiveWeeks).toBe(10);
          expect(updatedRme.totalAvailableJp).toBe(100);
          expect(updatedRme.totalAvailableJp - initialRme.totalAvailableJp).toBe(quota);
        }
      }
    });

    it('exhaustive stress: toggling every single slot in Semester 2 adjusts MEB by exactly ±1 and JP by ±(1 * quota)', () => {
      const quota = 4;
      const initialPreset = getDefaultNationalKaldik('2026/2027');
      const initialRme = calculateRme(initialPreset, 2, quota);
      expect(initialRme.effectiveWeeks).toBe(19);
      expect(initialRme.totalAvailableJp).toBe(76);

      const sem2Slots = initialPreset.filter((w) => w.month >= 1 && w.month <= 6);
      expect(sem2Slots).toHaveLength(30);

      for (let i = 0; i < sem2Slots.length; i++) {
        const slot = sem2Slots[i];
        const wasKbm = slot.type === 'KBM';

        const calendarCopy = getDefaultNationalKaldik('2026/2027');
        const targetIndex = calendarCopy.findIndex(
          (w) => w.month === slot.month && w.weekNumber === slot.weekNumber
        );

        if (wasKbm) {
          // Toggle KBM -> STS
          calendarCopy[targetIndex].type = 'STS';

          const updatedRme = calculateRme(calendarCopy, 2, quota);
          expect(updatedRme.effectiveWeeks).toBe(18);
          expect(updatedRme.nonEffectiveWeeks).toBe(12);
          expect(updatedRme.totalAvailableJp).toBe(72);
          expect(initialRme.totalAvailableJp - updatedRme.totalAvailableJp).toBe(quota);
        } else {
          // Toggle Non-KBM -> KBM
          calendarCopy[targetIndex].type = 'KBM';

          const updatedRme = calculateRme(calendarCopy, 2, quota);
          expect(updatedRme.effectiveWeeks).toBe(20);
          expect(updatedRme.nonEffectiveWeeks).toBe(10);
          expect(updatedRme.totalAvailableJp).toBe(80);
          expect(updatedRme.totalAvailableJp - initialRme.totalAvailableJp).toBe(quota);
        }
      }
    });

    it('random fuzzing oracle: 50 successive random multi-week toggles match mathematical oracle', () => {
      const allWeekTypes: WeekType[] = [
        'KBM',
        'MPLS',
        'STS',
        'SAS',
        'RAPOR',
        'LIBUR_SEMESTER',
        'LIBUR_NASIONAL',
        'KEGIATAN_KHUSUS',
        'NON_ACTIVE',
      ];

      const currentCalendar = getDefaultNationalKaldik('2026/2027');
      const quota = 6;
      const reserve = 4;

      for (let step = 1; step <= 50; step++) {
        // Pick random slot from 60 slots
        const randomIndex = Math.floor(Math.random() * 60);
        const randomType = allWeekTypes[Math.floor(Math.random() * allWeekTypes.length)];
        currentCalendar[randomIndex].type = randomType;

        // Test both semester 1 and semester 2 RME calculations against direct oracle
        for (const semester of [1, 2] as const) {
          const allowedMonths = semester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
          const semesterWeeks = currentCalendar.filter((w) =>
            (allowedMonths as readonly number[]).includes(w.month)
          );

          const expectedTotal = semesterWeeks.length;
          const expectedEffective = semesterWeeks.filter((w) => w.type === 'KBM').length;
          const expectedNonEffective = expectedTotal - expectedEffective;
          const expectedAvailableJp = expectedEffective * quota;
          const expectedNetJp = Math.max(0, expectedAvailableJp - reserve);

          const rme = calculateRme(currentCalendar, semester, quota, reserve);

          expect(rme.totalWeeks).toBe(expectedTotal);
          expect(rme.effectiveWeeks).toBe(expectedEffective);
          expect(rme.nonEffectiveWeeks).toBe(expectedNonEffective);
          expect(rme.totalAvailableJp).toBe(expectedAvailableJp);
          expect(rme.netTeachingJp).toBe(expectedNetJp);

          // Verify breakdown sum
          const breakdownSum = Object.values(rme.nonEffectiveBreakdown).reduce((a, b) => a + b, 0);
          expect(breakdownSum).toBe(expectedNonEffective);
        }
      }
    });
  });

  // =========================================================================
  // 4. CORNER CASES, NUMERICAL RESILIENCE & SANITIZATION
  // =========================================================================
  describe('4. Numerical Resilience, Input Sanitization & Edge Cases', () => {
    it('handles negative, non-integer, NaN, and Infinity quotas safely', () => {
      const preset = getDefaultNationalKaldik('2026/2027');

      // Negative quota should sanitize to 0
      const rmeNeg = calculateRme(preset, 1, -5);
      expect(rmeNeg.weeklyJpQuota).toBe(0);
      expect(rmeNeg.totalAvailableJp).toBe(0);

      // Decimal quota should floor to integer
      const rmeDec = calculateRme(preset, 1, 4.8);
      expect(rmeDec.weeklyJpQuota).toBe(4);
      expect(rmeDec.totalAvailableJp).toBe(19 * 4);

      // NaN quota should sanitize to 0
      const rmeNan = calculateRme(preset, 1, NaN);
      expect(rmeNan.weeklyJpQuota).toBe(0);
      expect(rmeNan.totalAvailableJp).toBe(0);

      // Infinity quota should sanitize to 0
      const rmeInf = calculateRme(preset, 1, Infinity);
      expect(rmeInf.weeklyJpQuota).toBe(0);
      expect(rmeInf.totalAvailableJp).toBe(0);
    });

    it('handles negative, decimal, and excessive reserve hours safely', () => {
      const preset = getDefaultNationalKaldik('2026/2027');

      // Negative reserve hours should sanitize to 0
      const rmeNegRes = calculateRme(preset, 1, 4, -10);
      expect(rmeNegRes.reserveJp).toBe(0);
      expect(rmeNegRes.netTeachingJp).toBe(76);

      // Decimal reserve hours should floor
      const rmeDecRes = calculateRme(preset, 1, 4, 6.9);
      expect(rmeDecRes.reserveJp).toBe(6);
      expect(rmeDecRes.netTeachingJp).toBe(76 - 6);

      // Reserve hours greater than total available JP should clamp netTeachingJp to 0 (never negative)
      const rmeExcessRes = calculateRme(preset, 1, 4, 1000);
      expect(rmeExcessRes.netTeachingJp).toBe(0);
    });

    it('handles sparse / malformed week objects in array without throwing', () => {
      const malformedWeeks: any[] = [
        null,
        undefined,
        { month: 7, weekNumber: 1, type: 'KBM' },
        { month: 7, weekNumber: 2, type: 'UNKNOWN_TYPE_XYZ' },
        { month: 99, weekNumber: 1, type: 'KBM' }, // out of semester
        {},
      ];

      expect(() => calculateRme(malformedWeeks, 1, 4)).not.toThrow();
      const rme = calculateRme(malformedWeeks, 1, 4);
      expect(rme.effectiveWeeks).toBe(1);
      expect(rme.nonEffectiveWeeks).toBe(1); // 'UNKNOWN_TYPE_XYZ' is non-KBM
      expect(rme.totalWeeks).toBe(2);
    });

    it('handles non-array inputs gracefully', () => {
      expect(() => calculateRme(null as any, 1, 4)).not.toThrow();
      expect(() => calculateRme(undefined as any, 1, 4)).not.toThrow();
      const rmeNull = calculateRme(null as any, 1, 4);
      expect(rmeNull.totalWeeks).toBe(0);
      expect(rmeNull.effectiveWeeks).toBe(0);
      expect(rmeNull.totalAvailableJp).toBe(0);
    });
  });

  // =========================================================================
  // 5. TAXONOMY & METADATA COMPLETENESS
  // =========================================================================
  describe('5. Taxonomy & Metadata Completeness', () => {
    it('verifies WEEK_TYPE_METADATA has valid descriptors and classes for all 9 taxonomy types', () => {
      const expectedTypes: WeekType[] = [
        'KBM',
        'MPLS',
        'STS',
        'SAS',
        'RAPOR',
        'LIBUR_SEMESTER',
        'LIBUR_NASIONAL',
        'KEGIATAN_KHUSUS',
        'NON_ACTIVE',
      ];

      expect(Object.keys(WEEK_TYPE_METADATA)).toHaveLength(9);

      for (const t of expectedTypes) {
        const meta = getWeekTypeMetadata(t);
        expect(meta).toBeDefined();
        expect(meta.type).toBe(t);
        expect(typeof meta.label).toBe('string');
        expect(meta.label.length).toBeGreaterThan(0);
        expect(typeof meta.shortLabel).toBe('string');
        expect(meta.shortLabel.length).toBeGreaterThan(0);
        expect(typeof meta.description).toBe('string');
        expect(meta.description.length).toBeGreaterThan(0);
        expect(typeof meta.color).toBe('string');
        expect(typeof meta.badgeClass).toBe('string');
        expect(typeof meta.cellBgClass).toBe('string');
        expect(typeof meta.cellBorderClass).toBe('string');
        expect(typeof meta.excelFillColor).toBe('string');
        expect(meta.excelFillColor).toMatch(/^[0-9A-Fa-f]{6}$/);

        // KBM is the only effective week and the only unlocked week in Promes
        if (t === 'KBM') {
          expect(meta.isEffective).toBe(true);
          expect(meta.isLockedInPromes).toBe(false);
        } else {
          expect(meta.isEffective).toBe(false);
          expect(meta.isLockedInPromes).toBe(true);
        }
      }
    });
  });
});
