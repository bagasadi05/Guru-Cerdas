import React from 'react';
import { motion } from 'framer-motion';
import { duration as motionDuration, easing } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';

// ── Prop Types ──────────────────────────────────────────────────────────────
interface SubjectPerformanceChartProps {
  /** Array of subject names and their average scores (0-100) */
  subjects: Array<{ subject: string; average: number }>;
  /** KKM (Kriteria Ketuntasan Minimal) threshold, default 75 */
  kkmLine?: number;
  className?: string;
}

// ── Gradient Classes by Score Range ─────────────────────────────────────────
const getBarGradient = (score: number): string => {
  if (score >= 85) return 'from-emerald-400 to-emerald-600';
  if (score >= 75) return 'from-blue-400 to-blue-600';
  if (score >= 60) return 'from-amber-400 to-amber-500';
  return 'from-rose-400 to-rose-500';
};

/** Dark-mode variant */
const getBarGradientDark = (score: number): string => {
  if (score >= 85) return 'dark:from-emerald-500 dark:to-emerald-700';
  if (score >= 75) return 'dark:from-blue-500 dark:to-blue-700';
  if (score >= 60) return 'dark:from-amber-500 dark:to-amber-600';
  return 'dark:from-rose-500 dark:to-rose-700';
};

// ── Main Component ──────────────────────────────────────────────────────────
export const SubjectPerformanceChart: React.FC<SubjectPerformanceChartProps> = ({
  subjects,
  kkmLine = 75,
  className = '',
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  // ── Empty state ─────────────────────────────────────────────────────────
  if (!subjects || subjects.length === 0) {
    return (
      <div
        className={`
          rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
          border border-slate-200/60 dark:border-slate-700/60 p-6
          ${className}
        `}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
          📊 Nilai per Mata Pelajaran
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <span className="text-3xl mb-2">📭</span>
          <p className="text-sm">Belum ada data nilai mata pelajaran.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
        border border-slate-200/60 dark:border-slate-700/60 p-5
        ${className}
      `}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
        📊 Nilai per Mata Pelajaran
      </h3>

      {/* ── Bar chart area (relative for KKM line) ─────────────────────── */}
      <div className="relative">
        {/* KKM vertical reference line */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-rose-300 dark:border-rose-600 z-10 pointer-events-none"
          style={{ left: `calc(${kkmLine}% + 0px)` }}
        >
          <span className="absolute -top-5 -translate-x-1/2 text-xxs font-medium text-rose-400 dark:text-rose-500 whitespace-nowrap">
            KKM
          </span>
        </div>

        {/* ── Bar rows ───────────────────────────────────────────────── */}
        <div className="space-y-2.5 pt-2">
          {subjects.map(({ subject, average }, idx) => {
            const clampedScore = Math.min(Math.max(average, 0), 100);
            const barWidth = `${clampedScore}%`;
            const showScoreInside = clampedScore > 50;
            const truncatedName =
              subject.length > 15 ? subject.slice(0, 14) + '…' : subject;

            return (
              <div key={`${subject}-${idx}`} className="flex items-center gap-3">
                {/* Subject name */}
                <span
                  className="w-28 md:w-36 flex-shrink-0 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300 truncate text-right"
                  title={subject}
                >
                  {truncatedName}
                </span>

                {/* Bar container */}
                <div className="relative flex-1 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {/* Animated fill */}
                  <motion.div
                    className={`
                      h-full rounded-lg bg-gradient-to-r
                      ${getBarGradient(clampedScore)}
                      ${getBarGradientDark(clampedScore)}
                    `}
                    initial={shouldReduceMotion ? { width: barWidth } : { width: 0 }}
                    animate={{ width: barWidth }}
                    transition={shouldReduceMotion ? { duration: 0 } : {
                      duration: motionDuration.chart,
                      ease: easing.easeInOutQuad,
                      delay: 0.1 * idx,
                    }}
                  />

                  {/* Score label — inside or outside the bar */}
                  {showScoreInside ? (
                    <motion.span
                      className="absolute inset-y-0 flex items-center text-xs font-bold text-white drop-shadow-sm"
                      style={{ right: `calc(100% - ${barWidth} + 8px)` }}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, delay: 0.1 * idx + 0.5 }}
                    >
                      {average}
                    </motion.span>
                  ) : (
                    <motion.span
                      className="absolute inset-y-0 flex items-center text-xs font-bold text-slate-600 dark:text-slate-300"
                      style={{ left: `calc(${barWidth} + 6px)` }}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, delay: 0.1 * idx + 0.5 }}
                    >
                      {average}
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
