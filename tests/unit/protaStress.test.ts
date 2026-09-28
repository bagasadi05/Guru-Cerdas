/**
 * @fileoverview Empirical Adversarial Stress Test Suite for Prota Engine (Milestone M2)
 *
 * Authored by: Milestone M2 Challenger 2 (teamwork_preview_challenger)
 * Focus:
 * 1. Jam Cadangan balancing invariants (deficit compensation, target JP extraction fallback vs explicit)
 * 2. Multi-Semester shift dynamics & exact hour conservation laws (fuzzing & property-based tests)
 * 3. Defensive sanitization against adversarial, malformed, non-finite, and out-of-bounds inputs
 */

import { describe, it, expect } from 'vitest';
import {
  validateProtaBalance,
  calculateRecommendedReserveJp,
  createProtaItem,
  createJamCadanganProtaItem,
  isJamCadanganItem,
  extractTargetJp,
  sanitizeJp,
  sortProtaItems,
  reorderProtaItems,
  filterProtaItemsBySemester,
  calculateProtaSubtotals,
  getProtaBalanceStatus,
  getProtaBalanceBadgeProps,
  ProtaItem,
  RmeSummary,
} from '@/utils/protaEngine';

/**
 * Helper to build custom RmeSummary fixtures for testing.
 */
function createMockRme(
  semesterNumber: 1 | 2,
  effectiveWeeks: number,
  weeklyJpQuota: number,
  reserveJp = 0,
  overrideNet?: number
): RmeSummary {
  const totalAvailableJp = effectiveWeeks * weeklyJpQuota;
  const netTeachingJp = overrideNet !== undefined ? overrideNet : Math.max(0, totalAvailableJp - reserveJp);
  return {
    semesterNumber,
    totalWeeks: 30,
    effectiveWeeks,
    nonEffectiveWeeks: 30 - effectiveWeeks,
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
    netTeachingJp,
  };
}

