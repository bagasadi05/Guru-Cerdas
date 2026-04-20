/**
 * PDF Report Generator Service
 * 
 * This module provides functionality for generating professional PDF student reports
 * using jsPDF and autoTable. Reports include academic performance, attendance,
 * behavior records, and teacher notes formatted according to Indonesian school standards.
 * 
 * @module services/pdfGenerator
 * @since 1.0.0
 */

import type jsPDF from 'jspdf';
import { getAutoTable } from '../utils/dynamicImports';
import { Database } from './database.types';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type ReportRow = Database['public']['Tables']['reports']['Row'];
type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
type ViolationRow = Database['public']['Tables']['violations']['Row'];
type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

/**
 * Student data with associated class information.
 * 
 * @typedef {Object} StudentWithClass
 * @property {Object | null} classes - Class information including id and name
 */
type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'id' | 'name'> | null };

/**
 * Complete data package for generating a student report.
 * 
 * This type aggregates all necessary information from multiple database tables
 * to generate a comprehensive student performance report.
 * 
 * @typedef {Object} ReportData
 * @property {StudentWithClass} student - Student information with class details
 * @property {ReportRow[]} reports - Historical report records
 * @property {AttendanceRow[]} attendanceRecords - Attendance history
 * @property {AcademicRecordRow[]} academicRecords - Academic performance records
 * @property {ViolationRow[]} violations - Behavioral violation records
 * @property {QuizPointRow[]} quizPoints - Quiz and activity points
 * 
 * @since 1.0.0
 */
export type ReportData = {
    student: StudentWithClass,
    reports: ReportRow[],
    attendanceRecords: AttendanceRow[],
    academicRecords: AcademicRecordRow[],
    violations: ViolationRow[],
    quizPoints: QuizPointRow[],
};

/**
 * Application user information for report signatures.
 * 
 * @typedef {Object} AppUser
 * @property {string} id - User's unique identifier
 * @property {string} [email] - User's email address
 * @property {string} name - User's full name (used for teacher signature)
 * @property {string} avatarUrl - URL to user's avatar image
 * 
 * @since 1.0.0
 */
type AppUser = {
    id: string;
    email?: string;
    name: string;
    avatarUrl: string;
}

/**
 * School configuration for report headers.
 * 
 * This configuration object contains school branding and contact information
 * that appears in the header of generated reports.
 * 
 * @constant {Object}
 * @property {string} name - Official school name
 * @property {string} address - School physical address
 * @property {string} phone - School contact phone number
 * @property {string} logoUrl - Path to school logo image
 * 
 * @since 1.0.0
 */
const SCHOOL_CONFIG = {
    name: "MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN",
    address: "Jl. Diponegoro No. 123, Madiun, Jawa Timur", // Placeholder address
    phone: "(0351) 123456", // Placeholder phone
    logoUrl: "/logo_sekolah.png", // School logo
    kemenagLogoUrl: "/logo_kemenag.png" // Kemenag logo
};

const DEFAULT_ACADEMIC_DESCRIPTION = 'Capaian sesuai dengan nilai yang diperoleh.';

const getAcademicPredicate = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
};

const sanitizeAcademicDescription = (note?: string | null) => (
    (note || '')
        .replace(/\[\s*semester[^\]]*\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
);

const formatAcademicDescription = (note?: string | null) => {
    const cleanedNote = sanitizeAcademicDescription(note);
    return cleanedNote || DEFAULT_ACADEMIC_DESCRIPTION;
};

const summarizeQuizPoints = (items: QuizPointRow[]) => {
    const grouped = new Map<string, { activity: string; count: number; totalPoints: number }>();

    items.forEach((item) => {
        const activity = item.quiz_name || item.category || 'Aktivitas';
        const current = grouped.get(activity);

        if (current) {
            current.count += 1;
            current.totalPoints += item.points;
            return;
        }

        grouped.set(activity, {
            activity,
            count: 1,
            totalPoints: item.points
        });
    });

    return Array.from(grouped.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.activity.localeCompare(b.activity, 'id');
    });
};

