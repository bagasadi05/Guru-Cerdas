import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import type { PackageDocument } from '../../src/utils/perangkatAjarPackage';

vi.mock('../../src/utils/exportPerangkatAjar', () => ({
  exportProtaToWord: vi.fn(async ({ identity }) => new Blob([`prota ${identity.subject}`])),
  exportPromesToExcel: vi.fn(
    async ({ identity }) => new Blob([`promes ${identity.subject} ${identity.semesterNumber}`])
  ),
}));

import { buildPerangkatAjarPackage, toSafeFileName } from '../../src/utils/perangkatAjarPackage';

const doc = (subject: string, gradeLevel: string): PackageDocument =>
  ({
    identity: { subject, gradeLevel, academicYear: '2026/2027' },
    items: [],
    validation: {},
    weeks: [],
    cellsSem1: [],
    cellsSem2: [],
  }) as unknown as PackageDocument;

const readZip = (blob: Blob) => JSZip.loadAsync(blob);

describe('buildPerangkatAjarPackage', () => {
  it('puts a single document at the root of the ZIP', async () => {
    const zip = await readZip(await buildPerangkatAjarPackage([doc('Matematika', 'Kelas 4')]));

    expect(Object.keys(zip.files).sort()).toEqual([
      'Promes Semester 1.xlsx',
      'Promes Semester 2.xlsx',
      'Prota.docx',
    ]);
    expect(await zip.file('Promes Semester 2.xlsx')?.async('string')).toBe('promes Matematika 2');
  });

  it('gives every document its own folder, even with the same name', async () => {
    const zip = await readZip(
      await buildPerangkatAjarPackage([
        doc('Matematika', 'Kelas 4'),
        doc('IPAS', 'Kelas 5'),
        doc('Matematika', 'Kelas 4'),
      ])
    );

    const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
    expect(files).toContain('Matematika Kelas 4/Prota.docx');
    expect(files).toContain('IPAS Kelas 5/Promes Semester 1.xlsx');
    expect(files).toContain('Matematika Kelas 4 (2)/Prota.docx');
    expect(files).toHaveLength(9);
  });
});

describe('toSafeFileName', () => {
  it('removes characters Windows rejects in file names', () => {
    expect(toSafeFileName('Prota Promes PAI/BP Kelas 4: A?.zip')).toBe('Prota Promes PAI-BP Kelas 4- A-.zip');
    expect(toSafeFileName('   ')).toBe('Dokumen');
  });
});
