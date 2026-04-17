/**
 * Service for exporting student violation data.
 * Supports PDF (Formal Report) and Excel (Structured Data).
 */

import { getAutoTable, getJsPDF, getXLSX } from '../utils/dynamicImports';
import { ViolationRow } from '../components/pages/student/types';
import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';

interface ViolationExportOptions {
    studentName: string;
    className?: string; // Optional if not provided
    schoolName: string;
    violations: ViolationRow[];
    teacherName?: string;
}

const formatExportDate = () =>
    new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

const getTotalViolationPoints = (violations: ViolationRow[]) =>
    violations.reduce((sum, violation) => sum + violation.points, 0);

const getTeacherSignatureText = (teacherName?: string) =>
    teacherName?.trim() ? `(${teacherName.trim()})` : '(___________________)';

const addSignatureBlocks = (
    doc: {
        setFontSize: (size: number) => void;
        setFont: (fontName: string, fontStyle: string) => void;
        text: (text: string, x: number, y: number, options?: { align?: 'center' | 'left' | 'right' }) => void;
        line: (x1: number, y1: number, x2: number, y2: number) => void;
    },
    pageWidth: number,
    signatureY: number,
    teacherName?: string
) => {
    const lineWidth = 60;
    const leftX = 50;
    const rightX = pageWidth - 50;
    const signatureLineY = signatureY + 30;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text('Mengetahui,', leftX, signatureY, { align: 'center' });
    doc.text('Orang Tua/Wali', leftX, signatureY + 5, { align: 'center' });
    doc.line(leftX - lineWidth / 2, signatureLineY, leftX + lineWidth / 2, signatureLineY);

    doc.text('Mengetahui,', rightX, signatureY, { align: 'center' });
    doc.text('Wali Kelas', rightX, signatureY + 5, { align: 'center' });
    doc.line(rightX - lineWidth / 2, signatureLineY, rightX + lineWidth / 2, signatureLineY);

    doc.setFontSize(9);
    doc.text('(___________________)', leftX, signatureLineY + 5, { align: 'center' });
    doc.text(getTeacherSignatureText(teacherName), rightX, signatureLineY + 5, { align: 'center' });
};

/**
 * Export Violations to a Formal PDF Report
 */
