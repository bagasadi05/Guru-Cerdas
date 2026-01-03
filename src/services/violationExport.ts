/**
 * Service for exporting student violation data.
 * Supports PDF (Formal Report) and Excel (Structured Data).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ViolationRow } from '../components/pages/student/types';
import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';

interface ViolationExportOptions {
    studentName: string;
    className?: string; // Optional if not provided
    schoolName: string;
    violations: ViolationRow[];
}

/**
 * Export Violations to a Formal PDF Report
 */
export const exportViolationsToPDF = async (options: ViolationExportOptions) => {
    const { studentName, className, schoolName, violations } = options;

    // Ensure logos are loaded
    await ensureLogosLoaded();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header with Logos --
    let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

    // -- Title --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN PELANGGARAN SISWA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // -- Student Info --
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama Siswa : ${studentName}`, 14, y);
    y += 5;
    if (className) {
        doc.text(`Kelas      : ${className}`, 14, y);
        y += 5;
    }
    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    doc.text(`Tanggal    : ${dateStr}`, 14, y);
    const tableStartY = y + 8;

    // -- Table --
    const tableBody = violations.map((v, index) => [
        index + 1,
        new Date(v.date).toLocaleDateString('id-ID'),
        v.description,
        v.points,
        v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-', // Capitalize or dash
        v.follow_up_status === 'resolved' ? 'Selesai' :
            v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum'
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [['No', 'Tanggal', 'Pelanggaran', 'Poin', 'Kategori', 'Status']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 10 }, // No
            1: { cellWidth: 25 }, // Tanggal
            2: { cellWidth: 'auto' }, // Desc
            3: { cellWidth: 15, halign: 'center' }, // Poin
            4: { cellWidth: 20 }, // Category
            5: { cellWidth: 20 }, // Status
        }
    });

    // -- Footer / Signature --
    // Force cast to any because lastAutoTable is added by the plugin
    const finalY = (doc as any).lastAutoTable?.finalY || 150;

    if (finalY < 250) { // Check if space exists on this page
        doc.text('Mengetahui,', 140, finalY + 20);
        doc.text('Wali Kelas', 140, finalY + 25);
        doc.text('(_______________________)', 140, finalY + 50);
    }

    doc.save(`Laporan_Pelanggaran_${studentName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export Violations to Excel
 */
export const exportViolationsToExcel = (options: ViolationExportOptions) => {
    const { studentName, className, schoolName, violations } = options;
    const wb = XLSX.utils.book_new();

    // 1. Header Information
    const ws_data: any[][] = [
        [schoolName],
        ['LAPORAN PELANGGARAN SISWA'],
        [],
        ['Nama Siswa', studentName],
        ['Kelas', className || '-'],
        ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
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
}

/**
 * Export Class Violations to PDF - One Page Per Student (Report Card Style)
 */
export const exportBulkViolationsToPDF = async (options: BulkViolationExportOptions) => {
    const { className, schoolName, violations, students } = options;

    // Ensure logos are loaded
    await ensureLogosLoaded();

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

    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    let isFirstPage = true;

    // Generate one page per student
    sortedStudentIds.forEach(studentId => {
        const studentViolations = groupedByStudent.get(studentId) || [];
        const studentInfo = studentInfoMap.get(studentId);
        const studentName = studentInfo?.name || 'Tidak Diketahui';
        const totalPoints = studentViolations.reduce((sum, v) => sum + v.points, 0);

        // Add new page for subsequent students
        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        // -- Header with Logos --
        let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

        // -- Title --
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN PELANGGARAN SISWA', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // -- Student Info Box --
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const labelX = 14;
        const colonX = 45;
        const valueX = 47;
        let currentY = y; // Use y position from logo header
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
        doc.text('Tanggal Cetak', labelX, currentY);
        doc.text(':', colonX, currentY);
        doc.text(dateStr, valueX, currentY);

        // Summary box on the right
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(140, 38, 56, 20, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Total Pelanggaran', 168, 45, { align: 'center' });
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38); // Red color
        doc.text(`${studentViolations.length} (${totalPoints} poin)`, 168, 54, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Reset to black

        // -- Violations Table --
        const tableBody = studentViolations.map((v, index) => [
            index + 1,
            new Date(v.date).toLocaleDateString('id-ID'),
            v.description,
            v.points,
            v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-',
            v.follow_up_status === 'resolved' ? 'Selesai' :
                v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum'
        ]);

        autoTable(doc, {
            startY: currentY + 12,
            head: [['No', 'Tanggal', 'Deskripsi Pelanggaran', 'Poin', 'Kategori', 'Status']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 10 },   // No
                1: { cellWidth: 22 },   // Tanggal
                2: { cellWidth: 'auto' }, // Desc
                3: { cellWidth: 12, halign: 'center' }, // Poin
                4: { cellWidth: 18 },   // Kategori
                5: { cellWidth: 18 },   // Status
            }
        });

        // -- Footer / Signature --
        const finalY = (doc as any).lastAutoTable?.finalY || 150;

        if (finalY < 240) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Left signature - Parent
            doc.text('Mengetahui,', 35, finalY + 20, { align: 'center' });
            doc.text('Orang Tua/Wali', 35, finalY + 25, { align: 'center' });
            doc.text('(_______________________)', 35, finalY + 50, { align: 'center' });

            // Right signature - Teacher/Coordinator
            doc.text('Mengetahui,', 168, finalY + 20, { align: 'center' });
            doc.text('Wali Kelas', 168, finalY + 25, { align: 'center' });
            doc.text('(_______________________)', 168, finalY + 50, { align: 'center' });
        }
    });

    doc.save(`Laporan_Pelanggaran_${className.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export Class Violations to Excel - One Sheet Per Student (Report Card Style)
 */
export const exportBulkViolationsToExcel = async (options: BulkViolationExportOptions) => {
    const { className, schoolName, violations, students } = options;

    // Dynamic import ExcelJS for browser compatibility
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal Guru';
    workbook.created = new Date();

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

        // Create worksheet with student name (max 31 chars for Excel)
        const sheetName = `${index + 1}. ${studentName}`.substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName, {
            properties: { tabColor: { argb: 'FF6600' } }
        });

        // Column widths
        worksheet.columns = [
            { width: 6 },   // A - No
            { width: 14 },  // B - Tanggal
            { width: 45 },  // C - Deskripsi
            { width: 8 },   // D - Poin
            { width: 12 },  // E - Kategori
            { width: 12 },  // F - Status
            { width: 30 }   // G - Catatan
        ];

        // === ROW 1: School Name ===
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = schoolName.toUpperCase();
        titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 28;

        // === ROW 2: Title ===
        worksheet.mergeCells('A2:G2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = 'LAPORAN PELANGGARAN SISWA';
        subtitleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
        subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E5A8F' } };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 22;

        // === ROW 3: Empty ===
        worksheet.getRow(3).height = 10;

        // === ROW 4-7: Student Info ===
        const infoData = [
            ['Nama Siswa:', studentName],
            ['Kelas:', className],
            ['Tanggal:', dateStr],
            ['Total Pelanggaran:', `${studentViolations.length} (${totalPoints} poin)`]
        ];

        infoData.forEach((row, idx) => {
            const rowNum = 4 + idx;
            worksheet.getCell(`A${rowNum}`).value = row[0];
            worksheet.getCell(`A${rowNum}`).font = { bold: true };
            worksheet.getCell(`B${rowNum}`).value = row[1];
            if (idx === 3) {
                worksheet.getCell(`B${rowNum}`).font = { bold: true, color: { argb: 'DC2626' } };
            }
        });

        // === ROW 8: Empty ===
        worksheet.getRow(8).height = 10;

        // === ROW 9: Table Header ===
        const headerRowNum = 9;
        const headers = ['No', 'Tanggal', 'Deskripsi Pelanggaran', 'Poin', 'Kategori', 'Status', 'Catatan'];
        const headerRow = worksheet.getRow(headerRowNum);
        headerRow.values = headers;
        headerRow.height = 24;
        headerRow.eachCell((cell, colNumber) => {
            if (colNumber <= 7) {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B35' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // === DATA ROWS ===
        studentViolations.forEach((v, idx) => {
            const dataRowNum = headerRowNum + 1 + idx;
            const dataRow = worksheet.getRow(dataRowNum);

            dataRow.values = [
                idx + 1,
                new Date(v.date).toLocaleDateString('id-ID'),
                v.description,
                v.points,
                v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : '-',
                v.follow_up_status === 'resolved' ? 'Selesai' :
                    v.follow_up_status === 'in_progress' ? 'Proses' : 'Belum',
                v.follow_up_notes || ''
            ];

            // Alternating row colors
            const isEven = idx % 2 === 0;
            dataRow.eachCell((cell, colNumber) => {
                if (colNumber <= 7) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: isEven ? 'FFF5F0' : 'FFFFFF' }
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'DDDDDD' } },
                        left: { style: 'thin', color: { argb: 'DDDDDD' } },
                        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
                        right: { style: 'thin', color: { argb: 'DDDDDD' } }
                    };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                }
            });

            // Center specific columns
            dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
            dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

            // Color code status
            const statusCell = dataRow.getCell(6);
            if (v.follow_up_status === 'resolved') {
                statusCell.font = { color: { argb: '16A34A' }, bold: true };
            } else if (v.follow_up_status === 'in_progress') {
                statusCell.font = { color: { argb: 'D97706' }, bold: true };
            } else {
                statusCell.font = { color: { argb: 'DC2626' }, bold: true };
            }
        });

        // === SIGNATURE SECTION ===
        const signatureRowStart = headerRowNum + studentViolations.length + 3;

        worksheet.getCell(`B${signatureRowStart}`).value = 'Mengetahui,';
        worksheet.getCell(`B${signatureRowStart + 1}`).value = 'Orang Tua/Wali';
        worksheet.getCell(`B${signatureRowStart + 4}`).value = '(___________________)';

        worksheet.getCell(`F${signatureRowStart}`).value = 'Mengetahui,';
        worksheet.getCell(`F${signatureRowStart + 1}`).value = 'Wali Kelas';
        worksheet.getCell(`F${signatureRowStart + 4}`).value = '(___________________)';
    });

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Pelanggaran_${className.replace(/\s+/g, '_')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

