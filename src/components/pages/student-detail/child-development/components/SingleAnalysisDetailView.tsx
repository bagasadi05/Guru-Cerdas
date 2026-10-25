import React from 'react';
import { Button } from '../../../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../ui/Card';
import { PlayCircleIcon, AlertCircleIcon } from '../../../../Icons';
import { MotionDiv, MotionSpan, AnimatePresence } from '../../../../ui/MotionComponents';
import { duration as motionDuration } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';
import { GlanceHeroCard } from './GlanceHeroCard';
import { QuickInsightStrip } from './QuickInsightStrip';
import { DevelopmentScoreCard } from './DevelopmentScoreCard';
import { PeriodComparison } from './PeriodComparison';
import { SingleRadarSection } from './SingleRadarSection';
import { SubjectPerformanceChart } from './SubjectPerformanceChart';
import { ActionableRecommendation } from './ActionableRecommendation';
import { DevelopmentTimeline } from './DevelopmentTimeline';
import { WarningBanner } from './WarningBanner';
import type {
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
} from '../../../../../services/childDevelopmentAnalysis';
import type {
  SubjectAverage,
  PeriodStats,
  GlanceSummary,
  DevelopmentBadges,
  ActionableRecommendationItem,
} from '../types/childDevelopmentTypes';

interface SingleAnalysisDetailViewProps {
  analysis: ComprehensiveChildAnalysis;
  studentData: ChildDevelopmentData;
  overallAverage: number;
  attendanceRate: number;
  keaktifan: number;
  generatedAt: string | null;
  glanceSummary: GlanceSummary | null;
  developmentBadges: DevelopmentBadges;
  isDetailsExpanded: boolean;
  onToggleDetails: () => void;
  periodStats: PeriodStats;
  subjects: string[];
  studentScores: number[];
  subjectAverages: SubjectAverage[];
  isRadarChartValid: boolean;
  actionableRecommendations: ActionableRecommendationItem[];
  onExportReport: () => void;
  onGenerateAnalysis: () => void;
}

const getStatusColor = (colorClass: string) => {
  if (colorClass.includes('emerald')) return 'text-emerald-650 dark:text-emerald-400';
  if (colorClass.includes('blue')) return 'text-blue-600 dark:text-blue-400';
  if (colorClass.includes('rose')) return 'text-rose-600 dark:text-rose-400';
  return 'text-amber-600 dark:text-amber-400';
};

export const SingleAnalysisDetailView: React.FC<SingleAnalysisDetailViewProps> = ({
  analysis,
  studentData,
  overallAverage,
  attendanceRate,
  keaktifan,
  generatedAt,
  glanceSummary,
  developmentBadges,
  isDetailsExpanded,
  onToggleDetails,
  periodStats,
  subjects,
  studentScores,
  subjectAverages,
  isRadarChartValid,
  actionableRecommendations,
  onExportReport,
  onGenerateAnalysis,
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const [renderedAt] = React.useState(() => Date.now());

  const isStale = generatedAt
    ? renderedAt - new Date(generatedAt).getTime() > 30 * 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      {/* Header Laporan / GlanceHeroCard */}
      <GlanceHeroCard
        studentName={analysis.summary.name}
        studentAge={analysis.summary.age}
        studentClass={analysis.summary.class}
        overallScore={overallAverage}
        generatedBy={analysis.generatedBy}
        generatedAt={generatedAt}
        isStale={isStale}
        overallAssessment={analysis.summary.overallAssessment}
        onExportPdf={onExportReport}
        onRefresh={onGenerateAnalysis}
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
          onClick={onToggleDetails}
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
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: motionDuration.base, ease: 'easeInOut' }
            }
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
                <SingleRadarSection
                  title="Peta Kekuatan Akademik"
                  subjects={subjects}
                  studentScores={studentScores}
                  overallAverage={overallAverage}
                  isRadarChartValid={isRadarChartValid}
                />
                <SubjectPerformanceChart subjects={subjectAverages} kkmLine={75} />
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
                    <CardTitle className="text-slate-800 dark:text-white">
                      Langkah yang Bisa Dilakukan
                    </CardTitle>
                    <CardDescription>
                      Langkah-langkah konkret yang dirancang khusus untuk memandu Ananda
                    </CardDescription>
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
            <WarningBanner warnings={analysis?.recommendations?.warningsSigns || []} />

            {/* Footer Note */}
            <div className="bg-gradient-to-r from-brand-100 to-brand-200 dark:from-brand-950/10 dark:to-blue-950/10 rounded-2xl p-6 border border-brand-200/50 dark:border-brand-900/50">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-950/40 rounded-full p-2.5 flex-shrink-0">
                  <AlertCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-brand-300 mb-1 text-sm uppercase tracking-wide">
                    Catatan Penting Guru & Orang Tua
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Analisis perkembangan siswa ini dirumuskan berdasarkan rekam data akademik serta
                    perilaku harian kelas secara objektif. Setiap anak tumbuh dengan garis waktu dan
                    potensi keunikannya masing-masing. Terus dukung perkembangan minat-bakat Ananda,
                    dan jalin komunikasi intensif dengan pihak sekolah untuk hasil stimulasi terbaik.
                  </p>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};
