/**
 * Skeleton Loader Components
 * Provides loading placeholders with shimmer animation for better perceived performance.
 * Respects useReducedMotion - uses pulse instead of shimmer when reduced motion is preferred.
 */

import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ============================================
// SKELETON TEXT
// ============================================

interface SkeletonTextProps {
  /** Number of text lines to display */
  lines?: number;
  /** Width of each line (can be a string like '100%' or array for per-line widths) */
  widths?: string | string[];
  /** Height of each line */
  lineHeight?: string;
  /** Gap between lines */
  gap?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Animated text placeholder with configurable lines and widths.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  widths,
  lineHeight = '14px',
  gap = '10px',
  className = '',
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const animationClass = shouldReduceMotion ? 'skeleton-pulse' : 'skeleton-shimmer';

  const getWidth = (index: number): string => {
    if (!widths) {
      // Default: last line is shorter
      return index === lines - 1 ? '60%' : '100%';
    }
    if (typeof widths === 'string') return widths;
    return widths[index] || '100%';
  };

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ gap }}
      role="status"
      aria-label="Memuat konten..."
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`rounded bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
          style={{ width: getWidth(i), height: lineHeight }}
        />
      ))}
      <span className="sr-only">Memuat konten...</span>
    </div>
  );
};

// ============================================
// SKELETON AVATAR
// ============================================

interface SkeletonAvatarProps {
  /** Size of the avatar in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Circular avatar placeholder with configurable size.
 */
export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  className = '',
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const animationClass = shouldReduceMotion ? 'skeleton-pulse' : 'skeleton-shimmer';

  return (
    <div
      className={`rounded-full bg-slate-200 dark:bg-slate-700/60 ${animationClass} ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
      role="status"
      aria-label="Memuat avatar..."
    >
      <span className="sr-only">Memuat avatar...</span>
    </div>
  );
};

// ============================================
// SKELETON CARD
// ============================================

interface SkeletonCardProps {
  /** Show avatar placeholder */
  showAvatar?: boolean;
  /** Avatar size in pixels */
  avatarSize?: number;
  /** Show title placeholder */
  showTitle?: boolean;
  /** Number of body text lines */
  bodyLines?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card-shaped placeholder with optional avatar, title, and body lines.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = true,
  avatarSize = 40,
  showTitle = true,
  bodyLines = 2,
  className = '',
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const animationClass = shouldReduceMotion ? 'skeleton-pulse' : 'skeleton-shimmer';

  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-slate-700 p-4 ${className}`}
      role="status"
      aria-label="Memuat kartu..."
    >
      {/* Header with avatar and title */}
      {(showAvatar || showTitle) && (
        <div className="flex items-center gap-3 mb-3">
          {showAvatar && (
            <div
              className={`rounded-full bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
              style={{ width: avatarSize, height: avatarSize, flexShrink: 0 }}
            />
          )}
          {showTitle && (
            <div className="flex-1">
              <div
                className={`rounded bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
                style={{ width: '60%', height: '16px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Body lines */}
      {bodyLines > 0 && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: bodyLines }, (_, i) => (
            <div
              key={i}
              className={`rounded bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
              style={{
                width: i === bodyLines - 1 ? '75%' : '100%',
                height: '12px',
              }}
            />
          ))}
        </div>
      )}
      <span className="sr-only">Memuat kartu...</span>
    </div>
  );
};

// ============================================
// SKELETON LIST
// ============================================

interface SkeletonListProps {
  /** Number of skeleton items to display */
  count?: number;
  /** Show avatar in each item */
  showAvatar?: boolean;
  /** Avatar size in pixels */
  avatarSize?: number;
  /** Number of text lines per item */
  linesPerItem?: number;
  /** Gap between items */
  gap?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * List of skeleton items with configurable count and appearance.
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  showAvatar = true,
  avatarSize = 36,
  linesPerItem = 2,
  gap = '12px',
  className = '',
}) => {
  const { shouldReduceMotion } = useReducedMotion();
  const animationClass = shouldReduceMotion ? 'skeleton-pulse' : 'skeleton-shimmer';

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ gap }}
      role="status"
      aria-label="Memuat daftar..."
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          {showAvatar && (
            <div
              className={`rounded-full bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
              style={{ width: avatarSize, height: avatarSize, flexShrink: 0 }}
            />
          )}
          <div className="flex-1 flex flex-col gap-2">
            {Array.from({ length: linesPerItem }, (_, j) => (
              <div
                key={j}
                className={`rounded bg-slate-200 dark:bg-slate-700/60 ${animationClass}`}
                style={{
                  width: j === 0 ? '70%' : '50%',
                  height: j === 0 ? '14px' : '12px',
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Memuat daftar...</span>
    </div>
  );
};
