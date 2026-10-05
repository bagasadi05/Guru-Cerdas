import { describe, it, expect, beforeEach } from 'vitest';
import { autoDistributePromes, getLockedWeekSlots } from '../../src/utils/promesEngine';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';
import {
  buildModulAjarPrefill,
  clearModulAjarPrefill,
  peekModulAjarPrefill,
  writeModulAjarPrefill,
} from '../../src/components/pages/modul-ajar/utils/protaPrefill';
import type { MatrixCell } from '../../src/types/perangkatAjar';

const weeks = getDefaultNationalKaldik('2026/2027');
const items = [
  { id: 'a', targetJp: 12 },
  { id: 'b', targetJp: 12 },
];
const total = (cells: MatrixCell[], rowId: string) =>
  cells.filter((c) => c.rowId === rowId).reduce((sum, c) => sum + c.allocatedJp, 0);
const at = (cells: MatrixCell[], rowId: string, monthIndex: number, weekNumber: number) =>
  cells.find((c) => c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber);

describe('autoDistributePromes with teacher-set cells', () => {
  it('behaves exactly as before when nothing is manual', () => {
    const base = autoDistributePromes({ items, semesterWeeks: weeks, weeklyJpLimit: 4, semesterNumber: 1 });
    const withPlainCells = autoDistributePromes({
      items,
      semesterWeeks: weeks,
      weeklyJpLimit: 4,
      semesterNumber: 1,
      fixedCells: base,
    });
    expect(withPlainCells).toEqual(base);
  });

  it('keeps manual cells, counts them toward the item, and fills the rest around them', () => {
    // Teacher moved 4 JP of item b into Oktober W1 and blocked item a in Juli W4 (0 JP).
    const fixedCells: MatrixCell[] = [
      { rowId: 'b', monthIndex: 3, weekNumber: 1, allocatedJp: 4, isLocked: false, isManual: true },
      { rowId: 'a', monthIndex: 0, weekNumber: 4, allocatedJp: 0, isLocked: false, isManual: true },
    ];
    const cells = autoDistributePromes({ items, semesterWeeks: weeks, weeklyJpLimit: 4, semesterNumber: 1, fixedCells });

    expect(at(cells, 'b', 3, 1)).toMatchObject({ allocatedJp: 4, isManual: true });
    expect(at(cells, 'a', 0, 4)).toMatchObject({ allocatedJp: 0, isManual: true });
    expect(total(cells, 'a')).toBe(12);
    expect(total(cells, 'b')).toBe(12);

    // No week goes over the limit and nothing lands in a locked week.
    const locked = getLockedWeekSlots(weeks, 1);
    const perWeek = new Map<string, number>();
    for (const c of cells) {
      const key = `${c.monthIndex}-${c.weekNumber}`;
      perWeek.set(key, (perWeek.get(key) ?? 0) + c.allocatedJp);
      if (c.allocatedJp > 0) expect(locked.has(key)).toBe(false);
    }
    expect(Math.max(...perWeek.values())).toBeLessThanOrEqual(4);
    // Item b no longer needs Oktober W1's capacity from item a.
    expect(at(cells, 'a', 3, 1)?.allocatedJp ?? 0).toBe(0);
  });

  it('ignores manual cells that now sit in a non-effective week', () => {
    const fixedCells: MatrixCell[] = [
      { rowId: 'a', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false, isManual: true }, // Juli W1 libur
    ];
    const cells = autoDistributePromes({ items, semesterWeeks: weeks, weeklyJpLimit: 4, semesterNumber: 1, fixedCells });
    expect(at(cells, 'a', 0, 1)?.allocatedJp).toBe(0);
    expect(total(cells, 'a')).toBe(12);
  });
});

describe('Modul Ajar prefill from a Prota row', () => {
  const row = {
    subject: 'Matematika',
    gradeLevel: 'Kelas 4',
    phase: 'B',
    academicYear: '2026/2027',
    curriculum: 'MERDEKA' as const,
    semesterNumber: 2 as const,
    learningObjectiveCode: 'TP 4.5',
    learningObjectiveText: 'Mengukur besar sudut',
    coreTopic: 'Bab 5: Bangun Datar dan Pengukuran Sudut',
    targetJp: 7,
  };

  beforeEach(() => sessionStorage.clear());

  it('maps the row to the form fields', () => {
    expect(buildModulAjarPrefill(row)).toEqual({
      mataPelajaran: 'Matematika',
      kelas: '4',
      fase: 'B',
      topik: 'Bangun Datar dan Pengukuran Sudut',
      tahunAjaran: '2026/2027',
      semester: 'Genap',
      documentType: 'Modul Ajar',
      manualTujuanPembelajaran: 'TP 4.5 Mengukur besar sudut',
      jpPerPertemuan: 2,
      jumlahPertemuan: 4,
    });
  });

  it('leaves grades the form does not offer, and uses RPP for K-13', () => {
    const prefill = buildModulAjarPrefill({ ...row, gradeLevel: 'Kelas 8', curriculum: 'K13' });
    expect(prefill.kelas).toBeUndefined();
    expect(prefill.documentType).toBe('RPP');
  });

  it('survives repeated reads until it is cleared', () => {
    writeModulAjarPrefill(row);
    expect(peekModulAjarPrefill()?.mataPelajaran).toBe('Matematika');
    expect(peekModulAjarPrefill()?.mataPelajaran).toBe('Matematika');
    clearModulAjarPrefill();
    expect(peekModulAjarPrefill()).toBeNull();
  });
});
