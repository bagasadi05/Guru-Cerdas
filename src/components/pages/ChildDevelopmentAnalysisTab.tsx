import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import {
  BrainCircuitIcon,
  SparklesIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  BookOpenIcon,
  UsersIcon,
  ShieldPlusIcon,
  CheckSquareIcon,
  CalendarIcon,
  DownloadIcon,
  PlayCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  FileTextIcon
} from '../Icons';
import { MarkdownText } from '../ui/MarkdownText';
import { useToast } from '../../hooks/useToast';
import {
  generateComprehensiveChildAnalysis,
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
  saveAnalysisToDb,
  getLatestAnalysisFromDb
} from '../../services/childDevelopmentAnalysis';
import { useMemo } from 'react';
import { getJsPDF, getAutoTable } from '../../utils/dynamicImports';
import { motion, AnimatePresence } from 'framer-motion';
import { addPdfHeader, ensureLogosLoaded } from '../../utils/pdfHeaderUtils';

// Helper functions for Radar Chart
const calculateRadarPoints = (values: number[], max: number, centerX: number, centerY: number, radius: number): string => {
  const n = values.length;
  if (n === 0) return '';
  const angleStep = (2 * Math.PI) / n;
  const points = values.map((value, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const ratio = value / max;
    const x = centerX + radius * ratio * Math.cos(angle);
    const y = centerY + radius * ratio * Math.sin(angle);
    return `${x},${y}`;
  });
  return points.join(' ');
};

const calculateAxisEndpoints = (n: number, centerX: number, centerY: number, radius: number) => {
  if (n === 0) return [];
  const angleStep = (2 * Math.PI) / n;
  return Array.from({ length: n }).map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x1: centerX, y1: centerY, x2: centerX + radius * Math.cos(angle), y2: centerY + radius * Math.sin(angle) };
  });
};

const calculateLabelPositions = (labels: string[], centerX: number, centerY: number, radius: number) => {
  const n = labels.length;
  if (n === 0) return [];
  const angleStep = (2 * Math.PI) / n;
  return labels.map((label, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: centerX + (radius + 15) * Math.cos(angle), y: centerY + (radius + 15) * Math.sin(angle), label };
  });
};

// Loading Progress Steps
const LOADING_STEPS = [
  { id: 1, label: 'Mengumpulkan data akademik', icon: BookOpenIcon },
  { id: 2, label: 'Menganalisis pola perilaku', icon: UsersIcon },
  { id: 3, label: 'Menghitung tren perkembangan', icon: TrendingUpIcon },
  { id: 4, label: 'Membuat rekomendasi AI', icon: BrainCircuitIcon },
  { id: 5, label: 'Menyusun laporan', icon: FileTextIcon },
];

// Loading Progress Component
const LoadingProgress: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Menganalisis Perkembangan...</h3>
          <p className="text-sm text-gray-500">AI sedang memproses data siswa</p>
        </div>
      </div>

      <div className="space-y-4">
        {LOADING_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCompleted
                ? 'bg-green-50 dark:bg-green-900/20'
                : isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/20 animate-pulse'
                  : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
                }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                ? 'bg-green-500 text-white'
                : isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                }`}>
                {isCompleted ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-sm font-medium ${isCompleted || isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                }`}>
                {step.label}
              </span>
              {isCurrent && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / LOADING_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Langkah {currentStep} dari {LOADING_STEPS.length}
        </p>
      </div>
    </div>
  );
};

// Period Comparison Component
const PeriodComparison: React.FC<{
  currentAvg: number;
  previousAvg: number;
  label: string;
}> = ({ currentAvg, previousAvg, label }) => {
  const diff = currentAvg - previousAvg;
  const percentChange = previousAvg > 0 ? ((diff / previousAvg) * 100).toFixed(1) : 0;
  const isImproved = diff > 0;
  const isDeclined = diff < 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{currentAvg}</span>
        {previousAvg > 0 && (
          <span className={`text-sm font-medium flex items-center gap-1 ${isImproved ? 'text-green-500' : isDeclined ? 'text-red-500' : 'text-gray-400'
            }`}>
            {isImproved ? '↑' : isDeclined ? '↓' : '→'} {Math.abs(Number(percentChange))}%
          </span>
        )}
      </div>
      {previousAvg > 0 && (
        <p className="text-xs text-gray-400 mt-1">Sebelumnya: {previousAvg}</p>
      )}
    </div>
  );
};

