import React from 'react';
import { Button } from '../../../ui/Button';
import { XCircleIcon } from '../../../Icons';
import { InputMode } from '../types';

interface Step2_FooterProps {
    summaryText: string;
    mode: InputMode | null;
    selectedStudentIds: Set<string>;
    gradedCount: number;
    setScores: (scores: Record<string, string>) => void;
    setSelectedStudentIds: (ids: Set<string>) => void;
    isExporting: boolean;
    exportProgress: string;
    handleSubmit: () => void;
    isSubmitDisabled: boolean;
    submitButtonTooltip: string;
    isSubmitting: boolean;
    isDeleting: boolean;
}

export const Step2_Footer: React.FC<Step2_FooterProps> = ({
    summaryText, mode, selectedStudentIds, gradedCount, setScores, setSelectedStudentIds,
    isExporting, exportProgress, handleSubmit, isSubmitDisabled, submitButtonTooltip,
    isSubmitting, isDeleting
}) => {
    return (
        <footer className="sticky bottom-4 sm:bottom-6 md:bottom-8 z-30 animate-fade-in-up">
            <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl shadow-black/50 mx-auto max-w-4xl ring-1 ring-white/10">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-sm font-medium text-indigo-200">{summaryText}</p>
                    </div>
                    {(mode !== 'subject_grade' && selectedStudentIds.size > 0) || (mode === 'subject_grade' && gradedCount > 0) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => mode === 'subject_grade' ? setScores({}) : setSelectedStudentIds(new Set())}
                            className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <XCircleIcon className="w-4 h-4 mr-1" /> Bersihkan
                        </Button>
                    ) : null}
                </div>

                {isExporting ? (
                    <div className="w-full sm:w-64 text-center">
                        <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-white/10">
                                <div style={{ width: exportProgress }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 relative">
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-indigo-300 animate-pulse">{exportProgress} - Memproses...</p>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        title={submitButtonTooltip}
                        className={`
                            w-full sm:w-auto font-bold tracking-wide shadow-lg transition-all duration-300 transform hover:-translate-y-1
                            ${mode === 'delete_subject_grade'
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/20'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-900/20'
                            }
                        `}
                    >
                        {isSubmitting || isDeleting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Memproses...
                            </span>
                        ) : mode === 'delete_subject_grade' ? 'Hapus Nilai Terpilih' : (mode?.includes('print') || mode?.includes('report')) ? 'Cetak Laporan' : 'Simpan Data'}
                    </Button>
                )}
            </div>
        </footer>
    );
};
