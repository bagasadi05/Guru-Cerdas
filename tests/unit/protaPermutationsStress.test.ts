/**
 * @fileoverview Empirical Adversarial Stress & Permutation Test Suite for Prota Engine (Milestone M2)
 *
 * Authored by: Milestone M2 Challenger 1 (teamwork_preview_challenger)
 * Core Verification Scope:
 * 1. 1,000 Randomized Item Set Permutations & Invariant Verification:
 *    - Invariant: Delta_annual === Delta_S1 + Delta_S2
 *    - Invariant: Allocated_annual === Allocated_S1 + Allocated_S2
 *    - Invariant: Target_annual === Target_S1 + Target_S2
 *    - Invariant: Status parity and mutual exclusivity of deficit and surplus
 * 2. Extreme Boundary Values & Pathological Numerical Fuzzing:
 *    - Negative JP values (sanitized to 0)
 *    - Huge JP values (10^6, 10^9) with full 64-bit float/integer safety
 *    - Fractional JP values (floored to integer)
 *    - Null, undefined, NaN, Infinity, strings, and malformed object inputs
 * 3. Item Reordering Fuzzing (1,000 runs across varying N):
 *    - Total hours conservation: sum(targetJp) is strictly invariant
 *    - Index normalization: items re-indexed strictly 0..N-1
 *    - Array length & ID bijection preservation
 *    - Zero input mutation guarantee
 */

import { describe, it, expect } from 'vitest';
import {
  validateProtaBalance,
  calculateRecommendedReserveJp,
  createProtaItem,
  sortProtaItems,
  reorderProtaItems,
  filterProtaItemsBySemester,
  createJamCadanganProtaItem,
  isJamCadanganItem,
  getProtaBalanceBadgeProps,
  sanitizeJp,
  extractTargetJp,
  getProtaBalanceStatus,
  calculateProtaSubtotals,
  getCurriculumDescriptor,
  CURRICULUM_DESCRIPTORS,
  ProtaItem,
  RmeSummary,
} from '@/utils/protaEngine';

/**
 * Deterministic generator for test RmeSummary objects.
 */
function createSyntheticRme(
  semesterNumber: 1 | 2,
  effectiveWeeks: number,
  weeklyJpQuota: number,
  reserveJp = 0
): RmeSummary {
  const totalAvailableJp = effectiveWeeks * weeklyJpQuota;
  return {
    semesterNumber,
    totalWeeks: 30,
    effectiveWeeks,
    nonEffectiveWeeks: Math.max(0, 30 - effectiveWeeks),
    nonEffectiveBreakdown: {
      KBM: 0,
      MPLS: 0,
      STS: 0,
      SAS: 0,
      RAPOR: 0,
      LIBUR_SEMESTER: 0,
      LIBUR_NASIONAL: 0,
      KEGIATAN_KHUSUS: 0,
      NON_ACTIVE: 0,
    },
    weeklyJpQuota,
    totalAvailableJp,
    reserveJp,
    netTeachingJp: Math.max(0, totalAvailableJp - reserveJp),
  };
}

