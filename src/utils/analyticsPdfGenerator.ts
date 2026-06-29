import type jsPDF from 'jspdf';
import { getAutoTable, getJsPDF } from './dynamicImports';
import { ExportOptions } from '../components/pages/analytics/AnalyticsExportModal';
import { addPdfHeader, ensureLogosLoaded } from './pdfHeaderUtils';

// Extend jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

interface AnalyticsStudent {
    id: string;
    name: string;
}

interface AnalyticsClassStat {
    id: string;
    name: string;
    studentCount: number;
    attendanceRate: number;
    avgGrade?: number;
}

interface AnalyticsData {
    students: AnalyticsStudent[];
    classStats: AnalyticsClassStat[];
    attendanceStats: {
        total: number;
        hadir: number;
        hadirRate: number;
        izin: number;
        sakit: number;
        alpha: number;
    };
    gradeStats: {
        overallAverage: number;
        totalStudentsWithGrades: number;
        distribution: { label: string; range: string; count: number; percentage: number }[];
    };
    taskStats: {
        total: number;
        todo: number;
        inProgress: number;
        done: number;
        overdue: number;
    };
    violationsStats: {
        total: number;
        totalPoints: number;
        byType: { type: string; count: number }[];
    };
    quizPointsStats: {
        total: number;
        byCategory: { category: string; count: number; points: number }[];
    };
    atRiskStudents: { student?: { name?: string }; reason?: string; details?: string }[];
    genderStats: { male: number; female: number };
    selectedClassLabel: string;
    dateRangeLabel: string;
}

