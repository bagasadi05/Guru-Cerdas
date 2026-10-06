import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../ui/Card';
import {
  BrainCircuitIcon,
  SparklesIcon,
  AlertCircleIcon,
  PlayCircleIcon,
} from '../../../../Icons';
import { useToast } from '../../../../../hooks/useToast';
import {
  generateComprehensiveChildAnalysis,
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
  saveAnalysisToDb,
  getLatestAnalysisFromDb,
  getAnalysisForSemesterFromDb,
  ComparativeChildAnalysis,
  generateComparativeChildAnalysis,
  getComparativeAnalysisFromDb,
  saveComparativeAnalysisToDb
} from '../../../../../services/childDevelopmentAnalysis';
import { useSemester } from '../../../../../contexts/SemesterContext';
import { useMemo } from 'react';
import { MotionDiv, MotionSpan, AnimatePresence } from '../../../../ui/MotionComponents';
import { duration as motionDuration } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';
import { LoadingProgress } from '../components/LoadingProgress';
import { CompLoadingProgress } from '../components/CompLoadingProgress';
import { PeriodComparison } from '../components/PeriodComparison';
import { ActionableRecommendation } from '../components/ActionableRecommendation';
import { GlanceHeroCard } from '../components/GlanceHeroCard';
import { QuickInsightStrip } from '../components/QuickInsightStrip';
import { DevelopmentScoreCard } from '../components/DevelopmentScoreCard';
import { SubjectPerformanceChart } from '../components/SubjectPerformanceChart';
import { DevelopmentTimeline } from '../components/DevelopmentTimeline';
import { WarningBanner } from '../components/WarningBanner';
import { ComparativeAnalysisView } from './ComparativeAnalysisView';
import { useUserSettings } from '../../../../../hooks/useUserSettings';
import { stripMarkdown, sanitizeAnalysisData } from '../../../../../utils/textSanitizer';
import type { Database } from '../../../../../services/database.types';
import { calculateRadarPoints, calculateAxisEndpoints, calculateLabelPositions } from '../utils/radarChartUtils';
import {
  exportSingleChildDevelopmentPDF,
  exportComparativeChildDevelopmentPDF,
} from '../utils/childDevelopmentPdfExport';

// Typed record shapes for semester comparison data (matching the Supabase schema)
type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type ViolationRow = Database['public']['Tables']['violations']['Row'];
type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: AcademicRecordRow[];
  allAttendanceRecords?: AttendanceRow[];
  allViolations?: ViolationRow[];
  allQuizPoints?: QuizPointRow[];
  defaultMode?: 'single' | 'comparative';
  selectedSemesterId?: string | null;
  selectedAcademicYearId?: string | null;
}

