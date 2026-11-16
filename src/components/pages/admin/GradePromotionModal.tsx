import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/Button';
import {
    ArrowLeft,
    Save,
    FileSpreadsheet,
    RotateCcw,
    AlertTriangle,
    X,
} from 'lucide-react';
import {
    useGradePromotionWizard,
    type StepNumber,
} from './grade-promotion/useGradePromotionWizard';
import { Step1Graduation } from './grade-promotion/Step1Graduation';
import { Step2RegularPromotion } from './grade-promotion/Step2RegularPromotion';
import { Step3Grade4Allocation } from './grade-promotion/Step3Grade4Allocation';
import { Step4SummaryExecute } from './grade-promotion/Step4SummaryExecute';

interface GradePromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetAcademicYearId?: string | null;
    targetAcademicYearName?: string;
}

/**
 * Full-screen wizard modal for annual grade promotion, Grade 3->4 deliberation, Excel export, and batch rollback.
 */
export const GradePromotionModal: React.FC<GradePromotionModalProps> = ({
    isOpen,
    onClose,
    targetAcademicYearId,
    targetAcademicYearName,
}) => {
    const wizard = useGradePromotionWizard({
        isOpen,
        targetAcademicYearId,
        targetAcademicYearName,
    });

    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Kenaikan Kelas dan Pembagian Rombel"
            className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden"
        >
            {/* Top Bar */}
            <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        <span>Kembali</span>
                    </button>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                            Kenaikan Kelas &amp; Pembagian Rombel — {wizard.effectiveYearName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={wizard.handleExportExcel}
                        disabled={wizard.loading || wizard.plannedMoves.length === 0}
                        className="hidden sm:inline-flex"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        Unduh Excel
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={wizard.handleSaveDraft}
                        disabled={wizard.savingDraft || wizard.loading}
                        className="hidden sm:inline-flex"
                    >
                        <Save className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        {wizard.savingDraft ? 'Menyimpan...' : 'Simpan Draf'}
                    </Button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                        title="Tutup (Esc)"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Horizontal Step Tabs */}
            <nav
                aria-label="Tahapan kenaikan kelas"
                className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 overflow-x-auto"
            >
                <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-6 min-w-max">
                    {wizard.steps.map(s => {
                        const isActive = wizard.step === s.id;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                aria-current={isActive ? 'step' : undefined}
                                onClick={() => wizard.setStep(s.id)}
                                className={`py-3.5 px-2 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset ${
                                    isActive
                                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>{s.label}</span>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded tabular-nums ${
                                        isActive
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {s.countText}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                <div className="max-w-7xl mx-auto space-y-5">
                    {wizard.loading ? (
                        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Memuat data kelas dan nilai siswa...
                            </p>
                        </div>
                    ) : wizard.loadError ? (
                        <div className="p-8 text-center space-y-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-lg mx-auto">
                            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" aria-hidden="true" />
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                    Gagal Memuat Data
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{wizard.loadError}</p>
                            </div>
                            <Button variant="primary" onClick={wizard.loadWorkspace}>
                                Muat Ulang
                            </Button>
                        </div>
                    ) : (
                        <>
                            {wizard.workspace?.appliedBatch && (
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                                        <div className="text-sm text-amber-900 dark:text-amber-200">
                                            <p className="font-semibold">
                                                Kenaikan kelas periode {wizard.effectiveYearName} sudah diterapkan pada{' '}
                                                {wizard.workspace.appliedBatch.executed_at
                                                    ? new Date(wizard.workspace.appliedBatch.executed_at).toLocaleString('id-ID')
                                                    : '-'}
                                            </p>
                                            <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-xs">
                                                Jika ada kesalahan pembagian rombel, Anda dapat membatalkan perubahan ini untuk mengembalikan siswa ke kelas semula.
                                            </p>
                                        </div>
                                    </div>
                                    {wizard.isAdmin && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => wizard.handleRollback(wizard.workspace!.appliedBatch!.id)}
                                            disabled={wizard.rollingBack}
                                            className="shrink-0"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden="true" />
                                            {wizard.rollingBack ? 'Membatalkan...' : 'Batalkan Kenaikan Kelas'}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {wizard.step === 1 && (
                                <Step1Graduation
                                    workspace={wizard.workspace}
                                    draft={wizard.draft}
                                    grade6Students={wizard.grade6Students}
                                    filteredGrade6Students={wizard.filteredGrade6Students}
                                    classById={wizard.classById}
                                    grade6Search={wizard.grade6Search}
                                    onSearchChange={wizard.setGrade6Search}
                                    grade6ClassFilter={wizard.grade6ClassFilter}
                                    onClassFilterChange={wizard.setGrade6ClassFilter}
                                    onToggleGraduateStudent={wizard.handleToggleGraduateStudent}
                                    onGraduateAll={wizard.handleGraduateAllGrade6}
                                />
                            )}

                            {wizard.step === 2 && (
                                <Step2RegularPromotion
                                    workspace={wizard.workspace}
                                    draft={wizard.draft}
                                    groupedRegularClasses={wizard.groupedRegularClasses}
                                    expandedClassId={wizard.expandedClassId}
                                    onToggleExpandClass={wizard.setExpandedClassId}
                                    onSetClassTargetOverride={wizard.handleSetClassTargetOverride}
                                    onToggleRetainedStudent={wizard.handleToggleRetainedRegular}
                                />
                            )}

                            {wizard.step === 3 && (
                                <Step3Grade4Allocation
                                    workspace={wizard.workspace}
                                    draft={wizard.draft}
                                    grade4Counters={wizard.grade4Counters}
                                    filteredGrade3Students={wizard.filteredGrade3Students}
                                    searchQuery={wizard.searchQuery}
                                    onSearchQueryChange={wizard.setSearchQuery}
                                    sourceClassFilter={wizard.sourceClassFilter}
                                    onSourceClassFilterChange={wizard.setSourceClassFilter}
                                    placementFilter={wizard.placementFilter}
                                    onPlacementFilterChange={wizard.setPlacementFilter}
                                    onGenerateBalancedDraft={wizard.handleGenerateBalancedDraft}
                                    onAssignStudent={wizard.handleAssignGrade3Student}
                                />
                            )}

                            {wizard.step === 4 && (
                                <Step4SummaryExecute
                                    effectiveYearName={wizard.effectiveYearName}
                                    unassignedCount={wizard.grade4Counters.unassignedCount}
                                    onGoToStep3={() => wizard.setStep(3)}
                                    moveSummary={wizard.moveSummary}
                                    classTransitionSummary={wizard.classTransitionSummary}
                                    copyTeacherAssignments={wizard.draft.copyTeacherAssignments}
                                    onToggleCopyTeacherAssignments={wizard.handleSetCopyTeacherAssignments}
                                    confirmExecute={wizard.confirmExecute}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Bottom Action Bar */}
            <footer
                className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                        {wizard.step > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => wizard.setStep((wizard.step - 1) as StepNumber)}
                            >
                                Sebelumnya
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Tutup
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={wizard.handleExportExcel}
                            disabled={wizard.loading || wizard.plannedMoves.length === 0}
                            className="sm:hidden min-h-[40px] min-w-[40px]"
                            title="Unduh Excel"
                            aria-label="Unduh Excel"
                        >
                            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={wizard.handleSaveDraft}
                            disabled={wizard.savingDraft || wizard.loading}
                            className="sm:hidden min-h-[40px]"
                        >
                            <Save className="w-4 h-4 mr-1" aria-hidden="true" />
                            {wizard.savingDraft ? 'Menyimpan...' : 'Draf'}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {wizard.step < 4 ? (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => wizard.setStep((wizard.step + 1) as StepNumber)}
                            >
                                Lanjut
                            </Button>
                        ) : (
                            wizard.isAdmin && !wizard.workspace?.appliedBatch && (
                                !wizard.confirmExecute ? (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => wizard.setConfirmExecute(true)}
                                        disabled={wizard.executing || wizard.plannedMoves.length === 0}
                                    >
                                        Simpan Kenaikan Kelas
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => wizard.setConfirmExecute(false)}
                                            disabled={wizard.executing}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={wizard.handleExecutePromotion}
                                            disabled={wizard.executing}
                                            className="bg-rose-600 hover:bg-rose-700 text-white"
                                        >
                                            {wizard.executing ? 'Menyimpan...' : 'Ya, Simpan Sekarang'}
                                        </Button>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            </footer>
        </div>,
        document.body
    );
};

export default GradePromotionModal;
