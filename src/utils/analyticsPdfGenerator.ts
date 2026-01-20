import type jsPDF from 'jspdf';
import { getAutoTable, getJsPDF } from './dynamicImports';
import { ExportOptions } from '../components/pages/analytics/AnalyticsExportModal';

// Extend jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

interface AnalyticsData {
    students: any[];
    classStats: any[];
    attendanceStats: any;
    gradeStats: any;
    taskStats: any;
    violationsStats: any;
    quizPointsStats: any;
    atRiskStudents: any[];
    genderStats: any;
    selectedClassLabel: string;
    dateRangeLabel: string;
}

export const generateAnalyticsPdf = async (data: AnalyticsData, options: ExportOptions) => {
    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- Header ---
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Analitik Kelas', 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Portal Guru - Generated on ${today}`, 15, 30);

    // Right side header info
    doc.setFontSize(10);
    doc.text(`Kelas: ${data.selectedClassLabel}`, pageWidth - 15, 20, { align: 'right' });
    doc.text(`Rentang Waktu: ${data.dateRangeLabel}`, pageWidth - 15, 25, { align: 'right' });

    let finalY = 45;

    // --- 1. Ringkasan (Summary) ---
    if (options.summary) {
        doc.setTextColor(51, 65, 85); // Slate 700
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Ringkasan Dashboard', 15, finalY);
        finalY += 3;

        const summaryData = [
            ['Total Siswa', `${data.students.length} Siswa`],
            ['Kehadiran Rata-rata', `${data.attendanceStats.hadirRate}%`],
            ['Rata-rata Nilai', data.gradeStats.overallAverage],
            ['Tugas Selesai', `${data.taskStats.done} / ${data.taskStats.total}`],
            ['Total Pelanggaran', data.violationsStats.total],
            ['Siswa Berisiko', `${data.atRiskStudents.length} Siswa`]
        ];

        autoTable(doc, {
            startY: finalY + 2,
            head: [['Metrik', 'Nilai']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // Indigo 600
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
            margin: { left: 15, right: 15 }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- 2. Data Siswa ---
    if (options.students) {
        // Check for page break
        if (finalY > 250) { doc.addPage(); finalY = 20; }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('2. Data Siswa', 15, finalY);
        finalY += 3;

        // Gender & Risk Summary
        const riskText = data.atRiskStudents.length > 0
            ? `Perlu Perhatian: ${data.atRiskStudents.map((i: any) => i.student?.name).join(', ')}`
            : 'Tidak ada siswa berisiko tinggi.';

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Laki-laki: ${data.genderStats.male} | Perempuan: ${data.genderStats.female}`, 15, finalY + 5);

        const splitRisk = doc.splitTextToSize(riskText, pageWidth - 30);
        doc.text(splitRisk, 15, finalY + 10);
        finalY += 10 + (splitRisk.length * 4);

        if (data.atRiskStudents.length > 0) {
            autoTable(doc, {
                startY: finalY + 2,
                head: [['Nama Siswa', 'Kategori Risiko', 'Detail']],
                body: data.atRiskStudents.map((item: any) => [
                    item.student?.name || 'Unknown',
                    item.reason === 'attendance' ? 'Kehadiran Buruk' : item.reason === 'academic' ? 'Nilai Rendah' : 'Kombinasi',
                    item.details
                ]),
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] }, // Red 500
                styles: { fontSize: 9 },
                margin: { left: 15, right: 15 }
            });
            finalY = doc.lastAutoTable.finalY + 10;
        }
    }

    // --- 3. Kehadiran ---
    if (options.attendance) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('3. Laporan Kehadiran', 15, finalY);
        finalY += 5;

        const attendData = [
            ['Hadir', data.attendanceStats.hadir, `${data.attendanceStats.hadirRate}%`],
            ['Izin', data.attendanceStats.izin, '-'],
            ['Sakit', data.attendanceStats.sakit, '-'],
            ['Alpha', data.attendanceStats.alpha, '-'],
            ['Total Pertemuan/Catatan', data.attendanceStats.total, '100%']
        ];

        autoTable(doc, {
            startY: finalY,
            head: [['Status', 'Jumlah', 'Persentase']],
            body: attendData,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] }, // Green 500
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } },
            margin: { left: 15, right: 15 }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- 4. Nilai Akademik ---
    if (options.grades) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('4. Analisis Nilai Akademik', 15, finalY);
        finalY += 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rata-rata Kelas: ${data.gradeStats.overallAverage} (dari ${data.gradeStats.totalStudentsWithGrades} siswa)`, 15, finalY);
        finalY += 5;

        const gradeDist = data.gradeStats.distribution.map((d: any) => [
            d.label, d.range, d.count, `${d.percentage}%`
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [['Unsur Penilaian', 'Rentang Nilai', 'Jumlah Siswa', 'Persentase']],
            body: gradeDist,
            theme: 'grid',
            headStyles: { fillColor: [234, 179, 8] }, // Yellow 500
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } },
            margin: { left: 15, right: 15 }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- 5. Pelanggaran ---
    if (options.violations && data.violationsStats.total > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('5. Laporan Pelanggaran', 15, finalY);
        finalY += 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Pelanggaran: ${data.violationsStats.total} Kasus (${data.violationsStats.totalPoints} Poin)`, 15, finalY);
        finalY += 5;

        const violData = data.violationsStats.byType.map((v: any) => [v.type, v.count]);

        autoTable(doc, {
            startY: finalY,
            head: [['Jenis Pelanggaran', 'Frekuensi']],
            body: violData,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68] }, // Red 500
            styles: { fontSize: 10 },
            margin: { left: 15, right: 15 }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- 6. Keaktifan (Activities) ---
    if (options.activities && data.quizPointsStats.total > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('6. Keaktifan & Poin', 15, finalY);
        finalY += 5;

        const actData = data.quizPointsStats.byCategory.map((c: any) => [c.category, c.count, c.points]);

        autoTable(doc, {
            startY: finalY,
            head: [['Kategori', 'Jumlah Aktivitas', 'Total Poin Diperoleh']],
            body: actData,
            theme: 'striped',
            headStyles: { fillColor: [6, 182, 212] }, // Cyan 500
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } },
            margin: { left: 15, right: 15 }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
    }

    doc.save(`Laporan_Analitik_${data.selectedClassLabel.replace(/\s/g, '_')}_${today}.pdf`);
};
