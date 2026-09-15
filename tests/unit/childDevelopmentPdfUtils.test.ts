import { describe, expect, it } from 'vitest';
import {
  cleanTextForPDF,
  abbreviateSubject,
  getTableEndY,
} from '../../src/components/pages/student-detail/child-development/utils/childDevelopmentPdfUtils';

describe('childDevelopmentPdfUtils', () => {
  describe('cleanTextForPDF', () => {
    it('returns empty string for null, undefined, or empty input', () => {
      expect(cleanTextForPDF(null)).toBe('');
      expect(cleanTextForPDF(undefined)).toBe('');
      expect(cleanTextForPDF('')).toBe('');
    });

    it('strips markdown formatting and normalizes smart quotes / dashes', () => {
      const input = '**Siswa** memiliki nilai “sangat baik” – luar biasa…';
      const output = cleanTextForPDF(input);
      expect(output).toContain('Siswa');
      expect(output).not.toContain('**');
      expect(output).toContain('"sangat baik"');
      expect(output).toContain('-');
      expect(output).toContain('...');
    });

    it('preserves bullet characters and trims lines', () => {
      const input = '  • Poin 1  \n  • Poin 2  ';
      const output = cleanTextForPDF(input);
      expect(output).toBe('• Poin 1\n• Poin 2');
    });
  });

  describe('abbreviateSubject', () => {
    it('abbreviates known long subject names correctly', () => {
      expect(abbreviateSubject('Pendidikan Pancasila')).toBe('PPKn');
      expect(abbreviateSubject('Pendidikan Jasmani dan Olahraga')).toBe('PJOK');
      expect(abbreviateSubject('Bahasa Indonesia')).toBe('B. Indo');
      expect(abbreviateSubject('Bahasa Inggris')).toBe('B. Ingg');
      expect(abbreviateSubject('Bahasa Arab')).toBe('B. Arab');
      expect(abbreviateSubject('Matematika')).toBe('MTK');
      expect(abbreviateSubject('Ilmu Pengetahuan Alam')).toBe('IPA');
      expect(abbreviateSubject('Ilmu Pengetahuan Sosial')).toBe('IPS');
      expect(abbreviateSubject('Seni Budaya')).toBe('SBdP');
      expect(abbreviateSubject('Akidah Akhlak')).toBe('Akidah');
      expect(abbreviateSubject('Fiqih')).toBe('Fiqih');
      expect(abbreviateSubject('Sejarah Kebudayaan Islam')).toBe('SKI');
    });

    it('truncates unknown subjects longer than 12 characters', () => {
      expect(abbreviateSubject('Kewirausahaan Kreatif')).toBe('Kewirausah..');
    });

    it('returns short subjects unchanged', () => {
      expect(abbreviateSubject('Tahfidz')).toBe('Tahfidz');
    });
  });

  describe('getTableEndY', () => {
    it('returns finalY when present on doc', () => {
      const mockDoc = { lastAutoTable: { finalY: 145.5 } };
      expect(getTableEndY(mockDoc)).toBe(145.5);
    });

    it('returns 0 when lastAutoTable is missing or undefined', () => {
      expect(getTableEndY({})).toBe(0);
      expect(getTableEndY(null)).toBe(0);
    });
  });
});
