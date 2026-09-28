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
 * Helper to build minimal RmeSummary for prota engine testing.
 */
function createTestRme(
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
    netTeachingJp: Math.max(0, totalAvailableJp - reserveJp),
  };
}

describe('Prota Engine Challenger & Invariant Test Suite', () => {
  // =========================================================================
  // 1. SANITIZE JP & EXTRACT TARGET JP
  // =========================================================================
  describe('1. Defensive Sanitization & Extraction', () => {
    it('sanitizeJp: handles null, undefined, NaN, Infinity, negative, and strings', () => {
      expect(sanitizeJp(null)).toBe(0);
      expect(sanitizeJp(undefined)).toBe(0);
      expect(sanitizeJp(NaN)).toBe(0);
      expect(sanitizeJp(Infinity)).toBe(0);
      expect(sanitizeJp(-Infinity)).toBe(0);
      expect(sanitizeJp(-10)).toBe(0);
      expect(sanitizeJp('40')).toBe(0);
      expect(sanitizeJp({})).toBe(0);
      expect(sanitizeJp([])).toBe(0);
    });

    it('sanitizeJp: floors positive floating point values to integer', () => {
      expect(sanitizeJp(4.9)).toBe(4);
      expect(sanitizeJp(18.0)).toBe(18);
      expect(sanitizeJp(0.1)).toBe(0);
      expect(sanitizeJp(72)).toBe(72);
    });

    it('extractTargetJp: returns netTeachingJp when present and valid', () => {
      const rme = createTestRme(1, 18, 4, 4);
      expect(extractTargetJp(rme)).toBe(68);
    });

    it('extractTargetJp: falls back gracefully when netTeachingJp is absent or null', () => {
      expect(extractTargetJp(null)).toBe(0);
      expect(extractTargetJp(undefined)).toBe(0);

      const partialRme: Partial<RmeSummary> = {
        effectiveWeeks: 18,
        weeklyJpQuota: 4,
        reserveJp: 4,
      };
      expect(extractTargetJp(partialRme as RmeSummary)).toBe(68);

      const rmeNoReserve: Partial<RmeSummary> = {
        totalAvailableJp: 72,
      };
      expect(extractTargetJp(rmeNoReserve as RmeSummary)).toBe(72);
    });
  });

  // =========================================================================
  // 2. JAM CADANGAN & RESERVE HOURS
  // =========================================================================
  describe('2. Reserve Hours (Jam Cadangan) Mechanics', () => {
    it('calculateRecommendedReserveJp: recommends ~5% by default clamped to non-negative integer', () => {
      // 72 * 0.05 = 3.6 -> rounds to 4
      expect(calculateRecommendedReserveJp(72)).toBe(4);
      // 108 * 0.05 = 5.4 -> rounds to 5
      expect(calculateRecommendedReserveJp(108)).toBe(5);
      // 0 or negative
      expect(calculateRecommendedReserveJp(0)).toBe(0);
      expect(calculateRecommendedReserveJp(-10)).toBe(0);
      expect(calculateRecommendedReserveJp(NaN)).toBe(0);
    });

    it('calculateRecommendedReserveJp: clamps custom percentage to [0.01, 0.25]', () => {
      // 100 * 0.10 = 10
      expect(calculateRecommendedReserveJp(100, 0.1)).toBe(10);
      // Extreme ratio 0.90 clamped to 0.25 -> 100 * 0.25 = 25
      expect(calculateRecommendedReserveJp(100, 0.9)).toBe(25);
      // Zero or negative ratio clamped to 0.01 -> 100 * 0.01 = 1
      expect(calculateRecommendedReserveJp(100, 0)).toBe(1);
    });

    it('createJamCadanganProtaItem: creates valid ProtaItem in both argument orders', () => {
      // Order A: (reserveJp, semester)
      const itemA = createJamCadanganProtaItem(6, 1, 999);
      expect(itemA.semesterNumber).toBe(1);
      expect(itemA.targetJp).toBe(6);
      expect(itemA.elementOrDomain).toBe('Jam Cadangan');
      expect(itemA.learningObjectiveCode).toBe('CADANGAN');
      expect(itemA.orderIndex).toBe(999);
      expect(isJamCadanganItem(itemA)).toBe(true);

      // Order B: (semester, reserveJp)
      const itemB = createJamCadanganProtaItem(2, 8, 50);
      expect(itemB.semesterNumber).toBe(2);
      expect(itemB.targetJp).toBe(8);
      expect(itemB.orderIndex).toBe(50);
      expect(isJamCadanganItem(itemB)).toBe(true);
    });

    it('isJamCadanganItem: identifies cadangan rows by code or domain', () => {
      const normalItem = createProtaItem({
        learningObjectiveCode: 'TP 1.1',
        elementOrDomain: 'Menyimak',
      });
      expect(isJamCadanganItem(normalItem)).toBe(false);

      const cadanganByDomain = createProtaItem({
        elementOrDomain: 'Cadangan dan Remedial',
      });
      expect(isJamCadanganItem(cadanganByDomain)).toBe(true);
    });
  });

  // =========================================================================
  // 3. ITEM CREATION, SORTING, REORDERING, FILTERING
  // =========================================================================
  describe('3. Item Manipulation Utilities', () => {
    it('createProtaItem: generates full entity with default UUID, sanitized JP, and trimmed strings', () => {
      const item = createProtaItem({
        learningObjectiveCode: '  TP 1.1  ',
        targetJp: 18.7,
        semesterNumber: 1,
      });

      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.learningObjectiveCode).toBe('TP 1.1');
      expect(item.targetJp).toBe(18);
      expect(item.semesterNumber).toBe(1);
      expect(item.orderIndex).toBe(0);
    });

    it('sortProtaItems: sorts pure immutably by semester, then orderIndex, then alphanumeric code', () => {
      const items: ProtaItem[] = [
        createProtaItem({ id: 'a', semesterNumber: 2, orderIndex: 0, learningObjectiveCode: 'TP 2.1' }),
        createProtaItem({ id: 'b', semesterNumber: 1, orderIndex: 1, learningObjectiveCode: 'TP 1.10' }),
        createProtaItem({ id: 'c', semesterNumber: 1, orderIndex: 1, learningObjectiveCode: 'TP 1.2' }),
        createProtaItem({ id: 'd', semesterNumber: 1, orderIndex: 0, learningObjectiveCode: 'TP 1.1' }),
      ];

      const sorted = sortProtaItems(items);

      // Verify original array was not mutated
      expect(items[0].id).toBe('a');

      // Semester 1 should precede Semester 2
      expect(sorted[0].id).toBe('d'); // Sem 1, orderIndex 0
      expect(sorted[1].id).toBe('c'); // Sem 1, orderIndex 1, TP 1.2 (natural sort before TP 1.10)
      expect(sorted[2].id).toBe('b'); // Sem 1, orderIndex 1, TP 1.10
      expect(sorted[3].id).toBe('a'); // Sem 2, orderIndex 0
    });

    it('reorderProtaItems: moves item and re-indexes sequentially from 0 to n-1', () => {
      const items: ProtaItem[] = [
        createProtaItem({ id: 'item-0', orderIndex: 0 }),
        createProtaItem({ id: 'item-1', orderIndex: 1 }),
        createProtaItem({ id: 'item-2', orderIndex: 2 }),
      ];

      // Move item at index 0 to index 2
      const reordered = reorderProtaItems(items, 0, 2);

      expect(reordered).toHaveLength(3);
      expect(reordered[0].id).toBe('item-1');
      expect(reordered[0].orderIndex).toBe(0);
      expect(reordered[1].id).toBe('item-2');
      expect(reordered[1].orderIndex).toBe(1);
      expect(reordered[2].id).toBe('item-0');
      expect(reordered[2].orderIndex).toBe(2);

      // Verify original not mutated
      expect(items[0].id).toBe('item-0');
      expect(items[0].orderIndex).toBe(0);
    });

    it('filterProtaItemsBySemester: returns only items for matching semester sorted by orderIndex', () => {
      const items: ProtaItem[] = [
        createProtaItem({ id: 's2-1', semesterNumber: 2, orderIndex: 1 }),
        createProtaItem({ id: 's1-2', semesterNumber: 1, orderIndex: 5 }),
        createProtaItem({ id: 's1-1', semesterNumber: 1, orderIndex: 2 }),
        createProtaItem({ id: 's2-2', semesterNumber: 2, orderIndex: 0 }),
      ];

      const sem1 = filterProtaItemsBySemester(items, 1);
      expect(sem1).toHaveLength(2);
      expect(sem1[0].id).toBe('s1-1'); // orderIndex 2
      expect(sem1[1].id).toBe('s1-2'); // orderIndex 5

      const sem2 = filterProtaItemsBySemester(items, 2);
      expect(sem2).toHaveLength(2);
      expect(sem2[0].id).toBe('s2-2'); // orderIndex 0
      expect(sem2[1].id).toBe('s2-1'); // orderIndex 1
    });

    it('calculateProtaSubtotals: aggregates semester 1, semester 2, and annual sums', () => {
      const items: ProtaItem[] = [
        createProtaItem({ semesterNumber: 1, targetJp: 18 }),
        createProtaItem({ semesterNumber: 1, targetJp: 18 }),
        createProtaItem({ semesterNumber: 2, targetJp: 36 }),
      ];

      const subtotals = calculateProtaSubtotals(items);
      expect(subtotals.semester1Jp).toBe(36);
      expect(subtotals.semester2Jp).toBe(36);
      expect(subtotals.annualJp).toBe(72);
    });
  });

  // =========================================================================
  // 4. STATUS & UI BADGES
  // =========================================================================
  describe('4. Status & UI Badge Helpers', () => {
    it('getProtaBalanceStatus: correctly evaluates diff values', () => {
      expect(getProtaBalanceStatus(0)).toBe('PAS');
      expect(getProtaBalanceStatus(-5)).toBe('DEFISIT');
      expect(getProtaBalanceStatus(5)).toBe('SURPLUS');
    });

    it('getProtaBalanceBadgeProps: provides correct Tailwind classes, icons, and text for all statuses', () => {
      const pasBadge = getProtaBalanceBadgeProps('PAS', 0);
      expect(pasBadge.status).toBe('PAS');
      expect(pasBadge.iconName).toBe('CheckCircle');
      expect(pasBadge.badgeClass).toContain('emerald');
      expect(pasBadge.diffText).toBe('0 JP');

      const defisitBadge = getProtaBalanceBadgeProps('DEFISIT', -8);
      expect(defisitBadge.status).toBe('DEFISIT');
      expect(defisitBadge.iconName).toBe('AlertTriangle');
      expect(defisitBadge.badgeClass).toContain('amber');
      expect(defisitBadge.diffText).toBe('-8 JP');

      const surplusBadge = getProtaBalanceBadgeProps('SURPLUS', 12);
      expect(surplusBadge.status).toBe('SURPLUS');
      expect(surplusBadge.iconName).toBe('AlertCircle');
      expect(surplusBadge.badgeClass).toContain('rose');
      expect(surplusBadge.diffText).toBe('+12 JP');
    });

    it('getCurriculumDescriptor: returns official Indonesian labels for MERDEKA and K13', () => {
      const merdeka = getCurriculumDescriptor('MERDEKA');
      expect(merdeka.title).toBe('Kurikulum Merdeka');
      expect(merdeka.codePrefix).toBe('TP');
      expect(merdeka.elementLabel).toContain('Elemen');

      const k13 = getCurriculumDescriptor('K13');
      expect(k13.title).toBe('Kurikulum 2013 (K-13)');
      expect(k13.codePrefix).toBe('KD');
      expect(k13.elementLabel).toContain('Kompetensi Inti');

      expect(CURRICULUM_DESCRIPTORS.MERDEKA).toBeDefined();
      expect(CURRICULUM_DESCRIPTORS.K13).toBeDefined();
    });
  });

  // =========================================================================
  // 5. MATHEMATICAL INVARIANTS
  // =========================================================================
  describe('5. Mathematical Invariants of validateProtaBalance', () => {
    it('invariant check: diffAnnual === diffSemester1 + diffSemester2', () => {
      const items: ProtaItem[] = [
        createProtaItem({ semesterNumber: 1, targetJp: 30 }),
        createProtaItem({ semesterNumber: 2, targetJp: 45 }),
      ];
      const rme1 = createTestRme(1, 18, 2); // target 36
      const rme2 = createTestRme(2, 18, 2); // target 36

      const result = validateProtaBalance(items, rme1, rme2);

      expect(result.diffSemester1).toBe(-6); // 30 - 36
      expect(result.diffSemester2).toBe(9); // 45 - 36
      expect(result.diffAnnual).toBe(result.diffSemester1 + result.diffSemester2); // 3
      expect(result.allocatedAnnualJp).toBe(result.allocatedSemester1Jp + result.allocatedSemester2Jp);
      expect(result.totalTargetJp).toBe(36 + 36);
    });

    it('invariant check: deficit and surplus are mutually exclusive per semester', () => {
      const rme1 = createTestRme(1, 18, 4); // 72 JP
      const rme2 = createTestRme(2, 18, 4); // 72 JP

      const deficitItems = [createProtaItem({ semesterNumber: 1, targetJp: 50 })];
      const resDeficit = validateProtaBalance(deficitItems, rme1, rme2);
      expect(resDeficit.deficitJpSemester1).toBe(22);
      expect(resDeficit.surplusJpSemester1).toBe(0);

      const surplusItems = [createProtaItem({ semesterNumber: 1, targetJp: 90 })];
      const resSurplus = validateProtaBalance(surplusItems, rme1, rme2);
      expect(resSurplus.surplusJpSemester1).toBe(18);
      expect(resSurplus.deficitJpSemester1).toBe(0);
    });
  });
});
