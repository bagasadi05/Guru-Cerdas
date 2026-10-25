import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../../hooks/useToast';
import {
  generateComprehensiveChildAnalysis,
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
  saveAnalysisToDb,
  getLatestAnalysisFromDb,
  getAnalysisForSemesterFromDb,
} from '../../../../../services/childDevelopmentAnalysis';
import { stripMarkdown, sanitizeAnalysisData } from '../../../../../utils/textSanitizer';
import { exportSingleChildDevelopmentPDF } from '../utils/childDevelopmentPdfExport';
import type { SemesterRow, AcademicYearRow } from '../../../../../types';
import type { SemesterWithYear } from '../../../../../contexts/SemesterContext';
import type {
  SubjectAverage,
  PeriodStats,
  GlanceSummary,
  DevelopmentBadges,
  ActionableRecommendationItem,
} from '../types/childDevelopmentTypes';

interface UseSingleChildAnalysisParams {
  studentData: ChildDevelopmentData;
  selectedSemesterId?: string | null;
  selectedAcademicYearId?: string | null;
  semesters: (SemesterRow | SemesterWithYear)[];
  activeAcademicYear: AcademicYearRow | null;
  schoolName: string;
  principalName?: string;
}

export const useSingleChildAnalysis = ({
  studentData,
  selectedSemesterId = null,
  selectedAcademicYearId = null,
  semesters,
  activeAcademicYear,
  schoolName,
  principalName = 'H. Masturi, S.Pd.I.',
}: UseSingleChildAnalysisParams) => {
  const [analysis, setAnalysis] = useState<ComprehensiveChildAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [, setRetryCount] = useState(0);

  const toast = useToast();

  // Calculate subject averages for analytics
  const subjectAverages = useMemo<SubjectAverage[]>(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    studentData.academicRecords.forEach((record) => {
      const subject = record.subject || 'Lainnya';
      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0 };
      subjectMap[subject].total += record.score;
      subjectMap[subject].count++;
    });
    return Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
    }));
  }, [studentData.academicRecords]);

  // Calculate period comparison (simulate based on record order)
  const periodStats = useMemo<PeriodStats>(() => {
    const records = studentData.academicRecords;
    const totalRecords = records.length;

    if (totalRecords < 4) {
      const avg =
        totalRecords > 0
          ? Math.round(records.reduce((a, b) => a + b.score, 0) / totalRecords)
          : 0;
      return { currentAvg: avg, previousAvg: 0 };
    }

    const midPoint = Math.floor(totalRecords / 2);
    const recentRecords = records.slice(midPoint);
    const olderRecords = records.slice(0, midPoint);

    const currentAvg = Math.round(
      recentRecords.reduce((a, b) => a + b.score, 0) / recentRecords.length
    );
    const previousAvg = Math.round(
      olderRecords.reduce((a, b) => a + b.score, 0) / olderRecords.length
    );

    return { currentAvg, previousAvg };
  }, [studentData.academicRecords]);

  const subjects = useMemo(() => subjectAverages.map((s) => s.subject), [subjectAverages]);
  const studentScores = useMemo(() => subjectAverages.map((s) => s.average), [subjectAverages]);
  const overallAverage = useMemo(
    () =>
      studentScores.length > 0
        ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length)
        : 0,
    [studentScores]
  );

  const attendanceRate = useMemo(() => {
    const attendanceRecords = studentData.attendanceRecords || [];
    return attendanceRecords.length > 0
      ? Math.round(
          (attendanceRecords.filter((a) => a.status === 'Hadir').length / attendanceRecords.length) * 100
        )
      : 100;
  }, [studentData.attendanceRecords]);

  const keaktifan = useMemo(() => {
    const quizTotal = studentData.quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
    const quizCount = studentData.quizPoints.length;
    return quizTotal > 0 ? Math.min(quizTotal * 5, 100) : Math.min(quizCount * 15, 100);
  }, [studentData.quizPoints]);

  const isRadarChartValid = subjects.length >= 3;

  const getStorageKey = useCallback(
    () =>
      `child_analysis_${studentData.student.id}${
        selectedSemesterId ? `_${selectedSemesterId}` : ''
      }`,
    [studentData.student.id, selectedSemesterId]
  );

  const selectedSemester = useMemo(() => {
    if (!selectedSemesterId) return null;
    return semesters.find((s) => s.id === selectedSemesterId);
  }, [semesters, selectedSemesterId]);

  const resolvedAcademicYearId =
    selectedAcademicYearId || selectedSemester?.academic_year_id || activeAcademicYear?.id;

  // Load from database / local storage on mount
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const dbAnalysis = selectedSemesterId
          ? await getAnalysisForSemesterFromDb(studentData.student.id, selectedSemesterId)
          : await getLatestAnalysisFromDb(studentData.student.id);

        if (dbAnalysis) {
          setAnalysis(dbAnalysis);
          setGeneratedAt(
            (dbAnalysis as ComprehensiveChildAnalysis & { generatedAt?: string }).generatedAt || null
          );
          return;
        } else {
          setAnalysis(null);
          setGeneratedAt(null);
        }
      } catch (err) {
        console.error('Gagal memuat analisis dari Supabase, mencoba localStorage:', err);
      }

      const savedAnalysis = localStorage.getItem(getStorageKey());
      if (savedAnalysis) {
        try {
          const parsed = sanitizeAnalysisData(JSON.parse(savedAnalysis));
          setAnalysis(parsed);
          setGeneratedAt(
            (parsed as ComprehensiveChildAnalysis & { generatedAt?: string }).generatedAt || null
          );
        } catch (e) {
          console.error('Failed to parse saved analysis:', e);
          localStorage.removeItem(getStorageKey());
        }
      } else {
        setAnalysis(null);
        setGeneratedAt(null);
      }
    };

    loadAnalysis();
  }, [studentData.student.id, selectedSemesterId, getStorageKey]);

  // "30-Second Glance" summary calculation
  const glanceSummary = useMemo<GlanceSummary | null>(() => {
    if (!analysis) return null;

    const cleanText = (text: string) => {
      if (!text) return '';
      return stripMarkdown(text)
        .replace(/^(?:[\s\d•\-*🌟💡🎯🏠🏆👣🏫⭐🎒😇🔥👍👌💪★►]|🙋‍♂️|🏃‍♂️|🛠️)+/u, '')
        .trim();
    };

    const superpower =
      analysis?.cognitive?.strengths && analysis.cognitive.strengths.length > 0
        ? cleanText(analysis.cognitive.strengths[0])
        : 'Menunjukkan motivasi belajar dan respon afektif yang baik di kelas.';

    const challenge =
      analysis?.cognitive?.areasForDevelopment && analysis.cognitive.areasForDevelopment.length > 0
        ? cleanText(analysis.cognitive.areasForDevelopment[0])
        : 'Dukung kemandirian dalam memecahkan soal latihan tingkat lanjut.';

    const homeTip =
      analysis?.recommendations?.homeSupport && analysis.recommendations.homeSupport.length > 0
        ? cleanText(analysis.recommendations.homeSupport[0])
        : 'Sediakan sesi membaca bersama 15 menit sehari di rumah.';

    return { superpower, challenge, homeTip };
  }, [analysis]);

  // "Status Perkembangan" Badges (HSL colors)
  const developmentBadges = useMemo<DevelopmentBadges>(() => {
    let cognitiveLabel = 'Cukup';
    let cognitiveColor =
      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let cognitiveDot = 'bg-amber-500';
    if (overallAverage >= 85) {
      cognitiveLabel = 'Sangat Baik';
      cognitiveColor =
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      cognitiveDot = 'bg-emerald-500';
    } else if (overallAverage >= 75) {
      cognitiveLabel = 'Baik';
      cognitiveColor =
        'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      cognitiveDot = 'bg-blue-500';
    } else if (overallAverage < 60) {
      cognitiveLabel = 'Perlu Pendampingan';
      cognitiveColor =
        'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      cognitiveDot = 'bg-rose-500';
    }

    const attendanceRecords = studentData.attendanceRecords || [];
    const violations = studentData.violations || [];
    const totalViolations = violations.length;
    const attRate =
      attendanceRecords.length > 0
        ? (attendanceRecords.filter((a) => a.status === 'Hadir').length / attendanceRecords.length) * 100
        : 100;

    let affectiveLabel = 'Cukup Disiplin';
    let affectiveColor =
      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let affectiveDot = 'bg-amber-500';
    if (attRate >= 95 && totalViolations === 0) {
      affectiveLabel = 'Sangat Disiplin';
      affectiveColor =
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      affectiveDot = 'bg-emerald-500';
    } else if (attRate >= 85 && totalViolations <= 1) {
      affectiveLabel = 'Disiplin';
      affectiveColor =
        'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      affectiveDot = 'bg-blue-500';
    } else if (attRate < 75 || totalViolations > 3) {
      affectiveLabel = 'Perlu Perhatian';
      affectiveColor =
        'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      affectiveDot = 'bg-rose-500';
    }

    let psychomotorLabel = 'Cukup Aktif';
    let psychomotorColor =
      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let psychomotorDot = 'bg-amber-500';

    const outstandingCount = analysis?.psychomotor?.outstandingSkills?.length || 0;
    const needStimulationCount = analysis?.psychomotor?.areasNeedingStimulation?.length || 0;

    if (outstandingCount >= 3 && needStimulationCount <= 1) {
      psychomotorLabel = 'Sangat Aktif';
      psychomotorColor =
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      psychomotorDot = 'bg-emerald-500';
    } else if (outstandingCount >= 1 && needStimulationCount <= 2) {
      psychomotorLabel = 'Aktif';
      psychomotorColor =
        'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      psychomotorDot = 'bg-blue-500';
    } else if (needStimulationCount > 2) {
      psychomotorLabel = 'Perlu Stimulasi';
      psychomotorColor =
        'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      psychomotorDot = 'bg-rose-500';
    }

    return {
      cognitive: { label: cognitiveLabel, color: cognitiveColor, dot: cognitiveDot },
      affective: { label: affectiveLabel, color: affectiveColor, dot: affectiveDot },
      psychomotor: { label: psychomotorLabel, color: psychomotorColor, dot: psychomotorDot },
    };
  }, [analysis, overallAverage, studentData]);

  const actionableRecommendations = useMemo<ActionableRecommendationItem[]>(() => {
    if (!analysis) return [];

    const recs: ActionableRecommendationItem[] = [];

    // Academic recommendations
    const cognitiveAreas = analysis?.cognitive?.areasForDevelopment || [];
    if (cognitiveAreas.length > 0) {
      recs.push({
        title: 'Tingkatkan Kemampuan Akademik',
        description: cognitiveAreas[0],
        priority: 'high',
        category: 'Kognitif',
        actions: [
          'Identifikasi mata pelajaran yang paling membutuhkan perhatian',
          'Buat jadwal belajar tambahan 30 menit/hari',
          'Gunakan metode belajar yang sesuai: ' +
            (analysis?.cognitive?.learningStyle || 'Visual/Auditori'),
          'Pantau kemajuan setiap minggu',
          'Berikan apresiasi atas setiap peningkatan',
        ],
      });
    }

    // Character development
    const affectiveAreas = analysis?.affective?.characterDevelopmentAreas || [];
    if (affectiveAreas.length > 0) {
      recs.push({
        title: 'Pengembangan Karakter',
        description: affectiveAreas[0],
        priority: 'medium',
        category: 'Afektif',
        actions: [
          'Diskusikan nilai-nilai positif dalam kegiatan sehari-hari',
          'Berikan contoh nyata melalui teladan orang tua',
          'Libatkan anak dalam kegiatan sosial/komunitas',
          'Gunakan cerita atau video edukatif sebagai media',
          'Apresiasi perilaku positif yang ditunjukkan',
        ],
      });
    }

    // Motor skills
    const psychomotorAreas = analysis?.psychomotor?.areasNeedingStimulation || [];
    if (psychomotorAreas.length > 0) {
      recs.push({
        title: 'Stimulasi Psikomotor',
        description: psychomotorAreas[0],
        priority: 'low',
        category: 'Psikomotor',
        actions: [
          'Alokasikan waktu 1 jam/hari untuk aktivitas fisik',
          'Pilih olahraga atau kegiatan yang disukai anak',
          'Lakukan aktivitas bersama sebagai keluarga',
          'Daftarkan anak ke klub/ekskul yang sesuai',
          'Pantau perkembangan kemampuan fisik secara berkala',
        ],
      });
    }

    // Home support
    const homeSupport = analysis?.recommendations?.homeSupport || [];
    homeSupport.slice(0, 2).forEach((support, idx) => {
      recs.push({
        title: `Dukungan Rumah ${idx + 1}`,
        description: support,
        priority: idx === 0 ? 'high' : 'medium',
        category: 'Home Support',
        actions: [
          'Mulai implementasi dari minggu ini',
          'Buat reminder harian',
          'Libatkan seluruh anggota keluarga',
          'Evaluasi efektivitas setiap 2 minggu',
          'Sesuaikan strategi jika diperlukan',
        ],
      });
    });

    return recs;
  }, [analysis]);

  const doGenerateAnalysis = async () => {
    setShowRegenerateConfirm(false);
    setIsLoading(true);
    setLoadingStep(1);
    setRetryCount(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1200);

    try {
      let result: ComprehensiveChildAnalysis | null = null;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) setRetryCount(attempt);
          result = await generateComprehensiveChildAnalysis(studentData);
          if (result && (!('error' in result) || result.summary)) break;
        } catch (retryError) {
          if (attempt === maxRetries) throw retryError;
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      if (!result) throw new Error('Gagal menghasilkan analisis setelah beberapa percobaan.');

      result = sanitizeAnalysisData(result);
      const now = new Date().toISOString();
      (result as ComprehensiveChildAnalysis & { generatedAt?: string }).generatedAt = now;
      setGeneratedAt(now);
      setAnalysis(result);

      // Save to local storage
      localStorage.setItem(getStorageKey(), JSON.stringify(result));

      // Save to Supabase DB (silent sync, doesn't crash on offline)
      try {
        await saveAnalysisToDb(
          studentData.student.id,
          result,
          result.generatedBy || 'AI',
          resolvedAcademicYearId,
          selectedSemesterId
        );
      } catch (dbError) {
        console.error('Supabase Sync Error:', dbError);
      }

      toast.success('Analisis perkembangan anak berhasil dibuat!');
    } catch (error) {
      toast.error('Gagal membuat analisis setelah beberapa percobaan. Silakan coba lagi.');
      console.error(error);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setLoadingStep(1);
      setRetryCount(0);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (analysis) {
      setShowRegenerateConfirm(true);
      return;
    }
    await doGenerateAnalysis();
  };

  const handleExportReport = async () => {
    if (!analysis) return;

    try {
      toast.info('Menyiapkan Laporan PDF Premium...');
      await exportSingleChildDevelopmentPDF({
        analysis,
        studentData,
        schoolName,
        principalName,
        subjectAverages,
      });
      toast.success('Laporan PDF Premium berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      toast.error('Gagal membuat ekspor PDF Premium. Silakan coba kembali.');
    }
  };

  return {
    analysis,
    isLoading,
    loadingStep,
    isDetailsExpanded,
    setIsDetailsExpanded,
    generatedAt,
    showRegenerateConfirm,
    setShowRegenerateConfirm,
    subjectAverages,
    periodStats,
    subjects,
    studentScores,
    overallAverage,
    attendanceRate,
    keaktifan,
    isRadarChartValid,
    glanceSummary,
    developmentBadges,
    actionableRecommendations,
    handleGenerateAnalysis,
    doGenerateAnalysis,
    handleExportReport,
  };
};
