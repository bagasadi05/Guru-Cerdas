import React, { useMemo, useState } from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { SearchIcon, CheckSquareIcon, BarChartIcon } from '../../../Icons';
import { FilterPills } from './FilterPills';
import { StudentRow, InputMode, StudentFilter, AcademicRecordRow, ClassRow, AttitudeRecordRow, QuizPointRow } from '../types';
import { QUIZ_ACTIVITY_CATEGORIES, BINTANG_ATTITUDE_ASPECTS } from '../constants';
import { useGridNavigation } from '../../../../hooks/useGridNavigation';
import { StudentSortControls, GroupHeader, sortStudents, groupStudents, SortField, SortDirection, GroupBy } from '../../../ui/StudentSortControls';
import { GradeDistributionMini } from '../../../ui/GradeDistributionChart';
import { getStudentAvatar } from '../../../../utils/avatarUtils';
import { BatchFillInput } from '../../../ui/BatchFillInput';
import { VoiceGradeModal } from './VoiceGradeModal';
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
                                                const gradeRecord = existingGradesMap.get(s.id);
                                                const hasGrade = !!gradeRecord;
                                                const rawScore = scores[s.id] || '';
                                                const scoreNormalized = rawScore.trim().replace(',', '.');
                                                const scoreNum = Number(scoreNormalized);
                                                const hasScore = mode === 'subject_grade' && rawScore.trim() !== '';
                                                const hasValidScore = Boolean(rawScore.trim() !== '' && !isNaN(scoreNum));
                                                const isPassing = hasValidScore && scoreNum >= kkm;
                                                const isFailing = hasValidScore && scoreNum < kkm;
                                                const studentQuizPoints = studentQuizPointsCountMap.get(s.id) || 0;
                                                const todayQuizRecords = studentQuizTodayMap.get(s.id) || [];
                                                const hasQuizToday = todayQuizRecords.length > 0;
                                                const studentAttitudePoints = studentAttitudePointsCountMap.get(s.id) || 0;
                                                const todayAttitudeRecords = studentAttitudeTodayMap.get(s.id) || [];
                                                const hasAttitudeToday = todayAttitudeRecords.length > 0;

                                                return (
                                                    <tr
                                                        key={s.id}
                                                        onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined}
                                                        className={`
                                                            group transition-all duration-300 rounded-xl
                                                            focus-within:bg-brand-50/70 focus-within:dark:bg-brand-950/20 focus-within:shadow-md transition-all
                                                            ${isSelected
                                                                ? 'bg-brand-50/80 dark:bg-brand-500/20 shadow-md border-brand-200 dark:border-brand-500/30'
                                                                : mode === 'subject_grade'
                                                                ? (isPassing
                                                                    ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-transparent hover:bg-emerald-50/60 dark:hover:bg-emerald-500/15'
                                                                    : isFailing
                                                                    ? 'bg-rose-50/40 dark:bg-rose-500/10 border-transparent hover:bg-rose-50/60 dark:hover:bg-rose-500/15'
                                                                    : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:shadow-md border-transparent')
                                                                : (isSelected || hasScore)
                                                                ? 'bg-emerald-100 dark:bg-emerald-500/20 shadow-md border-transparent'
                                                                : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:shadow-md border-transparent'
                                                            }
                                                            ${mode !== 'subject_grade' ? 'cursor-pointer' : ''}
                                                        `}
                                                    >
                                                        <td className="p-4 rounded-l-xl border-y border-l border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStudentSelect(s.id);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="border-slate-300 dark:border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                            />
                                                        </td>
                                                        <td className="p-4 text-center border-y border-slate-100 dark:border-white/5 font-semibold text-xs text-slate-400 dark:text-slate-500">
                                                            {globalIndex + 1}
                                                        </td>
                                                        <td className="p-4 border-y border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative">
                                                                    <img
                                                                        src={getStudentAvatar(s.avatar_url, s.gender, s.id, s.name, 'sm')}
                                                                        alt={s.name}
                                                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 relative z-10"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={`font-medium text-base ${isSelected || hasScore ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                        {s.name}
                                                                        {selectedClass === 'all' && classes && (
                                                                            <span className="ml-2 text-xs text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800/50">
                                                                                {classMap.get(s.class_id || '') || 'Unknown Class'}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {mode === 'subject_grade' && hasGrade && (
                                                                        <span className="animate-pulse text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 w-fit mt-1">
                                                                            ⚠️ Nilai Sudah Ada
                                                                        </span>
                                                                    )}
                                                                    {mode === 'attitude' && (
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                            <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 w-fit">
                                                                                🌟 {studentAttitudePoints} Poin Sikap
                                                                            </span>
                                                                            {hasAttitudeToday && (
                                                                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit" title={todayAttitudeRecords.map(r => r.quiz_name).join(', ')}>
                                                                                    ✓ Ada poin sikap hari ini ({todayAttitudeRecords.length}x)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {mode === 'quiz' && (
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                            <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 w-fit">
                                                                                ⭐ {studentQuizPoints} Poin Keaktifan
                                                                            </span>
                                                                            {hasQuizToday && (
                                                                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit" title={todayQuizRecords.map(r => r.quiz_name).join(', ')}>
                                                                                    ✓ Ada poin hari ini ({todayQuizRecords.length}x)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={`p-4 rounded-r-xl border-y border-r border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10 ${mode === 'attitude' || mode === 'quiz' ? 'w-80 min-w-[280px]' : ''}`}>
                                                            {mode === 'subject_grade' ? (
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="relative">
                                                                        <Input
                                                                            ref={(el) => registerInputRef(globalIndex, el)}
                                                                            onKeyDown={(e) => gridNav.handleKeyDown(e, globalIndex)}
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            min="0"
                                                                            max="100"
                                                                            step="any"
                                                                            value={scores[s.id] || ''}
                                                                            onChange={e => handleScoreChange(s.id, e.target.value)}
                                                                            placeholder=""
                                                                            aria-label={`Nilai untuk ${s.name}`}
                                                                            aria-invalid={Boolean(validationErrors[s.id])}
                                                                            aria-describedby={validationErrors[s.id] ? `grade-error-${s.id}` : undefined}
                                                                            onFocus={() => onScoreFieldFocus?.(s.id)}
                                                                            onBlur={() => onScoreFieldFocus?.(null)}
                                                                            className={`w-24 text-center font-bold text-lg h-10 rounded-xl transition-all ${
                                                                                validationErrors[s.id]
                                                                                    ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                                                    : isPassing
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-100 focus:ring-emerald-500'
                                                                                    : isFailing
                                                                                    ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 focus:ring-rose-500'
                                                                                    : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 focus:ring-brand-500'
                                                                            }`}
                                                                        />
                                                                        {validationErrors[s.id] && (
                                                                            <div id={`grade-error-${s.id}`} role="alert" aria-live="assertive" className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] z-20">
                                                                                <div className="bg-rose-500 text-white text-xs py-1 px-2 rounded shadow-lg">
                                                                                    {validationErrors[s.id]}
                                                                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-rose-500" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {hasValidScore && !validationErrors[s.id] && (
                                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm ${
                                                                            isPassing
                                                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                                : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                                        }`}>
                                                                            {isPassing ? 'Tuntas' : 'Belum Tuntas'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : mode === 'attitude' ? (
                                                                isSelected ? (
                                                                    <div className="flex items-center">
                                                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-500/30 whitespace-nowrap shadow-sm">
                                                                            <span className="text-sm">{activeAttitudeCategory.icon}</span>
                                                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">+1 Poin</span>
                                                                            <span className="text-emerald-400/60 dark:text-emerald-500/60 font-normal">•</span>
                                                                            <span className="font-medium text-emerald-800 dark:text-emerald-200">{activeAttitudeCategory.label}</span>
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 dark:text-white/30 text-xs italic whitespace-nowrap">
                                                                        Belum dipilih (klik baris untuk beri +1 poin sikap)
                                                                    </span>
                                                                )
                                                            ) : mode === 'quiz' ? (
                                                                isSelected ? (
                                                                    <div className="flex items-center">
                                                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/20 px-3.5 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 whitespace-nowrap shadow-sm">
                                                                            <span className="text-sm">{activeQuizCategory.icon}</span>
                                                                            <span className="font-bold text-amber-700 dark:text-amber-300">+1 Poin</span>
                                                                            <span className="text-amber-400/60 dark:text-amber-500/60 font-normal">•</span>
                                                                            <span className="font-medium text-amber-800 dark:text-amber-200">{activeQuizCategory.label}</span>
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 dark:text-white/30 text-xs italic whitespace-nowrap">
                                                                        Belum dipilih (klik baris untuk beri +1 poin)
                                                                    </span>
                                                                )
                                                            ) : mode === 'academic_print' ? (
                                                                <span className={`font-bold px-4 py-2 rounded-lg text-sm ${hasGrade ? 'bg-brand-100 dark:bg-brand-500/30 text-brand-700 dark:text-brand-200 border border-brand-200 dark:border-brand-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-500 border border-slate-200 dark:border-white/5'}`}>
                                                                    {hasGrade ? gradeRecord?.score : 'N/A'}
                                                                </span>
                                                            ) : isSelected ? (
                                                                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-400/20 w-fit">
                                                                    <CheckSquareIcon className="w-4 h-4" />Terpilih
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-white/30 text-sm italic">Belum dipilih</span>
                                                            )}
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
                            {groupedStudents.map((group) => (
                                <React.Fragment key={group.title}>
                                    {groupBy !== 'none' && (
                                        <GroupHeader title={group.title} count={group.students.length} color={group.color} />
                                    )}
                                    {group.students.map((s: StudentRow) => {
                                        const globalIndex = globalIndexMap.get(s.id) ?? 0;
                                        const isSelected = selectedStudentIds.has(s.id);
                                        const gradeRecord = existingGradesMap.get(s.id);
                                        const hasGrade = !!gradeRecord;
                                        const rawScore = scores[s.id] || '';
                                        const scoreNormalized = rawScore.trim().replace(',', '.');
                                        const scoreNum = Number(scoreNormalized);
                                        const hasScore = mode === 'subject_grade' && rawScore.trim() !== '';
                                        const hasValidScore = Boolean(rawScore.trim() !== '' && !isNaN(scoreNum));
                                        const isPassing = hasValidScore && scoreNum >= kkm;
                                        const isFailing = hasValidScore && scoreNum < kkm;
                                        const studentQuizPoints = studentQuizPointsCountMap.get(s.id) || 0;
                                        const todayQuizRecords = studentQuizTodayMap.get(s.id) || [];
                                        const hasQuizToday = todayQuizRecords.length > 0;
                                        const studentAttitudePoints = studentAttitudePointsCountMap.get(s.id) || 0;
                                        const todayAttitudeRecords = studentAttitudeTodayMap.get(s.id) || [];
                                        const hasAttitudeToday = todayAttitudeRecords.length > 0;

                                        return (
                                            <div
                                                key={s.id}
                                                onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined}
                                                className={`
                                            rounded-2xl p-4 border transition-all duration-300
                                            focus-within:bg-brand-50/70 focus-within:dark:bg-brand-950/20 focus-within:shadow-md
                                            ${isSelected
                                                ? 'bg-brand-50/80 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/30 shadow-md'
                                                : mode === 'subject_grade'
                                                ? (isPassing
                                                    ? 'bg-emerald-50/60 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 shadow-sm'
                                                    : isFailing
                                                    ? 'bg-rose-50/60 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10')
                                                : (isSelected || hasScore)
                                                ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30 shadow-md'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10'
                                            } 
                                            ${mode !== 'subject_grade' ? 'cursor-pointer active:scale-95' : ''}
                                        `}
                                            >
                                                <div className="flex items-start gap-3 mb-3">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleStudentSelect(s.id);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={`Pilih ${s.name}`}
                                                        className="w-5 h-5 mt-1 border-white/30 data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-500"
                                                    />
                                                    <img
                                                        src={getStudentAvatar(s.avatar_url, s.gender, s.id, s.name, 'sm')}
                                                        alt={s.name}
                                                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/20 shadow-md flex-shrink-0"
                                                    />
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                                                            {s.name}
                                                        </p>
                                                        {selectedClass === 'all' && classes && (
                                                            <span className="inline-block mt-1 text-xs font-normal text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800/50">
                                                                {classMap.get(s.class_id || '') || 'Unknown'}
                                                            </span>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-xs text-slate-500 dark:text-brand-200/70">No. {globalIndex + 1}</span>
                                                            {mode === 'subject_grade' && hasGrade && (
                                                                <span className="animate-pulse text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 w-fit">
                                                                    ⚠️ Nilai Sudah Ada
                                                                </span>
                                                            )}
                                                            {mode === 'attitude' && (
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 w-fit">
                                                                        🌟 {studentAttitudePoints} Poin
                                                                    </span>
                                                                    {hasAttitudeToday && (
                                                                        <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit" title={todayAttitudeRecords.map(r => r.quiz_name).join(', ')}>
                                                                            ✓ Hari ini ({todayAttitudeRecords.length}x)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {mode === 'quiz' && (
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 w-fit">
                                                                        ⭐ {studentQuizPoints} Poin
                                                                    </span>
                                                                    {hasQuizToday && (
                                                                        <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit">
                                                                            ✓ Hari ini ({todayQuizRecords.length}x)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {mode === 'subject_grade' ? (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                                                        <div className="flex items-center gap-3 w-full">
                                                            <label className="text-xs font-bold text-brand-600 dark:text-brand-300 uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                                                                Nilai
                                                            </label>
                                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                <Input
                                                                    ref={(el) => registerInputRef(globalIndex, el)}
                                                                    onKeyDown={(e) => gridNav.handleKeyDown(e, globalIndex)}
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    max="100"
                                                                    step="any"
                                                                    value={scores[s.id] || ''}
                                                                    onChange={e => handleScoreChange(s.id, e.target.value)}
                                                                    placeholder=""
                                                                    aria-label={`Nilai untuk ${s.name}`}
                                                                    aria-invalid={Boolean(validationErrors[s.id])}
                                                                    aria-describedby={validationErrors[s.id] ? `grade-error-mobile-${s.id}` : undefined}
                                                                    onFocus={() => onScoreFieldFocus?.(s.id)}
                                                                    onBlur={() => onScoreFieldFocus?.(null)}
                                                                    className={`w-full min-w-0 flex-1 text-xl font-bold text-center h-12 rounded-xl transition-all ${validationErrors[s.id] ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-brand-500'}`}
                                                                />
                                                                {hasValidScore && !validationErrors[s.id] && (
                                                                    <span className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md whitespace-nowrap flex-shrink-0 ${isPassing ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                        {isPassing ? 'Tuntas' : 'Belum Tuntas'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {validationErrors[s.id] && (
                                                            <div id={`grade-error-mobile-${s.id}`} role="alert" aria-live="assertive" className="text-xs text-rose-500 mt-2 font-medium">
                                                                * {validationErrors[s.id]}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : mode === 'attitude' ? (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                                                        {isSelected ? (
                                                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-500/30 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                                                <span className="text-sm">{activeAttitudeCategory.icon}</span>
                                                                <span className="font-bold text-emerald-700 dark:text-emerald-300">+1 Poin</span>
                                                                <span className="text-emerald-400/60">•</span>
                                                                <span className="font-medium text-emerald-800 dark:text-emerald-200">{activeAttitudeCategory.label}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 dark:text-white/30 italic whitespace-nowrap">
                                                                Belum dipilih (tap untuk beri +1 poin)
                                                            </span>
                                                        )}
                                                        <span className="text-xxs text-slate-400 font-medium whitespace-nowrap flex-shrink-0">Rapot BINTANG</span>
                                                    </div>
                                                ) : mode === 'quiz' ? (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                                                        {isSelected ? (
                                                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                                                <span className="text-sm">{activeQuizCategory.icon}</span>
                                                                <span className="font-bold text-amber-700 dark:text-amber-300">+1 Poin</span>
                                                                <span className="text-amber-400/60">•</span>
                                                                <span className="font-medium text-amber-800 dark:text-amber-200">{activeQuizCategory.label}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 dark:text-white/30 italic whitespace-nowrap">
                                                                Belum dipilih (tap untuk beri +1 poin)
                                                            </span>
                                                        )}
                                                        <span className="text-xxs text-slate-400 font-medium whitespace-nowrap flex-shrink-0">Poin Keaktifan</span>
                                                    </div>
                                                ) : mode === 'academic_print' ? (
                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                                        <span className="text-sm text-slate-600 dark:text-brand-200">Nilai Saat Ini</span>
                                                        <span className={`font-bold px-4 py-2 rounded-xl text-lg ${hasGrade ? 'bg-brand-100 dark:bg-brand-500/30 text-brand-700 dark:text-white border border-brand-200 dark:border-brand-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/5'}`}>
                                                            {hasGrade ? gradeRecord?.score : 'N/A'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                                        <span className="text-sm text-slate-600 dark:text-brand-200">Status</span>
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
