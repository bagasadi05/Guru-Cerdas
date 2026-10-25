import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  HeadingLevel,
  TableBorders,
  convertInchesToTwip,
} from 'docx';
import { packDocxToBlob } from './docxPacker';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
} from '../../types/perangkatAjar';

/**
 * Exports Program Tahunan (Prota) to an official Microsoft Word (.docx) document.
 */
export async function exportProtaToWord(data: {
  identity: DocumentIdentity;
  items: ProtaItem[];
  validation: ProtaValidationResult;
}): Promise<Blob> {
  const { identity, items, validation } = data;

  const tableHeaderCells = [
    new TableCell({
      children: [new Paragraph({ text: 'No', alignment: AlignmentType.CENTER })],
      width: { size: 600, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
    new TableCell({
      children: [new Paragraph({ text: 'Semester', alignment: AlignmentType.CENTER })],
      width: { size: 1400, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
    new TableCell({
      children: [
        new Paragraph({
          text: identity.curriculum === 'K13' ? 'KI / KD' : 'Elemen / Domain',
          alignment: AlignmentType.CENTER,
        }),
      ],
      width: { size: 2400, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
    new TableCell({
      children: [
        new Paragraph({
          text: identity.curriculum === 'K13' ? 'Kompetensi Dasar' : 'Tujuan Pembelajaran',
          alignment: AlignmentType.CENTER,
        }),
      ],
      width: { size: 3000, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
    new TableCell({
      children: [new Paragraph({ text: 'Materi Pokok', alignment: AlignmentType.CENTER })],
      width: { size: 2200, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
    new TableCell({
      children: [new Paragraph({ text: 'Alokasi (JP)', alignment: AlignmentType.CENTER })],
      width: { size: 1200, type: WidthType.DXA },
      shading: { fill: '1E40AF' },
    }),
  ];

  const sorted = [...items].sort((a, b) => {
    const semA = a.semesterNumber ?? 1;
    const semB = b.semesterNumber ?? 1;
    if (semA !== semB) return semA - semB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });

  const dataRows = sorted.map(
    (item, index) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: String(index + 1), alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: item.semesterNumber === 1 ? 'Sem 1 (Ganjil)' : 'Sem 2 (Genap)',
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [new Paragraph({ text: item.elementOrDomain || '-' })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: item.learningObjectiveCode
                  ? `${item.learningObjectiveCode}: ${item.learningObjectiveText}`
                  : item.learningObjectiveText,
              }),
            ],
          }),
          new TableCell({
            children: [new Paragraph({ text: item.coreTopic || '-' })],
          }),
          new TableCell({
            children: [
              new Paragraph({ text: String(item.targetJp ?? 0), alignment: AlignmentType.CENTER }),
            ],
          }),
        ],
      })
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'TOTAL ALOKASI WAKTU (JP)', alignment: AlignmentType.RIGHT })],
        columnSpan: 5,
        shading: { fill: 'F1F5F9' },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: String(validation.allocatedAnnualJp ?? 0),
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: 'F1F5F9' },
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        children: [
          // Kop Surat Kemenag & Madrasah
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (identity.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA').toUpperCase(),
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (identity.regionalOffice || 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN').toUpperCase(),
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            text: (identity.schoolName || 'MI AL IRSYAD KOTA MADIUN').toUpperCase(),
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: identity.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          // Title
          new Paragraph({
            text: 'PROGRAM TAHUNAN (PROTA)',
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `TAHUN AJARAN ${identity.academicYear}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          // Metadata
          new Paragraph({
            children: [
              new TextRun({ text: `Mata Pelajaran\t: ${identity.subject}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Kelas / Fase\t: ${identity.gradeLevel} ${identity.phase ? `(${identity.phase})` : ''}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Kurikulum\t: ${identity.curriculum === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'}` }),
            ],
          }),
          new Paragraph({ text: '' }),
          // Table
          new Table({
            rows: [new TableRow({ children: tableHeaderCells }), ...dataRows, totalRow],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          // Signatures Block
          new Table({
            borders: TableBorders.NONE,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ text: 'Mengetahui,' }),
                      new Paragraph({ text: identity.principalRole || 'Kepala Madrasah' }),
                      new Paragraph({ text: '\n\n\n' }),
                      new Paragraph({
                        children: [new TextRun({ text: identity.principalName || 'H. Masturi, S.Pd.I.', bold: true, underline: {} })],
                      }),
                      new Paragraph({ text: identity.principalNip && identity.principalNip !== '-' ? `NIP. ${identity.principalNip}` : 'NIP. -' }),
                    ],
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: `${identity.city || 'Madiun'}, ${identity.signatureDate || new Date().toLocaleDateString('id-ID')}`,
                      }),
                      new Paragraph({ text: identity.teacherRole || 'Guru Mata Pelajaran' }),
                      new Paragraph({ text: '\n\n\n' }),
                      new Paragraph({
                        children: [new TextRun({ text: identity.teacherName || 'Bagas Riyadi, S.Pd', bold: true, underline: {} })],
                      }),
                      new Paragraph({ text: identity.teacherNip && identity.teacherNip !== '-' ? `NIP. ${identity.teacherNip}` : 'NIP. -' }),
                    ],
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  return await packDocxToBlob(doc);
}
