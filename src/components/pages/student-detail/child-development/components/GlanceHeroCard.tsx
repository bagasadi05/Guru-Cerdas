import React from 'react';
import { motion } from 'framer-motion';
import { duration as motionDuration, easing } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';
import { ScoreRing } from './ScoreRing';
import { DownloadIcon, RefreshCwIcon, SparklesIcon, WifiOffIcon, AlertTriangleIcon } from '../../../../Icons';
import { Button } from '../../../../ui/Button';

/**
 * GlanceHeroCard — Top-level student summary card.
 *
 * Shows a large score ring, student metadata, AI provenance badge,
 * an optional 2-line narrative assessment, and action buttons.
 * Designed to sit at the very top of the child-development report.
 */

interface GlanceHeroCardProps {
  studentName: string;
  studentAge?: number;
  studentClass?: string;
  /** Overall development score 0-100 */
  overallScore: number;
  /** Source of the current analysis */
  generatedBy?: 'AI' | 'Offline Fallback';
  /** ISO date string of last generation */
  generatedAt?: string | null;
  /** True when the report is older than ~30 days */
  isStale?: boolean;
  /** 1-2 sentence AI-generated summary */
  overallAssessment?: string;
  onExportPdf: () => void;
  onRefresh: () => void;
}

/** Formats an ISO date string into a readable Indonesian-style date */
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const GlanceHeroCard: React.FC<GlanceHeroCardProps> = ({
  studentName,
  studentAge,
  studentClass,
  overallScore,
  generatedBy = 'AI',
  generatedAt,
  isStale = false,
  overallAssessment,
  onExportPdf,
  onRefresh,
}) => {
  const isAI = generatedBy === 'AI';
  const { shouldReduceMotion } = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.slow, ease: easing.easeOut }}
      className={[
        'relative overflow-hidden rounded-2xl border shadow-lg',
        // Gradient background
        'bg-gradient-to-br from-indigo-50 via-white to-blue-50',
        'dark:from-indigo-900/20 dark:via-slate-900 dark:to-blue-900/20',
        'border-indigo-100 dark:border-slate-700/60',
      ].join(' ')}
    >
      {/* Subtle decorative blob (background only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-600/10"
      />

      <div className="relative z-10 p-5 sm:p-6">
        {/* ───── Top row: ring + student info ───── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Score Ring */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.slow, delay: 0.1 }}
            className="flex-shrink-0"
          >
            <ScoreRing
              score={overallScore}
              size={96}
              strokeWidth={10}
              label="Skor Keseluruhan"
            />
          </motion.div>

          {/* Student metadata column */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight truncate">
              {studentName}
            </h2>

            {/* Class & age line */}
            {(studentClass || studentAge) && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {studentClass && <span>{studentClass}</span>}
                {studentClass && studentAge && <span> · </span>}
                {studentAge && <span>{studentAge} tahun</span>}
              </p>
            )}

            {/* Badges row */}
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {/* AI / Offline badge */}
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  isAI
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                ].join(' ')}
              >
                {isAI ? (
                  <SparklesIcon className="w-3 h-3" />
                ) : (
                  <WifiOffIcon className="w-3 h-3" />
                )}
                {isAI ? 'Analisis AI' : 'Offline Fallback'}
              </span>

              {/* Staleness warning */}
              {isStale && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold">
                  <AlertTriangleIcon className="w-3 h-3" />
                  Perlu diperbarui
                </span>
              )}
            </div>

            {/* Generation date */}
            {generatedAt && (
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Dibuat: {formatDate(generatedAt)}
              </p>
            )}

            {/* Narrative assessment (max 2 lines) */}
            {overallAssessment && (
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                {overallAssessment}
              </p>
            )}
          </div>
        </div>

        {/* ───── Bottom action buttons ───── */}
        <div className="mt-5 flex flex-wrap items-center gap-2 justify-center sm:justify-end border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            className="gap-1.5"
          >
            <DownloadIcon className="w-4 h-4" />
            Unduh PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="gap-1.5"
          >
            <RefreshCwIcon className="w-4 h-4" />
            Perbarui
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
