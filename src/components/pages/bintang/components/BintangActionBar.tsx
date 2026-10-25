import React, { useState } from 'react';
import {
    Sparkles,
    ShieldAlert,
    ChevronDown,
    Eye,
    PlusCircle,
    Download,
    Printer,
    FileSpreadsheet,
    Zap,
    RotateCcw,
    Send,
} from 'lucide-react';
import { Button } from '../../../ui/Button';
import type { UseBintangEvaluationReturn } from '../hooks/useBintangEvaluation';
import type { AspectPointsSummary } from '../../../../services/bintangService';

interface BintangActionBarProps {
    isWalas: boolean;
    studentsCount: number;
    isLoading: boolean;
    loadError: string | null;
    evalHook: UseBintangEvaluationReturn;
    getAspectSummary: (studentId: string) => AspectPointsSummary;
    onOpenAddKeaktifan: () => void;
    onOpenAddViolation: () => void;
    onOpenObservation: () => void;
    onOpenMentoring: () => void;
    onOpenBulkExport: () => void;
}

export const BintangActionBar: React.FC<BintangActionBarProps> = ({
    isWalas,
    studentsCount,
    isLoading,
    loadError,
    evalHook,
    getAspectSummary,
    onOpenAddKeaktifan,
    onOpenAddViolation,
    onOpenObservation,
    onOpenMentoring,
    onOpenBulkExport,
}) => {
    const [showMoreActions, setShowMoreActions] = useState(false);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            {/* Kiri: Aksi Input Utama */}
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    onClick={onOpenAddKeaktifan}
                    className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 cursor-pointer active:scale-95 duration-150"
                >
                    <Sparkles size={15} />
                    <span>+ Poin Keaktifan</span>
                </Button>
                <Button
                    onClick={onOpenAddViolation}
                    className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm shadow-rose-600/20 cursor-pointer active:scale-95 duration-150"
                >
                    <ShieldAlert size={15} />
                    <span>+ Pelanggaran</span>
                </Button>

                {/* Tombol sekunder (toggle) */}
                <div className="relative">
                    <Button
                        variant="outline"
                        onClick={() => setShowMoreActions((v) => !v)}
                        className="flex items-center gap-1.5 text-sm h-10 px-3 font-medium rounded-xl border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 duration-150"
                        title="Aksi lainnya"
                    >
                        <span className="text-slate-600 dark:text-slate-300">Lainnya</span>
                        <ChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform duration-200 ${
                                showMoreActions ? 'rotate-180' : ''
                            }`}
                        />
                    </Button>
                    {showMoreActions && (
                        <div className="absolute left-0 top-full mt-1.5 z-20 min-w-[180px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenObservation();
                                    setShowMoreActions(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
                            >
                                <Eye size={15} className="text-slate-400" /> Observasi Harian
                            </button>
                            {isWalas && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenMentoring();
                                        setShowMoreActions(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <PlusCircle size={15} className="text-slate-400" /> Catat Pembinaan
                                </button>
                            )}
                            {isWalas && <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />}
                            {isWalas && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenBulkExport();
                                        setShowMoreActions(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <Download size={15} /> Export Bulk...
                                </button>
                            )}
                            {isWalas && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        evalHook.handleDownloadClassPdf();
                                        setShowMoreActions(false);
                                    }}
                                    disabled={evalHook.isDownloadingClass || evalHook.isDownloadingBulk}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <Printer size={15} className="text-slate-400" />{' '}
                                    {evalHook.isDownloadingClass ? 'Proses...' : 'Cetak Rapor Kelas'}
                                </button>
                            )}
                            {isWalas && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        evalHook.handleExportExcel();
                                        setShowMoreActions(false);
                                    }}
                                    disabled={evalHook.isExportingExcel || studentsCount === 0}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <FileSpreadsheet size={15} className="text-slate-400" />{' '}
                                    {evalHook.isExportingExcel ? 'Proses...' : 'Export Rekap Excel'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Kanan: Evaluasi Bulanan (Walas only) */}
            {isWalas && (
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => evalHook.handleGenerateAll(getAspectSummary)}
                        disabled={
                            evalHook.isGenerating ||
                            studentsCount === 0 ||
                            isLoading ||
                            Boolean(loadError)
                        }
                        variant="outline"
                        className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium border-brand-200 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl cursor-pointer active:scale-95 duration-150"
                    >
                        <Zap size={16} />
                        <span className="hidden sm:inline">
                            {evalHook.isGenerating ? 'Proses...' : 'Generate'}
                        </span>
                    </Button>
                    {evalHook.evalStats.published > 0 && (
                        <Button
                            onClick={evalHook.handleUnpublish}
                            disabled={evalHook.isUnpublishing}
                            variant="outline"
                            className="flex items-center gap-1.5 text-sm h-10 px-3.5 font-medium border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-xl shadow-sm cursor-pointer active:scale-95 duration-150"
                            title="Kembalikan semua rapor terbit ke status Draft agar bisa diedit kembali"
                        >
                            <RotateCcw size={15} />
                            <span className="hidden sm:inline">
                                {evalHook.isUnpublishing ? 'Membatalkan...' : 'Batal Publikasi'}
                            </span>
                            <span className="sm:hidden">Batal</span>
                        </Button>
                    )}
                    <Button
                        onClick={evalHook.handlePublish}
                        disabled={
                            evalHook.evalStats.filled === 0 ||
                            evalHook.isPublishing ||
                            isLoading ||
                            Boolean(loadError)
                        }
                        className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 text-sm h-10 px-4 font-medium rounded-xl shadow-sm shadow-brand-600/20 cursor-pointer active:scale-95 duration-150"
                    >
                        <Send size={16} />
                        <span>Publikasi</span>
                    </Button>
                </div>
            )}
        </div>
    );
};
