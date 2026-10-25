import { getExcelJS } from '../dynamicImports';
import { THIN_BORDER } from './exportConstants';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
} from '../../types/perangkatAjar';

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

