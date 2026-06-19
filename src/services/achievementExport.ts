/**
 * Service for exporting student achievement portfolio data.
 * Supports Excel (Structured Data).
 *
 * @module services/achievementExport
 */

import { getXLSX } from '../utils/dynamicImports';
import { StudentAchievement } from '../types/studentAchievement';

interface AchievementExportOptions {
    studentName: string;
    className?: string;
    schoolName: string;
    achievements: StudentAchievement[];
    teacherName?: string;
}

const getTeacherSignatureText = (teacherName?: string) =>
    teacherName?.trim() ? `(${teacherName.trim()})` : '(___________________)';

/**
 * Export Achievements to Excel
 */
export const exportAchievementsToExcel = async (options: AchievementExportOptions): Promise<void> => {
    const { studentName, className, schoolName, achievements, teacherName } = options;
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

    // 1. Header Information
    const ws_data: any[][] = [
        [schoolName],
        ['PORTOFOLIO PRESTASI SISWA'],
        [],
        ['Nama Siswa', studentName],
        ['Kelas', className || '-'],
        ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
        ['Jumlah Prestasi', achievements.length],
        [],
        ['No', 'Nama Prestasi / Lomba', 'Bidang', 'Tingkat', 'Peringkat', 'Tanggal', 'Penyelenggara', 'Poin', 'Deskripsi']
    ];

    // 2. Data Rows
    achievements.forEach((ach, index) => {
        const catLabel = ach.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        const lvlLabel = ach.level.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        const rnkLabel = ach.rank ? ach.rank.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-';
        ws_data.push([
            index + 1,
            ach.title,
            catLabel,
            lvlLabel,
            rnkLabel,
            new Date(ach.date).toLocaleDateString('id-ID'),
            ach.organizer || '-',
            ach.points || 0,
            ach.description || '-'
        ]);
    });

    ws_data.push([]);
    ws_data.push(['', 'Mengetahui,', '', '', '', 'Mengetahui,']);
    ws_data.push(['', 'Orang Tua/Wali', '', '', '', 'Wali Kelas']);
    ws_data.push([]);
    ws_data.push([]);
    ws_data.push(['', '(___________________)', '', '', '', getTeacherSignatureText(teacherName)]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths
    const wscols = [
        { wch: 5 },  // No
        { wch: 30 }, // Nama Prestasi
        { wch: 15 }, // Bidang
        { wch: 15 }, // Tingkat
        { wch: 15 }, // Peringkat
        { wch: 15 }, // Tanggal
        { wch: 25 }, // Penyelenggara
        { wch: 8 },  // Poin
        { wch: 35 }  // Deskripsi
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Prestasi');
    await XLSX.writeFile(wb, `Data_Prestasi_${studentName.replace(/\s+/g, '_')}.xlsx`);
};

interface StudentInfo {
    id: string;
    name: string;
    gender?: string;
    avatar_url?: string | null;
}

interface BulkAchievementExportOptions {
    className: string;
    schoolName: string;
    achievements: StudentAchievement[];
    students: StudentInfo[];
    teacherName?: string;
}

/**
 * Export Class Achievements to Excel - One Sheet Per Student
 */
export const exportBulkAchievementsToExcel = async (options: BulkAchievementExportOptions) => {
    const { className, schoolName, achievements, students, teacherName } = options;
    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new();

    // Create student lookup map
    const studentMap = new Map(students.map(s => [s.id, s.name]));

    // Group achievements by student
    const groupedByStudent = new Map<string, StudentAchievement[]>();
    achievements.forEach(ach => {
        const existing = groupedByStudent.get(ach.student_id) || [];
        existing.push(ach);
        groupedByStudent.set(ach.student_id, existing);
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
        const studentAchievements = groupedByStudent.get(studentId) || [];
        const studentName = studentMap.get(studentId) || 'Tidak Diketahui';

        const sheetName = `${index + 1}. ${studentName}`.substring(0, 31);
        const rows: (string | number)[][] = [
            [schoolName.toUpperCase()],
            ['LAPORAN PORTOFOLIO PRESTASI SISWA'],
            [],
            ['Nama Siswa:', studentName],
            ['Kelas:', className],
            ['Tanggal:', dateStr],
            ['Jumlah Prestasi:', studentAchievements.length],
            [],
            ['No', 'Nama Prestasi / Lomba', 'Bidang', 'Tingkat', 'Peringkat', 'Tanggal', 'Penyelenggara', 'Poin', 'Deskripsi'],
        ];

        studentAchievements.forEach((ach, idx) => {
            const catLabel = ach.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const lvlLabel = ach.level.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const rnkLabel = ach.rank ? ach.rank.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-';
            rows.push([
                idx + 1,
                ach.title,
                catLabel,
                lvlLabel,
                rnkLabel,
                new Date(ach.date).toLocaleDateString('id-ID'),
                ach.organizer || '-',
                ach.points || 0,
                ach.description || '-'
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
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        ];
        worksheet['!cols'] = [
            { wch: 6 },
            { wch: 30 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 14 },
            { wch: 25 },
            { wch: 8 },
            { wch: 35 },
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    await XLSX.writeFile(workbook, `Laporan_Prestasi_${className.replace(/\s+/g, '_')}.xlsx`);
};
