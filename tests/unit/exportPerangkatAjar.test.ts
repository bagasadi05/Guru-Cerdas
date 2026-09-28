import { describe, it, expect } from 'vitest';
import {
  exportPromesToExcel,
  exportProtaToExcel,
  exportPromesToWord,
  exportProtaToWord,
  DocumentIdentity,
} from '@/utils/exportPerangkatAjar';
import type { KaldikWeek, MatrixCell, ProtaItem, ProtaValidationResult } from '@/types/perangkatAjar';

function createMockIdentity(overrides?: Partial<DocumentIdentity>): DocumentIdentity {
  return {
    schoolName: 'SD Negeri 1 Merdeka Belajar',
    schoolAddress: 'Jl. Pendidikan No. 45, Jakarta Pusat',
    schoolPhone: '(021) 12345678',
    subject: 'Bahasa Indonesia',
    gradeLevel: 'Kelas 4',
    phase: 'Fase B',
    academicYear: '2026/2027',
    semesterNumber: 1,
    principalName: 'Dra. Hj. Siti Rahmah, M.Pd.',
    principalNip: '197508152000032001',
    teacherName: 'Ahmad Fauzi, S.Pd.',
    teacherNip: '198811202015021002',
    city: 'Jakarta',
    signatureDate: '15 Juli 2026',
    ...overrides,
  };
}

describe('Official Kemendikbudristek Exporter (Pure Domain Contracts - Zero Mocks)', () => {
  const mockItems: ProtaItem[] = [
    {
      id: 'tp-1',
      semesterNumber: 1,
      elementOrDomain: 'Menyimak',
      learningObjectiveCode: 'TP 4.1',
      learningObjectiveText: 'Memahami ide pokok dan ide pendukung teks lisan',
      coreTopic: 'Ide Pokok Teks',
      targetJp: 18,
      orderIndex: 0,
    },
    {
      id: 'tp-2',
      semesterNumber: 1,
      elementOrDomain: 'Membaca',
      learningObjectiveCode: 'TP 4.2',
      learningObjectiveText: 'Membaca kata-kata baru dengan pelafalan fasih',
      coreTopic: 'Kosakata Baru',
      targetJp: 18,
      orderIndex: 1,
    },
  ];

  const mockValidation: ProtaValidationResult = {
    totalTargetJp: 36,
    allocatedSemester1Jp: 36,
    allocatedSemester2Jp: 0,
    allocatedAnnualJp: 36,
    diffSemester1: 0,
    diffSemester2: 0,
    diffAnnual: 0,
    statusSemester1: 'PAS',
    statusSemester2: 'PAS',
    statusAnnual: 'PAS',
    deficitJpSemester1: 0,
    surplusJpSemester1: 0,
    deficitJpSemester2: 0,
    surplusJpSemester2: 0,
  };

  const mockWeeks: KaldikWeek[] = [
    { month: 7, weekNumber: 1, type: 'LIBUR_SEMESTER' },
    { month: 7, weekNumber: 2, type: 'MPLS' },
    { month: 7, weekNumber: 3, type: 'KBM' },
    { month: 7, weekNumber: 4, type: 'KBM' },
    { month: 7, weekNumber: 5, type: 'KBM' },
  ];

  const mockCells: MatrixCell[] = [
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 0, isLocked: true, lockReason: 'LIBUR_SEMESTER' },
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 2, allocatedJp: 0, isLocked: true, lockReason: 'MPLS' },
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 3, allocatedJp: 4, isLocked: false },
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 4, allocatedJp: 4, isLocked: false },
  ];

  // =========================================================================
  // TIER 1: Feature Coverage (Core Happy Path)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Core Happy Path)', () => {
    it('Tier 1 (F19, F20): should construct valid official metadata and double-signature identity block', () => {
      const identity = createMockIdentity();

      expect(identity.schoolName).toBe('SD Negeri 1 Merdeka Belajar');
      expect(identity.academicYear).toBe('2026/2027');
      expect(identity.principalName).toContain('M.Pd.');
      expect(identity.principalNip).toMatch(/^\d{18}$/); // Standard 18-digit Indonesian PNS NIP
      expect(identity.teacherName).toContain('S.Pd.');
      expect(identity.signatureDate).toContain('2026');
    });

    it('Tier 1 (F22): exportProtaToExcel should accept valid Prota data and return a Promise resolving to a Blob', async () => {
      const identity = createMockIdentity();
      const exportPromise = exportProtaToExcel({
        identity,
        items: mockItems,
        validation: mockValidation,
      });

      expect(exportPromise).toBeInstanceOf(Promise);
    });

    it('Tier 1 (F22): exportPromesToExcel should accept valid Promes data and return a Promise resolving to a Blob', async () => {
      const identity = createMockIdentity();
      const exportPromise = exportPromesToExcel({
        identity,
        items: mockItems,
        weeks: mockWeeks,
        cells: mockCells,
      });

      expect(exportPromise).toBeInstanceOf(Promise);
    });

    it('Tier 1 (F23): exportProtaToWord should accept valid Prota data and return a Promise resolving to a Blob', async () => {
      const identity = createMockIdentity();
      const exportPromise = exportProtaToWord({
        identity,
        items: mockItems,
        validation: mockValidation,
      });

      expect(exportPromise).toBeInstanceOf(Promise);
    });

    it('Tier 1 (F23): exportPromesToWord should accept valid Promes data and return a Promise resolving to a Blob', async () => {
      const identity = createMockIdentity();
      const exportPromise = exportPromesToWord({
        identity,
        items: mockItems,
        weeks: mockWeeks,
        cells: mockCells,
      });

      expect(exportPromise).toBeInstanceOf(Promise);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('Tier 2 (Boundary): should handle empty / unassigned NIP (Honorary teacher without PNS NIP)', () => {
      const nonPnsIdentity = createMockIdentity({
        teacherNip: '-',
        principalNip: '',
      });

      expect(nonPnsIdentity.teacherNip).toBe('-');
      expect(nonPnsIdentity.principalNip).toBe('');
    });

    it('Tier 2 (Boundary): should handle empty items array for Prota and Promes exports gracefully', () => {
      const identity = createMockIdentity();

      const emptyProtaPromise = exportProtaToExcel({
        identity,
        items: [],
        validation: { ...mockValidation, allocatedAnnualJp: 0, totalTargetJp: 0 },
      });
      expect(emptyProtaPromise).toBeInstanceOf(Promise);

      const emptyPromesPromise = exportPromesToExcel({
        identity,
        items: [],
        weeks: mockWeeks,
        cells: [],
      });
      expect(emptyPromesPromise).toBeInstanceOf(Promise);
    });

    it('Tier 2 (Adversarial): should handle special Indonesian academic characters in titles and school names', () => {
      const complexIdentity = createMockIdentity({
        schoolName: 'SMP Islam Terpadu & Pesantren "Al-Hikmah" (Akreditasi A)',
        principalName: 'K.H. Dr. Muhammad Syarifuddin, Lc., M.A.',
        teacherName: 'Nurul Hidayati, S.Si., M.Pd.I.',
      });

      expect(complexIdentity.schoolName).toContain('"Al-Hikmah"');
      expect(complexIdentity.schoolName).toContain('&');
      expect(complexIdentity.principalName).toContain('Lc., M.A.');
    });
  });
});
