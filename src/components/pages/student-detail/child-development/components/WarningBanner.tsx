import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { duration as motionDuration } from '../../../../../styles/motion';
import { AlertCircleIcon, ChevronDownIcon } from '../../../../Icons';

// ── Prop Types ──────────────────────────────────────────────────────────────
interface WarningBannerProps {
  /** List of warning messages to display */
  warnings: string[];
  className?: string;
}

// ── Main Component ──────────────────────────────────────────────────────────
export const WarningBanner: React.FC<WarningBannerProps> = ({
  warnings,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render anything if there are no warnings
  if (!warnings || warnings.length === 0) return null;

  return (
    <div
      className={`
        rounded-xl overflow-hidden
        border border-rose-200 dark:border-rose-800
        bg-rose-50 dark:bg-rose-950
        shadow-sm
        ${className}
      `}
    >
      {/* ── Collapsed header row ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="
          w-full flex items-center justify-between gap-3
          px-4 py-3 text-left
          transition-colors duration-200
          hover:bg-rose-100/60 dark:hover:bg-rose-900/40
          focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400
        "
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          {/* Warning emoji + icon */}
          <span className="text-base" role="img" aria-label="warning">
            ⚠️
          </span>
          <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
            Ada {warnings.length} hal yang perlu diperhatikan
          </span>
        </div>

        {/* Toggle label + chevron */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-rose-500 dark:text-rose-400 hidden sm:inline">
            {isExpanded ? 'Sembunyikan' : 'Lihat Detail'}
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: motionDuration.base }}
          >
            <ChevronDownIcon className="w-4 h-4 text-rose-400 dark:text-rose-500" />
          </motion.span>
        </div>
      </button>

      {/* ── Expanded warning list ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="warning-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: motionDuration.base, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-rose-200/60 dark:border-rose-800/60">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                {warnings.map((warning, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300"
                  >
                    <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400 dark:text-rose-500" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