describe('Prota Engine - Empirical Adversarial Stress Suite (Challenger M2-2)', () => {
  // =========================================================================
  // SECTION 1: JAM CADANGAN BALANCING INVARIANTS
  // =========================================================================
  describe('1. Jam Cadangan Balancing Invariants', () => {
    it('Deficit Compensation Invariant: Adding a Jam Cadangan item matching deficit restores status to PAS', () => {
      // Setup: Semester 1 target is 72 JP (e.g. 18 weeks * 4 JP/wk, 0 reserve)
      // Semester 2 target is 68 JP (e.g. 18 weeks * 4 JP/wk - 4 reserve)
      const rmeSem1 = createMockRme(1, 18, 4, 0); // 72 JP net
      const rmeSem2 = createMockRme(2, 18, 4, 4); // 68 JP net

      // Sub-case A: Arbitrary teaching items creating deficits in both semesters
      const initialItems: ProtaItem[] = [
        createProtaItem({ semesterNumber: 1, targetJp: 30, learningObjectiveCode: 'TP 1.1' }),
        createProtaItem({ semesterNumber: 1, targetJp: 20, learningObjectiveCode: 'TP 1.2' }), // S1 sum = 50 (Deficit = 22)
        createProtaItem({ semesterNumber: 2, targetJp: 40, learningObjectiveCode: 'TP 2.1' }),
        createProtaItem({ semesterNumber: 2, targetJp: 15, learningObjectiveCode: 'TP 2.2' }), // S2 sum = 55 (Deficit = 13)
      ];

      const initialValidation = validateProtaBalance(initialItems, rmeSem1, rmeSem2);
      expect(initialValidation.statusSemester1).toBe('DEFISIT');
      expect(initialValidation.deficitJpSemester1).toBe(22);
      expect(initialValidation.diffSemester1).toBe(-22);

      expect(initialValidation.statusSemester2).toBe('DEFISIT');
      expect(initialValidation.deficitJpSemester2).toBe(13);
      expect(initialValidation.diffSemester2).toBe(-13);

      expect(initialValidation.statusAnnual).toBe('DEFISIT');
      expect(initialValidation.diffAnnual).toBe(-35);

      // Now add Jam Cadangan items exactly compensating each semester's deficit
      const cadanganS1 = createJamCadanganProtaItem(initialValidation.deficitJpSemester1, 1);
      const cadanganS2 = createJamCadanganProtaItem(initialValidation.deficitJpSemester2, 2);

      expect(isJamCadanganItem(cadanganS1)).toBe(true);
      expect(isJamCadanganItem(cadanganS2)).toBe(true);
      expect(cadanganS1.targetJp).toBe(22);
      expect(cadanganS2.targetJp).toBe(13);

      const balancedItems = [...initialItems, cadanganS1, cadanganS2];
      const balancedValidation = validateProtaBalance(balancedItems, rmeSem1, rmeSem2);

      // Invariant: Both semesters and annual MUST be strictly PAS
      expect(balancedValidation.statusSemester1).toBe('PAS');
      expect(balancedValidation.diffSemester1).toBe(0);
      expect(balancedValidation.deficitJpSemester1).toBe(0);
      expect(balancedValidation.surplusJpSemester1).toBe(0);

      expect(balancedValidation.statusSemester2).toBe('PAS');
      expect(balancedValidation.diffSemester2).toBe(0);
      expect(balancedValidation.deficitJpSemester2).toBe(0);
      expect(balancedValidation.surplusJpSemester2).toBe(0);

      expect(balancedValidation.statusAnnual).toBe('PAS');
      expect(balancedValidation.diffAnnual).toBe(0);
      expect(balancedValidation.allocatedAnnualJp).toBe(balancedValidation.totalTargetJp);
    });

    it('Split Jam Cadangan Invariant: Multiple smaller reserve items summing to deficit also yield PAS', () => {
      const rme1 = createMockRme(1, 18, 3, 0); // 54 JP target
      const rme2 = createMockRme(2, 18, 3, 0); // 54 JP target

      // Initial teaching allocation: 44 JP in Sem 1 (deficit: 10 JP)
      const items: ProtaItem[] = [
        createProtaItem({ semesterNumber: 1, targetJp: 44 }),
        createProtaItem({ semesterNumber: 2, targetJp: 54 }),
      ];

      // Add two separate reserve items: 4 JP remedial + 6 JP pengayaan
      const reserve1 = createProtaItem({
        semesterNumber: 1,
        elementOrDomain: 'Jam Cadangan',
        learningObjectiveCode: 'CADANGAN',
        targetJp: 4,
      });
      const reserve2 = createProtaItem({
        semesterNumber: 1,
        elementOrDomain: 'Jam Cadangan',
        learningObjectiveCode: 'CADANGAN',
        targetJp: 6,
      });

      const result = validateProtaBalance([...items, reserve1, reserve2], rme1, rme2);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.diffSemester1).toBe(0);
      expect(result.deficitJpSemester1).toBe(0);
      expect(result.statusAnnual).toBe('PAS');
    });

    it('extractTargetJp: correctly handles explicit netTeachingJp vs fallback (available - reserve)', () => {
      // 1. Explicit netTeachingJp present
      const rmeExplicit = createMockRme(1, 18, 4, 4, 68);
      expect(extractTargetJp(rmeExplicit)).toBe(68);

      // 2. netTeachingJp is 0
      const rmeZeroNet = createMockRme(1, 18, 4, 72, 0);
      expect(extractTargetJp(rmeZeroNet)).toBe(0);

      // 3. Fallback when netTeachingJp is undefined: (totalAvailableJp - reserveJp)
      const rmeFallback1: Partial<RmeSummary> = {
        totalAvailableJp: 72,
        reserveJp: 6,
      };
      expect(extractTargetJp(rmeFallback1 as RmeSummary)).toBe(66);

      // 4. Fallback when totalAvailableJp is missing: (effectiveWeeks * weeklyJpQuota) - reserveJp
      const rmeFallback2: Partial<RmeSummary> = {
        effectiveWeeks: 18,
        weeklyJpQuota: 3,
        reserveJp: 4,
      };
      expect(extractTargetJp(rmeFallback2 as RmeSummary)).toBe(50); // 18 * 3 - 4 = 50

      // 5. Fallback when reserveJp is undefined: defaults to 0
      const rmeFallbackNoReserve: Partial<RmeSummary> = {
        totalAvailableJp: 40,
      };
      expect(extractTargetJp(rmeFallbackNoReserve as RmeSummary)).toBe(40);

      // 6. Extreme: reserveJp > totalAvailableJp clamps to 0 (never negative)
      const rmeOverReserve: Partial<RmeSummary> = {
        totalAvailableJp: 30,
        reserveJp: 50,
      };
      expect(extractTargetJp(rmeOverReserve as RmeSummary)).toBe(0);

      // 7. Defensive null/undefined/empty object handling
      expect(extractTargetJp(null)).toBe(0);
      expect(extractTargetJp(undefined)).toBe(0);
      expect(extractTargetJp({} as RmeSummary)).toBe(0);
    });

    it('calculateRecommendedReserveJp: Monte Carlo property checks over 500 configurations', () => {
      for (let i = 1; i <= 500; i++) {
        const availableJp = i;
        const rec5 = calculateRecommendedReserveJp(availableJp);
        // Guarantee non-negative integer
        expect(rec5).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(rec5)).toBe(true);
        // Guarantee cannot exceed availableJp
        expect(rec5).toBeLessThanOrEqual(availableJp);

        // Check ratio bounds: ~5% rounded
        const expected = Math.min(availableJp, Math.max(0, Math.round(availableJp * 0.05)));
        expect(rec5).toBe(expected);
      }

      // Edge cases
      expect(calculateRecommendedReserveJp(0)).toBe(0);
      expect(calculateRecommendedReserveJp(-100)).toBe(0);
      expect(calculateRecommendedReserveJp(NaN)).toBe(0);
      expect(calculateRecommendedReserveJp(Infinity)).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 2: MULTI-SEMESTER SHIFT DYNAMICS & CONSERVATION LAWS
  // =========================================================================
  describe('2. Multi-Semester Shift Dynamics & Conservation Laws', () => {
    it('Single Item Shift: Moving item between semesters strictly preserves annual total and conservation delta', () => {
      const rme1 = createMockRme(1, 18, 4, 0); // 72 JP
      const rme2 = createMockRme(2, 18, 4, 0); // 72 JP

      const itemA = createProtaItem({ id: 'item-A', semesterNumber: 1, targetJp: 20 });
      const itemB = createProtaItem({ id: 'item-B', semesterNumber: 1, targetJp: 30 });
      const itemC = createProtaItem({ id: 'item-C', semesterNumber: 2, targetJp: 40 });

      const state1 = validateProtaBalance([itemA, itemB, itemC], rme1, rme2);
      expect(state1.allocatedSemester1Jp).toBe(50);
      expect(state1.allocatedSemester2Jp).toBe(40);
      expect(state1.allocatedAnnualJp).toBe(90);
      expect(state1.diffSemester1).toBe(50 - 72); // -22
      expect(state1.diffSemester2).toBe(40 - 72); // -32
      expect(state1.diffAnnual).toBe(90 - 144); // -54

      // SHIFT: Move itemB (30 JP) from Semester 1 to Semester 2
      const shiftedItemB = { ...itemB, semesterNumber: 2 as const };
      const state2 = validateProtaBalance([itemA, shiftedItemB, itemC], rme1, rme2);

      // Exact mathematical assertions:
      // S1 allocation decreases by 30
      expect(state2.allocatedSemester1Jp).toBe(state1.allocatedSemester1Jp - 30);
      // S2 allocation increases by 30
      expect(state2.allocatedSemester2Jp).toBe(state1.allocatedSemester2Jp + 30);
      // Annual allocation is strictly invariant!
      expect(state2.allocatedAnnualJp).toBe(state1.allocatedAnnualJp);

      // S1 difference shifts by -30
      expect(state2.diffSemester1).toBe(state1.diffSemester1 - 30);
      // S2 difference shifts by +30
      expect(state2.diffSemester2).toBe(state1.diffSemester2 + 30);
      // Annual difference is strictly invariant!
      expect(state2.diffAnnual).toBe(state1.diffAnnual);

      // ROUND-TRIP INVARIANT: Move itemB back to Semester 1
      const restoredItemB = { ...shiftedItemB, semesterNumber: 1 as const };
      const state3 = validateProtaBalance([itemA, restoredItemB, itemC], rme1, rme2);
      expect(state3).toEqual(state1);
    });

    it('Fuzzing & Property Test: 100 random curriculum shifts maintain conservation invariants without leaking hours', () => {
      const rme1 = createMockRme(1, 18, 4, 4); // 68 JP
      const rme2 = createMockRme(2, 17, 4, 2); // 66 JP
      const totalTarget = 68 + 66; // 134 JP

      // Seed 20 items with random JP values between 2 and 16
      let currentItems: ProtaItem[] = [];
      let seedSum = 0;
      for (let i = 0; i < 20; i++) {
        const jp = 2 + (i % 7) * 2; // deterministic pseudo-random values [2, 4, 6, 8, 10, 12, 14]
        const sem = (i % 2 === 0 ? 1 : 2) as 1 | 2;
        currentItems.push(createProtaItem({
          id: `fuzz-item-${i}`,
          semesterNumber: sem,
          targetJp: jp,
        }));
        seedSum += jp;
      }

      const initialValidation = validateProtaBalance(currentItems, rme1, rme2);
      expect(initialValidation.allocatedAnnualJp).toBe(seedSum);
      expect(initialValidation.totalTargetJp).toBe(totalTarget);

      // Perform 100 consecutive random migrations across semesters
      for (let step = 0; step < 100; step++) {
        const targetIndex = (step * 7 + 3) % currentItems.length;
        const itemToShift = currentItems[targetIndex];
        const newSemester: 1 | 2 = itemToShift.semesterNumber === 1 ? 2 : 1;

        // Perform shift
        currentItems = currentItems.map((item, idx) =>
          idx === targetIndex ? { ...item, semesterNumber: newSemester } : item
        );

        const stepValidation = validateProtaBalance(currentItems, rme1, rme2);

        // INVARIANT 1: Total allocated annual JP NEVER LEAKS A SINGLE HOUR
        expect(stepValidation.allocatedAnnualJp).toBe(seedSum);

        // INVARIANT 2: Annual allocation is exactly the sum of semester allocations
        expect(stepValidation.allocatedAnnualJp).toBe(
          stepValidation.allocatedSemester1Jp + stepValidation.allocatedSemester2Jp
        );

        // INVARIANT 3: Annual diff is exactly the sum of semester diffs
        expect(stepValidation.diffAnnual).toBe(
          stepValidation.diffSemester1 + stepValidation.diffSemester2
        );

        // INVARIANT 4: Annual diff is allocated minus target
        expect(stepValidation.diffAnnual).toBe(stepValidation.allocatedAnnualJp - totalTarget);

        // INVARIANT 5: Deficit and Surplus mutual exclusivity per semester
        expect(Math.min(stepValidation.deficitJpSemester1, stepValidation.surplusJpSemester1)).toBe(0);
        expect(Math.min(stepValidation.deficitJpSemester2, stepValidation.surplusJpSemester2)).toBe(0);

        // INVARIANT 6: Deficit and surplus magnitudes match diff signs
        if (stepValidation.diffSemester1 < 0) {
          expect(stepValidation.deficitJpSemester1).toBe(Math.abs(stepValidation.diffSemester1));
          expect(stepValidation.surplusJpSemester1).toBe(0);
          expect(stepValidation.statusSemester1).toBe('DEFISIT');
        } else if (stepValidation.diffSemester1 > 0) {
          expect(stepValidation.surplusJpSemester1).toBe(stepValidation.diffSemester1);
          expect(stepValidation.deficitJpSemester1).toBe(0);
          expect(stepValidation.statusSemester1).toBe('SURPLUS');
        } else {
          expect(stepValidation.deficitJpSemester1).toBe(0);
          expect(stepValidation.surplusJpSemester1).toBe(0);
          expect(stepValidation.statusSemester1).toBe('PAS');
        }

        // INVARIANT 7: Status helper & Badge props agreement
        expect(getProtaBalanceStatus(stepValidation.diffSemester1)).toBe(stepValidation.statusSemester1);
        const badgeProps = getProtaBalanceBadgeProps(stepValidation.statusSemester1, stepValidation.diffSemester1);
        expect(badgeProps.status).toBe(stepValidation.statusSemester1);

        // INVARIANT 8: filterProtaItemsBySemester partitions match allocations
        const filteredS1 = filterProtaItemsBySemester(currentItems, 1);
        const filteredS2 = filterProtaItemsBySemester(currentItems, 2);
        expect(filteredS1.length + filteredS2.length).toBe(currentItems.length);
        const sumFilteredS1 = filteredS1.reduce((sum, item) => sum + item.targetJp, 0);
        expect(sumFilteredS1).toBe(stepValidation.allocatedSemester1Jp);
      }
    });

    it('Jam Cadangan Transfer: Moving reserve item between semesters reallocates contingency without annual drift', () => {
      const rme1 = createMockRme(1, 18, 4, 4); // 68 target
      const rme2 = createMockRme(2, 18, 4, 4); // 68 target

      const items: ProtaItem[] = [
        createProtaItem({ semesterNumber: 1, targetJp: 64 }), // Deficit = 4
        createProtaItem({ semesterNumber: 2, targetJp: 68 }), // PAS
        createJamCadanganProtaItem(4, 1), // Reserve 4 in Sem 1 -> Sem 1 PAS!
      ];

      const initial = validateProtaBalance(items, rme1, rme2);
      expect(initial.statusSemester1).toBe('PAS');
      expect(initial.statusSemester2).toBe('PAS');
      expect(initial.statusAnnual).toBe('PAS');

      // Now transfer the Jam Cadangan item from Sem 1 to Sem 2
      const transferredItems = items.map((item) =>
        isJamCadanganItem(item) ? { ...item, semesterNumber: 2 as const } : item
      );

      const after = validateProtaBalance(transferredItems, rme1, rme2);
      // Sem 1 is now deficient by 4
      expect(after.statusSemester1).toBe('DEFISIT');
      expect(after.deficitJpSemester1).toBe(4);
      expect(after.diffSemester1).toBe(-4);

      // Sem 2 now has surplus of 4
      expect(after.statusSemester2).toBe('SURPLUS');
      expect(after.surplusJpSemester2).toBe(4);
      expect(after.diffSemester2).toBe(4);

      // Annual remains strictly PAS (conservation of total hours!)
      expect(after.statusAnnual).toBe('PAS');
      expect(after.diffAnnual).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 3: DEFENSIVE SANITIZATION & ADVERSARIAL BOUNDARY INPUTS
  // =========================================================================
  describe('3. Defensive Sanitization & Adversarial Boundary Inputs', () => {
    it('Defensive array filtering: Handles null, undefined, or malformed items in items list', () => {
      const rme1 = createMockRme(1, 18, 2); // 36 target
      const rme2 = createMockRme(2, 18, 2); // 36 target

      const adversarialItems = [
        null as unknown as ProtaItem,
        undefined as unknown as ProtaItem,
        createProtaItem({ semesterNumber: 1, targetJp: 18 }),
        {} as ProtaItem,
        { semesterNumber: 1, targetJp: 'invalid' } as unknown as ProtaItem,
        createProtaItem({ semesterNumber: 2, targetJp: 36 }),
      ];

      const result = validateProtaBalance(adversarialItems, rme1, rme2);
      expect(result.allocatedSemester1Jp).toBe(18);
      expect(result.allocatedSemester2Jp).toBe(36);
      expect(result.allocatedAnnualJp).toBe(54);
      expect(result.diffSemester1).toBe(-18);
      expect(result.statusSemester1).toBe('DEFISIT');
      expect(result.statusSemester2).toBe('PAS');
    });

    it('Sanitization floors floating point JP and rejects negative or non-finite values', () => {
      expect(sanitizeJp(12.999)).toBe(12);
      expect(sanitizeJp(-0.0001)).toBe(0);
      expect(sanitizeJp(1e-10)).toBe(0);
      expect(sanitizeJp(1000000)).toBe(1000000);
      expect(sanitizeJp(NaN)).toBe(0);
      expect(sanitizeJp(Infinity)).toBe(0);
      expect(sanitizeJp(-Infinity)).toBe(0);
      expect(sanitizeJp(null)).toBe(0);
      expect(sanitizeJp(undefined)).toBe(0);
    });

    it('Item reordering and sorting stability: Reordering preserves balance output identically', () => {
      const rme1 = createMockRme(1, 18, 2);
      const rme2 = createMockRme(2, 18, 2);

      const items = [
        createProtaItem({ id: '1', semesterNumber: 1, targetJp: 10, orderIndex: 0 }),
        createProtaItem({ id: '2', semesterNumber: 1, targetJp: 15, orderIndex: 1 }),
        createProtaItem({ id: '3', semesterNumber: 2, targetJp: 20, orderIndex: 2 }),
      ];

      const vBefore = validateProtaBalance(items, rme1, rme2);
      const reordered = reorderProtaItems(items, 0, 2);
      const vAfterReorder = validateProtaBalance(reordered, rme1, rme2);
      const sorted = sortProtaItems(reordered);
      const vAfterSort = validateProtaBalance(sorted, rme1, rme2);

      expect(vBefore).toEqual(vAfterReorder);
      expect(vBefore).toEqual(vAfterSort);
    });

    it('calculateProtaSubtotals: Pure aggregation matches validateProtaBalance allocations', () => {
      const items = [
        createProtaItem({ semesterNumber: 1, targetJp: 25 }),
        createProtaItem({ semesterNumber: 1, targetJp: 15 }),
        createProtaItem({ semesterNumber: 2, targetJp: 30 }),
      ];

      const subtotals = calculateProtaSubtotals(items);
      expect(subtotals.semester1Jp).toBe(40);
      expect(subtotals.semester2Jp).toBe(30);
      expect(subtotals.annualJp).toBe(70);

      // Verify null/empty inputs
      expect(calculateProtaSubtotals([] as ProtaItem[])).toEqual({ semester1Jp: 0, semester2Jp: 0, annualJp: 0 });
      expect(calculateProtaSubtotals(null as unknown as ProtaItem[])).toEqual({ semester1Jp: 0, semester2Jp: 0, annualJp: 0 });
    });
  });
});
