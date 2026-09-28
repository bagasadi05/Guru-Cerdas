/**
 * Programmatic PDF Export for Program Semester (Promes)
 *
 * Uses jsPDF + jspdf-autotable to produce a crisp, vector-text PDF
 * with the complete 30-week distribution matrix in A4 Landscape.
 *
 * @module utils/promesPdfExport
 */

import { getJsPDF, getAutoTable } from './dynamicImports';
import { addOfficialMadrasahKop, ensureLogosLoaded } from './pdfHeaderUtils';
import type {
  DocumentIdentity,
  ProtaItem,
  KaldikWeek,
  MatrixCell,
} from '../types/perangkatAjar';

export interface ExportPromesPdfOptions {
  identity: DocumentIdentity;
  semesterNumber: 1 | 2;
  items: ProtaItem[];
  kaldikWeeks: KaldikWeek[];
  cells: MatrixCell[];
}

const MONTH_NAMES_SEM_1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_NAMES_SEM_2 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

/**
 * Generate and download a professional Promes PDF document (A4 Landscape).
 */
export async function exportPromesToPdf({
  identity,
  semesterNumber,
  items,
  kaldikWeeks,
  cells,
}: ExportPromesPdfOptions): Promise<void> {
  // Preload logos and libraries
  await ensureLogosLoaded();
  const { default: jsPDF } = await getJsPDF();
  const { default: autoTable } = await getAutoTable();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();   // 297
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();  // 210
  const MARGIN = 12.5;

  // ── 1. Official Kop Surat Kementerian Agama & Madrasah ──
  const kopBottomY = addOfficialMadrasahKop(doc, {
    ministryName: identity.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    regionalOffice: identity.regionalOffice || 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
    schoolName: identity.schoolName || 'MADRASAH IBTIDAIYAH AL IRSYAD KOTA MADIUN',
    schoolAddress: identity.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
    schoolContact: [
      identity.schoolPhone ? `Telp: ${identity.schoolPhone}` : 'Telp: (0351) 463765',
      identity.schoolEmail ? `Email: ${identity.schoolEmail}` : 'Email: mialirsyadkotamadiun@gmail.com',
      identity.schoolWebsite ? `Website: ${identity.schoolWebsite}` : 'Website: mialirsyadkotamadiun.sch.id',
    ].filter(Boolean).join(' | '),
    orientation: 'landscape',
    margin: MARGIN,
    showLogos: identity.showLogos ?? true,
  });

  // ── 2. Document Title (Safe buffer below Kop Surat double line) ──
  let y = kopBottomY + 6.5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const titleText = `PROGRAM SEMESTER (PROMES) — SEMESTER ${semesterNumber === 1 ? '1 (GANJIL)' : '2 (GENAP)'}`;
  doc.text(titleText, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`TAHUN AJARAN ${identity.academicYear}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4.5;

  // ── 3. Identity Metadata ──
  const leftCol = [
    ['Satuan Pendidikan', identity.schoolName || 'MI AL IRSYAD KOTA MADIUN'],
    ['Mata Pelajaran', identity.subject],
    ['Kelas / Fase', `${identity.gradeLevel}${identity.phase ? ` (${identity.phase})` : ''}`],
  ];
  const rightCol = [
    ['Kurikulum', identity.curriculum === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'],
    ['Tahun Ajaran', identity.academicYear],
    ['Semester', `${semesterNumber === 1 ? '1 (Ganjil)' : '2 (Genap)'}`],
  ];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const metaStartY = y + 1;
  leftCol.forEach(([label, value], i) => {
    const rowY = metaStartY + i * 3.8;
    doc.setFont('helvetica', 'normal');
    doc.text(`${label}`, MARGIN, rowY);
    doc.text(': ', MARGIN + 35, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text(value, MARGIN + 38, rowY);
  });

  const rightX = PAGE_WIDTH / 2 + 15;
  rightCol.forEach(([label, value], i) => {
    const rowY = metaStartY + i * 3.8;
    doc.setFont('helvetica', 'normal');
    doc.text(`${label}`, rightX, rowY);
    doc.text(': ', rightX + 28, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text(value, rightX + 31, rowY);
  });

  y = metaStartY + leftCol.length * 3.8 + 2;

  // ── 4. Promes 30-Week Matrix Table ──
  const monthNames = semesterNumber === 1 ? MONTH_NAMES_SEM_1 : MONTH_NAMES_SEM_2;
  const currentPromesItems = items
    .filter((i) => i.semesterNumber === semesterNumber)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const totalPromesTargetJp = currentPromesItems.reduce((acc, it) => acc + (it.targetJp || 0), 0);

  // Column styles: fixed proportional widths for 35 columns
  // Brings TP & Materi Pokok close together (56mm & 34mm) without excess whitespace
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 7 },   // No
    1: { cellWidth: 26 },  // Elemen
    2: { cellWidth: 56 },  // TP (compact, directly adjacent to Materi Pokok)
    3: { cellWidth: 34 },  // Materi Pokok
    4: { cellWidth: 8 },   // JP
  };
  // 30 week columns: 4.7mm each (30 * 4.7 = 141mm) — gives calendar grid room and balance
  for (let c = 5; c < 35; c++) {
    columnStyles[c] = { cellWidth: 4.7, halign: 'center' };
  }

  // Tier 1 Header
  const headRow1: any[] = [
    { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: identity.curriculum === 'K13' ? 'KI / KD' : 'Elemen', rowSpan: 2, styles: { valign: 'middle' } },
    { content: 'Tujuan Pembelajaran (TP)', rowSpan: 2, styles: { valign: 'middle' } },
    { content: 'Materi Pokok', rowSpan: 2, styles: { valign: 'middle' } },
    { content: 'JP', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    ...monthNames.map((monthName) => ({
      content: monthName.toUpperCase(),
      colSpan: 5,
      styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 },
    })),
  ];

  // Tier 2 Header (Weeks 1-5 per month)
  const headRow2: any[] = [];
  monthNames.forEach((_, mIdx) => {
    [1, 2, 3, 4, 5].forEach((w) => {
      const kaldikMonth = semesterNumber === 1 ? mIdx + 7 : mIdx + 1;
      const matchedWeek = kaldikWeeks.find(
        (kw) => kw.month === kaldikMonth && kw.weekNumber === w
      );
      const isLocked = matchedWeek && matchedWeek.type !== 'KBM';

      headRow2.push({
        content: String(w),
        styles: {
          halign: 'center',
          fontSize: 6,
          fillColor: isLocked ? [226, 232, 240] : [248, 250, 252],
          textColor: isLocked ? [100, 116, 139] : [30, 41, 59],
        },
      });
    });
  });

  // Table Body Rows
  const tableBody: any[][] = [];

  currentPromesItems.forEach((item, idx) => {
    const row: any[] = [
      { content: String(idx + 1), styles: { halign: 'center' } },
      item.elementOrDomain || '-',
      `${item.learningObjectiveCode}: ${item.learningObjectiveText}`,
      item.coreTopic || '-',
      { content: String(item.targetJp || 0), styles: { halign: 'center', fontStyle: 'bold' } },
    ];

    // 30 week allocation cells
    monthNames.forEach((_, mIdx) => {
      [1, 2, 3, 4, 5].forEach((w) => {
        const kaldikMonth = semesterNumber === 1 ? mIdx + 7 : mIdx + 1;
        const matchedWeek = kaldikWeeks.find(
          (kw) => kw.month === kaldikMonth && kw.weekNumber === w
        );
        const cell = cells.find(
          (c) => c.rowId === item.id && c.monthIndex === mIdx && c.weekNumber === w
        );
        const isLocked = cell?.isLocked || (matchedWeek && matchedWeek.type !== 'KBM');

        if (isLocked) {
          row.push({
            content: '',
            styles: { fillColor: [226, 232, 240] },
          });
        } else {
          const val = cell?.allocatedJp && cell.allocatedJp > 0 ? String(cell.allocatedJp) : '';
          row.push({
            content: val,
            styles: {
              halign: 'center',
              fontStyle: val ? 'bold' : 'normal',
              fontSize: 6,
            },
          });
        }
      });
    });

    tableBody.push(row);
  });

  // Summary Row (Weekly totals)
  const summaryRow: any[] = [
    {
      content: 'JUMLAH ALOKASI JP MINGGUAN',
      colSpan: 4,
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    {
      content: String(totalPromesTargetJp),
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
  ];

  monthNames.forEach((_, mIdx) => {
    [1, 2, 3, 4, 5].forEach((w) => {
      const kaldikMonth = semesterNumber === 1 ? mIdx + 7 : mIdx + 1;
      const matchedWeek = kaldikWeeks.find(
        (kw) => kw.month === kaldikMonth && kw.weekNumber === w
      );
      const isLocked = matchedWeek && matchedWeek.type !== 'KBM';
      const colSum = cells
        .filter((c) => c.monthIndex === mIdx && c.weekNumber === w)
        .reduce((sum, c) => sum + (c.allocatedJp || 0), 0);

      summaryRow.push({
        content: !isLocked && colSum > 0 ? String(colSum) : '',
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fontSize: 6,
          fillColor: isLocked ? [226, 232, 240] : [241, 245, 249],
        },
      });
    });
  });

  tableBody.push(summaryRow);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [headRow1, headRow2],
    body: tableBody,
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineColor: [15, 23, 42],
      lineWidth: 0.25,
      cellPadding: 0.8,
    },
    bodyStyles: {
      fontSize: 6.5,
      lineColor: [15, 23, 42],
      lineWidth: 0.15,
      cellPadding: 0.8,
    },
    columnStyles,
    pageBreak: 'avoid',
    theme: 'grid',
    tableLineColor: [15, 23, 42],
    tableLineWidth: 0.25,
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY ?? y + 60;

  // Footnote legend
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Keterangan: Kolom berlatar belakang abu-abu adalah pekan non-efektif (libur semester, jeda tengah semester, asesmen, atau hari besar) sesuai Kalender Pendidikan.',
    MARGIN,
    finalTableY + 3.5
  );

  // ── 5. Signature Block (Guaranteed on Page 1) ──
  const sigHeight = 22;
  let sigStartY = finalTableY + 7;
  if (sigStartY + sigHeight > PAGE_HEIGHT - 6) {
    sigStartY = PAGE_HEIGHT - 6 - sigHeight;
  }
  drawSignatures(doc, MARGIN, PAGE_WIDTH, sigStartY, identity);

  // ── 6. Save ──
  const cleanGrade = (identity.gradeLevel || '').replace(/\s+/g, '_');
  const filename = `Promes_Sem${semesterNumber}_${identity.subject.replace(/\s+/g, '_')}_${cleanGrade}.pdf`;
  doc.save(filename);
}

/** Draw dual signature block */
function drawSignatures(
  doc: any,
  margin: number,
  pageWidth: number,
  startY: number,
  identity: DocumentIdentity
) {
  const leftX = margin;
  const rightX = pageWidth - margin - 60;
  let y = startY;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Left signature — Kepala Madrasah
  doc.text('Mengetahui,', leftX, y);
  y += 3.5;
  doc.text(identity.principalRole || 'Kepala Madrasah', leftX, y);
  y += 12; // Standard space for signature / stamp
  doc.setFont('helvetica', 'bold');
  const principalName = identity.principalName || 'H. Masturi, S.Pd.I.';
  doc.text(principalName, leftX, y);
  doc.setLineWidth(0.3);
  doc.line(leftX, y + 0.5, leftX + doc.getTextWidth(principalName), y + 0.5);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(
    identity.principalNip && identity.principalNip !== '-'
      ? `NIP. ${identity.principalNip}`
      : 'NIP. -',
    leftX,
    y
  );

  // Right signature — Guru Mata Pelajaran
  y = startY;
  const dateText = `${identity.city || 'Madiun'}, ${identity.signatureDate || new Date().toLocaleDateString('id-ID')}`;
  doc.setFont('helvetica', 'normal');
  doc.text(dateText, rightX, y);
  y += 3.5;
  doc.text(identity.teacherRole || 'Guru Mata Pelajaran', rightX, y);
  y += 12; // Standard space for signature
  doc.setFont('helvetica', 'bold');
  const teacherName = identity.teacherName || 'Bagas Riyadi, S.Pd';
  doc.text(teacherName, rightX, y);
  doc.line(rightX, y + 0.5, rightX + doc.getTextWidth(teacherName), y + 0.5);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(
    identity.teacherNip && identity.teacherNip !== '-'
      ? `NIP. ${identity.teacherNip}`
      : 'NIP. -',
    rightX,
    y
  );
}
