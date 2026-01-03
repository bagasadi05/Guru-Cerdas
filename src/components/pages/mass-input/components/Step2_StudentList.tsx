import React, { useState, useMemo } from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { SearchIcon, CheckSquareIcon, BarChartIcon } from '../../../Icons';
import { FilterPills } from './FilterPills';
import { StudentRow, InputMode, StudentFilter, AcademicRecordRow } from '../types';
import { useGridNavigation } from '../../../../hooks/useKeyboardShortcuts';
import { StudentSortControls, GroupHeader, sortStudents, groupStudents, SortField, SortDirection, GroupBy } from '../../../ui/StudentSortControls';
import { GradeDistributionMini } from '../../../ui/GradeDistributionChart';

interface Step2_StudentListProps {
    mode: InputMode | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterOptions: { value: StudentFilter; label: string }[];
    studentFilter: StudentFilter;
    setStudentFilter: (filter: StudentFilter) => void;
    isLoadingStudents: boolean;
    students: StudentRow[];
    isAllSelected: boolean;
    handleSelectAllStudents: (checked: boolean) => void;
    selectedStudentIds: Set<string>;
    handleStudentSelect: (id: string) => void;
    scores: Record<string, string>;
    handleScoreChange: (id: string, value: string) => void;
    existingGrades: AcademicRecordRow[] | undefined;
}

