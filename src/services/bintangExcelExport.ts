import { getExcelJS } from '../utils/dynamicImports';
import { getAspectForViolation, calculateAspectPoints, type AspectPointsSummary, type BintangGrade } from './bintangService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StudentSummary {
    id: string;
    name: string;
    totalViolationPoints: number;
    totalViolations: number;
    aspects: AspectPointsSummary;
    keaktifanPoints: number;
    keaktifanCount: number;
    evaluationStatus: 'Published' | 'Draft' | 'Auto';
}

interface BintangExcelOptions {
    className: string;
    schoolName: string;
    monthName: string;
    academicYear: string;
    semesterName: string;
    students: Array<{ id: string; name: string }>;
    violations: Array<{
        student_id: string; description: string; points: number;
        date: string; severity: string | null; students: { name: string } | null;
    }>;
    quizPoints: Array<{
        student_id: string; quiz_name: string | null; subject: string | null;
        points: number; category: string | null; quiz_date: string;
    }>;
    evaluations: Array<{
        student_id: string; is_published: boolean;
    }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
};

const parseTimestamp = (dateStr?: string | null): number => {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
};

const getStudentName = (studentId: string, students: Array<{ id: string; name: string }>): string =>
    students.find(s => s.id === studentId)?.name || 'Tidak Diketahui';

const getAspectLabel = (description: string): string => {
    const aspect = getAspectForViolation(description);
    const labels: Record<string, string> = { ADAB: 'Adab', KEDISIPLINAN: 'Disiplin', KERAPIAN: 'Rapi' };
    return labels[aspect] || aspect;
};

const getGradeColorLabel = (grade: BintangGrade): string => {
    const labels: Record<string, string> = { A: 'A (Sangat Baik)', B: 'B (Baik)', C: 'C (Cukup)', D: 'D (Kurang)' };
    return labels[grade] || grade;
};

// ─── Main Export Function ───────────────────────────────────────────────────

