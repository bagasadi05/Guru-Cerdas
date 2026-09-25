import React, { useMemo, useState } from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { SearchIcon, BarChartIcon } from '../../../Icons';
import { FilterPills } from './FilterPills';
import { StudentRow, InputMode, StudentFilter, AcademicRecordRow, ClassRow, AttitudeRecordRow, QuizPointRow } from '../types';
import { QUIZ_ACTIVITY_CATEGORIES, BINTANG_ATTITUDE_ASPECTS } from '../constants';
import { useGridNavigation } from '../../../../hooks/useGridNavigation';
import { StudentSortControls, GroupHeader, sortStudents, groupStudents, SortField, SortDirection, GroupBy } from '../../../ui/StudentSortControls';
import { GradeDistributionMini } from '../../../ui/GradeDistributionChart';
import { BatchFillInput } from '../../../ui/BatchFillInput';
import { VoiceGradeModal } from './VoiceGradeModal';
import { Step2_StudentTableRow, Step2_StudentMobileCard } from './Step2_StudentItems';
import { Mic, ChevronDown, ChevronUp, Zap } from 'lucide-react';

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
    handleBatchScoreChange?: (newScores: Record<string, string>) => void;
    onScoreFieldFocus?: (studentId: string | null) => void;
    validationErrors?: Record<string, string>;
    existingGrades: AcademicRecordRow[] | undefined;
    existingAttitudeRecords?: AttitudeRecordRow[];
    attitudePoints?: number;
    attitudeCategory?: string;
    attitudeDate?: string;
    existingQuizPoints?: QuizPointRow[];
    quizInfo?: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    classes?: ClassRow[];
    selectedClass?: string;
    kkm?: number;
    onClearRequest?: () => void;
}

