/**
 * PDF summary export for the grade completion (Audit Kelengkapan Nilai) section.
 *
 * Generates a printable summary of students who have not been graded for the
 * scheduled ASH / PH assessments, based on the same completion analysis the
 * component renders (no recomputation — caller passes the analyzed result).
 *
 * @module components/pages/analytics/academic/gradeCompletionPdf
 */

import type { StudentMissingGrades } from '../../../../services/academicAnalyticsService';
import { addPdfHeader, ensureLogosLoaded } from '../../../../utils/pdfHeaderUtils';
import { getAutoTable } from '../../../../utils/dynamicImports';

export interface GradeCompletionPdfParams {
    schoolName: string;
    /** 'Semua Kelas' or the selected class name. */
    classLabel: string;
    /** 'Hanya ASH / PH' or 'Semua Penilaian'. */
    scopeLabel: string;
    /** 'Semua Mapel' or the selected subject. */
    subjectLabel: string;
    /** '' for all assessments or the selected assessment name. */
    assessmentLabel: string;
    completionPercentage: number;
    totalStudents: number;
    missingStudents: StudentMissingGrades[];
}

const sanitizeFileNameSegment = (value: string): string =>
    value
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 40) || 'Semua_Kelas';

export async function exportGradeCompletionSummaryPDF(params: GradeCompletionPdfParams): Promise<void> {
    const {
        schoolName,
        classLabel,
        scopeLabel,
        subjectLabel,
        assessmentLabel,
        completionPercentage,
        totalStudents,
        missingStudents,
    } = params;

    await ensureLogosLoaded();

    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        getAutoTable(),
    ]);

    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;

    let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' }) + 4;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(23, 23, 23);
    doc.text('RANGKUMAN SISWA BELUM DINILAI ASH / PH', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const metaRows: Array<[string, string]> = [
        ['Kelas', classLabel],
        ['Cakupan', scopeLabel],
        ['Mata Pelajaran', subjectLabel],
        ['Asesmen', assessmentLabel || 'Semua asesmen terdaftar'],
        ['Tingkat Kelengkapan', `${completionPercentage.toFixed(1)}% dari ${totalStudents} siswa`],
        [
            'Tanggal Cetak',
            new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        ],
    ];
    metaRows.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, margin, y);
        y += 5;
    });

    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidthRight(doc) - margin, y);
    y += 8;

    if (missingStudents.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(21, 94, 117);
        doc.text('Tidak ada siswa dengan penilaian tertunda pada cakupan ini.', margin, y);
        doc.save(buildFileName(classLabel));
        return;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(23, 23, 23);
    doc.text(`Daftar siswa (${missingStudents.length} siswa)`, margin, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['No', 'Nama Siswa', 'Kelas', 'Penilaian Belum Terisi', 'Jumlah']],
        body: missingStudents.map((student, index) => [
            String(index + 1),
            student.studentName,
            student.className,
            student.missingItems
                .map((item) => `${item.subject} — ${item.assessmentName}`)
                .join('\n'),
            String(student.missingItems.length),
        ]),
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2,
            textColor: [30, 41, 59],
        },
        headStyles: {
            fillColor: [180, 83, 9],
            textColor: [255, 255, 255],
            fontSize: 8.5,
        },
        alternateRowStyles: {
            fillColor: [254, 249, 239],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 48 },
            2: { cellWidth: 24 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 16, halign: 'center' },
        },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
        'Dokumen dihasilkan otomatis oleh Portal Guru. Gunakan tombol "Input Nilai" untuk melengkapi penilaian.',
        margin,
        y,
    );

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Halaman ${page} dari ${totalPages}`,
            pageWidthRight(doc) - margin,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'right' },
        );
    }

    doc.save(buildFileName(classLabel));
}

function pageWidthRight(doc: { internal: { pageSize: { getWidth(): number } } }): number {
    return doc.internal.pageSize.getWidth();
}

function buildFileName(classLabel: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `Rangkuman_Belum_PH_ASH_${sanitizeFileNameSegment(classLabel)}_${date}.pdf`;
}
