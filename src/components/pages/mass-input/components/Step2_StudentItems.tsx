import React from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { CheckSquareIcon } from '../../../Icons';
import { AlertTriangle, Sparkles, Star, Check, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { StudentRow, InputMode, AcademicRecordRow, QuizPointRow } from '../types';
import { getStudentAvatar } from '../../../../utils/avatarUtils';

export interface StudentItemProps {
    student: StudentRow;
    globalIndex: number;
    isSelected: boolean;
    hasScore: boolean;
    rawScore: string;
    kkm: number;
    mode: InputMode | null;
    gradeRecord?: AcademicRecordRow;
    classNameLabel?: string;
    studentQuizPoints: number;
    todayQuizRecords: QuizPointRow[];
    studentAttitudePoints: number;
    todayAttitudeRecords: QuizPointRow[];
    activeAttitudeCategory: { icon: string; label: string; IconComponent?: React.FC<{ className?: string }> };
    activeQuizCategory: { icon: string; label: string; IconComponent?: React.FC<{ className?: string }> };
    validationError?: string;
    /** Violation mode: the chosen violation is already recorded on the chosen date. */
    violationRecordedOnDate?: boolean;
    /** Violation mode: total points this semester. */
    violationSemesterPoints?: number;
    onSelect: (id: string) => void;
    onScoreChange: (id: string, value: string) => void;
    onScoreFocus?: (id: string | null) => void;
    registerInputRef: (index: number, el: HTMLInputElement | null) => void;
    /** Receives the row's globalIndex so the parent can pass one stable handler to every row. */
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
}

export const Step2_StudentTableRow: React.FC<StudentItemProps> = React.memo(({
    student: s,
    globalIndex,
    isSelected,
    hasScore,
    rawScore,
    kkm,
    mode,
    gradeRecord,
    classNameLabel,
    studentQuizPoints,
    todayQuizRecords,
    studentAttitudePoints,
    todayAttitudeRecords,
    activeAttitudeCategory,
    activeQuizCategory,
    violationRecordedOnDate = false,
    violationSemesterPoints = 0,
    validationError,
    onSelect,
    onScoreChange,
    onScoreFocus,
    registerInputRef,
    onKeyDown,
}) => {
    const hasGrade = !!gradeRecord;
    const scoreNormalized = rawScore.trim().replace(',', '.');
    const scoreNum = Number(scoreNormalized);
    const hasValidScore = Boolean(rawScore.trim() !== '' && !isNaN(scoreNum));
    const isPassing = hasValidScore && scoreNum >= kkm;
    const isFailing = hasValidScore && scoreNum < kkm;
    const hasQuizToday = todayQuizRecords.length > 0;
    const hasAttitudeToday = todayAttitudeRecords.length > 0;

    const AttitudeIcon = activeAttitudeCategory.IconComponent || Sparkles;
    const QuizIcon = activeQuizCategory.IconComponent || Star;

    return (
        <tr
            key={s.id}
            onClick={mode !== 'subject_grade' ? () => onSelect(s.id) : undefined}
            className={`
                group transition-colors duration-150 rounded-xl
                focus-within:bg-brand-50/70 focus-within:dark:bg-brand-950/20 focus-within:shadow-md
                ${isSelected
                    ? 'bg-brand-50/80 dark:bg-brand-500/20 shadow-sm border-brand-200 dark:border-brand-500/30'
                    : mode === 'subject_grade'
                    ? (isPassing
                        ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-transparent hover:bg-emerald-50/60 dark:hover:bg-emerald-500/15'
                        : isFailing
                        ? 'bg-rose-50/40 dark:bg-rose-500/10 border-transparent hover:bg-rose-50/60 dark:hover:bg-rose-500/15'
                        : 'bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-transparent')
                    : (isSelected || hasScore)
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 shadow-sm border-transparent'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-transparent'
                }
                ${mode !== 'subject_grade' ? 'cursor-pointer' : ''}
            `}
        >
            <td className="p-2.5 sm:p-3 rounded-l-xl border-y border-l border-slate-200/70 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700">
                <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelect(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="border-slate-300 dark:border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
            </td>
            <td className="p-2.5 sm:p-3 text-center border-y border-slate-200/70 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 font-bold text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {globalIndex + 1}
            </td>
            <td className="p-2.5 sm:p-3 border-y border-slate-200/70 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <img
                            src={getStudentAvatar(s.avatar_url, s.gender, s.id, s.name, 'sm')}
                            alt={s.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200/80 dark:ring-slate-700 relative z-10"
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-sm ${isSelected || hasScore ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {s.name}
                            {classNameLabel && (
                                <span className="ml-2 text-[11px] font-semibold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800/50">
                                    {classNameLabel}
                                </span>
                            )}
                        </span>
                        {mode === 'subject_grade' && hasGrade && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 inline-flex items-center gap-1 w-fit mt-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Nilai Sudah Ada</span>
                            </span>
                        )}
                        {mode === 'attitude' && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 inline-flex items-center gap-1 w-fit">
                                    <Sparkles className="w-3 h-3 shrink-0" />
                                    <span>{studentAttitudePoints} Poin Sikap</span>
                                </span>
                                {hasAttitudeToday && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1 w-fit" title={todayAttitudeRecords.map(r => r.quiz_name).join(', ')}>
                                        <Check className="w-3 h-3 shrink-0" />
                                        <span>Ada poin sikap hari ini ({todayAttitudeRecords.length}x)</span>
                                    </span>
                                )}
                            </div>
                        )}
                        {mode === 'violation' && (violationSemesterPoints > 0 || violationRecordedOnDate) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {violationSemesterPoints > 0 && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 w-fit">
                                        {violationSemesterPoints} poin semester ini
                                    </span>
                                )}
                                {violationRecordedOnDate && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 w-fit">
                                        Sudah tercatat di tanggal ini
                                    </span>
                                )}
                            </div>
                        )}
                        {mode === 'quiz' && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1 w-fit">
                                    <Star className="w-3 h-3 shrink-0" />
                                    <span>{studentQuizPoints} Poin Keaktifan</span>
                                </span>
                                {hasQuizToday && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1 w-fit" title={todayQuizRecords.map(r => r.quiz_name).join(', ')}>
                                        <Check className="w-3 h-3 shrink-0" />
                                        <span>Ada poin hari ini ({todayQuizRecords.length}x)</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className={`p-2.5 sm:p-3 rounded-r-xl border-y border-r border-slate-200/70 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 ${mode === 'attitude' || mode === 'quiz' ? 'w-80 min-w-[280px]' : ''}`}>
                {mode === 'subject_grade' ? (
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Input
                                ref={(el) => registerInputRef(globalIndex, el)}
                                onKeyDown={onKeyDown ? (e) => onKeyDown(e, globalIndex) : undefined}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="100"
                                step="any"
                                value={rawScore}
                                onChange={e => onScoreChange(s.id, e.target.value)}
                                placeholder=""
                                aria-label={`Nilai untuk ${s.name}`}
                                aria-invalid={Boolean(validationError)}
                                aria-describedby={validationError ? `grade-error-${s.id}` : undefined}
                                onFocus={() => onScoreFocus?.(s.id)}
                                onBlur={() => onScoreFocus?.(null)}
                                className={`w-24 text-center font-bold text-lg h-10 rounded-xl transition-colors tabular-nums ${
                                    validationError
                                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                        : isPassing
                                        ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-100 focus:ring-emerald-500'
                                        : isFailing
                                        ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 focus:ring-rose-500'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-brand-500'
                                }`}
                            />
                            {validationError && (
                                <div id={`grade-error-${s.id}`} role="alert" aria-live="assertive" className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] z-20">
                                    <div className="bg-rose-500 text-white text-xs py-1 px-2 rounded shadow-lg">
                                        {validationError}
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-rose-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                        {hasValidScore && !validationError && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm ${
                                isPassing
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                                {isPassing ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                <span>{isPassing ? 'Tuntas' : 'Belum Tuntas'}</span>
                            </span>
                        )}
                    </div>
                ) : mode === 'attitude' ? (
                    isSelected ? (
                        <div className="flex items-center">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-500/30 whitespace-nowrap shadow-sm">
                                <AttitudeIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">+1 Poin</span>
                                <span className="text-emerald-400/60 dark:text-emerald-500/60 font-normal">•</span>
                                <span className="font-medium text-emerald-800 dark:text-emerald-200">{activeAttitudeCategory.label}</span>
                            </span>
                        </div>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:border-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Belum dipilih (beri +1 poin sikap)</span>
                        </span>
                    )
                ) : mode === 'quiz' ? (
                    isSelected ? (
                        <div className="flex items-center">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/20 px-3.5 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 whitespace-nowrap shadow-sm">
                                <QuizIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                                <span className="font-bold text-amber-700 dark:text-amber-300">+1 Poin</span>
                                <span className="text-amber-400/60 dark:text-amber-500/60 font-normal">•</span>
                                <span className="font-medium text-amber-800 dark:text-amber-200">{activeQuizCategory.label}</span>
                            </span>
                        </div>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:border-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Belum dipilih (beri +1 poin)</span>
                        </span>
                    )
                ) : mode === 'academic_print' ? (
                    <span className={`font-bold px-4 py-2 rounded-lg text-sm tabular-nums ${hasGrade ? 'bg-brand-100 dark:bg-brand-500/30 text-brand-700 dark:text-brand-200 border border-brand-200 dark:border-brand-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-500 border border-slate-200 dark:border-white/5'}`}>
                        {hasGrade ? gradeRecord?.score : 'N/A'}
                    </span>
                ) : isSelected ? (
                    <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-400/20 w-fit">
                        <CheckSquareIcon className="w-4 h-4" />Terpilih
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:border-brand-400 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Belum dipilih</span>
                    </span>
                )}
            </td>
        </tr>
    );
});
Step2_StudentTableRow.displayName = 'Step2_StudentTableRow';

export const Step2_StudentMobileCard: React.FC<StudentItemProps> = React.memo(({
    student: s,
    globalIndex,
    isSelected,
    hasScore,
    rawScore,
    kkm,
    mode,
    gradeRecord,
    classNameLabel,
    studentQuizPoints,
    todayQuizRecords,
    studentAttitudePoints,
    todayAttitudeRecords,
    activeAttitudeCategory,
    activeQuizCategory,
    violationRecordedOnDate = false,
    violationSemesterPoints = 0,
    validationError,
    onSelect,
    onScoreChange,
    onScoreFocus,
    registerInputRef,
    onKeyDown,
}) => {
    const hasGrade = !!gradeRecord;
    const scoreNormalized = rawScore.trim().replace(',', '.');
    const scoreNum = Number(scoreNormalized);
    const hasValidScore = Boolean(rawScore.trim() !== '' && !isNaN(scoreNum));
    const isPassing = hasValidScore && scoreNum >= kkm;
    const isFailing = hasValidScore && scoreNum < kkm;
    const hasQuizToday = todayQuizRecords.length > 0;
    const hasAttitudeToday = todayAttitudeRecords.length > 0;

    const AttitudeIcon = activeAttitudeCategory.IconComponent || Sparkles;
    const QuizIcon = activeQuizCategory.IconComponent || Star;

    return (
        <div
            key={s.id}
            onClick={mode !== 'subject_grade' ? () => onSelect(s.id) : undefined}
            className={`
                rounded-2xl p-4 border transition-colors duration-150
                focus-within:bg-brand-50/70 focus-within:dark:bg-brand-950/20 focus-within:shadow-md
                ${isSelected
                    ? 'bg-brand-50/80 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/30 shadow-sm'
                    : mode === 'subject_grade'
                    ? (isPassing
                        ? 'bg-emerald-50/60 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 shadow-sm'
                        : isFailing
                        ? 'bg-rose-50/60 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80')
                    : (isSelected || hasScore)
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30 shadow-sm'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                } 
                ${mode !== 'subject_grade' ? 'cursor-pointer active:scale-95' : ''}
            `}
        >
            <div className="flex items-start gap-3 mb-3">
                <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelect(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Pilih ${s.name}`}
                    className="w-5 h-5 mt-1 border-white/30 data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-500"
                />
                <img
                    src={getStudentAvatar(s.avatar_url, s.gender, s.id, s.name, 'sm')}
                    alt={s.name}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/20 shadow-sm flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {s.name}
                    </p>
                    {classNameLabel && (
                        <span className="inline-block mt-1 text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800/50">
                            {classNameLabel}
                        </span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">No. {globalIndex + 1}</span>
                        {mode === 'subject_grade' && hasGrade && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 inline-flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Nilai Sudah Ada</span>
                            </span>
                        )}
                        {mode === 'attitude' && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 inline-flex items-center gap-1 w-fit">
                                    <Sparkles className="w-3 h-3 shrink-0" />
                                    <span>{studentAttitudePoints} Poin</span>
                                </span>
                                {hasAttitudeToday && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1 w-fit" title={todayAttitudeRecords.map(r => r.quiz_name).join(', ')}>
                                        <Check className="w-3 h-3 shrink-0" />
                                        <span>Hari ini ({todayAttitudeRecords.length}x)</span>
                                    </span>
                                )}
                            </div>
                        )}
                        {mode === 'violation' && (violationSemesterPoints > 0 || violationRecordedOnDate) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {violationSemesterPoints > 0 && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 w-fit">
                                        {violationSemesterPoints} poin semester ini
                                    </span>
                                )}
                                {violationRecordedOnDate && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 w-fit">
                                        Sudah tercatat di tanggal ini
                                    </span>
                                )}
                            </div>
                        )}
                        {mode === 'quiz' && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1 w-fit">
                                    <Star className="w-3 h-3 shrink-0" />
                                    <span>{studentQuizPoints} Poin</span>
                                </span>
                                {hasQuizToday && (
                                    <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1 w-fit">
                                        <Check className="w-3 h-3 shrink-0" />
                                        <span>Hari ini ({todayQuizRecords.length}x)</span>
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
                                onKeyDown={onKeyDown ? (e) => onKeyDown(e, globalIndex) : undefined}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="100"
                                step="any"
                                value={rawScore}
                                onChange={e => onScoreChange(s.id, e.target.value)}
                                placeholder=""
                                aria-label={`Nilai untuk ${s.name}`}
                                aria-invalid={Boolean(validationError)}
                                aria-describedby={validationError ? `grade-error-mobile-${s.id}` : undefined}
                                onFocus={() => onScoreFocus?.(s.id)}
                                onBlur={() => onScoreFocus?.(null)}
                                className={`w-full min-w-0 flex-1 text-xl font-bold text-center h-12 rounded-xl transition-colors tabular-nums ${validationError ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-brand-500'}`}
                            />
                            {hasValidScore && !validationError && (
                                <span className={`inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap flex-shrink-0 ${isPassing ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {isPassing ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                    <span>{isPassing ? 'Tuntas' : 'Belum Tuntas'}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    {validationError && (
                        <div id={`grade-error-mobile-${s.id}`} role="alert" aria-live="assertive" className="text-xs text-rose-500 mt-2 font-medium">
                            * {validationError}
                        </div>
                    )}
                </div>
            ) : mode === 'attitude' ? (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                    {isSelected ? (
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-500/30 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                            <AttitudeIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">+1 Poin</span>
                            <span className="text-emerald-400/60">•</span>
                            <span className="font-medium text-emerald-800 dark:text-emerald-200">{activeAttitudeCategory.label}</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Belum dipilih (tap +1 poin)</span>
                        </span>
                    )}
                    <span className="text-xxs text-slate-400 font-medium whitespace-nowrap flex-shrink-0">Rapot BINTANG</span>
                </div>
            ) : mode === 'quiz' ? (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                    {isSelected ? (
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                            <QuizIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                            <span className="font-bold text-amber-700 dark:text-amber-300">+1 Poin</span>
                            <span className="text-amber-400/60">•</span>
                            <span className="font-medium text-amber-800 dark:text-amber-200">{activeQuizCategory.label}</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Belum dipilih (tap +1 poin)</span>
                        </span>
                    )}
                    <span className="text-xxs text-slate-400 font-medium whitespace-nowrap flex-shrink-0">Poin Keaktifan</span>
                </div>
            ) : mode === 'academic_print' ? (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <span className="text-sm text-slate-600 dark:text-brand-200">Nilai Saat Ini</span>
                    <span className={`font-bold px-4 py-2 rounded-xl text-lg tabular-nums ${hasGrade ? 'bg-brand-100 dark:bg-brand-500/30 text-brand-700 dark:text-white border border-brand-200 dark:border-brand-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/5'}`}>
                        {hasGrade ? gradeRecord?.score : 'N/A'}
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <span className="text-sm text-slate-600 dark:text-brand-200">Status</span>
                    {isSelected ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-400/20">
                            <CheckSquareIcon className="w-4 h-4" />Terpilih
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Belum dipilih</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
});
Step2_StudentMobileCard.displayName = 'Step2_StudentMobileCard';

