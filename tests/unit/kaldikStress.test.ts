import { describe, it, expect } from 'vitest';
import {
  calculateRme,
  getDefaultNationalKaldik,
  KaldikWeek,
  WeekType,
} from '@/utils/kaldikEngine';
import {
  DEFAULT_NATIONAL_KALDIK_PRESET,
} from '@/data/defaultKaldikPresets';

const ALL_WEEK_TYPES: WeekType[] = [
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

describe('Empirical Adversarial Stress Harness: kaldikEngine', () => {
  // =========================================================================
  // SUITE 1: 1,000 Randomized Permutations & Invariant Verification
  // =========================================================================
  describe('1. 1,000 Randomized Permutation & Invariant Property Tests', () => {
    it('satisfies all 7 core mathematical invariants across 1,000 randomized calendar permutations', () => {
      const ITERATIONS = 1000;
      let totalWeeksTested = 0;

      for (let i = 0; i < ITERATIONS; i++) {
        const semester: 1 | 2 = i % 2 === 0 ? 1 : 2;
        const validMonths = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];

        // Generate random number of weeks between 0 and 60
        const weekCount = Math.floor(Math.random() * 61);
        const randomWeeks: KaldikWeek[] = [];

        for (let w = 0; w < weekCount; w++) {
          const month = Math.random() < 0.8
            ? validMonths[Math.floor(Math.random() * validMonths.length)]
            : Math.floor(Math.random() * 14); // occasionally invalid month 0..13

          const type = ALL_WEEK_TYPES[Math.floor(Math.random() * ALL_WEEK_TYPES.length)];
          const weekNumber = Math.floor(Math.random() * 5) + 1;

          randomWeeks.push({
            month,
            weekNumber,
            type,
            label: `Test-W${w}`,
          });
        }

        const weeklyQuota = Math.floor(Math.random() * 20); // 0 to 19
        const reserve = Math.floor(Math.random() * 30); // 0 to 29

        const rme = calculateRme(randomWeeks, semester, weeklyQuota, reserve);
        totalWeeksTested += rme.totalWeeks;

        // INVARIANT 1: Total Weeks = Effective Weeks + Non-Effective Weeks
        expect(rme.totalWeeks).toBe(rme.effectiveWeeks + rme.nonEffectiveWeeks);

        // INVARIANT 2: Non-negative week counts
        expect(rme.effectiveWeeks).toBeGreaterThanOrEqual(0);
        expect(rme.nonEffectiveWeeks).toBeGreaterThanOrEqual(0);
        expect(rme.totalWeeks).toBeGreaterThanOrEqual(0);

        // INVARIANT 3: Sum of non-effective breakdown equals nonEffectiveWeeks
        const breakdownSum = Object.entries(rme.nonEffectiveBreakdown).reduce(
          (acc, [type, count]) => {
            if (type === 'KBM') {
              // KBM in breakdown must always be 0
              expect(count).toBe(0);
              return acc;
            }
            return acc + count;
          },
          0
        );
        expect(breakdownSum).toBe(rme.nonEffectiveWeeks);

        // INVARIANT 4: Total Available JP = effectiveWeeks * sanitizedQuota
        expect(rme.totalAvailableJp).toBe(rme.effectiveWeeks * weeklyQuota);

        // INVARIANT 5: Net Teaching JP = max(0, totalAvailableJp - reserve)
        const expectedNet = Math.max(0, rme.totalAvailableJp - reserve);
        expect(rme.netTeachingJp).toBe(expectedNet);

        // INVARIANT 6: Net Teaching JP <= Total Available JP
        expect(rme.netTeachingJp).toBeLessThanOrEqual(rme.totalAvailableJp);

        // INVARIANT 7: Correct semester tagged
        expect(rme.semesterNumber).toBe(semester);
      }

      expect(totalWeeksTested).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SUITE 2: Extreme Numbers & Numeric Sanitization
  // =========================================================================
  describe('2. Extreme Numbers & Numerical Boundaries', () => {
    const baseWeeks: KaldikWeek[] = [
      { month: 7, weekNumber: 1, type: 'KBM' },
      { month: 7, weekNumber: 2, type: 'KBM' },
      { month: 7, weekNumber: 3, type: 'MPLS' },
    ];

    it('sanitizes negative quotas to 0', () => {
      const rme = calculateRme(baseWeeks, 1, -10, 0);
      expect(rme.weeklyJpQuota).toBe(0);
      expect(rme.totalAvailableJp).toBe(0);
      expect(rme.netTeachingJp).toBe(0);
    });

    it('sanitizes negative reserve hours to 0', () => {
      const rme = calculateRme(baseWeeks, 1, 4, -20);
      expect(rme.reserveJp).toBe(0);
      expect(rme.netTeachingJp).toBe(8); // 2 KBM * 4 JP = 8
    });

    it('truncates fractional quotas with Math.floor', () => {
      const rme = calculateRme(baseWeeks, 1, 4.9, 1.9);
      expect(rme.weeklyJpQuota).toBe(4);
      expect(rme.reserveJp).toBe(1);
      expect(rme.totalAvailableJp).toBe(8); // 2 * 4
      expect(rme.netTeachingJp).toBe(7); // 8 - 1
    });

    it('handles huge numerical quotas (1,000,000 JP) without numeric overflow or NaN', () => {
      const hugeQuota = 1_000_000;
      const rme = calculateRme(baseWeeks, 1, hugeQuota, 500_000);
      expect(rme.weeklyJpQuota).toBe(1_000_000);
      expect(rme.totalAvailableJp).toBe(2_000_000);
      expect(rme.reserveJp).toBe(500_000);
      expect(rme.netTeachingJp).toBe(1_500_000);
      expect(Number.isSafeInteger(rme.totalAvailableJp)).toBe(true);
      expect(Number.isSafeInteger(rme.netTeachingJp)).toBe(true);
    });

    it('handles massive reserve exceeding available JP by clamping netTeachingJp to 0', () => {
      const rme = calculateRme(baseWeeks, 1, 4, 100_000_000);
      expect(rme.totalAvailableJp).toBe(8);
      expect(rme.reserveJp).toBe(100_000_000);
      expect(rme.netTeachingJp).toBe(0);
    });

    it('gracefully sanitizes NaN, Infinity, -Infinity for both quota and reserve', () => {
      const testCases = [
        { quota: NaN, reserve: NaN },
        { quota: Infinity, reserve: Infinity },
        { quota: -Infinity, reserve: -Infinity },
        { quota: undefined as unknown as number, reserve: null as unknown as number },
      ];

      for (const tc of testCases) {
        const rme = calculateRme(baseWeeks, 1, tc.quota, tc.reserve);
        expect(rme.weeklyJpQuota).toBe(0);
        expect(rme.reserveJp).toBe(0);
        expect(rme.totalAvailableJp).toBe(0);
        expect(rme.netTeachingJp).toBe(0);
        expect(Number.isNaN(rme.netTeachingJp)).toBe(false);
      }
    });
  });

  // =========================================================================
  // SUITE 3: Malformed & Pathological Input Structures
  // =========================================================================
  describe('3. Malformed & Pathological Input Structures', () => {
    it('handles null, undefined, and non-array inputs without throwing', () => {
      expect(() => calculateRme(null as unknown as KaldikWeek[], 1, 4)).not.toThrow();
      expect(() => calculateRme(undefined as unknown as KaldikWeek[], 1, 4)).not.toThrow();
      expect(() => calculateRme('not an array' as unknown as KaldikWeek[], 1, 4)).not.toThrow();
      expect(() => calculateRme({} as unknown as KaldikWeek[], 1, 4)).not.toThrow();

      const rmeNull = calculateRme(null as unknown as KaldikWeek[], 1, 4);
      expect(rmeNull.totalWeeks).toBe(0);
      expect(rmeNull.effectiveWeeks).toBe(0);
      expect(rmeNull.nonEffectiveWeeks).toBe(0);
      expect(rmeNull.totalAvailableJp).toBe(0);
    });

    it('filters out null/undefined sparse array elements cleanly', () => {
      const sparseWeeks: KaldikWeek[] = [
        null as unknown as KaldikWeek,
        { month: 7, weekNumber: 1, type: 'KBM' },
        undefined as unknown as KaldikWeek,
        { month: 7, weekNumber: 2, type: 'STS' },
      ];

      const rme = calculateRme(sparseWeeks, 1, 4);
      expect(rme.totalWeeks).toBe(2);
      expect(rme.effectiveWeeks).toBe(1);
      expect(rme.nonEffectiveWeeks).toBe(1);
      expect(rme.nonEffectiveBreakdown.STS).toBe(1);
    });

    it('safely handles weeks with unknown / unexpected WeekType', () => {
      const weirdWeeks: KaldikWeek[] = [
        { month: 7, weekNumber: 1, type: 'UNKNOWN_TYPE' as WeekType },
        { month: 7, weekNumber: 2, type: 'KBM' },
      ];

      const rme = calculateRme(weirdWeeks, 1, 4);
      expect(rme.totalWeeks).toBe(2);
      expect(rme.effectiveWeeks).toBe(1);
      expect(rme.nonEffectiveWeeks).toBe(1);
      // UNKNOWN_TYPE is non-effective, total non-effective is 1
      expect(rme.totalWeeks).toBe(rme.effectiveWeeks + rme.nonEffectiveWeeks);
    });

    it('strictly isolates semester 1 (months 7-12) and semester 2 (months 1-6) disregarding invalid month values', () => {
      const bizarreMonths: KaldikWeek[] = [
        { month: 0, weekNumber: 1, type: 'KBM' },
        { month: 13, weekNumber: 1, type: 'KBM' },
        { month: -5, weekNumber: 1, type: 'KBM' },
        { month: 7, weekNumber: 1, type: 'KBM' }, // Sem 1
        { month: 1, weekNumber: 1, type: 'KBM' }, // Sem 2
      ];

      const rmeSem1 = calculateRme(bizarreMonths, 1, 4);
      expect(rmeSem1.totalWeeks).toBe(1); // Only month 7
      expect(rmeSem1.effectiveWeeks).toBe(1);

      const rmeSem2 = calculateRme(bizarreMonths, 2, 4);
      expect(rmeSem2.totalWeeks).toBe(1); // Only month 1
      expect(rmeSem2.effectiveWeeks).toBe(1);
    });
  });

  // =========================================================================
  // SUITE 4: Input Immutability & Side-Effect Freedom
  // =========================================================================
  describe('4. Input Immutability & Side-Effect Freedom', () => {
    it('does not mutate input weeks array or any week objects within it', () => {
      const originalWeeks: KaldikWeek[] = [
        { month: 7, weekNumber: 1, type: 'KBM', label: 'Week 1' },
        { month: 7, weekNumber: 2, type: 'MPLS', label: 'Week 2' },
        { month: 1, weekNumber: 1, type: 'KBM', label: 'Week 1 Sem 2' },
      ];

      const serializedBefore = JSON.stringify(originalWeeks);
      calculateRme(originalWeeks, 1, 4, 2);
      const serializedAfter = JSON.stringify(originalWeeks);

      expect(serializedAfter).toBe(serializedBefore);
    });

    it('guarantees getDefaultNationalKaldik returns isolated mutable instances without poisoning preset', () => {
      const instanceA = getDefaultNationalKaldik('2024/2025');
      const instanceB = getDefaultNationalKaldik('2024/2025');

      // Mutate instance A aggressively
      instanceA[0].month = 99;
      instanceA[0].type = 'KBM';
      instanceA[0].label = 'TAMPERED';
      instanceA.pop();

      // Instance B must remain pristine
      expect(instanceB.length).toBe(60);
      expect(instanceB[0].month).toBe(7);
      expect(instanceB[0].type).toBe('LIBUR_SEMESTER');
      expect(instanceB[0].label).not.toBe('TAMPERED');

      // Canonical constant must remain pristine
      expect(DEFAULT_NATIONAL_KALDIK_PRESET.length).toBe(60);
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].month).toBe(7);
      expect(DEFAULT_NATIONAL_KALDIK_PRESET[0].type).toBe('LIBUR_SEMESTER');
    });
  });

  // =========================================================================
  // SUITE 5: Performance & Memory Benchmark
  // =========================================================================
  describe('5. Performance & Throughput Benchmark', () => {
    it('executes 10,000 calculateRme operations in under 500ms', () => {
      const preset = getDefaultNationalKaldik('2024/2025');
      const startTime = performance.now();

      const RUNS = 10_000;
      for (let i = 0; i < RUNS; i++) {
        const semester: 1 | 2 = i % 2 === 0 ? 1 : 2;
        calculateRme(preset, semester, 4, 4);
      }

      const elapsedMs = performance.now() - startTime;
      // High-performance pure function should easily execute in < 500ms
      expect(elapsedMs).toBeLessThan(500);
    });
  });
});
