import { getExcelJS } from '../dynamicImports';
import { getMonthNames, THIN_BORDER } from './exportConstants';
import type {
  DocumentIdentity,
  ProtaItem,
  KaldikWeek,
  MatrixCell,
} from '../../types/perangkatAjar';

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

