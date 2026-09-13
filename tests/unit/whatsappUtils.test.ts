import { describe, it, expect } from 'vitest';
import {
  createWhatsAppLink,
  generateViolationMessage,
  generateBintangMonthlyMessage,
  generateAttendanceMessage,
  generateReportMessage,
  generateStudentConcernMessage
} from '../../src/utils/whatsappUtils';

describe('whatsappUtils', () => {
  describe('createWhatsAppLink', () => {
    it('converts Indonesian local 08xx number to 628xx', () => {
      const link = createWhatsAppLink('081234567890', 'Halo');
      expect(link).toBe('https://wa.me/6281234567890?text=Halo');
    });

    it('removes non-digits and spaces properly', () => {
      const link = createWhatsAppLink('+62 812-3456-7890', 'Test Message');
      expect(link).toBe('https://wa.me/6281234567890?text=Test%20Message');
    });
  });

  describe('generateViolationMessage', () => {
    it('formats violation notification message properly with parent name', () => {
      const msg = generateViolationMessage(
        'Ahmad Fatih',
        {
          description: 'Terlambat masuk sekolah',
          points: 5,
          date: '2026-08-31',
          severity: 'ringan',
          context_notes: 'Terlambat 15 menit karena hujan',
          recorded_by_name: 'Ratna Setyaningrum'
        },
        'Budi Santoso'
      );

      expect(msg).toContain('Ahmad Fatih');
      expect(msg).toContain('Bapak/Ibu *Budi Santoso*');
      expect(msg).toContain('Terlambat masuk sekolah');
      expect(msg).toContain('+5 Poin (RINGAN)');
      expect(msg).toContain('Terlambat 15 menit karena hujan');
      expect(msg).toContain('Ratna Setyaningrum');
      expect(msg).toContain('Assalamu\'alaikum');
    });

    it('falls back gracefully when parent name or context notes are missing', () => {
      const msg = generateViolationMessage(
        'Siti Aisyah',
        {
          description: 'Tidak memakai atribut lengkap',
          points: 10,
          date: '2026-09-01',
        }
      );

      expect(msg).toContain('Siti Aisyah');
      expect(msg).toContain('Ayahanda/Bunda wali murid');
      expect(msg).toContain('+10 Poin');
      expect(msg).not.toContain('undefined');
    });
  });

  describe('generateBintangMonthlyMessage', () => {
    it('formats Bintang monthly report summary properly', () => {
      const msg = generateBintangMonthlyMessage(
        'Fathir Rizky',
        'Agustus 2026',
        {
          adab: 'A',
          kedisiplinan: 'B',
          kerapian: 'A',
          catatan: 'Ananda sangat santun dan rajin menolong teman.'
        },
        'Hasan'
      );

      expect(msg).toContain('Fathir Rizky');
      expect(msg).toContain('Agustus 2026');
      expect(msg).toContain('Adab: *A*');
      expect(msg).toContain('Kedisiplinan: *B*');
      expect(msg).toContain('Kerapian: *A*');
      expect(msg).toContain('Ananda sangat santun dan rajin menolong teman.');
    });
  });

  describe('generateReportMessage', () => {
    it('formats academic report message properly', () => {
      const msg = generateReportMessage('Ahmad Fatih', 88, '1 (Ganjil)');
      expect(msg).toContain('*Ahmad Fatih*');
      expect(msg).toContain('Rata-rata Nilai: *88*');
      expect(msg).toContain('Semester 1 (Ganjil)');
    });
  });

  describe('generateAttendanceMessage', () => {
    it('formats daily attendance status message properly', () => {
      const msg = generateAttendanceMessage('Ahmad Fatih', 'Hadir', '2026-09-11');
      expect(msg).toContain('*Ahmad Fatih*');
      expect(msg).toContain('tercatat *Hadir*');
      expect(msg).toContain('2026-09-11');
    });
  });

  describe('generateStudentConcernMessage', () => {
    it('formats concern notification with parent name and class name', () => {
      const msg = generateStudentConcernMessage('Ahmad Fatih', 4, 'Kelas 9A', 'Budi Santoso');
      expect(msg).toContain('*Ahmad Fatih*');
      expect(msg).toContain('Kelas 9A');
      expect(msg).toContain('Bapak/Ibu *Budi Santoso*');
      expect(msg).toContain('*4 catatan pelanggaran/pembinaan*');
      expect(msg).toContain('Assalamu\'alaikum');
    });

    it('handles fallback when parent name or class name are omitted', () => {
      const msg = generateStudentConcernMessage('Siti Aisyah', 3);
      expect(msg).toContain('*Siti Aisyah*');
      expect(msg).toContain('Ayahanda/Bunda wali murid');
      expect(msg).toContain('*3 catatan pelanggaran/pembinaan*');
    });
  });
});

