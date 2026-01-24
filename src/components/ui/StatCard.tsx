/**
 * @fileoverview Reusable Stat Card Component
 * 
 * A generic, reusable component for displaying statistics with icons,
 * values, and optional sub-values. Supports hover effects, gradients,
 * and animated counters.
 * 
 * @module components/ui/StatCard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { statsCardVariants } from '../../utils/animations';

// =============================================================================
// TYPES
// =============================================================================

export interface StatCardProps {
  /** Display label for the stat */
  label: string;
  /** Main value to display (number or string) */
  value: number | string;
  /** Icon component to render */
  icon: React.FC<{ className?: string }>;
  /** Optional gradient color classes (e.g., 'from-sky-500 to-blue-600') */
  gradient?: string;
  /** Optional sub-value or description */
  subValue?: string;
  /** Optional navigation link */
  link?: string;
  /** Optional custom className for the card */
  className?: string;
  /** Whether to use animated counter for numeric values */
  animated?: boolean;
  /** Custom animation index for stagger effect */
  animationIndex?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout variant - centered or split (icon top, content bottom) */
  layout?: 'centered' | 'split';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * StatCard - A reusable statistics card component
 * 
 * Displays a statistic with an icon, value, label, and optional sub-value.
 * Supports links, hover effects, gradients, and animated counters.
 * 
 * @example
 * ```tsx
 * <StatCard
 *   label="Total Students"
 *   value={150}
 *   icon={UsersIcon}
 *   gradient="from-sky-500 to-blue-600"
 *   subValue="5 classes"
 *   link="/students"
 *   animated
 * />
 * ```
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  gradient = 'from-slate-500 to-slate-600',
  subValue,
  link,
  className = '',
  animated = true,
  animationIndex = 0,
  size = 'md',
  layout = 'centered'
}) => {
  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'p-3 min-h-[100px]',
      icon: 'w-8 h-8',
      iconSize: 'w-4 h-4',
      value: 'text-2xl',
      label: 'text-[10px]',
      subValue: 'text-xs'
    },
    md: {
      container: 'p-4 min-h-[120px]',
      icon: 'w-10 h-10',
      iconSize: 'w-5 h-5',
      value: 'text-[28px]',
      label: 'text-xs',
      subValue: 'text-xs'
    },
    lg: {
      container: 'p-5',
      icon: 'w-12 h-12',
      iconSize: 'w-6 h-6',
      value: 'text-3xl',
      label: 'text-sm',
      subValue: 'text-sm'
    }
  };

  const sizes = sizeClasses[size];

  // Layout variations
  const renderCenteredLayout = () => (
    <>
      {/* Hover overlay effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${gradient}`} />
      
      {/* Icon */}
      <div className={`${sizes.icon} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 shadow-lg relative z-10`}>
        <Icon className={`${sizes.iconSize} text-white`} />
      </div>
      
      {/* Value */}
      <span className={`${sizes.value} font-extrabold leading-none text-slate-800 dark:text-white relative z-10`}>
        {typeof value === 'number' && animated ? (
          <AnimatedCounter
            value={value}
            duration={1500}
            className={sizes.value}
          />
        ) : (
          value
        )}
      </span>
      
      {/* Label */}
      <span className={`${sizes.label} font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 relative z-10`}>
        {label}
      </span>
      
      {/* Sub-value */}
      {subValue && (
        <span className={`${sizes.subValue} font-medium text-slate-500 dark:text-slate-400 mt-1 relative z-10`}>
          {subValue}
        </span>
      )}
    </>
  );

  const renderSplitLayout = () => (
    <>
      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Icon container */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`${sizes.icon} rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`${sizes.iconSize}`} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className={`${sizes.value} font-bold text-slate-800 dark:text-white leading-none mb-2 tracking-tight`}>
          {typeof value === 'number' && animated ? (
            <AnimatedCounter
              value={value}
              duration={1500}
              className={sizes.value}
            />
          ) : (
            value
          )}
        </div>
        <p className={`${sizes.label} font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1`}>
          {label}
        </p>
        {subValue && (
          <p className={`${sizes.subValue} font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block`}>
            {subValue}
          </p>
        )}
      </div>
    </>
  );

  const layoutClasses = layout === 'centered' 
    ? 'flex flex-col items-center justify-center' 
    : 'flex flex-col justify-between';

  const cardContent = (
    <div
      className={`glass-card ${sizes.container} rounded-xl border border-white/40 dark:border-white/5 shadow-sm ${layoutClasses} relative overflow-hidden group hover:shadow-md transition-all duration-300 card-interactive ${className}`}
    >
      {layout === 'centered' ? renderCenteredLayout() : renderSplitLayout()}
    </div>
  );

  // If link is provided, wrap in Link with motion
  if (link) {
    return (
      <motion.div
        variants={statsCardVariants}
        whileHover="hover"
        custom={animationIndex}
      >
        <Link to={link} className="block h-full">
          {cardContent}
        </Link>
      </motion.div>
    );
  }

  // Otherwise, just return the card with motion
  return (
    <motion.div
      variants={statsCardVariants}
      whileHover="hover"
      custom={animationIndex}
    >
      {cardContent}
    </motion.div>
  );
};

export default StatCard;
