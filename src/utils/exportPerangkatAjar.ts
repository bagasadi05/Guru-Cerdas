/**
 * @fileoverview Official Kemendikbudristek Exporter for Program Tahunan (Prota)
 * and Program Semester (Promes).
 *
 * Implements Milestone M4 requirements:
 * - 2-Column formal identity metadata (School, Subject, Class/Phase, Teacher & Principal)
 * - Official Kop Surat & standard bordered tables
 * - Microsoft Excel (.xlsx) export via ExcelJS with merged month headers & formula styling
 * - Microsoft Word (.docx) export via docx with Kemendikbudristek formal layouts
 * - Browser A4 print styling utilities
 *
 * @module utils/exportPerangkatAjar
 */

import type {
  DocumentIdentity,
  KaldikWeek,
  MatrixCell,
  ProtaItem,
  ProtaValidationResult,
} from '../types/perangkatAjar';
import { getExcelJS } from './dynamicImports';
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
  Packer,
  PageOrientation,
  TableLayoutType,
  TableBorders,
  VerticalAlign,
  convertInchesToTwip,
} from 'docx';
import { getLockedWeekSlots } from './promesEngine';

export type { DocumentIdentity };

const SEMESTER_1_MONTH_NAMES = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const SEMESTER_2_MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

function getMonthNames(semester: number): string[] {
  return semester === 2 ? SEMESTER_2_MONTH_NAMES : SEMESTER_1_MONTH_NAMES;
}

// =============================================================================
// 1. EXCEL EXPORT (PROTA & PROMES)
// =============================================================================

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
} as const;

/**
 * Exports Program Tahunan (Prota) to a styled Microsoft Excel (.xlsx) spreadsheet.
 */
