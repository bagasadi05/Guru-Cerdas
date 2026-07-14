import React, { useState } from 'react';
import { ArrowRightIcon } from '../../../../Icons';
import { MarkdownText } from '../../../../ui/MarkdownText';
import { motion, AnimatePresence } from 'framer-motion';
import { duration as motionDuration } from '../../../../../styles/motion';
import { useReducedMotion } from '../../../../../hooks/useReducedMotion';

const categoryEmojis: Record<string, string> = {
  'Kognitif': '📚',
  'Afektif': '🗣️',
  'Psikomotor': '🎨',
  'Home Support': '🏠',
  'Sosial Emosional': '💛',
  'Fisik & Kreativitas': '🏃',
};

const actionStepEmojis = ['📌', '📝', '🎯', '💡', '✅'];

export const ActionableRecommendation: React.FC<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
  onStartAction?: () => void;
}> = ({ title, description, priority, category, actions, onStartAction: _onStartAction }) => {
  const { shouldReduceMotion } = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isLongDescription = description.length > 150;

  const priorityConfig = {
    high: {
      border: 'border-rose-200 dark:border-rose-800',
      bg: 'bg-rose-50/80 dark:bg-rose-950/20',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
      badgeText: 'text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500',
      label: 'Utama',
    },
    medium: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50/80 dark:bg-amber-950/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      label: 'Penting',
    },
    low: {
      border: 'border-emerald-200 dark:border-emerald-800',
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Tambahan',
    },
  };

  const config = priorityConfig[priority];
  const emoji = categoryEmojis[category] || '📋';

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} shadow-sm overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-md`}>
      <div className="p-4">
        {/* Priority + Category row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.badgeBg} ${config.badgeText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {emoji} {category}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5 text-sm">{title}</h4>

        {/* Description */}
        <div className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed ${!isDescriptionExpanded && isLongDescription ? 'line-clamp-2' : ''}`}>
          <MarkdownText text={description} />
        </div>
        {isLongDescription && (
          <button type="button"
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="mt-1 text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
          >
            {isDescriptionExpanded ? 'Tutup' : 'Selengkapnya →'}
          </button>
        )}

        {/* Expand action steps */}
        <button type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          {isExpanded ? 'Sembunyikan' : 'Lihat Langkah'}
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.fast }}
          >
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </motion.span>
        </button>
      </div>

      {/* Expandable action steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={shouldReduceMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-black/20">
              <p className="text-xxs font-bold text-slate-400 dark:text-slate-500 mb-2.5 uppercase tracking-wider">Langkah yang bisa dilakukan:</p>
              <ol className="space-y-2">
                {actions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {actionStepEmojis[idx] || '📌'}
                    </span>
                    <span className="font-medium leading-relaxed">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
