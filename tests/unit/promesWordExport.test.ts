import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { exportPromesToWord, exportProtaToWord } from '../../src/utils/exportPerangkatAjar';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';
import type { DocumentIdentity, MatrixCell, ProtaItem } from '../../src/types/perangkatAjar';

const identity: DocumentIdentity = {
  schoolName: 'MI AL IRSYAD KOTA MADIUN',
  schoolAddress: 'Jl. Diponegoro',
  subject: 'Matematika',
  gradeLevel: 'Kelas 4',
  phase: 'Fase B',
  curriculum: 'MERDEKA',
  academicYear: '2026/2027',
  semesterNumber: 1,
  principalName: 'Kepala',
  principalNip: '-',
  teacherName: 'Guru',
  teacherNip: '-',
  city: 'Madiun',
  signatureDate: '5 Oktober 2026',
};

const items: ProtaItem[] = [
  {
    id: 'a',
    semesterNumber: 1,
    elementOrDomain: 'Bilangan',
    learningObjectiveCode: 'TP 4.1',
    learningObjectiveText: 'Membaca bilangan cacah',
    coreTopic: 'Bab 1',
    targetJp: 8,
    orderIndex: 0,
  },
];

const readDocumentXml = async (blob: Blob) => {
  const zip = await JSZip.loadAsync(blob);
  return zip.file('word/document.xml')!.async('string');
};

describe('exportPromesToWord', () => {
  const weeks = getDefaultNationalKaldik('2026/2027');

  it('prints the identity block and the weekly hours of each materi', async () => {
    const cells: MatrixCell[] = [
      { rowId: 'a', monthIndex: 0, weekNumber: 4, allocatedJp: 3, isLocked: false }, // Juli W4 (KBM)
      { rowId: 'a', monthIndex: 0, weekNumber: 5, allocatedJp: 5, isLocked: false }, // Juli W5 (KBM)
    ];
    const xml = await readDocumentXml(await exportPromesToWord({ identity, items, weeks, cells }));

    expect(xml).toContain('Mata Pelajaran\t: Matematika');
    expect(xml).toContain('Kelas 4 (Fase B)');
    expect(xml).toContain('Juli');
    expect(xml).toContain('Desember');
    expect(xml).toContain('JUMLAH JP PER PEKAN');
    expect(xml).toMatch(/<w:t[^>]*>3<\/w:t>/);
    expect(xml).toMatch(/<w:t[^>]*>5<\/w:t>/);
    // 3 fixed columns + 30 weeks in the matrix, 2 in the signature table.
    expect(xml.match(/<w:gridCol /g)).toHaveLength(35);
  });

  it('does not print hours placed in a non-effective week', async () => {
    const cells: MatrixCell[] = [
      { rowId: 'a', monthIndex: 0, weekNumber: 1, allocatedJp: 7, isLocked: false }, // Juli W1 = libur
    ];
    const xml = await readDocumentXml(await exportPromesToWord({ identity, items, weeks, cells }));
    expect(xml).not.toMatch(/<w:t[^>]*>7<\/w:t>/);
  });

  it('only lists the materi of the requested semester', async () => {
    const xml = await readDocumentXml(
      await exportPromesToWord({
        identity: { ...identity, semesterNumber: 2 },
        items,
        weeks,
        cells: [],
      })
    );
    expect(xml).toContain('Januari');
    expect(xml).not.toContain('Membaca bilangan cacah');
  });
});

describe('signature block', () => {
  it('has no table outline in Prota or Promes', async () => {
    const validation = { allocatedAnnualJp: 8 } as Parameters<typeof exportProtaToWord>[0]['validation'];
    for (const blob of [
      await exportProtaToWord({ identity, items, validation }),
      await exportPromesToWord({ identity, items, weeks: getDefaultNationalKaldik('2026/2027'), cells: [] }),
    ]) {
      const xml = await readDocumentXml(blob);
      const signatureTable = xml.slice(xml.lastIndexOf('<w:tbl>'));
      expect(signatureTable).toContain('Mengetahui,');
      expect(signatureTable).toMatch(/<w:tblBorders>.*<w:top w:val="none"/s);
    }
  });
});
