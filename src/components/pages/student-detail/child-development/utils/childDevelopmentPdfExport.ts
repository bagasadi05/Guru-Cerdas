import type { CellHookData as AutoTableCellData } from 'jspdf-autotable';
import { getJsPDF, getAutoTable } from '../../../../../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../../../../../utils/pdfHeaderUtils';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import { cleanTextForPDF, abbreviateSubject, drawRadarChartInPDF, getTableEndY } from './childDevelopmentPdfUtils';
import type { ComprehensiveChildAnalysis, ComparativeChildAnalysis, ChildDevelopmentData } from '../../../../../services/childDevelopmentAnalysis';

export interface ExportSingleChildDevelopmentPdfParams {
  analysis: ComprehensiveChildAnalysis;
  studentData: ChildDevelopmentData;
  schoolName: string;
  principalName?: string;
  subjectAverages: Array<{ subject: string; average: number }>;
}

export interface ExportComparativeChildDevelopmentPdfParams {
  comparativeAnalysis: ComparativeChildAnalysis;
  studentData: ChildDevelopmentData;
  schoolName: string;
  principalName?: string;
  activeAcademicYearName?: string;
  avgScoreSem1: number;
  avgScoreSem2: number;
  avgScoreDiff: number;
  compSubjectAverages: Array<{ subject: string; sem1: number | null; sem2: number | null }>;
  compAttendanceStats: {
    sem1: { total: number; hadir: number; sakit: number; izin: number; alpha: number; percentage: number };
    sem2: { total: number; hadir: number; sakit: number; izin: number; alpha: number; percentage: number };
  };
  compViolationStats: {
    sem1: { count: number; points: number };
    sem2: { count: number; points: number };
  };
  compHolisticDimensions: {
    labels: string[];
    sem1: number[];
    sem2: number[];
  };
}

/**
 * Export Single Semester Child Development Analysis to PDF
 */
