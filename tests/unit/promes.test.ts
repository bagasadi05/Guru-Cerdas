import { describe, it, expect } from 'vitest';
import {
  autoDistributePromes,
  evaluateMatrixRowStatuses,
  evaluateColumnWeeklySums,
  MatrixCell,
} from '@/utils/promesEngine';
import type { KaldikWeek, ProtaItem, WeekType } from '@/types/perangkatAjar';

/**
 * Helper to generate 30 Kaldik weeks for a semester (6 months x 5 weeks).
 */
function createSemesterKaldikWeeks(
  semester: 1 | 2,
  nonEffectiveSlots: Array<{ monthIndex: number; weekNumber: number; type: WeekType }> = []
): KaldikWeek[] {
  const months = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
  const weeks: KaldikWeek[] = [];

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const month = months[mIdx];
    for (let w = 1; w <= 5; w++) {
      const nonEff = nonEffectiveSlots.find((s) => s.monthIndex === mIdx && s.weekNumber === w);
      weeks.push({
        month,
        weekNumber: w,
        type: nonEff ? nonEff.type : 'KBM',
      });
    }
  }

  return weeks;
}

/**
 * Helper to build mock ProtaItems for Promes tests.
 */
function createProtaItems(
  configs: Array<{ id: string; targetJp: number; orderIndex?: number; label?: string }>
): ProtaItem[] {
  return configs.map((c, idx) => ({
    id: c.id,
    semesterNumber: 1,
    elementOrDomain: 'Elemen ' + (idx + 1),
    learningObjectiveCode: 'TP.' + (idx + 1),
    learningObjectiveText: c.label || `Tujuan Pembelajaran ${idx + 1}`,
    coreTopic: `Materi ${idx + 1}`,
    targetJp: c.targetJp,
    orderIndex: c.orderIndex ?? idx,
  }));
}