export const ChildDevelopmentAnalysisView: React.FC<ChildDevelopmentAnalysisTabProps> = ({
  studentData,
  allAcademicRecords = [],
  allAttendanceRecords = [],
  allViolations = [],
  allQuizPoints = [],
  defaultMode = 'single',
  selectedSemesterId = null,
  selectedAcademicYearId = null
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const [analysis, setAnalysis] = useState<ComprehensiveChildAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const toast = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // === COMPARATIVE STATE ===
  const { activeAcademicYear, semesters } = useSemester();
  const [activeTabMode, setActiveTabMode] = useState<'single' | 'comparative'>(defaultMode);
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeChildAnalysis | null>(null);
  const [isCompLoading, setIsCompLoading] = useState(false);
  const [compLoadingStep, setCompLoadingStep] = useState(1);
  const [_isCompDetailsExpanded, _setIsCompDetailsExpanded] = useState(false);

  const { schoolName } = useUserSettings();
  const principalName = 'H. Masturi, S.Pd.I.';
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [compGeneratedAt, setCompGeneratedAt] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showCompRegenerateConfirm, setShowCompRegenerateConfirm] = useState(false);
  const [_retryCount, setRetryCount] = useState(0);

  // Calculate subject averages for analytics (Single Semester)
  const subjectAverages = useMemo(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    studentData.academicRecords.forEach(record => {
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
  const periodStats = useMemo(() => {
    const records = studentData.academicRecords;
    const totalRecords = records.length;

    if (totalRecords < 4) {
      const avg = totalRecords > 0
        ? Math.round(records.reduce((a, b) => a + b.score, 0) / totalRecords)
        : 0;
      return { currentAvg: avg, previousAvg: 0 };
    }

    const midPoint = Math.floor(totalRecords / 2);
    const recentRecords = records.slice(midPoint);
    const olderRecords = records.slice(0, midPoint);

    const currentAvg = Math.round(recentRecords.reduce((a, b) => a + b.score, 0) / recentRecords.length);
    const previousAvg = Math.round(olderRecords.reduce((a, b) => a + b.score, 0) / olderRecords.length);

    return { currentAvg, previousAvg };
  }, [studentData.academicRecords]);

  const subjects = subjectAverages.map((s) => s.subject);
  const studentScores = subjectAverages.map((s) => s.average);
  const overallAverage = studentScores.length > 0 ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) : 0;

  const attendanceRate = useMemo(() => {
    const attendanceRecords = studentData.attendanceRecords || [];
    return attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter((a) => a.status === 'Hadir').length / attendanceRecords.length) * 100)
      : 100;
  }, [studentData.attendanceRecords]);

  const keaktifan = useMemo(() => {
    const quizTotal = studentData.quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
    const quizCount = studentData.quizPoints.length;
    return quizTotal > 0 ? Math.min(quizTotal * 5, 100) : Math.min(quizCount * 15, 100);
  }, [studentData.quizPoints]);

  const isRadarChartValid = subjects.length >= 3;
  const chartSize = 260;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const maxScore = 100;
  const gridLevels = [20, 40, 60, 80, 100];
  const axisEndpoints = useMemo(() => calculateAxisEndpoints(subjects.length, centerX, centerY, radius), [subjects.length, centerX, centerY, radius]);
  const labelPositions = useMemo(() => calculateLabelPositions(subjects, centerX, centerY, radius), [subjects, centerX, centerY, radius]);
  const studentPolygonPoints = useMemo(() => calculateRadarPoints(studentScores, maxScore, centerX, centerY, radius), [studentScores, maxScore, centerX, centerY, radius]);

  const getStorageKey = useCallback(
    () => `child_analysis_${studentData.student.id}${selectedSemesterId ? `_${selectedSemesterId}` : ''}`,
    [studentData.student.id, selectedSemesterId]
  );

  const selectedSemester = useMemo(() => {
    if (!selectedSemesterId) return null;
    return semesters.find((s) => s.id === selectedSemesterId);
  }, [semesters, selectedSemesterId]);

  const resolvedAcademicYearId = selectedAcademicYearId || selectedSemester?.academic_year_id || activeAcademicYear?.id;

  // === DYNAMIC GROUPING FOR SEMESTER COMPARISON ===
  const activeYearSemesters = useMemo(() => {
    if (!activeAcademicYear) return [];
    return semesters.filter((s) => s.academic_year_id === activeAcademicYear.id);
  }, [semesters, activeAcademicYear]);

  const sem1 = useMemo(() => {
    return activeYearSemesters.find(s => s.semester_number === 1);
  }, [activeYearSemesters]);

  const sem2 = useMemo(() => {
    return activeYearSemesters.find(s => s.semester_number === 2);
  }, [activeYearSemesters]);

  const sem1Academic = useMemo(() => {
    if (!sem1 || !allAcademicRecords) return [];
    return allAcademicRecords.filter(r => r.semester_id === sem1.id);
  }, [allAcademicRecords, sem1]);

  const sem2Academic = useMemo(() => {
    if (!sem2 || !allAcademicRecords) return [];
    return allAcademicRecords.filter(r => r.semester_id === sem2.id);
  }, [allAcademicRecords, sem2]);

  const sem1Attendance = useMemo(() => {
    if (!sem1 || !allAttendanceRecords) return [];
    return allAttendanceRecords.filter(r => r.semester_id === sem1.id);
  }, [allAttendanceRecords, sem1]);

  const sem2Attendance = useMemo(() => {
    if (!sem2 || !allAttendanceRecords) return [];
    return allAttendanceRecords.filter(r => r.semester_id === sem2.id);
  }, [allAttendanceRecords, sem2]);

  const sem1Violations = useMemo(() => {
    if (!sem1 || !allViolations) return [];
    return allViolations.filter(r => r.semester_id === sem1.id);
  }, [allViolations, sem1]);

  const sem2Violations = useMemo(() => {
    if (!sem2 || !allViolations) return [];
    return allViolations.filter(r => r.semester_id === sem2.id);
  }, [allViolations, sem2]);

  const sem1Quizzes = useMemo(() => {
    if (!sem1 || !allQuizPoints) return [];
    return allQuizPoints.filter(r => r.semester_id === sem1.id);
  }, [allQuizPoints, sem1]);

  const sem2Quizzes = useMemo(() => {
    if (!sem2 || !allQuizPoints) return [];
    return allQuizPoints.filter(r => r.semester_id === sem2.id);
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

  const compAttendanceStats = useMemo(() => {
    const getStats = (recs: AttendanceRow[]) => {
      const total = recs.length;
      const hadir = recs.filter(r => r.status === 'Hadir').length;
      const sakit = recs.filter(r => r.status === 'Sakit').length;
      const izin = recs.filter(r => r.status === 'Izin').length;
      const alpha = recs.filter(r => r.status === 'Alpha').length;
      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100;
      return { total, hadir, sakit, izin, alpha, percentage };
    };
    return {
      sem1: getStats(sem1Attendance),
      sem2: getStats(sem2Attendance)
    };
  }, [sem1Attendance, sem2Attendance]);

  const compViolationStats = useMemo(() => {
    const getStats = (recs: ViolationRow[]) => {
      const count = recs.length;
      const points = recs.reduce((sum, r) => sum + (r.points || 0), 0);
      return { count, points };
    };
    return {
      sem1: getStats(sem1Violations),
      sem2: getStats(sem2Violations)
    };
  }, [sem1Violations, sem2Violations]);

  const compSubjectAverages = useMemo(() => {
    const subjectsMap: Record<string, { sem1: number[]; sem2: number[] }> = {};
    
    sem1Academic.forEach(r => {
      const s = r.subject || 'Lainnya';
      if (!subjectsMap[s]) subjectsMap[s] = { sem1: [], sem2: [] };
      subjectsMap[s].sem1.push(r.score);
    });

    sem2Academic.forEach(r => {
      const s = r.subject || 'Lainnya';
      if (!subjectsMap[s]) subjectsMap[s] = { sem1: [], sem2: [] };
      subjectsMap[s].sem2.push(r.score);
    });

    return Object.entries(subjectsMap).map(([subject, scores]) => {
      const sem1Avg = scores.sem1.length > 0 ? Math.round(scores.sem1.reduce((a,b)=>a+b,0)/scores.sem1.length) : null;
      const sem2Avg = scores.sem2.length > 0 ? Math.round(scores.sem2.reduce((a,b)=>a+b,0)/scores.sem2.length) : null;
      return { subject, sem1: sem1Avg, sem2: sem2Avg };
    });
  }, [sem1Academic, sem2Academic]);

  // === DUAL RADAR CHART CALCULATIONS ===
  const compHolisticDimensions = useMemo(() => {
    const getKeterampilanScore = (records: AcademicRecordRow[], overallAvg: number) => {
      const practicalSubjects = ['pjok', 'seni', 'sbdp', 'prakarya', 'keterampilan', 'seni budaya'];
      const practicalRecords = records.filter(r => {
        const sub = (r.subject || '').toLowerCase();
        return practicalSubjects.some(p => sub.includes(p));
      });
      if (practicalRecords.length > 0) {
        return Math.round(practicalRecords.reduce((sum, r) => sum + r.score, 0) / practicalRecords.length);
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
        getKeterampilanScore(sem1Academic, avgScoreSem1)
      ],
      sem2: [
        avgScoreSem2,
        compAttendanceStats.sem2.percentage,
        Math.max(100 - compViolationStats.sem2.points * 5, 0),
        keaktifanSem2,
        getKeterampilanScore(sem2Academic, avgScoreSem2)
      ]
    };
  }, [
    avgScoreSem1, avgScoreSem2,
    compAttendanceStats, compViolationStats,
    sem1Academic, sem2Academic,
    sem1Quizzes, sem2Quizzes
  ]);

  // Construct Data for Comparative AI
  const childData1 = useMemo<ChildDevelopmentData>(() => ({
    student: {
      id: studentData.student.id,
      name: studentData.student.name,
      age: studentData.student.age,
      class: studentData.student.class
    },
    academicRecords: sem1Academic.map((r) => ({
      subject: r.subject,
      score: r.score,
      assessment_name: r.assessment_name ?? undefined,
      notes: r.notes
    })),
    attendanceRecords: sem1Attendance.map((a) => ({
      status: a.status,
      date: a.date
    })),
    violations: sem1Violations.map((v) => ({
      description: v.description,
      points: v.points,
      date: v.date
    })),
    quizPoints: sem1Quizzes.map((q) => ({
      activity: q.quiz_name,
      points: q.points,
      date: q.quiz_date
    }))
  }), [studentData.student, sem1Academic, sem1Attendance, sem1Violations, sem1Quizzes]);

  const childData2 = useMemo<ChildDevelopmentData>(() => ({
    student: {
      id: studentData.student.id,
      name: studentData.student.name,
      age: studentData.student.age,
      class: studentData.student.class
    },
    academicRecords: sem2Academic.map((r) => ({
      subject: r.subject,
      score: r.score,
      assessment_name: r.assessment_name ?? undefined,
      notes: r.notes
    })),
    attendanceRecords: sem2Attendance.map((a) => ({
      status: a.status,
      date: a.date
    })),
    violations: sem2Violations.map((v) => ({
      description: v.description,
      points: v.points,
      date: v.date
    })),
    quizPoints: sem2Quizzes.map((q) => ({
      activity: q.quiz_name,
      points: q.points,
      date: q.quiz_date
    }))
  }), [studentData.student, sem2Academic, sem2Attendance, sem2Violations, sem2Quizzes]);

  // "Status Perkembangan Komparatif" Badges (HSL colors)
  const _comparativeBadges = useMemo(() => {
    let cognitiveLabel = 'Stabil';
    let cognitiveColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
    let cognitiveDot = 'bg-blue-500';
    if (avgScoreDiff > 3) {
      cognitiveLabel = 'Meningkat Pesat 📈';
      cognitiveColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      cognitiveDot = 'bg-emerald-500';
    } else if (avgScoreDiff < -3) {
      cognitiveLabel = 'Butuh Stimulasi Ekstra ⚠️';
      cognitiveColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      cognitiveDot = 'bg-rose-500';
    }

    let attendanceLabel = 'Stabil';
    let attendanceColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
    let attendanceDot = 'bg-blue-500';
    const attDiff = compAttendanceStats.sem2.percentage - compAttendanceStats.sem1.percentage;
    if (attDiff > 2) {
      attendanceLabel = 'Kehadiran Meningkat 👍';
      attendanceColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      attendanceDot = 'bg-emerald-500';
    } else if (attDiff < -5) {
      attendanceLabel = 'Kehadiran Menurun ⚠️';
      attendanceColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      attendanceDot = 'bg-rose-500';
    }

    let behaviorLabel = 'Sangat Baik';
    let behaviorColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
    let behaviorDot = 'bg-emerald-500';
    const violDiff = compViolationStats.sem2.points - compViolationStats.sem1.points;
    if (violDiff > 0) {
      behaviorLabel = 'Ada Pelanggaran Baru ⚠️';
      behaviorColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
      behaviorDot = 'bg-amber-500';
    } else if (compViolationStats.sem2.points === 0 && compViolationStats.sem1.points === 0) {
      behaviorLabel = 'Zero Violations (Teladan!) 🏅';
    } else if (violDiff < 0) {
      behaviorLabel = 'Kedisiplinan Membaik 🌟';
    }

    return {
      cognitive: { label: cognitiveLabel, color: cognitiveColor, dot: cognitiveDot },
      attendance: { label: attendanceLabel, color: attendanceColor, dot: attendanceDot },
      behavior: { label: behaviorLabel, color: behaviorColor, dot: behaviorDot }
    };
  }, [avgScoreDiff, compAttendanceStats, compViolationStats]);

  // Load from database / local storage on mount (Single Semester)
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const dbAnalysis = selectedSemesterId
          ? await getAnalysisForSemesterFromDb(studentData.student.id, selectedSemesterId)
          : await getLatestAnalysisFromDb(studentData.student.id);

        if (dbAnalysis) {
          setAnalysis(dbAnalysis);
          setGeneratedAt((dbAnalysis as ComprehensiveChildAnalysis & { generatedAt?: string }).generatedAt || null);
          return;
        } else {
          // Reset analysis if not found in db or local storage for this semester
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
          setGeneratedAt((parsed as ComprehensiveChildAnalysis & { generatedAt?: string }).generatedAt || null);
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

  // Load comparative analysis
  useEffect(() => {
    const loadCompAnalysis = async () => {
      if (!activeAcademicYear) return;
      
      try {
        const dbComp = await getComparativeAnalysisFromDb(studentData.student.id, activeAcademicYear.id);
        if (dbComp) {
          setComparativeAnalysis(dbComp);
          setCompGeneratedAt((dbComp as ComparativeChildAnalysis & { generatedAt?: string }).generatedAt || null);
          return;
        }
      } catch (err) {
        console.error('Failed to load comparative analysis from Supabase:', err);
      }

      const savedComp = localStorage.getItem(`comp_analysis_${studentData.student.id}_${activeAcademicYear.id}`);
      if (savedComp) {
        try {
          const parsed = sanitizeAnalysisData(JSON.parse(savedComp));
          setComparativeAnalysis(parsed);
          setCompGeneratedAt((parsed as ComparativeChildAnalysis & { generatedAt?: string }).generatedAt || null);
        } catch (e) {
          console.error('Failed to parse saved comparative analysis:', e);
        }
      }
    };

    loadCompAnalysis();
  }, [studentData.student.id, activeAcademicYear]);

  // "30-Second Glance" summary calculation
  const glanceSummary = useMemo(() => {
    if (!analysis) return null;

    const cleanText = (text: string) => {
      if (!text) return '';
      return stripMarkdown(text)
        .replace(/^(?:[\s\d•\-*🌟💡🎯🏠🏆👣🏫⭐🎒😇🔥👍👌💪★►]|🙋‍♂️|🏃‍♂️|🛠️)+/u, '') 
        .trim();
    };

    const superpower = analysis?.cognitive?.strengths && analysis.cognitive.strengths.length > 0
      ? cleanText(analysis.cognitive.strengths[0])
      : 'Menunjukkan motivasi belajar dan respon afektif yang baik di kelas.';

    const challenge = analysis?.cognitive?.areasForDevelopment && analysis.cognitive.areasForDevelopment.length > 0
      ? cleanText(analysis.cognitive.areasForDevelopment[0])
      : 'Dukung kemandirian dalam memecahkan soal latihan tingkat lanjut.';

    const homeTip = analysis?.recommendations?.homeSupport && analysis.recommendations.homeSupport.length > 0
      ? cleanText(analysis.recommendations.homeSupport[0])
      : 'Sediakan sesi membaca bersama 15 menit sehari di rumah.';

    return { superpower, challenge, homeTip };
  }, [analysis]);

  // "Status Perkembangan" Badges (HSL colors)
  const developmentBadges = useMemo(() => {
    let cognitiveLabel = 'Cukup';
    let cognitiveColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let cognitiveDot = 'bg-amber-500';
    if (overallAverage >= 85) {
      cognitiveLabel = 'Sangat Baik';
      cognitiveColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      cognitiveDot = 'bg-emerald-500';
    } else if (overallAverage >= 75) {
      cognitiveLabel = 'Baik';
      cognitiveColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      cognitiveDot = 'bg-blue-500';
    } else if (overallAverage < 60) {
      cognitiveLabel = 'Perlu Pendampingan';
      cognitiveColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      cognitiveDot = 'bg-rose-500';
    }

    const attendanceRecords = studentData.attendanceRecords || [];
    const violations = studentData.violations || [];
    const totalViolations = violations.length;
    const attendanceRate = attendanceRecords.length > 0
      ? (attendanceRecords.filter((a) => a.status === 'Hadir').length / attendanceRecords.length) * 100
      : 100;

    let affectiveLabel = 'Cukup Disiplin';
    let affectiveColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let affectiveDot = 'bg-amber-500';
    if (attendanceRate >= 95 && totalViolations === 0) {
      affectiveLabel = 'Sangat Disiplin';
      affectiveColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      affectiveDot = 'bg-emerald-500';
    } else if (attendanceRate >= 85 && totalViolations <= 1) {
      affectiveLabel = 'Disiplin';
      affectiveColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      affectiveDot = 'bg-blue-500';
    } else if (attendanceRate < 75 || totalViolations > 3) {
      affectiveLabel = 'Perlu Perhatian';
      affectiveColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      affectiveDot = 'bg-rose-500';
    }

    let psychomotorLabel = 'Cukup Aktif';
    let psychomotorColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    let psychomotorDot = 'bg-amber-500';

    const outstandingCount = analysis?.psychomotor?.outstandingSkills?.length || 0;
    const needStimulationCount = analysis?.psychomotor?.areasNeedingStimulation?.length || 0;

    if (outstandingCount >= 3 && needStimulationCount <= 1) {
      psychomotorLabel = 'Sangat Aktif';
      psychomotorColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      psychomotorDot = 'bg-emerald-500';
    } else if (outstandingCount >= 1 && needStimulationCount <= 2) {
      psychomotorLabel = 'Aktif';
      psychomotorColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      psychomotorDot = 'bg-blue-500';
    } else if (needStimulationCount > 2) {
      psychomotorLabel = 'Perlu Stimulasi';
      psychomotorColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      psychomotorDot = 'bg-rose-500';
    }

    return {
      cognitive: { label: cognitiveLabel, color: cognitiveColor, dot: cognitiveDot },
      affective: { label: affectiveLabel, color: affectiveColor, dot: affectiveDot },
      psychomotor: { label: psychomotorLabel, color: psychomotorColor, dot: psychomotorDot }
    };
  }, [analysis, overallAverage, studentData]);

  const handleGenerateAnalysis = async () => {
    if (analysis) {
      setShowRegenerateConfirm(true);
      return;
    }
    await doGenerateAnalysis();
  };

  const doGenerateAnalysis = async () => {
    setShowRegenerateConfirm(false);
    setIsLoading(true);
    setLoadingStep(1);
    setRetryCount(0);

    // Setup micro-interaction interval timer for loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
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
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
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

  // Export report as PDF Premium
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

  // === GENERATE & EXPORT COMPARATIVE ANALYSIS ===
  const handleGenerateComparativeAnalysis = async () => {
    if (sem1Academic.length === 0 || sem2Academic.length === 0) {
      toast.warning('Data Semester 1 atau Semester 2 belum tersedia. Analisis perbandingan tidak dapat dilakukan.');
      return;
    }
    if (comparativeAnalysis) {
      setShowCompRegenerateConfirm(true);
      return;
    }
    await doGenerateComparativeAnalysis();
  };

  const doGenerateComparativeAnalysis = async () => {
    setShowCompRegenerateConfirm(false);
    setIsCompLoading(true);
    setCompLoadingStep(1);
    setRetryCount(0);

    // Setup micro-interaction interval timer for loading steps
    const stepInterval = setInterval(() => {
      setCompLoadingStep(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
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
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      if (!result) throw new Error('Gagal menghasilkan analisis perbandingan setelah beberapa percobaan.');

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
      toast.error('Gagal membuat analisis perbandingan setelah beberapa percobaan. Silakan coba lagi.');
      console.error(error);
    } finally {
      clearInterval(stepInterval);
      setIsCompLoading(false);
      setCompLoadingStep(1);
      setRetryCount(0);
    }
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

  // Generate actionable recommendations from analysis
  const actionableRecommendations = useMemo(() => {
    if (!analysis) return [];

    const recs = [];

    // Academic recommendations
    const cognitiveAreas = analysis?.cognitive?.areasForDevelopment || [];
    if (cognitiveAreas.length > 0) {
      recs.push({
        title: 'Tingkatkan Kemampuan Akademik',
        description: cognitiveAreas[0],
        priority: 'high' as const,
        category: 'Kognitif',
        actions: [
          'Identifikasi mata pelajaran yang paling membutuhkan perhatian',
          'Buat jadwal belajar tambahan 30 menit/hari',
          'Gunakan metode belajar yang sesuai: ' + (analysis?.cognitive?.learningStyle || 'Visual/Auditori'),
          'Pantau kemajuan setiap minggu',
          'Berikan apresiasi atas setiap peningkatan'
        ]
      });
    }

    // Character development
    const affectiveAreas = analysis?.affective?.characterDevelopmentAreas || [];
    if (affectiveAreas.length > 0) {
      recs.push({
        title: 'Pengembangan Karakter',
        description: affectiveAreas[0],
        priority: 'medium' as const,
        category: 'Afektif',
        actions: [
          'Diskusikan nilai-nilai positif dalam kegiatan sehari-hari',
          'Berikan contoh nyata melalui teladan orang tua',
          'Libatkan anak dalam kegiatan sosial/komunitas',
          'Gunakan cerita atau video edukatif sebagai media',
          'Apresiasi perilaku positif yang ditunjukkan'
        ]
      });
    }

    // Motor skills
    const psychomotorAreas = analysis?.psychomotor?.areasNeedingStimulation || [];
    if (psychomotorAreas.length > 0) {
      recs.push({
        title: 'Stimulasi Psikomotor',
        description: psychomotorAreas[0],
        priority: 'low' as const,
        category: 'Psikomotor',
        actions: [
          'Alokasikan waktu 1 jam/hari untuk aktivitas fisik',
          'Pilih olahraga atau kegiatan yang disukai anak',
          'Lakukan aktivitas bersama sebagai keluarga',
          'Daftarkan anak ke klub/ekskul yang sesuai',
          'Pantau perkembangan kemampuan fisik secara berkala'
        ]
      });
    }

    // Home support
    const homeSupport = analysis?.recommendations?.homeSupport || [];
    homeSupport.slice(0, 2).forEach((support, idx) => {
      recs.push({
        title: `Dukungan Rumah ${idx + 1}`,
        description: support,
        priority: idx === 0 ? 'high' as const : 'medium' as const,
        category: 'Home Support',
        actions: [
          'Mulai implementasi dari minggu ini',
          'Buat reminder harian',
          'Libatkan seluruh anggota keluarga',
          'Evaluasi efektivitas setiap 2 minggu',
          'Sesuaikan strategi jika diperlukan'
        ]
      });
    });

    return recs;
  }, [analysis]);

  const renderSegmentedControl = () => (
    <div className="flex justify-center mb-6">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
        <button type="button"
          onClick={() => setActiveTabMode('single')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'single'
              ? 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl text-brand-600 dark:text-brand-400 shadow-sm transform scale-102 font-bold'
              : 'text-slate-605 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
          }`}
        >
          <span>🎯</span> Analisis Semester Aktif
        </button>
        <button type="button"
          onClick={() => setActiveTabMode('comparative')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'comparative'
              ? 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl text-brand-600 dark:text-brand-400 shadow-sm transform scale-102 font-bold'
              : 'text-slate-605 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
          }`}
        >
          <span>📊</span> Perbandingan Semester 1 & 2
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <LoadingProgress currentStep={loadingStep} />
      </div>
    );
  }

  if (isCompLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <CompLoadingProgress currentStep={compLoadingStep} />
      </div>
    );
  }

  // === RENDER COMPARATIVE MODE TREE ===
  if (activeTabMode === 'comparative') {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        {renderSegmentedControl()}
        <ComparativeAnalysisView
          studentData={studentData}
          activeAcademicYear={activeAcademicYear}
          avgScoreSem1={avgScoreSem1}
          avgScoreSem2={avgScoreSem2}
          avgScoreDiff={avgScoreDiff}
          sem1Academic={sem1Academic}
          sem2Academic={sem2Academic}
          sem1Quizzes={sem1Quizzes}
          sem2Quizzes={sem2Quizzes}
          compAttendanceStats={compAttendanceStats}
          compViolationStats={compViolationStats}
          compSubjectAverages={compSubjectAverages}
          compHolisticDimensions={compHolisticDimensions}
          comparativeAnalysis={comparativeAnalysis}
          compGeneratedAt={compGeneratedAt}
          onGenerateComparativeAnalysis={handleGenerateComparativeAnalysis}
          onExportComparativeReport={handleExportComparativeReport}
        />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        {renderSegmentedControl()}
        {/* Period Comparison Stats */}
        {subjectAverages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PeriodComparison
              currentAvg={periodStats.currentAvg}
              previousAvg={periodStats.previousAvg}
              label="Rata-rata 3 Bulan Terakhir"
            />
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
              <p className="text-xs opacity-80">Nilai Tertinggi</p>
              <p className="text-2xl font-bold">{Math.max(...studentScores, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-700 to-orange-800 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
              <p className="text-xs opacity-80">Nilai Terendah</p>
              <p className="text-2xl font-bold">{Math.min(...studentScores, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-lg shadow-slate-500/20">
              <p className="text-xs opacity-80">Jumlah Mapel</p>
              <p className="text-2xl font-bold">{subjects.length}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {subjectAverages.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart with Safety Check */}
            <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Spider Chart: Performa per Mapel</h4>
              {isRadarChartValid ? (
                <div className="flex justify-center">
                  <svg width={chartSize} height={chartSize} className="overflow-visible" role="img" aria-label="Spider chart performa siswa per mata pelajaran">
                    <title>Bagan Radar: Performa per Mata Pelajaran</title>
                    {gridLevels.map(level => (
                      <polygon key={level} points={calculateRadarPoints(subjects.map(() => level), maxScore, centerX, centerY, radius)} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                    ))}
                    {axisEndpoints.map((axis, i) => (<line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />))}
                    <polygon points={studentPolygonPoints} fill="rgba(13, 126, 158, 0.3)" stroke="rgb(99, 102, 241)" strokeWidth="2" />
                    {subjects.map((_, i) => { const angle = i * (2 * Math.PI / subjects.length) - Math.PI / 2; const ratio = studentScores[i] / maxScore; return (<circle key={i} cx={centerX + radius * ratio * Math.cos(angle)} cy={centerY + radius * ratio * Math.sin(angle)} r="5" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="2" />); })}
                    {labelPositions.map((pos, i) => (<text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-xxs font-medium fill-slate-600 dark:fill-slate-400">{pos.label.length > 10 ? pos.label.substring(0, 10) + '...' : pos.label}</text>))}
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 min-h-[260px]">
                  <div className="bg-brand-50 dark:bg-brand-900/20 rounded-full p-4 mb-4 text-brand-700">
                    <BrainCircuitIcon className="w-12 h-12" />
                  </div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">Bagan Radar Tidak Tersedia</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px] leading-relaxed">
                    Bagan Radar membutuhkan minimal 3 mata pelajaran dengan nilai untuk memetakan kekuatan kognitif secara geometri. Saat ini siswa baru memiliki {subjects.length} mata pelajaran.
                  </p>
                </div>
              )}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">Rata-rata: <span className="font-bold text-brand-600 dark:text-brand-400">{overallAverage}</span></p>
            </div>
            {/* Bar Chart */}
            <SubjectPerformanceChart
              subjects={subjectAverages}
              kkmLine={75}
            />
          </div>
        )}

        {/* AI Analysis CTA */}
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-2xl border border-brand-200 dark:border-brand-800">
          <div className="bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-full p-6 mb-6">
            <BrainCircuitIcon className="w-16 h-16 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Laporan Perkembangan Anak
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 text-sm">
            Dapatkan rangkuman tumbuh kembang akademik, sikap harian, dan keterampilan fisik siswa secara menyeluruh.
          </p>
          <Button
            onClick={handleGenerateAnalysis}
            size="lg"
            className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 font-bold px-8 shadow-md"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            ✨ Buat Laporan Perkembangan
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (colorClass: string) => {
    if (colorClass.includes('emerald')) return 'text-emerald-650 dark:text-emerald-400';
    if (colorClass.includes('blue')) return 'text-blue-600 dark:text-blue-400';
    if (colorClass.includes('rose')) return 'text-rose-600 dark:text-rose-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  return (
    <div className="space-y-6 pb-8" ref={reportRef}>
      {renderSegmentedControl()}

      {/* Header Laporan / GlanceHeroCard */}
      <GlanceHeroCard
        studentName={analysis.summary.name}
        studentAge={analysis.summary.age}
        studentClass={analysis.summary.class}
        overallScore={overallAverage}
        generatedBy={analysis.generatedBy}
        generatedAt={generatedAt}
        isStale={generatedAt ? (Date.now() - new Date(generatedAt).getTime()) > 30 * 24 * 60 * 60 * 1000 : false}
        overallAssessment={analysis.summary.overallAssessment}
        onExportPdf={handleExportReport}
        onRefresh={handleGenerateAnalysis}
      />

      {/* 30-Second Glance Ringkasan Ananda */}
      {glanceSummary && (
        <QuickInsightStrip
          superpower={glanceSummary.superpower}
          challenge={glanceSummary.challenge}
          homeTip={glanceSummary.homeTip}
        />
      )}

      {/* Status Perkembangan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DevelopmentScoreCard
          aspect="cognitive"
          statusLabel={developmentBadges.cognitive.label}
          statusColor={getStatusColor(developmentBadges.cognitive.color)}
          statusDot={developmentBadges.cognitive.dot}
          score={overallAverage}
          highlights={analysis?.cognitive?.strengths?.slice(0, 3) || []}
        />
        <DevelopmentScoreCard
          aspect="affective"
          statusLabel={developmentBadges.affective.label}
          statusColor={getStatusColor(developmentBadges.affective.color)}
          statusDot={developmentBadges.affective.dot}
          score={attendanceRate}
          highlights={analysis?.affective?.positiveCharacters?.slice(0, 3) || []}
        />
        <DevelopmentScoreCard
          aspect="psychomotor"
          statusLabel={developmentBadges.psychomotor.label}
          statusColor={getStatusColor(developmentBadges.psychomotor.color)}
          statusDot={developmentBadges.psychomotor.dot}
          score={keaktifan}
          highlights={analysis?.psychomotor?.outstandingSkills?.slice(0, 3) || []}
        />
      </div>

      {/* Accordion Expand Button */}
      <div className="flex justify-center mt-2">
        <Button
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          variant="outline"
          className="rounded-full shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold px-6 py-5 flex items-center gap-2 hover:bg-slate-50 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
        >
          {isDetailsExpanded ? 'Sembunyikan Detail Analisis' : 'Lihat Detail Analisis AI & Grafik Radar'}
          <MotionSpan
            animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.fast }}
            className="inline-block"
          >
            ↓
          </MotionSpan>
        </Button>
      </div>

      {/* Accordion Collapsible Detail Content */}
      <AnimatePresence>
        {isDetailsExpanded && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, ease: 'easeInOut' }}
            className="overflow-hidden space-y-6"
          >
            {/* Period Comparison in Analysis View */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PeriodComparison
                currentAvg={periodStats.currentAvg}
                previousAvg={periodStats.previousAvg}
                label="Rata-rata Saat Ini"
              />
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm transition-all p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1 font-medium">Kehadiran Kelas</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-605 dark:text-green-400">
                    {studentData.attendanceRecords.filter((a) => a.status === 'Hadir').length}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">
                    / {studentData.attendanceRecords.length} hari
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm transition-all p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1 font-medium">Partisipasi Kuis</p>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {studentData.quizPoints.length}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm transition-all p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1 font-medium">Pelanggaran</p>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {studentData.violations.reduce((a, b) => a + b.points, 0)} poin
                </span>
              </div>
            </div>

            {/* Academic Charts */}
            {subjectAverages.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart with Safety Check */}
                <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Peta Kekuatan Akademik</h4>
                  {isRadarChartValid ? (
                    <div className="flex justify-center">
                      <svg width={chartSize} height={chartSize} className="overflow-visible">
                        {gridLevels.map(level => (
                          <polygon key={level} points={calculateRadarPoints(subjects.map(() => level), maxScore, centerX, centerY, radius)} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                        ))}
                        {axisEndpoints.map((axis, i) => (<line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />))}
                        <polygon points={studentPolygonPoints} fill="rgba(13, 126, 158, 0.3)" stroke="rgb(99, 102, 241)" strokeWidth="2" />
                        {subjects.map((_, i) => { const angle = i * (2 * Math.PI / subjects.length) - Math.PI / 2; const ratio = studentScores[i] / maxScore; return (<circle key={i} cx={centerX + radius * ratio * Math.cos(angle)} cy={centerY + radius * ratio * Math.sin(angle)} r="5" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="2" />); })}
                        {labelPositions.map((pos, i) => (<text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-xxs font-medium fill-slate-600 dark:fill-slate-400">{pos.label.length > 10 ? pos.label.substring(0, 10) + '...' : pos.label}</text>))}
                      </svg>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 min-h-[260px]">
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-full p-4 mb-4 text-brand-700">
                        <BrainCircuitIcon className="w-12 h-12" />
                      </div>
                      <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">Bagan Radar Tidak Tersedia</h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px] leading-relaxed">
                        Bagan Radar membutuhkan minimal 3 mata pelajaran dengan nilai untuk memetakan kekuatan kognitif secara geometri. Saat ini siswa baru memiliki {subjects.length} mata pelajaran.
                      </p>
                    </div>
                  )}
                  <p className="text-center text-xs text-slate-505 dark:text-slate-400 mt-3">Rata-rata: <span className="font-bold text-brand-600 dark:text-brand-400">{overallAverage}</span></p>
                </div>
                {/* Subject Performance Chart */}
                <SubjectPerformanceChart
                  subjects={subjectAverages}
                  kkmLine={75}
                />
              </div>
            )}

            {/* Actionable Recommendations Section */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-2">
                    <PlayCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">Langkah yang Bisa Dilakukan</CardTitle>
                    <CardDescription>Langkah-langkah konkret yang dirancang khusus untuk memandu Ananda</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {actionableRecommendations.map((rec, idx) => (
                    <ActionableRecommendation key={idx} {...rec} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rencana Pengembangan */}
            <DevelopmentTimeline
              threeMonthTargets={analysis?.recommendations?.developmentPlan?.threeMonths || []}
              sixMonthTargets={analysis?.recommendations?.developmentPlan?.sixMonths || []}
            />

            {/* Warning Banner */}
            <WarningBanner
              warnings={analysis?.recommendations?.warningsSigns || []}
            />

            {/* Footer Note */}
            <div className="bg-gradient-to-r from-brand-100 to-brand-200 dark:from-brand-950/10 dark:to-blue-950/10 rounded-2xl p-6 border border-brand-200/50 dark:border-brand-900/50">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-950/40 rounded-full p-2.5 flex-shrink-0">
                  <AlertCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-brand-300 mb-1 text-sm uppercase tracking-wide">Catatan Penting Guru & Orang Tua</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Analisis perkembangan siswa ini dirumuskan berdasarkan rekam data akademik serta perilaku harian kelas secara objektif.
                    Setiap anak tumbuh dengan garis waktu dan potensi keunikannya masing-masing. Terus dukung perkembangan minat-bakat Ananda, dan jalin komunikasi intensif dengan pihak sekolah untuk hasil stimulasi terbaik.
                  </p>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="regen-confirm-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div role="presentation" aria-hidden="true" onKeyDown={(e) => { if (e.key === 'Escape') setShowRegenerateConfirm(false); }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRegenerateConfirm(false)} />
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-xl transition-all shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 id="regen-confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">Regenerate Analisis?</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Analisis baru akan menggantikan analisis sebelumnya. Lanjutkan?</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowRegenerateConfirm(false)}>Batal</Button>
              <Button size="sm" onClick={doGenerateAnalysis}>Ya, Regenerate</Button>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Regenerate Confirmation Modal */}
      {showCompRegenerateConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="comp-regen-confirm-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div role="presentation" aria-hidden="true" onKeyDown={(e) => { if (e.key === 'Escape') setShowCompRegenerateConfirm(false); }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCompRegenerateConfirm(false)} />
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-xl transition-all shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 id="comp-regen-confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">Regenerate Analisis Perbandingan?</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Analisis perbandingan baru akan menggantikan analisis sebelumnya. Lanjutkan?</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCompRegenerateConfirm(false)}>Batal</Button>
              <Button size="sm" onClick={doGenerateComparativeAnalysis}>Ya, Regenerate</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