describe('Adversarial Challenger Suite 1: Prota Engine Permutations & Invariants', () => {
  // =========================================================================
  // 1. 1,000 RANDOMIZED PERMUTATIONS & MATHEMATICAL INVARIANTS
  // =========================================================================
  describe('1. 1,000 Randomized Item Set Permutations & Invariant Verification', () => {
    it('proves invariant Delta_annual === Delta_S1 + Delta_S2 across 1,000 randomized permutations', () => {
      const PERMUTATION_COUNT = 1000;
      let totalItemsTested = 0;

      for (let run = 0; run < PERMUTATION_COUNT; run++) {
        // Generate pseudo-random RME targets
        const weeks1 = Math.floor(Math.random() * 22) + 1; // 1 to 22 weeks
        const quota1 = Math.floor(Math.random() * 6) + 1; // 1 to 6 JP
        const reserve1 = Math.floor(Math.random() * 8); // 0 to 7 JP
        const rme1 = createSyntheticRme(1, weeks1, quota1, reserve1);

        const weeks2 = Math.floor(Math.random() * 22) + 1;
        const quota2 = Math.floor(Math.random() * 6) + 1;
        const reserve2 = Math.floor(Math.random() * 8);
        const rme2 = createSyntheticRme(2, weeks2, quota2, reserve2);

        // Generate random number of curriculum items (0 to 50 items)
        const itemCount = Math.floor(Math.random() * 51);
        const items: ProtaItem[] = [];

        for (let i = 0; i < itemCount; i++) {
          const semesterRand = Math.random();
          // Distribute across S1, S2, and 2% outlier semester
          const semesterNumber: 1 | 2 = semesterRand < 0.49 ? 1 : semesterRand < 0.98 ? 2 : (3 as unknown as 1 | 2);
          const targetJp = Math.floor(Math.random() * 24); // 0 to 23 JP
          items.push(
            createProtaItem({
              id: `run-${run}-item-${i}`,
              semesterNumber,
              learningObjectiveCode: `TP ${semesterNumber}.${i + 1}`,
              targetJp,
              orderIndex: i,
            })
          );
        }

        totalItemsTested += items.length;

        // Execute balancing validation
        const val = validateProtaBalance(items, rme1, rme2);

        // --- INVARIANT 1: Annual Allocated JP is strictly sum of S1 + S2 Allocated JP ---
        expect(val.allocatedAnnualJp).toBe(val.allocatedSemester1Jp + val.allocatedSemester2Jp);

        // --- INVARIANT 2: Annual Target JP is strictly sum of S1 + S2 Target JP ---
        const expectedTarget1 = Math.max(0, weeks1 * quota1 - reserve1);
        const expectedTarget2 = Math.max(0, weeks2 * quota2 - reserve2);
        expect(val.totalTargetJp).toBe(expectedTarget1 + expectedTarget2);

        // --- INVARIANT 3: Signed differences per semester ---
        expect(val.diffSemester1).toBe(val.allocatedSemester1Jp - expectedTarget1);
        expect(val.diffSemester2).toBe(val.allocatedSemester2Jp - expectedTarget2);

        // --- INVARIANT 4: CORE MATHEMATICAL THEOREM: Delta_annual === Delta_S1 + Delta_S2 ---
        expect(val.diffAnnual).toBe(val.diffSemester1 + val.diffSemester2);
        expect(val.diffAnnual).toBe(val.allocatedAnnualJp - val.totalTargetJp);

        // --- INVARIANT 5: Discrete status alignment ---
        expect(val.statusSemester1).toBe(getProtaBalanceStatus(val.diffSemester1));
        expect(val.statusSemester2).toBe(getProtaBalanceStatus(val.diffSemester2));
        expect(val.statusAnnual).toBe(getProtaBalanceStatus(val.diffAnnual));

        // --- INVARIANT 6: Mutual exclusivity of deficit and surplus ---
        expect(Math.min(val.deficitJpSemester1, val.surplusJpSemester1)).toBe(0);
        expect(Math.min(val.deficitJpSemester2, val.surplusJpSemester2)).toBe(0);

        // --- INVARIANT 7: Deficit / Surplus non-negative magnitudes ---
        if (val.diffSemester1 < 0) {
          expect(val.deficitJpSemester1).toBe(-val.diffSemester1);
          expect(val.surplusJpSemester1).toBe(0);
        } else if (val.diffSemester1 > 0) {
          expect(val.surplusJpSemester1).toBe(val.diffSemester1);
          expect(val.deficitJpSemester1).toBe(0);
        } else {
          expect(val.deficitJpSemester1).toBe(0);
          expect(val.surplusJpSemester1).toBe(0);
        }

        if (val.diffSemester2 < 0) {
          expect(val.deficitJpSemester2).toBe(-val.diffSemester2);
          expect(val.surplusJpSemester2).toBe(0);
        } else if (val.diffSemester2 > 0) {
          expect(val.surplusJpSemester2).toBe(val.diffSemester2);
          expect(val.deficitJpSemester2).toBe(0);
        } else {
          expect(val.deficitJpSemester2).toBe(0);
          expect(val.surplusJpSemester2).toBe(0);
        }

        // --- INVARIANT 8: Finiteness & safety ---
        expect(Number.isFinite(val.allocatedAnnualJp)).toBe(true);
        expect(Number.isFinite(val.diffAnnual)).toBe(true);
        expect(Number.isSafeInteger(val.diffAnnual)).toBe(true);

        // --- INVARIANT 9: calculateProtaSubtotals parity ---
        const subtotals = calculateProtaSubtotals(items);
        expect(subtotals.semester1Jp).toBe(val.allocatedSemester1Jp);
        expect(subtotals.semester2Jp).toBe(val.allocatedSemester2Jp);
        expect(subtotals.annualJp).toBe(val.allocatedAnnualJp);
      }

      expect(totalItemsTested).toBeGreaterThan(1000);
    });
  });

  // =========================================================================
  // 2. EXTREME BOUNDARY VALUES & PATHOLOGICAL NUMERICAL FUZZING
  // =========================================================================
  describe('2. Extreme Boundary Values & Pathological Numerical Fuzzing', () => {
    const standardRme1 = createSyntheticRme(1, 18, 4, 4); // target: 68
    const standardRme2 = createSyntheticRme(2, 18, 4, 4); // target: 68

    it('sanitizes negative JP values to 0 and correctly reports deep deficit', () => {
      const items = [
        createProtaItem({ semesterNumber: 1, targetJp: -50 }),
        createProtaItem({ semesterNumber: 1, targetJp: -1 }),
        createProtaItem({ semesterNumber: 2, targetJp: -1_000_000 }),
      ];

      const res = validateProtaBalance(items, standardRme1, standardRme2);
      expect(res.allocatedSemester1Jp).toBe(0);
      expect(res.allocatedSemester2Jp).toBe(0);
      expect(res.allocatedAnnualJp).toBe(0);
      expect(res.diffSemester1).toBe(-68);
      expect(res.diffSemester2).toBe(-68);
      expect(res.diffAnnual).toBe(-136);
      expect(res.statusAnnual).toBe('DEFISIT');
      expect(res.deficitJpSemester1).toBe(68);
      expect(res.deficitJpSemester2).toBe(68);
    });

    it('handles astronomical JP numbers (10^6, 10^9) without overflow or NaN', () => {
      const items = [
        createProtaItem({ semesterNumber: 1, targetJp: 1_000_000 }),
        createProtaItem({ semesterNumber: 2, targetJp: 10_000_000 }),
      ];

      const res = validateProtaBalance(items, standardRme1, standardRme2);
      expect(res.allocatedSemester1Jp).toBe(1_000_000);
      expect(res.allocatedSemester2Jp).toBe(10_000_000);
      expect(res.allocatedAnnualJp).toBe(11_000_000);
      expect(res.diffSemester1).toBe(1_000_000 - 68);
      expect(res.diffSemester2).toBe(10_000_000 - 68);
      expect(res.diffAnnual).toBe(11_000_000 - 136);
      expect(res.diffAnnual).toBe(res.diffSemester1 + res.diffSemester2);
      expect(res.statusAnnual).toBe('SURPLUS');
      expect(Number.isSafeInteger(res.diffAnnual)).toBe(true);
    });

    it('floors fractional / decimal JP inputs cleanly', () => {
      const items = [
        createProtaItem({ semesterNumber: 1, targetJp: 4.999 }),
        createProtaItem({ semesterNumber: 1, targetJp: 0.1 }),
        createProtaItem({ semesterNumber: 2, targetJp: 18.0001 }),
      ];

      const res = validateProtaBalance(items, standardRme1, standardRme2);
      expect(res.allocatedSemester1Jp).toBe(4); // 4 + 0
      expect(res.allocatedSemester2Jp).toBe(18);
      expect(res.allocatedAnnualJp).toBe(22);
    });

    it('neutralizes non-numeric and non-finite values (null, undefined, NaN, Infinity, strings, objects)', () => {
      const pathologicalItems = [
        createProtaItem({ semesterNumber: 1, targetJp: NaN }),
        createProtaItem({ semesterNumber: 1, targetJp: Infinity }),
        createProtaItem({ semesterNumber: 1, targetJp: -Infinity }),
        createProtaItem({ semesterNumber: 1, targetJp: '80' as unknown as number }),
        createProtaItem({ semesterNumber: 2, targetJp: null as unknown as number }),
        createProtaItem({ semesterNumber: 2, targetJp: undefined as unknown as number }),
        createProtaItem({ semesterNumber: 2, targetJp: { jp: 20 } as unknown as number }),
      ];

      const res = validateProtaBalance(pathologicalItems, standardRme1, standardRme2);
      expect(res.allocatedSemester1Jp).toBe(0);
      expect(res.allocatedSemester2Jp).toBe(0);
      expect(res.allocatedAnnualJp).toBe(0);
      expect(res.diffAnnual).toBe(-136);
      expect(res.statusAnnual).toBe('DEFISIT');
      expect(Number.isNaN(res.diffAnnual)).toBe(false);
    });

    it('calculateRecommendedReserveJp: rigorous boundary tests with extreme inputs', () => {
      expect(calculateRecommendedReserveJp(0)).toBe(0);
      expect(calculateRecommendedReserveJp(-50)).toBe(0);
      expect(calculateRecommendedReserveJp(NaN)).toBe(0);
      expect(calculateRecommendedReserveJp(Infinity)).toBe(0);
      expect(calculateRecommendedReserveJp(-Infinity)).toBe(0);

      // Clamping minimum percentage (0.01)
      expect(calculateRecommendedReserveJp(100, -1.0)).toBe(1);
      expect(calculateRecommendedReserveJp(100, 0)).toBe(1);
      expect(calculateRecommendedReserveJp(100, 0.001)).toBe(1);

      // Clamping maximum percentage (0.25)
      expect(calculateRecommendedReserveJp(100, 0.3)).toBe(25);
      expect(calculateRecommendedReserveJp(100, 1.0)).toBe(25);
      expect(calculateRecommendedReserveJp(100, 1000)).toBe(25);

      // Large available hours calculation
      expect(calculateRecommendedReserveJp(1_000_000, 0.05)).toBe(50_000);
    });

    it('sanitizeJp and extractTargetJp handle negative, fractional, and fallback scenarios', () => {
      expect(sanitizeJp(-100)).toBe(0);
      expect(sanitizeJp(14.8)).toBe(14);
      expect(sanitizeJp('invalid')).toBe(0);
      expect(extractTargetJp(standardRme1)).toBe(68);
      expect(extractTargetJp(null)).toBe(0);
    });
  });

  // =========================================================================
  // 3. ITEM REORDERING FUZZING & TOTAL HOURS CONSERVATION
  // =========================================================================
  describe('3. Item Reordering Fuzzing & Total Hours Conservation', () => {
    it('executes 1,000 randomized reorder operations confirming exact hour conservation and sequential 0..N-1 indexes', () => {
      const FUZZ_RUNS = 1000;
      const testLengths = [1, 2, 4, 8, 16, 32, 64];

      for (let run = 0; run < FUZZ_RUNS; run++) {
        const len = testLengths[run % testLengths.length];
        const items: ProtaItem[] = [];
        let expectedTotalHours = 0;

        for (let i = 0; i < len; i++) {
          const jp = Math.floor(Math.random() * 15) + 1; // 1 to 15 JP
          expectedTotalHours += jp;
          items.push(
            createProtaItem({
              id: `fuzz-${run}-${i}`,
              semesterNumber: (i % 2 === 0 ? 1 : 2) as 1 | 2,
              learningObjectiveCode: `TP ${i + 1}`,
              targetJp: jp,
              orderIndex: i,
            })
          );
        }

        // Deep copy snapshot to verify immutability
        const originalSnapshot = JSON.stringify(items);

        // Pick random start and end indices, including negative and out-of-bounds
        const start = Math.floor(Math.random() * (len + 6)) - 3; // -3 to len+2
        const end = Math.floor(Math.random() * (len + 6)) - 3;

        const reordered = reorderProtaItems(items, start, end);

        // INVARIANT 1: Input array and objects are strictly unmutated
        expect(JSON.stringify(items)).toBe(originalSnapshot);

        // INVARIANT 2: Length is preserved
        expect(reordered.length).toBe(len);

        // INVARIANT 3: Exact conservation of total hours
        const actualTotalHours = reordered.reduce((sum, item) => sum + item.targetJp, 0);
        expect(actualTotalHours).toBe(expectedTotalHours);

        // INVARIANT 4: Strict sequential orderIndex normalization 0..N-1
        for (let idx = 0; idx < reordered.length; idx++) {
          expect(reordered[idx].orderIndex).toBe(idx);
        }

        // INVARIANT 5: Set of item IDs preserved with exact cardinality
        const originalIdSet = new Set(items.map((i) => i.id));
        const reorderedIdSet = new Set(reordered.map((i) => i.id));
        expect(reorderedIdSet.size).toBe(len);
        for (const id of originalIdSet) {
          expect(reorderedIdSet.has(id)).toBe(true);
        }
      }
    });

    it('verifies boundary reorder operations (empty array, null input, single item, start === end)', () => {
      expect(reorderProtaItems([], 0, 0)).toEqual([]);
      expect(reorderProtaItems(null as unknown as ProtaItem[], 0, 0)).toEqual([]);

      const single = [createProtaItem({ id: 'only', orderIndex: 0, targetJp: 12 })];
      const reorderedSingle = reorderProtaItems(single, 0, 0);
      expect(reorderedSingle).toHaveLength(1);
      expect(reorderedSingle[0].id).toBe('only');
      expect(reorderedSingle[0].orderIndex).toBe(0);

      const pair = [
        createProtaItem({ id: 'first', orderIndex: 0 }),
        createProtaItem({ id: 'second', orderIndex: 1 }),
      ];
      const reorderedPair = reorderProtaItems(pair, 0, 1);
      expect(reorderedPair[0].id).toBe('second');
      expect(reorderedPair[0].orderIndex).toBe(0);
      expect(reorderedPair[1].id).toBe('first');
      expect(reorderedPair[1].orderIndex).toBe(1);
    });
  });

  // =========================================================================
  // 4. SORTING STABILITY & CURRICULUM HELPERS
  // =========================================================================
  describe('4. Sorting Determinism & Curriculum Helper Verification', () => {
    it('sortProtaItems sorts deterministically with natural alphanumeric collation on codes', () => {
      const items: ProtaItem[] = [
        createProtaItem({ id: 's2', semesterNumber: 2, orderIndex: 0, learningObjectiveCode: 'TP 2.1' }),
        createProtaItem({ id: 's1-10', semesterNumber: 1, orderIndex: 0, learningObjectiveCode: 'TP 1.10' }),
        createProtaItem({ id: 's1-2', semesterNumber: 1, orderIndex: 0, learningObjectiveCode: 'TP 1.2' }),
        createProtaItem({ id: 's1-1', semesterNumber: 1, orderIndex: 0, learningObjectiveCode: 'TP 1.1' }),
      ];

      const sorted = sortProtaItems(items);
      expect(sorted[0].id).toBe('s1-1'); // TP 1.1
      expect(sorted[1].id).toBe('s1-2'); // TP 1.2 precedes TP 1.10 in natural collation
      expect(sorted[2].id).toBe('s1-10'); // TP 1.10
      expect(sorted[3].id).toBe('s2'); // Semester 2
    });

    it('filterProtaItemsBySemester: correctly filters and sorts by orderIndex', () => {
      const items: ProtaItem[] = [
        createProtaItem({ id: 'b', semesterNumber: 1, orderIndex: 3 }),
        createProtaItem({ id: 'a', semesterNumber: 1, orderIndex: 1 }),
        createProtaItem({ id: 'c', semesterNumber: 2, orderIndex: 0 }),
      ];

      const s1 = filterProtaItemsBySemester(items, 1);
      expect(s1).toHaveLength(2);
      expect(s1[0].id).toBe('a');
      expect(s1[1].id).toBe('b');

      const s2 = filterProtaItemsBySemester(items, 2);
      expect(s2).toHaveLength(1);
      expect(s2[0].id).toBe('c');
    });

    it('getProtaBalanceBadgeProps and descriptors provide correct UI styling and labels', () => {
      const badgePas = getProtaBalanceBadgeProps('PAS', 0);
      expect(badgePas.iconName).toBe('CheckCircle');
      expect(badgePas.badgeClass).toContain('emerald');

      const badgeDef = getProtaBalanceBadgeProps('DEFISIT', -6);
      expect(badgeDef.iconName).toBe('AlertTriangle');
      expect(badgeDef.badgeClass).toContain('amber');
      expect(badgeDef.diffText).toBe('-6 JP');

      const badgeSur = getProtaBalanceBadgeProps('SURPLUS', 4);
      expect(badgeSur.iconName).toBe('AlertCircle');
      expect(badgeSur.badgeClass).toContain('rose');
      expect(badgeSur.diffText).toBe('+4 JP');

      expect(getCurriculumDescriptor('MERDEKA').codePrefix).toBe('TP');
      expect(getCurriculumDescriptor('K13').codePrefix).toBe('KD');
      expect(CURRICULUM_DESCRIPTORS.MERDEKA.curriculum).toBe('MERDEKA');
      expect(CURRICULUM_DESCRIPTORS.K13.curriculum).toBe('K13');
    });

    it('createJamCadanganProtaItem and isJamCadanganItem operate consistently', () => {
      const cadangan = createJamCadanganProtaItem(4, 1);
      expect(isJamCadanganItem(cadangan)).toBe(true);
      expect(cadangan.targetJp).toBe(4);
      expect(cadangan.semesterNumber).toBe(1);
    });
  });
});