export async function exportProtaToExcel(data: {
  identity: DocumentIdentity;
  items: ProtaItem[];
  validation: ProtaValidationResult;
}): Promise<Blob> {
  const { identity, items, validation } = data;
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal Guru Cerdas';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Program Tahunan', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  // 1. Header & Kop Surat (Kemenag & Madrasah)
  worksheet.mergeCells('A1:F1');
  const titleRow1 = worksheet.getCell('A1');
  titleRow1.value = `${(identity.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA').toUpperCase()} — ${(identity.schoolName || 'MI AL IRSYAD KOTA MADIUN').toUpperCase()}`;
  titleRow1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:F2');
  const titleRow2 = worksheet.getCell('A2');
  titleRow2.value = identity.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun';
  titleRow2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A4:F4');
  const docTitle = worksheet.getCell('A4');
  docTitle.value = 'PROGRAM TAHUNAN (PROTA)';
  docTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  docTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A5:F5');
  const docYear = worksheet.getCell('A5');
  docYear.value = `TAHUN AJARAN ${identity.academicYear}`;
  docYear.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  docYear.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Identity Block (2 columns)
  const metaRows = [
    ['Mata Pelajaran', `: ${identity.subject}`, '', 'Kelas / Fase', `: ${identity.gradeLevel} ${identity.phase ? `(${identity.phase})` : ''}`],
    ['Kurikulum', `: ${identity.curriculum === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'}`, '', 'Tahun Ajaran', `: ${identity.academicYear}`],
  ];

  metaRows.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.getCell(1).value = row[0];
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(2).value = row[1];
    r.getCell(2).font = { name: 'Calibri', size: 10 };
    r.getCell(4).value = row[3];
    r.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(5).value = row[4];
    r.getCell(5).font = { name: 'Calibri', size: 10 };
  });

  // 3. Table Column Headers
  const headerRowIdx = 10;
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.values = [
    'No',
    'Semester',
    identity.curriculum === 'K13' ? 'Kompetensi Inti / Dasar' : 'Elemen / Domain',
    identity.curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Tujuan Pembelajaran (TP)',
    'Materi Pokok / Lingkup Materi',
    'Alokasi Waktu (JP)',
  ];

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Dark Blue #1E40AF
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 26;

  worksheet.columns = [
    { key: 'no', width: 6 },
    { key: 'sem', width: 14 },
    { key: 'elem', width: 26 },
    { key: 'tp', width: 42 },
    { key: 'materi', width: 32 },
    { key: 'jp', width: 18 },
  ];

  // 4. Data Rows
  let currentRowIdx = 11;
  const sortedItems = [...items].sort((a, b) => {
    const semA = a.semesterNumber ?? 1;
    const semB = b.semesterNumber ?? 1;
    if (semA !== semB) return semA - semB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });

  sortedItems.forEach((item, index) => {
    const row = worksheet.getRow(currentRowIdx);
    row.values = [
      index + 1,
      item.semesterNumber === 1 ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)',
      item.elementOrDomain || '-',
      item.learningObjectiveCode
        ? `${item.learningObjectiveCode} - ${item.learningObjectiveText}`
        : item.learningObjectiveText,
      item.coreTopic || '-',
      item.targetJp ?? 0,
    ];

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = THIN_BORDER;
      if (colNumber === 1 || colNumber === 2 || colNumber === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
    row.height = 24;
    currentRowIdx++;
  });

  // 5. Total Row
  const totalRow = worksheet.getRow(currentRowIdx);
  worksheet.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TOTAL ALOKASI WAKTU (JP)';
  totalLabel.font = { name: 'Calibri', size: 10, bold: true };
  totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalValue = totalRow.getCell(6);
  totalValue.value = validation.allocatedAnnualJp ?? 0;
  totalValue.font = { name: 'Calibri', size: 10, bold: true };
  totalValue.alignment = { horizontal: 'center', vertical: 'middle' };

  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = THIN_BORDER;
  });
  totalRow.height = 24;
  currentRowIdx += 3;

  // 6. Signature Block
  const sigRowStart = currentRowIdx;
  const sigCityDate = `${identity.city || 'Madiun'}, ${identity.signatureDate || new Date().toLocaleDateString('id-ID')}`;

  worksheet.getCell(`B${sigRowStart}`).value = 'Mengetahui,';
  worksheet.getCell(`E${sigRowStart}`).value = sigCityDate;

  worksheet.getCell(`B${sigRowStart + 1}`).value = identity.principalRole || 'Kepala Madrasah';
  worksheet.getCell(`E${sigRowStart + 1}`).value = identity.teacherRole || 'Guru Mata Pelajaran';

  worksheet.getCell(`B${sigRowStart + 5}`).value = identity.principalName || 'H. Masturi, S.Pd.I.';
  worksheet.getCell(`B${sigRowStart + 5}`).font = { bold: true, underline: true };
  worksheet.getCell(`B${sigRowStart + 6}`).value = identity.principalNip && identity.principalNip !== '-' ? `NIP. ${identity.principalNip}` : 'NIP. -';

  worksheet.getCell(`E${sigRowStart + 5}`).value = identity.teacherName || 'Bagas Riyadi, S.Pd';
  worksheet.getCell(`E${sigRowStart + 5}`).font = { bold: true, underline: true };
  worksheet.getCell(`E${sigRowStart + 6}`).value = identity.teacherNip && identity.teacherNip !== '-' ? `NIP. ${identity.teacherNip}` : 'NIP. -';

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Exports Program Semester (Promes) to a styled Microsoft Excel (.xlsx) spreadsheet
 * with merged 2-tier month/week headers and locked calendar slots.
 */
