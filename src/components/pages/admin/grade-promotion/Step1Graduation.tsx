import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../../ui/Button';
import type {
    GradePromotionWorkspaceData,
    PromotionDraftState,
} from '../../../../services/gradePromotionService';

interface Step1GraduationProps {
    workspace: GradePromotionWorkspaceData | null;
    draft: PromotionDraftState;
    grade6Students: GradePromotionWorkspaceData['students'];
    filteredGrade6Students: GradePromotionWorkspaceData['students'];
    classById: Map<string, GradePromotionWorkspaceData['classes'][number]>;
    grade6Search: string;
    onSearchChange: (value: string) => void;
    grade6ClassFilter: string;
    onClassFilterChange: (value: string) => void;
    onToggleGraduateStudent: (studentId: string) => void;
    onGraduateAll: () => void;
}

/**
 * Step 1: Grade 6 graduation status & retention override table.
 */
export const Step1Graduation: React.FC<Step1GraduationProps> = ({
    workspace,
    draft,
    grade6Students,
    filteredGrade6Students,
    classById,
    grade6Search,
    onSearchChange,
    grade6ClassFilter,
    onClassFilterChange,
    onToggleGraduateStudent,
    onGraduateAll,
}) => {
    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Kelulusan Siswa Kelas 6
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Siswa yang diluluskan akan dipindahkan ke daftar alumni sehingga ruang Kelas 6 dapat diisi oleh siswa Kelas 5 yang naik.
                    </p>
                </div>
                {draft.excludedGraduationStudentIds.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onGraduateAll}
                        className="shrink-0"
                    >
                        Luluskan Semua ({grade6Students.length})
                    </Button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                        type="text"
                        value={grade6Search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Cari nama atau NIS siswa kelas 6..."
                        aria-label="Cari nama atau NIS siswa kelas 6"
                        className="w-full min-h-[40px] pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        type="button"
                        onClick={() => onClassFilterChange('ALL')}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                            grade6ClassFilter === 'ALL'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        Semua ({grade6Students.length})
                    </button>
                    {workspace?.autoMap.grade6GraduationClasses.map(c => {
                        const count = grade6Students.filter(s => s.class_id === c.id).length;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => onClassFilterChange(c.id)}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                                    grade6ClassFilter === c.id
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {c.name} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {filteredGrade6Students.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        Tidak ada data siswa Kelas 6 yang sesuai pencarian.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4 font-medium w-12">No</th>
                                    <th className="py-3 px-4 font-medium">Nama Siswa</th>
                                    <th className="py-3 px-4 font-medium">Kelas</th>
                                    <th className="py-3 px-4 font-medium">Jenis Kelamin</th>
                                    <th className="py-3 px-4 font-medium text-right">Status Kelulusan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredGrade6Students.map((student, idx) => {
                                    const isExcluded = draft.excludedGraduationStudentIds.includes(student.id);
                                    const clsName = classById.get(student.class_id)?.name || 'Kelas 6';
                                    return (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                                        >
                                            <td className="py-3 px-4 text-slate-500 tabular-nums">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {clsName}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {student.gender}
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleGraduateStudent(student.id)}
                                                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                                                        !isExcluded
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    }`}
                                                >
                                                    {!isExcluded ? 'Lulus' : 'Tinggal Kelas'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
