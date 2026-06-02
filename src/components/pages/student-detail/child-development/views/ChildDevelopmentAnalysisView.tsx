import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../ui/Card';
import {
  BrainCircuitIcon,
  SparklesIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  BookOpenIcon,
  UsersIcon,
  CheckSquareIcon,
  CalendarIcon,
  DownloadIcon,
  PlayCircleIcon,
  ClockIcon,
  RefreshCwIcon
} from '../../../../Icons';
import { useToast } from '../../../../../hooks/useToast';
import {
  generateComprehensiveChildAnalysis,
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
  saveAnalysisToDb,
  getLatestAnalysisFromDb,
  ComparativeChildAnalysis,
  generateComparativeChildAnalysis,
  getComparativeAnalysisFromDb,
  saveComparativeAnalysisToDb
} from '../../../../../services/childDevelopmentAnalysis';
import { useSemester } from '../../../../../contexts/SemesterContext';
import { useMemo } from 'react';
import { getJsPDF, getAutoTable } from '../../../../../utils/dynamicImports';
import { motion, AnimatePresence } from 'framer-motion';
import { addPdfHeader, ensureLogosLoaded } from '../../../../../utils/pdfHeaderUtils';
import { calculateRadarPoints, calculateAxisEndpoints, calculateLabelPositions } from '../utils/radarChartUtils';
import { LoadingProgress } from '../components/LoadingProgress';
import { CompLoadingProgress } from '../components/CompLoadingProgress';
import { PeriodComparison } from '../components/PeriodComparison';
import { ActionableRecommendation } from '../components/ActionableRecommendation';
import { useUserSettings } from '../../../../../hooks/useUserSettings';

interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: any[];
  allAttendanceRecords?: any[];
  allViolations?: any[];
  allQuizPoints?: any[];
  defaultMode?: 'single' | 'comparative';
}

