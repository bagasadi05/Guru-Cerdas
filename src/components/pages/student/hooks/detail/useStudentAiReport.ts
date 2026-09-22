import { useState, useEffect, useRef } from 'react';
import { AcademicRecordRow, AttendanceRow, ModalState, QuizPointRow, StudentWithClass, ViolationRow } from '../../types';

interface UseStudentAiReportParams {
    studentDetails: { student: StudentWithClass } | null;
    selectedSemesterLabel: string;
    filteredAcademicRecords: AcademicRecordRow[];
    filteredAttendance: AttendanceRow[];
    attendanceSummary: { Hadir: number; Sakit: number; Izin: number; Alpha: number; Libur: number };
    filteredQuizPoints: QuizPointRow[];
    filteredViolations: ViolationRow[];
    totalViolationPoints: number;
    modalState: ModalState;
}

export function useStudentAiReport({
    studentDetails,
    selectedSemesterLabel,
    filteredAcademicRecords,
    filteredAttendance,
    attendanceSummary,
    filteredQuizPoints,
    filteredViolations,
    totalViolationPoints,
    modalState,
}: UseStudentAiReportParams) {
    const [aiReport, setAiReport] = useState('');
    const [isAiReportLoading, setIsAiReportLoading] = useState(false);
    const [aiReportError, setAiReportError] = useState('');
    const [copiedAiReport, setCopiedAiReport] = useState(false);

    const handleGenerateAiReport = async () => {
        if (!studentDetails?.student) return;
        setIsAiReportLoading(true);
        setAiReportError('');
        try {
            const { generateGeminiContent, getAssistantContent } = await import('../../../../../services/geminiService');

            const avgScore = filteredAcademicRecords.length > 0
                ? Math.round(filteredAcademicRecords.reduce((a, b) => a + b.score, 0) / filteredAcademicRecords.length)
                : 'N/A';
            const attendanceRate = filteredAttendance.length > 0
                ? Math.round((filteredAttendance.filter(r => r.status === 'Hadir').length / filteredAttendance.length) * 100)
                : 100;
            const violationCount = filteredViolations.length;

            const systemPrompt = `Anda adalah wali kelas yang bijaksana, peduli, dan profesional di Madrasah Ibtidaiyah. Anda ditugaskan untuk menyusun laporan perkembangan berkala siswa ("Rapor Perkembangan Wali Kelas") untuk dibagikan kepada orang tua melalui WhatsApp.

ATURAN DAN FORMAT PENULISAN:
1. Gunakan bahasa Indonesia yang santun, hangat, mengayomi, dan memberikan kesan peduli serta apresiatif. Sapa orang tua dengan hangat dan santun (Ayah/Bunda dari [Nama Siswa]).
2. FORMAT OUTPUT HARUS RAPI dan menggunakan EMOJI menarik agar mudah dibaca di WhatsApp. Gunakan garis pemisah/bold yang sesuai.
3. Struktur laporan wajib mencakup:
   - *SALAM & PEMBUKA*: Salam hangat pembuka, sebutkan nama siswa dan kelasnya.
   - *📊 RINGKASAN AKADEMIK*: Sebutkan rata-rata nilai dan apresiasi atas kerja kerasnya di mata pelajaran tertentu (jika ada).
   - *🌟 AKTIVITAS & KEAKTIFAN*: Sebutkan partisipasi positif siswa, poin keaktifan yang diperoleh, dan bagaimana hal itu membantu perkembangan dirinya.
   - *📅 KEHADIRAN*: Persentase kehadiran dan apresiasi kedisiplinan atau pesan motivasi jika kehadiran kurang optimal.
   - *⚠️ PERILAKU & DISIPLIN*: Sampaikan evaluasi perilaku secara objektif dan halus. Jika ada pelanggaran, sebutkan perlunya bimbingan bersama. Jika nihil pelanggaran, berikan pujian luar biasa.
   - *💡 SARAN & MOTIVASI WALI KELAS*: Kalimat penyemangat, saran konkret untuk pendampingan belajar di rumah, serta ajakan kolaborasi yang hangat antara sekolah dan orang tua.
   - *PENUTUP*: Doa dan salam penutup dari Wali Kelas.
4. Jangan menuliskan teks penjelasan teknis atau metadata di luar isi pesan. Langsung berikan teks pesan WhatsApp yang siap disalin.`;

            const prompt = `Susunlah laporan perkembangan WhatsApp terperinci untuk siswa berikut:
- Nama Siswa: ${studentDetails.student.name}
- Kelas: ${studentDetails.student.classes?.name || 'N/A'}
- Semester: ${selectedSemesterLabel}
- Rata-rata Nilai Akademik: ${avgScore} (dari ${filteredAcademicRecords.length} penilaian)
- Detail Nilai: ${filteredAcademicRecords.map(r => `${r.subject}: ${r.score} (${r.assessment_name})`).join(', ') || 'Belum ada penilaian'}
- Kehadiran: ${attendanceRate}% (Hadir: ${attendanceSummary.Hadir}, Sakit: ${attendanceSummary.Sakit}, Izin: ${attendanceSummary.Izin}, Alpha: ${attendanceSummary.Alpha})
- Keaktifan (Poin): ${filteredQuizPoints.length} poin (Detail: ${filteredQuizPoints.map(q => q.quiz_name).join(', ') || 'Belum ada catatan keaktifan'})
- Catatan Pelanggaran: ${violationCount} kejadian (Total Poin Pelanggaran: ${totalViolationPoints})
${filteredViolations.length > 0 ? `- Detail Pelanggaran: ${filteredViolations.map(v => `${v.description} (${v.points} poin)`).join(', ')}` : '- Catatan Perilaku: Sangat baik, tidak memiliki catatan pelanggaran.'}

Tulis laporan yang menyentuh hati, memotivasi, dan komprehensif agar orang tua memahami betul perkembangan anaknya secara holistik. Gunakan format WhatsApp yang indah.`;

            const response = await generateGeminiContent([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ], 'teacher-report');

            const text = getAssistantContent(response) || '';
            setAiReport(text.trim());
        } catch (err: unknown) {
            console.error('Error generating AI report:', err);
            setAiReportError(err instanceof Error ? err.message : 'Gagal menghasilkan laporan AI. Silakan coba lagi.');
        } finally {
            setIsAiReportLoading(false);
        }
    };

    const handleGenerateAiReportRef = useRef(handleGenerateAiReport);
    handleGenerateAiReportRef.current = handleGenerateAiReport;

    useEffect(() => {
        if (modalState.type === 'aiAssistant') {
            handleGenerateAiReportRef.current();
        } else {
            setAiReport('');
            setAiReportError('');
            setCopiedAiReport(false);
        }
    }, [modalState.type]);

    return {
        aiReport,
        setAiReport,
        isAiReportLoading,
        aiReportError,
        copiedAiReport,
        setCopiedAiReport,
        handleGenerateAiReport,
    };
}