export const generateAnalyticsPdf = async (data: AnalyticsData, options: ExportOptions) => {
    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const MARGIN = 14;
    const contentW = pageWidth - MARGIN * 2;

    // --- Formal palette ---
    const PRIMARY = [7, 54, 66] as const;          // dark teal
    const BORDER = [205, 214, 222] as const;
    const TEXT = [30, 41, 59] as const;
    const MUTED = [100, 116, 139] as const;

    const now = new Date();
    const today = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const timestamp = now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    await ensureLogosLoaded();
    let y = addPdfHeader(doc, { orientation: 'portrait' });

    // --- Title band ---
    y += 2;
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(MARGIN, y, contentW, 14, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LAPORAN ANALITIK AKADEMIK', pageWidth / 2, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(data.selectedClassLabel.toUpperCase(), pageWidth / 2, y + 11, { align: 'center' });
    y += 14 + 5;

    // --- Metadata info box (2 columns) ---
    const boxH = 21;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(MARGIN, y, contentW, boxH, 1.5, 1.5, 'FD');
    const colX1 = MARGIN + 5;
    const colX2 = pageWidth / 2 + 3;
    const labelVal = (lx: number, ty: number, label: string, val: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...MUTED);
        doc.text(label.toUpperCase(), lx, ty);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TEXT);
        doc.text(val, lx, ty + 5);
    };
    labelVal(colX1, y + 6, 'Kelas / Cakupan', data.selectedClassLabel);
    labelVal(colX2, y + 6, 'Rentang Waktu', data.dateRangeLabel);
    labelVal(colX1, y + 14.5, 'Tanggal Cetak', today);
    labelVal(colX2, y + 14.5, 'Jumlah Siswa', `${data.students.length} siswa`);
    y += boxH + 7;

    // --- helpers ---
    let sectionNo = 0;
    const ensureSpace = (need: number) => {
        if (y + need > pageHeight - 22) { doc.addPage(); y = 22; }
    };
    const heading = (title: string) => {
        sectionNo++;
        ensureSpace(16);
        doc.setFillColor(...PRIMARY);
        doc.rect(MARGIN, y - 3.4, 1.8, 5.8, 'F');
        doc.setTextColor(...PRIMARY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${sectionNo}.  ${title}`, MARGIN + 4.5, y + 1);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y + 3.6, pageWidth - MARGIN, y + 3.6);
        y += 9;
    };
    const tableBase = (extra: Record<string, unknown>): any => ({
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59], lineColor: [222, 228, 235], lineWidth: 0.2 },
        headStyles: { fillColor: [12, 74, 110], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2.8 },
        alternateRowStyles: { fillColor: [244, 248, 250] },
        ...extra,
    });
    const afterTable = () => { y = doc.lastAutoTable.finalY + 8; };
    const kpiCards = (cards: { label: string; value: string | number; color: readonly [number, number, number] }[]) => {
        ensureSpace(26);
        const gap = 4;
        const cw = (contentW - gap * (cards.length - 1)) / cards.length;
        const ch = 21;
        cards.forEach((c, i) => {
            const cx = MARGIN + i * (cw + gap);
            doc.setFillColor(c.color[0], c.color[1], c.color[2]);
            doc.roundedRect(cx, y, cw, ch, 1.5, 1.5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
            doc.text(String(c.value), cx + 5, y + 11);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
            doc.text(c.label.toUpperCase(), cx + 5, y + 16.5);
        });
        y += ch + 8;
    };

    // ===== 1. Ringkasan Eksekutif =====
    if (options.summary) {
        heading('Ringkasan Eksekutif');
        kpiCards([
            { label: 'Total Siswa', value: data.students.length, color: [37, 99, 235] },
            { label: 'Rata-rata Nilai', value: (data.gradeStats.overallAverage ?? 0).toFixed(1), color: [5, 150, 105] },
            { label: 'Kehadiran', value: `${(data.attendanceStats.hadirRate ?? 0).toFixed(0)}%`, color: [217, 119, 6] },
            { label: 'Pelanggaran', value: data.violationsStats.total, color: [220, 38, 38] },
        ]);
        autoTable(doc, tableBase({
            head: [['Indikator', 'Nilai']],
            body: [
                ['Total Siswa', `${data.students.length} siswa`],
                ['Komposisi Gender', `Laki-laki ${data.genderStats.male} - Perempuan ${data.genderStats.female}`],
                ['Rata-rata Nilai', `${(data.gradeStats.overallAverage ?? 0).toFixed(1)} (dari ${data.gradeStats.totalStudentsWithGrades} siswa bernilai)`],
                ['Tingkat Kehadiran', `${(data.attendanceStats.hadirRate ?? 0).toFixed(1)}%`],
                ['Total Pelanggaran', `${data.violationsStats.total} kasus - ${data.violationsStats.totalPoints} poin`],
                ['Penyelesaian Tugas', `${data.taskStats.done} dari ${data.taskStats.total} tugas selesai`],
                ['Siswa Perlu Perhatian', `${data.atRiskStudents.length} siswa`],
            ],
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65, fillColor: [248, 250, 252] }, 1: { halign: 'left' } },
        }));
        afterTable();
    }

    // ===== 2. Profil & Siswa Perlu Perhatian =====
    if (options.students) {
        heading('Profil Siswa');
        autoTable(doc, tableBase({
            head: [['Komposisi', 'Jumlah']],
            body: [
                ['Laki-laki', `${data.genderStats.male} siswa`],
                ['Perempuan', `${data.genderStats.female} siswa`],
                ['Total', `${data.students.length} siswa`],
            ],
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65, fillColor: [248, 250, 252] }, 1: { halign: 'right', cellWidth: 40 } },
        }));
        afterTable();
        ensureSpace(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...TEXT);
        doc.text('Siswa Perlu Perhatian', MARGIN, y);
        y += 2;
        if (data.atRiskStudents.length > 0) {
            autoTable(doc, tableBase({
                startY: y + 2,
                head: [['No', 'Nama Siswa', 'Alasan', 'Detail']],
                body: data.atRiskStudents.map((s, i) => [`${i + 1}`, s.student?.name ?? '-', s.reason ?? '-', s.details ?? '-']),
                headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2.8 },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 45, fontStyle: 'bold' }, 2: { cellWidth: 40 } },
            }));
            afterTable();
        } else {
            y += 4;
            doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MUTED);
            doc.text('Tidak ada siswa yang memerlukan perhatian khusus pada periode ini.', MARGIN, y);
            y += 8;
        }
    }

    // ===== 3. Rekapitulasi Kehadiran =====
    if (options.attendance) {
        heading('Rekapitulasi Kehadiran');
        const at = data.attendanceStats;
        const pct = (n: number) => at.total > 0 ? `${((n / at.total) * 100).toFixed(1)}%` : '0%';
        autoTable(doc, tableBase({
            head: [['Status', 'Jumlah', 'Persentase']],
            body: [
                ['Hadir', `${at.hadir}`, pct(at.hadir)],
                ['Izin', `${at.izin}`, pct(at.izin)],
                ['Sakit', `${at.sakit}`, pct(at.sakit)],
                ['Alpha', `${at.alpha}`, pct(at.alpha)],
                ['Total', `${at.total}`, '100%'],
            ],
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right', cellWidth: 40 }, 2: { halign: 'right', cellWidth: 40 } },
            didParseCell: (d: any) => { if (d.row.index === 4) { d.cell.styles.fillColor = [232, 240, 244]; d.cell.styles.fontStyle = 'bold'; } },
        }));
        afterTable();
    }

    // ===== 4. Distribusi Nilai Akademik =====
    if (options.grades) {
        heading('Distribusi Nilai Akademik');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(`Rata-rata nilai: ${(data.gradeStats.overallAverage ?? 0).toFixed(1)} - ${data.gradeStats.totalStudentsWithGrades} siswa memiliki nilai`, MARGIN, y);
        y += 4;
        autoTable(doc, tableBase({
            startY: y,
            head: [['Kategori', 'Rentang', 'Jumlah Siswa', 'Persentase']],
            body: data.gradeStats.distribution.map((d) => [d.label, d.range, `${d.count}`, `${d.percentage.toFixed(1)}%`]),
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 45 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        }));
        afterTable();
    }

    // ===== 5. Catatan Pelanggaran =====
    if (options.violations && data.violationsStats.total > 0) {
        heading('Catatan Pelanggaran');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(`Total ${data.violationsStats.total} kasus dengan akumulasi ${data.violationsStats.totalPoints} poin.`, MARGIN, y);
        y += 4;
        autoTable(doc, tableBase({
            startY: y,
            head: [['Jenis Pelanggaran', 'Jumlah Kasus']],
            body: data.violationsStats.byType.map((v) => [v.type, `${v.count}`]),
            headStyles: { fillColor: [153, 27, 27], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2.8 },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 45 } },
        }));
        afterTable();
    }

    // ===== 6. Poin Kuis & Aktivitas =====
    if (options.activities && data.quizPointsStats.total > 0) {
        heading('Poin Kuis & Aktivitas');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(`Total poin kuis terkumpul: ${data.quizPointsStats.total}.`, MARGIN, y);
        y += 4;
        autoTable(doc, tableBase({
            startY: y,
            head: [['Kategori', 'Jumlah', 'Poin']],
            body: data.quizPointsStats.byCategory.map((q) => [q.category, `${q.count}`, `${q.points}`]),
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 } },
        }));
        afterTable();
    }

    // ===== Signature block =====
    ensureSpace(45);
    y += 4;
    const sigRightX = pageWidth - MARGIN - 60;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TEXT);
    doc.text(`Madiun, ${today}`, sigRightX, y, { align: 'left' });
    y += 7;
    const sigLeftX = MARGIN + 4;
    doc.text('Mengetahui,', sigLeftX, y);
    doc.text('Penyusun Laporan,', sigRightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Kepala Madrasah', sigLeftX, y + 5);
    doc.setFont('helvetica', 'normal');
    y += 28;
    doc.setDrawColor(...TEXT); doc.setLineWidth(0.3);
    doc.line(sigLeftX, y, sigLeftX + 55, y);
    doc.line(sigRightX, y, sigRightX + 55, y);
    doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text('NIP. ........................', sigLeftX, y + 5);
    doc.text('NIP. ........................', sigRightX, y + 5);

    // ===== Footer on every page =====
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const fy = pageHeight - 12;
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
        doc.line(MARGIN, fy - 3, pageWidth - MARGIN, fy - 3);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
        doc.text('Portal Guru - Sistem Informasi Madrasah', MARGIN, fy);
        doc.text(`Dibuat otomatis: ${timestamp}`, pageWidth / 2, fy, { align: 'center' });
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - MARGIN, fy, { align: 'right' });
    }

    doc.save(`Laporan_Analitik_${data.selectedClassLabel.replace(/\s/g, '_')}_${today}.pdf`);
};
