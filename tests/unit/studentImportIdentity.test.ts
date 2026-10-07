import { describe, expect, it } from 'vitest';
import { autoDetectMappings, parseAndValidate } from '../../src/services/ImportService';

describe('student identity import', () => {
  it('keeps student identity, access code, birth date and class in separate fields', () => {
    const headers = ['Nama Lengkap', 'Jenis Kelamin', 'NIS', 'NISN', 'Tanggal Lahir', 'Nama Kelas', 'Kode Akses', 'No HP Orang Tua'];
    const rows = [['Siswa Contoh', 'L', '000123', '0081234567', '2014-08-17', 'Kelas A', 'ABCDEF', '081234567890']];
    const [row] = parseAndValidate(headers, rows, autoDetectMappings(headers));
    expect(row.isValid).toBe(true);
    expect(row.data).toEqual({
      name: 'Siswa Contoh', gender: 'Laki-laki', nis: '000123', nisn: '0081234567',
      birth_date: '2014-08-17', class_name: 'Kelas A', access_code: 'ABCDEF', parent_phone: '081234567890',
    });
  });

  it.each(['17/08/2014', '17-08-2014', new Date('2014-08-17T00:00:00Z')])('normalizes the birth date %s with manual column mappings', (birthDate) => {
    const [row] = parseAndValidate(['Student', 'Sex', 'Birthday'], [['Siswa Contoh', 'P', birthDate]], [
      { sourceColumn: 'Student', targetField: 'name', required: true },
      { sourceColumn: 'Sex', targetField: 'gender', required: true },
      { sourceColumn: 'Birthday', targetField: 'birth_date', required: false },
    ]);
    expect(row.isValid).toBe(true);
    expect(row.data.birth_date).toBe('2014-08-17');
    expect(row.data.gender).toBe('Perempuan');
  });

  it('rejects invalid dates and unmapped required fields', () => {
    const [invalidDate] = parseAndValidate(['Nama Siswa', 'Jenis Kelamin', 'Tanggal Lahir'],
      [['Siswa Contoh', 'L', '31/02/2014']], autoDetectMappings(['Nama Siswa', 'Jenis Kelamin', 'Tanggal Lahir']));
    expect(invalidDate.isValid).toBe(false);
    expect(invalidDate.errors[0].message).toContain('Tanggal lahir tidak valid');
    const [missingGender] = parseAndValidate(['Nama Siswa'], [['Siswa Contoh']], autoDetectMappings(['Nama Siswa']));
    expect(missingGender.isValid).toBe(false);
    expect(missingGender.errors[0].message).toContain('Jenis Kelamin wajib dipetakan');
  });
});
