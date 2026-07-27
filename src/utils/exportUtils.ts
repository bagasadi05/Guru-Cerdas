/**
 * Excel Export Utilities
 * 
 * This module provides functions for exporting data to Excel format using the XLSX library.
 * It includes specialized exporters for attendance records, class grades, and summary reports.
 * 
 * @module exportUtils
 */

import { getXLSX, getExcelJS } from './dynamicImports';

/**
 * Type definitions for export utilities
 */

/** Generic export row type - key-value pairs for Excel export */
export type ExportRow = Record<string, string | number | boolean | null | undefined>;

/** Student data for export functions */
export interface ExportStudent {
    id: string;
    name: string;
    gender?: string;
}

/** Attendance record for export functions */
export interface ExportAttendanceRecord {
    student_id: string;
    date: string;
    status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | string;
}

/** Academic record for export functions */
export interface ExportAcademicRecord {
    student_id: string;
    subject: string;
    assessment_name?: string;
    score: number;
}

/**
 * Exports an array of data to an Excel file
 * 
 * This is a general-purpose Excel exporter which converts an array of objects
 * to an Excel worksheet and downloads it. Each object property becomes a column.
 * 
 * @param data - Array of objects to export (each object represents a row)
 * @param fileName - Name of the file to download (without .xlsx extension)
 * @param sheetName - Name of the worksheet tab (defaults to 'Sheet1')
 * 
 * @example
 * ```typescript
 * const students = [
 *   { name: 'Ahmad', grade: 85, class: '5A' },
 *   { name: 'Siti', grade: 92, class: '5A' }
 * ];
 * exportToExcel(students, 'student-grades', 'Grades');
 * // Downloads: student-grades.xlsx
 * ```
 * 
 * @example
 * ```typescript
 * // Export with default sheet name
 * exportToExcel(attendanceData, 'attendance-report');
 * ```
 * 
 * @since 1.0.0
 */
