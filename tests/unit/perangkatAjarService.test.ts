import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveDocumentIdentity,
  loadDocumentIdentity,
  saveKaldikWeeks,
  loadKaldikWeeks,
  saveProta,
  loadProta,
  savePromes,
  loadPromes,
} from '../../src/services/perangkatAjarService';
import type { DocumentIdentity, KaldikWeek, ProtaHeader, ProtaItem, PromesHeader, MatrixCell } from '../../src/types/perangkatAjar';

describe('perangkatAjarService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Document Identity Persistence', () => {
    it('saves and loads document identity correctly from localStorage', () => {
      const mockIdentity: DocumentIdentity = {
        ministryName: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
        regionalOffice: 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
        schoolName: 'MI AL IRSYAD KOTA MADIUN',
        schoolAddress: 'Jl. Diponegoro No. 112B',
        schoolPhone: '(0351) 463765',
        schoolEmail: 'mialirsyadkotamadiun@gmail.com',
        schoolWebsite: 'mialirsyadkotamadiun.sch.id',
        subject: 'Matematika',
        gradeLevel: 'Kelas 4',
        phase: 'Fase B',
        curriculum: 'MERDEKA',
        academicYear: '2024/2025',
        semesterNumber: 1,
        principalRole: 'Kepala Madrasah',
        principalName: 'H. Masturi, S.Pd.I.',
        principalNip: '197001011995031001',
        teacherRole: 'Guru Kelas 4',
        teacherName: 'Bagas Riyadi, S.Pd',
        teacherNip: '199505052020121002',
        city: 'Madiun',
        signatureDate: '26 September 2026',
        showLogos: true,
      };

      saveDocumentIdentity(mockIdentity);

      const loaded = loadDocumentIdentity();
      expect(loaded).toEqual(mockIdentity);
    });

    it('returns null if no identity is cached in localStorage', () => {
      const loaded = loadDocumentIdentity();
      expect(loaded).toBeNull();
    });
  });

  describe('Kaldik Persistence & Presets', () => {
    it('falls back to national preset when nothing is cached', async () => {
      const weeks = await loadKaldikWeeks('2024/2025');
      expect(weeks.length).toBeGreaterThan(0);
      expect(weeks[0].academicYear).toBe('2024/2025');
    });

    it('persists and retrieves custom Kaldik weeks locally', async () => {
      const customWeeks: KaldikWeek[] = [
        { month: 7, weekNumber: 1, type: 'MPLS', academicYear: '2024/2025' },
        { month: 7, weekNumber: 2, type: 'KBM', academicYear: '2024/2025' },
      ];

      await saveKaldikWeeks('2024/2025', customWeeks);
      const retrieved = await loadKaldikWeeks('2024/2025');

      expect(retrieved).toEqual(customWeeks);
    });
  });

  describe('Prota Persistence', () => {
    it('persists Prota header and items locally and sets active prota id', async () => {
      const header: ProtaHeader = {
        id: 'prota-test-123',
        userId: 'user-1',
        academicYear: '2024/2025',
        subject: 'Bahasa Indonesia',
        gradeLevel: 'Kelas 4',
        curriculum: 'MERDEKA',
        weeklyJpQuota: 4,
        reserveJpSem1: 2,
        reserveJpSem2: 2,
      };

      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 4.1',
          learningObjectiveText: 'Memahami ide pokok cerita',
          coreTopic: 'Teks Cerita',
          targetJp: 18,
          orderIndex: 0,
        },
      ];

      const savedId = await saveProta(header, items);
      expect(savedId).toBe('prota-test-123');

      const loaded = await loadProta('prota-test-123');
      expect(loaded.header?.subject).toBe('Bahasa Indonesia');
      expect(loaded.items.length).toBe(1);
      expect(loaded.items[0].learningObjectiveCode).toBe('TP 4.1');
    });
  });

  describe('Promes Persistence & Semester Isolation', () => {
    it('maintains strict isolation between Semester 1 and Semester 2 cells', async () => {
      const protaId = 'prota-isolation-test';

      const sem1Header: PromesHeader = {
        id: 'promes-sem-1',
        protaId,
        userId: 'user-1',
        semesterNumber: 1,
        weeklyJpLimit: 4,
      };

      const sem1Cells: MatrixCell[] = [
        { rowId: 'item-sem-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
      ];

      const sem2Header: PromesHeader = {
        id: 'promes-sem-2',
        protaId,
        userId: 'user-1',
        semesterNumber: 2,
        weeklyJpLimit: 4,
      };

      const sem2Cells: MatrixCell[] = [
        { rowId: 'item-sem-2', monthIndex: 1, weekNumber: 3, allocatedJp: 2, isLocked: false },
      ];

      await savePromes(sem1Header, sem1Cells);
      await savePromes(sem2Header, sem2Cells);

      const loadedSem1 = await loadPromes(protaId, 1);
      const loadedSem2 = await loadPromes(protaId, 2);

      expect(loadedSem1.cells).toEqual(sem1Cells);
      expect(loadedSem2.cells).toEqual(sem2Cells);
      expect(loadedSem1.cells[0].rowId).toBe('item-sem-1');
      expect(loadedSem2.cells[0].rowId).toBe('item-sem-2');
    });

    it('returns empty cells and null header gracefully when Promes not found', async () => {
      const result = await loadPromes('non-existent-prota', 1);
      expect(result.header).toBeNull();
      expect(result.cells).toEqual([]);
    });

    it('returns empty items and null header gracefully when Prota not found', async () => {
      const result = await loadProta('non-existent-prota-id');
      expect(result.header).toBeNull();
      expect(result.items).toEqual([]);
    });
  });
});
