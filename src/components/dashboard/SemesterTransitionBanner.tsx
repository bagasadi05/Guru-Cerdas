/**
 * @fileoverview Semester Transition Banner
 *
 * Displays a prominent banner at the top of the Dashboard when the active
 * semester has ended and a new one is ready to be activated.
 *
 * @module components/dashboard/SemesterTransitionBanner
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheckIcon, ArrowRightIcon, XIcon, Loader2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { useSemesterTransition } from '../../hooks/useSemesterTransition';
import { useSemester } from '../../contexts/SemesterContext';

const SemesterTransitionBanner: React.FC = () => {
    const { needsTransition, target, isCreating, isTransitioning, performTransition, dismiss } =
        useSemesterTransition();
    const { activeSemester, activeAcademicYear } = useSemester();

    // Don't render anything if no transition is needed or still creating
    if (!needsTransition && !isCreating) return null;

    const currentLabel = activeSemester
        ? `Semester ${activeSemester.name} ${activeAcademicYear?.name || ''}`
        : 'Semester saat ini';

    const nextLabel = target
        ? `Semester ${target.semester.name} ${target.academicYearName}`
        : '';

    return (
        <AnimatePresence>
            {(needsTransition || isCreating) && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 shadow-lg shadow-amber-500/10 dark:shadow-amber-500/5"
                >
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500 to-transparent rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500 to-transparent rounded-full blur-3xl" />
                    </div>

                    <div className="relative z-10 p-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            {/* Left: Icon + Message */}
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    {isCreating ? (
                                        <Loader2Icon className="w-6 h-6 text-white animate-spin" />
                                    ) : (
                                        <CalendarCheckIcon className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                                        {isCreating
                                            ? 'Menyiapkan Tahun Ajaran Baru...'
                                            : '📅 Semester Baru Telah Dimulai!'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
                                        {isCreating ? (
                                            'Sedang membuat tahun ajaran dan semester baru secara otomatis...'
                                        ) : (
                                            <>
                                                <span className="font-medium">{currentLabel}</span> telah berakhir.
                                                {nextLabel && (
                                                    <>
                                                        {' '}Beralih ke{' '}
                                                        <span className="font-bold text-amber-900 dark:text-amber-100">
                                                            {nextLabel}
                                                        </span>
                                                        ?
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            {!isCreating && target && (
                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                    <button
                                        onClick={dismiss}
                                        className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-medium px-3 py-2 rounded-xl hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all"
                                        disabled={isTransitioning}
                                    >
                                        Nanti Saja
                                    </button>
                                    <Button
                                        onClick={performTransition}
                                        disabled={isTransitioning}
                                        className="!bg-gradient-to-r !from-amber-500 !to-orange-500 hover:!from-amber-600 hover:!to-orange-600 !text-white !shadow-lg !shadow-amber-500/20 !border-0 !rounded-xl !text-xs sm:!text-sm !font-bold !px-4 !py-2.5"
                                    >
                                        {isTransitioning ? (
                                            <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <ArrowRightIcon className="w-4 h-4 mr-2" />
                                        )}
                                        {isTransitioning ? 'Beralih...' : 'Beralih Sekarang'}
                                    </Button>
                                </div>
                            )}

                            {/* Close button (absolute positioned) */}
                            {!isCreating && (
                                <button
                                    onClick={dismiss}
                                    className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-400 hover:text-amber-600 dark:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all"
                                    aria-label="Tutup"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SemesterTransitionBanner;
