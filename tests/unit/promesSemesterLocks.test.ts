import { describe, it, expect } from 'vitest';
import {
  autoDistributePromes,
  applyKaldikLocks,
  getLockedWeekSlots,
  filterWeeksForSemester,
} from '../../src/utils/promesEngine';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';
import type { MatrixCell } from '../../src/types/perangkatAjar';

const SEM2_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

const allocatedSlots = (cells: MatrixCell[], monthNames: string[]) =>
  cells
    .filter((c) => c.allocatedJp > 0)
    .map((c) => `${monthNames[c.monthIndex]}W${c.weekNumber}`);

describe('promesEngine semester handling', () => {
  const yearWeeks = getDefaultNationalKaldik('2026/2027');

  it('fills semester 2 from the January–June calendar when given the whole year', () => {
    const cells = autoDistributePromes({
      items: [{ id: 'a', targetJp: 200 }],
      semesterWeeks: yearWeeks,
      weeklyJpLimit: 4,
      semesterNumber: 2,
    });

    const slots = allocatedSlots(cells, SEM2_MONTHS);
    expect(slots).toContain('JanW2');
    expect(slots).toContain('FebW3');
    // STS, Idul Fitri leave and the inactive fifth week of February stay empty.
    expect(slots).not.toContain('MarW2');
    expect(slots).not.toContain('AprW1');
    expect(slots).not.toContain('FebW5');
  });

  it('matches the result of passing pre-filtered semester weeks', () => {
    const items = [
      { id: 'a', targetJp: 30 },
      { id: 'b', targetJp: 40 },
    ];
    const fromYear = autoDistributePromes({
      items,
      semesterWeeks: yearWeeks,
      weeklyJpLimit: 4,
      semesterNumber: 2,
    });
    const fromSemester = autoDistributePromes({
      items,
      semesterWeeks: filterWeeksForSemester(yearWeeks, 2),
      weeklyJpLimit: 4,
    });
    expect(fromYear).toEqual(fromSemester);
  });

  it('lists non-KBM weeks per semester without mixing July into January', () => {
    const sem1 = getLockedWeekSlots(yearWeeks, 1);
    const sem2 = getLockedWeekSlots(yearWeeks, 2);

    expect(sem1.get('0-1')).toBe('LIBUR_SEMESTER'); // Juli W1
    expect(sem2.get('0-1')).toBe('LIBUR_NASIONAL'); // Januari W1
    expect(sem2.has('0-2')).toBe(false); // Januari W2 is KBM
    expect(sem2.get('1-5')).toBe('NON_ACTIVE'); // Februari W5
  });
});

describe('applyKaldikLocks', () => {
  const yearWeeks = getDefaultNationalKaldik('2026/2027');

  it('locks cells loaded without lock state and clears their hours', () => {
    const loaded: MatrixCell[] = [
      { rowId: 'a', monthIndex: 2, weekNumber: 2, allocatedJp: 4, isLocked: false }, // Maret W2 = STS
      { rowId: 'a', monthIndex: 0, weekNumber: 2, allocatedJp: 4, isLocked: false }, // Januari W2 = KBM
    ];

    const [sts, kbm] = applyKaldikLocks(loaded, yearWeeks, 2);

    expect(sts).toMatchObject({ isLocked: true, lockReason: 'STS', allocatedJp: 0 });
    expect(kbm).toMatchObject({ isLocked: false, allocatedJp: 4 });
  });

  it('unlocks a week that became effective after the Kaldik was edited', () => {
    const edited = yearWeeks.map((w) =>
      w.month === 3 && w.weekNumber === 2 ? { ...w, type: 'KBM' as const } : w
    );
    const stale: MatrixCell[] = [
      { rowId: 'a', monthIndex: 2, weekNumber: 2, allocatedJp: 0, isLocked: true, lockReason: 'STS' },
    ];

    const [cell] = applyKaldikLocks(stale, edited, 2);

    expect(cell.isLocked).toBe(false);
    expect(cell.lockReason).toBeUndefined();
  });
});
