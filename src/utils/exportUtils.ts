/**
 * Excel Export Utilities
 * 
 * This module provides functions for exporting data to Excel format using the XLSX library.
 * It includes specialized exporters for attendance records, class grades, and summary reports.
 * 
 * @module exportUtils
 */

import * as XLSX from 'xlsx';

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
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
export const exportAttendanceToExcel = (
    classData: { name: string; students: any[] },
    attendanceData: any[],
    monthName: string, // "Juli"
    year: number,
    monthIndex: number, // 1-12
    daysInMonth: number,
    fileName: string
) => {
    const wb = XLSX.utils.book_new();
    const ws_data: any[][] = [];

    // --- 1. Header Section ---
    ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "DAFTAR HADIR KELAS " + classData.name]);
    ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "MI AL IRSYAD KOTA MADIUN"]);
    ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `TAHUN PELAJARAN ${year}/${year + 1}`]);
    ws_data.push([]);

    // --- 2. Table Header Section ---
    const row5 = ["NO", "NAMA", "BULAN : " + monthName.toUpperCase()];
    for (let i = 0; i < 30; i++) row5.push("");
    row5.push("JUMLAH");
    row5.push("");
    row5.push("");
    row5.push("");
    ws_data.push(row5);

    const row6 = ["", "", "TANGGAL"];
    for (let d = 1; d <= 31; d++) {
        row6.push(d <= daysInMonth ? String(d) : "");
    }
    row6.push("S", "I", "A", "H");
    ws_data.push(row6);

    // --- 3. Student Data ---
    classData.students.forEach((student, index) => {
        const row: any[] = [index + 1, student.name];
        let s = 0, i = 0, a = 0, h = 0;

        // Fill dates 1-31
        for (let d = 1; d <= 31; d++) {
            if (d <= daysInMonth) {
                const dateStr = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = attendanceData.find((att: any) => att.student_id === student.id && att.date === dateStr);

                if (record) {
                    const statusMap: Record<string, string> = { 'Hadir': 'H', 'Sakit': 'S', 'Izin': 'I', 'Alpha': 'A' };
                    const code = statusMap[record.status] || '-';
                    row.push(code);

                    if (record.status === 'Hadir') h++;
                    else if (record.status === 'Sakit') s++;
                    else if (record.status === 'Izin') i++;
                    else if (record.status === 'Alpha') a++;
                } else {
                    row.push(""); // Empty if no record
                }
            } else {
                row.push(""); // Empty for non-existent days (e.g. Feb 30)
            }
        }

        // Add Totals
        row.push(s, i, a, h);
        ws_data.push(row);
    });

    // --- 4. Footer (Signatures) ---
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Madiun, ........................... ${year}`]);
    ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Wali Kelas " + classData.name]);
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push(["Mengetahui,"]);
    ws_data.push(["Kepala MI Al Irsyad"]);
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push(["( ..................................... )", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "( ..................................... )"]);


    // --- Construct Sheet ---
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // --- Merges ---
    const merges = [
        // Title Merges
        { s: { r: 0, c: 20 }, e: { r: 0, c: 36 } },
        { s: { r: 1, c: 20 }, e: { r: 1, c: 36 } },
        { s: { r: 2, c: 20 }, e: { r: 2, c: 36 } },

        // Header Table Merges
        { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, // NO
        { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } }, // NAMA
        { s: { r: 4, c: 2 }, e: { r: 4, c: 32 } }, // BULAN (Cols 2 to 32 = 31 days)
        { s: { r: 4, c: 33 }, e: { r: 4, c: 36 } }, // JUMLAH

        // Footer Merges (Signatures)
        { s: { r: ws_data.length - 8, c: 0 }, e: { r: ws_data.length - 8, c: 10 } }, // Mengetahui
        { s: { r: ws_data.length - 7, c: 0 }, e: { r: ws_data.length - 7, c: 10 } }, // Kepala MI
        { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 10 } }, // ( ... ) Left

        { s: { r: ws_data.length - 11, c: 28 }, e: { r: ws_data.length - 11, c: 36 } }, // Madiun...
        { s: { r: ws_data.length - 10, c: 28 }, e: { r: ws_data.length - 10, c: 36 } }, // Wali Kelas...
        { s: { r: ws_data.length - 1, c: 28 }, e: { r: ws_data.length - 1, c: 36 } }, // ( ... ) Right
    ];
    ws['!merges'] = merges;

    // --- Column Widths ---
    const wscols = [
        { wch: 4 },  // NO
        { wch: 35 }, // NAMA
    ];
    for (let i = 0; i < 31; i++) wscols.push({ wch: 3 }); // Dates
    wscols.push({ wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }); // Totals
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
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
export const exportClassGradesToExcel = (
    className: string,
    students: { id: string; name: string }[],
    academicRecords: any[],
    fileName: string
) => {
    const wb = XLSX.utils.book_new();
    const ws_data: any[][] = [];

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
    XLSX.writeFile(wb, `${fileName}.xlsx`);
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
export const exportClassSummaryToExcel = (
    className: string,
    students: { id: string; name: string; gender: string }[],
    attendanceData: any[],
    academicRecords: any[],
    fileName: string
) => {
    const wb = XLSX.utils.book_new();
    const ws_data: any[][] = [];

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
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

