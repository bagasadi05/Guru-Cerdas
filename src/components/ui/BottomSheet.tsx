import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XCircleIcon } from '../Icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { duration, easing } from '../../styles/motion';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, title }) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const { shouldReduceMotion } = useReducedMotion();
    const isClient = typeof document !== 'undefined';

    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';

            // Focus the sheet/container for accessibility
            setTimeout(() => {
                const sheetContainer = sheetRef.current;
                if (sheetContainer) {
                    const focusableElements = sheetContainer.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    );
                    if (focusableElements.length > 0) {
                        focusableElements[0].focus();
                    } else {
                        sheetContainer.focus();
                    }
                }
            }, 100);
        }

        return () => {
            document.body.style.overflow = '';
            if (previousActiveElement.current && !isOpen) {
                previousActiveElement.current.focus();
            }
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key === 'Tab' && sheetRef.current) {
                const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
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
                <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : duration.base }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Sheet Content */}
                    <motion.div
                        ref={sheetRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="bottomsheet-title"
                        initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', scale: 1 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, scale: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', scale: 1 }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: duration.base, ease: easing.easeOut }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 
                                  rounded-t-2xl sm:rounded-2xl shadow-xl 
                                  max-h-[90vh] flex flex-col focus:outline-none z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle bar for mobile feel */}
                        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <h3 id="bottomsheet-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                                {title || 'Menu'}
                            </h3>
                            <button
                                onClick={onClose}
                                aria-label="Tutup bottom sheet"
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <XCircleIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto p-4">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BottomSheet;
