import React from 'react';
import { motion } from 'framer-motion';
import { duration as motionDuration, easing } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';

export const PeriodComparison: React.FC<{
  currentAvg: number;
  previousAvg: number;
  label: string;
}> = ({ currentAvg, previousAvg, label }) => {
  const { shouldReduceMotion } = useReducedMotion();
  const diff = currentAvg - previousAvg;
  const percentChange = previousAvg > 0 ? ((diff / previousAvg) * 100).toFixed(1) : 0;
  const isImproved = diff > 0;
  const isDeclined = diff < 0;

  // Determine color based on trend
  const trendColor = isImproved
    ? 'text-emerald-600 dark:text-emerald-400'
    : isDeclined
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-slate-400 dark:text-slate-500';

  const trendBg = isImproved
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : isDeclined
    ? 'bg-rose-50 dark:bg-rose-950/30'
    : 'bg-slate-50 dark:bg-slate-800';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{label}</p>
      <div className="flex items-end gap-2.5">
        <motion.span
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, ease: easing.easeOut }}
          className="text-2xl font-bold text-slate-800 dark:text-white"
        >
          {currentAvg}
        </motion.span>
        {previousAvg > 0 && (
          <motion.span
            initial={shouldReduceMotion ? { opacity: 0 } : { x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, delay: 0.15 }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${trendColor} ${trendBg}`}
          >
            {isImproved ? '↑' : isDeclined ? '↓' : '→'} {Math.abs(Number(percentChange))}%
          </motion.span>
        )}
      </div>
      {previousAvg > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
          Sebelumnya: <span className="font-semibold">{previousAvg}</span>
        </p>
      )}
    </div>
  );
};