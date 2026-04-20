import { AcademicRecordRow, AttendanceRow, QuizPointRow, ViolationRow } from './types';

export type StudentCommunicationSignal = {
    id: string;
    label: string;
    message: string;
    tone: 'warning' | 'success' | 'info';
};

export const resolveSubmitSemesterId = (
    existingSemesterId: string | null | undefined,
    selectedSemesterId: string | null | undefined,
    activeSemesterId: string | null | undefined
) => existingSemesterId ?? selectedSemesterId ?? activeSemesterId ?? null;

export const getAvailableQuizPoints = (quizPoints: QuizPointRow[]) => quizPoints.filter(point => !point.is_used);

export const getLatestRecordForSubject = (records: AcademicRecordRow[], subject: string) => {
    if (!subject) return null;
    return [...records]
        .filter(record => record.subject === subject)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
};

export const extractStoragePathFromPublicUrl = (publicUrl: string | null | undefined, bucket: string) => {
    if (!publicUrl) return null;
    try {
        const url = new URL(publicUrl);
        const marker = `/${bucket}/`;
        const [, path] = url.pathname.split(marker);
        return path ? decodeURIComponent(path) : null;
    } catch {
        return null;
    }
};

export const buildStudentCommunicationSignals = (params: {
    studentName: string;
    academicRecords: AcademicRecordRow[];
    attendanceRecords: AttendanceRow[];
    violations: ViolationRow[];
}) => {
    const { studentName, academicRecords, attendanceRecords, violations } = params;
    const signals: StudentCommunicationSignal[] = [];
    const alphaCount = attendanceRecords.filter(record => record.status === 'Alpha').length;
    const totalViolationPoints = violations.reduce((sum, violation) => sum + violation.points, 0);
    const latestScores = [...academicRecords]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    const lowScores = latestScores.filter(record => record.score < 75);
    const highScores = latestScores.filter(record => record.score >= 85);

    if (lowScores.length > 0) {
        const subjects = lowScores.map(record => record.subject).join(', ');
        signals.push({
            id: 'academic-support',
            label: 'Nilai Perlu Perhatian',
            tone: 'warning',
            message: `Yth. Bapak/Ibu Wali,\n\nKami ingin menginformasikan bahwa ${studentName} perlu pendampingan tambahan pada mata pelajaran ${subjects}. Mohon bantu mengulang materi di rumah dan menjaga rutinitas belajar.\n\nTerima kasih atas kerja samanya.`,
        });
    }

    if (alphaCount > 0) {
        signals.push({
            id: 'attendance-alpha',
            label: 'Kehadiran Alpha',
            tone: 'warning',
            message: `Yth. Bapak/Ibu Wali,\n\nKami mencatat ${studentName} memiliki ${alphaCount} ketidakhadiran tanpa keterangan pada semester ini. Mohon konfirmasi dan bantu memastikan kehadiran siswa lebih konsisten.\n\nTerima kasih.`,
        });
    }

    if (totalViolationPoints > 0) {
        signals.push({
            id: 'behavior-followup',
            label: 'Tindak Lanjut Perilaku',
            tone: 'warning',
            message: `Yth. Bapak/Ibu Wali,\n\nKami mencatat ${studentName} memiliki ${totalViolationPoints} poin pelanggaran pada semester ini. Mohon kerja samanya untuk memberikan arahan di rumah agar perilaku siswa semakin baik.\n\nTerima kasih.`,
        });
    }

    if (highScores.length > 0 || (alphaCount === 0 && totalViolationPoints === 0 && academicRecords.length > 0)) {
        signals.push({
            id: 'appreciation',
            label: 'Apresiasi Siswa',
            tone: 'success',
            message: `Yth. Bapak/Ibu Wali,\n\nKami ingin menyampaikan apresiasi atas perkembangan positif ${studentName}. Terima kasih atas dukungan Bapak/Ibu di rumah. Semoga konsistensi baik ini dapat terus dipertahankan.\n\nSalam hangat.`,
        });
    }

    if (signals.length === 0) {
        signals.push({
            id: 'general-update',
            label: 'Kabar Umum',
            tone: 'info',
            message: `Yth. Bapak/Ibu Wali,\n\nKami ingin menyampaikan kabar perkembangan ${studentName}. Jika ada hal yang ingin didiskusikan terkait pembelajaran atau kehadiran, Bapak/Ibu dapat membalas pesan ini.\n\nTerima kasih.`,
        });
    }

    return signals;
};
