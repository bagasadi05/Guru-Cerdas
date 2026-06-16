import React from 'react';
import { motion } from 'framer-motion';
import { duration as motionDuration, easing } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';
import { CheckIcon } from '../../../../Icons';

// ── Prop Types ──────────────────────────────────────────────────────────────
interface DevelopmentScoreCardProps {
  /** Which developmental aspect this card represents */
  aspect: 'cognitive' | 'affective' | 'psychomotor';
  /** Human-readable status label, e.g. "Sangat Baik" */
  statusLabel: string;
  /** Tailwind color class for the badge text, e.g. "text-emerald-600" */
  statusColor: string;
  /** Tailwind bg class for the dot, e.g. "bg-emerald-500" */
  statusDot: string;
  /** Optional 0-100 score rendered as a circular progress ring */
  score?: number;
  /** 2-3 key strength / highlight bullet points */
  highlights: string[];
  className?: string;
}

// ── Aspect Configuration ────────────────────────────────────────────────────
const ASPECT_CONFIG = {
  cognitive: {
    emoji: '🧠',
    title: 'Akademik',
    gradient: 'from-blue-500 to-cyan-500',
    ringStroke: '#3b82f6',       // blue-500
    ringTrack: '#dbeafe',        // blue-100
    ringTrackDark: '#1e3a5f',    // dark track
  },
  affective: {
    emoji: '💛',
    title: 'Karakter',
    gradient: 'from-pink-500 to-rose-500',
    ringStroke: '#ec4899',       // pink-500
    ringTrack: '#fce7f3',        // pink-100
    ringTrackDark: '#4a1942',    // dark track
  },
  psychomotor: {
    emoji: '🏃',
    title: 'Keterampilan',
    gradient: 'from-green-500 to-emerald-500',
    ringStroke: '#22c55e',       // green-500
    ringTrack: '#dcfce7',        // green-100
    ringTrackDark: '#14532d',    // dark track
  },
} as const;

// ── Inline Score Ring ───────────────────────────────────────────────────────
// A lightweight SVG circular progress indicator (no external dependency).
const ScoreRing: React.FC<{
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  trackColorDark: string;
}> = ({ score, size = 64, strokeWidth = 5, color, trackColor, trackColorDark }) => {
  const { shouldReduceMotion } = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="dark:hidden"
          stroke={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="hidden dark:block"
          stroke={trackColorDark}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      {/* Center label */}
      <span className="absolute text-sm font-bold text-slate-800 dark:text-white">
        {progress}
      </span>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export const DevelopmentScoreCard: React.FC<DevelopmentScoreCardProps> = ({
  aspect,
  statusLabel,
  statusColor,
  statusDot,
  score,
  highlights,
  className = '',
}) => {
  const config = ASPECT_CONFIG[aspect];
  const { shouldReduceMotion } = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.slow, ease: easing.easeOut }}
      whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
        border border-slate-200/60 dark:border-slate-700/60
        shadow-sm hover:shadow-lg transition-shadow duration-300
        ${className}
      `}
    >
      {/* ── Gradient left border ───────────────────────────────────────── */}
      <div
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${config.gradient}`}
      />

      <div className="pl-5 pr-4 py-4">
        {/* ── Header: Emoji + Title + Badge ──────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={config.title}>
              {config.emoji}
            </span>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              {config.title}
            </h3>
          </div>

          {/* Status badge */}
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-0.5
              rounded-full text-xs font-medium
              bg-slate-100 dark:bg-slate-800
              ${statusColor}
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            {statusLabel}
          </span>
        </div>

        {/* ── Score ring (optional) ──────────────────────────────────── */}
        {score !== undefined && (
          <div className="flex justify-center mb-3">
            <ScoreRing
              score={score}
              color={config.ringStroke}
              trackColor={config.ringTrack}
              trackColorDark={config.ringTrackDark}
            />
          </div>
        )}

        {/* ── Highlight bullet points ────────────────────────────────── */}
        {highlights.length > 0 && (
          <ul className="space-y-1.5">
            {highlights.map((point, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
              >
                <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
};
