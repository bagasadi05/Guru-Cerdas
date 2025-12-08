import React from 'react';
import { Modal } from '../ui/Modal';
import { BrainCircuitIcon, CheckCircleIcon, AlertCircleIcon } from '../Icons';
import { AiAnalysis } from '../../types';

interface AiAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: AiAnalysis | null;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, isLoading, result }) => {
    return (
        <Modal title="Analisis Kehadiran AI" isOpen={isOpen} onClose={onClose} icon={<BrainCircuitIcon className="h-5 w-5 text-indigo-500" />}>
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Menganalisis data...
                </div>
            ) : result ? (
                <div className="space-y-4 text-sm">
                    {result.perfect_attendance.length > 0 && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Kehadiran Sempurna</h4>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{result.perfect_attendance.join(', ')}</p>
                        </div>
                    )}
                    {result.frequent_absentees.length > 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                            <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2"><AlertCircleIcon className="w-4 h-4" /> Sering Alpha</h4>
                            <ul className="space-y-1">{result.frequent_absentees.map(s => <li key={s.student_name} className="flex justify-between text-slate-700 dark:text-slate-300"><span>{s.student_name}</span> <span className="font-bold">{s.absent_days} hari</span></li>)}</ul>
                        </div>
                    )}
                    {result.pattern_warnings.length > 0 && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800">
                            <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2"><BrainCircuitIcon className="w-4 h-4" /> Pola Terdeteksi</h4>
                            <ul className="space-y-2">{result.pattern_warnings.map(p => <li key={p.pattern_description} className="text-slate-700 dark:text-slate-300"><p className="font-medium text-rose-600 dark:text-rose-400">{p.pattern_description}</p><p className="text-xs mt-1 text-slate-500">Siswa: {p.implicated_students.join(', ')}</p></li>)}</ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">Tidak ada hasil.</div>
            )}
        </Modal>
    );
};
