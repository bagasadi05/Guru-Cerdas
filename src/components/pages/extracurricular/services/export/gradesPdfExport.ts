import { getJsPDF, getAutoTable } from '../../../../../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../../../../../utils/pdfHeaderUtils';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import { compareEnrollmentsByClassAndName } from '../../extracurricularUtils';
import type { ExportGradesOptions, AutoTableDoc } from './types';
export async function exportGradesPDF(options: ExportGradesOptions): Promise<void> {
    const { selectedExtracurricular, activeSemester, enrollments, gradesMap, gradeDrafts } = options;

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await ensureLogosLoaded();
    const headerY = addPdfHeader(doc, {
        schoolName: 'MI AL IRSYAD KOTA MADIUN',
        orientation: 'portrait',
    });

    const currentYear = new Date().getFullYear();
    const semesterName = activeSemester
        ? `${activeSemester.name} (Semester ${activeSemester.semester_number})`
        : 'Semester Ganjil';
    const academicYear = `${currentYear}/${currentYear + 1}`;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
        `DAFTAR NILAI EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`,
        pageWidth / 2,
        headerY,
        { align: 'center' }
    );
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
        `SEMESTER: ${semesterName.toUpperCase()} - TAHUN PELAJARAN ${academicYear}`,
        pageWidth / 2,
        headerY + 5,
        { align: 'center' }
    );
    doc.text(
        `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} • TOTAL SISWA: ${enrollments.length}`,
        pageWidth / 2,
        headerY + 9,
        { align: 'center' }
    );

    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.4);
    doc.line(14, headerY + 12, pageWidth - 14, headerY + 12);
    doc.setDrawColor(0, 0, 0);

    const tableBody = [...enrollments]
        .sort(compareEnrollmentsByClassAndName)
        .map((enrollment, index) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const grade = gradesMap[key];
            const draft = gradeDrafts[key];
            const resolvedGrade = draft?.grade ?? grade?.grade ?? '-';
            const resolvedScore =
                draft?.score !== undefined && draft.score.trim() !== ''
                    ? draft.score.trim()
                    : (grade?.score ?? '-');
            const resolvedDesc =
                draft?.description !== undefined && draft.description.trim() !== ''
                    ? draft.description.trim()
                    : grade?.description || '-';
            return [
                index + 1,
                enrollment.name,
                enrollment.className || '-',
                resolvedGrade,
                resolvedScore,
                resolvedDesc,
            ];
        });

    autoTable(doc, {
        head: [['NO', 'NAMA SISWA', 'KELAS', 'PREDIKAT', 'NILAI', 'DESKRIPSI']],
        body: tableBody,
        startY: headerY + 14,
        showHead: 'everyPage',
        margin: { top: 12, bottom: 46, left: 14, right: 14 },
        styles: { fontSize: 8.5, cellPadding: 1.5, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
            2: { cellWidth: 18 },
            3: { cellWidth: 18, fontStyle: 'bold' },
            4: { cellWidth: 15, fontStyle: 'bold' },
            5: { halign: 'left' },
        },
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: () => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
                `Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`,
                14,
                pageHeight - 6
            );
            doc.text(
                `Halaman ${doc.internal.pages!.length - 1}`,
                pageWidth - 25,
                pageHeight - 6
            );
        },
    });

    const finalY = (doc as unknown as AutoTableDoc).lastAutoTable?.finalY || headerY + 20;
    const rightColX = pageWidth - 50;
    const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
    doc.text(
        `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`,
        rightColX,
        finalY + 10.5,
        { align: 'center' }
    );

    const coachDisplay =
        selectedExtracurricular.coach_name?.trim() ||
        '....................................';
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });

    doc.save(
        `Nilai_${selectedExtracurricular.name.replace(/\s+/g, '_')}_${formatExportDate()}.pdf`
    );
}