export const exportToExcel = async (data: ExportRow[], fileName: string, sheetName: string = 'Sheet1') => {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    await XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports class attendance data to a formatted Excel file
 * 
 * This function creates a professionally formatted attendance sheet for a class,
 * including a header with school information, a calendar grid showing daily attendance,
 * and summary totals. The format follows Indonesian school standards with signature
 * sections for the class teacher and principal.
 * 
 * @param classData - Object containing class name and array of students
 * @param classData.name - Name of the class (e.g., '5A')
 * @param classData.students - Array of student objects with id and name
 * @param attendanceData - Array of attendance records with student_id, date, and status
 * @param monthName - Indonesian month name (e.g., 'Juli', 'Agustus')
 * @param year - The year for the attendance report
 * @param monthIndex - Month number (1-12) for date calculations
 * @param daysInMonth - Number of days in the month (28-31)
 * @param fileName - Name of the file to download (without .xlsx extension)
 * 
 * @example
 * ```typescript
 * const classData = {
 *   name: '5A',
 *   students: [
 *     { id: 'uuid-1', name: 'Ahmad Fauzi' },
 *     { id: 'uuid-2', name: 'Siti Nurhaliza' }
 *   ]
 * };
 * 
 * const attendance = [
 *   { student_id: 'uuid-1', date: '2024-07-01', status: 'Hadir' },
 *   { student_id: 'uuid-1', date: '2024-07-02', status: 'Sakit' },
 *   { student_id: 'uuid-2', date: '2024-07-01', status: 'Hadir' }
 * ];
 * 
 * exportAttendanceToExcel(
 *   classData,
 *   attendance,
 *   'Juli',
 *   2024,
 *   7,
 *   31,
 *   'attendance-5A-july-2024'
 * );
 * ```
 * 
 * @remarks
 * The exported file includes:
 * - School header (MI AL IRSYAD KOTA MADIUN)
 * - Calendar grid with dates 1-31
 * - Status codes: H (Hadir), S (Sakit), I (Izin), A (Alpha)
 * - Summary columns for each status type
 * - Signature sections for class teacher and principal
 * 
 * @since 1.0.0
 */
/**
 * Export Attendance to Professional Excel with ExcelJS Styling
 * 
 * Features:
 * - Colored header (dark blue school name, orange month header)
 * - Bordered cells
 * - Alternating row colors for better readability
 * - Summary columns with totals
 * - Professional signature section
 * 
 * @since 2.0.0
 */
export const exportAttendanceToExcel = async (
    classesData: { name: string; students: ExportStudent[] }[],
    attendanceData: ExportAttendanceRecord[],
    monthName: string,
    year: number,
    monthIndex: number,
    daysInMonth: number,
    fileName: string,
    schoolName: string = 'MI AL IRSYAD KOTA MADIUN'
) => {
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = schoolName;

    for (const classData of classesData) {
        const cleanSheetName = `Kelas ${classData.name}`.replace(/[\\/?*:[\]]/g, '').slice(0, 31);
        const ws = workbook.addWorksheet(cleanSheetName || 'Absensi');

        // Styles
        const borderAll = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        } as Partial<import('exceljs').Borders>;
        const fontBold = { bold: true, size: 11, name: 'Arial' };
        const fontHeader = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };

        const totalColumns = 2 + daysInMonth + 4;
        const summaryStartCol = 2 + daysInMonth + 1;

        // Title Rows
        ws.mergeCells(1, 1, 1, totalColumns);
        const titleRow1 = ws.getCell(1, 1);
        titleRow1.value = schoolName.toUpperCase();
        titleRow1.font = fontHeader;
        titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF073642' } }; 

        ws.mergeCells(2, 1, 2, totalColumns);
        const titleRow2 = ws.getCell(2, 1);
        titleRow2.value = `DAFTAR HADIR KELAS ${classData.name}`;
        titleRow2.font = fontBold;
        titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

        ws.mergeCells(3, 1, 3, totalColumns);
        const titleRow3 = ws.getCell(3, 1);
        titleRow3.value = `TAHUN PELAJARAN ${year}/${year + 1}`;
        titleRow3.font = fontBold;
        titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };

        // Empty row
        ws.addRow([]);

        // Month Header
        ws.mergeCells(5, 1, 5, 2);
        ws.getCell(5, 1).value = 'NO / NAMA';
        ws.getCell(5, 1).font = fontBold;
        
        ws.mergeCells(5, 3, 5, 2 + daysInMonth);
        const monthCell = ws.getCell(5, 3);
        monthCell.value = `BULAN: ${monthName.toUpperCase()}`;
        monthCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }; // Orange
        monthCell.alignment = { horizontal: 'center', vertical: 'middle' };

        ws.mergeCells(5, summaryStartCol, 5, summaryStartCol + 3);
        const summaryHeader = ws.getCell(5, summaryStartCol);
        summaryHeader.value = 'JUMLAH';
        summaryHeader.font = fontBold;
        summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };

        // Columns Header
        const headerRow = ws.getRow(6);
        headerRow.getCell(1).value = 'NO';
        headerRow.getCell(2).value = 'NAMA';
        for (let day = 1; day <= daysInMonth; day++) {
            headerRow.getCell(2 + day).value = day;
        }
        headerRow.getCell(summaryStartCol).value = 'S';
        headerRow.getCell(summaryStartCol + 1).value = 'I';
        headerRow.getCell(summaryStartCol + 2).value = 'A';
        headerRow.getCell(summaryStartCol + 3).value = 'H';

        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColumns) {
                cell.font = fontBold;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } }; 
                cell.border = borderAll;
            }
        });

        // Set column widths
        ws.getColumn(1).width = 5; // NO
        ws.getColumn(2).width = 30; // NAMA
        for (let day = 1; day <= daysInMonth; day++) {
            ws.getColumn(2 + day).width = 4;
        }
        for (let i = 0; i < 4; i++) {
            ws.getColumn(summaryStartCol + i).width = 5;
        }

        // Data Rows
        classData.students.forEach((student, index) => {
            const row = ws.addRow([]);
            row.getCell(1).value = index + 1;
            row.getCell(1).alignment = { horizontal: 'center' };
            
            row.getCell(2).value = student.name;
            
            let s = 0, i = 0, a = 0, h = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = attendanceData.find((att) => att.student_id === student.id && att.date === dateStr);

                const cell = row.getCell(2 + d);
                cell.alignment = { horizontal: 'center' };
                if (record) {
                    const statusMap: Record<string, string> = { 'Hadir': 'H', 'Sakit': 'S', 'Izin': 'I', 'Alpha': 'A' };
                    cell.value = statusMap[record.status] || '-';

                    if (record.status === 'Hadir') { h++; cell.font = { color: { argb: 'FF16A34A' }, bold: true }; }
                    else if (record.status === 'Sakit') { s++; cell.font = { color: { argb: 'FFCA8A04' }, bold: true }; }
                    else if (record.status === 'Izin') { i++; cell.font = { color: { argb: 'FF2563EB' }, bold: true }; }
                    else if (record.status === 'Alpha') { a++; cell.font = { color: { argb: 'FFDC2626' }, bold: true }; }
                }
            }

            row.getCell(summaryStartCol).value = s;
            row.getCell(summaryStartCol + 1).value = i;
            row.getCell(summaryStartCol + 2).value = a;
            row.getCell(summaryStartCol + 3).value = h;
            
            // Alternating row color and borders
            const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF'; // slate-50 and white
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.border = borderAll;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    if (colNumber >= summaryStartCol) {
                        cell.alignment = { horizontal: 'center' };
                    }
                }
            });
        });

        // Signatures
        const lastRow = classData.students.length + 6;
        ws.getCell(lastRow + 2, totalColumns - 4).value = `Madiun, ............... ${year}`;
        ws.getCell(lastRow + 3, totalColumns - 4).value = `Wali Kelas ${classData.name}`;
        ws.getCell(lastRow + 6, totalColumns - 4).value = '(_________________)';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

