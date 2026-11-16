import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { RETAINED_TARGET } from '../../../../utils/gradePromotionEngine';
import type {
    GradePromotionWorkspaceData,
    PromotionDraftState,
} from '../../../../services/gradePromotionService';

interface Grade4Counters {
    byClassId: Record<string, { totalStudents: number; maleCount: number; femaleCount: number; avgScore: number | null }>;
    unassignedCount: number;
    retainedCount: number;
    totalGrade3Students: number;
}

interface Step3Grade4AllocationProps {
    workspace: GradePromotionWorkspaceData | null;
    draft: PromotionDraftState;
    grade4Counters: Grade4Counters;
    filteredGrade3Students: GradePromotionWorkspaceData['grade3DeliberationStudents'];
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    sourceClassFilter: string;
    onSourceClassFilterChange: (value: string) => void;
    placementFilter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED';
    onPlacementFilterChange: (value: 'ALL' | 'UNASSIGNED' | 'ASSIGNED') => void;
    onGenerateBalancedDraft: () => void;
    onAssignStudent: (studentId: string, targetClassId: string) => void;
}

/**
 * Step 3: Collaborative rolling deliberation assigning Grade 3 students into balanced Grade 4 classes.
 */
export const Step3Grade4Allocation: React.FC<Step3Grade4AllocationProps> = ({
    workspace,
    draft,
    grade4Counters,
    filteredGrade3Students,
    searchQuery,
    onSearchQueryChange,
    sourceClassFilter,
    onSourceClassFilterChange,
    placementFilter,
    onPlacementFilterChange,
    onGenerateBalancedDraft,
    onAssignStudent,
}) => {
    return (
        <div className="space-y-4">
            {/* Compact Distribution Summary Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                            Pembagian Rombel Kelas 4
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pilih kelas tujuan untuk setiap siswa Kelas 3 atau gunakan tombol bagi rata otomatis sebagai draf awal.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <span
                            className={`text-xs font-medium px-2.5 py-1 rounded border tabular-nums ${
                                grade4Counters.unassignedCount === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                        >
                            {grade4Counters.unassignedCount === 0
                                ? 'Semua siswa sudah ditempatkan'
                                : `${grade4Counters.unassignedCount} siswa belum ditempatkan`}
                        </span>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onGenerateBalancedDraft}
                        >
                            Bagi Rata Otomatis
                        </Button>
                    </div>
                </div>

                {/* Compact Tabular Summary of Target Grade 4 Classes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    {workspace?.autoMap.grade4TargetClasses.map(cls => {
                        const stat = grade4Counters.byClassId[cls.id];
                        const total = stat?.totalStudents || 0;
                        const male = stat?.maleCount || 0;
                        const female = stat?.femaleCount || 0;
                        return (
                            <div
                                key={cls.id}
                                className="px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs tabular-nums"
                            >
                                <div>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                        {cls.name}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                                        (L: {male}, P: {female})
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {total} siswa
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                                        • Rata nilai: {stat?.avgScore || '-'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearchQueryChange(e.target.value)}
                        placeholder="Cari nama atau NIS siswa kelas 3..."
                        aria-label="Cari nama atau NIS siswa kelas 3"
                        className="w-full min-h-[40px] pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label="Filter Kelas Asal"
                        value={sourceClassFilter}
                        onChange={e => onSourceClassFilterChange(e.target.value)}
                        className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                        <option value="ALL">
                            Semua Kelas 3 ({workspace?.grade3DeliberationStudents.length || 0})
                        </option>
                        {workspace?.autoMap.grade3SourceClasses.map(c => (
                            <option key={c.id} value={c.id}>
                                Asal: {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filter Status Penempatan"
                        value={placementFilter}
                        onChange={e => onPlacementFilterChange(e.target.value as 'ALL' | 'UNASSIGNED' | 'ASSIGNED')}
                        className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="UNASSIGNED">
                            Belum Ditempatkan ({grade4Counters.unassignedCount})
                        </option>
                        <option value="ASSIGNED">Sudah Ditempatkan</option>
                    </select>
                </div>
            </div>

            {/* Student Allocation Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="py-3 px-4 font-medium w-12">No</th>
                                <th className="py-3 px-4 font-medium">Nama Siswa</th>
                                <th className="py-3 px-3 font-medium text-center">Kelas Asal</th>
                                <th className="py-3 px-3 font-medium text-center">L/P</th>
                                <th className="py-3 px-3 font-medium text-center">Rata-rata Nilai</th>
                                <th className="py-3 px-3 font-medium text-center">Poin Pelanggaran</th>
                                <th className="py-3 px-4 font-medium text-right">Penempatan Kelas 4</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredGrade3Students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada data siswa Kelas 3 yang sesuai dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredGrade3Students.map((student, idx) => {
                                    const currentTarget = draft.grade3Allocations[student.id];
                                    return (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                                        >
                                            <td className="py-2.5 px-4 text-slate-500 tabular-nums">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">
                                                {student.fromClassName}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">
                                                {student.gender === 'Laki-laki' ? 'L' : 'P'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-medium text-slate-900 dark:text-white tabular-nums">
                                                {student.avgScore ?? '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center tabular-nums">
                                                {student.violationPoints > 0 ? (
                                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                                        {student.violationPoints} poin
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 gap-0.5">
                                                    {workspace?.autoMap.grade4TargetClasses.map(targetCls => {
                                                        const isSelected = currentTarget === targetCls.id;
                                                        return (
                                                            <button
                                                                key={targetCls.id}
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                onClick={() => onAssignStudent(student.id, targetCls.id)}
                                                                className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                                                                    isSelected
                                                                        ? 'bg-emerald-600 text-white'
                                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                {targetCls.name.replace(/^kelas\s*/i, '')}
                                                            </button>
                                                        );
                                                    })}
                                                    <button
                                                        type="button"
                                                        aria-pressed={currentTarget === RETAINED_TARGET}
                                                        onClick={() => onAssignStudent(student.id, RETAINED_TARGET)}
                                                        className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                                                            currentTarget === RETAINED_TARGET
                                                                ? 'bg-rose-600 text-white'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                                        }`}
                                                    >
                                                        Tinggal
                                                    </button>
                                                </div>
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
