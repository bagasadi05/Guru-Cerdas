import React, { useMemo } from 'react';
import { GraduationCap, FileText, FileSpreadsheet } from 'lucide-react';
import { EnrollmentView, ExtracurricularGrade } from './types';

export type GradeDraft = {
    grade: string | null;
    score: string;
    description: string;
};

interface GradesTabProps {
    extracurricularId: string;
    enrollments: EnrollmentView[];
    gradesMap: Record<string, ExtracurricularGrade>;
    gradeDrafts: Record<string, GradeDraft>;
    onUpdateDraft: (key: string, patch: Partial<GradeDraft>) => void;
    onSaveGrade: (enrollment: EnrollmentView, patch?: Partial<GradeDraft>) => void;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

const GRADE_OPTIONS = ['A', 'B', 'C', 'D'] as const;

export const GradesTab: React.FC<GradesTabProps> = ({
    extracurricularId: _extracurricularId,
    enrollments,
    gradesMap,
    gradeDrafts,
    onUpdateDraft,
    onSaveGrade,
    onExportPDF,
    onExportExcel
}) => {
    const enrollmentsSortedByName = useMemo(() => {
        return [...enrollments].sort((a, b) => a.name.localeCompare(b.name));
    }, [enrollments]);

    const formatScoreInput = (score: number | null | undefined) => (score == null ? '' : String(score));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-500" />
                        Input Nilai & Evaluasi
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Berikan nilai akhir dan deskripsi perkembangan siswa (tersimpan otomatis).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onExportPDF}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        onClick={onExportExcel}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[25%]">Nama Siswa</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[20%]">Predikat</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">Nilai (0-100)</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[40%]">Deskripsi / Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {enrollments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
                                        Belum ada siswa yang terdaftar di ekstrakurikuler ini.
                                    </td>
                                </tr>
                            ) : (
                                enrollmentsSortedByName.map((enrollment) => {
                                    const key = `${enrollment.participantType}:${enrollment.participantId}`;
                                    const gradeData = gradesMap[key];
                                    const gradeDraft = gradeDrafts[key];
                                    
                                    const currentGrade = gradeDraft?.grade ?? gradeData?.grade ?? null;
                                    const currentScore = gradeDraft?.score ?? formatScoreInput(gradeData?.score);
                                    const currentDescription = gradeDraft?.description ?? gradeData?.description ?? '';

                                    return (
                                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-semibold text-slate-800 dark:text-white">{enrollment.name}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                    {enrollment.className || 'Tidak ada kelas'}
                                                </div>
                                                {enrollment.participantType === 'extracurricular_student' && (
                                                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        Siswa Ekskul
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex justify-center gap-1.5 flex-wrap">
                                                    {GRADE_OPTIONS.map((grade) => {
                                                        const isSelected = currentGrade === grade;
                                                        return (
                                                            <button
                                                                key={grade}
                                                                type="button"
                                                                onClick={() => {
                                                                    onUpdateDraft(key, { grade });
                                                                    onSaveGrade(enrollment, { grade });
                                                                }}
                                                                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                                                                    isSelected
                                                                        ? grade === 'A' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800' :
                                                                          grade === 'B' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' :
                                                                          grade === 'C' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800' :
                                                                          'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800'
                                                                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                                                }`}
                                                            >
                                                                {grade}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    value={currentScore}
                                                    onChange={(e) => onUpdateDraft(key, { score: e.target.value })}
                                                    onBlur={() => onSaveGrade(enrollment)}
                                                    placeholder="0-100"
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
                                                />
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <textarea
                                                    placeholder="Tulis deskripsi / evaluasi kemampuan siswa di sini..."
                                                    value={currentDescription}
                                                    onChange={(e) => onUpdateDraft(key, { description: e.target.value })}
                                                    onBlur={() => onSaveGrade(enrollment)}
                                                    rows={2}
                                                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm resize-y min-h-[60px]"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