export const exportViolationsToPDF = async (options: ViolationExportOptions) => {
    const { studentName, className, schoolName, violations, teacherName } = options;
    const totalPoints = getTotalViolationPoints(violations);
    const totalViolations = violations.length;

    // Ensure logos are loaded
    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header with Logos --
    let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

    // -- Title --
    y += 2;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN PELANGGARAN SISWA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // -- Student Info Section with proper alignment --
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const labelX = 14;
    const colonX = 47;
    const valueX = 50;
    const lineHeight = 6;

    // Nama Siswa
    doc.text('Nama Siswa', labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(studentName.toUpperCase(), valueX, y);
    doc.setFont('helvetica', 'normal');
    y += lineHeight;

    // Kelas
    doc.text('Kelas', labelX, y);
    doc.text(':', colonX, y);
    doc.text(className || '-', valueX, y);
    y += lineHeight;

    // Tanggal
    const dateStr = formatExportDate();
    doc.text('Tanggal', labelX, y);
    doc.text(':', colonX, y);
    doc.text(dateStr, valueX, y);
    y += lineHeight;

    doc.text('Total Poin', labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalPoints} poin dari ${totalViolations} pelanggaran`, valueX, y);
    doc.setFont('helvetica', 'normal');
    
    const tableStartY = y + 10;

    // -- Table with improved styling --
    const tableBody = violations.map((v, index) => [
        index + 1,
        new Date(v.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        v.description,
        v.points,
        v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-',
        v.follow_up_status === 'resolved' ? 'Selesai' :
            v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum'
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [['No', 'Tanggal', 'Pelanggaran', 'Poin', 'Kategori', 'Status']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [50, 50, 50], 
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9
        },
        styles: { 
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // No
            1: { cellWidth: 24, halign: 'center' }, // Tanggal
            2: { cellWidth: 'auto', halign: 'left' }, // Desc
            3: { cellWidth: 13, halign: 'center' }, // Poin
            4: { cellWidth: 20, halign: 'center' }, // Category
            5: { cellWidth: 18, halign: 'center' }, // Status
        }
    });

    // -- Footer / Signature Section --
    const finalY = (doc as any).lastAutoTable?.finalY || 150;

    if (finalY < 235) {
        const signatureY = finalY + 15;
        addSignatureBlocks(doc, pageWidth, signatureY, teacherName);
    }

    doc.save(`Laporan_Pelanggaran_${studentName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export Violations to Excel
 */
export const exportViolationsToExcel = async (options: ViolationExportOptions): Promise<void> => {
    const { studentName, className, schoolName, violations, teacherName } = options;
    const totalPoints = getTotalViolationPoints(violations);
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

    // 1. Header Information
    const ws_data: any[][] = [
        [schoolName],
        ['LAPORAN PELANGGARAN SISWA'],
        [],
        ['Nama Siswa', studentName],
        ['Kelas', className || '-'],
        ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
        ['Total Poin', `${totalPoints} poin`],
        ['Total Pelanggaran', violations.length],
        [],
        ['No', 'Tanggal', 'Deskripsi Pelanggaran', 'Poin', 'Kategori', 'Status Tindak Lanjut', 'Catatan']
    ];

    // 2. Data Rows
    violations.forEach((v, index) => {
        ws_data.push([
            index + 1,
            new Date(v.date).toLocaleDateString('id-ID'),
            v.description,
            v.points,
            v.severity || '-',
            v.follow_up_status || 'pending',
            v.follow_up_notes || ''
        ]);
    });

    ws_data.push([]);
    ws_data.push(['', 'Mengetahui,', '', '', '', 'Mengetahui,']);
    ws_data.push(['', 'Orang Tua/Wali', '', '', '', 'Wali Kelas']);
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push(['', '(___________________)', '', '', '', getTeacherSignatureText(teacherName)]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Styling logic relies on Cell Objects if using SheetJS Pro, 
    // but for community version we control column width at least.
    const wscols = [
        { wch: 5 },  // No
        { wch: 15 }, // Tanggal
        { wch: 40 }, // Deskripsi
        { wch: 8 },  // Poin
        { wch: 10 }, // Severity
        { wch: 15 }, // Status
        { wch: 30 }  // Catatan
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Pelanggaran');
    XLSX.writeFile(wb, `Data_Pelanggaran_${studentName.replace(/\s+/g, '_')}.xlsx`);
};

// ============================
// BULK EXPORT (GROUPED BY STUDENT)
// ============================

interface StudentInfo {
    id: string;
    name: string;
    gender?: string;
    avatar_url?: string | null;
}

interface BulkViolationExportOptions {
    className: string;
    schoolName: string;
    violations: ViolationRow[];
    students: StudentInfo[];
    teacherName?: string;
}

/**
 * Export Class Violations to PDF - One Page Per Student (Report Card Style)
 */
export const exportBulkViolationsToPDF = async (options: BulkViolationExportOptions) => {
    const { className, schoolName, violations, students, teacherName } = options;

    // Ensure logos are loaded
    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Create student lookup map
    const studentInfoMap = new Map(students.map(s => [s.id, s]));

    // Group violations by student
    const groupedByStudent = new Map<string, ViolationRow[]>();
    violations.forEach(v => {
        const existing = groupedByStudent.get(v.student_id) || [];
        existing.push(v);
        groupedByStudent.set(v.student_id, existing);
    });

    // Sort students alphabetically
    const sortedStudentIds = Array.from(groupedByStudent.keys()).sort((a, b) => {
        const nameA = studentInfoMap.get(a)?.name || '';
        const nameB = studentInfoMap.get(b)?.name || '';
        return nameA.localeCompare(nameB);
    });

    const dateStr = formatExportDate();

    let isFirstPage = true;

    // Generate one page per student
    sortedStudentIds.forEach(studentId => {
        const studentViolations = groupedByStudent.get(studentId) || [];
        const studentInfo = studentInfoMap.get(studentId);
        const studentName = studentInfo?.name || 'Tidak Diketahui';
        const totalPoints = getTotalViolationPoints(studentViolations);

        // Add new page for subsequent students
        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        // -- Header with Logos --
        let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

        // -- Title --
        y += 2;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN PELANGGARAN SISWA', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // -- Student Info Section with proper alignment --
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const labelX = 14;
        const colonX = 47;
        const valueX = 50;
        let currentY = y;
        const lineHeight = 6;

        // Nama Siswa
        doc.text('Nama Siswa', labelX, currentY);
        doc.text(':', colonX, currentY);
        doc.setFont('helvetica', 'bold');
        doc.text(studentName.toUpperCase(), valueX, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += lineHeight;

        // Kelas
        doc.text('Kelas', labelX, currentY);
        doc.text(':', colonX, currentY);
        doc.text(className, valueX, currentY);
        currentY += lineHeight;

        // Gender (if available)
        if (studentInfo?.gender) {
            doc.text('Jenis Kelamin', labelX, currentY);
            doc.text(':', colonX, currentY);
            doc.text(studentInfo.gender, valueX, currentY);
            currentY += lineHeight;
        }

        // Tanggal
        doc.text('Tanggal', labelX, currentY);
        doc.text(':', colonX, currentY);
        doc.text(dateStr, valueX, currentY);
        currentY += lineHeight;

        doc.text('Total Poin', labelX, currentY);
        doc.text(':', colonX, currentY);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totalPoints} poin dari ${studentViolations.length} pelanggaran`, valueX, currentY);
        doc.setFont('helvetica', 'normal');

        // -- Violations Table --
        const tableBody = studentViolations.map((v, index) => [
            index + 1,
            new Date(v.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            v.description,
            v.points,
            v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-',
            v.follow_up_status === 'resolved' ? 'Selesai' :
                v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum'
        ]);

        autoTable(doc, {
            startY: currentY + 10,
            head: [['No', 'Tanggal', 'Pelanggaran', 'Poin', 'Kategori', 'Status']],
            body: tableBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [50, 50, 50], 
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 9
            },
            styles: { 
                fontSize: 9,
                cellPadding: 3,
                lineColor: [0, 0, 0],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },   // No
                1: { cellWidth: 24, halign: 'center' },   // Tanggal
                2: { cellWidth: 'auto', halign: 'left' }, // Desc
                3: { cellWidth: 13, halign: 'center' }, // Poin
                4: { cellWidth: 20, halign: 'center' },   // Kategori
                5: { cellWidth: 18, halign: 'center' },   // Status
            }
        });

        // -- Footer / Signature Section --
        const finalY = (doc as any).lastAutoTable?.finalY || 150;

        if (finalY < 235) {
            const signatureY = finalY + 15;
            addSignatureBlocks(doc, pageWidth, signatureY, teacherName);
        }
    });

    doc.save(`Laporan_Pelanggaran_${className.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export Class Violations to Excel - One Sheet Per Student (Report Card Style)
 */
export const exportBulkViolationsToExcel = async (options: BulkViolationExportOptions) => {
    const { className, schoolName, violations, students, teacherName } = options;
    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new();

    // Create student lookup map
    const studentMap = new Map(students.map(s => [s.id, s.name]));

    // Group violations by student
    const groupedByStudent = new Map<string, ViolationRow[]>();
    violations.forEach(v => {
        const existing = groupedByStudent.get(v.student_id) || [];
        existing.push(v);
        groupedByStudent.set(v.student_id, existing);
    });

    // Sort students alphabetically
    const sortedStudentIds = Array.from(groupedByStudent.keys()).sort((a, b) => {
        const nameA = studentMap.get(a) || '';
        const nameB = studentMap.get(b) || '';
        return nameA.localeCompare(nameB);
    });

    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Create one sheet per student
    sortedStudentIds.forEach((studentId, index) => {
        const studentViolations = groupedByStudent.get(studentId) || [];
        const studentName = studentMap.get(studentId) || 'Tidak Diketahui';
        const totalPoints = studentViolations.reduce((sum, v) => sum + v.points, 0);

        const sheetName = `${index + 1}. ${studentName}`.substring(0, 31);
        const rows: (string | number)[][] = [
            [schoolName.toUpperCase()],
            ['LAPORAN PELANGGARAN SISWA'],
            [],
            ['Nama Siswa:', studentName],
            ['Kelas:', className],
            ['Tanggal:', dateStr],
            ['Total Pelanggaran:', `${studentViolations.length} (${totalPoints} poin)`],
            [],
            ['No', 'Tanggal', 'Deskripsi Pelanggaran', 'Poin', 'Kategori', 'Status', 'Catatan'],
        ];

        studentViolations.forEach((v, idx) => {
            rows.push([
                idx + 1,
                new Date(v.date).toLocaleDateString('id-ID'),
                v.description,
                v.points,
                v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-',
                v.follow_up_status === 'resolved' ? 'Selesai' :
                    v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum',
                v.follow_up_notes || ''
            ]);
        });

        rows.push([]);
        rows.push(['', 'Mengetahui,', '', '', '', 'Mengetahui,']);
        rows.push(['', 'Orang Tua/Wali', '', '', '', 'Wali Kelas']);
        rows.push([]);
        rows.push([]);
        rows.push(['', '(___________________)', '', '', '', getTeacherSignatureText(teacherName)]);

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        ];
        worksheet['!cols'] = [
            { wch: 6 },
            { wch: 14 },
            { wch: 45 },
            { wch: 8 },
            { wch: 12 },
            { wch: 12 },
            { wch: 30 },
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `Laporan_Pelanggaran_${className.replace(/\s+/g, '_')}.xlsx`);
};

