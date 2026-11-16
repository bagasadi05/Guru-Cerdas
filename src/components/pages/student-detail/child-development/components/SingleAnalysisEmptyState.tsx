import React from 'react';
import { Button } from '../../../../ui/Button';
import { BrainCircuitIcon, SparklesIcon } from '../../../../Icons';
import { PeriodComparison } from './PeriodComparison';
import { SingleRadarSection } from './SingleRadarSection';
import { SubjectPerformanceChart } from './SubjectPerformanceChart';
import type { SubjectAverage, PeriodStats } from '../types/childDevelopmentTypes';

interface SingleAnalysisEmptyStateProps {
  subjectAverages: SubjectAverage[];
  periodStats: PeriodStats;
  studentScores: number[];
  subjects: string[];
  overallAverage: number;
  isRadarChartValid: boolean;
  onGenerateAnalysis: () => void;
}

export const SingleAnalysisEmptyState: React.FC<SingleAnalysisEmptyStateProps> = ({
  subjectAverages,
  periodStats,
  studentScores,
  subjects,
  overallAverage,
  isRadarChartValid,
  onGenerateAnalysis,
}) => {
  return (
    <>
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
          <SingleRadarSection
            title="Spider Chart: Performa per Mapel"
            subjects={subjects}
            studentScores={studentScores}
            overallAverage={overallAverage}
            isRadarChartValid={isRadarChartValid}
          />
          <SubjectPerformanceChart subjects={subjectAverages} kkmLine={75} />
        </div>
      )}

      {/* AI Analysis CTA */}
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-brand-50 to-brand-100/80 dark:from-brand-950/30 dark:to-slate-900 rounded-2xl border border-brand-200 dark:border-brand-800/60">
        <div className="bg-white/90 dark:bg-brand-900/30 border border-brand-200/60 dark:border-brand-700/40 rounded-full p-5 mb-5 shadow-sm">
          <BrainCircuitIcon className="w-14 h-14 text-brand-600 dark:text-brand-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center">
          Laporan Perkembangan Anak
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-8 text-sm leading-relaxed">
          Dapatkan rangkuman tumbuh kembang akademik, sikap harian, dan keterampilan siswa secara menyeluruh.
        </p>
        <Button
          onClick={onGenerateAnalysis}
          size="lg"
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 shadow-md"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          Buat Laporan Perkembangan
        </Button>
      </div>
    </>
  );
};
