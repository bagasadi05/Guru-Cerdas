import React from 'react';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { gradeColors, aspectMeta } from './bintangConstants';
import type { BintangGrade } from '../../../services/bintangService';
import type { AspectPointsSummary } from '../../../services/bintangService';

interface AspectSectionEditorProps {
    aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN';
    scoreField: 'adab_score' | 'kedisiplinan_score' | 'kerapian_score';
    formValue: BintangGrade;
    notesValue: string;
    onScoreChange: (value: BintangGrade) => void;
    onNotesChange: (value: string) => void;
    editingStudent: any;
    getAspectSummary: (studentId: string) => AspectPointsSummary;
}

export const AspectSectionEditor: React.FC<AspectSectionEditorProps> = ({
    aspectKey,
    scoreField: _scoreField,
    formValue,
    notesValue,
    onScoreChange,
    onNotesChange,
    editingStudent,
    getAspectSummary,
}) => {
    const meta = aspectMeta[aspectKey];
    const Icon = meta.icon;
    const aspect = editingStudent ? getAspectSummary(editingStudent.id) : null;
    const data = aspect?.[aspectKey];

    return (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={meta.color} />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{meta.label}</span>
                {data && data.count > 0 && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {data.points} poin / {data.count} pelanggaran → Rekomendasi: <strong className={`${gradeColors[data.grade].split(' ')[1]}`}>{data.grade}</strong>
                    </span>
                )}
                {data && data.count === 0 && (
                    <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        ✓ Tidak ada pelanggaran
                    </span>
                )}
            </div>
            <div className="w-full sm:w-1/3 mt-2 sm:mt-0">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nilai</label>
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Catatan {meta.label}</label>
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
