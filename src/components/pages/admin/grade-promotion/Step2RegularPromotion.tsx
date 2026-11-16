import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RETAINED_TARGET } from '../../../../utils/gradePromotionEngine';
import type {
    GradePromotionWorkspaceData,
    PromotionDraftState,
} from '../../../../services/gradePromotionService';

interface RegularClassGroup {
    grade: number;
    label: string;
    classes: GradePromotionWorkspaceData['classes'];
}

interface Step2RegularPromotionProps {
    workspace: GradePromotionWorkspaceData | null;
    draft: PromotionDraftState;
    groupedRegularClasses: RegularClassGroup[];
    expandedClassId: string | null;
    onToggleExpandClass: (classId: string | null) => void;
    onSetClassTargetOverride: (classId: string, targetClassId: string) => void;
    onToggleRetainedStudent: (studentId: string, isCurrentlyRetained: boolean) => void;
}

/**
 * Step 2: Regular promotion class mapping (Grades 1, 2, 4, and 5) and per-student retention exceptions.
 */
export const Step2RegularPromotion: React.FC<Step2RegularPromotionProps> = ({
    workspace,
    draft,
    groupedRegularClasses,
    expandedClassId,
    onToggleExpandClass,
    onSetClassTargetOverride,
    onToggleRetainedStudent,
}) => {
    return (
        <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Kenaikan Rombel Kelas 1, 2, 4, dan 5
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Setiap rombel otomatis dipetakan naik satu tingkat. Klik nama kelas jika ada siswa yang tinggal kelas.
                </p>
            </div>

            <div className="space-y-5">
                {groupedRegularClasses.map(group => (
                    <div key={group.grade} className="space-y-2.5">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                            {group.label}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.classes.map(cls => {
                                const defaultTargetId = workspace?.autoMap.classMapping[cls.id]?.toClassId || '';
                                const selectedTargetId = draft.classTargetOverrides[cls.id] || defaultTargetId;
                                const classStudents = workspace?.students.filter(s => s.class_id === cls.id) || [];
                                const retainedInThisClass = classStudents.filter(
                                    s => draft.regularOverrides[s.id] === RETAINED_TARGET
                                ).length;
                                const isExpanded = expandedClassId === cls.id;

                                return (
                                    <div
                                        key={cls.id}
                                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
                                    >
                                        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                onClick={() => onToggleExpandClass(isExpanded ? null : cls.id)}
                                                className="min-h-[40px] flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer rounded-lg px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                            {cls.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                                            ({classStudents.length} siswa)
                                                        </span>
                                                    </div>
                                                    {retainedInThisClass > 0 && (
                                                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                                                            {retainedInThisClass} siswa tinggal kelas
                                                        </p>
                                                    )}
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                                    Tujuan:
                                                </span>
                                                <select
                                                    aria-label={`Pilih kelas tujuan untuk ${cls.name}`}
                                                    value={selectedTargetId}
                                                    onChange={e => onSetClassTargetOverride(cls.id, e.target.value)}
                                                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                                >
                                                    <option value="">Pilih kelas tujuan</option>
                                                    {workspace?.classes
                                                        .filter(c => c.id !== cls.id)
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>

                                        {isExpanded && classStudents.length > 0 && (
                                            <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 bg-slate-50 dark:bg-slate-900/40 px-4 py-2">
                                                {classStudents.map((student, idx) => {
                                                    const isRetained = draft.regularOverrides[student.id] === RETAINED_TARGET;
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className="py-1.5 flex items-center justify-between gap-2 text-xs"
                                                        >
                                                            <span className="text-slate-800 dark:text-slate-200">
                                                                <span className="text-slate-400 tabular-nums mr-2">
                                                                    {idx + 1}.
                                                                </span>
                                                                {student.name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => onToggleRetainedStudent(student.id, isRetained)}
                                                                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                                                                    !isRetained
                                                                        ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                                }`}
                                                            >
                                                                {!isRetained ? 'Naik Kelas' : 'Tinggal Kelas'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
