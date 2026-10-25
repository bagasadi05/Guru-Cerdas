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
  PageOrientation,
  TableLayoutType,
  TableBorders,
  VerticalAlign,
  convertInchesToTwip,
} from 'docx';
import { getMonthNames } from './exportConstants';
import { getLockedWeekSlots } from '../promesEngine';
import { packDocxToBlob } from './docxPacker';
import type {
  DocumentIdentity,
  ProtaItem,
  KaldikWeek,
  MatrixCell,
} from '../../types/perangkatAjar';

/**
 * Exports Program Semester (Promes) to an official Microsoft Word (.docx) document (Landscape A4).
 */
export async function exportPromesToWord(data: {
  identity: DocumentIdentity;
  items: ProtaItem[];
  weeks: KaldikWeek[];
  cells: MatrixCell[];
}): Promise<Blob> {
  const { identity, items, weeks, cells } = data;
  const semester = identity.semesterNumber === 2 ? 2 : 1;
  const monthNames = getMonthNames(semester);

  const filteredItems = items
    .filter((it) => (it.semesterNumber ?? 1) === semester)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const lockedSlots = getLockedWeekSlots(weeks, semester);
  const isLocked = (monthIndex: number, week: number) => lockedSlots.has(`${monthIndex}-${week}`);
  const jpAt = (rowId: string, monthIndex: number, week: number) =>
    isLocked(monthIndex, week)
      ? 0
      : cells
          .filter((c) => c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === week)
          .reduce((sum, c) => sum + (c.allocatedJp || 0), 0);

  // Landscape A4 minus 0.5" margins leaves ~15,100 twips: 3 fixed columns + 30 week columns.
  const NO_WIDTH = 420;
  const TP_WIDTH = 3300;
  const JP_WIDTH = 520;
  const WEEK_WIDTH = 360;
  const columnWidths = [NO_WIDTH, TP_WIDTH, JP_WIDTH, ...Array.from({ length: 30 }, () => WEEK_WIDTH)];
  const HEADER_FILL = '0D9488';
  const LOCKED_FILL = 'CBD5E1';
  const SMALL = 14; // 7 pt
  const BODY = 16; // 8 pt

  const text = (value: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
    new Paragraph({
      alignment: opts.align ?? AlignmentType.CENTER,
      children: [new TextRun({ text: value, bold: opts.bold, size: opts.size ?? SMALL, color: opts.color })],
    });

  const headerCell = (value: string, width: number, extra: { rowSpan?: number; columnSpan?: number } = {}) =>
    new TableCell({
      children: [text(value, { bold: true, size: BODY, color: 'FFFFFF' })],
      width: { size: width, type: WidthType.DXA },
      shading: { fill: HEADER_FILL },
      verticalAlign: VerticalAlign.CENTER,
      ...extra,
    });

  const monthHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('No', NO_WIDTH, { rowSpan: 2 }),
      headerCell(identity.curriculum === 'K13' ? 'Kompetensi Dasar / Materi Pokok' : 'Tujuan Pembelajaran / Materi', TP_WIDTH, { rowSpan: 2 }),
      headerCell('JP', JP_WIDTH, { rowSpan: 2 }),
      ...monthNames.map((name) => headerCell(name, WEEK_WIDTH * 5, { columnSpan: 5 })),
    ],
  });

  const weekHeaderRow = new TableRow({
    tableHeader: true,
    children: monthNames.flatMap((_, monthIndex) =>
      [1, 2, 3, 4, 5].map(
        (week) =>
          new TableCell({
            children: [text(String(week), { bold: true })],
            width: { size: WEEK_WIDTH, type: WidthType.DXA },
            shading: { fill: isLocked(monthIndex, week) ? LOCKED_FILL : 'CCFBF1' },
          })
      )
    ),
  });

  const weekCells = (valueAt: (monthIndex: number, week: number) => number, bold = false) =>
    monthNames.flatMap((_, monthIndex) =>
      [1, 2, 3, 4, 5].map((week) => {
        const locked = isLocked(monthIndex, week);
        const value = valueAt(monthIndex, week);
        return new TableCell({
          children: [text(!locked && value > 0 ? String(value) : '', { bold })],
          width: { size: WEEK_WIDTH, type: WidthType.DXA },
          shading: locked ? { fill: LOCKED_FILL } : undefined,
          verticalAlign: VerticalAlign.CENTER,
        });
      })
    );

  const rows = filteredItems.map(
    (item, index) =>
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children: [text(String(index + 1), { size: BODY })],
            width: { size: NO_WIDTH, type: WidthType.DXA },
          }),
          new TableCell({
            width: { size: TP_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.learningObjectiveCode ? `${item.learningObjectiveCode}: ` : '',
                    bold: true,
                    size: BODY,
                  }),
                  new TextRun({ text: item.learningObjectiveText || '-', size: BODY }),
                ],
              }),
              ...(item.coreTopic
                ? [new Paragraph({ children: [new TextRun({ text: item.coreTopic, italics: true, size: SMALL, color: '475569' })] })]
                : []),
            ],
          }),
          new TableCell({
            children: [text(String(item.targetJp ?? 0), { bold: true, size: BODY })],
            width: { size: JP_WIDTH, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
          }),
          ...weekCells((monthIndex, week) => jpAt(item.id, monthIndex, week)),
        ],
      })
  );

  const totalRow = new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        children: [text('JUMLAH JP PER PEKAN', { bold: true, size: SMALL, align: AlignmentType.RIGHT })],
        columnSpan: 2,
        shading: { fill: 'F1F5F9' },
      }),
      new TableCell({
        children: [
          text(String(filteredItems.reduce((sum, it) => sum + (it.targetJp ?? 0), 0)), { bold: true, size: BODY }),
        ],
        shading: { fill: 'F1F5F9' },
      }),
      ...weekCells(
        (monthIndex, week) => filteredItems.reduce((sum, it) => sum + jpAt(it.id, monthIndex, week), 0),
        true
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.5),
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
          new Paragraph({
            text: `PROGRAM SEMESTER (PROMES) - SEMESTER ${semester === 1 ? '1 (GANJIL)' : '2 (GENAP)'} TAHUN AJARAN ${identity.academicYear}`,
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran\t: ${identity.subject}` })] }),
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
          new Table({
            rows: [monthHeaderRow, weekHeaderRow, ...rows, totalRow],
            columnWidths,
            layout: TableLayoutType.FIXED,
            width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Kolom berarsir: pekan tidak efektif menurut Kalender Pendidikan.', italics: true, size: SMALL }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          // Signature Block
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