/**
 * Exports class grades to a formatted Excel file with subject breakdowns
 * 
 * This function creates a comprehensive grade report showing all students' scores
 * across different subjects and assessments. It automatically organizes grades by
 * subject and assessment type, calculates averages, and includes a grading scale legend.
 * 
 * @param className - Name of the class (e.g., '5A', 'Kelas 6B')
 * @param students - Array of student objects with id and name
 * @param academicRecords - Array of grade records with student_id, subject, assessment_name, and score
 * @param fileName - Name of the file to download (without .xlsx extension)
 * 
 * @example
 * ```typescript
 * const students = [
 *   { id: 'uuid-1', name: 'Ahmad Fauzi' },
 *   { id: 'uuid-2', name: 'Siti Nurhaliza' }
 * ];
 * 
 * const grades = [
 *   { student_id: 'uuid-1', subject: 'Matematika', assessment_name: 'UTS', score: 85 },
 *   { student_id: 'uuid-1', subject: 'Matematika', assessment_name: 'UAS', score: 90 },
 *   { student_id: 'uuid-2', subject: 'Matematika', assessment_name: 'UTS', score: 92 }
 * ];
 * 
 * exportClassGradesToExcel('5A', students, grades, 'grades-5A-semester1');
 * ```
 * 
 * @remarks
 * The exported file includes:
 * - Header with class name and export date
 * - Columns for each subject-assessment combination
 * - Average score column for each student
 * - Grading scale legend (A=90-100, B=80-89, C=70-79, D=60-69, E=<60)
 * - Automatic column width adjustment
 * 
 * @since 1.0.0
 */