export async function exportSingleChildDevelopmentPDF({
  analysis,
  studentData,
  schoolName,
  principalName = 'H. Masturi, S.Pd.I.',
  subjectAverages,
}: ExportSingleChildDevelopmentPdfParams): Promise<void> {
  // Load school logos
  await ensureLogosLoaded();

  const { default: jsPDF } = await getJsPDF();
  const { default: autoTable } = await getAutoTable();

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Formal Kop Surat
  let y = addPdfHeader(doc, {
    schoolName: schoolName,
    orientation: 'portrait'
  });

  // Report Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('LAPORAN ANALISIS PERKEMBANGAN SISWA', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Metadata Table (elegant, clean)
  autoTable(doc, {
    startY: y,
    body: [
      ['Nama Siswa', `: ${analysis.summary.name}`, 'Kelas / TA', `: ${analysis.summary.class} / ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`],
      ['Usia', `: ${analysis.summary.age} Tahun`, 'Tanggal Cetak', `: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 28 },
      3: { cellWidth: 60 },
    },
  });

  y = getTableEndY(doc) + 6;

  // Divide line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 1. Overall assessment / Ringkasan Perkembangan
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('I. RINGKASAN PERKEMBANGAN ANANDA', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const splitOverall = doc.splitTextToSize(cleanTextForPDF(analysis.summary.overallAssessment), pageWidth - margin * 2);
  doc.text(splitOverall, margin, y);
  y += splitOverall.length * 4.5 + 4;

  // 2. Academic & Attendance Stats Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('II. PERFORMA AKADEMIK & KEHADIRAN', margin, y);
  y += 5;

  // Academic data mapping
  const academicData = subjectAverages.map((sub, idx) => [
    idx + 1,
    sub.subject,
    sub.average,
    sub.average >= 85 ? 'Sangat Baik' : sub.average >= 75 ? 'Baik' : sub.average >= 65 ? 'Cukup' : 'Perlu Pendampingan'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['No', 'Mata Pelajaran', 'Nilai Rata-rata', 'Predikat']],
    body: academicData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 80, halign: 'left' },
      2: { cellWidth: 40 },
      3: { cellWidth: 50 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  y = getTableEndY(doc) + 6;

  // Attendance Rekap
  const totalAttend = studentData.attendanceRecords.length;
  const hadir = studentData.attendanceRecords.filter((a) => a.status === 'Hadir').length;
  const sakit = studentData.attendanceRecords.filter((a) => a.status === 'Sakit').length;
  const izin = studentData.attendanceRecords.filter((a) => a.status === 'Izin').length;
  const alpha = studentData.attendanceRecords.filter((a) => a.status === 'Alpha').length;
  const percentage = totalAttend > 0 ? ((hadir / totalAttend) * 100).toFixed(1) : '100';

  autoTable(doc, {
    startY: y,
    head: [['Kehadiran (H)', 'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Persentase Kehadiran']],
    body: [[`${hadir} Hari`, `${sakit} Hari`, `${izin} Hari`, `${alpha} Hari`, `${percentage}%`]],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
  });

  y = getTableEndY(doc) + 8;

  // Draw Academic Performance Radar Chart
  if (subjectAverages.length >= 3) {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Visualisasi Performa Akademik', pageWidth / 2, y, { align: 'center' });
    y += 5;

    drawRadarChartInPDF(
      doc,
      (pageWidth - 65) / 2,
      y,
      65,
      subjectAverages.map(s => abbreviateSubject(s.subject)),
      [{
        values: subjectAverages.map(s => s.average),
        strokeColor: [79, 70, 229],
        label: 'Rata-rata Nilai'
      }]
    );
    y += 78;
  }

  // Check if we need to add a new page (prevent orphans)
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // 3. Cognitive, Affective, Psychomotor details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('III. DETIL ASPEK PERKEMBANGAN', margin, y);
  y += 6;

  // Cognitive
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('A. Perkembangan Pola Pikir & Kognitif', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`• Gaya Belajar: ${cleanTextForPDF(analysis.cognitive.learningStyle)}`, margin + 3, y);
  y += 4.5;
  doc.text(`• Berpikir Kritis: ${cleanTextForPDF(analysis.cognitive.criticalThinking)}`, margin + 3, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Kekuatan Utama Kognitif:', margin + 3, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  analysis.cognitive.strengths.slice(0, 2).forEach((str) => {
    const lines = doc.splitTextToSize(`- ${cleanTextForPDF(str)}`, pageWidth - margin * 2 - 6);
    doc.text(lines, margin + 5, y);
    y += lines.length * 4.5;
  });
  y += 2;

  // Check height
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // Affective
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('B. Aspek Afektif & Karakter Positif', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`• Kemampuan Sosial: ${cleanTextForPDF(analysis.affective.socialSkills)}`, margin + 3, y);
  y += 4.5;
  doc.text(`• Kedisiplinan: ${cleanTextForPDF(analysis.affective.discipline)}`, margin + 3, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Karakter Positif Menonjol:', margin + 3, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  analysis.affective.positiveCharacters.slice(0, 2).forEach((char) => {
    const lines = doc.splitTextToSize(`- ${cleanTextForPDF(char)}`, pageWidth - margin * 2 - 6);
    doc.text(lines, margin + 5, y);
    y += lines.length * 4.5;
  });
  y += 2;

  // Check height
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // Psychomotor
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('C. Aspek Psikomotor & Keterampilan Fisik', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`• Kemampuan Motorik: ${cleanTextForPDF(analysis.psychomotor.motorSkills)}`, margin + 3, y);
  y += 4.5;
  doc.text(`• Koordinasi Fisik: ${cleanTextForPDF(analysis.psychomotor.coordination)}`, margin + 3, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Keterampilan Fisik Terbaik:', margin + 3, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  analysis.psychomotor.outstandingSkills.slice(0, 2).forEach((skill) => {
    const lines = doc.splitTextToSize(`- ${cleanTextForPDF(skill)}`, pageWidth - margin * 2 - 6);
    doc.text(lines, margin + 5, y);
    y += lines.length * 4.5;
  });
  y += 6;

  // Check page break for Recommendations
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // 4. Recommendations & Development Plan
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('IV. REKOMENDASI & RENCANA PENGEMBANGAN', margin, y);
  y += 6;

  // Home support text
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('Dukungan di Rumah (Saran Praktis):', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  analysis.recommendations.homeSupport.slice(0, 3).forEach((support, idx) => {
    const lines = doc.splitTextToSize(`${idx + 1}. ${cleanTextForPDF(support)}`, pageWidth - margin * 2 - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.5;
  });
  y += 4;

  // Target 3 Bulan & 6 Bulan inside grid
  autoTable(doc, {
    startY: y,
    head: [['Rencana Target 3 Bulan', 'Rencana Target 6 Bulan']],
    body: [[
      analysis.recommendations.developmentPlan.threeMonths.slice(0, 3).map((t) => `• ${cleanTextForPDF(t)}`).join('\n\n'),
      analysis.recommendations.developmentPlan.sixMonths.slice(0, 3).map((t) => `• ${cleanTextForPDF(t)}`).join('\n\n')
    ]],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 91 },
      1: { cellWidth: 91 },
    }
  });

  y = getTableEndY(doc) + 18;

  // Signature page check
  if (y > 240) {
    doc.addPage();
    y = 25;
  }

  // 5. Signature Block
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Madiun, ${printDateStr}`, pageWidth - 70, y);

  doc.text('Mengetahui,', margin + 10, y + 5);
  doc.text('Kepala Madrasah,', margin + 10, y + 10);

  doc.text('Wali Kelas,', pageWidth - 70, y + 10);

  // Names signatures place
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${principalName} )`, margin + 10, y);
  doc.text(`( ${studentData.student.class ? 'Guru Wali Kelas' : 'Wali Kelas'} )`, pageWidth - 70, y);

  const safeName = analysis.summary.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`Perkembangan_Siswa_${safeName}_${formatExportDate()}.pdf`);
}

/**
 * Export Comparative Semester Child Development Analysis to PDF
 */
export async function exportComparativeChildDevelopmentPDF({
  comparativeAnalysis,
  studentData,
  schoolName,
  principalName = 'H. Masturi, S.Pd.I.',
  activeAcademicYearName = '-',
  avgScoreSem1,
  avgScoreSem2,
  avgScoreDiff,
  compSubjectAverages,
  compAttendanceStats,
  compViolationStats,
  compHolisticDimensions,
}: ExportComparativeChildDevelopmentPdfParams): Promise<void> {
  // Load school logos
  await ensureLogosLoaded();

  const { default: jsPDF } = await getJsPDF();
  const { default: autoTable } = await getAutoTable();

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Formal Kop Surat
  let y = addPdfHeader(doc, {
    schoolName: schoolName,
    orientation: 'portrait'
  });

  // Report Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('LAPORAN KOMPARASI PERKEMBANGAN SISWA ANTAR SEMESTER', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Metadata Table (elegant, clean)
  autoTable(doc, {
    startY: y,
    body: [
      ['Nama Siswa', `: ${comparativeAnalysis.summary.name}`, 'Kelas / TA', `: ${comparativeAnalysis.summary.class} / ${activeAcademicYearName}`],
      ['Rata-Rata S1', `: ${avgScoreSem1}`, 'Rata-Rata S2', `: ${avgScoreSem2} (${avgScoreDiff >= 0 ? '+' : ''}${avgScoreDiff})`],
      ['Tanggal Cetak', `: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 'Metode', `: ${comparativeAnalysis.generatedBy === 'Offline Fallback' ? 'Offline Standard' : 'AI Comparative'}`],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 28 },
      3: { cellWidth: 60 },
    },
  });

  y = getTableEndY(doc) + 6;

  // Divide line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // === SECTION 1: PERFORMA AKADEMIK KOMPARATIF ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text('1. PERBANDINGAN PERFORMA AKADEMIK PER MATA PELAJARAN', margin, y);
  y += 5;

  // Create comparative rows
  const academicRows = compSubjectAverages.map((item, idx) => {
    const s1Val = item.sem1 !== null ? item.sem1 : '-';
    const s2Val = item.sem2 !== null ? item.sem2 : '-';
    let status = 'Stabil';
    if (item.sem1 !== null && item.sem2 !== null) {
      const diff = item.sem2 - item.sem1;
      status = diff > 0 ? `Naik ${diff} Poin` : diff < 0 ? `Turun ${Math.abs(diff)} Poin` : 'Stabil';
    }
    return [idx + 1, item.subject, s1Val, s2Val, status];
  });

  autoTable(doc, {
    startY: y,
    head: [['No', 'Mata Pelajaran', 'Semester 1 (Ganjil)', 'Semester 2 (Genap)', 'Catatan Perkembangan']],
    body: academicRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 40, fontStyle: 'bold' }
    },
    didParseCell: (data: AutoTableCellData) => {
      if (data.column.index === 4 && data.cell.section === 'body') {
        const val = data.cell.text[0];
        if (val.startsWith('Naik')) {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
        } else if (val.startsWith('Turun')) {
          data.cell.styles.textColor = [244, 63, 94]; // Rose 500
        } else {
          data.cell.styles.textColor = [100, 116, 139]; // Slate 500
        }
      }
    }
  });

  y = getTableEndY(doc) + 8;

  // === SECTION 2: KEHADIRAN & KARAKTER KOMPARATIF ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('2. KOMPARASI REKAPITULASI PRESENSI & DISIPLIN', margin, y);
  y += 5;

  const presensiRows = [
    ['Rasio Kehadiran', `${compAttendanceStats.sem1.percentage}%`, `${compAttendanceStats.sem2.percentage}%`, `${compAttendanceStats.sem2.percentage - compAttendanceStats.sem1.percentage >= 0 ? '+' : ''}${compAttendanceStats.sem2.percentage - compAttendanceStats.sem1.percentage}%`],
    ['Hadir', `${compAttendanceStats.sem1.hadir} Hari`, `${compAttendanceStats.sem2.hadir} Hari`, `${compAttendanceStats.sem2.hadir - compAttendanceStats.sem1.hadir}`],
    ['Sakit', `${compAttendanceStats.sem1.sakit} Hari`, `${compAttendanceStats.sem2.sakit} Hari`, `${compAttendanceStats.sem2.sakit - compAttendanceStats.sem1.sakit}`],
    ['Izin', `${compAttendanceStats.sem1.izin} Hari`, `${compAttendanceStats.sem2.izin} Hari`, `${compAttendanceStats.sem2.izin - compAttendanceStats.sem1.izin}`],
    ['Alpha', `${compAttendanceStats.sem1.alpha} Hari`, `${compAttendanceStats.sem2.alpha} Hari`, `${compAttendanceStats.sem2.alpha - compAttendanceStats.sem1.alpha}`],
    ['Poin Pelanggaran', `${compViolationStats.sem1.points} Poin`, `${compViolationStats.sem2.points} Poin`, `${compViolationStats.sem2.points - compViolationStats.sem1.points}`]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metrik Disiplin', 'Semester 1', 'Semester 2', 'Perubahan']],
    body: presensiRows,
    theme: 'grid',
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 45, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data: AutoTableCellData) => {
      if (data.column.index === 3 && data.cell.section === 'body') {
        const val = data.cell.text[0];
        const isViolationRow = data.row.index === 5;
        if (val.startsWith('+') && !isViolationRow) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val.startsWith('-') && !isViolationRow) {
          data.cell.styles.textColor = [244, 63, 94];
        } else if (isViolationRow) {
          const numVal = parseInt(val);
          if (numVal > 0) {
            data.cell.styles.textColor = [244, 63, 94]; // Red for violation increase
          } else if (numVal < 0) {
            data.cell.styles.textColor = [16, 185, 129]; // Green for violation decrease
          }
        }
      }
    }
  });

  y = getTableEndY(doc) + 8;

  if (y > 180) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Grafik Perbandingan Perkembangan Holistik', pageWidth / 2, y, { align: 'center' });
  y += 5;

  drawRadarChartInPDF(
    doc,
    (pageWidth - 65) / 2,
    y,
    65,
    compHolisticDimensions.labels,
    [
      {
        values: compHolisticDimensions.sem1,
        strokeColor: [148, 163, 184], // Muted slate for S1
        label: 'Semester 1'
      },
      {
        values: compHolisticDimensions.sem2,
        strokeColor: [79, 70, 229], // Indigo for S2
        label: 'Semester 2'
      }
    ]
  );
  y += 78;

  // Add a page break for the detailed narratives
  doc.addPage();
  y = addPdfHeader(doc, {
    schoolName: schoolName,
    orientation: 'portrait'
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('4. ANALISIS NARATIF PERKEMBANGAN ANANDA (AI COMPLETED)', margin, y);
  y += 6;

  // General comparative overview
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('A. RINGKASAN DINAMIKA PERKEMBANGAN', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const overallText = doc.splitTextToSize(cleanTextForPDF(comparativeAnalysis.summary.overallComparison), pageWidth - (margin * 2));
  doc.text(overallText, margin, y);
  y += (overallText.length * 4) + 6;

  // Function to render elegant side-by-side strengths or bullet points and then narrative
  const drawAspectComparison = (
    title: string,
    sem1Bullets: string[],
    sem2Bullets: string[],
    narrative: string
  ) => {
    // Prevent layout overlapping
    if (y > pageHeight - 80) {
      doc.addPage();
      y = addPdfHeader(doc, { schoolName: schoolName, orientation: 'portrait' }) + 8;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    y += 5;

    // Render standard comparison bullets using a two-column clean style
    const colWidth = (pageWidth - (margin * 2) - 8) / 2;
    
    // Semester 1 Col
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, colWidth, 32, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Semester 1 (Ganjil):', margin + 3, y + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let s1Y = y + 10;
    sem1Bullets.slice(0, 2).forEach(b => {
      const splitB = doc.splitTextToSize(`• ${cleanTextForPDF(b)}`, colWidth - 6);
      doc.text(splitB, margin + 3, s1Y);
      s1Y += (splitB.length * 3.5);
    });

    // Semester 2 Col
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + colWidth + 8, y, colWidth, 32, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Semester 2 (Genap):', margin + colWidth + 11, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let s2Y = y + 10;
    sem2Bullets.slice(0, 2).forEach(b => {
      const splitB = doc.splitTextToSize(`• ${cleanTextForPDF(b)}`, colWidth - 6);
      doc.text(splitB, margin + colWidth + 11, s2Y);
      s2Y += (splitB.length * 3.5);
    });

    y += 36;

    // Narrative below columns
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const splitNarrative = doc.splitTextToSize(`" ${cleanTextForPDF(narrative)} "`, pageWidth - (margin * 2));
    doc.text(splitNarrative, margin, y);
    y += (splitNarrative.length * 3.8) + 6;
  };

  // Aspect 1: Kognitif
  drawAspectComparison(
    'B. EVALUASI ASPEK KOGNITIF (AKADEMIK & CARA BELAJAR)',
    comparativeAnalysis.cognitive.semester1Strengths,
    comparativeAnalysis.cognitive.semester2Strengths,
    comparativeAnalysis.cognitive.comparisonNarrative
  );

  // Aspect 2: Afektif
  drawAspectComparison(
    'C. EVALUASI ASPEK AFEKTIF (KARAKTER & SOSIAL-EMOSIONAL)',
    comparativeAnalysis.affective.semester1PositiveCharacters,
    comparativeAnalysis.affective.semester2PositiveCharacters,
    comparativeAnalysis.affective.comparisonNarrative
  );

  // Aspect 3: Psikomotorik
  drawAspectComparison(
    'D. EVALUASI ASPEK PSIKOMOTORIK (KETERAMPILAN & AKTIVITAS FISIK)',
    comparativeAnalysis.psychomotor.semester1Skills,
    comparativeAnalysis.psychomotor.semester2Skills,
    comparativeAnalysis.psychomotor.comparisonNarrative
  );

  // Add one more page for recommendations & signature
  doc.addPage();
  y = addPdfHeader(doc, {
    schoolName: schoolName,
    orientation: 'portrait'
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('5. REKOMENDASI DAN RENCANA STIMULASI LANJUTAN', margin, y);
  y += 6;

  // Home Support Table
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('A. Dukungan Pembelajaran di Rumah (Home Support)', margin, y);
  y += 4;

  const homeSupportRows = comparativeAnalysis.recommendations.homeSupport.map((support, idx) => [idx + 1, cleanTextForPDF(support)]);
  autoTable(doc, {
    startY: y,
    body: homeSupportRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [71, 85, 105] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 8, textColor: [79, 70, 229] },
      1: { cellWidth: 170 }
    }
  });

  y = getTableEndY(doc) + 6;

  // Stimulation Plan Table
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('B. Rencana Kerja Stimulasi Kolaboratif', margin, y);
  y += 4;

  const stimulationRows = [
    ['Stimulasi Kognitif', cleanTextForPDF(comparativeAnalysis.recommendations.stimulation.cognitive.join('\n'))],
    ['Stimulasi Afektif', cleanTextForPDF(comparativeAnalysis.recommendations.stimulation.affective.join('\n'))],
    ['Stimulasi Psikomotorik', cleanTextForPDF(comparativeAnalysis.recommendations.stimulation.psychomotor.join('\n'))]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Dimensi', 'Rencana Aksi Stimulasi untuk Orang Tua & Guru']],
    body: stimulationRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 140 }
    }
  });

  y = getTableEndY(doc) + 12;

  // Check height for signature
  if (y > pageHeight - 50) {
    doc.addPage();
    y = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD KOTA MADIUN', orientation: 'portrait' }) + 8;
  }

  // Formal signature blocks
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Madiun, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - 70, y);
  y += 4;

  doc.text('Mengetahui,', margin + 10, y);
  doc.text('Kepala Madrasah,', margin + 10, y + 5);

  doc.text('Wali Kelas,', pageWidth - 70, y + 5);

  // Names signatures place
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${principalName} )`, margin + 10, y);
  doc.text(`( ${studentData.student.class ? 'Guru Wali Kelas' : 'Wali Kelas'} )`, pageWidth - 70, y);

  const safeName = comparativeAnalysis.summary.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`Komparasi_Perkembangan_${safeName}_${formatExportDate()}.pdf`);
}
