import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/Button';
import { RotateCcw, XIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { InputMode, Step } from '../types';

interface MassInputFloatingBarsProps {
    step: Step;
    mode: InputMode | null;
    gradedCount: number;
    selectedStudentCount: number;
    undoSnapshot: { kind: 'scores' | 'selection'; count: number } | null;
    onUndoClear: () => void;
    onRequestClear: () => void;
    isDirty: boolean;
    attitudePoints?: number;
    isSubmitDisabled: boolean;
    submitButtonTooltip: string;
    onSubmit: () => void;
    isSubmitting: boolean;
    isCheckingDuplicates?: boolean;
    offlineSaveState?: 'queued' | 'review' | null;
    isQueuedSaveCurrent?: boolean;
    isOnline: boolean;
}

export const MassInputFloatingBars: React.FC<MassInputFloatingBarsProps> = ({
    step,
    mode,
    gradedCount,
    selectedStudentCount,
    undoSnapshot,
    onUndoClear,
    onRequestClear,
    isDirty,
    attitudePoints,
    isSubmitDisabled,
    submitButtonTooltip,
    onSubmit,
    isSubmitting,
    isCheckingDuplicates,
    offlineSaveState,
    isQueuedSaveCurrent,
    isOnline,
}) => {
    if (typeof document === 'undefined') return null;

    const shouldShowSaveBar =
        step === 2 &&
        mode !== 'violation_export' &&
        (mode === 'subject_grade' ? gradedCount > 0 : selectedStudentCount > 0);

    return (
        <>
            {/* Undo bar: restores the batch that was just cleared */}
            {undoSnapshot &&
                createPortal(
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed bottom-32 lg:bottom-20 inset-x-0 z-50 pointer-events-none flex justify-center lg:pl-72 px-4 animate-in fade-in slide-in-from-bottom-5"
                    >
                        <div className="pointer-events-auto shadow-2xl bg-amber-50 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100 px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-amber-300 dark:border-amber-800 backdrop-blur-md max-w-[95vw]">
                            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                                {undoSnapshot.kind === 'scores'
                                    ? `${undoSnapshot.count} nilai dibersihkan`
                                    : `${undoSnapshot.count} pilihan dibersihkan`}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onUndoClear}
                                className="rounded-xl border-amber-400 dark:border-amber-700 bg-white dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-bold h-8 inline-flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Urungkan</span>
                            </Button>
                        </div>
                    </div>,
                    document.body
                )}

            {/* Floating Save Bar for Step 2 */}
            {shouldShowSaveBar &&
                createPortal(
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 inset-x-0 z-50 pointer-events-none flex justify-center lg:pl-72 px-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
                    >
                        <div className="pointer-events-auto shadow-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 backdrop-blur-md border border-slate-700/60 dark:border-slate-600 shadow-black/40 max-w-[95vw]">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    {mode !== 'subject_grade' || isDirty ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                        </>
                                    ) : (
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    )}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap">
                                    {mode === 'subject_grade'
                                        ? `${gradedCount} siswa dinilai${!isDirty ? ' (Tersimpan)' : ''}`
                                        : mode === 'attitude'
                                        ? `${selectedStudentCount} siswa terpilih (+${attitudePoints || 1} poin)`
                                        : `${selectedStudentCount} siswa terpilih`}
                                </span>
                                <button
                                    type="button"
                                    onClick={onRequestClear}
                                    className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    title={mode === 'subject_grade' ? 'Bersihkan nilai yang diketik' : 'Batalkan pilihan'}
                                    aria-label={mode === 'subject_grade' ? 'Bersihkan nilai yang diketik' : 'Batalkan pilihan'}
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>

                            {isSubmitDisabled && submitButtonTooltip && (
                                <>
                                    <div className="hidden sm:block h-4 w-px bg-white/20" />
                                    <span
                                        className="hidden sm:inline-flex text-xs text-amber-300 font-medium items-center gap-1 max-w-[220px] truncate"
                                        title={submitButtonTooltip}
                                    >
                                        <AlertCircle size={13} className="shrink-0" />
                                        <span className="truncate">{submitButtonTooltip}</span>
                                    </span>
                                </>
                            )}

                            <div className="h-4 w-px bg-white/20" />

                            <Button
                                onClick={onSubmit}
                                disabled={isSubmitDisabled || isSubmitting || isCheckingDuplicates}
                                title={submitButtonTooltip}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 min-h-[44px] sm:min-h-[40px] h-11 sm:h-10 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            >
                                {isSubmitting || isCheckingDuplicates ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        {isCheckingDuplicates ? 'Memeriksa...' : 'Menyimpan...'}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        {mode === 'violation'
                                            ? `Simpan Pelanggaran (${selectedStudentCount})`
                                            : mode === 'quiz'
                                            ? `Simpan Kuis (${selectedStudentCount})`
                                            : mode === 'attitude'
                                            ? `Simpan Poin Sikap (${selectedStudentCount})`
                                            : mode === 'subject_grade'
                                            ? offlineSaveState === 'queued' && isQueuedSaveCurrent
                                                ? `Menunggu Koneksi (${gradedCount})`
                                                : !isOnline && isDirty
                                                ? `Simpan di Perangkat (${gradedCount})`
                                                : isDirty
                                                ? `Simpan Nilai (${gradedCount})`
                                                : `Tersimpan (${gradedCount})`
                                            : mode === 'bulk_report'
                                            ? `Cetak Rapor Massal (${selectedStudentCount})`
                                            : mode === 'academic_print'
                                            ? `Cetak Rekap Nilai (${selectedStudentCount})`
                                            : `Simpan Data (${selectedStudentCount})`}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};