export const ChildDevelopmentAnalysisView: React.FC<ChildDevelopmentAnalysisTabProps> = ({
  studentData,
  allAcademicRecords = [],
  allAttendanceRecords = [],
  allViolations = [],
  allQuizPoints = [],
  defaultMode = 'single'
}) => {
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
        ? Math.round(records.reduce((a: any, b: any) => a + b.score, 0) / totalRecords)
        : 0;
      return { currentAvg: avg, previousAvg: 0 };
    }

    const midPoint = Math.floor(totalRecords / 2);
    const recentRecords = records.slice(midPoint);
    const olderRecords = records.slice(0, midPoint);

    const currentAvg = Math.round(recentRecords.reduce((a: any, b: any) => a + b.score, 0) / recentRecords.length);
    const previousAvg = Math.round(olderRecords.reduce((a: any, b: any) => a + b.score, 0) / olderRecords.length);

    return { currentAvg, previousAvg };
  }, [studentData.academicRecords]);

  const subjects = subjectAverages.map((s: any) => s.subject);
  const studentScores = subjectAverages.map((s: any) => s.average);
  const overallAverage = studentScores.length > 0 ? Math.round(studentScores.reduce((a: any, b: any) => a + b, 0) / studentScores.length) : 0;

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
    () => `child_analysis_${studentData.student.id}`,
    [studentData.student.id]
  );

  // === DYNAMIC GROUPING FOR SEMESTER COMPARISON ===
  const activeYearSemesters = useMemo(() => {
    if (!activeAcademicYear) return [];
    return semesters.filter((s: any) => s.academic_year_id === activeAcademicYear.id);
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
    return Math.round(sem1Academic.reduce((sum: any, r: any) => sum + r.score, 0) / sem1Academic.length);
  }, [sem1Academic]);

  const avgScoreSem2 = useMemo(() => {
    if (sem2Academic.length === 0) return 0;
    return Math.round(sem2Academic.reduce((sum: any, r: any) => sum + r.score, 0) / sem2Academic.length);
  }, [sem2Academic]);

  const avgScoreDiff = avgScoreSem2 - avgScoreSem1;

  const compAttendanceStats = useMemo(() => {
    const getStats = (recs: any[]) => {
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
    const getStats = (recs: any[]) => {
      const count = recs.length;
      const points = recs.reduce((sum: any, r: any) => sum + (r.points || 0), 0);
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
    const getKeterampilanScore = (records: any[], overallAvg: number) => {
      const practicalSubjects = ['pjok', 'seni', 'sbdp', 'prakarya', 'keterampilan', 'seni budaya'];
      const practicalRecords = records.filter(r => {
        const sub = (r.subject || '').toLowerCase();
        return practicalSubjects.some(p => sub.includes(p));
      });
      if (practicalRecords.length > 0) {
        return Math.round(practicalRecords.reduce((sum: any, r: any) => sum + r.score, 0) / practicalRecords.length);
      }
      return overallAvg > 0 ? Math.round((overallAvg + 80) / 2) : 80;
    };

    const qPts1 = sem1Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0);
    const qCount1 = sem1Quizzes.length;
    const keaktifanSem1 = qPts1 > 0 ? Math.min(qPts1 * 5, 100) : Math.min(qCount1 * 15, 100);

    const qPts2 = sem2Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0);
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
    academicRecords: sem1Academic.map((r: any) => ({
      subject: r.subject,
      score: r.score,
      assessment_name: r.assessment_name,
      notes: r.notes
    })),
    attendanceRecords: sem1Attendance.map((a: any) => ({
      status: a.status,
      date: a.date
    })),
    violations: sem1Violations.map((v: any) => ({
      description: v.description,
      points: v.points,
      date: v.date
    })),
    quizPoints: sem1Quizzes.map((q: any) => ({
      activity: q.quiz_name || q.activity,
      points: q.points,
      date: q.quiz_date || q.date
    }))
  }), [studentData.student, sem1Academic, sem1Attendance, sem1Violations, sem1Quizzes]);

  const childData2 = useMemo<ChildDevelopmentData>(() => ({
    student: {
      id: studentData.student.id,
      name: studentData.student.name,
      age: studentData.student.age,
      class: studentData.student.class
    },
    academicRecords: sem2Academic.map((r: any) => ({
      subject: r.subject,
      score: r.score,
      assessment_name: r.assessment_name,
      notes: r.notes
    })),
    attendanceRecords: sem2Attendance.map((a: any) => ({
      status: a.status,
      date: a.date
    })),
    violations: sem2Violations.map((v: any) => ({
      description: v.description,
      points: v.points,
      date: v.date
    })),
    quizPoints: sem2Quizzes.map((q: any) => ({
      activity: q.quiz_name || q.activity,
      points: q.points,
      date: q.quiz_date || q.date
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
        const dbAnalysis = await getLatestAnalysisFromDb(studentData.student.id);
        if (dbAnalysis) {
          setAnalysis(dbAnalysis);
          setGeneratedAt((dbAnalysis as any).generatedAt || null);
          return;
        }
      } catch (err) {
        console.error('Gagal memuat analisis dari Supabase, mencoba localStorage:', err);
      }

      const savedAnalysis = localStorage.getItem(getStorageKey());
      if (savedAnalysis) {
        try {
          const parsed = JSON.parse(savedAnalysis);
          setAnalysis(parsed);
          setGeneratedAt(parsed.generatedAt || null);
        } catch (e) {
          console.error('Failed to parse saved analysis:', e);
          localStorage.removeItem(getStorageKey());
        }
      }
    };

    loadAnalysis();
  }, [studentData.student.id, getStorageKey]);

  // Load comparative analysis
  useEffect(() => {
    const loadCompAnalysis = async () => {
      if (!activeAcademicYear) return;
      
      try {
        const dbComp = await getComparativeAnalysisFromDb(studentData.student.id, activeAcademicYear.id);
        if (dbComp) {
          setComparativeAnalysis(dbComp);
          setCompGeneratedAt((dbComp as any).generatedAt || null);
          return;
        }
      } catch (err) {
        console.error('Failed to load comparative analysis from Supabase:', err);
      }

      const savedComp = localStorage.getItem(`comp_analysis_${studentData.student.id}_${activeAcademicYear.id}`);
      if (savedComp) {
        try {
          const parsed = JSON.parse(savedComp);
          setComparativeAnalysis(parsed);
          setCompGeneratedAt(parsed.generatedAt || null);
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
      return text
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
      ? (attendanceRecords.filter((a: any) => a.status === 'Hadir').length / attendanceRecords.length) * 100
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
          if (result && (!('error' in result) || (result as any).summary)) break;
        } catch (retryError) {
          if (attempt === maxRetries) throw retryError;
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      if (!result) throw new Error('Gagal menghasilkan analisis setelah beberapa percobaan.');

      const now = new Date().toISOString();
      (result as any).generatedAt = now;
      setGeneratedAt(now);
      setAnalysis(result);

      // Save to local storage
      localStorage.setItem(getStorageKey(), JSON.stringify(result));

      // Save to Supabase DB (silent sync, doesn't crash on offline)
      try {
        await saveAnalysisToDb(
          studentData.student.id,
          result,
          result.generatedBy || 'AI'
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

      // Load school logos
      await ensureLogosLoaded();

      const { default: jsPDF } = await getJsPDF();
      const { default: autoTable } = await getAutoTable();

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // Formal Kop Surat
      let y = addPdfHeader(doc, {
        schoolName: schoolName,
        orientation: 'portrait'
      });

      // Report Title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text('LAPORAN ANALISIS PERKEMBANGAN SISWA', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Metadata Table (elegant, clean)
      autoTable(doc, {
        startY: y,
        body: [
          ['Nama Siswa', `: ${analysis.summary.name}`, 'Kelas / TA', `: ${analysis.summary.class} / ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`],
          ['Usia', `: ${analysis.summary.age} Tahun`, 'Tanggal Cetak', `: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
        ],
        theme: 'plain',
        styles: { fontSize: 9.5, cellPadding: 1.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 28 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 28 },
          3: { cellWidth: 60 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // Divide line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // 1. Overall assessment / Ringkasan Perkembangan
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('I. RINGKASAN PERKEMBANGAN ANANDA', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const splitOverall = doc.splitTextToSize(analysis.summary.overallAssessment, pageWidth - margin * 2);
      doc.text(splitOverall, margin, y);
      y += splitOverall.length * 4.5 + 4;

      // 2. Academic & Attendance Stats Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('II. PERFORMA AKADEMIK & KEHADIRAN', margin, y);
      y += 5;

      // Academic data mapping
      const academicData = subjectAverages.map((sub, idx) => [
        idx + 1,
        sub.subject,
        sub.average,
        sub.average >= 85 ? 'Sangat Baik' : sub.average >= 75 ? 'Baik' : sub.average >= 65 ? 'Cukup' : 'Perlu Pendampingan'
      ]);

      autoTable(doc, {
        startY: y,
        head: [['No', 'Mata Pelajaran', 'Nilai Rata-rata', 'Predikat']],
        body: academicData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
        styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 80, halign: 'left' },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // Attendance Rekap
      const totalAttend = studentData.attendanceRecords.length;
      const hadir = studentData.attendanceRecords.filter((a: any) => a.status === 'Hadir').length;
      const sakit = studentData.attendanceRecords.filter((a: any) => a.status === 'Sakit').length;
      const izin = studentData.attendanceRecords.filter((a: any) => a.status === 'Izin').length;
      const alpha = studentData.attendanceRecords.filter((a: any) => a.status === 'Alpha').length;
      const percentage = totalAttend > 0 ? ((hadir / totalAttend) * 100).toFixed(1) : '100';

      autoTable(doc, {
        startY: y,
        head: [['Kehadiran (H)', 'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Persentase Kehadiran']],
        body: [[`${hadir} Hari`, `${sakit} Hari`, `${izin} Hari`, `${alpha} Hari`, `${percentage}%`]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
        styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Check if we need to add a new page (prevent orphans)
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      // 3. Cognitive, Affective, Psychomotor details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('III. DETIL ASPEK PERKEMBANGAN', margin, y);
      y += 6;

      // Cognitive
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('A. Perkembangan Pola Pikir & Kognitif', margin, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Gaya Belajar: ${analysis.cognitive.learningStyle}`, margin + 3, y);
      y += 4.5;
      doc.text(`• Berpikir Kritis: ${analysis.cognitive.criticalThinking}`, margin + 3, y);
      y += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.text('Kekuatan Utama Kognitif:', margin + 3, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      analysis.cognitive.strengths.slice(0, 2).forEach((str: any) => {
        const lines = doc.splitTextToSize(`- ${str}`, pageWidth - margin * 2 - 6);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4.5;
      });
      y += 2;

      // Check height
      if (y > 235) {
        doc.addPage();
        y = 20;
      }

      // Affective
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('B. Aspek Afektif & Karakter Positif', margin, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Kemampuan Sosial: ${analysis.affective.socialSkills}`, margin + 3, y);
      y += 4.5;
      doc.text(`• Kedisiplinan: ${analysis.affective.discipline}`, margin + 3, y);
      y += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.text('Karakter Positif Menonjol:', margin + 3, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      analysis.affective.positiveCharacters.slice(0, 2).forEach((char: any) => {
        const lines = doc.splitTextToSize(`- ${char}`, pageWidth - margin * 2 - 6);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4.5;
      });
      y += 2;

      // Check height
      if (y > 235) {
        doc.addPage();
        y = 20;
      }

      // Psychomotor
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('C. Aspek Psikomotor & Keterampilan Fisik', margin, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Kemampuan Motorik: ${analysis.psychomotor.motorSkills}`, margin + 3, y);
      y += 4.5;
      doc.text(`• Koordinasi Fisik: ${analysis.psychomotor.coordination}`, margin + 3, y);
      y += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.text('Keterampilan Fisik Terbaik:', margin + 3, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      analysis.psychomotor.outstandingSkills.slice(0, 2).forEach((skill: any) => {
        const lines = doc.splitTextToSize(`- ${skill}`, pageWidth - margin * 2 - 6);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4.5;
      });
      y += 6;

      // Check page break for Recommendations
      if (y > 200) {
        doc.addPage();
        y = 20;
      }

      // 4. Recommendations & Development Plan
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('IV. REKOMENDASI & RENCANA PENGEMBANGAN', margin, y);
      y += 6;

      // Home support text
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Dukungan di Rumah (Saran Praktis):', margin, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      analysis.recommendations.homeSupport.slice(0, 3).forEach((support: any, idx: any) => {
        const lines = doc.splitTextToSize(`${idx + 1}. ${support}`, pageWidth - margin * 2 - 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4.5;
      });
      y += 4;

      // Target 3 Bulan & 6 Bulan inside grid
      autoTable(doc, {
        startY: y,
        head: [['Rencana Target 3 Bulan', 'Rencana Target 6 Bulan']],
        body: [[
          analysis.recommendations.developmentPlan.threeMonths.slice(0, 3).map((t: any) => `• ${t}`).join('\n\n'),
          analysis.recommendations.developmentPlan.sixMonths.slice(0, 3).map((t: any) => `• ${t}`).join('\n\n')
        ]],
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [71, 85, 105] },
        columnStyles: {
          0: { cellWidth: 91 },
          1: { cellWidth: 91 },
        }
      });

      y = (doc as any).lastAutoTable.finalY + 18;

      // Signature page check
      if (y > 240) {
        doc.addPage();
        y = 25;
      }

      // 5. Signature Block
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Madiun, ${printDateStr}`, pageWidth - 70, y);

      doc.text('Mengetahui,', margin + 10, y + 5);
      doc.text('Kepala Madrasah,', margin + 10, y + 10);

      doc.text('Wali Kelas,', pageWidth - 70, y + 10);

      // Names signatures place
      y += 32;
      doc.setFont('helvetica', 'bold');
      doc.text(`( ${principalName} )`, margin + 10, y);
      doc.text(`( ${studentData.student.class ? 'Guru Wali Kelas' : 'Wali Kelas'} )`, pageWidth - 70, y);

      const safeName = analysis.summary.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      doc.save(`Laporan_Perkembangan_Siswa_${safeName}.pdf`);

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
          if (result && (!('error' in result) || (result as any).summary)) break;
        } catch (retryError) {
          if (attempt === maxRetries) throw retryError;
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      if (!result) throw new Error('Gagal menghasilkan analisis perbandingan setelah beberapa percobaan.');

      const now = new Date().toISOString();
      (result as any).generatedAt = now;
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

      // Load school logos
      await ensureLogosLoaded();

      const { default: jsPDF } = await getJsPDF();
      const { default: autoTable } = await getAutoTable();

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Formal Kop Surat
      let y = addPdfHeader(doc, {
        schoolName: schoolName,
        orientation: 'portrait'
      });

      // Report Title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text('LAPORAN KOMPARASI PERKEMBANGAN SISWA ANTAR SEMESTER', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Metadata Table (elegant, clean)
      autoTable(doc, {
        startY: y,
        body: [
          ['Nama Siswa', `: ${comparativeAnalysis.summary.name}`, 'Kelas / TA', `: ${comparativeAnalysis.summary.class} / ${activeAcademicYear?.name || '-'}`],
          ['Rata-Rata S1', `: ${avgScoreSem1}`, 'Rata-Rata S2', `: ${avgScoreSem2} (${avgScoreDiff >= 0 ? '+' : ''}${avgScoreDiff})`],
          ['Tanggal Cetak', `: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 'Metode', `: ${comparativeAnalysis.generatedBy === 'Offline Fallback' ? 'Offline Standard' : 'AI Comparative'}`],
        ],
        theme: 'plain',
        styles: { fontSize: 9.5, cellPadding: 1.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 28 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 28 },
          3: { cellWidth: 60 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // Divide line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // === SECTION 1: PERFORMA AKADEMIK KOMPARATIF ===
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // Indigo 600
      doc.text('1. PERBANDINGAN PERFORMA AKADEMIK PER MATA PELAJARAN', margin, y);
      y += 5;

      // Create comparative rows
      const academicRows = compSubjectAverages.map((item, idx) => {
        const s1Val = item.sem1 !== null ? item.sem1 : '-';
        const s2Val = item.sem2 !== null ? item.sem2 : '-';
        let status = 'Stabil';
        if (item.sem1 !== null && item.sem2 !== null) {
          const diff = item.sem2 - item.sem1;
          status = diff > 0 ? `Naik ${diff} Poin` : diff < 0 ? `Turun ${Math.abs(diff)} Poin` : 'Stabil';
        }
        return [idx + 1, item.subject, s1Val, s2Val, status];
      });

      autoTable(doc, {
        startY: y,
        head: [['No', 'Mata Pelajaran', 'Semester 1 (Ganjil)', 'Semester 2 (Genap)', 'Catatan Perkembangan']],
        body: academicRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65 },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 40, fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.cell.section === 'body') {
            const val = data.cell.text[0];
            if (val.startsWith('Naik')) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
            } else if (val.startsWith('Turun')) {
              data.cell.styles.textColor = [244, 63, 94]; // Rose 500
            } else {
              data.cell.styles.textColor = [100, 116, 139]; // Slate 500
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // === SECTION 2: KEHADIRAN & KARAKTER KOMPARATIF ===
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('2. KOMPARASI REKAPITULASI PRESENSI & DISIPLIN', margin, y);
      y += 5;

      const presensiRows = [
        ['Rasio Kehadiran', `${compAttendanceStats.sem1.percentage}%`, `${compAttendanceStats.sem2.percentage}%`, `${compAttendanceStats.sem2.percentage - compAttendanceStats.sem1.percentage >= 0 ? '+' : ''}${compAttendanceStats.sem2.percentage - compAttendanceStats.sem1.percentage}%`],
        ['Hadir', `${compAttendanceStats.sem1.hadir} Hari`, `${compAttendanceStats.sem2.hadir} Hari`, `${compAttendanceStats.sem2.hadir - compAttendanceStats.sem1.hadir}`],
        ['Sakit', `${compAttendanceStats.sem1.sakit} Hari`, `${compAttendanceStats.sem2.sakit} Hari`, `${compAttendanceStats.sem2.sakit - compAttendanceStats.sem1.sakit}`],
        ['Izin', `${compAttendanceStats.sem1.izin} Hari`, `${compAttendanceStats.sem2.izin} Hari`, `${compAttendanceStats.sem2.izin - compAttendanceStats.sem1.izin}`],
        ['Alpha', `${compAttendanceStats.sem1.alpha} Hari`, `${compAttendanceStats.sem2.alpha} Hari`, `${compAttendanceStats.sem2.alpha - compAttendanceStats.sem1.alpha}`],
        ['Poin Pelanggaran', `${compViolationStats.sem1.points} Poin`, `${compViolationStats.sem2.points} Poin`, `${compViolationStats.sem2.points - compViolationStats.sem1.points}`]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Metrik Disiplin', 'Semester 1', 'Semester 2', 'Perubahan']],
        body: presensiRows,
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 45, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            const val = data.cell.text[0];
            const isViolationRow = data.row.index === 5;
            if (val.startsWith('+') && !isViolationRow) {
              data.cell.styles.textColor = [16, 185, 129];
            } else if (val.startsWith('-') && !isViolationRow) {
              data.cell.styles.textColor = [244, 63, 94];
            } else if (isViolationRow) {
              const numVal = parseInt(val);
              if (numVal > 0) {
                data.cell.styles.textColor = [244, 63, 94]; // Red for violation increase
              } else if (numVal < 0) {
                data.cell.styles.textColor = [16, 185, 129]; // Green for violation decrease
              }
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // === SECTION 3: EVALUASI 5 DIMENSI PERKEMBANGAN HOLISTIK ===
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('3. EVALUASI 5 DIMENSI PERKEMBANGAN HOLISTIK', margin, y);
      y += 5;

      const subLabels = [
        'Akademik (Kognitif)',
        'Kehadiran (Presensi)',
        'Kedisiplinan (Karakter & Adab)',
        'Keaktifan (Partisipasi)',
        'Keterampilan (Psikomotorik)'
      ];

      const dimensiRows = compHolisticDimensions.labels.map((label, idx) => {
        const s1Val = compHolisticDimensions.sem1[idx];
        const s2Val = compHolisticDimensions.sem2[idx];
        const diff = s2Val - s1Val;
        const trend = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : 'Stabil';
        const displayLabel = subLabels[idx] || label;
        return [idx + 1, displayLabel, `${s1Val}%`, `${s2Val}%`, trend];
      });

      autoTable(doc, {
        startY: y,
        head: [['No', 'Dimensi Perkembangan', 'Semester 1', 'Semester 2', 'Perkembangan (Trend)']],
        body: dimensiRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.cell.section === 'body') {
            const val = data.cell.text[0];
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
            } else if (val.startsWith('-')) {
              data.cell.styles.textColor = [244, 63, 94]; // Rose 500
            } else {
              data.cell.styles.textColor = [100, 116, 139]; // Slate 500
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Add a page break for the detailed narratives
      doc.addPage();
      y = addPdfHeader(doc, {
        schoolName: schoolName,
        orientation: 'portrait'
      });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('4. ANALISIS NARATIF PERKEMBANGAN ANANDA (AI COMPLETED)', margin, y);
      y += 6;

      // General comparative overview
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('A. RINGKASAN DINAMIKA PERKEMBANGAN', margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const overallText = doc.splitTextToSize(comparativeAnalysis.summary.overallComparison, pageWidth - (margin * 2));
      doc.text(overallText, margin, y);
      y += (overallText.length * 4) + 6;

      // Function to render elegant side-by-side strengths or bullet points and then narrative
      const drawAspectComparison = (
        title: string,
        sem1Bullets: string[],
        sem2Bullets: string[],
        narrative: string
      ) => {
        // Prevent layout overlapping
        if (y > pageHeight - 80) {
          doc.addPage();
          y = addPdfHeader(doc, { schoolName: schoolName, orientation: 'portrait' }) + 8;
        }

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title, margin, y);
        y += 5;

        // Render standard comparison bullets using a two-column clean style
        const colWidth = (pageWidth - (margin * 2) - 8) / 2;
        
        // Semester 1 Col
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, colWidth, 32, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('Semester 1 (Ganjil):', margin + 3, y + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        let s1Y = y + 10;
        sem1Bullets.slice(0, 3).forEach(b => {
          const splitB = doc.splitTextToSize(`• ${b}`, colWidth - 6);
          doc.text(splitB, margin + 3, s1Y);
          s1Y += (splitB.length * 3.5);
        });

        // Semester 2 Col
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin + colWidth + 8, y, colWidth, 32, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('Semester 2 (Genap):', margin + colWidth + 11, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        let s2Y = y + 10;
        sem2Bullets.slice(0, 3).forEach(b => {
          const splitB = doc.splitTextToSize(`• ${b}`, colWidth - 6);
          doc.text(splitB, margin + colWidth + 11, s2Y);
          s2Y += (splitB.length * 3.5);
        });

        y += 36;

        // Narrative below columns
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const splitNarrative = doc.splitTextToSize(`" ${narrative} "`, pageWidth - (margin * 2));
        doc.text(splitNarrative, margin, y);
        y += (splitNarrative.length * 4) + 6;
      };

      // Aspect 1: Kognitif
      drawAspectComparison(
        'B. EVALUASI ASPEK KOGNITIF (AKADEMIK & CARA BELAJAR)',
        comparativeAnalysis.cognitive.semester1Strengths,
        comparativeAnalysis.cognitive.semester2Strengths,
        comparativeAnalysis.cognitive.comparisonNarrative
      );

      // Aspect 2: Afektif
      drawAspectComparison(
        'C. EVALUASI ASPEK AFEKTIF (KARAKTER & SOSIAL-EMOSIONAL)',
        comparativeAnalysis.affective.semester1PositiveCharacters,
        comparativeAnalysis.affective.semester2PositiveCharacters,
        comparativeAnalysis.affective.comparisonNarrative
      );

      // Aspect 3: Psikomotorik
      drawAspectComparison(
        'D. EVALUASI ASPEK PSIKOMOTORIK (KETERAMPILAN & AKTIVITAS FISIK)',
        comparativeAnalysis.psychomotor.semester1Skills,
        comparativeAnalysis.psychomotor.semester2Skills,
        comparativeAnalysis.psychomotor.comparisonNarrative
      );

      // Add one more page for recommendations & signature
      doc.addPage();
      y = addPdfHeader(doc, {
        schoolName: schoolName,
        orientation: 'portrait'
      });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('5. REKOMENDASI DAN RENCANA STIMULASI LANJUTAN', margin, y);
      y += 6;

      // Home Support Table
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('A. Dukungan Pembelajaran di Rumah (Home Support)', margin, y);
      y += 4;

      const homeSupportRows = comparativeAnalysis.recommendations.homeSupport.map((support: any, idx: any) => [idx + 1, support]);
      autoTable(doc, {
        startY: y,
        body: homeSupportRows,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [71, 85, 105] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 8, textColor: [79, 70, 229] },
          1: { cellWidth: 170 }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // Stimulation Plan Table
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('B. Rencana Kerja Stimulasi Kolaboratif', margin, y);
      y += 4;

      const stimulationRows = [
        ['Stimulasi Kognitif', comparativeAnalysis.recommendations.stimulation.cognitive.join('\n')],
        ['Stimulasi Afektif', comparativeAnalysis.recommendations.stimulation.affective.join('\n')],
        ['Stimulasi Psikomotorik', comparativeAnalysis.recommendations.stimulation.psychomotor.join('\n')]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Dimensi', 'Rencana Aksi Stimulasi untuk Orang Tua & Guru']],
        body: stimulationRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 140 }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Check height for signature
      if (y > pageHeight - 50) {
        doc.addPage();
        y = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD KOTA MADIUN', orientation: 'portrait' }) + 8;
      }

      // Formal signature blocks
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('Madiun, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - 70, y);
      y += 4;

      doc.text('Mengetahui,', margin + 10, y);
      doc.text('Kepala Madrasah,', margin + 10, y + 5);

      doc.text('Wali Kelas,', pageWidth - 70, y + 5);

      // Names signatures place
      y += 28;
      doc.setFont('helvetica', 'bold');
      doc.text(`( ${principalName} )`, margin + 10, y);
      doc.text(`( ${studentData.student.class ? 'Guru Wali Kelas' : 'Wali Kelas'} )`, pageWidth - 70, y);

      const safeName = comparativeAnalysis.summary.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      doc.save(`Laporan_Komparasi_Perkembangan_Siswa_${safeName}.pdf`);

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
    homeSupport.slice(0, 2).forEach((support: any, idx: any) => {
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
        <button
          onClick={() => setActiveTabMode('single')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'single'
              ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm transform scale-102 font-bold'
              : 'text-slate-605 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
          }`}
        >
          <span>🎯</span> Analisis Semester Aktif
        </button>
        <button
          onClick={() => setActiveTabMode('comparative')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'comparative'
              ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm transform scale-102 font-bold'
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

        {/* Overall averages cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl -mr-6 -mt-6" />
            <p className="text-sm opacity-80 font-medium">Rata-rata Semester 1 (Ganjil)</p>
            <p className="text-4xl font-extrabold mt-2">{avgScoreSem1}</p>
            <div className="mt-4 text-xs bg-indigo-700/40 rounded-lg px-2.5 py-1 inline-block border border-indigo-400/20 font-semibold">
              {sem1Academic.length} Rekor Nilai
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl -mr-6 -mt-6" />
            <p className="text-sm opacity-80 font-medium">Rata-rata Semester 2 (Genap)</p>
            <p className="text-4xl font-extrabold mt-2">{avgScoreSem2}</p>
            <div className="mt-4 text-xs bg-emerald-700/40 rounded-lg px-2.5 py-1 inline-block border border-emerald-400/20 font-semibold">
              {sem2Academic.length} Rekor Nilai
            </div>
          </div>
          <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden ${
            avgScoreDiff >= 0 
              ? 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/20' 
              : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20'
          }`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-6 -mt-6" />
            <p className="text-sm opacity-80 font-medium">Pertumbuhan Akademik</p>
            <p className="text-4xl font-extrabold mt-2">
              {avgScoreDiff >= 0 ? `+${avgScoreDiff}` : avgScoreDiff}
            </p>
            <div className="mt-4 text-xs bg-white/20 rounded-lg px-2.5 py-1 inline-block border border-white/10 font-semibold">
              {avgScoreDiff >= 0 ? '📈 Kenaikan Performa' : '📉 Butuh Bimbingan'}
            </div>
          </div>
        </div>

        {/* Side-by-Side Charts: Double Radar & Subject Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Double Radar Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Bagan Radar Ganda: Dimensi Holistik</h4>
                <div className="flex gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-indigo-500 inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Sem 1</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Sem 2</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-6">Perbandingan 5 dimensi perkembangan utama siswa antar semester</p>
            </div>

            <div className="flex justify-center my-auto py-2">
              <svg width={chartSize} height={chartSize} className="overflow-visible" role="img" aria-label="Bagan radar perbandingan 5 dimensi perkembangan holistik siswa antar semester">
                <title>Bagan Radar Ganda: Dimensi Holistik Semester 1 vs Semester 2</title>
                {/* Radar Grid Levels (20, 40, 60, 80, 100) */}
                {gridLevels.map(level => (
                  <polygon 
                    key={level} 
                    points={calculateRadarPoints(compHolisticDimensions.labels.map(() => level), maxScore, centerX, centerY, radius)} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    className="text-slate-200 dark:text-slate-700" 
                  />
                ))}

                {/* Axis lines */}
                {calculateAxisEndpoints(compHolisticDimensions.labels.length, centerX, centerY, radius).map((axis, i) => (
                  <line 
                    key={i} 
                    x1={axis.x1} 
                    y1={axis.y1} 
                    x2={axis.x2} 
                    y2={axis.y2} 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    className="text-slate-200 dark:text-slate-700" 
                  />
                ))}

                {/* Semester 1 Polygon (Indigo) */}
                <polygon 
                  points={calculateRadarPoints(compHolisticDimensions.sem1, maxScore, centerX, centerY, radius)} 
                  fill="rgba(99, 102, 241, 0.15)" 
                  stroke="rgba(99, 102, 241, 0.85)" 
                  strokeWidth="2.5" 
                  strokeDasharray="4 2"
                />

                {/* Semester 2 Polygon (Emerald) */}
                <polygon 
                  points={calculateRadarPoints(compHolisticDimensions.sem2, maxScore, centerX, centerY, radius)} 
                  fill="rgba(16, 185, 129, 0.22)" 
                  stroke="rgba(16, 185, 129, 0.9)" 
                  strokeWidth="2.5" 
                />

                {/* Semester 1 Circles */}
                {compHolisticDimensions.sem1.map((val, i) => {
                  const angle = i * (2 * Math.PI / compHolisticDimensions.labels.length) - Math.PI / 2;
                  const ratio = val / maxScore;
                  return (
                    <circle 
                      key={`sem1-pt-${i}`} 
                      cx={centerX + radius * ratio * Math.cos(angle)} 
                      cy={centerY + radius * ratio * Math.sin(angle)} 
                      r="4" 
                      fill="white" 
                      stroke="rgb(99, 102, 241)" 
                      strokeWidth="2" 
                    />
                  );
                })}

                {/* Semester 2 Circles */}
                {compHolisticDimensions.sem2.map((val, i) => {
                  const angle = i * (2 * Math.PI / compHolisticDimensions.labels.length) - Math.PI / 2;
                  const ratio = val / maxScore;
                  return (
                    <circle 
                      key={`sem2-pt-${i}`} 
                      cx={centerX + radius * ratio * Math.cos(angle)} 
                      cy={centerY + radius * ratio * Math.sin(angle)} 
                      r="4" 
                      fill="white" 
                      stroke="rgb(16, 185, 129)" 
                      strokeWidth="2" 
                    />
                  );
                })}

                {/* Labels */}
                {calculateLabelPositions(compHolisticDimensions.labels, centerX, centerY, radius).map((pos, i) => {
                  const val1 = compHolisticDimensions.sem1[i];
                  const val2 = compHolisticDimensions.sem2[i];
                  return (
                    <g key={i} className="cursor-pointer group">
                      <text 
                        x={pos.x} 
                        y={pos.y} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className="text-[10px] font-bold fill-slate-600 dark:fill-slate-400 hover:fill-indigo-650 dark:hover:fill-indigo-400 transition-colors"
                      >
                        {pos.label}
                      </text>
                      {/* Tooltip on hover using SVG title */}
                      <title>{`${pos.label}\nSemester 1: ${val1}\nSemester 2: ${val2}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legenda & Mini Stats */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="flex flex-col items-center p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20">
                <span className="text-[10px] text-slate-500 font-medium">Rata-rata Dimensi S1</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {Math.round(compHolisticDimensions.sem1.reduce((a,b)=>a+b,0)/5)}
                </span>
              </div>

              <div className="flex flex-col items-center p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20">
                <span className="text-[10px] text-slate-500 font-medium">Rata-rata Dimensi S2</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {Math.round(compHolisticDimensions.sem2.reduce((a,b)=>a+b,0)/5)}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Subject Comparison Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Bagan Perbandingan Nilai Mapel</h4>
                <div className="flex gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-indigo-500 inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Semester 1</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Semester 2</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-6">Perbandingan rata-rata nilai per mata pelajaran antar semester</p>
            </div>

            {compSubjectAverages.length > 0 ? (
              <div className="space-y-4 my-auto py-2">
                {compSubjectAverages.map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.subject}</span>
                      <div className="flex gap-3 text-[10px]">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Sem 1: {item.sem1 ?? '-'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sem 2: {item.sem2 ?? '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-slate-50/50 dark:bg-slate-800/20 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
                      {/* Semester 1 Bar */}
                      {item.sem1 !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-semibold w-7">Sem 1</span>
                          <div className="flex-1 h-2 bg-slate-200/50 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-505 transition-all duration-505" 
                              style={{ width: `${item.sem1}%` }} 
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold w-5 text-right">{item.sem1}</span>
                        </div>
                      )}
                      {/* Semester 2 Bar */}
                      {item.sem2 !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-semibold w-7">Sem 2</span>
                          <div className="flex-1 h-2 bg-slate-200/50 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-505 transition-all duration-505" 
                              style={{ width: `${item.sem2}%` }} 
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold w-5 text-right">{item.sem2}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 text-sm">Tidak ada data akademik untuk dibandingkan.</div>
            )}
            
            <div className="pt-4 border-t border-transparent" />
          </div>
        </div>


        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attendance Comparison */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📅</span>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">Persentase Kehadiran</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 1</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {compAttendanceStats.sem1.percentage}%
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Hadir: {compAttendanceStats.sem1.hadir} hari
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  S/I/A: {compAttendanceStats.sem1.sakit}/{compAttendanceStats.sem1.izin}/{compAttendanceStats.sem1.alpha}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {compAttendanceStats.sem2.percentage}%
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Hadir: {compAttendanceStats.sem2.hadir} hari
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  S/I/A: {compAttendanceStats.sem2.sakit}/{compAttendanceStats.sem2.izin}/{compAttendanceStats.sem2.alpha}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-center font-semibold text-slate-500">
              {compAttendanceStats.sem2.percentage >= compAttendanceStats.sem1.percentage ? (
                <span className="text-emerald-600 dark:text-emerald-400">📈 Kehadiran meningkat atau stabil</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">📉 Kehadiran mengalami penurunan</span>
              )}
            </div>
          </div>

          {/* Violations Comparison */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚠️</span>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">Poin Pelanggaran</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 1</p>
                <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-300">
                  {compViolationStats.sem1.points}
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {compViolationStats.sem1.count} Pelanggaran
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
                <p className={`text-2xl font-bold mt-1 ${compViolationStats.sem2.points > compViolationStats.sem1.points ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {compViolationStats.sem2.points}
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {compViolationStats.sem2.count} Pelanggaran
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-center font-semibold text-slate-500">
              {compViolationStats.sem2.points <= compViolationStats.sem1.points ? (
                <span className="text-emerald-600 dark:text-emerald-400">🛡️ Disiplin membaik / tetap prima</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">⚠️ Poin pelanggaran bertambah</span>
              )}
            </div>
          </div>

          {/* Quizzes/Activity Comparison */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">Poin Keaktifan Kuis</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 1</p>
                <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-300">
                  {sem1Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0)}
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {sem1Quizzes.length} Aktivitas
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {sem2Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0)}
                </p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {sem2Quizzes.length} Aktivitas
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-center font-semibold text-slate-500">
              {sem2Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0) >= sem1Quizzes.reduce((sum: any, q: any) => sum + (q.points || 0), 0) ? (
                <span className="text-emerald-600 dark:text-emerald-400">⚡ Partisipasi kuis meningkat / konsisten</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-500">⚠️ Partisipasi kuis perlu didorong lagi</span>
              )}
            </div>
          </div>
        </div>

        {/* Comparative AI Analysis CTA / Dashboard */}
        {!comparativeAnalysis ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full p-6 mb-6">
              <BrainCircuitIcon className="w-16 h-16 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Perbandingan Perkembangan Anak (AI)
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 text-sm font-medium leading-relaxed">
              AI akan membandingkan data perkembangan Kognitif, Afektif, dan Psikomotorik ananda dari Semester 1 ke Semester 2, memberikan ulasan pertumbuhan yang mendalam dan bersahabat bagi orang tua.
            </p>
            <Button
              onClick={handleGenerateComparativeAnalysis}
              size="lg"
              disabled={sem1Academic.length === 0 || sem2Academic.length === 0}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md transition-all duration-300"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Jalankan Analisis Perbandingan AI
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* TS narrowing: comparativeAnalysis is guaranteed non-null in this else branch */}
            {(() => { if (!comparativeAnalysis) return null; })()}
            {/* Header Laporan Komparasi */}
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-3">
                      <BrainCircuitIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl font-bold">Ulasan Komparasi AI Terintegrasi</CardTitle>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          comparativeAnalysis.generatedBy === 'Offline Fallback'
                            ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50'
                        }`}>
                          {comparativeAnalysis.generatedBy === 'Offline Fallback' ? '📴 Offline Standard' : '✨ AI Generated'}
                        </span>
                      </div>
                      <CardDescription className="mt-1 font-medium text-slate-600 dark:text-slate-400 text-xs">
                        {studentData.student.name} • Tahun Ajaran {activeAcademicYear?.name || 'Aktif'}
                        {compGeneratedAt && (
                          <span className="ml-2 text-slate-400 dark:text-slate-500">
                            • Dibuat: {new Date(compGeneratedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {compGeneratedAt && (Date.now() - new Date(compGeneratedAt).getTime()) > 30 * 24 * 60 * 60 * 1000 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-semibold">Stale</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleExportComparativeReport}
                      variant="outline"
                      size="sm"
                      className="bg-white/50 dark:bg-black/20 font-bold hover:shadow-sm"
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Export PDF Premium
                    </Button>
                    <Button
                      onClick={handleGenerateComparativeAnalysis}
                      variant="ghost"
                      size="sm"
                      className="font-bold text-xs"
                    >
                      <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin-hover" />
                      Ulangi Analisis
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Overall Growth narrative summary */}
            {comparativeAnalysis.summary.overallComparison && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/5 dark:to-purple-500/0 border border-indigo-500/20 dark:border-indigo-500/10 rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -mr-6 -mt-6" />
                <div className="w-10 h-10 rounded-xl bg-indigo-500/25 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 font-semibold text-lg">
                  🌱
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase mb-1">Ulasan Pertumbuhan Menyeluruh Ananda</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {comparativeAnalysis.summary.overallComparison}
                </p>
              </motion.div>
            )}

            {/* Side-by-side Analysis */}
            <div className="grid grid-cols-1 gap-8">
              {/* Kognitif Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Kognitif (Belajar & Akademik)</h4>
                    <p className="text-xs text-slate-400">Ulasan perbandingan proses belajar dan pencapaian akademik ananda</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                    <h5 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>📚</span> Semester 1
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Kekuatan Belajar</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.cognitive.semester1Strengths.map((str: any, idx: any) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                    <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>📝</span> Semester 2
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Kekuatan Belajar</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.cognitive.semester2Strengths.map((str: any, idx: any) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/50">
                  <h5 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase mb-1.5 flex items-center gap-1.5">
                    <span>🌱</span> Analisis Pertumbuhan Kognitif
                  </h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {comparativeAnalysis.cognitive.comparisonNarrative}
                  </p>
                </div>
              </div>

              {/* Afektif Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-2xl">❤️</span>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Afektif (Karakter & Sosial)</h4>
                    <p className="text-xs text-slate-400">Ulasan perbandingan karakter mulia, emosional, dan sosial ananda</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                    <h5 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>😇</span> Semester 1
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Karakter Unggul</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.affective.semester1PositiveCharacters.map((char: any, idx: any) => (
                            <li key={idx}>{char}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                    <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>🌟</span> Semester 2
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Karakter Unggul</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.affective.semester2PositiveCharacters.map((char: any, idx: any) => (
                            <li key={idx}>{char}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/50">
                  <h5 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase mb-1.5 flex items-center gap-1.5">
                    <span>🤝</span> Analisis Pertumbuhan Karakter & Sosial
                  </h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {comparativeAnalysis.affective.comparisonNarrative}
                  </p>
                </div>
              </div>

              {/* Psikomotor Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-2xl">🏃‍♂️</span>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Psikomotorik (Fisik & Kreativitas)</h4>
                    <p className="text-xs text-slate-400">Ulasan perbandingan motorik halus/kasar, olahraga, dan kreativitas ananda</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                    <h5 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>🎨</span> Semester 1
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Keterampilan Kuat</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.psychomotor.semester1Skills.map((sk: any, idx: any) => (
                            <li key={idx}>{sk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                    <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm uppercase mb-3 flex items-center gap-2">
                      <span>🏃‍♂️</span> Semester 2
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">Keterampilan Kuat</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                          {comparativeAnalysis.psychomotor.semester2Skills.map((sk: any, idx: any) => (
                            <li key={idx}>{sk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/50">
                  <h5 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase mb-1.5 flex items-center gap-1.5">
                    <span>🚀</span> Analisis Pertumbuhan Motorik & Fisik
                  </h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {comparativeAnalysis.psychomotor.comparisonNarrative}
                  </p>
                </div>
              </div>

              {/* Actionable Tips (Rekomendasi) */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-4 flex items-center gap-2">
                  <span>💡</span> Rekomendasi Tindak Lanjut untuk Orang Tua
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    const compRecs = [];
                    if (comparativeAnalysis.recommendations.homeSupport && comparativeAnalysis.recommendations.homeSupport.length > 0) {
                      compRecs.push({
                        title: 'Dukungan Rumah Tangga',
                        description: comparativeAnalysis.recommendations.homeSupport.join(' • '),
                        priority: 'high' as const,
                        category: 'Peran Rumah',
                        actions: [
                          'Diskusikan hasil perbandingan ini dengan anak secara suportif',
                          'Berikan penguatan positif atas area yang telah meningkat',
                          'Terapkan batasan waktu layar (screen-time) yang lebih teratur'
                        ]
                      });
                    }
                    if (comparativeAnalysis.recommendations.stimulation.cognitive && comparativeAnalysis.recommendations.stimulation.cognitive.length > 0) {
                      compRecs.push({
                        title: 'Stimulasi Perkembangan Kognitif',
                        description: comparativeAnalysis.recommendations.stimulation.cognitive.join(' • '),
                        priority: 'medium' as const,
                        category: 'Akademik',
                        actions: [
                          'Sediakan waktu belajar mandiri yang terjadwal',
                          'Dukung dengan buku bacaan seru atau kuis edukatif singkat',
                          'Latih pemecahan masalah sederhana sehari-hari'
                        ]
                      });
                    }
                    if (comparativeAnalysis.recommendations.stimulation.affective && comparativeAnalysis.recommendations.stimulation.affective.length > 0) {
                      compRecs.push({
                        title: 'Stimulasi Karakter & Afektif',
                        description: comparativeAnalysis.recommendations.stimulation.affective.join(' • '),
                        priority: 'medium' as const,
                        category: 'Sosial Emosional',
                        actions: [
                          'Apresiasi setiap kemandirian dan rasa empati yang ditunjukkan',
                          'Ajak bercerita tentang aktivitas dan perasaan anak setiap hari',
                          'Bantu anak mengelola emosi secara sehat melalui dialog'
                        ]
                      });
                    }
                    if (comparativeAnalysis.recommendations.stimulation.psychomotor && comparativeAnalysis.recommendations.stimulation.psychomotor.length > 0) {
                      compRecs.push({
                        title: 'Stimulasi Keterampilan Motorik',
                        description: comparativeAnalysis.recommendations.stimulation.psychomotor.join(' • '),
                        priority: 'low' as const,
                        category: 'Fisik & Kreativitas',
                        actions: [
                          'Alokasikan waktu 1 jam/hari untuk aktivitas fisik terarah',
                          'Ajak anak melakukan permainan taktis atau seni melipat kertas',
                          'Evaluasi berkala koordinasi motorik anak secara riang'
                        ]
                      });
                    }
                    return compRecs.map((rec, idx) => (
                      <ActionableRecommendation key={idx} {...rec} />
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
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
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
              <p className="text-xs opacity-80">Nilai Tertinggi</p>
              <p className="text-2xl font-bold">{Math.max(...studentScores, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
              <p className="text-xs opacity-80">Nilai Terendah</p>
              <p className="text-2xl font-bold">{Math.min(...studentScores, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white shadow-lg shadow-slate-500/20">
              <p className="text-xs opacity-80">Jumlah Mapel</p>
              <p className="text-2xl font-bold">{subjects.length}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {subjectAverages.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart with Safety Check */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Spider Chart: Performa per Mapel</h4>
              {isRadarChartValid ? (
                <div className="flex justify-center">
                  <svg width={chartSize} height={chartSize} className="overflow-visible" role="img" aria-label="Spider chart performa siswa per mata pelajaran">
                    <title>Bagan Radar: Performa per Mata Pelajaran</title>
                    {gridLevels.map(level => (
                      <polygon key={level} points={calculateRadarPoints(subjects.map(() => level), maxScore, centerX, centerY, radius)} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                    ))}
                    {axisEndpoints.map((axis, i) => (<line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />))}
                    <polygon points={studentPolygonPoints} fill="rgba(99, 102, 241, 0.3)" stroke="rgb(99, 102, 241)" strokeWidth="2" />
                    {subjects.map((_, i) => { const angle = i * (2 * Math.PI / subjects.length) - Math.PI / 2; const ratio = studentScores[i] / maxScore; return (<circle key={i} cx={centerX + radius * ratio * Math.cos(angle)} cy={centerY + radius * ratio * Math.sin(angle)} r="5" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="2" />); })}
                    {labelPositions.map((pos, i) => (<text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium fill-slate-600 dark:fill-slate-400">{pos.label.length > 10 ? pos.label.substring(0, 10) + '...' : pos.label}</text>))}
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 min-h-[260px]">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-full p-4 mb-4 text-indigo-500">
                    <BrainCircuitIcon className="w-12 h-12" />
                  </div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">Bagan Radar Tidak Tersedia</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px] leading-relaxed">
                    Bagan Radar membutuhkan minimal 3 mata pelajaran dengan nilai untuk memetakan kekuatan kognitif secara geometri. Saat ini siswa baru memiliki {subjects.length} mata pelajaran.
                  </p>
                </div>
              )}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">Rata-rata: <span className="font-bold text-indigo-600 dark:text-indigo-400">{overallAverage}</span></p>
            </div>
            {/* Bar Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Nilai per Mata Pelajaran</h4>
              <div className="space-y-3">
                {subjectAverages.map((item: any, index: any) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-700 dark:text-slate-300">{item.subject}</span><span className={`font-bold ${item.average >= 75 ? 'text-emerald-600' : item.average >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{item.average}</span></div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${item.average >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : item.average >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} style={{ width: `${item.average}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis CTA */}
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full p-6 mb-6">
            <BrainCircuitIcon className="w-16 h-16 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Analisis Perkembangan Anak
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            Dapatkan analisis komprehensif tentang perkembangan kognitif, afektif, dan psikomotor anak Anda dengan bantuan AI.
          </p>
          <Button
            onClick={handleGenerateAnalysis}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Generate Analisis Lengkap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" ref={reportRef}>
      {renderSegmentedControl()}
      {/* Header Laporan */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-3">
                <BrainCircuitIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-2xl font-bold">Ringkasan Perkembangan Anak</CardTitle>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    analysis.generatedBy === 'Offline Fallback'
                      ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50'
                  }`}>
                    {analysis.generatedBy === 'Offline Fallback' ? '📴 Offline Standard' : '✨ AI Generated'}
                  </span>
                </div>
                <CardDescription className="mt-1 font-medium">
                  {analysis.summary.name} • {analysis.summary.age} Tahun • Kelas {analysis.summary.class}
                  {generatedAt && (
                    <span className="ml-2 text-slate-400 dark:text-slate-500 text-xs">
                      • Dibuat: {new Date(generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {generatedAt && (Date.now() - new Date(generatedAt).getTime()) > 30 * 24 * 60 * 60 * 1000 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-semibold">Stale</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportReport}
                variant="outline"
                size="sm"
                className="bg-white/50 dark:bg-black/20 font-semibold hover:shadow-sm"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export PDF Premium
              </Button>
              <Button
                onClick={handleGenerateAnalysis}
                variant="ghost"
                size="sm"
                className="font-semibold"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 30-Second Glance Ringkasan Ananda */}
      {glanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-teal-500/0 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className="w-10 h-10 rounded-xl bg-emerald-500/25 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 font-semibold text-lg">
              🌟
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase mb-1">Kekuatan Utama Ananda</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {glanceSummary.superpower}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/5 dark:to-orange-500/0 border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 font-semibold text-lg">
              🎯
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase mb-1">Tantangan Seru</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {glanceSummary.challenge}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gradient-to-br from-indigo-500/10 to-sky-500/5 dark:from-indigo-500/5 dark:to-sky-500/0 border border-indigo-500/20 dark:border-indigo-500/10 rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className="w-10 h-10 rounded-xl bg-indigo-500/25 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 font-semibold text-lg">
              🏠
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase mb-1">Tips Praktis Rumah</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {glanceSummary.homeTip}
            </p>
          </motion.div>
        </div>
      )}

      {/* Status Perkembangan badges */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Status Perkembangan Ananda:</span>
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${developmentBadges.cognitive.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${developmentBadges.cognitive.dot}`} />
            <span>Kognitif: {developmentBadges.cognitive.label}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${developmentBadges.affective.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${developmentBadges.affective.dot}`} />
            <span>Afektif: {developmentBadges.affective.label}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${developmentBadges.psychomotor.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${developmentBadges.psychomotor.dot}`} />
            <span>Psikomotorik: {developmentBadges.psychomotor.label}</span>
          </div>
        </div>
      </div>

      {/* Accordion Expand Button */}
      <div className="flex justify-center mt-2">
        <Button
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          variant="outline"
          className="rounded-full shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold px-6 py-5 flex items-center gap-2 hover:bg-slate-50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          {isDetailsExpanded ? 'Sembunyikan Detail Analisis' : 'Lihat Detail Analisis AI & Grafik Radar'}
          <motion.span
            animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            ↓
          </motion.span>
        </Button>
      </div>

      {/* Accordion Collapsible Detail Content */}
      <AnimatePresence>
        {isDetailsExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden space-y-6"
          >
            {/* Overall Assessment Text */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Ulasan Perkembangan Komprehensif</CardTitle>
                <CardDescription>Ulasan holistik tentang performa dan kepribadian siswa di kelas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {analysis.summary.overallAssessment}
                </p>
              </CardContent>
            </Card>

            {/* Period Comparison in Analysis View */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PeriodComparison
                currentAvg={periodStats.currentAvg}
                previousAvg={periodStats.previousAvg}
                label="Rata-rata Saat Ini"
              />
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 mb-1">Trend Kehadiran</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {studentData.attendanceRecords.filter((a: any) => a.status === 'Hadir').length}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">
                    / {studentData.attendanceRecords.length} hari
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 mb-1">Poin Keaktifan</p>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {studentData.quizPoints.length}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 mb-1">Pelanggaran</p>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {studentData.violations.reduce((a: any, b: any) => a + b.points, 0)} poin
                </span>
              </div>
            </div>

            {/* Academic Charts */}
            {subjectAverages.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart with Safety Check */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Spider Chart: Performa per Mapel</h4>
                  {isRadarChartValid ? (
                    <div className="flex justify-center">
                      <svg width={chartSize} height={chartSize} className="overflow-visible">
                        {gridLevels.map(level => (
                          <polygon key={level} points={calculateRadarPoints(subjects.map(() => level), maxScore, centerX, centerY, radius)} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                        ))}
                        {axisEndpoints.map((axis, i) => (<line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />))}
                        <polygon points={studentPolygonPoints} fill="rgba(99, 102, 241, 0.3)" stroke="rgb(99, 102, 241)" strokeWidth="2" />
                        {subjects.map((_, i) => { const angle = i * (2 * Math.PI / subjects.length) - Math.PI / 2; const ratio = studentScores[i] / maxScore; return (<circle key={i} cx={centerX + radius * ratio * Math.cos(angle)} cy={centerY + radius * ratio * Math.sin(angle)} r="5" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="2" />); })}
                        {labelPositions.map((pos, i) => (<text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium fill-slate-600 dark:fill-slate-400">{pos.label.length > 10 ? pos.label.substring(0, 10) + '...' : pos.label}</text>))}
                      </svg>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 min-h-[260px]">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-full p-4 mb-4 text-indigo-500">
                        <BrainCircuitIcon className="w-12 h-12" />
                      </div>
                      <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">Bagan Radar Tidak Tersedia</h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px] leading-relaxed">
                        Bagan Radar membutuhkan minimal 3 mata pelajaran dengan nilai untuk memetakan kekuatan kognitif secara geometri. Saat ini siswa baru memiliki {subjects.length} mata pelajaran.
                      </p>
                    </div>
                  )}
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">Rata-rata: <span className="font-bold text-indigo-600 dark:text-indigo-400">{overallAverage}</span></p>
                </div>
                {/* Bar Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Nilai per Mata Pelajaran</h4>
                  <div className="space-y-3">
                    {subjectAverages.map((item: any, index: any) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-700 dark:text-slate-300">{item.subject}</span><span className={`font-bold ${item.average >= 75 ? 'text-emerald-600' : item.average >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{item.average}</span></div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${item.average >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : item.average >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} style={{ width: `${item.average}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actionable Recommendations Section */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg p-2">
                    <PlayCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">Rekomendasi Aksi Guru & Orang Tua</CardTitle>
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

            {/* A. Cognitive Development */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2">
                    <BookOpenIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">A. Perkembangan Pola Pikir & Akademik (Kognitif)</CardTitle>
                    <CardDescription>Tinjauan gaya belajar dan kemampuan analisis akademis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4" /> Kekuatan
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.cognitive.strengths.map((s: any, i: any) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4" /> Area Pengembangan
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.cognitive.areasForDevelopment.map((a: any, i: any) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl p-4">
                    <h5 className="font-bold text-blue-900 dark:text-blue-300 mb-1 text-sm uppercase tracking-wide">Gaya Belajar Ananda</h5>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{analysis.cognitive.learningStyle}</p>
                  </div>
                  <div className="bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100/50 dark:border-cyan-900/20 rounded-xl p-4">
                    <h5 className="font-bold text-cyan-900 dark:text-cyan-300 mb-1 text-sm uppercase tracking-wide">Kemampuan Berpikir Kritis</h5>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{analysis.cognitive.criticalThinking}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* B. Affective Development */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg p-2">
                    <UsersIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">B. Perkembangan Karakter & Emosi (Afektif)</CardTitle>
                    <CardDescription>Kedisiplinan, kecerdasan emosional, dan sosialitas siswa</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                  <h5 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2.5 text-sm uppercase tracking-wide">Karakter Positif Menonjol</h5>
                  <div className="flex flex-wrap gap-2">
                    {analysis.affective.positiveCharacters.map((c: any, i: any) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50 rounded-full text-xs font-semibold">✓ {c}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100/50 dark:border-pink-900/20 rounded-xl p-4">
                    <h5 className="font-bold text-pink-900 dark:text-pink-300 mb-1.5 text-sm uppercase tracking-wide">Kemampuan Sosial</h5>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{analysis.affective.socialSkills}</p>
                  </div>
                  <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-900/20 rounded-xl p-4">
                    <h5 className="font-bold text-purple-900 dark:text-purple-300 mb-1.5 text-sm uppercase tracking-wide">Kecerdasan Emosional & Kedisiplinan</h5>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {analysis.affective.emotionalIntelligence}. Tingkat kedisiplinan dinilai {analysis.affective.discipline}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* C. Psychomotor Development */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-2">
                    <CheckSquareIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">C. Keterampilan Fisik & Kreativitas (Psikomotorik)</CardTitle>
                    <CardDescription>Kemampuan koordinasi, kekuatan motorik, dan kerajinan tangan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                      🌟 Keterampilan Menonjol
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.psychomotor.outstandingSkills.map((s: any, i: any) => <li key={i}>★ {s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                      ► Area Perlu Stimulasi
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.psychomotor.areasNeedingStimulation.map((a: any, i: any) => <li key={i}>► {a}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-xl p-4">
                  <h5 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1 text-sm uppercase tracking-wide">Koordinasi & Kekuatan Motorik</h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {analysis.psychomotor.motorSkills}. Koordinasi gerakan tubuh terbukti {analysis.psychomotor.coordination}.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* D. Development Plan & Warnings */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/60 dark:border-amber-900/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-2">
                    <CalendarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">D. Rencana Pengembangan Akademik & Karakter</CardTitle>
                    <CardDescription>Target jangka pendek 3 bulan dan jangka menengah 6 bulan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-l-4 border-amber-500 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <ClockIcon className="w-4 h-4 text-amber-500" /> Target 3 Bulan
                    </h5>
                    <ul className="space-y-2 text-sm font-medium">
                      {analysis.recommendations.developmentPlan.threeMonths.map((item: any, index: any) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <span className="text-amber-500 font-bold">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-l-4 border-orange-500 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <CalendarIcon className="w-4 h-4 text-orange-500" /> Target 6 Bulan
                    </h5>
                    <ul className="space-y-2 text-sm font-medium">
                      {analysis.recommendations.developmentPlan.sixMonths.map((item: any, index: any) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <span className="text-orange-500 font-bold">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Warning Signs */}
                <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-xl p-4 border border-rose-200/60 dark:border-rose-900/50">
                  <h5 className="font-bold text-rose-800 dark:text-rose-400 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <AlertCircleIcon className="w-4 h-4 text-rose-600" /> Tanda Peringatan (Perlu Diwaspadai)
                  </h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {analysis.recommendations.warningsSigns.map((sign: any, index: any) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircleIcon className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Footer Note */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/10 dark:to-blue-950/10 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-900/50">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-950/40 rounded-full p-2.5 flex-shrink-0">
                  <AlertCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-1 text-sm uppercase tracking-wide">Catatan Penting Guru & Orang Tua</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Analisis perkembangan siswa ini dirumuskan berdasarkan rekam data akademik serta perilaku harian kelas secara objektif.
                    Setiap anak tumbuh dengan garis waktu dan potensi keunikannya masing-masing. Terus dukung perkembangan minat-bakat Ananda, dan jalin komunikasi intensif dengan pihak sekolah untuk hasil stimulasi terbaik.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRegenerateConfirm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Regenerate Analisis?</h3>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCompRegenerateConfirm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Regenerate Analisis Perbandingan?</h3>
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
