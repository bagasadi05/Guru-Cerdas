import React from 'react';
import { motion, Variants } from 'framer-motion';

/**
 * QuickInsightStrip — Three bite-sized insights at a glance.
 *
 * Designed for parents: each card highlights a single takeaway
 * with a friendly emoji, an uppercase category label, and
 * a short sentence of guidance.
 */

interface QuickInsightStripProps {
  /** Student's primary strength */
  superpower: string;
  /** Key area that needs improvement */
  challenge: string;
  /** Practical tip parents can do at home */
  homeTip: string;
}

/** Configuration for each insight column */
const INSIGHT_CONFIG = [
  {
    key: 'superpower',
    emoji: '🌟',
    title: 'Kekuatan Utama',
    emojiBg: 'bg-amber-100 dark:bg-amber-900/30',
    cardGradient: 'from-amber-50/80 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10',
    borderColor: 'border-amber-200/60 dark:border-amber-800/40',
  },
  {
    key: 'challenge',
    emoji: '🎯',
    title: 'Fokus Belajar',
    emojiBg: 'bg-blue-100 dark:bg-blue-900/30',
    cardGradient: 'from-blue-50/80 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10',
    borderColor: 'border-blue-200/60 dark:border-blue-800/40',
  },
  {
    key: 'homeTip',
    emoji: '🏠',
    title: 'Tips di Rumah',
    emojiBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    cardGradient: 'from-emerald-50/80 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
] as const;

/** Staggered children animation orchestrator */
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const QuickInsightStrip: React.FC<QuickInsightStripProps> = ({
  superpower,
  challenge,
  homeTip,
}) => {
  // Map prop values to the config order
  const values: Record<string, string> = { superpower, challenge, homeTip };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-3"
    >
      {INSIGHT_CONFIG.map((cfg) => (
        <motion.div
          key={cfg.key}
          variants={cardVariants}
          className={[
            'group flex items-start gap-3 rounded-xl border p-4',
            `bg-gradient-to-br ${cfg.cardGradient}`,
            cfg.borderColor,
            'transition-shadow duration-200 hover:shadow-md',
          ].join(' ')}
        >
          {/* Emoji circle */}
          <span
            className={[
              'flex-shrink-0 flex items-center justify-center',
              'w-10 h-10 rounded-full text-lg',
              cfg.emojiBg,
            ].join(' ')}
            aria-hidden
          >
            {cfg.emoji}
          </span>

          {/* Text content */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {cfg.title}
            </p>
            <p className="text-[13px] font-medium leading-snug text-slate-700 dark:text-slate-200 line-clamp-3">
              {values[cfg.key]}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
