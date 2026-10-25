import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../../../hooks/useToast';
import {
  ComparativeChildAnalysis,
  ChildDevelopmentData,
  generateComparativeChildAnalysis,
  getComparativeAnalysisFromDb,
  saveComparativeAnalysisToDb,
} from '../../../../../services/childDevelopmentAnalysis';
import { sanitizeAnalysisData } from '../../../../../utils/textSanitizer';
import { exportComparativeChildDevelopmentPDF } from '../utils/childDevelopmentPdfExport';
import type { SemesterRow, AcademicYearRow } from '../../../../../types';
import type { SemesterWithYear } from '../../../../../contexts/SemesterContext';
import type {
  AcademicRecordRow,
  AttendanceRow,
  ViolationRow,
  ViolationInputRow,
  QuizPointRow,
  AttendanceStats,
  ViolationStats,
  CompSubjectAverage,
  HolisticDimensions,
} from '../types/childDevelopmentTypes';

interface UseComparativeChildAnalysisParams {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: AcademicRecordRow[];
  allAttendanceRecords?: AttendanceRow[];
  allViolations?: ViolationInputRow[];
  allQuizPoints?: QuizPointRow[];
  activeAcademicYear: AcademicYearRow | null;
  semesters: (SemesterRow | SemesterWithYear)[];
  schoolName: string;
  principalName?: string;
}

