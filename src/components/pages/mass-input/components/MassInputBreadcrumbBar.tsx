import React from 'react';
import { Button } from '../../../ui/Button';
import { School, BookOpen, Star, AlertTriangle, Sparkles, SlidersHorizontal } from 'lucide-react';
import { InputMode, ClassRow } from '../types';
import { violationList } from '../../../../services/violations.data';

interface MassInputBreadcrumbBarProps {
    mode: InputMode | null;
    isConfigOpen: boolean;
    onOpenConfig: () => void;
    selectedClass: string;
    classes: ClassRow[] | undefined;
    subjectGradeInfo: { subject: string; assessment_name: string };
    quizInfo: { name: string; subject: string };
    selectedViolationCode: string;
    attitudeCategory?: string;
}

export const MassInputBreadcrumbBar: React.FC<MassInputBreadcrumbBarProps> = ({
    mode,
    isConfigOpen,
    onOpenConfig,
    selectedClass,
    classes,
    subjectGradeInfo,
    quizInfo,
    selectedViolationCode,
    attitudeCategory,
}) => {
    if (isConfigOpen || mode === 'violation_export') {
        return null;
    }

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 animate-fade-in-down shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 font-bold text-brand-700 dark:text-brand-300 border border-brand-200/70 dark:border-brand-500/20">
                    <School className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span>Kelas: {classes?.find(c => c.id === selectedClass)?.name || '-'}</span>
                </span>
                {mode === 'subject_grade' && subjectGradeInfo.subject && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 animate-scale-in">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Mapel: {subjectGradeInfo.subject} ({subjectGradeInfo.assessment_name || 'Penilaian'})</span>
                    </span>
                )}
                {mode === 'quiz' && quizInfo.name && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/20 animate-scale-in">
                        <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Keaktifan: +1 Poin • {quizInfo.name} ({quizInfo.subject || 'Umum'})</span>
                    </span>
                )}
                {mode === 'violation' && selectedViolationCode && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-500/20 animate-scale-in">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Pelanggaran: {violationList.find(v => v.code === selectedViolationCode)?.description || selectedViolationCode}</span>
                    </span>
                )}
                {mode === 'attitude' && attitudeCategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 animate-scale-in">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Sikap: {attitudeCategory} (+1 Poin)</span>
                    </span>
                )}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={onOpenConfig}
                className="rounded-xl border-brand-200 dark:border-slate-700 text-brand-600 dark:text-brand-300 bg-white hover:bg-brand-50/50 dark:bg-slate-800 hover:dark:bg-slate-700 active:scale-95 transition-all text-xs font-bold inline-flex items-center gap-1.5 h-8 px-3"
            >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Ubah Konfigurasi</span>
            </Button>
        </div>
    );
};