export const Step2_StudentList: React.FC<Step2_StudentListProps> = ({
    mode, searchTerm, setSearchTerm, filterOptions, studentFilter, setStudentFilter,
    isLoadingStudents, students, isAllSelected, handleSelectAllStudents,
    selectedStudentIds, handleStudentSelect, scores, handleScoreChange, existingGrades
}) => {
    // Sorting and Grouping State
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'index',
        direction: 'asc',
    });
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [showStats, setShowStats] = useState(false);

    // Apply sorting
    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return sortStudents(students, scores, sortConfig);
    }, [students, scores, sortConfig]);

    // Apply grouping
    const groupedStudents = useMemo(() => {
        if (mode !== 'subject_grade') {
            return [{ title: 'Semua Siswa', students: sortedStudents, color: 'indigo' }];
        }
        return groupStudents(sortedStudents, scores, groupBy);
    }, [sortedStudents, scores, groupBy, mode]);

    // Navigation for inputs
    const flatStudentList = useMemo(() => {
        return groupedStudents.flatMap(group => group.students);
    }, [groupedStudents]);

    const { registerRef, handleKeyDown, focusItem } = useGridNavigation<HTMLInputElement>(
        flatStudentList.length,
        {
            columnsPerRow: 1,
            enabled: mode === 'subject_grade'
        }
    );

    // Auto-focus first input when list changes
    React.useEffect(() => {
        if (mode === 'subject_grade' && flatStudentList.length > 0) {
            // Small timeout to allow render
            setTimeout(() => focusItem(0), 100);
        }
    }, [mode, flatStudentList.length, focusItem]);

    return (
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-xl shadow-indigo-500/10 animate-fade-in-right">
            {/* Header with Search and Filters */}
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-3 sm:space-y-4 bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md">
                {/* Search */}
                <div className="relative w-full group">
                    <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-300 absolute top-1/2 left-3 sm:left-4 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400" />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Cari nama siswa..."
                        className="pl-10 sm:pl-12 w-full h-10 sm:h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                    />
                </div>

                {/* Filter Pills - Horizontal scroll on mobile */}
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    <FilterPills options={filterOptions} currentValue={studentFilter} onFilterChange={setStudentFilter} />
                </div>

                {/* Sorting and Grouping Controls - Only for subject_grade mode */}
                {mode === 'subject_grade' && students && students.length > 0 && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                        <StudentSortControls
                            sortConfig={sortConfig}
                            onSortChange={setSortConfig}
                            groupBy={groupBy}
                            onGroupByChange={setGroupBy}
                            showGrouping={true}
                        />

                        {/* Quick Stats Toggle */}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-fit ${showStats
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                                }`}
                        >
                            <BarChartIcon className="w-3 h-3" />
                            Statistik
                        </button>
                    </div>
                )}

                {/* Mini Stats Display */}
                {showStats && mode === 'subject_grade' && (
                    <div className="pt-2">
                        <GradeDistributionMini scores={scores} kkm={75} />
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {isLoadingStudents ? (
                    <div className="flex flex-col items-center justify-center h-64 text-indigo-600 dark:text-indigo-200">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Memuat data siswa...</p>
                    </div>
                ) : students && students.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-green-600 dark:text-green-200">
                                        <th className="p-4 text-left w-14 font-bold tracking-wide uppercase text-xs">
                                            {mode !== 'subject_grade' && (
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    onChange={e => handleSelectAllStudents(e.target.checked)}
                                                    className="border-white/30 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                                />
                                            )}
                                        </th>
                                        <th className="p-4 text-left font-bold tracking-wide uppercase text-xs">Nama Siswa</th>
                                        <th className="p-4 text-left font-bold tracking-wide uppercase text-xs">
                                            {mode === 'subject_grade' ? 'Input Nilai' : (mode === 'academic_print' || mode === 'delete_subject_grade') ? 'Nilai Saat Ini' : 'Status'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedStudents.map((group) => (
                                        <React.Fragment key={group.title}>
                                            {groupBy !== 'none' && (
                                                <tr>
                                                    <td colSpan={3} className="pt-4 pb-2">
                                                        <GroupHeader title={group.title} count={group.students.length} color={group.color} />
                                                    </td>
                                                </tr>
                                            )}
                                            {group.students.map((s: StudentRow) => {
                                                const globalIndex = flatStudentList.findIndex(st => st.id === s.id);
                                                const isSelected = selectedStudentIds.has(s.id);
                                                const gradeRecord = (mode === 'delete_subject_grade' || mode === 'academic_print') ? (existingGrades || []).find(g => g.student_id === s.id) : null;
                                                const hasGrade = !!gradeRecord;
                                                const hasScore = mode === 'subject_grade' && scores[s.id]?.trim();

                                                return (
                                                    <tr
                                                        key={s.id}
                                                        onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined}
                                                        className={`
                                                            group transition-all duration-300 rounded-xl
                                                            ${(isSelected || hasScore)
                                                                ? 'bg-green-100 dark:bg-green-500/20 shadow-lg shadow-green-500/10 border-transparent'
                                                                : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:shadow-md border-transparent'
                                                            }
                                                            ${mode !== 'subject_grade' ? 'cursor-pointer' : ''}
                                                        `}
                                                    >
                                                        <td className="p-4 rounded-l-xl border-y border-l border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                            {mode !== 'subject_grade' && (
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onChange={() => handleStudentSelect(s.id)}
                                                                    disabled={mode === 'delete_subject_grade' && !hasGrade}
                                                                    className="border-slate-300 dark:border-white/30 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="p-4 border-y border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative">
                                                                    <div className="absolute inset-0 bg-green-500 blur-md opacity-0 group-hover:opacity-30 transition-opacity rounded-full"></div>
                                                                    <img
                                                                        src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`}
                                                                        alt={s.name}
                                                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 relative z-10"
                                                                    />
                                                                </div>
                                                                <span className={`font-medium text-base ${isSelected || hasScore ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-green-100'}`}>{s.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 rounded-r-xl border-y border-r border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                            {mode === 'subject_grade' ?
                                                                <div className="relative">
                                                                    <Input
                                                                        ref={(el) => registerRef(globalIndex, el)}
                                                                        onKeyDown={(e) => handleKeyDown(e, globalIndex)}
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        min="0"
                                                                        max="100"
                                                                        value={scores[s.id] || ''}
                                                                        onChange={e => handleScoreChange(s.id, e.target.value)}
                                                                        placeholder=""
                                                                        className={`w-24 text-center font-bold text-lg h-10 transition-all ${scores[s.id] ? 'bg-green-100 dark:bg-green-500/30 border-green-400 text-green-900 dark:text-white' : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70'}`}
                                                                    />
                                                                </div> :
                                                                (mode === 'academic_print' || mode === 'delete_subject_grade') ?
                                                                    <span className={`font-bold px-4 py-2 rounded-lg text-sm ${hasGrade ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-500 border border-slate-200 dark:border-white/5'}`}>
                                                                        {hasGrade ? gradeRecord?.score : 'N/A'}
                                                                    </span> :
                                                                    isSelected ?
                                                                        <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-400/20 w-fit">
                                                                            <CheckSquareIcon className="w-4 h-4" />Terpilih
                                                                        </span> :
                                                                        <span className="text-slate-400 dark:text-white/30 text-sm italic">Belum dipilih</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {flatStudentList.map((s: StudentRow) => {
                                const globalIndex = flatStudentList.findIndex(st => st.id === s.id);
                                const isSelected = selectedStudentIds.has(s.id);
                                const gradeRecord = (mode === 'delete_subject_grade' || mode === 'academic_print') ? (existingGrades || []).find(g => g.student_id === s.id) : null;
                                const hasGrade = !!gradeRecord;
                                const hasScore = mode === 'subject_grade' && scores[s.id]?.trim();

                                return (
                                    <div
                                        key={s.id}
                                        onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined}
                                        className={`
                                            bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all duration-300
                                            ${(isSelected || hasScore)
                                                ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                                : 'border-slate-200 dark:border-white/10'
                                            } 
                                            ${mode !== 'subject_grade' ? 'cursor-pointer active:scale-95' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            {mode !== 'subject_grade' && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => handleStudentSelect(s.id)}
                                                    disabled={mode === 'delete_subject_grade' && !hasGrade}
                                                    className="w-6 h-6 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                                />
                                            )}
                                            <img
                                                src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`}
                                                alt={s.name}
                                                className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/20 shadow-md"
                                            />
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{s.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-indigo-200/70 mt-0.5">No. {students.indexOf(s) + 1}</p>
                                            </div>
                                        </div>

                                        {mode === 'subject_grade' ? (
                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                                <label className="text-sm font-bold text-indigo-600 dark:text-indigo-200 uppercase tracking-wide">Nilai</label>
                                                <div className="flex-grow flex items-center gap-3">
                                                    <Input
                                                        ref={(el) => registerRef(globalIndex, el)}
                                                        onKeyDown={(e) => handleKeyDown(e, globalIndex)}
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        max="100"
                                                        value={scores[s.id] || ''}
                                                        onChange={e => handleScoreChange(s.id, e.target.value)}
                                                        placeholder=""
                                                        className="flex-grow text-xl font-bold text-center h-12 bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:ring-indigo-500"
                                                    />
                                                    {scores[s.id] && (
                                                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${parseInt(scores[s.id]) >= 75 ? 'bg-emerald-500 text-white' : parseInt(scores[s.id]) >= 60 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                            {parseInt(scores[s.id]) >= 75 ? 'Baik' : parseInt(scores[s.id]) >= 60 ? 'Cukup' : 'Kurang'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (mode === 'academic_print' || mode === 'delete_subject_grade') ? (
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                                <span className="text-sm text-slate-600 dark:text-indigo-200">Nilai Saat Ini</span>
                                                <span className={`font-bold px-4 py-2 rounded-xl text-lg ${hasGrade ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-white border border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/50 border border-slate-200 dark:border-white/5'}`}>
                                                    {hasGrade ? gradeRecord?.score : 'N/A'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                                <span className="text-sm text-slate-600 dark:text-indigo-200">Status</span>
                                                {isSelected ?
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-400/20">
                                                        <CheckSquareIcon className="w-4 h-4" />Terpilih
                                                    </span> :
                                                    <span className="text-slate-400 dark:text-white/30 text-sm italic">Belum dipilih</span>
                                                }
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-indigo-200/60">
                        <SearchIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg">Tidak ada siswa ditemukan.</p>
                        <p className="text-sm opacity-70">Coba ubah kata kunci atau filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
