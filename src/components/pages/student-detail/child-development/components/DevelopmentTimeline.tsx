import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ClockIcon, CalendarIcon } from '../../../../Icons';
import { duration as motionDuration, easing } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';

// ── Prop Types ──────────────────────────────────────────────────────────────
interface DevelopmentTimelineProps {
  /** Targets to achieve within the next 3 months */
  threeMonthTargets: string[];
  /** Targets to achieve within the next 6 months */
  sixMonthTargets: string[];
  className?: string;
}

// ── Timeline Section ────────────────────────────────────────────────────────
const TimelineSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  targets: string[];
  accentColor: string;       // e.g. "bg-amber-500"
  accentPulse: string;       // e.g. "bg-amber-400"
  indexOffset: number;        // stagger offset for second section
}> = ({ title, icon, targets, accentColor, accentPulse, indexOffset }) => {
  const { shouldReduceMotion } = useReducedMotion();

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { delay: 0.15 * i, duration: motionDuration.fast, ease: easing.easeOut },
    }),
  };

  return (
  <div className="relative pl-8">
    {/* ── Milestone node with pulse ────────────────────────────────── */}
    <div className="absolute left-0 top-0 flex items-center justify-center">
      <span
        className={`
          absolute w-5 h-5 rounded-full ${accentPulse} opacity-40
          ${shouldReduceMotion ? '' : 'animate-ping'}
        `}
      />
      <span
        className={`relative w-3 h-3 rounded-full ${accentColor} ring-2 ring-white dark:ring-slate-900`}
      />
    </div>

    {/* Section header */}
    <div className="flex items-center gap-2 mb-3 -mt-0.5">
      {icon}
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h4>
    </div>

    {/* Target items */}
    <ul className="space-y-2.5 mb-6">
      {targets.map((target, idx) => (
        <motion.li
          key={idx}
          custom={idx + indexOffset}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="relative flex items-start gap-3 pl-1"
        >
          {/* Small dot */}
          <span className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-snug">
            {target}
          </span>
        </motion.li>
      ))}

      {/* Empty-state fallback */}
      {targets.length === 0 && (
        <li className="text-sm italic text-slate-400 dark:text-slate-500 pl-1">
          Belum ada target yang ditentukan.
        </li>
      )}
    </ul>
  </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export const DevelopmentTimeline: React.FC<DevelopmentTimelineProps> = ({
  threeMonthTargets,
  sixMonthTargets,
  className = '',
}) => {
  return (
    <div
      className={`
        rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
        border border-slate-200/60 dark:border-slate-700/60 p-5
        ${className}
      `}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-800 dark:text-white">
          📅 Rencana Pengembangan
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Target jangka pendek dan menengah
        </p>
      </div>

      {/* ── Timeline container ─────────────────────────────────────────── */}
      <div className="relative">
        {/* Vertical gradient line */}
        <div
          className="
            absolute left-1.25 top-0 bottom-0 w-0.5
            bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500
            rounded-full
          "
        />

        {/* Section: 3 months */}
        <TimelineSection
          title="3 Bulan Ke Depan"
          icon={<ClockIcon className="w-4 h-4 text-amber-500" />}
          targets={threeMonthTargets}
          accentColor="bg-amber-500"
          accentPulse="bg-amber-400"
          indexOffset={0}
        />

        {/* Section: 6 months */}
        <TimelineSection
          title="6 Bulan Ke Depan"
          icon={<CalendarIcon className="w-4 h-4 text-orange-500" />}
          targets={sixMonthTargets}
          accentColor="bg-orange-500"
          accentPulse="bg-orange-400"
          indexOffset={threeMonthTargets.length}
        />
      </div>
    </div>
  );
};
