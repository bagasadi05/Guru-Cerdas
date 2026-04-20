import { getAutoTable, getJsPDF } from '../../utils/dynamicImports';
import type { PortalData, PortalGuardianSummary, PortalWeeklySummary } from '../pages/portal/types';

interface GuardianSummaryPdfOptions {
    guardianSummary: PortalGuardianSummary | null;
    weeklySummary: PortalWeeklySummary | null;
    semesterLabel: string;
}

const countAttendance = (data: PortalData, status: string) => (
    data.attendanceRecords.filter((record) => record.status.toLowerCase() === status.toLowerCase()).length
);

export const generateGuardianSummaryPDF = async (
    data: PortalData,
    options: GuardianSummaryPdfOptions
): Promise<void> => {
    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    const schoolName = data.schoolInfo?.school_name || 'Sekolah';
    const academicYear = data.schoolInfo?.academic_year || '-';
    const guardianSummary = options.guardianSummary;
    const weeklySummary = options.weeklySummary;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RINGKASAN PERKEMBANGAN SISWA', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(11);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Tahun Ajaran: ${academicYear} | ${options.semesterLabel}`, pageWidth / 2, 29, { align: 'center' });
    doc.line(margin, 34, pageWidth - margin, 34);

    autoTable(doc, {
        startY: 40,
        body: [
            ['Nama Siswa', data.student.name],
            ['Kelas', data.student.classes.name],
            ['Wali/Orang Tua', data.student.parent_name || '-'],
            ['Kontak Wali', data.student.parent_phone || '-'],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 130 },
        },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. Kesimpulan Untuk Wali Murid', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const summaryText = guardianSummary
        ? `${guardianSummary.title}. ${guardianSummary.message}`
        : 'Belum ada kesimpulan yang dapat dibuat dari data siswa.';
    doc.text(doc.splitTextToSize(summaryText, pageWidth - margin * 2), margin, y);
    y += 18;

    if (guardianSummary) {
        autoTable(doc, {
            startY: y,
            head: [['Indikator', 'Nilai', 'Keterangan']],
            body: guardianSummary.highlights.map((item) => [item.label, item.value, item.description]),
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 100 },
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. Ringkasan Mingguan', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(weeklySummary?.narrative || 'Belum ada ringkasan mingguan.', pageWidth - margin * 2), margin, y);
    y += 16;

    autoTable(doc, {
        startY: y,
        head: [['Kehadiran', 'Nilai Akademik', 'Tugas', 'Catatan']],
        body: [[
            `Hadir ${countAttendance(data, 'Hadir')}, Sakit ${countAttendance(data, 'Sakit')}, Izin ${countAttendance(data, 'Izin')}, Alpha ${countAttendance(data, 'Alpha')}`,
            `${data.academicRecords.length} nilai tercatat`,
            `${data.tasks.filter((task) => task.status !== 'done').length} tugas aktif`,
            `${data.violations.length} catatan perilaku`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. Saran Tindak Lanjut', margin, y);
    y += 6;

    const suggestions = weeklySummary?.suggestions?.length
        ? weeklySummary.suggestions
        : guardianSummary?.actions.map((action) => `${action.label}: ${action.description}`) || ['Pertahankan komunikasi rutin antara wali murid, siswa, dan guru.'];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    suggestions.forEach((suggestion, index) => {
        doc.text(doc.splitTextToSize(`${index + 1}. ${suggestion}`, pageWidth - margin * 2), margin, y);
        y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Dicetak pada ${new Date().toLocaleDateString('id-ID')}`, margin, 287);

    const safeName = data.student.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    doc.save(`ringkasan-wali-${safeName || 'siswa'}.pdf`);
};

export default generateGuardianSummaryPDF;
