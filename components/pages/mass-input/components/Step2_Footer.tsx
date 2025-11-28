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
        <footer className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 md:-mx-8 md:-mb-8 mt-6 z-20">
            <div className="bg-gray-950/70 backdrop-blur-lg border-t border-white/10 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-300">{summaryText}</p>
                    {(mode !== 'subject_grade' && selectedStudentIds.size > 0) || (mode === 'subject_grade' && gradedCount > 0) ? (
                        <Button variant="ghost" size="sm" onClick={() => mode === 'subject_grade' ? setScores({}) : setSelectedStudentIds(new Set())}>
                            <XCircleIcon className="w-4 h-4 mr-1" /> Bersihkan
                        </Button>
                    ) : null}
                </div>
                {isExporting ? (
                    <div className="w-full sm:w-64 text-center">
                        <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-purple-200/20">
                                <div style={{ width: exportProgress }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"></div>
                            </div>
                            <p className="text-xs text-purple-200">{exportProgress}</p>
                        </div>
                    </div>
                ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitDisabled} title={submitButtonTooltip} className="w-full sm:w-auto" variant={mode === 'delete_subject_grade' ? 'destructive' : 'default'}>
                        {isSubmitting || isDeleting ? 'Memproses...' : mode === 'delete_subject_grade' ? 'Hapus Nilai Terpilih' : (mode?.includes('print') || mode?.includes('report')) ? 'Cetak Laporan' : 'Simpan Data'}
                    </Button>
                )}
            </div>
        </footer>
    );
};