// Actionable Recommendation Card
const ActionableRecommendation: React.FC<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
  onStartAction?: () => void;
}> = ({ title, description, priority, category, actions, onStartAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isLongDescription = description.length > 150;

  const priorityStyles = {
    high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10',
    medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10',
    low: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10',
  };

  const priorityLabels = {
    high: { text: 'Prioritas Tinggi', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    medium: { text: 'Prioritas Sedang', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    low: { text: 'Prioritas Rendah', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  };

  return (
    <div className={`rounded-xl border-2 shadow-sm ${priorityStyles[priority]} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabels[priority].bg} ${priorityLabels[priority].color}`}>
              {priorityLabels[priority].text}
            </span>
            <span className="text-xs text-gray-400">{category}</span>
          </div>
        </div>

        <h4 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h4>
        <div className={`text-sm text-gray-600 dark:text-gray-400 ${!isDescriptionExpanded && isLongDescription ? 'line-clamp-3' : ''}`}>
          <MarkdownText text={description} />
        </div>
        {isLongDescription && (
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="mt-1 text-xs text-blue-500 hover:underline"
          >
            {isDescriptionExpanded ? 'Tutup' : 'Baca selengkapnya â†’'}
          </button>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
        >
          {isExpanded ? 'Sembunyikan Langkah' : 'Lihat Langkah Aksi'}
          <ArrowRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
          <p className="text-xs font-semibold text-gray-500 mb-2">LANGKAH AKSI:</p>
          <ol className="space-y-2">
            {actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
}

export const ChildDevelopmentAnalysisTab: React.FC<ChildDevelopmentAnalysisTabProps> = ({
  studentData
}) => {
  const [analysis, setAnalysis] = useState<ComprehensiveChildAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const toast = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // Calculate subject averages for analytics
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
      // Not enough records to compare
      const avg = totalRecords > 0
        ? Math.round(records.reduce((a, b) => a + b.score, 0) / totalRecords)
        : 0;
      return { currentAvg: avg, previousAvg: 0 };
    }

    // Split records into two halves (recent vs older)
    const midPoint = Math.floor(totalRecords / 2);
    const recentRecords = records.slice(midPoint);
    const olderRecords = records.slice(0, midPoint);

    const currentAvg = Math.round(recentRecords.reduce((a, b) => a + b.score, 0) / recentRecords.length);
    const previousAvg = Math.round(olderRecords.reduce((a, b) => a + b.score, 0) / olderRecords.length);

    return { currentAvg, previousAvg };
  }, [studentData.academicRecords]);

  const subjects = subjectAverages.map(s => s.subject);
  const studentScores = subjectAverages.map(s => s.average);
  const overallAverage = studentScores.length > 0 ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) : 0;

  // Radar chart validation
  const isRadarChartValid = subjects.length >= 3;

  // Radar chart dimensions
  const chartSize = 260;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const maxScore = 100;
  const gridLevels = [20, 40, 60, 80, 100];
  const axisEndpoints = useMemo(() => calculateAxisEndpoints(subjects.length, centerX, centerY, radius), [subjects.length, centerX, centerY, radius]);
  const labelPositions = useMemo(() => calculateLabelPositions(subjects, centerX, centerY, radius), [subjects, centerX, centerY, radius]);
  const studentPolygonPoints = useMemo(() => calculateRadarPoints(studentScores, maxScore, centerX, centerY, radius), [studentScores, maxScore, centerX, centerY, radius]);

  // Helper to get storage key
  const getStorageKey = useCallback(
    () => `child_analysis_${studentData.student.name}_${studentData.student.class || 'general'}`,
    [studentData.student.name, studentData.student.class]
  );

  // Load from database / local storage on mount
  useEffect(() => {
    const loadAnalysis = async () => {
      // 1. Try DB
      try {
        const dbAnalysis = await getLatestAnalysisFromDb(studentData.student.id);
        if (dbAnalysis) {
          setAnalysis(dbAnalysis);
          return;
        }
      } catch (err) {
        console.error('Gagal memuat analisis dari Supabase, mencoba localStorage:', err);
      }

      // 2. Fallback to LocalStorage
      const savedAnalysis = localStorage.getItem(getStorageKey());
      if (savedAnalysis) {
        try {
          setAnalysis(JSON.parse(savedAnalysis));
        } catch (e) {
          console.error('Failed to parse saved analysis:', e);
          localStorage.removeItem(getStorageKey());
        }
      }
    };

    loadAnalysis();
  }, [studentData.student.id, getStorageKey]);

  // "30-Second Glance" summary calculation
  const glanceSummary = useMemo(() => {
    if (!analysis) return null;

    const cleanText = (text: string) => {
      if (!text) return '';
      return text
        .replace(/^[\s\d•\-*🌟💡🎯🏠🏆👣🙋‍♂️🏫⭐🎒😇🔥👍👌💪🏃‍♂️🛠️★►]+/, '') // Remove prefix emojis, bullets, etc.
        .trim();
    };

    const superpower = analysis.cognitive.strengths && analysis.cognitive.strengths.length > 0
      ? cleanText(analysis.cognitive.strengths[0])
      : 'Menunjukkan motivasi belajar dan respon afektif yang baik di kelas.';

    const challenge = analysis.cognitive.areasForDevelopment && analysis.cognitive.areasForDevelopment.length > 0
      ? cleanText(analysis.cognitive.areasForDevelopment[0])
      : 'Dukung kemandirian dalam memecahkan soal latihan tingkat lanjut.';

    const homeTip = analysis.recommendations.homeSupport && analysis.recommendations.homeSupport.length > 0
      ? cleanText(analysis.recommendations.homeSupport[0])
      : 'Sediakan sesi membaca bersama 15 menit sehari di rumah.';

    return { superpower, challenge, homeTip };
  }, [analysis]);

  // "Status Perkembangan" Badges (HSL colors)
  const developmentBadges = useMemo(() => {
    // Cognitive
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

    // Affective
    const attendanceRecords = studentData.attendanceRecords || [];
    const violations = studentData.violations || [];
    const totalViolations = violations.length;
    const attendanceRate = attendanceRecords.length > 0
      ? (attendanceRecords.filter(a => a.status === 'Hadir').length / attendanceRecords.length) * 100
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

    // Psychomotor
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
    setIsLoading(true);
    setLoadingStep(1);

    // Setup micro-interaction interval timer for loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const result = await generateComprehensiveChildAnalysis(studentData);
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
      toast.error('Gagal membuat analisis. Silakan coba lagi.');
      console.error(error);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setLoadingStep(1);
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
        schoolName: 'MI AL IRSYAD KOTA MADIUN',
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
      const hadir = studentData.attendanceRecords.filter(a => a.status === 'Hadir').length;
      const sakit = studentData.attendanceRecords.filter(a => a.status === 'Sakit').length;
      const izin = studentData.attendanceRecords.filter(a => a.status === 'Izin').length;
      const alpha = studentData.attendanceRecords.filter(a => a.status === 'Alpha').length;
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
      analysis.cognitive.strengths.slice(0, 2).forEach(str => {
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
      analysis.affective.positiveCharacters.slice(0, 2).forEach(char => {
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
      analysis.psychomotor.outstandingSkills.slice(0, 2).forEach(skill => {
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
      analysis.recommendations.homeSupport.slice(0, 3).forEach((support, idx) => {
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
          analysis.recommendations.developmentPlan.threeMonths.slice(0, 3).map(t => `• ${t}`).join('\n\n'),
          analysis.recommendations.developmentPlan.sixMonths.slice(0, 3).map(t => `• ${t}`).join('\n\n')
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
      doc.text('( H. Masturi, S.Pd.I. )', margin + 10, y);
      doc.text(`( ${studentData.student.class ? 'Guru Wali Kelas' : 'Wali Kelas'} )`, pageWidth - 70, y);

      const safeName = analysis.summary.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      doc.save(`Laporan_Perkembangan_Siswa_${safeName}.pdf`);

      toast.success('Laporan PDF Premium berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      toast.error('Gagal membuat ekspor PDF Premium. Silakan coba kembali.');
    }
  };

  // Generate actionable recommendations from analysis
  const actionableRecommendations = useMemo(() => {
    if (!analysis) return [];

    const recs = [];

    // Academic recommendations
    if (analysis.cognitive.areasForDevelopment.length > 0) {
      recs.push({
        title: 'Tingkatkan Kemampuan Akademik',
        description: analysis.cognitive.areasForDevelopment[0],
        priority: 'high' as const,
        category: 'Kognitif',
        actions: [
          'Identifikasi mata pelajaran yang paling membutuhkan perhatian',
          'Buat jadwal belajar tambahan 30 menit/hari',
          'Gunakan metode belajar yang sesuai: ' + analysis.cognitive.learningStyle,
          'Pantau kemajuan setiap minggu',
          'Berikan apresiasi atas setiap peningkatan'
        ]
      });
    }

    // Character development
    if (analysis.affective.characterDevelopmentAreas.length > 0) {
      recs.push({
        title: 'Pengembangan Karakter',
        description: analysis.affective.characterDevelopmentAreas[0],
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
    if (analysis.psychomotor.areasNeedingStimulation.length > 0) {
      recs.push({
        title: 'Stimulasi Psikomotor',
        description: analysis.psychomotor.areasNeedingStimulation[0],
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
    analysis.recommendations.homeSupport.slice(0, 2).forEach((support, idx) => {
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

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <LoadingProgress currentStep={loadingStep} />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
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
                {subjectAverages.map((item, index) => (
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
                    {studentData.attendanceRecords.filter(a => a.status === 'Hadir').length}
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
                  {studentData.violations.reduce((a, b) => a + b.points, 0)} poin
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
                    {subjectAverages.map((item, index) => (
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
                      {analysis.cognitive.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4" /> Area Pengembangan
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.cognitive.areasForDevelopment.map((a, i) => <li key={i}>• {a}</li>)}
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
                    {analysis.affective.positiveCharacters.map((c, i) => (
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
                      {analysis.psychomotor.outstandingSkills.map((s, i) => <li key={i}>★ {s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                    <h5 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                      ► Area Perlu Stimulasi
                    </h5>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {analysis.psychomotor.areasNeedingStimulation.map((a, i) => <li key={i}>► {a}</li>)}
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
                      {analysis.recommendations.developmentPlan.threeMonths.map((item, index) => (
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
                      {analysis.recommendations.developmentPlan.sixMonths.map((item, index) => (
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
                    {analysis.recommendations.warningsSigns.map((sign, index) => (
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
    </div>
  );
};