export const useComparativeChildAnalysis = ({
  studentData,
  allAcademicRecords = [],
  allAttendanceRecords = [],
  allViolations = [],
  allQuizPoints = [],
  activeAcademicYear,
  semesters,
  schoolName,
  principalName = 'H. Masturi, S.Pd.I.',
}: UseComparativeChildAnalysisParams) => {
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeChildAnalysis | null>(null);
  const [isCompLoading, setIsCompLoading] = useState(false);
  const [compLoadingStep, setCompLoadingStep] = useState(1);
  const [compGeneratedAt, setCompGeneratedAt] = useState<string | null>(null);
  const [showCompRegenerateConfirm, setShowCompRegenerateConfirm] = useState(false);
  const [, setRetryCount] = useState(0);

  const toast = useToast();

  // === DYNAMIC GROUPING FOR SEMESTER COMPARISON ===
  const activeYearSemesters = useMemo(() => {
    if (!activeAcademicYear) return [];
    return semesters.filter((s) => s.academic_year_id === activeAcademicYear.id);
  }, [semesters, activeAcademicYear]);

  const sem1 = useMemo(() => {
    return activeYearSemesters.find((s) => s.semester_number === 1);
  }, [activeYearSemesters]);

  const sem2 = useMemo(() => {
    return activeYearSemesters.find((s) => s.semester_number === 2);
  }, [activeYearSemesters]);

  const sem1Academic = useMemo(() => {
    if (!sem1 || !allAcademicRecords) return [];
    return allAcademicRecords.filter((r) => r.semester_id === sem1.id);
  }, [allAcademicRecords, sem1]);

  const sem2Academic = useMemo(() => {
    if (!sem2 || !allAcademicRecords) return [];
    return allAcademicRecords.filter((r) => r.semester_id === sem2.id);
  }, [allAcademicRecords, sem2]);

  const sem1Attendance = useMemo(() => {
    if (!sem1 || !allAttendanceRecords) return [];
    return allAttendanceRecords.filter((r) => r.semester_id === sem1.id);
  }, [allAttendanceRecords, sem1]);

  const sem2Attendance = useMemo(() => {
    if (!sem2 || !allAttendanceRecords) return [];
    return allAttendanceRecords.filter((r) => r.semester_id === sem2.id);
  }, [allAttendanceRecords, sem2]);

  const typedViolations = useMemo(
    () => (allViolations || []) as unknown as ViolationRow[],
    [allViolations]
  );

  const sem1Violations = useMemo(() => {
    if (!sem1 || !typedViolations) return [];
    return typedViolations.filter((r) => r.semester_id === sem1.id);
  }, [typedViolations, sem1]);

  const sem2Violations = useMemo(() => {
    if (!sem2 || !typedViolations) return [];
    return typedViolations.filter((r) => r.semester_id === sem2.id);
  }, [typedViolations, sem2]);

  const sem1Quizzes = useMemo(() => {
    if (!sem1 || !allQuizPoints) return [];
    return allQuizPoints.filter((r) => r.semester_id === sem1.id);
  }, [allQuizPoints, sem1]);

  const sem2Quizzes = useMemo(() => {
    if (!sem2 || !allQuizPoints) return [];
    return allQuizPoints.filter((r) => r.semester_id === sem2.id);
  }, [allQuizPoints, sem2]);

  // === CALCULATING STATS FOR COMPARISON ===
  const avgScoreSem1 = useMemo(() => {
    if (sem1Academic.length === 0) return 0;
    return Math.round(sem1Academic.reduce((sum, r) => sum + r.score, 0) / sem1Academic.length);
  }, [sem1Academic]);

  const avgScoreSem2 = useMemo(() => {
    if (sem2Academic.length === 0) return 0;
    return Math.round(sem2Academic.reduce((sum, r) => sum + r.score, 0) / sem2Academic.length);
  }, [sem2Academic]);

  const avgScoreDiff = avgScoreSem2 - avgScoreSem1;

  const compAttendanceStats = useMemo<{ sem1: AttendanceStats; sem2: AttendanceStats }>(() => {
    const getStats = (recs: AttendanceRow[]): AttendanceStats => {
      const total = recs.length;
      const hadir = recs.filter((r) => r.status === 'Hadir').length;
      const sakit = recs.filter((r) => r.status === 'Sakit').length;
      const izin = recs.filter((r) => r.status === 'Izin').length;
      const alpha = recs.filter((r) => r.status === 'Alpha').length;
      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100;
      return { total, hadir, sakit, izin, alpha, percentage };
    };
    return {
      sem1: getStats(sem1Attendance),
      sem2: getStats(sem2Attendance),
    };
  }, [sem1Attendance, sem2Attendance]);

  const compViolationStats = useMemo<{ sem1: ViolationStats; sem2: ViolationStats }>(() => {
    const getStats = (recs: ViolationRow[]): ViolationStats => {
      const count = recs.length;
      const points = recs.reduce((sum, r) => sum + (r.points || 0), 0);
      return { count, points };
    };
    return {
      sem1: getStats(sem1Violations),
      sem2: getStats(sem2Violations),
    };
  }, [sem1Violations, sem2Violations]);

  const compSubjectAverages = useMemo<CompSubjectAverage[]>(() => {
    const subjectsMap: Record<string, { sem1: number[]; sem2: number[] }> = {};

    sem1Academic.forEach((r) => {
      const s = r.subject || 'Lainnya';
      if (!subjectsMap[s]) subjectsMap[s] = { sem1: [], sem2: [] };
      subjectsMap[s].sem1.push(r.score);
    });

    sem2Academic.forEach((r) => {
      const s = r.subject || 'Lainnya';
      if (!subjectsMap[s]) subjectsMap[s] = { sem1: [], sem2: [] };
      subjectsMap[s].sem2.push(r.score);
    });

    return Object.entries(subjectsMap).map(([subject, scores]) => {
      const sem1Avg =
        scores.sem1.length > 0
          ? Math.round(scores.sem1.reduce((a, b) => a + b, 0) / scores.sem1.length)
          : null;
      const sem2Avg =
        scores.sem2.length > 0
          ? Math.round(scores.sem2.reduce((a, b) => a + b, 0) / scores.sem2.length)
          : null;
      return { subject, sem1: sem1Avg, sem2: sem2Avg };
    });
  }, [sem1Academic, sem2Academic]);

  // === DUAL RADAR CHART CALCULATIONS ===
  const compHolisticDimensions = useMemo<HolisticDimensions>(() => {
    const getKeterampilanScore = (records: AcademicRecordRow[], overallAvg: number) => {
      const practicalSubjects = ['pjok', 'seni', 'sbdp', 'prakarya', 'keterampilan', 'seni budaya'];
      const practicalRecords = records.filter((r) => {
        const sub = (r.subject || '').toLowerCase();
        return practicalSubjects.some((p) => sub.includes(p));
      });
      if (practicalRecords.length > 0) {
        return Math.round(
          practicalRecords.reduce((sum, r) => sum + r.score, 0) / practicalRecords.length
        );
      }
      return overallAvg > 0 ? Math.round((overallAvg + 80) / 2) : 80;
    };

    const qPts1 = sem1Quizzes.reduce((sum, q) => sum + (q.points || 0), 0);
    const qCount1 = sem1Quizzes.length;
    const keaktifanSem1 = qPts1 > 0 ? Math.min(qPts1 * 5, 100) : Math.min(qCount1 * 15, 100);

    const qPts2 = sem2Quizzes.reduce((sum, q) => sum + (q.points || 0), 0);
    const qCount2 = sem2Quizzes.length;
    const keaktifanSem2 = qPts2 > 0 ? Math.min(qPts2 * 5, 100) : Math.min(qCount2 * 15, 100);

    const labels = ['Akademik', 'Kehadiran', 'Kedisiplinan', 'Keaktifan', 'Keterampilan'];

    return {
      labels,
      sem1: [
        avgScoreSem1,
        compAttendanceStats.sem1.percentage,
        Math.max(100 - compViolationStats.sem1.points * 5, 0),
        keaktifanSem1,
        getKeterampilanScore(sem1Academic, avgScoreSem1),
      ],
      sem2: [
        avgScoreSem2,
        compAttendanceStats.sem2.percentage,
        Math.max(100 - compViolationStats.sem2.points * 5, 0),
        keaktifanSem2,
        getKeterampilanScore(sem2Academic, avgScoreSem2),
      ],
    };
  }, [
    avgScoreSem1,
    avgScoreSem2,
    compAttendanceStats,
    compViolationStats,
    sem1Academic,
    sem2Academic,
    sem1Quizzes,
    sem2Quizzes,
  ]);

  // Construct Data for Comparative AI
  const childData1 = useMemo<ChildDevelopmentData>(
    () => ({
      student: {
        id: studentData.student.id,
        name: studentData.student.name,
        age: studentData.student.age,
        class: studentData.student.class,
      },
      academicRecords: sem1Academic.map((r) => ({
        subject: r.subject,
        score: r.score,
        assessment_name: r.assessment_name ?? undefined,
        notes: r.notes,
      })),
      attendanceRecords: sem1Attendance.map((a) => ({
        status: a.status,
        date: a.date,
      })),
      violations: sem1Violations.map((v) => ({
        description: v.description,
        points: v.points,
        date: v.date,
      })),
      quizPoints: sem1Quizzes.map((q) => ({
        activity: q.quiz_name,
        points: q.points,
        date: q.quiz_date,
      })),
    }),
    [studentData.student, sem1Academic, sem1Attendance, sem1Violations, sem1Quizzes]
  );

  const childData2 = useMemo<ChildDevelopmentData>(
    () => ({
      student: {
        id: studentData.student.id,
        name: studentData.student.name,
        age: studentData.student.age,
        class: studentData.student.class,
      },
      academicRecords: sem2Academic.map((r) => ({
        subject: r.subject,
        score: r.score,
        assessment_name: r.assessment_name ?? undefined,
        notes: r.notes,
      })),
      attendanceRecords: sem2Attendance.map((a) => ({
        status: a.status,
        date: a.date,
      })),
      violations: sem2Violations.map((v) => ({
        description: v.description,
        points: v.points,
        date: v.date,
      })),
      quizPoints: sem2Quizzes.map((q) => ({
        activity: q.quiz_name,
        points: q.points,
        date: q.quiz_date,
      })),
    }),
    [studentData.student, sem2Academic, sem2Attendance, sem2Violations, sem2Quizzes]
  );

  // Load comparative analysis on mount or year change
  useEffect(() => {
    const loadCompAnalysis = async () => {
      if (!activeAcademicYear) return;

      try {
        const dbComp = await getComparativeAnalysisFromDb(
          studentData.student.id,
          activeAcademicYear.id
        );
        if (dbComp) {
          setComparativeAnalysis(dbComp);
          setCompGeneratedAt(
            (dbComp as ComparativeChildAnalysis & { generatedAt?: string }).generatedAt || null
          );
          return;
        }
      } catch (err) {
        console.error('Failed to load comparative analysis from Supabase:', err);
      }

      const savedComp = localStorage.getItem(
        `comp_analysis_${studentData.student.id}_${activeAcademicYear.id}`
      );
      if (savedComp) {
        try {
          const parsed = sanitizeAnalysisData(JSON.parse(savedComp));
          setComparativeAnalysis(parsed);
          setCompGeneratedAt(
            (parsed as ComparativeChildAnalysis & { generatedAt?: string }).generatedAt || null
          );
        } catch (e) {
          console.error('Failed to parse saved comparative analysis:', e);
        }
      }
    };

    loadCompAnalysis();
  }, [studentData.student.id, activeAcademicYear]);

  const doGenerateComparativeAnalysis = async () => {
    setShowCompRegenerateConfirm(false);
    setIsCompLoading(true);
    setCompLoadingStep(1);
    setRetryCount(0);

    const stepInterval = setInterval(() => {
      setCompLoadingStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1200);

    try {
      let result: ComparativeChildAnalysis | null = null;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) setRetryCount(attempt);
          result = await generateComparativeChildAnalysis(childData1, childData2);
          if (result && (!('error' in result) || result.summary)) break;
        } catch (retryError) {
          if (attempt === maxRetries) throw retryError;
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      if (!result) {
        throw new Error('Gagal menghasilkan analisis perbandingan setelah beberapa percobaan.');
      }

      result = sanitizeAnalysisData(result);
      const now = new Date().toISOString();
      (result as ComparativeChildAnalysis & { generatedAt?: string }).generatedAt = now;
      setCompGeneratedAt(now);
      setComparativeAnalysis(result);

      // Save to local storage
      const storageKey = `comp_analysis_${studentData.student.id}_${activeAcademicYear?.id || 'general'}`;
      localStorage.setItem(storageKey, JSON.stringify(result));

      // Save to Supabase DB (silent sync, doesn't crash on offline)
      try {
        if (activeAcademicYear) {
          await saveComparativeAnalysisToDb(
            studentData.student.id,
            activeAcademicYear.id,
            result,
            result.generatedBy || 'AI'
          );
        }
      } catch (dbError) {
        console.error('Supabase Comparative Sync Error:', dbError);
      }

      toast.success('Analisis perbandingan semester berhasil dibuat!');
    } catch (error) {
      toast.error(
        'Gagal membuat analisis perbandingan setelah beberapa percobaan. Silakan coba lagi.'
      );
      console.error(error);
    } finally {
      clearInterval(stepInterval);
      setIsCompLoading(false);
      setCompLoadingStep(1);
      setRetryCount(0);
    }
  };

  const handleGenerateComparativeAnalysis = async () => {
    if (sem1Academic.length === 0 || sem2Academic.length === 0) {
      toast.warning(
        'Data Semester 1 atau Semester 2 belum tersedia. Analisis perbandingan tidak dapat dilakukan.'
      );
      return;
    }
    if (comparativeAnalysis) {
      setShowCompRegenerateConfirm(true);
      return;
    }
    await doGenerateComparativeAnalysis();
  };

  const handleExportComparativeReport = async () => {
    if (!comparativeAnalysis) return;

    try {
      toast.info('Menyiapkan Laporan Perbandingan PDF Premium...');
      await exportComparativeChildDevelopmentPDF({
        comparativeAnalysis,
        studentData,
        schoolName,
        principalName,
        activeAcademicYearName: activeAcademicYear?.name || '-',
        avgScoreSem1,
        avgScoreSem2,
        avgScoreDiff,
        compSubjectAverages,
        compAttendanceStats,
        compViolationStats,
        compHolisticDimensions,
      });
      toast.success('Laporan Perbandingan PDF Premium berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export comparative PDF:', err);
      toast.error('Gagal membuat ekspor PDF perbandingan. Silakan coba kembali.');
    }
  };

  return {
    sem1,
    sem2,
    sem1Academic,
    sem2Academic,
    sem1Attendance,
    sem2Attendance,
    sem1Violations,
    sem2Violations,
    sem1Quizzes,
    sem2Quizzes,
    avgScoreSem1,
    avgScoreSem2,
    avgScoreDiff,
    compAttendanceStats,
    compViolationStats,
    compSubjectAverages,
    compHolisticDimensions,
    comparativeAnalysis,
    isCompLoading,
    compLoadingStep,
    compGeneratedAt,
    showCompRegenerateConfirm,
    setShowCompRegenerateConfirm,
    handleGenerateComparativeAnalysis,
    doGenerateComparativeAnalysis,
    handleExportComparativeReport,
  };
};
