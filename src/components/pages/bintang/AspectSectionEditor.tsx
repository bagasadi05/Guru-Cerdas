import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { gradeTextColors, aspectMeta } from './bintangConstants';
import type { BintangGrade } from '../../../services/bintangService';
import type { AspectPointsSummary } from '../../../services/bintangService';
import type { StudentViolationSummaryItem } from './bintangConstants';

interface AspectSectionEditorProps {
    aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN';
    scoreField: 'adab_score' | 'kedisiplinan_score' | 'kerapian_score';
    formValue: BintangGrade;
    notesValue: string;
    onScoreChange: (value: BintangGrade) => void;
    onNotesChange: (value: string) => void;
    onResetNotes?: () => void;
    editingStudent: any;
    getAspectSummary: (studentId: string) => AspectPointsSummary;
    studentViolations: StudentViolationSummaryItem[];
}

export const AspectSectionEditor: React.FC<AspectSectionEditorProps> = ({
    aspectKey,
    scoreField: _scoreField,
    formValue,
    notesValue,
    onScoreChange,
    onNotesChange,
    onResetNotes,
    editingStudent,
    getAspectSummary,
    studentViolations,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const meta = aspectMeta[aspectKey];
    const Icon = meta.icon;
    const aspect = editingStudent ? getAspectSummary(editingStudent.id) : null;
    const data = aspect?.[aspectKey];

    const aspectViolations = studentViolations.filter(v => v.bintangAspect === aspectKey);

    return (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={meta.color} />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{meta.label}</span>
                {data && data.count > 0 && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {data.points} poin / {data.count} pelanggaran → Rekomendasi: <strong className={`${gradeTextColors[data.grade]}`}>{data.grade}</strong>
                    </span>
                )}
                {data && data.count === 0 && (
                    <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        ✓ Tidak ada pelanggaran
                    </span>
                )}
            </div>
            
            {aspectViolations.length > 0 && (
                <div className="mb-4 text-sm">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-xs transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Lihat {aspectViolations.length} detail pelanggaran {meta.label.toLowerCase()}
                    </button>
                    
                    {isExpanded && (
                        <div className="mt-2 space-y-2 border-l-2 border-brand-200 dark:border-brand-800 pl-3">
                            {aspectViolations.map((v, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 p-2 shadow-sm text-xs">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v.description}</span>
                                        <span className="text-slate-500">{v.date ? new Date(v.date).toLocaleDateString('id-ID') : ''}</span>
                                    </div>
                                    {v.context_notes && (
                                        <p className="text-slate-600 dark:text-slate-400 mb-1">
                                            <span className="font-medium text-slate-500 dark:text-slate-500">Kronologi:</span> {v.context_notes}
                                        </p>
                                    )}
                                    {v.follow_up_notes && (
                                        <p className="text-slate-600 dark:text-slate-400">
                                            <span className="font-medium text-slate-500 dark:text-slate-500">Tindak Lanjut:</span> {v.follow_up_notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="w-full sm:w-1/3 mt-2 sm:mt-0">
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Nilai</label>
                    {data && formValue !== data.grade && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                            Penyesuaian Manual
                        </span>
                    )}
                </div>
                <CustomDropdown
                    value={formValue}
                    onChange={(val) => onScoreChange(val as BintangGrade)}
                    options={[
                        { value: 'A', label: 'A (Sangat Baik)' },
                        { value: 'B', label: 'B (Baik)' },
                        { value: 'C', label: 'C (Cukup)' },
                        { value: 'D', label: 'D (Kurang)' },
                    ]}
                />
            </div>
            <div className="w-full mt-3">
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Catatan {meta.label}</label>
                    {onResetNotes && (
                        <button
                            type="button"
                            onClick={onResetNotes}
                            className="text-[10px] text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
                            title={`Kembalikan catatan ${meta.label.toLowerCase()} ke deskripsi otomatis sistem`}
                        >
                            <RotateCcw size={10} />
                            <span>Reset Otomatis</span>
                        </button>
                    )}
                </div>
                <textarea
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    rows={2}
                    value={notesValue}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder={`Tuliskan catatan khusus untuk ${meta.label.toLowerCase()}...`}
                />
            </div>
        </div>
    );
};