export const exportClassGradesToExcel = async (
    className: string,
    students: { id: string; name: string }[],
    academicRecords: ExportAcademicRecord[],
    fileName: string
) => {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    const ws_data: (string | number)[][] = [];

    // Header
    ws_data.push(["REKAP NILAI SISWA"]);
    ws_data.push([`Kelas: ${className}`]);
    ws_data.push([`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
    ws_data.push([]);

    // Get all unique subjects and assessments
    const subjectAssessments = new Map<string, Set<string>>();
    academicRecords.forEach(record => {
        const key = record.subject;
        if (!subjectAssessments.has(key)) {
            subjectAssessments.set(key, new Set());
        }
        if (record.assessment_name) {
            subjectAssessments.get(key)!.add(record.assessment_name);
        }
    });

    // Build header row
    const headerRow: string[] = ["No", "Nama Siswa"];
    const subjectHeaders: { subject: string; assessment: string }[] = [];

    subjectAssessments.forEach((assessments, subject) => {
        if (assessments.size === 0) {
            headerRow.push(subject);
            subjectHeaders.push({ subject, assessment: '' });
        } else {
            assessments.forEach(assessment => {
                headerRow.push(`${subject} - ${assessment}`);
                subjectHeaders.push({ subject, assessment });
            });
        }
    });
    headerRow.push("Rata-rata");
    ws_data.push(headerRow);

    // Build student rows
    students.forEach((student, index) => {
        const row: (string | number)[] = [index + 1, student.name];
        const studentRecords = academicRecords.filter(r => r.student_id === student.id);
        let totalScore = 0;
        let scoreCount = 0;

        subjectHeaders.forEach(({ subject, assessment }) => {
            const record = studentRecords.find(r =>
                r.subject === subject &&
                (assessment === '' || r.assessment_name === assessment)
            );
            if (record) {
                row.push(record.score);
                totalScore += record.score;
                scoreCount++;
            } else {
                row.push('-');
            }
        });

        row.push(scoreCount > 0 ? Math.round(totalScore / scoreCount) : '-');
        ws_data.push(row);
    });

    // Summary row
    ws_data.push([]);
    ws_data.push(["Keterangan:"]);
    ws_data.push(["A = 90-100 (Sangat Baik)"]);
    ws_data.push(["B = 80-89 (Baik)"]);
    ws_data.push(["C = 70-79 (Cukup)"]);
    ws_data.push(["D = 60-69 (Kurang)"]);
    ws_data.push(["E = <60 (Sangat Kurang)"]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Column widths
    const wscols = [
        { wch: 4 },   // No
        { wch: 30 },  // Nama
    ];
    for (let i = 0; i < subjectHeaders.length; i++) {
        wscols.push({ wch: 15 });
    }
    wscols.push({ wch: 12 }); // Rata-rata
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Nilai");
    await XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Exports a comprehensive class summary report to Excel
 * 
 * This function creates an executive summary report combining class statistics,
 * attendance summaries, academic performance metrics, and individual student data.
 * It provides a complete overview of class performance in a single document.
 * 
 * @param className - Name of the class (e.g., '5A', 'Kelas 6B')
 * @param students - Array of student objects with id, name, and gender
 * @param attendanceData - Array of attendance records with student_id, date, and status
 * @param academicRecords - Array of grade records with student_id, subject, and score
 * @param fileName - Name of the file to download (without .xlsx extension)
 * 
 * @example
 * ```typescript
 * const students = [
 *   { id: 'uuid-1', name: 'Ahmad Fauzi', gender: 'Laki-laki' },
 *   { id: 'uuid-2', name: 'Siti Nurhaliza', gender: 'Perempuan' }
 * ];
 * 
 * const attendance = [
 *   { student_id: 'uuid-1', date: '2024-07-01', status: 'Hadir' },
 *   { student_id: 'uuid-2', date: '2024-07-01', status: 'Hadir' }
 * ];
 * 
 * const grades = [
 *   { student_id: 'uuid-1', subject: 'Matematika', score: 85 },
 *   { student_id: 'uuid-2', subject: 'Matematika', score: 92 }
 * ];
 * 
 * exportClassSummaryToExcel('5A', students, attendance, grades, 'summary-5A-july');
 * ```
 * 
 * @remarks
 * The exported file includes:
 * - Class Statistics: Total students, gender breakdown
 * - Attendance Summary: Total counts by status (Hadir, Sakit, Izin, Alpha) and attendance rate
 * - Academic Summary: Number of assessments, class average, highest/lowest scores
 * - Student List: Individual attendance rates and grade averages
 * - Automatic calculations and percentage formatting
 * 
 * @since 1.0.0
 */
export const exportClassSummaryToExcel = async (
    className: string,
    students: { id: string; name: string; gender: string }[],
    attendanceData: ExportAttendanceRecord[],
    academicRecords: ExportAcademicRecord[],
    fileName: string
) => {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    const ws_data: (string | number)[][] = [];

    // Header
    ws_data.push(["LAPORAN RINGKASAN KELAS"]);
    ws_data.push([`Kelas: ${className}`]);
    ws_data.push([`Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`]);
    ws_data.push([]);

    // Class stats
    const maleCount = students.filter(s => s.gender === 'Laki-laki').length;
    const femaleCount = students.filter(s => s.gender === 'Perempuan').length;

    ws_data.push(["STATISTIK KELAS"]);
    ws_data.push(["Total Siswa", students.length]);
    ws_data.push(["Laki-laki", maleCount]);
    ws_data.push(["Perempuan", femaleCount]);
    ws_data.push([]);

    // Attendance summary
    const attendanceSummary = {
        Hadir: attendanceData.filter(a => a.status === 'Hadir').length,
        Sakit: attendanceData.filter(a => a.status === 'Sakit').length,
        Izin: attendanceData.filter(a => a.status === 'Izin').length,
        Alpha: attendanceData.filter(a => a.status === 'Alpha').length,
    };
    const totalAttendance = Object.values(attendanceSummary).reduce((a, b) => a + b, 0);
    const attendanceRate = totalAttendance > 0
        ? ((attendanceSummary.Hadir / totalAttendance) * 100).toFixed(1)
        : 0;

    ws_data.push(["RINGKASAN KEHADIRAN"]);
    ws_data.push(["Hadir", attendanceSummary.Hadir]);
    ws_data.push(["Sakit", attendanceSummary.Sakit]);
    ws_data.push(["Izin", attendanceSummary.Izin]);
    ws_data.push(["Alpha", attendanceSummary.Alpha]);
    ws_data.push(["Persentase Kehadiran", `${attendanceRate}%`]);
    ws_data.push([]);

    // Academic summary
    const allScores = academicRecords.map(r => r.score).filter(s => typeof s === 'number');
    const avgScore = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;
    const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;

    ws_data.push(["RINGKASAN AKADEMIK"]);
    ws_data.push(["Jumlah Penilaian", academicRecords.length]);
    ws_data.push(["Rata-rata Kelas", avgScore]);
    ws_data.push(["Nilai Tertinggi", maxScore]);
    ws_data.push(["Nilai Terendah", minScore]);
    ws_data.push([]);

    // Student list with summary
    ws_data.push(["DAFTAR SISWA"]);
    ws_data.push(["No", "Nama", "L/P", "Kehadiran (%)", "Rata-rata Nilai"]);

    students.forEach((student, index) => {
        const studentAttendance = attendanceData.filter(a => a.student_id === student.id);
        const studentPresent = studentAttendance.filter(a => a.status === 'Hadir').length;
        const studentTotal = studentAttendance.length;
        const studentAttRate = studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 0;

        const studentRecords = academicRecords.filter(r => r.student_id === student.id);
        const studentAvg = studentRecords.length > 0
            ? Math.round(studentRecords.reduce((a, r) => a + r.score, 0) / studentRecords.length)
            : '-';

        ws_data.push([
            index + 1,
            student.name,
            student.gender === 'Laki-laki' ? 'L' : 'P',
            `${studentAttRate}%`,
            studentAvg
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Column widths
    ws['!cols'] = [
        { wch: 4 },
        { wch: 30 },
        { wch: 5 },
        { wch: 15 },
        { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Ringkasan");
    await XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Exports class attendance summary for a full semester to a formatted Excel file
 * 
 * Features:
 * - Professional header with school name and semester info
 * - Grid columns: No, Nama Siswa, Hadir (H), Sakit (S), Izin (I), Alpha (A), % Kehadiran
 * - Professional signature section
 * 
 * @since 2.0.0
 */
export const exportSemesterAttendanceToExcel = async (
    classesData: { name: string; students: ExportStudent[] }[],
    attendanceData: ExportAttendanceRecord[],
    semesterName: string,
    fileName: string,
    schoolName: string = 'MI AL IRSYAD KOTA MADIUN'
) => {
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = schoolName;

    for (const classData of classesData) {
        const cleanSheetName = `Kelas ${classData.name}`.replace(/[\\/?*:[\]]/g, '').slice(0, 31);
        const ws = workbook.addWorksheet(cleanSheetName || 'Rekap Kehadiran Semester');

        const totalColumns = 7;
        
        // Styles
        const borderAll = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        } as Partial<import('exceljs').Borders>;
        const fontBold = { bold: true, size: 11, name: 'Arial' };
        const fontHeader = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };

        ws.mergeCells(1, 1, 1, totalColumns);
        const titleRow1 = ws.getCell(1, 1);
        titleRow1.value = schoolName.toUpperCase();
        titleRow1.font = fontHeader;
        titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF073642' } }; 

        ws.mergeCells(2, 1, 2, totalColumns);
        const titleRow2 = ws.getCell(2, 1);
        titleRow2.value = `REKAPITULASI KEHADIRAN SISWA - KELAS ${classData.name}`;
        titleRow2.font = fontBold;
        titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

        ws.mergeCells(3, 1, 3, totalColumns);
        const titleRow3 = ws.getCell(3, 1);
        titleRow3.value = `SEMESTER: ${semesterName.toUpperCase()}`;
        titleRow3.font = fontBold;
        titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };

        ws.addRow([]);

        const headerRow = ws.getRow(5);
        headerRow.values = ['NO', 'NAMA SISWA', 'HADIR (H)', 'SAKIT (S)', 'IZIN (I)', 'ALPHA (A)', 'PERSENTASE (%)'];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColumns) {
                cell.font = fontBold;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
                cell.border = borderAll;
            }
        });

        ws.getColumn(1).width = 5;
        ws.getColumn(2).width = 30;
        ws.getColumn(3).width = 12;
        ws.getColumn(4).width = 12;
        ws.getColumn(5).width = 12;
        ws.getColumn(6).width = 12;
        ws.getColumn(7).width = 18;

        classData.students.forEach((student, index) => {
            const studentAttendance = attendanceData.filter((a) => a.student_id === student.id);
            const h = studentAttendance.filter((a) => a.status === 'Hadir').length;
            const s = studentAttendance.filter((a) => a.status === 'Sakit').length;
            const i = studentAttendance.filter((a) => a.status === 'Izin').length;
            const a = studentAttendance.filter((a) => a.status === 'Alpha').length;
            const total = h + s + i + a;
            const percentage = total > 0 ? Math.round((h / total) * 100) : 0;

            const row = ws.addRow([
                index + 1,
                student.name,
                h, s, i, a,
                `${percentage}%`
            ]);

            const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.border = borderAll;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    if (colNumber === 1 || colNumber >= 3) {
                        cell.alignment = { horizontal: 'center' };
                    }
                }
            });
        });

        const lastRow = classData.students.length + 5;
        ws.getCell(lastRow + 2, totalColumns - 2).value = `Madiun, ............... ${new Date().getFullYear()}`;
        ws.getCell(lastRow + 3, totalColumns - 2).value = `Wali Kelas ${classData.name}`;
        ws.getCell(lastRow + 6, totalColumns - 2).value = '(_________________)';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