export async function exportPromesToExcel(data: {
  identity: DocumentIdentity;
  items: ProtaItem[];
  weeks: KaldikWeek[];
  cells: MatrixCell[];
}): Promise<Blob> {
  const { identity, items, cells } = data;
  const semester = identity.semesterNumber === 2 ? 2 : 1;
  const monthNames = getMonthNames(semester);

  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal Guru Cerdas';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Promes Semester ${semester}`, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  // 1. Kop Surat & Title (Kemenag & Madrasah)
  worksheet.mergeCells('A1:AI1');
  const title1 = worksheet.getCell('A1');
  title1.value = `${(identity.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA').toUpperCase()} — ${(identity.schoolName || 'MI AL IRSYAD KOTA MADIUN').toUpperCase()}`;
  title1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:AI2');
  const title2 = worksheet.getCell('A2');
  title2.value = identity.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun';
  title2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A4:AI4');
  const mainTitle = worksheet.getCell('A4');
  mainTitle.value = `PROGRAM SEMESTER (PROMES) - SEMESTER ${semester === 1 ? '1 (GANJIL)' : '2 (GENAP)'}`;
  mainTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A5:AI5');
  const subTitle = worksheet.getCell('A5');
  subTitle.value = `TAHUN AJARAN ${identity.academicYear}`;
  subTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  subTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Identity Metadata
  const meta = [
    ['Mata Pelajaran', `: ${identity.subject}`, 'Kelas / Fase', `: ${identity.gradeLevel} ${identity.phase ? `(${identity.phase})` : ''}`],
    ['Semester', `: ${semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}`, 'Tahun Ajaran', `: ${identity.academicYear}`],
  ];

  meta.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.getCell(1).value = row[0];
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(2).value = row[1];
    r.getCell(2).font = { name: 'Calibri', size: 10 };
    r.getCell(5).value = row[2];
    r.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(6).value = row[3];
    r.getCell(6).font = { name: 'Calibri', size: 10 };
  });

  // 3. Two-Tier Matrix Header (Row 10 and Row 11)
  // Column layout:
  // Col 1: No
  // Col 2: Elemen
  // Col 3: Tujuan Pembelajaran
  // Col 4: Materi Pokok
  // Col 5: Target JP
  // Col 6..35: 6 Months × 5 Weeks (30 week columns)
  const row10 = worksheet.getRow(10);
  const row11 = worksheet.getRow(11);

  // Set merged headers for fixed columns
  worksheet.mergeCells('A10:A11');
  worksheet.getCell('A10').value = 'No';
  worksheet.mergeCells('B10:B11');
  worksheet.getCell('B10').value = identity.curriculum === 'K13' ? 'KI / KD' : 'Elemen';
  worksheet.mergeCells('C10:C11');
  worksheet.getCell('C10').value = identity.curriculum === 'K13' ? 'Kompetensi Dasar' : 'Tujuan Pembelajaran';
  worksheet.mergeCells('D10:D11');
  worksheet.getCell('D10').value = 'Materi Pokok';
  worksheet.mergeCells('E10:E11');
  worksheet.getCell('E10').value = 'Jml JP';

  // Month and week header columns
  for (let mIdx = 0; mIdx < 6; mIdx++) {
    const startCol = 6 + mIdx * 5;
    const endCol = startCol + 4;
    worksheet.mergeCells(10, startCol, 10, endCol);
    const monthCell = worksheet.getCell(10, startCol);
    monthCell.value = monthNames[mIdx];
    monthCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    monthCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let w = 1; w <= 5; w++) {
      const colNum = startCol + (w - 1);
      const weekCell = worksheet.getCell(11, colNum);
      weekCell.value = w;
      weekCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      weekCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // Style header cells
  for (let r = 10; r <= 11; r++) {
    const curRow = worksheet.getRow(r);
    for (let c = 1; c <= 35; c++) {
      const cell = curRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' }, // Teal #0D9488
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  }
  row10.height = 20;
  row11.height = 18;

  // Set column widths
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 16;
  worksheet.getColumn(3).width = 30;
  worksheet.getColumn(4).width = 22;
  worksheet.getColumn(5).width = 8;
  for (let c = 6; c <= 35; c++) {
    worksheet.getColumn(c).width = 4.2;
  }

  // 4. Data Rows
  let dataRowIdx = 12;
  const filteredItems = items.filter((it) => (it.semesterNumber ?? 1) === semester);

  filteredItems.forEach((item, index) => {
    const row = worksheet.getRow(dataRowIdx);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.elementOrDomain || '-';
    row.getCell(3).value = item.learningObjectiveCode
      ? `${item.learningObjectiveCode} - ${item.learningObjectiveText}`
      : item.learningObjectiveText;
    row.getCell(4).value = item.coreTopic || '-';
    row.getCell(5).value = item.targetJp ?? 0;

    // Fill the 30 week columns
    for (let mIdx = 0; mIdx < 6; mIdx++) {
      for (let w = 1; w <= 5; w++) {
        const colNum = 6 + mIdx * 5 + (w - 1);
        const cell = row.getCell(colNum);
        const matched = cells.find(
          (c) => c.rowId === item.id && c.monthIndex === mIdx && c.weekNumber === w
        );

        if (matched?.isLocked) {
          cell.value = '';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E8F0' }, // Slate 200 for locked weeks
          };
        } else if (matched && matched.allocatedJp > 0) {
          cell.value = matched.allocatedJp;
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F766E' } };
        } else {
          cell.value = '';
        }
      }
    }

    // Apply borders and alignments
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = THIN_BORDER;
      if (colNumber === 1 || colNumber === 5 || colNumber >= 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
    row.height = 22;
    dataRowIdx++;
  });

  // 5. Total Weekly Sums Row
  const totalRow = worksheet.getRow(dataRowIdx);
  worksheet.mergeCells(`A${dataRowIdx}:D${dataRowIdx}`);
  totalRow.getCell(1).value = 'JUMLAH ALOKASI JP MINGGUAN';
  totalRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  // Total Target JP column
  const totalTarget = filteredItems.reduce((acc, it) => acc + (it.targetJp ?? 0), 0);
  totalRow.getCell(5).value = totalTarget;
  totalRow.getCell(5).font = { name: 'Calibri', size: 9, bold: true };
  totalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  for (let mIdx = 0; mIdx < 6; mIdx++) {
    for (let w = 1; w <= 5; w++) {
      const colNum = 6 + mIdx * 5 + (w - 1);
      const colCell = totalRow.getCell(colNum);
      const colSum = cells
        .filter((c) => c.monthIndex === mIdx && c.weekNumber === w)
        .reduce((sum, c) => sum + (c.allocatedJp || 0), 0);

      colCell.value = colSum > 0 ? colSum : '';
      colCell.font = { name: 'Calibri', size: 9, bold: true };
      colCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = THIN_BORDER;
  });
  totalRow.height = 22;
  dataRowIdx += 3;

  // 6. Signatures
  const sigRow = dataRowIdx;
  const dateStr = `${identity.city || 'Madiun'}, ${identity.signatureDate || new Date().toLocaleDateString('id-ID')}`;

  worksheet.getCell(`B${sigRow}`).value = 'Mengetahui,';
  worksheet.getCell(`AC${sigRow}`).value = dateStr;

  worksheet.getCell(`B${sigRow + 1}`).value = identity.principalRole || 'Kepala Madrasah';
  worksheet.getCell(`AC${sigRow + 1}`).value = identity.teacherRole || 'Guru Mata Pelajaran';

  worksheet.getCell(`B${sigRow + 5}`).value = identity.principalName || 'H. Masturi, S.Pd.I.';
  worksheet.getCell(`B${sigRow + 5}`).font = { bold: true, underline: true };
  worksheet.getCell(`B${sigRow + 6}`).value = identity.principalNip && identity.principalNip !== '-' ? `NIP. ${identity.principalNip}` : 'NIP. -';

  worksheet.getCell(`AC${sigRow + 5}`).value = identity.teacherName || 'Bagas Riyadi, S.Pd';
  worksheet.getCell(`AC${sigRow + 5}`).font = { bold: true, underline: true };
  worksheet.getCell(`AC${sigRow + 6}`).value = identity.teacherNip && identity.teacherNip !== '-' ? `NIP. ${identity.teacherNip}` : 'NIP. -';

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// =============================================================================
// 2. WORD EXPORT (.DOCX) - KEMENDIKBUDRISTEK FORMAL FORMAT
// =============================================================================

/**
 * Safely packs a docx Document into a Blob across browser and Node.js environments.
 * In browser environments, Packer.toBlob() must be used (Packer.toBuffer throws 'nodebuffer is not supported').
 * In Node.js / Vitest environments, falls back to Packer.toBuffer() if Blob stream is not native.
 */
async function packDocxToBlob(doc: Document): Promise<Blob> {
  if (typeof window !== 'undefined') {
    return await Packer.toBlob(doc);
  }
  try {
    return await Packer.toBlob(doc);
  } catch {
    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
}

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
