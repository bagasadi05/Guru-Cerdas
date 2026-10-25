import React, { useMemo } from 'react';
import { BrainCircuitIcon } from '../../../../Icons';
import { RadarChart, RadarDataset } from './RadarChart';

interface SingleRadarSectionProps {
  title?: string;
  subjects: string[];
  studentScores: number[];
  overallAverage: number;
  isRadarChartValid: boolean;
}

export const SingleRadarSection: React.FC<SingleRadarSectionProps> = ({
  title = 'Spider Chart: Performa per Mapel',
  subjects,
  studentScores,
  overallAverage,
  isRadarChartValid,
}) => {
  const datasets = useMemo<RadarDataset[]>(
    () => [
      {
        values: studentScores,
        fillColor: 'rgba(13, 126, 158, 0.3)',
        strokeColor: 'rgb(99, 102, 241)',
        strokeWidth: 2,
        pointStrokeColor: 'rgb(99, 102, 241)',
      },
    ],
    [studentScores]
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">{title}</h4>
      {isRadarChartValid ? (
        <div className="flex justify-center">
          <RadarChart
            labels={subjects}
            datasets={datasets}
            chartSize={260}
            maxScore={100}
            ariaLabel="Spider chart performa siswa per mata pelajaran"
            titleText="Bagan Radar: Performa per Mata Pelajaran"
            truncateLabels={true}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 min-h-[260px]">
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-full p-4 mb-4 text-brand-700">
            <BrainCircuitIcon className="w-12 h-12" />
          </div>
          <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">
            Bagan Radar Tidak Tersedia
          </h5>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px] leading-relaxed">
            Bagan Radar membutuhkan minimal 3 mata pelajaran dengan nilai untuk memetakan kekuatan
            kognitif secara geometri. Saat ini siswa baru memiliki {subjects.length} mata pelajaran.
          </p>
        </div>
      )}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
        Rata-rata: <span className="font-bold text-brand-600 dark:text-brand-400">{overallAverage}</span>
      </p>
    </div>
  );
};