const summarizeViolations = (items: ViolationRow[]) => {
    const grouped = new Map<string, { note: string; count: number; totalPoints: number }>();

    items.forEach((item) => {
        const note = item.description?.trim() || 'Catatan perilaku';
        const current = grouped.get(note);

        if (current) {
            current.count += 1;
            current.totalPoints += item.points;
            return;
        }

        grouped.set(note, {
            note,
            count: 1,
            totalPoints: item.points
        });
    });

    return Array.from(grouped.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.note.localeCompare(b.note, 'id');
    });
};

/**
 * Generates a comprehensive student performance report in PDF format.
 * 
 * This function creates a professionally formatted PDF report containing:
 * - School header with branding
 * - Student information (name, class, academic year, semester)
 * - Academic achievements with grades and predicates (A-E)
 * - Attendance summary and absence breakdown
 * - Behavioral records and violations
 * - Activities and achievements (quiz points)
 * - Teacher's notes and observations
 * - Signature sections for parent and teacher
 * 
 * The report follows Indonesian educational standards with Indonesian language labels
 * and formatting. It includes automatic page breaks, headers/footers on each page,
 * and professional styling with tables and color-coded sections.
 * 
 * @param {jsPDF} doc - jsPDF document instance to write to
 * @param {ReportData} reportData - Complete student data including all records
 * @param {string} teacherNote - Teacher's comments and observations for the report period
 * @param {string} reportDate - Date the report is issued (ISO format or date string)
 * @param {string} semester - Semester identifier (e.g., "Semester 1", "Semester 2")
 * @param {string} academicYear - Academic year (e.g., "2024/2025")
 * @param {AppUser | null} user - Current user (teacher) information for signature, or null
 * 
 * @returns {void} The function modifies the doc parameter in place
 * 
 * @example
 * ```typescript
 * import jsPDF from 'jspdf';
 * import { generateStudentReport } from './services/pdfGenerator';
 * 
 * const doc = new jsPDF();
 * const reportData = {
 *   student: studentWithClass,
 *   reports: [],
 *   attendanceRecords: attendanceData,
 *   academicRecords: gradesData,
 *   violations: violationsData,
 *   quizPoints: quizData
 * };
 * 
 * generateStudentReport(
 *   doc,
 *   reportData,
 *   'Siswa menunjukkan perkembangan yang baik.',
 *   '2024-12-06',
 *   'Semester 1',
 *   '2024/2025',
 *   currentUser
 * );
 * 
 * // Save or display the PDF
 * doc.save('student-report.pdf');
 * ```
 * 
 * @since 1.0.0
 */
// Preload logos as base64 (loaded once when module imports)
let cachedLogoDataUrl: string | null = null;
let cachedKemenagLogoUrl: string | null = null;
let logoLoadAttempted = false;

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const fullUrl = `${window.location.origin}${url}`;
        const response = await fetch(fullUrl);
        const blob = await response.blob();

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Image could not be loaded:', url, e);
        return null;
    }
};

const preloadLogos = async (): Promise<void> => {
    if (logoLoadAttempted) return;
    logoLoadAttempted = true;

    // Load both logos in parallel
    const [schoolLogo, kemenagLogo] = await Promise.all([
        loadImageAsBase64(SCHOOL_CONFIG.logoUrl),
        loadImageAsBase64(SCHOOL_CONFIG.kemenagLogoUrl)
    ]);

    cachedLogoDataUrl = schoolLogo;
    cachedKemenagLogoUrl = kemenagLogo;
};

// Export function to preload logos before PDF generation
export const ensureLogoLoaded = async (): Promise<void> => {
    await preloadLogos();
};

