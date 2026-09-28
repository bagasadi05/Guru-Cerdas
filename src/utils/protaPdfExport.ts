/**
 * Programmatic PDF Export for Program Tahunan (Prota)
 *
 * Uses jsPDF + jspdf-autotable (same engine as Rapor, Jurnal, Jadwal modules)
 * to produce a crisp, vector-text PDF with proper A4 Landscape layout.
 *
 * @module utils/protaPdfExport
 */

import { getJsPDF, getAutoTable } from './dynamicImports';
import { addOfficialMadrasahKop, ensureLogosLoaded } from './pdfHeaderUtils';
import type { DocumentIdentity, ProtaItem, ProtaValidationResult } from '../types/perangkatAjar';

export interface ExportProtaPdfOptions {
  identity: DocumentIdentity;
  protaItems: ProtaItem[];
  validation: ProtaValidationResult;
}

/**
 * Generate and download a professional Prota PDF document.
 *
 * Layout (A4 Landscape — Guaranteed 1 Single Page):
 *   1. Official Madrasah Kop Surat with dual logos and double-line border
 *   2. Document title "PROGRAM TAHUNAN (PROTA)"
 *   3. Identity metadata table (school, subject, grade, curriculum, year, semester)
 *   4. Prota data table with Semester 1 rows, subtotal, Semester 2 rows, subtotal, grand total
 *   5. Dual signature block (Kepala Madrasah left, Guru right) on the same page
 */
export async function exportProtaToPdf({
  identity,
  protaItems,
  validation,
}: ExportProtaPdfOptions): Promise<void> {
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
  const MARGIN = 10;

  // ── 1. Official Kop Surat Kementerian Agama & Madrasah (Compact ~23mm) ──
  const headerY = addOfficialMadrasahKop(doc, {
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
  let y = headerY + 6.5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PROGRAM TAHUNAN (PROTA)', PAGE_WIDTH / 2, y, { align: 'center' });
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
    ['Semester', `: 1 (Ganjil) & 2 (Genap)`],
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

  // ── 4. Prota Data Table ──
  const sem1Items = protaItems
    .filter((i) => (i.semesterNumber ?? 1) === 1)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const sem2Items = protaItems
    .filter((i) => i.semesterNumber === 2)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const totalJpSem1 = sem1Items.reduce((acc, it) => acc + (it.targetJp || 0), 0);
  const totalJpSem2 = sem2Items.reduce((acc, it) => acc + (it.targetJp || 0), 0);

  const elementLabel = identity.curriculum === 'K13' ? 'Kompetensi Inti' : 'Elemen / Domain';
  const objectiveLabel = identity.curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Alur Tujuan Pembelajaran (ATP / TP)';

  // Build table body rows
  const tableBody: any[][] = [];

  // Semester 1 section header
  if (sem1Items.length > 0) {
    tableBody.push([
      { content: 'SEMESTER 1 (GANJIL)', colSpan: 6, styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number], textColor: [30, 41, 59] as [number, number, number] } },
    ]);

    sem1Items.forEach((item, idx) => {
      tableBody.push([
        { content: String(idx + 1), styles: { halign: 'center' as const } },
        { content: 'Sem. 1', styles: { halign: 'center' as const } },
        item.elementOrDomain || '-',
        `${item.learningObjectiveCode}: ${item.learningObjectiveText}`,
        item.coreTopic || '-',
        { content: `${item.targetJp} JP`, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
      ]);
    });

    // Subtotal Sem 1
    tableBody.push([
      { content: 'Subtotal Semester 1', colSpan: 5, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `${totalJpSem1} JP`, styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
    ]);
  }

  // Semester 2 section header
  if (sem2Items.length > 0) {
    tableBody.push([
      { content: 'SEMESTER 2 (GENAP)', colSpan: 6, styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number], textColor: [30, 41, 59] as [number, number, number] } },
    ]);

    sem2Items.forEach((item, idx) => {
      tableBody.push([
        { content: String(idx + 1), styles: { halign: 'center' as const } },
        { content: 'Sem. 2', styles: { halign: 'center' as const } },
        item.elementOrDomain || '-',
        `${item.learningObjectiveCode}: ${item.learningObjectiveText}`,
        item.coreTopic || '-',
        { content: `${item.targetJp} JP`, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
      ]);
    });

    // Subtotal Sem 2
    tableBody.push([
      { content: 'Subtotal Semester 2', colSpan: 5, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `${totalJpSem2} JP`, styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
    ]);
  }

  // Grand Total
  tableBody.push([
    {
      content: 'TOTAL ALOKASI WAKTU TAHUNAN',
      colSpan: 5,
      styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: [226, 232, 240] as [number, number, number] },
    },
    {
      content: `${validation.allocatedAnnualJp} JP`,
      styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [226, 232, 240] as [number, number, number] },
    },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        { content: 'No', styles: { halign: 'center' as const } },
        { content: 'Semester', styles: { halign: 'center' as const } },
        elementLabel,
        objectiveLabel,
        'Materi Pokok',
        { content: 'Alokasi JP', styles: { halign: 'center' as const } },
      ],
    ],
    body: tableBody,
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [15, 23, 42],
      lineWidth: 0.3,
      cellPadding: 1.2,
    },
    bodyStyles: {
      fontSize: 7,
      lineColor: [15, 23, 42],
      lineWidth: 0.2,
      cellPadding: 1.0,
    },
    columnStyles: {
      0: { cellWidth: 8 },   // No
      1: { cellWidth: 16 },  // Semester
      2: { cellWidth: 32 },  // Elemen/Domain
      3: { cellWidth: 'auto' }, // ATP/TP (flex)
      4: { cellWidth: 44 },  // Materi Pokok
      5: { cellWidth: 18 },  // Alokasi JP
    },
    pageBreak: 'avoid',
    theme: 'grid',
    tableLineColor: [15, 23, 42],
    tableLineWidth: 0.3,
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY ?? y + 50;

  // ── 5. Signature Block (Guaranteed on Page 1 — Never Separated) ──
  const sigHeight = 22;
  let sigStartY = finalTableY + 4;
  if (sigStartY + sigHeight > PAGE_HEIGHT - 6) {
    sigStartY = PAGE_HEIGHT - 6 - sigHeight;
  }
  drawSignatures(doc, MARGIN, PAGE_WIDTH, sigStartY, identity);

  // ── 6. Save ──
  const cleanGrade = (identity.gradeLevel || '').replace(/\s+/g, '_');
  const filename = `Prota_${identity.subject.replace(/\s+/g, '_')}_${cleanGrade}.pdf`;
  doc.save(filename);
}

/** Draw dual signature block (Kepala Madrasah left, Guru right) */
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