export const exportBintangToExcel = async (options: BintangExcelOptions): Promise<void> => {
    const {
        className = 'Kelas',
        schoolName = 'LAPORAN PROGRAM BINTANG',
        monthName = '',
        academicYear = '',
        semesterName = '',
        students = [],
        violations = [],
        quizPoints = [],
        evaluations = [],
    } = options || {};

    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = schoolName;

    const exportDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    const borderAll = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    } as Partial<import('exceljs').Borders>;
    const fontBold = { bold: true, size: 11, name: 'Arial' };
    const fontHeader = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    
    // Helper to style header row
    const styleHeaderRow = (row: import('exceljs').Row, totalCols: number) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalCols) {
                cell.font = fontBold;
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
                cell.border = borderAll;
            }
        });
    };

    // ── Build per-student summaries ──────────────────────────────────────────
    const studentSummaries: StudentSummary[] = (students || []).map(student => {
        const studentVios = (violations || []).filter(v => v && v.student_id === student.id);
        const rawPoints = studentVios.map(v => ({ description: v.description || '', points: Number(v.points) || 0 }));
        const studentQP = (quizPoints || []).filter(q => q && q.student_id === student.id);
        const totalQP = studentQP.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
        const aspects = calculateAspectPoints(rawPoints, totalQP);

        const evalRecord = (evaluations || []).find(e => e && e.student_id === student.id);
        let evalStatus: StudentSummary['evaluationStatus'] = 'Auto';
        if (evalRecord?.is_published) evalStatus = 'Published';
        else if (evalRecord) evalStatus = 'Draft';

        return {
            id: student.id,
            name: student.name || 'Siswa',
            totalViolationPoints: studentVios.reduce((s, v) => s + (Number(v.points) || 0), 0),
            totalViolations: studentVios.length,
            aspects,
            keaktifanPoints: totalQP,
            keaktifanCount: studentQP.length,
            evaluationStatus: evalStatus,
        };
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SHEET 1: Rekap Kelas
    // ═══════════════════════════════════════════════════════════════════════
    const wsRekap = workbook.addWorksheet('Rekap Kelas');
    const totalColsRekap = 13;
    
    wsRekap.mergeCells(1, 1, 1, totalColsRekap);
    const title1Rekap = wsRekap.getCell(1, 1);
    title1Rekap.value = (schoolName || '').toUpperCase();
    title1Rekap.font = fontHeader;
    title1Rekap.alignment = { horizontal: 'center', vertical: 'middle' };
    title1Rekap.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF073642' } }; 

    wsRekap.mergeCells(2, 1, 2, totalColsRekap);
    const title2Rekap = wsRekap.getCell(2, 1);
    title2Rekap.value = 'LAPORAN PROGRAM BINTANG (Bina Tertib dan Tanggung Jawab)';
    title2Rekap.font = fontBold;
    title2Rekap.alignment = { horizontal: 'center', vertical: 'middle' };

    wsRekap.mergeCells(3, 1, 3, totalColsRekap);
    const title3Rekap = wsRekap.getCell(3, 1);
    title3Rekap.value = `KELAS: ${(className || '').toUpperCase()}`;
    title3Rekap.font = fontBold;
    title3Rekap.alignment = { horizontal: 'center', vertical: 'middle' };
    
    wsRekap.mergeCells(4, 1, 4, totalColsRekap);
    wsRekap.getCell(4, 1).value = `Periode: ${monthName} | Semester ${semesterName} TA ${academicYear}`;
    wsRekap.getCell(4, 1).alignment = { horizontal: 'center' };

    wsRekap.mergeCells(5, 1, 5, totalColsRekap);
    wsRekap.getCell(5, 1).value = `Tanggal Export: ${exportDate}`;
    wsRekap.getCell(5, 1).alignment = { horizontal: 'center' };

    wsRekap.addRow([]);

    const headerRekap = wsRekap.addRow([
        'No', 'Nama Siswa', 'Total Poin Pelanggaran', 'Jumlah Pelanggaran',
        'Adab (Poin)', 'Adab (Grade)', 'Disiplin (Poin)', 'Disiplin (Grade)',
        'Rapi (Poin)', 'Rapi (Grade)',
        'Poin Keaktifan', 'Frekuensi Keaktifan',
        'Status Evaluasi'
    ]);
    styleHeaderRow(headerRekap, totalColsRekap);

    // Set widths
    wsRekap.getColumn(1).width = 5;
    wsRekap.getColumn(2).width = 45;
    wsRekap.getColumn(3).width = 15;
    wsRekap.getColumn(4).width = 15;
    wsRekap.getColumn(5).width = 15;
    wsRekap.getColumn(6).width = 20;
    wsRekap.getColumn(7).width = 15;
    wsRekap.getColumn(8).width = 20;
    wsRekap.getColumn(9).width = 15;
    wsRekap.getColumn(10).width = 20;
    wsRekap.getColumn(11).width = 15;
    wsRekap.getColumn(12).width = 15;
    wsRekap.getColumn(13).width = 18;

    studentSummaries.forEach((s, idx) => {
        const row = wsRekap.addRow([
            idx + 1,
            s.name,
            s.totalViolationPoints,
            s.totalViolations,
            s.aspects.ADAB.points, getGradeColorLabel(s.aspects.ADAB.grade),
            s.aspects.KEDISIPLINAN.points, getGradeColorLabel(s.aspects.KEDISIPLINAN.grade),
            s.aspects.KERAPIAN.points, getGradeColorLabel(s.aspects.KERAPIAN.grade),
            s.keaktifanPoints,
            s.keaktifanCount,
            s.evaluationStatus,
        ]);
        
        const fillColor = idx % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColsRekap) {
                cell.border = borderAll;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                if (colNumber === 1 || colNumber >= 3) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
                
                // Colorize grades
                if ([6, 8, 10].includes(colNumber)) {
                    const gradeVal = cell.value?.toString() || '';
                    if (gradeVal.startsWith('A')) cell.font = { color: { argb: 'FF16A34A' }, bold: true };
                    else if (gradeVal.startsWith('B')) cell.font = { color: { argb: 'FF2563EB' }, bold: true };
                    else if (gradeVal.startsWith('C')) cell.font = { color: { argb: 'FFCA8A04' }, bold: true };
                    else if (gradeVal.startsWith('D')) cell.font = { color: { argb: 'FFDC2626' }, bold: true };
                }
            }
        });
    });

    wsRekap.addRow([]);
    const summaryRow = wsRekap.addRow([
        '', 'TOTAL KELAS',
        studentSummaries.reduce((s, st) => s + st.totalViolationPoints, 0),
        studentSummaries.reduce((s, st) => s + st.totalViolations, 0),
        studentSummaries.reduce((s, st) => s + st.aspects.ADAB.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.aspects.KEDISIPLINAN.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.aspects.KERAPIAN.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.keaktifanPoints, 0),
        studentSummaries.reduce((s, st) => s + st.keaktifanCount, 0), '',
    ]);
    summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= totalColsRekap) {
            cell.font = fontBold;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = borderAll;
            if (colNumber >= 3) cell.alignment = { horizontal: 'center' };
        }
    });

    wsRekap.addRow([]);
    wsRekap.addRow(['Keterangan Grade:']).font = fontBold;
    wsRekap.addRow(['A = 0 poin (Sangat Baik)']);
    wsRekap.addRow(['B = 1-10 poin (Baik)']);
    wsRekap.addRow(['C = 11-20 poin (Cukup)']);
    wsRekap.addRow(['D = >20 poin (Kurang)']);

    // ═══════════════════════════════════════════════════════════════════════
    // SHEET 2: Rincian Pelanggaran
    // ═══════════════════════════════════════════════════════════════════════
    const wsVios = workbook.addWorksheet('Pelanggaran');
    const totalColsVios = 7;
    
    wsVios.mergeCells(1, 1, 1, totalColsVios);
    const title1Vios = wsVios.getCell(1, 1);
    title1Vios.value = (schoolName || '').toUpperCase();
    title1Vios.font = fontHeader;
    title1Vios.alignment = { horizontal: 'center', vertical: 'middle' };
    title1Vios.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF073642' } }; 

    wsVios.mergeCells(2, 1, 2, totalColsVios);
    const title2Vios = wsVios.getCell(2, 1);
    title2Vios.value = 'RINCIAN PELANGGARAN - PROGRAM BINTANG';
    title2Vios.font = fontBold;
    title2Vios.alignment = { horizontal: 'center', vertical: 'middle' };

    wsVios.mergeCells(3, 1, 3, totalColsVios);
    wsVios.getCell(3, 1).value = `Kelas: ${className} | Periode: ${monthName}`;
    wsVios.getCell(3, 1).alignment = { horizontal: 'center' };

    wsVios.mergeCells(4, 1, 4, totalColsVios);
    wsVios.getCell(4, 1).value = `Tanggal Export: ${exportDate}`;
    wsVios.getCell(4, 1).alignment = { horizontal: 'center' };

    wsVios.addRow([]);

    const headerVios = wsVios.addRow(['No', 'Tanggal', 'Nama Siswa', 'Deskripsi Pelanggaran', 'Aspek BINTANG', 'Poin', 'Severity']);
    styleHeaderRow(headerVios, totalColsVios);

    wsVios.getColumn(1).width = 5;
    wsVios.getColumn(2).width = 15;
    wsVios.getColumn(3).width = 45;
    wsVios.getColumn(4).width = 45;
    wsVios.getColumn(5).width = 20;
    wsVios.getColumn(6).width = 10;
    wsVios.getColumn(7).width = 15;

    const sortedViolations = [...(violations || [])].sort(
        (a, b) => parseTimestamp(a?.date) - parseTimestamp(b?.date)
    );

    sortedViolations.forEach((v, idx) => {
        const studentName = v.students?.name || getStudentName(v.student_id, students);
        const aspectLabel = getAspectLabel(v.description || '');
        const severityLabel = v.severity
            ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1))
            : '-';

        const row = wsVios.addRow([
            idx + 1,
            formatDate(v.date),
            studentName,
            v.description || '-',
            aspectLabel,
            Number(v.points) || 0,
            severityLabel,
        ]);
        
        const fillColor = idx % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColsVios) {
                cell.border = borderAll;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6 || colNumber === 7) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                } else {
                    cell.alignment = { vertical: 'middle', wrapText: true };
                }
                
                if (colNumber === 6) cell.font = { color: { argb: 'FFDC2626' }, bold: true };
            }
        });
    });

    wsVios.addRow([]);
    const totalViosPoints = (violations || []).reduce((s, v) => s + (Number(v?.points) || 0), 0);
    const summaryVios = wsVios.addRow(['', '', '', `TOTAL`, '', totalViosPoints, '']);
    summaryVios.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= totalColsVios && (colNumber === 4 || colNumber === 6)) {
            cell.font = fontBold;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = borderAll;
            cell.alignment = { horizontal: 'center' };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SHEET 3: Rincian Poin Keaktifan
    // ═══════════════════════════════════════════════════════════════════════
    const wsQP = workbook.addWorksheet('Poin Keaktifan');
    const totalColsQP = 6;
    
    wsQP.mergeCells(1, 1, 1, totalColsQP);
    const title1QP = wsQP.getCell(1, 1);
    title1QP.value = (schoolName || '').toUpperCase();
    title1QP.font = fontHeader;
    title1QP.alignment = { horizontal: 'center', vertical: 'middle' };
    title1QP.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF073642' } }; 

    wsQP.mergeCells(2, 1, 2, totalColsQP);
    const title2QP = wsQP.getCell(2, 1);
    title2QP.value = 'RINCIAN POIN KEAKTIFAN - PROGRAM BINTANG';
    title2QP.font = fontBold;
    title2QP.alignment = { horizontal: 'center', vertical: 'middle' };

    wsQP.mergeCells(3, 1, 3, totalColsQP);
    wsQP.getCell(3, 1).value = `Kelas: ${className} | Periode: ${monthName}`;
    wsQP.getCell(3, 1).alignment = { horizontal: 'center' };

    wsQP.mergeCells(4, 1, 4, totalColsQP);
    wsQP.getCell(4, 1).value = `Tanggal Export: ${exportDate}`;
    wsQP.getCell(4, 1).alignment = { horizontal: 'center' };

    wsQP.addRow([]);

    const headerQP = wsQP.addRow(['No', 'Tanggal', 'Nama Siswa', 'Aktivitas', 'Tipe', 'Poin']);
    styleHeaderRow(headerQP, totalColsQP);

    wsQP.getColumn(1).width = 5;
    wsQP.getColumn(2).width = 15;
    wsQP.getColumn(3).width = 45;
    wsQP.getColumn(4).width = 40;
    wsQP.getColumn(5).width = 45;
    wsQP.getColumn(6).width = 10;

    const sortedQP = [...(quizPoints || [])].sort(
        (a, b) => parseTimestamp(b?.quiz_date) - parseTimestamp(a?.quiz_date)
    );

    sortedQP.forEach((q, idx) => {
        const studentName = getStudentName(q.student_id, students);
        const activityType = q.subject != null ? `📚 ${q.subject} (Akademik)` : '⚡ Keaktifan Umum';

        const row = wsQP.addRow([
            idx + 1,
            formatDate(q.quiz_date),
            studentName,
            q.quiz_name || '-',
            activityType,
            Number(q.points) || 0,
        ]);
        
        const fillColor = idx % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColsQP) {
                cell.border = borderAll;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                if (colNumber === 1 || colNumber === 2 || colNumber === 6) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                } else {
                    cell.alignment = { vertical: 'middle', wrapText: true };
                }
                
                if (colNumber === 6) cell.font = { color: { argb: 'FF16A34A' }, bold: true };
            }
        });
    });

    wsQP.addRow([]);
    const totalQPPoints = (quizPoints || []).reduce((s, q) => s + (Number(q?.points) || 0), 0);
    const summaryQP = wsQP.addRow(['', '', '', `TOTAL`, '', totalQPPoints]);
    summaryQP.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= totalColsQP && (colNumber === 4 || colNumber === 6)) {
            cell.font = fontBold;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = borderAll;
            cell.alignment = { horizontal: 'center' };
        }
    });

    // ── Save ─────────────────────────────────────────────────────────────────
    const safeClassName = (className || 'Kelas').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanMonth = (monthName || 'Bulan').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `BINTANG_${safeClassName}_${cleanMonth}.xlsx`;
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
};
