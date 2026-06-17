/**
 * FloatingActionMenu Component
 * Expandable FAB with multiple actions
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { duration as motionDuration, easing } from '../../styles/motion';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionMenuProps {
  actions: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  actions,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { shouldReduceMotion } = useReducedMotion();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-fixed`}>
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.base, ease: easing.easeOut }}
            className="flex flex-col gap-3 mb-4"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.05, duration: motionDuration.fast }}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                aria-label={action.label}
                className={`flex items-center gap-3 ${
                  action.color || 'bg-white dark:bg-slate-800'
                } rounded-full shadow-lg hover:shadow-xl transition-all min-h-[48px] px-4 py-3`}
              >
                <div className="w-6 h-6 flex items-center justify-center" aria-hidden="true">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Escape' && isOpen) setIsOpen(false); }}
        className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        aria-label={isOpen ? 'Tutup menu aksi cepat' : 'Buka menu aksi cepat'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: isOpen ? 45 : 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: motionDuration.fast }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>

      {/* Backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : motionDuration.base }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 -z-10"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionMenu;
