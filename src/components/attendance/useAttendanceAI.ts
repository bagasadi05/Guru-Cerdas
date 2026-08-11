/**
 * @fileoverview useAttendanceAI — AI analysis for attendance data
 *
 * Extracted from useAttendance.ts to reduce complexity.
 * Handles AI analysis modal state and attendance analysis via OpenRouter.
 */

import { useState } from 'react';
import { generateGeminiJson } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import { AiAnalysis, AttendanceRow, StudentRow } from '../../types';

export const useAttendanceAI = (
  selectedClass: string,
  students: StudentRow[],
  attendanceHistory: AttendanceRow[],
) => {
  const toast = useToast();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AiAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAnalyzeAttendance = async () => {
    if (!selectedClass || !students || students.length === 0) return;
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    setAiAnalysisResult(null);

    try {
      const historyText = attendanceHistory
        .map((r: AttendanceRow) => `${r.date}: Student ID ${r.student_id} is ${r.status}`)
        .join('\n');

      const prompt = `Lakukan analisis data kehadiran historis untuk Kelas ${selectedClass} berikut:
Daftar Siswa: ${students.map(s => `ID: ${s.id}, Nama: ${s.name}`).join('; ')}
Data Riwayat Absensi:
${historyText || 'Tidak ada riwayat absensi.'}

Berikan analisis dalam format JSON murni yang sesuai dengan schema TypeScript:
{
  "perfect_attendance": ["nama siswa yang hadir sempurna"],
  "frequent_absentees": [{"student_name": "nama", "absent_days": jumlah_hari}],
  "pattern_warnings": [{"pattern_description": "deskripsi pola", "implicated_students": ["nama siswa"]}]
}`;

      const jsonData = await generateGeminiJson<AiAnalysis>(prompt, undefined, 'insight');
      setAiAnalysisResult(jsonData);
    } catch (err: unknown) {
      toast.error('Gagal menganalisis data. Coba lagi dalam beberapa saat.');
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return {
    isAiModalOpen,
    setIsAiModalOpen,
    aiAnalysisResult,
    setAiAnalysisResult,
    isAiLoading,
    setIsAiLoading,
    handleAnalyzeAttendance,
  };
};
