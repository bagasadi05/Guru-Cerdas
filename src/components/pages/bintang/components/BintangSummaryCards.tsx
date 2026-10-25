import React from 'react';
import { Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { aspectMeta } from '../bintangConstants';
import { Button } from '../../../ui/Button';
import type { AspectPointsSummary } from '../../../../services/bintangService';

interface BintangSummaryCardsProps {
    classSummary: AspectPointsSummary;
    totalQuizPoints: number;
    quizPointsCount: number;
    publishedCount: number;
    totalStudents: number;
    filledCount: number;
    loadError: string | null;
    isLoading: boolean;
    onRetryLoad: () => void;
    isWalas: boolean;
    staleCount: number;
}

export const BintangSummaryCards: React.FC<BintangSummaryCardsProps> = ({
    classSummary,
    totalQuizPoints,
    quizPointsCount,
    publishedCount,
    totalStudents,
    filledCount,
    loadError,
    isLoading,
    onRetryLoad,
    isWalas,
    staleCount,
}) => {
    return (
        <div className="space-y-4">
            {/* 5 Squircle Badge Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {(['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const).map((aspect) => {
                    const data = classSummary[aspect];
                    const meta = aspectMeta[aspect];
                    const Icon = meta.icon;
                    return (
                        <div
                            key={aspect}
                            className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                        >
                            <div
                                className={`w-11 h-11 rounded-xl ${meta.badgeBg} flex items-center justify-center shrink-0 shadow-sm`}
                            >
                                <Icon size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {data.points}{' '}
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        poin
                                    </span>
                                </p>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {meta.label} ({data.count})
                                </p>
                            </div>
                        </div>
                    );
                })}

                {/* Card 4: Poin Keaktifan Kelas */}
                <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            +{totalQuizPoints}{' '}
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                poin
                            </span>
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Keaktifan ({quizPointsCount})
                        </p>
                    </div>
                </div>

                {/* Card 5: Status Rapor Terbit */}
                <div className="col-span-2 sm:col-span-1 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                    <div className="w-11 h-11 rounded-xl bg-sky-500 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
                        <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            {publishedCount}
                            <span className="text-sm font-semibold text-slate-400">/{totalStudents}</span>
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Terbit ({filledCount} terisi)
                        </p>
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {loadError && (
                <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-800 dark:text-rose-300"
                >
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{loadError}</span>
                    </div>
                    <Button
                        variant="outline"
                        onClick={onRetryLoad}
                        disabled={isLoading}
                        className="h-9 px-3 text-sm rounded-xl border-rose-300 dark:border-rose-700 cursor-pointer"
                    >
                        {isLoading ? 'Memuat...' : 'Muat Ulang'}
                    </Button>
                </div>
            )}

            {/* Stale draft alert */}
            {isWalas && !loadError && staleCount > 0 && (
                <div
                    role="status"
                    className="flex items-start gap-2 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300"
                >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                        {staleCount} rapor draft belum memuat pelanggaran atau poin keaktifan terbaru. Klik{' '}
                        <strong>Generate</strong> untuk memperbarui sebelum dipublikasikan.
                    </span>
                </div>
            )}
        </div>
    );
};
