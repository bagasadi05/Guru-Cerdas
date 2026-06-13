import React from 'react';
import { motion } from 'framer-motion';

/**
 * ScoreRing — Animated circular progress indicator.
 *
 * Displays a score (0-100) as a colored SVG ring with a smooth
 * mount animation. Color automatically maps to performance level:
 *   ≥85 → emerald (Sangat Baik)
 *   ≥75 → blue    (Baik)
 *   ≥60 → amber   (Cukup)
 *   <60 → rose    (Perlu Perhatian)
 */

interface ScoreRingProps {
  /** Score value between 0 and maxScore */
  score: number;
  /** Upper bound of the score range (default 100) */
  maxScore?: number;
  /** Outer diameter in pixels (default 80) */
  size?: number;
  /** Ring thickness in pixels (default 8) */
  strokeWidth?: number;
  /** Optional text label below the ring */
  label?: string;
  /** Show the numeric score in the center (default true) */
  showScore?: boolean;
  className?: string;
}

/** Returns Tailwind stroke/text color classes based on the score threshold */
const getScoreColor = (score: number, maxScore: number) => {
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return { stroke: 'stroke-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  if (pct >= 75) return { stroke: 'stroke-blue-500', text: 'text-blue-600 dark:text-blue-400' };
  if (pct >= 60) return { stroke: 'stroke-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  return { stroke: 'stroke-rose-500', text: 'text-rose-600 dark:text-rose-400' };
};

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  maxScore = 100,
  size = 80,
  strokeWidth = 8,
  label,
  showScore = true,
  className = '',
}) => {
  // Clamp the score between 0 and maxScore for safety
  const clampedScore = Math.max(0, Math.min(score, maxScore));
  const ratio = clampedScore / maxScore;

  // SVG geometry — viewBox is always relative to `size`
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const { stroke, text } = getScoreColor(clampedScore, maxScore);

  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      {/* SVG ring container */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-slate-200 dark:stroke-slate-700"
          />

          {/* Animated progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - ratio) }}
            transition={{
              duration: 1.2,
              ease: [0.34, 1.56, 0.64, 1], // spring-like overshoot
              delay: 0.15,
            }}
          />
        </svg>

        {/* Center score number */}
        {showScore && (
          <motion.span
            className={`absolute inset-0 flex items-center justify-center font-bold ${text}`}
            style={{ fontSize: size * 0.28 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {Math.round(clampedScore)}
          </motion.span>
        )}
      </div>

      {/* Optional bottom label */}
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center leading-tight max-w-[120px] truncate">
          {label}
        </span>
      )}
    </div>
  );
};
