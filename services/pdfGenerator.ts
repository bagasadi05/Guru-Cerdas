import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from './database.types';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type ReportRow = Database['public']['Tables']['reports']['Row'];
type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
type ViolationRow = Database['public']['Tables']['violations']['Row'];
type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'id' | 'name'> | null };

export type ReportData = {
    student: StudentWithClass,
    reports: ReportRow[],
    attendanceRecords: AttendanceRow[],
    academicRecords: AcademicRecordRow[],
    violations: ViolationRow[],
    quizPoints: QuizPointRow[],
};

type AppUser = {
    id: string;
    email?: string;
    name: string;
    avatarUrl: string;
}

const SCHOOL_CONFIG = {
    name: "MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN",
    address: "Jl. Diponegoro No. 123, Madiun, Jawa Timur", // Placeholder address
    phone: "(0351) 123456", // Placeholder phone
    logoUrl: "/logo.png" // Placeholder logo
};

export const generateStudentReport = (
    doc: jsPDF,
    reportData: ReportData,
    teacherNote: string,
    reportDate: string,
    semester: string,
    academicYear: string,
    user: AppUser | null
) => {
    const { student, academicRecords, quizPoints, violations, attendanceRecords } = reportData;

    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MARGIN = 15;
    let currentY = 0;

    const addHeader = (isFirstPage = false) => {
        // Header Background
        doc.setFillColor(30, 41, 59); // Dark blue
        doc.rect(0, 0, PAGE_WIDTH, 35, 'F');

        // School Name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("LAPORAN HASIL BELAJAR SISWA", PAGE_WIDTH / 2, 14, { align: 'center' });

        // School Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(SCHOOL_CONFIG.name, PAGE_WIDTH / 2, 22, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(209, 213, 219); // Light gray
        doc.text(`${SCHOOL_CONFIG.address} | Telp: ${SCHOOL_CONFIG.phone}`, PAGE_WIDTH / 2, 28, { align: 'center' });

        currentY = isFirstPage ? 45 : 40;
    };

    const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128); // Gray 500

            const footerText = `Halaman ${i} dari ${pageCount}`;
            const dateText = `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

            doc.text(footerText, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
            doc.text(dateText, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });

            // Decorative line
            doc.setDrawColor(229, 231, 235); // Gray 200
            doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);
        }
    };

    const checkPageBreak = (requiredSpace: number) => {
        if (currentY + requiredSpace > PAGE_HEIGHT - 20) {
            doc.addPage();
            addHeader(false);
        }
    };

    const drawSectionTitle = (title: string, bgColor = false) => {
        checkPageBreak(15);

        if (bgColor) {
            doc.setFillColor(243, 244, 246); // Gray 100
            doc.rect(MARGIN - 2, currentY - 6, PAGE_WIDTH - (MARGIN * 2) + 4, 12, 'F');
            doc.setTextColor(17, 24, 39); // Gray 900
        } else {
            doc.setTextColor(30, 41, 59);
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, MARGIN, currentY);

        // Underline
        if (!bgColor) {
            doc.setDrawColor(30, 41, 59);
            doc.setLineWidth(0.5);
            doc.line(MARGIN, currentY + 2, MARGIN + doc.getTextWidth(title), currentY + 2);
        }

        doc.setTextColor(30, 41, 59);
        currentY += 12;
    };

    addHeader(true);

    // Student Info Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const infoData = [
        ['Nama Siswa', ': ' + student.name, 'Tahun Ajaran', ': ' + academicYear],
        ['Kelas', ': ' + (student.classes?.name || 'N/A'), 'Semester', ': ' + semester],
        ['NIS/NISN', ': - / -', 'Fase', ': -'] // Placeholder for NIS/Fase
    ];

    autoTable(doc, {
        startY: currentY,
        body: infoData,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2,
            font: 'helvetica',
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 60 },
            2: { cellWidth: 30, fontStyle: 'bold' },
            3: { cellWidth: 'auto' }
        },
        margin: { left: MARGIN, right: MARGIN }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // A. Academic Records
    if (academicRecords.length > 0) {
        drawSectionTitle('A. Capaian Akademik', true);

        const getPredicate = (score: number) => {
            if (score >= 90) return 'A';
            if (score >= 80) return 'B';
            if (score >= 70) return 'C';
            if (score >= 60) return 'D';
            return 'E';
        };

        const groupedRecords: { [key: string]: AcademicRecordRow[] } = {};
        academicRecords.forEach(record => {
            const subject = record.subject || 'Lainnya';
            if (!groupedRecords[subject]) {
                groupedRecords[subject] = [];
            }
            groupedRecords[subject].push(record);
        });

        const academicBody: any[] = [];
        let rowNum = 1;

        Object.entries(groupedRecords).forEach(([subject, records]) => {
            records.forEach((record, index) => {
                academicBody.push([
                    rowNum++,
                    index === 0 ? subject : '',
                    record.assessment_name || '-',
                    record.score,
                    getPredicate(record.score),
                    record.notes || 'Capaian sesuai dengan nilai yang diperoleh.'
                ]);
            });
        });

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Mata Pelajaran', 'Penilaian', 'Nilai', 'Pred', 'Deskripsi Capaian']],
            body: academicBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [229, 231, 235],
                lineWidth: 0.1,
                font: 'helvetica',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 35, fontStyle: 'bold' },
                2: { cellWidth: 25 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 'auto' }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: MARGIN, right: MARGIN }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // B. Attendance & Behavior (Side by Side)
    drawSectionTitle('B. Absensi & Perilaku', true);

    const attendanceSummary = attendanceRecords.reduce((acc, record) => {
        if (record.status !== 'Hadir') {
            (acc as any)[record.status] = ((acc as any)[record.status] || 0) + 1;
        }
        return acc;
    }, { Sakit: 0, Izin: 0, Alpha: 0 });

    const tableStartY = currentY;
    const tableWidth = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;

    // Attendance Table
    autoTable(doc, {
        startY: tableStartY,
        head: [['Rekapitulasi Ketidakhadiran']],
        body: [
            [`Sakit: ${attendanceSummary.Sakit} hari`],
            [`Izin: ${attendanceSummary.Izin} hari`],
            [`Tanpa Keterangan: ${attendanceSummary.Alpha} hari`]
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [229, 231, 235],
            lineWidth: 0.1
        },
        tableWidth: tableWidth,
        margin: { left: MARGIN }
    });

    const leftTableFinalY = (doc as any).lastAutoTable.finalY;

    // Violations Table
    const violationBody = violations.length > 0
        ? violations.map(v => [`${v.description} (${v.points} poin)`])
        : [['Siswa menunjukkan sikap yang baik dan terpuji.']];

    autoTable(doc, {
        startY: tableStartY,
        head: [['Catatan Perilaku / Pelanggaran']],
        body: violationBody,
        theme: 'grid',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [229, 231, 235],
            lineWidth: 0.1
        },
        tableWidth: tableWidth,
        margin: { left: PAGE_WIDTH / 2 + 5 }
    });

    currentY = Math.max(leftTableFinalY, (doc as any).lastAutoTable.finalY) + 10;

    // C. Activities & Achievements
    if (quizPoints.length > 0) {
        drawSectionTitle('C. Keaktifan & Prestasi', true);

        const quizBody = quizPoints.map((q, index) => [
            index + 1,
            q.quiz_name,
            q.points,
            new Date(q.created_at).toLocaleDateString('id-ID')
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Kegiatan / Prestasi', 'Poin', 'Tanggal']],
            body: quizBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [229, 231, 235],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 30, halign: 'center' }
            },
            margin: { left: MARGIN, right: MARGIN }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // D. Teacher's Note
    drawSectionTitle(quizPoints.length > 0 ? 'D. Catatan Wali Kelas' : 'C. Catatan Wali Kelas', true);

    const noteText = teacherNote || 'Tidak ada catatan khusus untuk semester ini.';
    const noteLines = doc.splitTextToSize(noteText, PAGE_WIDTH - MARGIN * 2 - 10);
    const noteHeight = Math.max(noteLines.length * 6 + 10, 20);

    checkPageBreak(noteHeight);

    // Note Box
    doc.setDrawColor(209, 213, 219); // Gray 300
    doc.setLineWidth(0.1);
    doc.roundedRect(MARGIN, currentY, PAGE_WIDTH - MARGIN * 2, noteHeight, 2, 2, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(55, 65, 81); // Gray 700
    doc.text(noteLines, MARGIN + 5, currentY + 8);

    currentY += noteHeight + 15;

    // Signatures
    const signatureHeight = 40;
    checkPageBreak(signatureHeight);

    const col1X = MARGIN + 30;
    const col2X = PAGE_WIDTH - MARGIN - 50;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    doc.text('Mengetahui,', col1X, currentY, { align: 'center' });
    doc.text('Orang Tua / Wali', col1X, currentY + 5, { align: 'center' });

    const formattedDate = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Madiun, ${formattedDate}`, col2X, currentY, { align: 'center' });
    doc.text('Wali Kelas', col2X, currentY + 5, { align: 'center' });

    currentY += 35;

    // Signature Lines
    doc.setLineWidth(0.5);
    doc.line(col1X - 25, currentY, col1X + 25, currentY); // Parent line
    doc.line(col2X - 30, currentY, col2X + 30, currentY); // Teacher line

    doc.text('(___________________)', col1X, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    const teacherName = user?.name || '___________________';
    doc.text(teacherName, col2X, currentY + 5, { align: 'center' });
    // NIP placeholder
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NIP. -', col2X, currentY + 9, { align: 'center' });

    addFooter();
};
