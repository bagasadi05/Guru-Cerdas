import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { easing } from '../../styles/motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, icon, maxWidth = 'max-w-lg' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const isClient = typeof document !== 'undefined';
  const { shouldReduceMotion } = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent scrolling on body when modal is open
      document.body.style.overflow = 'hidden';

      // Focus the modal after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const modalContainer = modalRef.current;
        if (modalContainer) {
          const focusableElements = modalContainer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      }, 100);
    }

    return () => {
      document.body.style.overflow = 'unset';

      // Restore focus to previously focused element
      if (previousActiveElement.current && !isOpen) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !modalRef.current) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Handle Tab key for focus trap
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // If shift+tab and we're on first element, go to last
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        // If tab and we're on last element, go to first
        else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-max flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef as React.RefObject<HTMLDivElement>}
            initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
            transition={shouldReduceMotion ? { duration: 0 } : easing.spring}
            className={`relative w-full ${maxWidth} mx-1 sm:mx-3 max-h-[95vh] flex flex-col`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            id="modal-container"
          >
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col h-full max-h-[95vh]">
          <div className="relative p-6 border-b border-slate-200/70 dark:border-slate-700/60">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" aria-hidden="true">
                    {icon}
                  </div>
                )}
                <h2 id="modal-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{title}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6" role="document">
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>,
    document.body
  );
};