export const Step2_StudentList: React.FC<Step2_StudentListProps> = ({
    mode, searchTerm, setSearchTerm, filterOptions, studentFilter, setStudentFilter,
    isLoadingStudents, students, isAllSelected, handleSelectAllStudents,
    selectedStudentIds, handleStudentSelect, scores, handleScoreChange, handleBatchScoreChange, onScoreFieldFocus, validationErrors = {}, existingGrades,
    existingAttitudeRecords: _existingAttitudeRecords,
    attitudePoints: _attitudePoints = 1, attitudeCategory = 'Adab & Akhlak', attitudeDate,
    existingQuizPoints, quizInfo,
    classes, selectedClass, kkm = 75,
    onClearRequest,
}) => {
    // Sorting and Grouping State
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'index',
        direction: 'asc',
    });
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [showStats, setShowStats] = useState(false);
    const [showBatchFill, setShowBatchFill] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

    // Apply sorting
    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return sortStudents(students, scores, sortConfig, students);
    }, [students, scores, sortConfig]);

    // Apply grouping
    const groupedStudents = useMemo(() => {
        if (mode !== 'subject_grade') {
            return [{ title: 'Semua Siswa', students: sortedStudents, color: 'indigo' }];
        }
        // Pass the teacher's KKM so the "Tuntas (≥x)" headers match the value
        // configured in the panel instead of the helper's 75 default.
        return groupStudents(sortedStudents, scores, groupBy, kkm);
    }, [sortedStudents, scores, groupBy, mode, kkm]);

    // Navigation for inputs
    const flatStudentList = useMemo(() => {
        return groupedStudents.flatMap(group => group.students);
    }, [groupedStudents]);

    const gridNav = useGridNavigation<HTMLInputElement>(
        flatStudentList.length,
        {
            columnsPerRow: 1,
            enabled: mode === 'subject_grade'
        }
    );

    const registerInputRef = React.useCallback((index: number, el: HTMLInputElement | null) => {
        if (el && el.offsetParent !== null) {
            gridNav.registerRef(index, el);
        } else if (!el) {
            gridNav.registerRef(index, null);
        }
    }, [gridNav]);

    // Auto-focus the first input once per class/mode.
    const hasAutoFocusedRef = React.useRef(false);
    React.useEffect(() => {
        hasAutoFocusedRef.current = false;
    }, [selectedClass, mode]);

    React.useEffect(() => {
        if (mode !== 'subject_grade' || flatStudentList.length === 0) return;
        if (hasAutoFocusedRef.current) return;
        hasAutoFocusedRef.current = true;
        const timer = setTimeout(() => {
            gridNav.focusItem(0);
        }, 100);
        return () => clearTimeout(timer);
    }, [mode, selectedClass, flatStudentList.length, gridNav]);

    const classMap = useMemo(() => {
        const map = new Map<string, string>();
        if (classes) {
            classes.forEach(c => map.set(c.id, c.name));
        }
        return map;
    }, [classes]);

    const existingGradesMap = useMemo(() => {
        const map = new Map<string, AcademicRecordRow>();
        if (existingGrades) {
            existingGrades.forEach(g => map.set(g.student_id, g));
        }
        return map;
    }, [existingGrades]);

    const studentQuizPointsCountMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!existingQuizPoints) return map;
        for (const q of existingQuizPoints) {
            map.set(q.student_id, (map.get(q.student_id) || 0) + (q.points || 1));
        }
        return map;
    }, [existingQuizPoints]);

    const quizDate = quizInfo?.date;
    const studentQuizTodayMap = useMemo(() => {
        const map = new Map<string, QuizPointRow[]>();
        if (!existingQuizPoints || !quizDate) return map;
        for (const q of existingQuizPoints) {
            if (q.quiz_date === quizDate) {
                const list = map.get(q.student_id) || [];
                list.push(q);
                map.set(q.student_id, list);
            }
        }
        return map;
    }, [existingQuizPoints, quizDate]);

    const quizCategory = quizInfo?.category;
    const activeQuizCategory = useMemo(() => {
        const catKey = quizCategory || 'bertanya';
        return QUIZ_ACTIVITY_CATEGORIES.find(c => c.value === catKey) || { value: catKey, label: 'Keaktifan', icon: '⭐' };
    }, [quizCategory]);

    const currentAttitudeDate = attitudeDate;
    const currentAttitudeCategory = attitudeCategory;

    const activeAttitudeCategory = useMemo(() => {
        const catKey = currentAttitudeCategory || 'Adab & Akhlak';
        return BINTANG_ATTITUDE_ASPECTS.find(c => c.value === catKey) || { value: catKey, label: 'Sikap', icon: '🌟', menunjang: 'Menunjang Aspek Sikap', defaultActivity: 'Adab & Kesantunan' };
    }, [currentAttitudeCategory]);

    const studentAttitudePointsCountMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!existingQuizPoints) return map;
        for (const q of existingQuizPoints) {
            const isAttitude = !q.subject || BINTANG_ATTITUDE_ASPECTS.some(a => a.value === q.category);
            if (isAttitude) {
                map.set(q.student_id, (map.get(q.student_id) || 0) + (q.points || 1));
            }
        }
        return map;
    }, [existingQuizPoints]);

    const studentAttitudeTodayMap = useMemo(() => {
        const map = new Map<string, QuizPointRow[]>();
        if (!existingQuizPoints || !currentAttitudeDate) return map;
        for (const q of existingQuizPoints) {
            const isAttitude = !q.subject || BINTANG_ATTITUDE_ASPECTS.some(a => a.value === q.category);
            if (isAttitude && q.quiz_date === currentAttitudeDate) {
                const list = map.get(q.student_id) || [];
                list.push(q);
                map.set(q.student_id, list);
            }
        }
        return map;
    }, [existingQuizPoints, currentAttitudeDate]);

    const globalIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        flatStudentList.forEach((st, idx) => map.set(st.id, idx));
        return map;
    }, [flatStudentList]);

    return (
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-sm animate-fade-in-right">
            {/* Header with Search, Filters, and Tools */}
            <div className="p-3.5 sm:p-5 lg:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-2.5 sm:space-y-3 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
                {/* Row 1: Search + Voice Dictation + Quick Stats */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0 group">
                        <SearchIcon className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute top-1/2 left-3 -translate-y-1/2 transition-colors group-focus-within:text-brand-500" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari nama siswa..."
                            className="pl-9 sm:pl-10 pr-3 w-full h-9 sm:h-10 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-brand-500 focus:border-brand-500 transition-all text-xs sm:text-sm"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-gradient-to-r from-rose-600 to-brand-700 hover:from-rose-700 hover:to-brand-800 text-white shadow-sm active:scale-95 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                        title="Input nilai menggunakan suara (Dikte)"
                    >
                        <Mic className="w-3.5 h-3.5 animate-pulse text-rose-100" />
                        <span className="whitespace-nowrap">Dikte</span>
                        <span className="hidden md:inline whitespace-nowrap">Suara</span>
                    </button>

                    {mode === 'subject_grade' && (
                        <button
                            type="button"
                            onClick={() => setShowStats(!showStats)}
                            className={`flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[40px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                                showStats
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 shadow-sm'
                            }`}
                            title="Grafik Statistik Nilai"
                        >
                            <BarChartIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline whitespace-nowrap">Statistik</span>
                        </button>
                    )}
                </div>

                {/* Row 2: Filter Pills + Quick-fill Batch Edit Toggle */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5">
                    <FilterPills options={filterOptions} currentValue={studentFilter} onFilterChange={setStudentFilter} />

                    {mode === 'subject_grade' && students && students.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowBatchFill(prev => !prev)}
                            className={`flex items-center gap-1 min-h-[44px] sm:min-h-[36px] px-3 py-2 sm:py-1 text-xs font-semibold rounded-full transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                                showBatchFill
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                            }`}
                            title="Isi nilai massal sekaligus"
                        >
                            <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500 group-hover:scale-110 transition-transform" />
                            <span className="whitespace-nowrap">Isi Massal</span>
                            {showBatchFill ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                        </button>
                    )}
                </div>

                {/* Collapsible Batch Fill Bar */}
                {showBatchFill && mode === 'subject_grade' && (
                    <div className="animate-fade-in-down">
                        <BatchFillInput
                            students={students}
                            scores={scores}
                            onApply={(score) => {
                                if (handleBatchScoreChange) {
                                    const batch: Record<string, string> = {};
                                    students.forEach(s => { batch[s.id] = score; });
                                    handleBatchScoreChange(batch);
                                } else {
                                    students.forEach(s => handleScoreChange(s.id, score));
                                }
                            }}
                            onClearRequest={onClearRequest}
                            onClose={() => setShowBatchFill(false)}
                        />
                    </div>
                )}

                {/* Row 3: Sorting & Grouping Controls */}
                {mode === 'subject_grade' && students && students.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
                        <StudentSortControls
                            sortConfig={sortConfig}
                            onSortChange={setSortConfig}
                            groupBy={groupBy}
                            onGroupByChange={setGroupBy}
                            showGrouping={true}
                        />
                    </div>
                )}

                {/* Mini Stats Display */}
                {showStats && mode === 'subject_grade' && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 animate-fade-in-down">
                        <GradeDistributionMini scores={scores} kkm={kkm} />
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {isLoadingStudents ? (
                    <div className="flex flex-col items-center justify-center h-64 text-brand-600 dark:text-brand-200">
                        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Memuat data siswa...</p>
                    </div>
                ) : students && students.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm border-separate border-spacing-y-2" aria-label="Tabel Input Nilai Siswa">
                                <thead>
                                    <tr className="text-emerald-600 dark:text-emerald-200">
                                        <th className="p-4 text-left w-14 font-bold tracking-wide uppercase text-xs">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onChange={e => handleSelectAllStudents(e.target.checked)}
                                                aria-label="Pilih semua siswa"
                                                className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                            />
                                        </th>
                                        <th className="p-4 text-center w-12 font-bold tracking-wide uppercase text-xs">No.</th>
                                        <th className="p-4 text-left font-bold tracking-wide uppercase text-xs">Nama Siswa</th>
                                        <th className={`p-4 text-left font-bold tracking-wide uppercase text-xs ${mode === 'subject_grade' ? 'w-80 min-w-[280px]' : mode === 'attitude' || mode === 'quiz' ? 'w-80 min-w-[280px]' : ''}`}>
                                            {mode === 'subject_grade' ? 'Input Nilai' : mode === 'attitude' ? 'Apresiasi Sikap (BINTANG)' : mode === 'quiz' ? 'Poin Keaktifan (BINTANG)' : mode === 'academic_print' ? 'Nilai Saat Ini' : 'Status'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedStudents.map((group) => (
                                        <React.Fragment key={group.title}>
                                            {groupBy !== 'none' && (
                                                <tr>
                                                    <td colSpan={4} className="pt-4 pb-2">
                                                        <GroupHeader title={group.title} count={group.students.length} color={group.color} />
                                                    </td>
                                                </tr>
                                            )}
                                            {group.students.map((s: StudentRow) => {
                                                const globalIndex = globalIndexMap.get(s.id) ?? 0;
                                                const isSelected = selectedStudentIds.has(s.id);
                                                const rawScore = scores[s.id] || '';
                                                const hasScore = mode === 'subject_grade' && rawScore.trim() !== '';

                                                return (
                                                    <Step2_StudentTableRow
                                                        key={s.id}
                                                        student={s}
                                                        globalIndex={globalIndex}
                                                        isSelected={isSelected}
                                                        hasScore={hasScore}
                                                        rawScore={rawScore}
                                                        kkm={kkm}
                                                        mode={mode}
                                                        gradeRecord={existingGradesMap.get(s.id)}
                                                        classNameLabel={selectedClass === 'all' && classes ? (classMap.get(s.class_id || '') || 'Unknown Class') : undefined}
                                                        studentQuizPoints={studentQuizPointsCountMap.get(s.id) || 0}
                                                        todayQuizRecords={studentQuizTodayMap.get(s.id) || []}
                                                        studentAttitudePoints={studentAttitudePointsCountMap.get(s.id) || 0}
                                                        todayAttitudeRecords={studentAttitudeTodayMap.get(s.id) || []}
                                                        activeAttitudeCategory={activeAttitudeCategory}
                                                        activeQuizCategory={activeQuizCategory}
                                                        validationError={validationErrors[s.id]}
                                                        onSelect={handleStudentSelect}
                                                        onScoreChange={handleScoreChange}
                                                        onScoreFocus={onScoreFieldFocus}
                                                        registerInputRef={registerInputRef}
                                                        onKeyDown={(e) => gridNav.handleKeyDown(e, globalIndex)}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {groupedStudents.map((group) => (
                                <React.Fragment key={group.title}>
                                    {groupBy !== 'none' && (
                                        <GroupHeader title={group.title} count={group.students.length} color={group.color} />
                                    )}
                                    {group.students.map((s: StudentRow) => {
                                        const globalIndex = globalIndexMap.get(s.id) ?? 0;
                                        const isSelected = selectedStudentIds.has(s.id);
                                        const rawScore = scores[s.id] || '';
                                        const hasScore = mode === 'subject_grade' && rawScore.trim() !== '';

                                        return (
                                            <Step2_StudentMobileCard
                                                key={s.id}
                                                student={s}
                                                globalIndex={globalIndex}
                                                isSelected={isSelected}
                                                hasScore={hasScore}
                                                rawScore={rawScore}
                                                kkm={kkm}
                                                mode={mode}
                                                gradeRecord={existingGradesMap.get(s.id)}
                                                classNameLabel={selectedClass === 'all' && classes ? (classMap.get(s.class_id || '') || 'Unknown') : undefined}
                                                studentQuizPoints={studentQuizPointsCountMap.get(s.id) || 0}
                                                todayQuizRecords={studentQuizTodayMap.get(s.id) || []}
                                                studentAttitudePoints={studentAttitudePointsCountMap.get(s.id) || 0}
                                                todayAttitudeRecords={studentAttitudeTodayMap.get(s.id) || []}
                                                activeAttitudeCategory={activeAttitudeCategory}
                                                activeQuizCategory={activeQuizCategory}
                                                validationError={validationErrors[s.id]}
                                                onSelect={handleStudentSelect}
                                                onScoreChange={handleScoreChange}
                                                onScoreFocus={onScoreFieldFocus}
                                                registerInputRef={registerInputRef}
                                                onKeyDown={(e) => gridNav.handleKeyDown(e, globalIndex)}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-brand-200/60">
                        <SearchIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg">Tidak ada siswa ditemukan.</p>
                        <p className="text-sm opacity-70">Coba ubah kata kunci atau filter.</p>
                    </div>
                )}
            </div>

            {/* Voice Grade Input Modal */}
            {mode === 'subject_grade' && (
                <VoiceGradeModal
                    isOpen={isVoiceModalOpen}
                    onClose={() => setIsVoiceModalOpen(false)}
                    students={flatStudentList}
                    scores={scores}
                    onScoreChange={handleScoreChange}
                    kkm={kkm}
                />
            )}
        </div>
    );
};
