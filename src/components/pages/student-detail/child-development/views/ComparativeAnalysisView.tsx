import React from 'react';
import { Button } from '../../../../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../../ui/Card';
import {
  BrainCircuitIcon,
  SparklesIcon,
  DownloadIcon,
  RefreshCwIcon
} from '../../../../Icons';
import {
  ComparativeChildAnalysis,
  ChildDevelopmentData,
} from '../../../../../services/childDevelopmentAnalysis';
import { MotionDiv } from '../../../../ui/MotionComponents';
import { duration as motionDuration } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';
import { ActionableRecommendation } from '../components/ActionableRecommendation';
import { ScoreRing } from '../components/ScoreRing';
import { stripMarkdown } from '../../../../../utils/textSanitizer';
import type { Database } from '../../../../../services/database.types';
import {
  calculateRadarPoints,
  calculateAxisEndpoints,
  calculateLabelPositions,
} from '../utils/radarChartUtils';

type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

export interface AttendanceStats {
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  percentage: number;
}

export interface ViolationStats {
  count: number;
  points: number;
}

export interface ComparativeAnalysisViewProps {
  studentData: ChildDevelopmentData;
  activeAcademicYear: { id: string; name: string } | null;
  avgScoreSem1: number;
  avgScoreSem2: number;
  avgScoreDiff: number;
  sem1Academic: AcademicRecordRow[];
  sem2Academic: AcademicRecordRow[];
  sem1Quizzes: QuizPointRow[];
  sem2Quizzes: QuizPointRow[];
  compAttendanceStats: {
    sem1: AttendanceStats;
    sem2: AttendanceStats;
  };
  compViolationStats: {
    sem1: ViolationStats;
    sem2: ViolationStats;
  };
  compSubjectAverages: Array<{ subject: string; sem1: number | null; sem2: number | null }>;
  compHolisticDimensions: {
    labels: string[];
    sem1: number[];
    sem2: number[];
  };
  comparativeAnalysis: ComparativeChildAnalysis | null;
  compGeneratedAt: string | null;
  onGenerateComparativeAnalysis: () => void;
  onExportComparativeReport: () => void;
}

