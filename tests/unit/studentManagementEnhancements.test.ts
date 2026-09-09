import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';

describe('Student Management Enhancements (PRD Phase 1-3)', () => {
  describe('ID Card QR Code Generator', () => {
    it('generates a valid data URL containing student access code or id', async () => {
      const accessCode = 'GC-9821';
      const dataUrl = await QRCode.toDataURL(accessCode, { width: 120, margin: 1 });

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('generates a valid data URL for student NISN fallback', async () => {
      const nisn = '0089123456';
      const dataUrl = await QRCode.toDataURL(nisn, { width: 120, margin: 1 });

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });
  });

  describe('Student Search & Filter Logic', () => {
    const mockStudents = [
      {
        id: 's1',
        name: 'Ahmad Dahlan',
        access_code: 'ADM01',
        nis: '1001',
        nisn: '0012345678',
        parent_name: 'Haji Dahlan',
        parent_phone: '08123456789',
        gender: 'Laki-laki' as const,
      },
      {
        id: 's2',
        name: 'Siti Walidah',
        access_code: 'WLD02',
        nis: '1002',
        nisn: '0012345679',
        parent_name: 'Kyai Suja',
        parent_phone: '08987654321',
        gender: 'Perempuan' as const,
      },
    ];

    const filterStudents = (students: typeof mockStudents, term: string) => {
      const lower = term.toLowerCase();
      return students.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          (s.access_code && s.access_code.toLowerCase().includes(lower)) ||
          (s.nis && s.nis.toLowerCase().includes(lower)) ||
          (s.nisn && s.nisn.toLowerCase().includes(lower)) ||
          (s.parent_name && s.parent_name.toLowerCase().includes(lower))
      );
    };

    it('matches by student name', () => {
      const results = filterStudents(mockStudents, 'ahmad');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Ahmad Dahlan');
    });

    it('matches by student NIS', () => {
      const results = filterStudents(mockStudents, '1002');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Siti Walidah');
    });

    it('matches by student NISN', () => {
      const results = filterStudents(mockStudents, '0012345678');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Ahmad Dahlan');
    });

    it('matches by parent name', () => {
      const results = filterStudents(mockStudents, 'Suja');
      expect(results).toHaveLength(1);
      expect(results[0].parent_name).toBe('Kyai Suja');
    });

    it('matches by access code', () => {
      const results = filterStudents(mockStudents, 'WLD02');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Siti Walidah');
    });

    it('returns empty when no search criteria matches', () => {
      const results = filterStudents(mockStudents, 'Zulkifli');
      expect(results).toHaveLength(0);
    });
  });

  describe('Export Column Mapping', () => {
    it('correctly maps new identity and parent contact columns', () => {
      const student = {
        name: 'Budi Santoso',
        gender: 'Laki-laki',
        nis: '2024001',
        nisn: '008999888',
        birth_date: '2012-08-17',
        class_id: 'c1',
        parent_name: 'Bapak Santoso',
        parent_phone: '081234567890',
        access_code: 'BDI-77',
      };

      const columnMap: Record<string, string | number | null | undefined> = {
        name: student.name,
        gender: student.gender,
        nis: student.nis || '-',
        nisn: student.nisn || '-',
        birth_date: student.birth_date || '-',
        class_id: 'Kelas 5A',
        parent_name: student.parent_name || '-',
        parent_phone: student.parent_phone || '-',
        access_code: student.access_code || 'Belum Ada',
      };

      const selectedColumns = ['name', 'gender', 'nis', 'nisn', 'parent_name', 'parent_phone'];
      const exportedRow: Record<string, any> = { No: 1 };

      selectedColumns.forEach((col) => {
        const label =
          col === 'name' ? 'Nama Lengkap' :
          col === 'gender' ? 'Jenis Kelamin' :
          col === 'nis' ? 'NIS' :
          col === 'nisn' ? 'NISN' :
          col === 'parent_name' ? 'Nama Orang Tua' :
          col === 'parent_phone' ? 'No. WhatsApp Orang Tua' : col;

        if (columnMap[col] !== undefined) {
          exportedRow[label] = columnMap[col];
        }
      });

      expect(exportedRow['Nama Lengkap']).toBe('Budi Santoso');
      expect(exportedRow['NIS']).toBe('2024001');
      expect(exportedRow['NISN']).toBe('008999888');
      expect(exportedRow['Nama Orang Tua']).toBe('Bapak Santoso');
      expect(exportedRow['No. WhatsApp Orang Tua']).toBe('081234567890');
    });
  });
});
