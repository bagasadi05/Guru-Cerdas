import React, { useState, useEffect, useRef } from 'react';
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
import { useToast } from '../../hooks/useToast';
import {
  generateComprehensiveChildAnalysis,
  ComprehensiveChildAnalysis,
  ChildDevelopmentData
} from '../../services/childDevelopmentAnalysis';
import { useMemo } from 'react';

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
    <div className={`rounded-xl border-2 ${priorityStyles[priority]} overflow-hidden`}>
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
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>

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

  // Radar chart dimensions
  const chartSize = 260;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const maxScore = 100;
  const gridLevels = [20, 40, 60, 80, 100];
  const axisEndpoints = calculateAxisEndpoints(subjects.length, centerX, centerY, radius);
  const labelPositions = calculateLabelPositions(subjects, centerX, centerY, radius);
  const studentPolygonPoints = calculateRadarPoints(studentScores, maxScore, centerX, centerY, radius);

  // Simulate loading progress
  useEffect(() => {
    if (isLoading && loadingStep <= LOADING_STEPS.length) {
      const timer = setTimeout(() => {
        setLoadingStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingStep]);

  const handleGenerateAnalysis = async () => {
    setIsLoading(true);
    setLoadingStep(1);
    try {
      const result = await generateComprehensiveChildAnalysis(studentData);
      setAnalysis(result);
      toast.success('Analisis perkembangan anak berhasil dibuat!');
    } catch (error) {
      toast.error('Gagal membuat analisis. Silakan coba lagi.');
      console.error(error);
    } finally {
      setIsLoading(false);
      setLoadingStep(1);
    }
  };

  // Export report as text/html
  const handleExportReport = () => {
    if (!analysis) return;

    const reportContent = `
LAPORAN ANALISIS PERKEMBANGAN ANAK
=====================================
Nama: ${analysis.summary.name}
Usia: ${analysis.summary.age} Tahun
Kelas: ${analysis.summary.class}
Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

=====================================
RINGKASAN PERKEMBANGAN
=====================================
${analysis.summary.overallAssessment}

=====================================
A. ANALISIS PERKEMBANGAN KOGNITIF
=====================================
Kekuatan:
${analysis.cognitive.strengths.map(s => `• ${s}`).join('\n')}

Area Pengembangan:
${analysis.cognitive.areasForDevelopment.map(a => `• ${a}`).join('\n')}

Gaya Belajar: ${analysis.cognitive.learningStyle}
Kemampuan Berpikir Kritis: ${analysis.cognitive.criticalThinking}

=====================================
B. ANALISIS PERKEMBANGAN AFEKTIF
=====================================
Karakter Positif:
${analysis.affective.positiveCharacters.map(c => `• ${c}`).join('\n')}

Kemampuan Sosial: ${analysis.affective.socialSkills}
Kecerdasan Emosional: ${analysis.affective.emotionalIntelligence}
Kedisiplinan: ${analysis.affective.discipline}

=====================================
C. ANALISIS PERKEMBANGAN PSIKOMOTOR
=====================================
Kemampuan Motorik: ${analysis.psychomotor.motorSkills}
Koordinasi: ${analysis.psychomotor.coordination}

Keterampilan Menonjol:
${analysis.psychomotor.outstandingSkills.map(s => `• ${s}`).join('\n')}

=====================================
D. REKOMENDASI UNTUK ORANG TUA
=====================================
Dukungan di Rumah:
${analysis.recommendations.homeSupport.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Target 3 Bulan:
${analysis.recommendations.developmentPlan.threeMonths.map(t => `• ${t}`).join('\n')}

Target 6 Bulan:
${analysis.recommendations.developmentPlan.sixMonths.map(t => `• ${t}`).join('\n')}

Tanda Peringatan:
${analysis.recommendations.warningsSigns.map(w => `⚠️ ${w}`).join('\n')}

=====================================
Catatan: Analisis ini dibuat dengan bantuan AI berdasarkan data akademik dan perilaku.
Konsultasikan dengan profesional untuk evaluasi lebih lanjut.
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Perkembangan_${analysis.summary.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Laporan berhasil diunduh!');
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
            {/* Radar Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Spider Chart: Performa per Mapel</h4>
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
      {/* Header with Export */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-3">
                <BrainCircuitIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Ringkasan Perkembangan Anak</CardTitle>
                <CardDescription className="mt-1">
                  {analysis.summary.name} • {analysis.summary.age} Tahun • Kelas {analysis.summary.class}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportReport}
                variant="outline"
                size="sm"
                className="bg-white/50 dark:bg-black/20"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Laporan
              </Button>
              <Button
                onClick={handleGenerateAnalysis}
                variant="ghost"
                size="sm"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
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
            <span className="text-sm text-gray-400">
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

      {/* Actionable Recommendations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg p-2">
              <PlayCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Rekomendasi Aksi</CardTitle>
              <CardDescription>Langkah-langkah konkret yang bisa dilakukan segera</CardDescription>
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

      {/* Rest of the analysis sections... (keeping existing structure but abbreviated) */}
      {/* A. Cognitive Development */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2">
              <BookOpenIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>A. Analisis Perkembangan Kognitif</CardTitle>
              <CardDescription>Kemampuan akademik dan berpikir</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" /> Kekuatan
              </h5>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analysis.cognitive.strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4" /> Area Pengembangan
              </h5>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analysis.cognitive.areasForDevelopment.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Gaya Belajar</h5>
            <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.cognitive.learningStyle}</p>
          </div>
        </CardContent>
      </Card>

      {/* B. Affective Development - Abbreviated */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg p-2">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>B. Analisis Perkembangan Afektif</CardTitle>
              <CardDescription>Karakter, emosi, dan kemampuan sosial</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h5 className="font-semibold text-green-700 dark:text-green-400 mb-2">Karakter Positif</h5>
            <div className="flex flex-wrap gap-2">
              {analysis.affective.positiveCharacters.map((c, i) => (
                <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">✓ {c}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-pink-900 dark:text-pink-300 mb-2">Kemampuan Sosial</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.affective.socialSkills}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Kedisiplinan</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.affective.discipline}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C. Psychomotor - Abbreviated */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-2">
              <CheckSquareIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>C. Analisis Perkembangan Psikomotor</CardTitle>
              <CardDescription>Kemampuan motorik dan keterampilan fisik</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Keterampilan Menonjol</h5>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analysis.psychomotor.outstandingSkills.map((s, i) => <li key={i}>★ {s}</li>)}
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">Perlu Stimulasi</h5>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analysis.psychomotor.areasNeedingStimulation.map((a, i) => <li key={i}>► {a}</li>)}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* D. Development Plan */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-2">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>D. Rencana Pengembangan</CardTitle>
              <CardDescription>Target jangka pendek dan menengah</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-amber-500">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" /> Target 3 Bulan
              </h5>
              <ul className="space-y-2 text-sm">
                {analysis.recommendations.developmentPlan.threeMonths.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-amber-500">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-orange-500">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Target 6 Bulan
              </h5>
              <ul className="space-y-2 text-sm">
                {analysis.recommendations.developmentPlan.sixMonths.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-orange-500">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Warning Signs */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <h5 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4" /> Tanda Peringatan
            </h5>
            <ul className="space-y-2">
              {analysis.recommendations.warningsSigns.map((sign, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2 flex-shrink-0">
            <AlertCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Catatan Penting</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Analisis ini dibuat berdasarkan data akademik dan perilaku yang tersedia.
              Setiap anak berkembang dengan kecepatan yang berbeda. Jika Anda memiliki kekhawatiran khusus
              tentang perkembangan anak, konsultasikan dengan guru, psikolog anak, atau ahli perkembangan anak.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