describe('Promes Matrix Engine (Pure Domain Tests - Zero Mocks)', () => {
  // =========================================================================
  // TIER 1: Feature Coverage (Core Happy Path)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Core Happy Path)', () => {
    it('Tier 1 (F12, F13): should generate 2D matrix cells locking non-effective weeks from Kaldik', () => {
      // 2 locked weeks in monthIndex 0: week 1 (LIBUR_SEMESTER) and week 2 (MPLS)
      const semesterWeeks = createSemesterKaldikWeeks(1, [
        { monthIndex: 0, weekNumber: 1, type: 'LIBUR_SEMESTER' },
        { monthIndex: 0, weekNumber: 2, type: 'MPLS' },
      ]);
      const items = [{ id: 'tp-1', targetJp: 8 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      // Total cells for 1 item across 30 week columns = 30 cells
      const itemCells = cells.filter((c) => c.rowId === 'tp-1');
      expect(itemCells).toHaveLength(30);

      // Verify week 1 is locked with reason LIBUR_SEMESTER and allocated 0 JP
      const cellM0W1 = itemCells.find((c) => c.monthIndex === 0 && c.weekNumber === 1);
      expect(cellM0W1?.isLocked).toBe(true);
      expect(cellM0W1?.lockReason).toBe('LIBUR_SEMESTER');
      expect(cellM0W1?.allocatedJp).toBe(0);

      // Verify week 2 is locked with reason MPLS and allocated 0 JP
      const cellM0W2 = itemCells.find((c) => c.monthIndex === 0 && c.weekNumber === 2);
      expect(cellM0W2?.isLocked).toBe(true);
      expect(cellM0W2?.lockReason).toBe('MPLS');
      expect(cellM0W2?.allocatedJp).toBe(0);

      // Verify effective week 3 is unlocked
      const cellM0W3 = itemCells.find((c) => c.monthIndex === 0 && c.weekNumber === 3);
      expect(cellM0W3?.isLocked).toBe(false);
    });

    it('Tier 1 (F15): should sequentially auto-distribute hours into effective weeks up to weeklyJpLimit', () => {
      // Month 0: W1 locked, W2-W5 effective
      const semesterWeeks = createSemesterKaldikWeeks(1, [
        { monthIndex: 0, weekNumber: 1, type: 'MPLS' },
      ]);
      // Item 1: 8 JP with weekly limit 4 -> W2 gets 4 JP, W3 gets 4 JP
      const items = [{ id: 'tp-1', targetJp: 8 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const w1 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 1);
      const w2 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 2);
      const w3 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 3);
      const w4 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 4);

      expect(w1?.allocatedJp).toBe(0); // locked week skipped
      expect(w2?.allocatedJp).toBe(4); // first available effective week
      expect(w3?.allocatedJp).toBe(4); // second effective week
      expect(w4?.allocatedJp).toBe(0); // item completed, subsequent weeks remain 0
    });

    it('Tier 1 (F15): should distribute multiple items consecutively without overlapping in the same week past weekly limit', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1); // all effective
      // TP 1: 4 JP, TP 2: 8 JP, weekly limit 4 JP
      // Week 1 -> TP 1: 4 JP
      // Week 2 -> TP 2: 4 JP
      // Week 3 -> TP 2: 4 JP
      const items = [
        { id: 'tp-1', targetJp: 4 },
        { id: 'tp-2', targetJp: 8 },
      ];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const tp1W1 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 1);
      const tp2W1 = cells.find((c) => c.rowId === 'tp-2' && c.monthIndex === 0 && c.weekNumber === 1);
      expect(tp1W1?.allocatedJp).toBe(4);
      expect(tp2W1?.allocatedJp).toBe(0);

      const tp1W2 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 2);
      const tp2W2 = cells.find((c) => c.rowId === 'tp-2' && c.monthIndex === 0 && c.weekNumber === 2);
      expect(tp1W2?.allocatedJp).toBe(0);
      expect(tp2W2?.allocatedJp).toBe(4);

      const tp2W3 = cells.find((c) => c.rowId === 'tp-2' && c.monthIndex === 0 && c.weekNumber === 3);
      expect(tp2W3?.allocatedJp).toBe(4);
    });

    it('Tier 1 (F16): should evaluate row status as SESUAI when distributed JP equals target JP', () => {
      const protaItems = createProtaItems([{ id: 'tp-1', targetJp: 8 }]);
      const mockCells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 2, allocatedJp: 4, isLocked: false },
      ];

      const statuses = evaluateMatrixRowStatuses(protaItems, mockCells);
      const statusTp1 = statuses['tp-1'];

      expect(statusTp1).toBeDefined();
      expect(statusTp1.targetJp).toBe(8);
      expect(statusTp1.distributedJp).toBe(8);
      expect(statusTp1.difference).toBe(0);
      expect(statusTp1.status).toBe('SESUAI');
    });

    it('Tier 1 (F16): should evaluate row status as KURANG when distributed JP is less than target JP', () => {
      const protaItems = createProtaItems([{ id: 'tp-1', targetJp: 8 }]);
      const mockCells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
      ];

      const statuses = evaluateMatrixRowStatuses(protaItems, mockCells);
      const statusTp1 = statuses['tp-1'];

      expect(statusTp1.targetJp).toBe(8);
      expect(statusTp1.distributedJp).toBe(4);
      expect(statusTp1.difference).toBe(-4);
      expect(statusTp1.status).toBe('KURANG');
    });

    it('Tier 1 (F16): should evaluate row status as LEBIH when distributed JP exceeds target JP', () => {
      const protaItems = createProtaItems([{ id: 'tp-1', targetJp: 8 }]);
      const mockCells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 2, allocatedJp: 4, isLocked: false },
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 3, allocatedJp: 2, isLocked: false },
      ];

      const statuses = evaluateMatrixRowStatuses(protaItems, mockCells);
      const statusTp1 = statuses['tp-1'];

      expect(statusTp1.targetJp).toBe(8);
      expect(statusTp1.distributedJp).toBe(10);
      expect(statusTp1.difference).toBe(2);
      expect(statusTp1.status).toBe('LEBIH');
    });

    it('Tier 1 (F14): should evaluate weekly column totals and detect columns that do not exceed limits', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1);
      const cells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 2, isLocked: false },
        { rowId: 'tp-2', monthIndex: 0, weekNumber: 1, allocatedJp: 2, isLocked: false },
      ];

      const columnSums = evaluateColumnWeeklySums(cells, semesterWeeks, 4);
      const m0w1 = columnSums.find((c) => c.monthIndex === 0 && c.weekNumber === 1);

      expect(m0w1?.totalJp).toBe(4);
      expect(m0w1?.exceedsLimit).toBe(false);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('Tier 2 (Boundary): should split non-divisible TP hours across weeks (e.g. 5 JP target with 4 JP/week limit)', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1);
      const items = [{ id: 'tp-1', targetJp: 5 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const w1 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 1);
      const w2 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 2);
      const w3 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 3);

      expect(w1?.allocatedJp).toBe(4); // First 4 JP fills week 1 to capacity
      expect(w2?.allocatedJp).toBe(1); // Remaining 1 JP spills to week 2
      expect(w3?.allocatedJp).toBe(0);
    });

    it('Tier 2 (Boundary): should pack multiple small TPs into the same week when capacity permits', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1);
      // TP 1: 1 JP, TP 2: 2 JP, TP 3: 1 JP -> All 3 fit into Week 1 (total 4 JP <= 4 limit)
      const items = [
        { id: 'tp-1', targetJp: 1 },
        { id: 'tp-2', targetJp: 2 },
        { id: 'tp-3', targetJp: 1 },
      ];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const tp1W1 = cells.find((c) => c.rowId === 'tp-1' && c.monthIndex === 0 && c.weekNumber === 1);
      const tp2W1 = cells.find((c) => c.rowId === 'tp-2' && c.monthIndex === 0 && c.weekNumber === 1);
      const tp3W1 = cells.find((c) => c.rowId === 'tp-3' && c.monthIndex === 0 && c.weekNumber === 1);

      expect(tp1W1?.allocatedJp).toBe(1);
      expect(tp2W1?.allocatedJp).toBe(2);
      expect(tp3W1?.allocatedJp).toBe(1);

      const colSums = evaluateColumnWeeklySums(cells, semesterWeeks, 4);
      const m0w1 = colSums.find((c) => c.monthIndex === 0 && c.weekNumber === 1);
      expect(m0w1?.totalJp).toBe(4);
      expect(m0w1?.exceedsLimit).toBe(false);
    });

    it('Tier 2 (Boundary): should safely halt when target hours exceed total semester effective capacity without crashing', () => {
      // Semester with only 2 effective weeks (capacity = 2 weeks x 4 JP = 8 JP)
      const allLockedExceptTwo = Array.from({ length: 30 }, (_, i) => ({
        monthIndex: Math.floor(i / 5),
        weekNumber: (i % 5) + 1,
        type: (i < 2 ? 'KBM' : 'LIBUR_SEMESTER') as WeekType,
      }));
      const semesterWeeks = createSemesterKaldikWeeks(1, allLockedExceptTwo);

      // Attempt to allocate 20 JP into an 8 JP capacity semester
      const items = [{ id: 'tp-huge', targetJp: 20 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const totalAllocated = cells
        .filter((c) => c.rowId === 'tp-huge')
        .reduce((sum, c) => sum + c.allocatedJp, 0);

      // Must fill only what is available (8 JP) and halt safely
      expect(totalAllocated).toBe(8);

      const protaItems = createProtaItems([{ id: 'tp-huge', targetJp: 20 }]);
      const statuses = evaluateMatrixRowStatuses(protaItems, cells);
      expect(statuses['tp-huge'].status).toBe('KURANG');
      expect(statuses['tp-huge'].distributedJp).toBe(8);
      expect(statuses['tp-huge'].difference).toBe(-12);
    });

    it('Tier 2 (Boundary): should handle 0 JP target item with immediate SESUAI status and 0 allocation', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1);
      const items = [{ id: 'tp-zero', targetJp: 0 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const totalAllocated = cells.reduce((sum, c) => sum + c.allocatedJp, 0);
      expect(totalAllocated).toBe(0);

      const protaItems = createProtaItems([{ id: 'tp-zero', targetJp: 0 }]);
      const statuses = evaluateMatrixRowStatuses(protaItems, cells);
      expect(statuses['tp-zero'].status).toBe('SESUAI');
      expect(statuses['tp-zero'].distributedJp).toBe(0);
    });

    it('Tier 2 (Boundary): should handle 0 effective weeks in semester by allocating 0 JP to all cells', () => {
      const allLocked = Array.from({ length: 30 }, (_, i) => ({
        monthIndex: Math.floor(i / 5),
        weekNumber: (i % 5) + 1,
        type: 'LIBUR_SEMESTER' as WeekType,
      }));
      const semesterWeeks = createSemesterKaldikWeeks(1, allLocked);
      const items = [{ id: 'tp-1', targetJp: 16 }];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const totalAllocated = cells.reduce((sum, c) => sum + c.allocatedJp, 0);
      expect(totalAllocated).toBe(0);

      const lockedCount = cells.filter((c) => c.isLocked).length;
      expect(lockedCount).toBe(30);
    });

    it('Tier 2 (Boundary): should flag column warning when manual entry pushes weekly total beyond weeklyLimit', () => {
      const semesterWeeks = createSemesterKaldikWeeks(1);
      // Week 1 has 5 JP total when limit is 4 JP
      const cells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 3, isLocked: false },
        { rowId: 'tp-2', monthIndex: 0, weekNumber: 1, allocatedJp: 2, isLocked: false },
      ];

      const columnSums = evaluateColumnWeeklySums(cells, semesterWeeks, 4);
      const m0w1 = columnSums.find((c) => c.monthIndex === 0 && c.weekNumber === 1);

      expect(m0w1?.totalJp).toBe(5);
      expect(m0w1?.exceedsLimit).toBe(true);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations & State Shifts
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations & Dynamic Interactions', () => {
    it('Tier 3 (Kaldik-Promes Interaction): should skip locked mid-semester exam weeks (STS) and resume distribution in next effective week', () => {
      // Month 2: Week 3 is STS (non-effective)
      const semesterWeeks = createSemesterKaldikWeeks(1, [
        { monthIndex: 2, weekNumber: 3, type: 'STS' },
      ]);
      // Allocate 40 JP at 4 JP/week (10 effective weeks needed)
      // Month 0 has 5 wks (20 JP)
      // Month 1 has 5 wks (20 JP) -> reaches 40 JP exactly at Month 1 W5!
      // But let's test item that spans across Month 2 W2 to W4:
      const items = [
        { id: 'tp-leadup', targetJp: 44 }, // 11 weeks: M0 (5), M1 (5), M2 W1 (1 wk)
        { id: 'tp-straddle', targetJp: 8 }, // Should take M2 W2 (4 JP) and M2 W4 (4 JP), skipping M2 W3!
      ];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const straddleW2 = cells.find((c) => c.rowId === 'tp-straddle' && c.monthIndex === 2 && c.weekNumber === 2);
      const straddleW3 = cells.find((c) => c.rowId === 'tp-straddle' && c.monthIndex === 2 && c.weekNumber === 3);
      const straddleW4 = cells.find((c) => c.rowId === 'tp-straddle' && c.monthIndex === 2 && c.weekNumber === 4);

      expect(straddleW2?.allocatedJp).toBe(4);
      expect(straddleW3?.isLocked).toBe(true);
      expect(straddleW3?.lockReason).toBe('STS');
      expect(straddleW3?.allocatedJp).toBe(0); // skipped!
      expect(straddleW4?.allocatedJp).toBe(4); // resumed!
    });

    it('Tier 3 (State Shift): should maintain correct row status when a cell allocation is updated manually', () => {
      const protaItems = createProtaItems([
        { id: 'tp-1', targetJp: 6 },
        { id: 'tp-2', targetJp: 6 },
      ]);

      // Initial state: tp-1 has 6 JP (SESUAI), tp-2 has 4 JP (KURANG)
      const initialCells: MatrixCell[] = [
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
        { rowId: 'tp-1', monthIndex: 0, weekNumber: 2, allocatedJp: 2, isLocked: false },
        { rowId: 'tp-2', monthIndex: 0, weekNumber: 2, allocatedJp: 2, isLocked: false },
        { rowId: 'tp-2', monthIndex: 0, weekNumber: 3, allocatedJp: 2, isLocked: false },
      ];

      const initialStatuses = evaluateMatrixRowStatuses(protaItems, initialCells);
      expect(initialStatuses['tp-1'].status).toBe('SESUAI');
      expect(initialStatuses['tp-2'].status).toBe('KURANG');
      expect(initialStatuses['tp-2'].difference).toBe(-2);

      // Teacher edits tp-2 at W3 from 2 JP to 4 JP
      const updatedCells = initialCells.map((c) =>
        c.rowId === 'tp-2' && c.monthIndex === 0 && c.weekNumber === 3
          ? { ...c, allocatedJp: 4 }
          : c
      );

      const updatedStatuses = evaluateMatrixRowStatuses(protaItems, updatedCells);
      expect(updatedStatuses['tp-2'].status).toBe('SESUAI');
      expect(updatedStatuses['tp-2'].distributedJp).toBe(6);
      expect(updatedStatuses['tp-2'].difference).toBe(0);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Indonesian Teacher Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Indonesian Academic Scenarios', () => {
    it('Tier 4 (Scenario A): should auto-distribute SD Kelas 4 IPAS Semester 1 (72 JP, 4 JP/week across 18 MEB)', () => {
      // 18 Effective Weeks, 12 Ineffective weeks:
      // Month 0 (July): W1 Libur, W2-W3 MPLS (3 locked, 2 KBM: W4, W5)
      // Month 1 (August): 5 KBM
      // Month 2 (Sept): W4 STS (1 locked, 4 KBM: W1-W3, W5)
      // Month 3 (Oct): 5 KBM
      // Month 4 (Nov): W5 Libur (1 locked, 4 KBM: W1-W4)
      // Month 5 (Dec): W1-W2 SAS, W3 Rapor, W4-W5 Libur (5 locked, 0 KBM)
      // Total effective = 2 + 5 + 4 + 5 + 2 + 0 = 18 effective weeks x 4 = 72 JP
      const semesterWeeks = createSemesterKaldikWeeks(1, [
        { monthIndex: 0, weekNumber: 1, type: 'LIBUR_SEMESTER' },
        { monthIndex: 0, weekNumber: 2, type: 'MPLS' },
        { monthIndex: 0, weekNumber: 3, type: 'MPLS' },
        { monthIndex: 2, weekNumber: 4, type: 'STS' },
        { monthIndex: 4, weekNumber: 3, type: 'LIBUR_NASIONAL' },
        { monthIndex: 4, weekNumber: 4, type: 'LIBUR_NASIONAL' },
        { monthIndex: 4, weekNumber: 5, type: 'LIBUR_NASIONAL' },
        { monthIndex: 5, weekNumber: 1, type: 'SAS' },
        { monthIndex: 5, weekNumber: 2, type: 'SAS' },
        { monthIndex: 5, weekNumber: 3, type: 'RAPOR' },
        { monthIndex: 5, weekNumber: 4, type: 'LIBUR_SEMESTER' },
        { monthIndex: 5, weekNumber: 5, type: 'LIBUR_SEMESTER' },
      ]);

      // 4 IPAS Topics:
      // Bab 1: Tumbuhan Sumber Kehidupan (16 JP -> 4 wks)
      // Bab 2: Wujud Zat dan Perubahannya (20 JP -> 5 wks)
      // Bab 3: Gaya di Sekitar Kita (16 JP -> 4 wks)
      // Bab 4: Mengubah Bentuk Energi (20 JP -> 5 wks)
      // Total = 72 JP
      const items = [
        { id: 'ipas-bab1', targetJp: 16 },
        { id: 'ipas-bab2', targetJp: 20 },
        { id: 'ipas-bab3', targetJp: 16 },
        { id: 'ipas-bab4', targetJp: 20 },
      ];

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const protaItems = createProtaItems(items);
      const statuses = evaluateMatrixRowStatuses(protaItems, cells);

      expect(statuses['ipas-bab1'].status).toBe('SESUAI');
      expect(statuses['ipas-bab2'].status).toBe('SESUAI');
      expect(statuses['ipas-bab3'].status).toBe('SESUAI');
      expect(statuses['ipas-bab4'].status).toBe('SESUAI');

      // Verify no locked cell received any teaching hours
      const lockedWithJp = cells.filter((c) => c.isLocked && c.allocatedJp > 0);
      expect(lockedWithJp).toHaveLength(0);

      // Verify all column weekly sums do not exceed 4 JP
      const colSums = evaluateColumnWeeklySums(cells, semesterWeeks, 4);
      const overloadedCols = colSums.filter((c) => c.exceedsLimit);
      expect(overloadedCols).toHaveLength(0);
    });

    it('Tier 4 (Scenario B): should handle K-13 Grade 6 Matematika Semester 2 with early graduation prep in May/June', () => {
      // Semester 2 Grade 6 has fewer effective weeks (14 MEB) due to Ujian Sekolah in May and Graduation in June
      // 14 MEB x 4 JP/wk = 56 JP total
      const semesterWeeks = createSemesterKaldikWeeks(2, [
        { monthIndex: 0, weekNumber: 1, type: 'LIBUR_SEMESTER' },
        { monthIndex: 1, weekNumber: 5, type: 'NON_ACTIVE' },
        { monthIndex: 2, weekNumber: 3, type: 'STS' },
        { monthIndex: 2, weekNumber: 4, type: 'KEGIATAN_KHUSUS' },
        { monthIndex: 3, weekNumber: 1, type: 'LIBUR_NASIONAL' },
        { monthIndex: 3, weekNumber: 2, type: 'LIBUR_NASIONAL' },
        { monthIndex: 4, weekNumber: 2, type: 'KEGIATAN_KHUSUS' }, // Try Out US
        { monthIndex: 4, weekNumber: 3, type: 'KEGIATAN_KHUSUS' }, // Ujian Sekolah
        { monthIndex: 4, weekNumber: 4, type: 'KEGIATAN_KHUSUS' }, // Ujian Sekolah
        { monthIndex: 4, weekNumber: 5, type: 'KEGIATAN_KHUSUS' },
        { monthIndex: 5, weekNumber: 1, type: 'RAPOR' },
        { monthIndex: 5, weekNumber: 2, type: 'RAPOR' },
        { monthIndex: 5, weekNumber: 3, type: 'KEGIATAN_KHUSUS' }, // Wisuda
        { monthIndex: 5, weekNumber: 4, type: 'LIBUR_SEMESTER' },
        { monthIndex: 5, weekNumber: 5, type: 'LIBUR_SEMESTER' },
        { monthIndex: 3, weekNumber: 5, type: 'LIBUR_NASIONAL' },
      ]);

      const items = [
        { id: 'kd-3.6-bangun-ruang', targetJp: 20 },
        { id: 'kd-3.7-gabungan-bangun', targetJp: 16 },
        { id: 'kd-3.8-statistika-data', targetJp: 20 },
      ]; // Total 56 JP

      const cells = autoDistributePromes({
        items,
        semesterWeeks,
        weeklyJpLimit: 4,
      });

      const protaItems = createProtaItems(items);
      const statuses = evaluateMatrixRowStatuses(protaItems, cells);

      expect(statuses['kd-3.6-bangun-ruang'].status).toBe('SESUAI');
      expect(statuses['kd-3.7-gabungan-bangun'].status).toBe('SESUAI');
      expect(statuses['kd-3.8-statistika-data'].status).toBe('SESUAI');

      const totalDistributed = Object.values(statuses).reduce(
        (sum, s) => sum + s.distributedJp,
        0
      );
      expect(totalDistributed).toBe(56);
    });
  });
});
