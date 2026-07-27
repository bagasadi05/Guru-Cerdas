/**
 * Service for exporting BINTANG (Bina Tertib dan Tanggung Jawab) data to Excel.
 *
 * Generates a multi-sheet workbook with:
 * 1. Rekap Kelas — per-student summary with violation points, grades, and keaktifan points
 * 2. Rincian Pelanggaran — all violations for the class month
 * 3. Rincian Poin Keaktifan — all quiz/keaktifan points for the class month
 *
 * @module services/bintangExcelExport
 */

import { getXLSX } from '../utils/dynamicImports';
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

/**
 * Export BINTANG data to a multi-sheet Excel workbook.
 *
 * Sheet layout:
 * 1. **Rekap Kelas** — header → student rows (name, points, grades, keaktifan, status)
 * 2. **Pelanggaran** — header → violation detail rows with date, student, aspect
 * 3. **Keaktifan** — header → quiz/keaktifan rows with date, student, activity, type
 */
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

    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    const exportDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

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
    const rekapRows: (string | number)[][] = [
        [(schoolName || '').toUpperCase()],
        ['LAPORAN PROGRAM BINTANG (Bina Tertib dan Tanggung Jawab)'],
        [(className || '').toUpperCase()],
        [`Periode: ${monthName} | Semester ${semesterName} TA ${academicYear}`],
        [`Tanggal Export: ${exportDate}`],
        [],
        [
            'No', 'Nama Siswa', 'Total Poin Pelanggaran', 'Jumlah Pelanggaran',
            'Adab (Poin)', 'Adab (Grade)', 'Disiplin (Poin)', 'Disiplin (Grade)',
            'Rapi (Poin)', 'Rapi (Grade)',
            'Poin Keaktifan', 'Frekuensi Keaktifan',
            'Status Evaluasi',
        ],
    ];

    studentSummaries.forEach((s, idx) => {
        rekapRows.push([
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
    });

    // Summary row
    rekapRows.push([]);
    rekapRows.push([
        '', 'TOTAL KELAS',
        studentSummaries.reduce((s, st) => s + st.totalViolationPoints, 0),
        studentSummaries.reduce((s, st) => s + st.totalViolations, 0),
        studentSummaries.reduce((s, st) => s + st.aspects.ADAB.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.aspects.KEDISIPLINAN.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.aspects.KERAPIAN.points, 0), '',
        studentSummaries.reduce((s, st) => s + st.keaktifanPoints, 0),
        studentSummaries.reduce((s, st) => s + st.keaktifanCount, 0), '',
    ]);
    rekapRows.push([]);
    rekapRows.push(['Keterangan Grade:']);
    rekapRows.push(['A = 0 poin (Sangat Baik)', 'B = 1-10 poin (Baik)', 'C = 11-20 poin (Cukup)', 'D = >20 poin (Kurang)']);

    const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows);
    wsRekap['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 12 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 12 } },
    ];
    wsRekap['!cols'] = [
        { wch: 4 },   // No
        { wch: 25 },  // Nama Siswa
        { wch: 10 },  // Total Poin
        { wch: 10 },  // Jumlah
        { wch: 12 },  // Adab Poin
        { wch: 18 },  // Adab Grade
        { wch: 14 },  // Disiplin Poin
        { wch: 20 },  // Disiplin Grade
        { wch: 12 },  // Rapi Poin
        { wch: 16 },  // Rapi Grade
        { wch: 14 },  // Poin Keaktifan
        { wch: 14 },  // Frekuensi
        { wch: 16 },  // Status
    ];
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Kelas');

    // ═══════════════════════════════════════════════════════════════════════
    // SHEET 2: Rincian Pelanggaran
    // ═══════════════════════════════════════════════════════════════════════
    const viosRows: (string | number)[][] = [
        [(schoolName || '').toUpperCase()],
        ['RINCIAN PELANGGARAN - PROGRAM BINTANG'],
        [`Kelas: ${className} | Periode: ${monthName}`],
        [`Tanggal Export: ${exportDate}`],
        [],
        ['No', 'Tanggal', 'Nama Siswa', 'Deskripsi Pelanggaran', 'Aspek BINTANG', 'Poin', 'Severity'],
    ];

    const sortedViolations = [...(violations || [])].sort(
        (a, b) => parseTimestamp(a?.date) - parseTimestamp(b?.date)
    );

    sortedViolations.forEach((v, idx) => {
        const studentName = v.students?.name || getStudentName(v.student_id, students);
        const aspectLabel = getAspectLabel(v.description || '');
        const severityLabel = v.severity
            ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1))
            : '-';

        viosRows.push([
            idx + 1,
            formatDate(v.date),
            studentName,
            v.description || '-',
            aspectLabel,
            Number(v.points) || 0,
            severityLabel,
        ]);
    });

    viosRows.push([]);
    const totalViosPoints = (violations || []).reduce((s, v) => s + (Number(v?.points) || 0), 0);
    viosRows.push(['', '', '', `TOTAL`, '', totalViosPoints, '']);

    const wsVios = XLSX.utils.aoa_to_sheet(viosRows);
    wsVios['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    ];
    wsVios['!cols'] = [
        { wch: 4 },   // No
        { wch: 14 },  // Tanggal
        { wch: 25 },  // Nama Siswa
        { wch: 40 },  // Deskripsi
        { wch: 16 },  // Aspek
        { wch: 8 },   // Poin
        { wch: 14 },  // Severity
    ];
    XLSX.utils.book_append_sheet(wb, wsVios, 'Pelanggaran');

    // ═══════════════════════════════════════════════════════════════════════
    // SHEET 3: Rincian Poin Keaktifan
    // ═══════════════════════════════════════════════════════════════════════
    const qpRows: (string | number)[][] = [
        [(schoolName || '').toUpperCase()],
        ['RINCIAN POIN KEAKTIFAN - PROGRAM BINTANG'],
        [`Kelas: ${className} | Periode: ${monthName}`],
        [`Tanggal Export: ${exportDate}`],
        [],
        ['No', 'Tanggal', 'Nama Siswa', 'Aktivitas', 'Tipe', 'Poin'],
    ];

    const sortedQP = [...(quizPoints || [])].sort(
        (a, b) => parseTimestamp(b?.quiz_date) - parseTimestamp(a?.quiz_date)
    );

    sortedQP.forEach((q, idx) => {
        const studentName = getStudentName(q.student_id, students);
        const activityType = q.subject != null ? `📚 ${q.subject} (Akademik)` : '⚡ Keaktifan Umum';

        qpRows.push([
            idx + 1,
            formatDate(q.quiz_date),
            studentName,
            q.quiz_name || '-',
            activityType,
            Number(q.points) || 0,
        ]);
    });

    qpRows.push([]);
    const totalQPPoints = (quizPoints || []).reduce((s, q) => s + (Number(q?.points) || 0), 0);
    qpRows.push(['', '', '', `TOTAL`, '', totalQPPoints]);

    const wsQP = XLSX.utils.aoa_to_sheet(qpRows);
    wsQP['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    ];
    wsQP['!cols'] = [
        { wch: 4 },   // No
        { wch: 14 },  // Tanggal
        { wch: 25 },  // Nama Siswa
        { wch: 35 },  // Aktivitas
        { wch: 28 },  // Tipe
        { wch: 8 },   // Poin
    ];
    XLSX.utils.book_append_sheet(wb, wsQP, 'Poin Keaktifan');

    // ── Save ─────────────────────────────────────────────────────────────────
    const safeClassName = (className || 'Kelas').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanMonth = (monthName || 'Bulan').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `BINTANG_${safeClassName}_${cleanMonth}.xlsx`;
    await XLSX.writeFile(wb, fileName);
};

