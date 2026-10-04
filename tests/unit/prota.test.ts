import { describe, it, expect } from 'vitest';
import {
  validateProtaBalance,
  moveProtaItem,
  swapItemSemester,
  autoBalanceProtaJp,
  ProtaItem,
} from '@/utils/protaEngine';
import type { RmeSummary } from '@/types/perangkatAjar';

/**
 * Helper to build mock RmeSummary for testing Prota balance.
 */
function createMockRmeSummary(
  semesterNumber: 1 | 2,
  effectiveWeeks: number,
  weeklyJpQuota: number,
  reserveJp = 0
): RmeSummary {
  const totalAvailableJp = effectiveWeeks * weeklyJpQuota;
  const netTeachingJp = Math.max(0, totalAvailableJp - reserveJp);
  const totalWeeks = 30;

  return {
    semesterNumber,
    totalWeeks,
    effectiveWeeks,
    nonEffectiveWeeks: totalWeeks - effectiveWeeks,
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

describe('Prota Builder Engine (Pure Domain Tests - Zero Mocks)', () => {
  // =========================================================================
  // TIER 1: Feature Coverage (Core Happy Path)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Core Happy Path)', () => {
    it('Tier 1 (F7, F9): should map Kurikulum Merdeka learning objectives and calculate semester subtotals', () => {
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 1.1',
          learningObjectiveText: 'Peserta didik mampu menyimak instruksi sederhana',
          coreTopic: 'Teks Petunjuk',
          targetJp: 18,
          orderIndex: 0,
        },
        {
          id: 'item-2',
          semesterNumber: 1,
          elementOrDomain: 'Membaca dan Memirsa',
          learningObjectiveCode: 'TP 1.2',
          learningObjectiveText: 'Peserta didik mampu membaca kata-kata sederhana',
          coreTopic: 'Suku Kata',
          targetJp: 18,
          orderIndex: 1,
        },
        {
          id: 'item-3',
          semesterNumber: 2,
          elementOrDomain: 'Berbicara dan Mempresentasikan',
          learningObjectiveCode: 'TP 2.1',
          learningObjectiveText: 'Peserta didik mampu menceritakan pengalaman',
          coreTopic: 'Pengalaman Sehari-hari',
          targetJp: 36,
          orderIndex: 2,
        },
      ];

      const rmeSem1 = createMockRmeSummary(1, 18, 2); // Net: 36 JP
      const rmeSem2 = createMockRmeSummary(2, 18, 2); // Net: 36 JP

      const result = validateProtaBalance(items, rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(36);
      expect(result.allocatedSemester2Jp).toBe(36);
      expect(result.allocatedAnnualJp).toBe(72);
      expect(result.totalTargetJp).toBe(72);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.statusSemester2).toBe('PAS');
      expect(result.statusAnnual).toBe('PAS');
    });

    it('Tier 1 (F8): should support Kurikulum 2013 (K-13) Kompetensi Dasar structures', () => {
      const k13Items: ProtaItem[] = [
        {
          id: 'k13-1',
          semesterNumber: 1,
          elementOrDomain: 'KI-3 & KI-4 (Pengetahuan & Keterampilan)',
          learningObjectiveCode: 'KD 3.1 / 4.1',
          learningObjectiveText: 'Memahami pecahan senilai dengan gambar dan model konkret',
          coreTopic: 'Pecahan Senilai',
          targetJp: 32,
          orderIndex: 0,
        },
        {
          id: 'k13-2',
          semesterNumber: 2,
          elementOrDomain: 'KI-3 & KI-4 (Pengetahuan & Keterampilan)',
          learningObjectiveCode: 'KD 3.6 / 4.6',
          learningObjectiveText: 'Menganalisis sifat-sifat bangun ruang kubus dan balok',
          coreTopic: 'Bangun Ruang',
          targetJp: 32,
          orderIndex: 1,
        },
      ];

      const rmeSem1 = createMockRmeSummary(1, 16, 2); // 32 JP
      const rmeSem2 = createMockRmeSummary(2, 16, 2); // 32 JP

      const result = validateProtaBalance(k13Items, rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(32);
      expect(result.allocatedSemester2Jp).toBe(32);
      expect(result.statusAnnual).toBe('PAS');
    });

    it('Tier 1 (F10): should flag DEFISIT with exact deficit count when allocated JP is less than target', () => {
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Aljabar',
          learningObjectiveCode: 'TP 7.1',
          learningObjectiveText: 'Memahami bilangan bulat',
          coreTopic: 'Operasi Hitung Bilangan',
          targetJp: 40,
          orderIndex: 0,
        },
      ];

      // Target is 72 JP (18 MEB x 4 JP), but teacher only allocated 40 JP -> Deficit 32 JP
      const rmeSem1 = createMockRmeSummary(1, 18, 4);
      const rmeSem2 = createMockRmeSummary(2, 18, 4);

      const result = validateProtaBalance(items, rmeSem1, rmeSem2);

      expect(result.statusSemester1).toBe('DEFISIT');
      expect(result.diffSemester1).toBe(-32);
      expect(result.deficitJpSemester1).toBe(32);
      expect(result.surplusJpSemester1).toBe(0);
    });

    it('Tier 1 (F10): should flag SURPLUS with exact surplus count when allocated JP exceeds target', () => {
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Aljabar',
          learningObjectiveCode: 'TP 7.1',
          learningObjectiveText: 'Memahami bentuk aljabar',
          coreTopic: 'Suku Aljabar',
          targetJp: 80,
          orderIndex: 0,
        },
      ];

      // Target is 72 JP (18 MEB x 4 JP), but teacher allocated 80 JP -> Surplus 8 JP
      const rmeSem1 = createMockRmeSummary(1, 18, 4);
      const rmeSem2 = createMockRmeSummary(2, 18, 4);

      const result = validateProtaBalance(items, rmeSem1, rmeSem2);

      expect(result.statusSemester1).toBe('SURPLUS');
      expect(result.diffSemester1).toBe(8);
      expect(result.surplusJpSemester1).toBe(8);
      expect(result.deficitJpSemester1).toBe(0);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('Tier 2 (Boundary): should evaluate empty curriculum (0 items) as 100% DEFISIT', () => {
      const rmeSem1 = createMockRmeSummary(1, 18, 4); // 72 JP target
      const rmeSem2 = createMockRmeSummary(2, 18, 4); // 72 JP target

      const result = validateProtaBalance([], rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(0);
      expect(result.allocatedSemester2Jp).toBe(0);
      expect(result.allocatedAnnualJp).toBe(0);
      expect(result.diffSemester1).toBe(-72);
      expect(result.diffSemester2).toBe(-72);
      expect(result.statusSemester1).toBe('DEFISIT');
      expect(result.statusSemester2).toBe('DEFISIT');
      expect(result.statusAnnual).toBe('DEFISIT');
      expect(result.deficitJpSemester1).toBe(72);
      expect(result.deficitJpSemester2).toBe(72);
    });

    it('Tier 2 (Boundary): should evaluate exact 1 JP boundary conditions (1 JP deficit vs 1 JP surplus)', () => {
      const rmeSem1 = createMockRmeSummary(1, 18, 4); // 72 JP target
      const rmeSem2 = createMockRmeSummary(2, 18, 4);

      // 71 JP -> Deficit 1 JP
      const itemsDeficit: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Domain',
          learningObjectiveCode: 'TP 1',
          learningObjectiveText: 'Obj',
          coreTopic: 'Topic',
          targetJp: 71,
          orderIndex: 0,
        },
      ];
      const resultDeficit = validateProtaBalance(itemsDeficit, rmeSem1, rmeSem2);
      expect(resultDeficit.statusSemester1).toBe('DEFISIT');
      expect(resultDeficit.diffSemester1).toBe(-1);
      expect(resultDeficit.deficitJpSemester1).toBe(1);

      // 73 JP -> Surplus 1 JP
      const itemsSurplus: ProtaItem[] = [
        {
          id: 'item-2',
          semesterNumber: 1,
          elementOrDomain: 'Domain',
          learningObjectiveCode: 'TP 2',
          learningObjectiveText: 'Obj',
          coreTopic: 'Topic',
          targetJp: 73,
          orderIndex: 0,
        },
      ];
      const resultSurplus = validateProtaBalance(itemsSurplus, rmeSem1, rmeSem2);
      expect(resultSurplus.statusSemester1).toBe('SURPLUS');
      expect(resultSurplus.diffSemester1).toBe(1);
      expect(resultSurplus.surplusJpSemester1).toBe(1);
    });

    it('Tier 2 (F11 Boundary): should balance curriculum when Jam Cadangan (Reserve Hours) bridges the gap', () => {
      // Available teaching hours = 72 JP
      // Curriculum topics take 68 JP
      // Reserve hours = 4 JP -> Net target is 68 JP
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Domain',
          learningObjectiveCode: 'TP 1',
          learningObjectiveText: 'Materi Pokok',
          coreTopic: 'Topic',
          targetJp: 68,
          orderIndex: 0,
        },
      ];

      // RME configured with 4 JP reserve
      const rmeWithReserve = createMockRmeSummary(1, 18, 4, 4);
      expect(rmeWithReserve.netTeachingJp).toBe(68);

      const rmeSem2 = createMockRmeSummary(2, 18, 4, 0);

      const result = validateProtaBalance(items, rmeWithReserve, rmeSem2);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.diffSemester1).toBe(0);
      expect(result.allocatedSemester1Jp).toBe(68);
    });

    it('Tier 2 (Boundary): should support unequal semester splits (e.g. 60% Sem 1, 40% Sem 2)', () => {
      // Semester 1 has 20 effective weeks (80 JP)
      // Semester 2 has 15 effective weeks (60 JP)
      const rmeSem1 = createMockRmeSummary(1, 20, 4); // 80 JP
      const rmeSem2 = createMockRmeSummary(2, 15, 4); // 60 JP

      const items: ProtaItem[] = [
        {
          id: 'item-s1',
          semesterNumber: 1,
          elementOrDomain: 'D1',
          learningObjectiveCode: 'TP 1',
          learningObjectiveText: 'T1',
          coreTopic: 'C1',
          targetJp: 80,
          orderIndex: 0,
        },
        {
          id: 'item-s2',
          semesterNumber: 2,
          elementOrDomain: 'D2',
          learningObjectiveCode: 'TP 2',
          learningObjectiveText: 'T2',
          coreTopic: 'C2',
          targetJp: 60,
          orderIndex: 1,
        },
      ];

      const result = validateProtaBalance(items, rmeSem1, rmeSem2);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.statusSemester2).toBe('PAS');
      expect(result.statusAnnual).toBe('PAS');
      expect(result.allocatedAnnualJp).toBe(140);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations & State Shifts
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations & State Shifts', () => {
    it('Tier 3 (State Shift): should dynamically change status from PAS to DEFISIT when effective weeks change in Kaldik', () => {
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'D1',
          learningObjectiveCode: 'TP 1',
          learningObjectiveText: 'T1',
          coreTopic: 'C1',
          targetJp: 72,
          orderIndex: 0,
        },
      ];

      // Initial state: 18 effective weeks x 4 JP = 72 JP -> PAS
      const rmeInitial = createMockRmeSummary(1, 18, 4);
      const rmeSem2 = createMockRmeSummary(2, 18, 4);
      const initialResult = validateProtaBalance(items, rmeInitial, rmeSem2);
      expect(initialResult.statusSemester1).toBe('PAS');

      // Kaldik update: Teacher adds 1 holiday week -> effective weeks drops to 17 (target becomes 68 JP)
      // Allocated is now 72 vs 68 -> SURPLUS 4 JP
      const rmeUpdated = createMockRmeSummary(1, 17, 4);
      const updatedResult = validateProtaBalance(items, rmeUpdated, rmeSem2);
      expect(updatedResult.statusSemester1).toBe('SURPLUS');
      expect(updatedResult.diffSemester1).toBe(4);
    });

    it('Tier 3 (Item Migration): should update both semester balances when reassigning an item from Semester 1 to Semester 2', () => {
      const rmeSem1 = createMockRmeSummary(1, 18, 4); // 72 JP target
      const rmeSem2 = createMockRmeSummary(2, 18, 4); // 72 JP target

      // Initial: Sem 1 has 72 JP (PAS), Sem 2 has 52 JP (DEFISIT -20 JP)
      const itemsInitial: ProtaItem[] = [
        {
          id: 'tp-1',
          semesterNumber: 1,
          elementOrDomain: 'D1',
          learningObjectiveCode: 'TP 1',
          learningObjectiveText: 'T1',
          coreTopic: 'C1',
          targetJp: 52,
          orderIndex: 0,
        },
        {
          id: 'tp-moveable',
          semesterNumber: 1,
          elementOrDomain: 'D1',
          learningObjectiveCode: 'TP 2',
          learningObjectiveText: 'T2',
          coreTopic: 'C2',
          targetJp: 20,
          orderIndex: 1,
        },
        {
          id: 'tp-3',
          semesterNumber: 2,
          elementOrDomain: 'D2',
          learningObjectiveCode: 'TP 3',
          learningObjectiveText: 'T3',
          coreTopic: 'C3',
          targetJp: 52,
          orderIndex: 2,
        },
      ];

      const res1 = validateProtaBalance(itemsInitial, rmeSem1, rmeSem2);
      expect(res1.statusSemester1).toBe('PAS');
      expect(res1.statusSemester2).toBe('DEFISIT');

      // Move tp-moveable from Semester 1 to Semester 2
      const itemsAfterMove = itemsInitial.map((item) =>
        item.id === 'tp-moveable' ? { ...item, semesterNumber: 2 as const } : item
      );

      const res2 = validateProtaBalance(itemsAfterMove, rmeSem1, rmeSem2);
      // Now Sem 1 has 52 JP (DEFISIT -20 JP), Sem 2 has 72 JP (PAS)
      expect(res2.statusSemester1).toBe('DEFISIT');
      expect(res2.diffSemester1).toBe(-20);
      expect(res2.statusSemester2).toBe('PAS');
      expect(res2.diffSemester2).toBe(0);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Indonesian Academic Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Indonesian Academic Scenarios', () => {
    it('Tier 4 (Scenario A): should model SD Kurikulum Merdeka Fase B Kelas 4 Bahasa Indonesia (Annual 216 JP, 6 JP/week)', () => {
      // SD Bahasa Indonesia: 6 JP/week
      // Semester 1: 18 effective weeks x 6 JP = 108 JP
      // Semester 2: 18 effective weeks x 6 JP = 108 JP
      // Total Annual Target: 216 JP
      const rmeSem1 = createMockRmeSummary(1, 18, 6);
      const rmeSem2 = createMockRmeSummary(2, 18, 6);

      // 8 Bab (4 Bab per semester):
      const bahasaIndonesiaItems: ProtaItem[] = [
        // Semester 1
        {
          id: 'bi-bab1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 4.1',
          learningObjectiveText: 'Memahami instruksi lisan dan teks narasi tentang lingkungan',
          coreTopic: 'Bab 1: Sudah Besar',
          targetJp: 27,
          orderIndex: 0,
        },
        {
          id: 'bi-bab2',
          semesterNumber: 1,
          elementOrDomain: 'Membaca dan Memirsa',
          learningObjectiveCode: 'TP 4.2',
          learningObjectiveText: 'Menemukan informasi tersirat dalam teks fiksi',
          coreTopic: 'Bab 2: Di Bawah Atap',
          targetJp: 27,
          orderIndex: 1,
        },
        {
          id: 'bi-bab3',
          semesterNumber: 1,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 4.3',
          learningObjectiveText: 'Menyampaikan gagasan secara runtut dalam diskusi',
          coreTopic: 'Bab 3: Lihat Sekitar',
          targetJp: 27,
          orderIndex: 2,
        },
        {
          id: 'bi-bab4',
          semesterNumber: 1,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 4.4',
          learningObjectiveText: 'Menulis teks deskripsi menggunakan kosakata baru',
          coreTopic: 'Bab 4: Meliuk dan Menerjang',
          targetJp: 27,
          orderIndex: 3,
        },
        // Semester 2
        {
          id: 'bi-bab5',
          semesterNumber: 2,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 4.5',
          learningObjectiveText: 'Membedakan fakta dan opini dalam teks eksplanasi',
          coreTopic: 'Bab 5: Bertukar dan Membayar',
          targetJp: 27,
          orderIndex: 4,
        },
        {
          id: 'bi-bab6',
          semesterNumber: 2,
          elementOrDomain: 'Membaca dan Memirsa',
          learningObjectiveCode: 'TP 4.6',
          learningObjectiveText: 'Menganalisis pesan moral dalam cerita rakyat',
          coreTopic: 'Bab 6: Satu Titik',
          targetJp: 27,
          orderIndex: 5,
        },
        {
          id: 'bi-bab7',
          semesterNumber: 2,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 4.7',
          learningObjectiveText: 'Melakukan presentasi hasil pengamatan secara percaya diri',
          coreTopic: 'Bab 7: Asal Usul',
          targetJp: 27,
          orderIndex: 6,
        },
        {
          id: 'bi-bab8',
          semesterNumber: 2,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 4.8',
          learningObjectiveText: 'Menulis teks laporan sederhana dengan kaidah PUEBI',
          coreTopic: 'Bab 8: Sehatlah Ragaku',
          targetJp: 27,
          orderIndex: 7,
        },
      ];

      const result = validateProtaBalance(bahasaIndonesiaItems, rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(108);
      expect(result.allocatedSemester2Jp).toBe(108);
      expect(result.allocatedAnnualJp).toBe(216);
      expect(result.totalTargetJp).toBe(216);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.statusSemester2).toBe('PAS');
      expect(result.statusAnnual).toBe('PAS');
    });

    it('Tier 4 (Scenario B): should model SMA Fase E Kelas 10 Biologi (Annual 108 JP, 3 JP/week with Jam Cadangan)', () => {
      // SMA Kelas 10 Biologi: 3 JP/week
      // Semester 1: 18 MEB x 3 JP = 54 JP total (51 JP Materi + 3 JP Jam Cadangan)
      // Semester 2: 18 MEB x 3 JP = 54 JP total (51 JP Materi + 3 JP Jam Cadangan)
      const rmeSem1 = createMockRmeSummary(1, 18, 3, 3); // Net target 51 JP
      const rmeSem2 = createMockRmeSummary(2, 18, 3, 3); // Net target 51 JP

      const biologiItems: ProtaItem[] = [
        {
          id: 'bio-1',
          semesterNumber: 1,
          elementOrDomain: 'Pemahaman Biologi',
          learningObjectiveCode: 'TP 10.1',
          learningObjectiveText: 'Menganalisis keanekaragaman hayati dan peranannya',
          coreTopic: 'Keanekaragaman Hayati',
          targetJp: 27,
          orderIndex: 0,
        },
        {
          id: 'bio-2',
          semesterNumber: 1,
          elementOrDomain: 'Keterampilan Proses',
          learningObjectiveCode: 'TP 10.2',
          learningObjectiveText: 'Mengidentifikasi struktur dan replikasi virus',
          coreTopic: 'Virus dan Peranannya',
          targetJp: 24,
          orderIndex: 1,
        },
        {
          id: 'bio-3',
          semesterNumber: 2,
          elementOrDomain: 'Pemahaman Biologi',
          learningObjectiveCode: 'TP 10.3',
          learningObjectiveText: 'Menganalisis komponen ekosistem dan interaksinya',
          coreTopic: 'Ekosistem dan Perubahan Lingkungan',
          targetJp: 30,
          orderIndex: 2,
        },
        {
          id: 'bio-4',
          semesterNumber: 2,
          elementOrDomain: 'Keterampilan Proses',
          learningObjectiveCode: 'TP 10.4',
          learningObjectiveText: 'Merancang solusi pelestarian lingkungan',
          coreTopic: 'Bioteknologi Lingkungan',
          targetJp: 21,
          orderIndex: 3,
        },
      ];

      const result = validateProtaBalance(biologiItems, rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(51);
      expect(result.allocatedSemester2Jp).toBe(51);
      expect(result.allocatedAnnualJp).toBe(102);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.statusSemester2).toBe('PAS');
      expect(result.statusAnnual).toBe('PAS');
    });

    it('Tier 4 (Scenario C): should model K-13 Grade 6 Matematika annual schedule with KI-3/KI-4 KD mapping', () => {
      // K-13 Grade 6: 4 JP/week
      // Semester 1: 18 MEB x 4 JP = 72 JP
      // Semester 2: 14 MEB x 4 JP = 56 JP (shortened semester due to US)
      // Total Annual: 128 JP
      const rmeSem1 = createMockRmeSummary(1, 18, 4);
      const rmeSem2 = createMockRmeSummary(2, 14, 4);

      const k13Matematika: ProtaItem[] = [
        // Semester 1: KD 3.1 - 3.5 (72 JP)
        {
          id: 'kd-3.1',
          semesterNumber: 1,
          elementOrDomain: 'Bilangan Bulat',
          learningObjectiveCode: 'KD 3.1 / 4.1',
          learningObjectiveText: 'Menjelaskan bilangan bulat negatif',
          coreTopic: 'Operasi Hitung Bilangan Bulat',
          targetJp: 16,
          orderIndex: 0,
        },
        {
          id: 'kd-3.2',
          semesterNumber: 1,
          elementOrDomain: 'Operasi Campuran',
          learningObjectiveCode: 'KD 3.2 / 4.2',
          learningObjectiveText: 'Operasi hitung campuran bilangan cacah dan pecahan',
          coreTopic: 'Hitung Campuran',
          targetJp: 16,
          orderIndex: 1,
        },
        {
          id: 'kd-3.3',
          semesterNumber: 1,
          elementOrDomain: 'Lingkaran',
          learningObjectiveCode: 'KD 3.3 / 4.3',
          learningObjectiveText: 'Unsur-unsur lingkaran (titik pusat, jari-jari, diameter)',
          coreTopic: 'Lingkaran',
          targetJp: 20,
          orderIndex: 2,
        },
        {
          id: 'kd-3.4',
          semesterNumber: 1,
          elementOrDomain: 'Luas Lingkaran',
          learningObjectiveCode: 'KD 3.4 / 4.4',
          learningObjectiveText: 'Menaksir keliling dan luas lingkaran',
          coreTopic: 'Keliling dan Luas',
          targetJp: 20,
          orderIndex: 3,
        },
        // Semester 2: KD 3.6 - 3.8 (56 JP)
        {
          id: 'kd-3.6',
          semesterNumber: 2,
          elementOrDomain: 'Geometri Ruang',
          learningObjectiveCode: 'KD 3.6 / 4.6',
          learningObjectiveText: 'Membandingkan prisma, tabung, limas, kerucut, dan bola',
          coreTopic: 'Sifat Bangun Ruang',
          targetJp: 20,
          orderIndex: 4,
        },
        {
          id: 'kd-3.7',
          semesterNumber: 2,
          elementOrDomain: 'Volume Bangun Ruang',
          learningObjectiveCode: 'KD 3.7 / 4.7',
          learningObjectiveText: 'Menentukan volume dan luas permukaan bangun ruang',
          coreTopic: 'Volume & Luas Permukaan',
          targetJp: 16,
          orderIndex: 5,
        },
        {
          id: 'kd-3.8',
          semesterNumber: 2,
          elementOrDomain: 'Statistika',
          learningObjectiveCode: 'KD 3.8 / 4.8',
          learningObjectiveText: 'Menjelaskan modus, median, dan mean dari data tunggal',
          coreTopic: 'Penyajian Data & Pemusatan',
          targetJp: 20,
          orderIndex: 6,
        },
      ];

      const result = validateProtaBalance(k13Matematika, rmeSem1, rmeSem2);

      expect(result.allocatedSemester1Jp).toBe(72);
      expect(result.allocatedSemester2Jp).toBe(56);
      expect(result.allocatedAnnualJp).toBe(128);
      expect(result.statusSemester1).toBe('PAS');
      expect(result.statusSemester2).toBe('PAS');
      expect(result.statusAnnual).toBe('PAS');
    });
  });

  // =========================================================================
  // TIER 6: Reordering & Semester Swap Functions
  // =========================================================================
  describe('Tier 6: Reordering & Semester Swap Functions', () => {
    const mockItems: ProtaItem[] = [
      {
        id: 'tp-1',
        semesterNumber: 1,
        elementOrDomain: 'Bilangan',
        learningObjectiveCode: 'TP 1.1',
        learningObjectiveText: 'Membaca bilangan',
        coreTopic: 'Bilangan Cacah',
        targetJp: 10,
        orderIndex: 0,
      },
      {
        id: 'tp-2',
        semesterNumber: 1,
        elementOrDomain: 'Bilangan',
        learningObjectiveCode: 'TP 1.2',
        learningObjectiveText: 'Menulis bilangan',
        coreTopic: 'Bilangan Cacah',
        targetJp: 12,
        orderIndex: 1,
      },
      {
        id: 'tp-3',
        semesterNumber: 1,
        elementOrDomain: 'Aljabar',
        learningObjectiveCode: 'TP 1.3',
        learningObjectiveText: 'Pola bilangan',
        coreTopic: 'Pola Gambar',
        targetJp: 8,
        orderIndex: 2,
      },
      {
        id: 'tp-4',
        semesterNumber: 2,
        elementOrDomain: 'Geometri',
        learningObjectiveCode: 'TP 2.1',
        learningObjectiveText: 'Bangun datar',
        coreTopic: 'Segitiga dan Segi Empat',
        targetJp: 15,
        orderIndex: 0,
      },
    ];

    it('moves an item down within the same semester and recalculates orderIndex', () => {
      const reordered = moveProtaItem(mockItems, 'tp-1', 'down');
      const sem1Items = reordered.filter((i) => i.semesterNumber === 1);

      expect(sem1Items[0].id).toBe('tp-2');
      expect(sem1Items[0].orderIndex).toBe(0);
      expect(sem1Items[1].id).toBe('tp-1');
      expect(sem1Items[1].orderIndex).toBe(1);
      expect(sem1Items[2].id).toBe('tp-3');
      expect(sem1Items[2].orderIndex).toBe(2);
    });

    it('moves an item up within the same semester and recalculates orderIndex', () => {
      const reordered = moveProtaItem(mockItems, 'tp-3', 'up');
      const sem1Items = reordered.filter((i) => i.semesterNumber === 1);

      expect(sem1Items[0].id).toBe('tp-1');
      expect(sem1Items[1].id).toBe('tp-3');
      expect(sem1Items[1].orderIndex).toBe(1);
      expect(sem1Items[2].id).toBe('tp-2');
      expect(sem1Items[2].orderIndex).toBe(2);
    });

    it('does not reorder if moving up at top or moving down at bottom', () => {
      const topUp = moveProtaItem(mockItems, 'tp-1', 'up');
      expect(topUp.map((i) => i.id)).toEqual(mockItems.map((i) => i.id));

      const bottomDown = moveProtaItem(mockItems, 'tp-3', 'down');
      expect(bottomDown.map((i) => i.id)).toEqual(mockItems.map((i) => i.id));
    });

    it('swaps item from Semester 1 to Semester 2 cleanly', () => {
      const swapped = swapItemSemester(mockItems, 'tp-2');

      const sem1 = swapped.filter((i) => i.semesterNumber === 1);
      const sem2 = swapped.filter((i) => i.semesterNumber === 2);

      expect(sem1.length).toBe(2);
      expect(sem1.map((i) => i.id)).toEqual(['tp-1', 'tp-3']);
      expect(sem1[0].orderIndex).toBe(0);
      expect(sem1[1].orderIndex).toBe(1);

      expect(sem2.length).toBe(2);
      expect(sem2[0].id).toBe('tp-4');
      expect(sem2[0].orderIndex).toBe(0);
      expect(sem2[1].id).toBe('tp-2');
      expect(sem2[1].semesterNumber).toBe(2);
      expect(sem2[1].orderIndex).toBe(1);
    });

    it('swaps item from Semester 2 to Semester 1 cleanly', () => {
      const swapped = swapItemSemester(mockItems, 'tp-4');

      const sem1 = swapped.filter((i) => i.semesterNumber === 1);
      const sem2 = swapped.filter((i) => i.semesterNumber === 2);

      expect(sem2.length).toBe(0);
      expect(sem1.length).toBe(4);
      expect(sem1[3].id).toBe('tp-4');
      expect(sem1[3].semesterNumber).toBe(1);
      expect(sem1[3].orderIndex).toBe(3);
    });
  });

  // =========================================================================
  // TIER 6: Intelligent Auto-Balance Equalizer (Option B 1-Click Feature)
  // =========================================================================
  describe('Tier 6: Intelligent Auto-Balance Equalizer (autoBalanceProtaJp)', () => {
    it('resolves a 4 JP deficit cleanly in 2 JP increments (matching user discrepancy scenario)', () => {
      // 4 topics with 18 JP each = 72 JP. Target is 76 JP (effectiveWeeks 19 * 4 JP/wk).
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 1.1',
          learningObjectiveText: 'Tujuan 1',
          coreTopic: 'Topik 1',
          targetJp: 18,
          orderIndex: 0,
        },
        {
          id: 'item-2',
          semesterNumber: 1,
          elementOrDomain: 'Membaca',
          learningObjectiveCode: 'TP 1.2',
          learningObjectiveText: 'Tujuan 2',
          coreTopic: 'Topik 2',
          targetJp: 18,
          orderIndex: 1,
        },
        {
          id: 'item-3',
          semesterNumber: 1,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 1.3',
          learningObjectiveText: 'Tujuan 3',
          coreTopic: 'Topik 3',
          targetJp: 18,
          orderIndex: 2,
        },
        {
          id: 'item-4',
          semesterNumber: 1,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 1.4',
          learningObjectiveText: 'Tujuan 4',
          coreTopic: 'Topik 4',
          targetJp: 18,
          orderIndex: 3,
        },
      ];

      const rmeSem1 = createMockRmeSummary(1, 19, 4); // Target: 76 JP
      const rmeSem2 = createMockRmeSummary(2, 0, 0); // Target: 0 JP

      // Before auto-balance, status is DEFISIT by 4 JP
      const beforeValidation = validateProtaBalance(items, rmeSem1, rmeSem2);
      expect(beforeValidation.statusSemester1).toBe('DEFISIT');
      expect(beforeValidation.diffSemester1).toBe(-4);

      // Run 1-click Auto-Balance
      const result = autoBalanceProtaJp(items, rmeSem1, rmeSem2);

      expect(result.isBalanced).toBe(true);
      expect(result.adjustedSem1).toBe(4);
      expect(result.adjustedSem2).toBe(0);
      expect(result.adjustedItemIds.length).toBe(2);

      // Total hours now equal target exactly (76 JP)
      const afterValidation = validateProtaBalance(result.items, rmeSem1, rmeSem2);
      expect(afterValidation.statusSemester1).toBe('PAS');
      expect(afterValidation.diffSemester1).toBe(0);
      expect(afterValidation.allocatedSemester1Jp).toBe(76);

      // Distributed in 2 JP increments to the first 2 items
      expect(result.items[0].targetJp).toBe(20);
      expect(result.items[1].targetJp).toBe(20);
      expect(result.items[2].targetJp).toBe(18);
      expect(result.items[3].targetJp).toBe(18);
    });

    it('resolves an over-allocated surplus by deducting from largest topics without dropping below MIN_JP', () => {
      // 4 topics with [24, 22, 18, 18] = 82 JP. Target is 76 JP (surplus of 6 JP).
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 1.1',
          learningObjectiveText: 'Tujuan 1',
          coreTopic: 'Topik 1',
          targetJp: 24,
          orderIndex: 0,
        },
        {
          id: 'item-2',
          semesterNumber: 1,
          elementOrDomain: 'Membaca',
          learningObjectiveCode: 'TP 1.2',
          learningObjectiveText: 'Tujuan 2',
          coreTopic: 'Topik 2',
          targetJp: 22,
          orderIndex: 1,
        },
        {
          id: 'item-3',
          semesterNumber: 1,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 1.3',
          learningObjectiveText: 'Tujuan 3',
          coreTopic: 'Topik 3',
          targetJp: 18,
          orderIndex: 2,
        },
        {
          id: 'item-4',
          semesterNumber: 1,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 1.4',
          learningObjectiveText: 'Tujuan 4',
          coreTopic: 'Topik 4',
          targetJp: 18,
          orderIndex: 3,
        },
      ];

      const rmeSem1 = createMockRmeSummary(1, 19, 4); // Target: 76 JP
      const rmeSem2 = createMockRmeSummary(2, 0, 0);

      const result = autoBalanceProtaJp(items, rmeSem1, rmeSem2);

      expect(result.isBalanced).toBe(true);
      expect(result.adjustedSem1).toBe(-6);

      const afterValidation = validateProtaBalance(result.items, rmeSem1, rmeSem2);
      expect(afterValidation.statusSemester1).toBe('PAS');
      expect(afterValidation.allocatedSemester1Jp).toBe(76);

      // Deductions taken from largest topics (24 -> 22, 22 -> 20, 22 -> 20 etc.)
      const total = result.items.reduce((s, it) => s + it.targetJp, 0);
      expect(total).toBe(76);
      expect(result.items.every((it) => it.targetJp >= 2)).toBe(true);
    });

    it('handles odd JP discrepancy (e.g. +3 JP or -1 JP) cleanly', () => {
      const items: ProtaItem[] = [
        {
          id: 'item-1',
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 1.1',
          learningObjectiveText: 'Tujuan 1',
          coreTopic: 'Topik 1',
          targetJp: 18,
          orderIndex: 0,
        },
        {
          id: 'item-2',
          semesterNumber: 1,
          elementOrDomain: 'Membaca',
          learningObjectiveCode: 'TP 1.2',
          learningObjectiveText: 'Tujuan 2',
          coreTopic: 'Topik 2',
          targetJp: 18,
          orderIndex: 1,
        },
      ];

      // Target is 39 JP (36 + 3 JP deficit)
      const rmeSem1 = createMockRmeSummary(1, 13, 3); // 39 JP
      const rmeSem2 = createMockRmeSummary(2, 0, 0);

      const result = autoBalanceProtaJp(items, rmeSem1, rmeSem2);
      expect(result.isBalanced).toBe(true);
      expect(result.adjustedSem1).toBe(3);

      const total = result.items.reduce((s, it) => s + it.targetJp, 0);
      expect(total).toBe(39);
    });

    it('balances both Semester 1 and Semester 2 simultaneously in one operation', () => {
      const items: ProtaItem[] = [
        {
          id: 'sem1-1',
          semesterNumber: 1,
          elementOrDomain: 'Domain 1',
          learningObjectiveCode: 'TP 1.1',
          learningObjectiveText: 'T1',
          coreTopic: 'Topik Sem 1',
          targetJp: 30, // Deficit of 6 (target 36)
          orderIndex: 0,
        },
        {
          id: 'sem2-1',
          semesterNumber: 2,
          elementOrDomain: 'Domain 2',
          learningObjectiveCode: 'TP 2.1',
          learningObjectiveText: 'T2',
          coreTopic: 'Topik Sem 2',
          targetJp: 40, // Surplus of 4 (target 36)
          orderIndex: 1,
        },
      ];

      const rmeSem1 = createMockRmeSummary(1, 18, 2); // 36 JP
      const rmeSem2 = createMockRmeSummary(2, 18, 2); // 36 JP

      const result = autoBalanceProtaJp(items, rmeSem1, rmeSem2);

      expect(result.isBalanced).toBe(true);
      expect(result.adjustedSem1).toBe(6);
      expect(result.adjustedSem2).toBe(-4);

      const validation = validateProtaBalance(result.items, rmeSem1, rmeSem2);
      expect(validation.statusSemester1).toBe('PAS');
      expect(validation.statusSemester2).toBe('PAS');
      expect(validation.statusAnnual).toBe('PAS');
      expect(validation.diffAnnual).toBe(0);
    });

    it('returns empty result safely when no items are provided', () => {
      const rmeSem1 = createMockRmeSummary(1, 18, 2);
      const rmeSem2 = createMockRmeSummary(2, 18, 2);

      const result = autoBalanceProtaJp([], rmeSem1, rmeSem2);
      expect(result.items).toEqual([]);
      expect(result.isBalanced).toBe(false);
      expect(result.adjustedSem1).toBe(0);
      expect(result.adjustedSem2).toBe(0);
    });
  });
});
