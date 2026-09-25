import React from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { CheckSquareIcon } from '../../../Icons';
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
    activeAttitudeCategory: { icon: string; label: string };
    activeQuizCategory: { icon: string; label: string };
    validationError?: string;
    onSelect: (id: string) => void;
    onScoreChange: (id: string, value: string) => void;
    onScoreFocus?: (id: string | null) => void;
    registerInputRef: (index: number, el: HTMLInputElement | null) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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

    return (
        <tr
            key={s.id}
            onClick={mode !== 'subject_grade' ? () => onSelect(s.id) : undefined}
            className={`
                group transition-colors duration-150 rounded-xl
                focus-within:bg-brand-50/70 focus-within:dark:bg-brand-950/20 focus-within:shadow-md
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
                        onSelect(s.id);
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
                            {classNameLabel && (
                                <span className="ml-2 text-xs text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800/50">
                                    {classNameLabel}
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
                                onKeyDown={onKeyDown}
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
                                className={`w-24 text-center font-bold text-lg h-10 rounded-xl transition-colors ${
                                    validationError
                                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                        : isPassing
                                        ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-100 focus:ring-emerald-500'
                                        : isFailing
                                        ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 focus:ring-rose-500'
                                        : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 focus:ring-brand-500'
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

    return (
        <div
            key={s.id}
            onClick={mode !== 'subject_grade' ? () => onSelect(s.id) : undefined}
            className={`
                rounded-2xl p-4 border transition-colors duration-150
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
                        onSelect(s.id);
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
                    {classNameLabel && (
                        <span className="inline-block mt-1 text-xs font-normal text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800/50">
                            {classNameLabel}
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
                                onKeyDown={onKeyDown}
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
                                className={`w-full min-w-0 flex-1 text-xl font-bold text-center h-12 rounded-xl transition-colors ${validationError ? 'border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-brand-500'}`}
                            />
                            {hasValidScore && !validationError && (
                                <span className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md whitespace-nowrap flex-shrink-0 ${isPassing ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {isPassing ? 'Tuntas' : 'Belum Tuntas'}
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
                    {isSelected ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-400/20">
                            <CheckSquareIcon className="w-4 h-4" />Terpilih
                        </span>
                    ) : (
                        <span className="text-slate-400 dark:text-white/30 text-sm italic">Belum dipilih</span>
                    )}
                </div>
            )}
        </div>
    );
});
Step2_StudentMobileCard.displayName = 'Step2_StudentMobileCard';
