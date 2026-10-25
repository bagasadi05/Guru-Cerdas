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
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-2xl border border-brand-200 dark:border-brand-800">
        <div className="bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-full p-6 mb-6">
          <BrainCircuitIcon className="w-16 h-16 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Laporan Perkembangan Anak
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 text-sm">
          Dapatkan rangkuman tumbuh kembang akademik, sikap harian, dan keterampilan fisik siswa
          secara menyeluruh.
        </p>
        <Button
          onClick={onGenerateAnalysis}
          size="lg"
          className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 font-bold px-8 shadow-md"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          ✨ Buat Laporan Perkembangan
        </Button>
      </div>
    </>
  );
};