export const ComparativeAnalysisView: React.FC<ComparativeAnalysisViewProps> = ({
  studentData,
  activeAcademicYear,
  avgScoreSem1,
  avgScoreSem2,
  avgScoreDiff,
  sem1Academic,
  sem2Academic,
  sem1Quizzes,
  sem2Quizzes,
  compAttendanceStats,
  compViolationStats,
  compSubjectAverages,
  compHolisticDimensions,
  comparativeAnalysis,
  compGeneratedAt,
  onGenerateComparativeAnalysis,
  onExportComparativeReport,
}) => {
  const [renderedAt] = React.useState(() => Date.now());
  const shouldReduceMotion = useReducedMotion();

  const chartSize = 260;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const maxScore = 100;
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <>
      {/* Overall averages cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Semester 1 Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-xl -mr-6 -mt-6" />
          <ScoreRing
            score={avgScoreSem1}
            size={72}
            strokeWidth={8}
          />
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rata-rata Semester 1</p>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">Semester Ganjil</h4>
            <span className="mt-2 inline-flex items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400 px-2 py-0.5 text-xxs font-bold">
              {sem1Academic.length} Rekor Nilai
            </span>
          </div>
        </div>

        {/* Semester 2 Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6" />
          <ScoreRing
            score={avgScoreSem2}
            size={72}
            strokeWidth={8}
          />
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rata-rata Semester 2</p>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">Semester Genap</h4>
            <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 text-xxs font-bold">
              {sem2Academic.length} Rekor Nilai
            </span>
          </div>
        </div>

        {/* Growth Card */}
        <div className={`rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between ${
          avgScoreDiff >= 0 
            ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-teal-500/20' 
            : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-6 -mt-6" />
          <div>
            <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Pertumbuhan Akademik</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold">
                {avgScoreDiff >= 0 ? `+${avgScoreDiff}` : avgScoreDiff}
              </span>
              <span className="text-sm font-medium">poin</span>
            </div>
          </div>
          <p className="text-xs font-semibold mt-3 bg-white/20 rounded-lg px-2.5 py-1 inline-block border border-white/10">
            {avgScoreDiff >= 0 ? '📈 Kenaikan Performa' : '📉 Butuh Bimbingan'}
          </p>
        </div>
      </div>

      {/* Side-by-Side Charts: Double Radar & Subject Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Double Radar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Bagan Radar Ganda: Dimensi Holistik</h4>
              <div className="flex gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-brand-600 inline-block" />
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
                fill="rgba(13, 126, 158, 0.15)" 
                stroke="rgba(13, 126, 158, 0.85)" 
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
                      className="text-xxs font-bold fill-slate-600 dark:fill-slate-400 hover:fill-brand-600 dark:hover:fill-brand-400 transition-colors"
                    >
                      {pos.label}
                    </text>
                    <title>{`${pos.label}\nSemester 1: ${val1}\nSemester 2: ${val2}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legenda & Mini Stats */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="flex flex-col items-center p-2 rounded-xl bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100/50 dark:border-brand-900/20">
              <span className="text-xxs text-slate-500 font-medium">Rata-rata Dimensi S1</span>
              <span className="text-base font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                {Math.round(compHolisticDimensions.sem1.reduce((a,b)=>a+b,0)/5)}
              </span>
            </div>

            <div className="flex flex-col items-center p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20">
              <span className="text-xxs text-slate-500 font-medium">Rata-rata Dimensi S2</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {Math.round(compHolisticDimensions.sem2.reduce((a,b)=>a+b,0)/5)}
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Subject Comparison Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Bagan Perbandingan Nilai Mapel</h4>
              <div className="flex gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-brand-600 inline-block" />
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
                    <div className="flex gap-3 text-xxs">
                      <span className="text-brand-600 dark:text-brand-400 font-bold">Sem 1: {item.sem1 ?? '-'}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sem 2: {item.sem2 ?? '-'}</span>
                    </div>
                  </div>
                  <div className="space-y-1 bg-slate-50/50 dark:bg-slate-800/20 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
                    {/* Semester 1 Bar */}
                    {item.sem1 !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xxs text-slate-400 font-semibold w-7">Sem 1</span>
                        <div className="flex-1 h-2 bg-slate-200/50 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-700 transition-all duration-500" 
                            style={{ width: `${item.sem1}%` }} 
                          />
                        </div>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-semibold w-5 text-right">{item.sem1}</span>
                      </div>
                    )}
                    {/* Semester 2 Bar */}
                    {item.sem2 !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xxs text-slate-400 font-semibold w-7">Sem 2</span>
                        <div className="flex-1 h-2 bg-slate-200/50 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" 
                            style={{ width: `${item.sem2}%` }} 
                          />
                        </div>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-semibold w-5 text-right">{item.sem2}</span>
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
        <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📅</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">Persentase Kehadiran</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 1</p>
              <p className="text-2xl font-bold mt-1 text-brand-600 dark:text-brand-400">
                {compAttendanceStats.sem1.percentage}%
              </p>
              <p className="text-xxs text-slate-500 mt-2 font-medium">
                Hadir: {compAttendanceStats.sem1.hadir} hari
              </p>
              <p className="text-xxs text-slate-400 mt-1">
                S/I/A: {compAttendanceStats.sem1.sakit}/{compAttendanceStats.sem1.izin}/{compAttendanceStats.sem1.alpha}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {compAttendanceStats.sem2.percentage}%
              </p>
              <p className="text-xxs text-slate-500 mt-2 font-medium">
                Hadir: {compAttendanceStats.sem2.hadir} hari
              </p>
              <p className="text-xxs text-slate-400 mt-1">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
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
              <p className="text-xxs text-slate-500 mt-2 font-medium">
                {compViolationStats.sem1.count} Pelanggaran
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
              <p className={`text-2xl font-bold mt-1 ${compViolationStats.sem2.points > compViolationStats.sem1.points ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {compViolationStats.sem2.points}
              </p>
              <p className="text-xxs text-slate-500 mt-2 font-medium">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏆</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">Poin Keaktifan Kuis</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 1</p>
              <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-300">
                {sem1Quizzes.reduce((sum, q) => sum + (q.points || 0), 0)}
              </p>
              <p className="text-xxs text-slate-500 mt-2 font-medium">
                {sem1Quizzes.length} Aktivitas
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold">SEMESTER 2</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {sem2Quizzes.reduce((sum, q) => sum + (q.points || 0), 0)}
              </p>
              <p className="text-xxs text-slate-500 mt-2 font-medium">
                {sem2Quizzes.length} Aktivitas
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-center font-semibold text-slate-500">
            {sem2Quizzes.reduce((sum, q) => sum + (q.points || 0), 0) >= sem1Quizzes.reduce((sum, q) => sum + (q.points || 0), 0) ? (
              <span className="text-emerald-600 dark:text-emerald-400">⚡ Partisipasi kuis meningkat / konsisten</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-500">⚠️ Partisipasi kuis perlu didorong lagi</span>
            )}
          </div>
        </div>
      </div>

      {/* Comparative AI Analysis CTA / Dashboard */}
      {!comparativeAnalysis ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-2xl border border-brand-200 dark:border-brand-800">
          <div className="bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 rounded-full p-6 mb-6">
            <BrainCircuitIcon className="w-16 h-16 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Perbandingan Perkembangan Anak (AI)
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 text-sm font-medium leading-relaxed">
            AI akan membandingkan data perkembangan Kognitif, Afektif, dan Psikomotorik ananda dari Semester 1 ke Semester 2, memberikan ulasan pertumbuhan yang mendalam dan bersahabat bagi orang tua.
          </p>
          <Button
            onClick={onGenerateComparativeAnalysis}
            size="lg"
            disabled={sem1Academic.length === 0 || sem2Academic.length === 0}
            className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 shadow-md transition-all duration-300"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Jalankan Analisis Perbandingan AI
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Laporan Komparasi */}
          <Card className="bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/20 dark:to-blue-900/20 border-brand-200 dark:border-brand-800">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-full p-3">
                    <BrainCircuitIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl font-bold">Ulasan Komparasi AI Terintegrasi</CardTitle>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        comparativeAnalysis.generatedBy === 'Offline Fallback'
                          ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          : 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-900/50'
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
                      {compGeneratedAt && (renderedAt - new Date(compGeneratedAt).getTime()) > 30 * 24 * 60 * 60 * 1000 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xxs font-semibold">Stale</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onExportComparativeReport}
                    variant="outline"
                    size="sm"
                    className="bg-white/50 dark:bg-black/20 font-bold hover:shadow-sm"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Export PDF Premium
                  </Button>
                  <Button
                    onClick={onGenerateComparativeAnalysis}
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
            <MotionDiv
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base }}
              className="bg-gradient-to-br from-emerald-500/10 to-slate-500/5 dark:from-emerald-500/5 dark:to-slate-500/0 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6" />
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-3 font-semibold text-lg">
                🌱
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase mb-1">Ulasan Pertumbuhan Menyeluruh Ananda</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {stripMarkdown(comparativeAnalysis.summary.overallComparison)}
              </p>
            </MotionDiv>
          )}

          {/* Side-by-side Analysis */}
          <div className="grid grid-cols-1 gap-8">
            {/* Kognitif Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-2xl">🧠</span>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Kognitif (Belajar & Akademik)</h4>
                  <p className="text-xs text-slate-400">Ulasan perbandingan proses belajar dan pencapaian akademik ananda</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-50/30 dark:bg-brand-950/10 p-5 rounded-xl border border-brand-100/50 dark:border-brand-900/20">
                  <h5 className="font-bold text-brand-700 dark:text-brand-400 text-sm uppercase mb-3 flex items-center gap-2">
                    <span>📘</span> Semester 1
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 mb-1">Kekuatan Belajar</p>
                      <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                        {comparativeAnalysis.cognitive.semester1Strengths.map((str, idx) => (
                          <li key={idx}>{stripMarkdown(str)}</li>
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
                        {comparativeAnalysis.cognitive.semester2Strengths.map((str, idx) => (
                          <li key={idx}>{stripMarkdown(str)}</li>
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
                  {stripMarkdown(comparativeAnalysis.cognitive.comparisonNarrative)}
                </p>
              </div>
            </div>

            {/* Afektif Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-2xl">❤️</span>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Afektif (Karakter & Sosial)</h4>
                  <p className="text-xs text-slate-400">Ulasan perbandingan karakter mulia, emosional, dan sosial ananda</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-50/30 dark:bg-brand-950/10 p-5 rounded-xl border border-brand-100/50 dark:border-brand-900/20">
                  <h5 className="font-bold text-brand-700 dark:text-brand-400 text-sm uppercase mb-3 flex items-center gap-2">
                    <span>😇</span> Semester 1
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 mb-1">Karakter Unggul</p>
                      <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                        {comparativeAnalysis.affective.semester1PositiveCharacters.map((char, idx) => (
                          <li key={idx}>{stripMarkdown(char)}</li>
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
                        {comparativeAnalysis.affective.semester2PositiveCharacters.map((char, idx) => (
                          <li key={idx}>{stripMarkdown(char)}</li>
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
                  {stripMarkdown(comparativeAnalysis.affective.comparisonNarrative)}
                </p>
              </div>
            </div>

            {/* Psikomotor Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-2xl">🏃‍♂️</span>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Perkembangan Psikomotorik (Fisik & Kreativitas)</h4>
                  <p className="text-xs text-slate-400">Ulasan perbandingan motorik halus/kasar, olahraga, dan kreativitas ananda</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-50/30 dark:bg-brand-950/10 p-5 rounded-xl border border-brand-100/50 dark:border-brand-900/20">
                  <h5 className="font-bold text-brand-700 dark:text-brand-400 text-sm uppercase mb-3 flex items-center gap-2">
                    <span>🎨</span> Semester 1
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 mb-1">Keterampilan Kuat</p>
                      <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                        {comparativeAnalysis.psychomotor.semester1Skills.map((sk, idx) => (
                          <li key={idx}>{stripMarkdown(sk)}</li>
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
                        {comparativeAnalysis.psychomotor.semester2Skills.map((sk, idx) => (
                          <li key={idx}>{stripMarkdown(sk)}</li>
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
                  {stripMarkdown(comparativeAnalysis.psychomotor.comparisonNarrative)}
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
    </>
  );
};