export const generateStudentReport = async (
    doc: jsPDF,
    reportData: ReportData,
    teacherNote: string,
    reportDate: string,
    semester: string,
    academicYear: string,
    user: AppUser | null
): Promise<void> => {
    await preloadLogos();
    const { default: autoTable } = await getAutoTable();
    const { student, academicRecords, quizPoints, violations, attendanceRecords } = reportData;

    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MARGIN = 15;
    const PRIMARY = [12, 74, 110] as const;
    const PRIMARY_DARK = [7, 54, 66] as const;
    const BORDER = [203, 213, 225] as const;
    const MUTED = [71, 85, 105] as const;
    let currentY = 0;

    const addHeader = (isFirstPage = false) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, PAGE_WIDTH, 46, 'F');

        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN - 3, 8, PAGE_WIDTH - ((MARGIN - 3) * 2), 28, 2, 2, 'S');

        const schoolLogoSize = 22;
        const kemenagLogoWidth = 18;
        const kemenagLogoHeight = 18 * (323 / 360);

        if (cachedLogoDataUrl) {
            try {
                doc.addImage(cachedLogoDataUrl, 'PNG', MARGIN - 1, 10, schoolLogoSize, schoolLogoSize);
            } catch (e) {
                console.warn('Could not add school logo to PDF', e);
            }
        }

        if (cachedKemenagLogoUrl) {
            try {
                doc.addImage(
                    cachedKemenagLogoUrl,
                    'PNG',
                    PAGE_WIDTH - MARGIN - kemenagLogoWidth,
                    11 + ((18 - kemenagLogoHeight) / 2),
                    kemenagLogoWidth,
                    kemenagLogoHeight
                );
            } catch (e) {
                console.warn('Could not add Kemenag logo to PDF', e);
            }
        }

        doc.setTextColor(...PRIMARY_DARK);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', PAGE_WIDTH / 2, 14, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text('MADRASAH IBTIDAIYAH', PAGE_WIDTH / 2, 18.5, { align: 'center' });

        doc.setTextColor(...PRIMARY_DARK);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("LAPORAN HASIL BELAJAR SISWA", PAGE_WIDTH / 2, 24.5, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(SCHOOL_CONFIG.name, PAGE_WIDTH / 2, 29.5, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(`${SCHOOL_CONFIG.address} | Telp. ${SCHOOL_CONFIG.phone}`, PAGE_WIDTH / 2, 34.5, { align: 'center' });

        doc.setDrawColor(...PRIMARY_DARK);
        doc.setLineWidth(0.9);
        doc.line(MARGIN - 3, 39, PAGE_WIDTH - (MARGIN - 3), 39);
        doc.setLineWidth(0.25);
        doc.line(MARGIN - 3, 40.4, PAGE_WIDTH - (MARGIN - 3), 40.4);

        currentY = isFirstPage ? 49 : 46;
    };

    const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...MUTED);

            const footerText = `Halaman ${i} dari ${pageCount}`;
            const dateText = `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

            doc.text(footerText, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
            doc.text(dateText, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });

            // Decorative line
            doc.setDrawColor(...BORDER);
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
            doc.setFillColor(...PRIMARY);
            doc.roundedRect(MARGIN - 2, currentY - 6, PAGE_WIDTH - (MARGIN * 2) + 4, 10, 1.5, 1.5, 'F');
            doc.setTextColor(255, 255, 255);
        } else {
            doc.setTextColor(...PRIMARY_DARK);
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, MARGIN, currentY - 0.5);

        // Underline
        if (!bgColor) {
            doc.setDrawColor(...PRIMARY_DARK);
            doc.setLineWidth(0.5);
            doc.line(MARGIN, currentY + 2, MARGIN + doc.getTextWidth(title), currentY + 2);
        }

        doc.setTextColor(...PRIMARY_DARK);
        currentY += 10;
    };

    addHeader(true);

    // Student Info Section
    doc.setDrawColor(...BORDER);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN, currentY - 1, PAGE_WIDTH - (MARGIN * 2), 23, 2, 2, 'FD');
    doc.setTextColor(...PRIMARY_DARK);
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
            cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
            font: 'helvetica',
            textColor: [...PRIMARY_DARK]
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold', textColor: [...MUTED] },
            1: { cellWidth: 60 },
            2: { cellWidth: 30, fontStyle: 'bold', textColor: [...MUTED] },
            3: { cellWidth: 'auto' }
        },
        margin: { left: MARGIN, right: MARGIN }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // A. Academic Records
    if (academicRecords.length > 0) {
        drawSectionTitle('A. Capaian Akademik', true);

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
            academicBody.push([
                {
                    content: `Mata Pelajaran: ${subject}`,
                    colSpan: 6,
                    styles: {
                        fillColor: [232, 240, 247],
                        textColor: [...PRIMARY_DARK],
                        fontStyle: 'bold',
                        halign: 'left',
                        valign: 'middle',
                        cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 4 },
                        lineColor: [...BORDER],
                        lineWidth: 0.25
                    }
                }
            ]);

            records.forEach((record, index) => {
                academicBody.push([
                    rowNum++,
                    index === 0 ? subject : '',
                    record.assessment_name || '-',
                    record.score,
                    getAcademicPredicate(record.score),
                    index === 0 ? formatAcademicDescription(record.notes) : ''
                ]);
            });
        });

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Mata Pelajaran', 'Penilaian', 'Nilai', 'Pred', 'Deskripsi Capaian']],
            body: academicBody,
            theme: 'grid',
            headStyles: {
                fillColor: [...PRIMARY_DARK],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [...BORDER],
                lineWidth: 0.15,
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
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: MARGIN, right: MARGIN }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    drawSectionTitle('B. Rekap Ketidakhadiran', true);

    const attendanceSummary = attendanceRecords.reduce((acc, record) => {
        if (record.status !== 'Hadir') {
            (acc as any)[record.status] = ((acc as any)[record.status] || 0) + 1;
        }
        return acc;
    }, { Sakit: 0, Izin: 0, Alpha: 0 });

    autoTable(doc, {
        startY: currentY,
        head: [['Jenis Ketidakhadiran', 'Jumlah']],
        body: [
            ['Sakit', `${attendanceSummary.Sakit} hari`],
            ['Izin', `${attendanceSummary.Izin} hari`],
            ['Tanpa Keterangan', `${attendanceSummary.Alpha} hari`]
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [...PRIMARY_DARK],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [...BORDER],
            lineWidth: 0.15
        },
        columnStyles: {
            0: { cellWidth: 95 },
            1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: MARGIN, right: PAGE_WIDTH - MARGIN - 130 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    drawSectionTitle('C. Catatan Perilaku', true);
    const summarizedViolations = summarizeViolations(violations);
    const violationBody = summarizedViolations.length > 0
        ? summarizedViolations.map((v, index) => [index + 1, v.note, `${v.count}x`, `${v.totalPoints} poin`])
        : [[1, 'Siswa menunjukkan sikap yang baik dan terpuji selama pembelajaran.', '-', '-']];

    autoTable(doc, {
        startY: currentY,
        head: [['No', 'Catatan', 'Frekuensi', 'Total Poin']],
        body: violationBody,
        theme: 'grid',
        headStyles: {
            fillColor: [...PRIMARY_DARK],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [...BORDER],
            lineWidth: 0.15
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 28, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: MARGIN, right: MARGIN }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // C. Activities & Achievements
    if (quizPoints.length > 0) {
        drawSectionTitle('D. Keaktifan & Prestasi', true);
        const summarizedQuizPoints = summarizeQuizPoints(quizPoints);

        const quizBody = summarizedQuizPoints.map((q, index) => [
            index + 1,
            q.activity,
            `${q.count}x`,
            q.totalPoints
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Kegiatan / Prestasi', 'Frekuensi', 'Total Poin']],
            body: quizBody,
            theme: 'grid',
            headStyles: {
                fillColor: [...PRIMARY_DARK],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [...BORDER],
                lineWidth: 0.15
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 28, halign: 'center' },
                3: { cellWidth: 28, halign: 'center' }
            },
            margin: { left: MARGIN, right: MARGIN }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // D. Teacher's Note
    drawSectionTitle(quizPoints.length > 0 ? 'E. Catatan Wali Kelas' : 'D. Catatan Wali Kelas', true);

    const noteText = teacherNote || 'Tidak ada catatan khusus untuk semester ini.';
    const noteWidth = PAGE_WIDTH - MARGIN * 2 - 10;

    // Calculate height first using splitTextToSize just for the box height calculation
    const noteLines = doc.splitTextToSize(noteText, noteWidth);
    const lineHeightFactor = 1.5;
    const fontSize = 10;
    // Approximate height calculation: lines * fontSize * lineHeightFactor (converting points to mm roughly)
    // 1 pt = 0.352778 mm. 
    const lineHeightMm = fontSize * lineHeightFactor * 0.3528;
    const noteHeight = Math.max(noteLines.length * lineHeightMm + 15, 25);

    checkPageBreak(noteHeight);

    // Note Box
    doc.setDrawColor(...BORDER);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.15);
    doc.roundedRect(MARGIN, currentY, PAGE_WIDTH - MARGIN * 2, noteHeight, 2, 2, 'FD');

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MUTED);

    // Justify text
    doc.text(noteText, MARGIN + 5, currentY + 10, {
        maxWidth: noteWidth,
        align: 'justify',
        lineHeightFactor: lineHeightFactor
    });

    currentY += noteHeight + 12;

    const signatureSectionTitle = quizPoints.length > 0 ? 'F. Pengesahan' : 'E. Pengesahan';
    drawSectionTitle(signatureSectionTitle, true);

    const signatureHeight = 49;
    checkPageBreak(signatureHeight + 2);

    const signatureBoxY = currentY - 1;
    const signatureBoxWidth = PAGE_WIDTH - MARGIN * 2;
    const signatureBoxHeight = signatureHeight;
    const halfWidth = signatureBoxWidth / 2;
    const leftCenterX = MARGIN + halfWidth / 2;
    const rightCenterX = MARGIN + halfWidth + halfWidth / 2;
    const formattedDate = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setDrawColor(...BORDER);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(MARGIN, signatureBoxY, signatureBoxWidth, signatureBoxHeight, 2, 2, 'FD');

    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, signatureBoxY, signatureBoxWidth, 9, 'F');
    doc.setLineWidth(0.15);
    doc.line(MARGIN + halfWidth, signatureBoxY, MARGIN + halfWidth, signatureBoxY + signatureBoxHeight);
    doc.line(MARGIN, signatureBoxY + 9, MARGIN + signatureBoxWidth, signatureBoxY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY_DARK);
    doc.text('PIHAK ORANG TUA / WALI', leftCenterX, signatureBoxY + 6, { align: 'center' });
    doc.text('WALI KELAS', rightCenterX, signatureBoxY + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Mengetahui,', leftCenterX, signatureBoxY + 15, { align: 'center' });
    doc.text(`Madiun, ${formattedDate}`, rightCenterX, signatureBoxY + 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_DARK);
    doc.text('Orang Tua / Wali Murid', leftCenterX, signatureBoxY + 21, { align: 'center' });
    doc.text('Guru Kelas / Wali Kelas', rightCenterX, signatureBoxY + 21, { align: 'center' });

    const signatureLineY = signatureBoxY + 36;
    doc.setLineWidth(0.35);
    doc.line(leftCenterX - 26, signatureLineY, leftCenterX + 26, signatureLineY);
    doc.line(rightCenterX - 28, signatureLineY, rightCenterX + 28, signatureLineY);

    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('(....................................)', leftCenterX, signatureLineY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_DARK);
    const teacherName = user?.name || '....................................';
    doc.text(teacherName, rightCenterX, signatureLineY + 5.5, {
        align: 'center',
        maxWidth: halfWidth - 16
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('NIP. -', rightCenterX, signatureLineY + 10, { align: 'center' });

    currentY = signatureBoxY + signatureBoxHeight + 6;

    addFooter();
};
