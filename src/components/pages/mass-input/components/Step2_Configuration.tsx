import React, { useState } from 'react';
import { Input } from '../../../ui/Input';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { Button } from '../../../ui/Button';
import { ViolationConfigurationFields } from './ViolationConfigurationFields';
import { XCircleIcon, ChevronDownIcon, SparklesIcon, ClipboardPasteIcon, UploadIcon } from '../../../Icons';
import { SlidersHorizontal } from 'lucide-react';
import { type ViolationItem } from '../../../../services/violations.data';
import { InputMode, ClassRow } from '../types';
import { QUIZ_ACTIVITY_CATEGORIES, QUIZ_CATEGORY_DEFAULT_NAMES, QUIZ_ACTIVITY_SUGGESTIONS, BINTANG_ATTITUDE_ASPECTS, ATTITUDE_SUGGESTIONS } from '../constants';
import { SemesterSelector } from '../../../ui/SemesterSelector';


/**
 * Nama penilaian bawaan. Dipakai bersama nama yang sudah pernah tersimpan untuk
 * mapel ini supaya guru bisa memakai ulang nama penilaian yang sama tanpa
 * mengetiknya lagi dari awal.
 */
const DEFAULT_ASSESSMENT_NAMES = ['PH 1', 'PH 2', 'PH 3', 'PH 4', 'PH 5', 'PH 6', 'PH 7', 'PH 8', 'SAS', 'SAT'];

/**
 * Text input that applies its value on blur or Enter instead of on every
 * keystroke. Subject and assessment names identify where scores are saved, so
 * a half-typed name ("PH1" on the way to "PH10") must not switch the context.
 * Remount it (via `key`) to reset the text to `value`.
 */
const CommitOnBlurInput: React.FC<{
    id: string;
    value: string;
    onCommit: (value: string) => void;
    placeholder: string;
    className: string;
}> = ({ id, value, onCommit, placeholder, className }) => {
    const [text, setText] = useState(value);
    const commit = () => {
        const next = text.trim();
        if (next !== value) onCommit(next);
    };
    return (
        <Input
            id={id}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
            }}
            placeholder={placeholder}
            autoFocus={!value}
            required
            className={className}
        />
    );
};

const buildAssessmentOptions = (savedNames?: string[]) => {
    const names = new Map<string, string>();
    DEFAULT_ASSESSMENT_NAMES.forEach(name => names.set(name, name));
    (savedNames || []).forEach(name => {
        if (name && name.trim() !== '') names.set(name, name);
    });
    return [
        ...Array.from(names, ([value, label]) => ({ value, label })),
        { value: '__NEW__', label: '+ Ketik Penilaian Baru' },
    ];
};

interface Step2_ConfigurationProps {
    mode: InputMode | null;
    isConfigOpen: boolean;
    setIsConfigOpen: (open: boolean) => void;
    selectedClass: string;
    setSelectedClass: (id: string) => void;
    classes: ClassRow[] | undefined;
    isLoadingClasses: boolean;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    setQuizInfo: React.Dispatch<React.SetStateAction<{ name: string; category?: string; subject: string; date: string; points: number; max_points: number }>>;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    setSubjectGradeInfo: React.Dispatch<React.SetStateAction<{ subject: string; assessment_name: string; notes: string; semester: string }>>;
    isCustomSubject: boolean;
    setIsCustomSubject: (isCustom: boolean) => void;
    uniqueSubjects: string[] | undefined;
    selectedViolationCode: string;
    setSelectedViolationCode: (code: string) => void;
    violationDate: string;
    setViolationDate: (date: string) => void;
    violationNotes: string;
    setViolationNotes: (notes: string) => void;
    noteMethod: 'ai' | 'template';
    setNoteMethod: (method: 'ai' | 'template') => void;
    templateNote: string;
    setTemplateNote: (note: string) => void;
    assessmentNames: string[] | undefined;
    pasteData: string;
    setPasteData: (data: string) => void;
    isParsing: boolean;
    handleAiParse: () => void;
    isOnline: boolean;
    onOpenImport?: () => void;
    bypassDuplicateGuard: boolean;
    setBypassDuplicateGuard: (v: boolean) => void;
    kkm: number;
    setKkm: (v: number) => void;
    attitudeDate?: string;
    setAttitudeDate?: (date: string) => void;
    attitudeCategory?: string;
    setAttitudeCategory?: (cat: string) => void;
    attitudeName?: string;
    setAttitudeName?: (name: string) => void;
    attitudePoints?: number;
    setAttitudePoints?: (pts: number) => void;
    attitudeNotes?: string;
    setAttitudeNotes?: (notes: string) => void;
    /** Most-used violations, shown as one-tap chips above the full picker. */
    frequentViolations?: ViolationItem[];
    /** Changes when a subject/assessment switch was cancelled; resets typed names. */
    configResetKey?: number;
}

export const Step2_Configuration: React.FC<Step2_ConfigurationProps> = ({
    mode, isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
    quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo, isCustomSubject, setIsCustomSubject,
    uniqueSubjects, assessmentNames, selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
    violationNotes, setViolationNotes, noteMethod, setNoteMethod, templateNote, setTemplateNote,
    pasteData, setPasteData, isParsing, handleAiParse, isOnline, onOpenImport,
    kkm, setKkm,
    attitudeDate, setAttitudeDate,
    attitudeCategory = 'Adab & Akhlak', setAttitudeCategory,
    attitudeName = 'Adab & Kesantunan', setAttitudeName,
    attitudePoints: _attitudePoints = 1, setAttitudePoints: _setAttitudePoints,
    attitudeNotes, setAttitudeNotes,
    frequentViolations = [],
    configResetKey = 0,
}) => {
    const [isCustomAssessment, setIsCustomAssessment] = useState(false);


    return (
        <div className="lg:col-span-1 space-y-6 animate-fade-in-left">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-visible">
                <button
                    type="button"
                    aria-expanded={isConfigOpen}
                    aria-controls="mass-input-configuration"
                    className="w-full p-4 sm:p-5 rounded-t-2xl border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center cursor-pointer bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                >
                    <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-600/20 flex-shrink-0">
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block font-extrabold text-base text-slate-900 dark:text-white leading-tight">Konfigurasi</span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Parameter kelas & penilaian</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {isConfigOpen ? 'Sembunyikan' : 'Tampilkan'}
                        </span>
                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 dark:text-white/70 transition-transform duration-300 ${isConfigOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                <div id="mass-input-configuration" className={`rounded-b-2xl p-4 sm:p-5 space-y-5 bg-white dark:bg-slate-900 ${isConfigOpen ? 'block' : 'hidden'}`}>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="class-select" className="block text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">Kelas</label>
                            <CustomDropdown
                                id="class-select"
                                value={selectedClass}
                                onChange={setSelectedClass}
                                disabled={isLoadingClasses}
                                placeholder="-- Pilih Kelas --"
                                options={classes?.map(c => ({ value: c.id, label: c.name })) || []}
                                className="border-slate-200 dark:border-white/10 focus:ring-brand-500"
                            />
                        </div>



                        {mode === 'quiz' && (
                            <>
                                {/* Activity Category Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-brand-600 dark:text-brand-300 tracking-wider uppercase">Kategori Aktivitas</label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {QUIZ_ACTIVITY_CATEGORIES.map((cat) => {
                                            const isSelected = (quizInfo.category || 'bertanya') === cat.value;
                                            const CatIcon = cat.IconComponent;
                                            return (
                                                <button
                                                    key={cat.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setQuizInfo(p => ({
                                                            ...p,
                                                            category: cat.value,
                                                            name: QUIZ_CATEGORY_DEFAULT_NAMES[cat.value] || cat.label
                                                        }));
                                                    }}
                                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left min-h-[44px] ${isSelected
                                                        ? 'border-brand-500 bg-brand-50/90 dark:bg-brand-900/30 ring-2 ring-brand-500/40 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-brand-300 dark:hover:border-slate-600'
                                                        }`}
                                                >
                                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        isSelected
                                                            ? 'bg-brand-600 text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        <CatIcon className="w-4 h-4" />
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                                        {cat.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="quiz-name" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Nama Aktivitas</label>
                                    <Input id="quiz-name" value={quizInfo.name} onChange={e => setQuizInfo(p => ({ ...p, name: e.target.value }))} placeholder="cth. Aktif Bertanya" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                    {/* Quick suggestions based on active category */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {(QUIZ_ACTIVITY_SUGGESTIONS[quizInfo.category || 'bertanya'] || QUIZ_ACTIVITY_SUGGESTIONS['bertanya']).map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setQuizInfo(p => ({ ...p, name: suggestion }))}
                                                className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                                                    quizInfo.name === suggestion
                                                        ? 'bg-brand-600 text-white font-bold shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-brand-600 dark:hover:text-brand-300'
                                                }`}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="quiz-subject" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Mata Pelajaran / Kategori</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="quiz-subject"
                                                value={quizInfo.subject}
                                                onChange={e => setQuizInfo(p => ({ ...p, subject: e.target.value }))}
                                                placeholder="Ketik nama mapel baru..."
                                                autoFocus
                                                required
                                                className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => { setIsCustomSubject(false); setQuizInfo(p => ({ ...p, subject: '' })); }}
                                                title="Kembali ke daftar"
                                                className="px-3 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <CustomDropdown
                                            id="quiz-subject"
                                            value={quizInfo.subject}
                                            onChange={val => {
                                                if (val === '__NEW__') {
                                                    setIsCustomSubject(true);
                                                    setQuizInfo(p => ({ ...p, subject: '' }));
                                                } else {
                                                    setQuizInfo(p => ({ ...p, subject: val }));
                                                }
                                            }}
                                            placeholder="-- Pilih Mapel / Kategori --"
                                            options={[
                                                { value: 'Umum (Non-Mapel)', label: 'Umum (Non-Mapel)' },
                                                ...(uniqueSubjects?.map(s => ({ value: s, label: s })) || []),
                                                { value: '__NEW__', label: '+ Ketik Mapel Baru' }
                                            ]}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="quiz-date" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Tanggal</label>
                                    <Input id="quiz-date" type="date" value={quizInfo.date} onChange={e => setQuizInfo(p => ({ ...p, date: e.target.value }))} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl" />
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                    <span className="font-bold">+1 poin tetap</span> diberikan untuk setiap siswa yang dipilih.
                                </div>
                                
                            </>
                        )}

                        {mode === 'subject_grade' && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="grade-subject" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Mata Pelajaran</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <CommitOnBlurInput
                                                key={`subject::${subjectGradeInfo.subject}::${configResetKey}`}
                                                id="grade-subject"
                                                value={subjectGradeInfo.subject}
                                                onCommit={subject => setSubjectGradeInfo(p => ({ ...p, subject }))}
                                                placeholder="Ketik nama mapel baru..."
                                                className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => { setIsCustomSubject(false); setSubjectGradeInfo(p => ({ ...p, subject: '' })); }}
                                                title="Kembali ke daftar"
                                                className="px-3 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <CustomDropdown
                                            id="grade-subject"
                                            value={subjectGradeInfo.subject}
                                            onChange={val => {
                                                if (val === '__NEW__') {
                                                    setIsCustomSubject(true);
                                                    setSubjectGradeInfo(p => ({ ...p, subject: '' }));
                                                } else {
                                                    setSubjectGradeInfo(p => ({ ...p, subject: val }));
                                                }
                                            }}
                                            placeholder="-- Pilih Mapel --"
                                            options={[
                                                ...(uniqueSubjects?.map(s => ({ value: s, label: s })) || []),
                                                { value: '__NEW__', label: '+ Ketik Mapel Baru' }
                                            ]}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="assessment-name" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Nama Penilaian</label>
                                    {isCustomAssessment ? (
                                        <div className="flex gap-2">
                                            <CommitOnBlurInput
                                                key={`assessment::${subjectGradeInfo.assessment_name}::${configResetKey}`}
                                                id="assessment-name"
                                                value={subjectGradeInfo.assessment_name}
                                                onCommit={assessment_name => setSubjectGradeInfo(p => ({ ...p, assessment_name }))}
                                                placeholder="Ketik nama penilaian baru..."
                                                className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsCustomAssessment(false);
                                                    setSubjectGradeInfo(p => ({ ...p, assessment_name: '' }));
                                                }}
                                                title="Kembali ke daftar"
                                                className="px-3 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <CustomDropdown
                                            id="assessment-name"
                                            value={subjectGradeInfo.assessment_name}
                                            onChange={val => {
                                                if (val === '__NEW__') {
                                                    setIsCustomAssessment(true);
                                                    setSubjectGradeInfo(p => ({ ...p, assessment_name: '' }));
                                                } else {
                                                    setSubjectGradeInfo(p => ({ ...p, assessment_name: val }));
                                                }
                                            }}
                                            placeholder="-- Pilih Penilaian --"
                                            options={buildAssessmentOptions(assessmentNames)}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="semester-select" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Semester</label>
                                    <SemesterSelector
                                        value={subjectGradeInfo.semester}
                                        onChange={(val) => setSubjectGradeInfo(p => ({ ...p, semester: val }))}
                                        includeAllOption={false}
                                        activeOnly={false}
                                        showIcon={true}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="grade-kkm" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">KKM (Kriteria Ketuntasan Minimal)</label>
                                    <Input id="grade-kkm" type="number" min="0" max="100" value={kkm} onChange={e => setKkm(Math.max(0, Math.min(100, Number(e.target.value) || 75)))} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-center font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="grade-notes" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Catatan (Opsional)</label>
                                    <Input id="grade-notes" value={subjectGradeInfo.notes} onChange={e => setSubjectGradeInfo(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan umum untuk semua nilai" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                </div>

                                {/* Import Excel Button */}
                                {onOpenImport && (
                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            onClick={onOpenImport}
                                            className="w-full h-12 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                            Import dari Excel
                                        </Button>
                                        <p className="text-xs text-brand-300/60 mt-2 text-center">Upload file Excel atau CSV dengan data nilai</p>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'violation' && (
                            <ViolationConfigurationFields
                                selectedCode={selectedViolationCode}
                                onSelect={setSelectedViolationCode}
                                date={violationDate}
                                onDateChange={setViolationDate}
                                notes={violationNotes}
                                onNotesChange={setViolationNotes}
                                frequentViolations={frequentViolations}
                            />
                        )}

                        {mode === 'attitude' && (
                            <>
                                {/* 1. Tanggal Penilaian */}
                                <div className="space-y-2">
                                    <label htmlFor="attitude-date" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase flex items-center justify-between">
                                        <span>Tanggal Penilaian</span>
                                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Rapot BINTANG</span>
                                    </label>
                                    <Input
                                        id="attitude-date"
                                        type="date"
                                        value={attitudeDate || ''}
                                        onChange={e => setAttitudeDate?.(e.target.value)}
                                        className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl"
                                    />
                                </div>

                                {/* 2. Kategori Aspek BINTANG */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-brand-600 dark:text-brand-300 tracking-wider uppercase">
                                        Kategori Sikap / Aspek BINTANG
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {BINTANG_ATTITUDE_ASPECTS.map(asp => {
                                            const isSelected = attitudeCategory === asp.value;
                                            const AspIcon = asp.IconComponent;
                                            return (
                                                <button
                                                    key={asp.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setAttitudeCategory?.(asp.value);
                                                        setAttitudeName?.(asp.defaultActivity);
                                                    }}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                                                        isSelected
                                                            ? 'border-brand-500 bg-brand-50/90 dark:bg-brand-900/30 ring-2 ring-brand-500/40 shadow-sm'
                                                            : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-brand-300 dark:hover:border-slate-600'
                                                    }`}
                                                >
                                                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        isSelected
                                                            ? 'bg-brand-600 text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        <AspIcon className="w-4 h-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-snug">{asp.label}</p>
                                                            {isSelected && (
                                                                <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400 flex-shrink-0 animate-pulse" />
                                                            )}
                                                        </div>
                                                        <p className="text-xxs sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{asp.menunjang}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Nama / Aktivitas Pembiasaan Sikap */}
                                <div className="space-y-2">
                                    <label htmlFor="attitude-name" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">
                                        Aktivitas / Sikap Positif
                                    </label>
                                    <Input
                                        id="attitude-name"
                                        value={attitudeName || ''}
                                        onChange={e => setAttitudeName?.(e.target.value)}
                                        placeholder="cth. Adab Berbicara Santun"
                                        className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                    />
                                    {/* Quick chips */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {(ATTITUDE_SUGGESTIONS[attitudeCategory] || ATTITUDE_SUGGESTIONS['Adab & Akhlak']).map(sug => (
                                            <button
                                                key={sug}
                                                type="button"
                                                onClick={() => setAttitudeName?.(sug)}
                                                className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                                                    attitudeName === sug
                                                        ? 'bg-brand-600 text-white font-bold shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-brand-600 dark:hover:text-brand-300'
                                                }`}
                                            >
                                                {sug}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Poin Sikap */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">
                                        Poin Apresiasi
                                    </label>
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                                        <span className="font-bold">+1 poin tetap</span> untuk setiap siswa yang dipilih.
                                    </div>
                                </div>

                                {/* 5. Keterangan Tambahan (Opsional) */}
                                <div className="space-y-2">
                                    <label htmlFor="attitude-notes" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase flex items-center justify-between">
                                        <span>Keterangan Tambahan</span>
                                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Opsional</span>
                                    </label>
                                    <Input
                                        id="attitude-notes"
                                        value={attitudeNotes || ''}
                                        onChange={e => setAttitudeNotes?.(e.target.value)}
                                        placeholder="cth. Membantu merapikan ruang kelas saat istirahat"
                                        className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                    />
                                </div>

                                {/* 6. Edukasi Rapot BINTANG Banner */}
                                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-brand-500/10 border border-emerald-500/20 space-y-1.5">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                        <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                        <span>Terhubung ke Rapot BINTANG</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        Poin ini otomatis menunjang nilai <strong>Adab, Sikap, dan Kerapian</strong> (menetralkan poin pelanggaran) serta tampil pada <strong>Rincian Poin Keaktifan &amp; Prestasi</strong> rapor.
                                    </p>
                                </div>

                            </>
                        )}

                        {mode === 'bulk_report' && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="note-method" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Metode Catatan Guru</label>
                                    <CustomDropdown
                                        id="note-method"
                                        value={noteMethod}
                                        onChange={val => setNoteMethod(val as 'ai' | 'template')}
                                        placeholder="-- Pilih Metode --"
                                        options={[
                                            { value: 'ai', label: 'Generate dengan AI' },
                                            { value: 'template', label: 'Gunakan Template' }
                                        ]}
                                    />
                                </div>
                                {noteMethod === 'template' && (
                                    <div className="space-y-2">
                                        <label htmlFor="template-note" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Template Catatan</label>
                                        <textarea id="template-note" value={templateNote} onChange={e => setTemplateNote(e.target.value)} rows={4} className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"></textarea>
                                        <p className="text-xs text-brand-600 dark:text-brand-300">Gunakan [Nama Siswa] untuk personalisasi.</p>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'academic_print' && (
                            <div className="space-y-2">
                                <label htmlFor="print-subject" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Mata Pelajaran</label>
                                {isCustomSubject ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="print-subject"
                                            value={subjectGradeInfo.subject}
                                            onChange={e => setSubjectGradeInfo(p => ({ ...p, subject: e.target.value }))}
                                            placeholder="Ketik nama mapel baru..."
                                            autoFocus
                                            required
                                            className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => { setIsCustomSubject(false); setSubjectGradeInfo(p => ({ ...p, subject: '' })); }}
                                            title="Kembali ke daftar"
                                            className="px-3 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <CustomDropdown
                                        id="print-subject"
                                        value={subjectGradeInfo.subject}
                                        onChange={val => {
                                            if (val === '__NEW__') {
                                                setIsCustomSubject(true);
                                                setSubjectGradeInfo(p => ({ ...p, subject: '' }));
                                            } else {
                                                setSubjectGradeInfo(p => ({ ...p, subject: val }));
                                            }
                                        }}
                                        placeholder="-- Pilih Mapel --"
                                        options={[
                                            ...(uniqueSubjects?.map(s => ({ value: s, label: s })) || []),
                                            { value: '__NEW__', label: '+ Ketik Mapel Baru' }
                                        ]}
                                    />
                                )}
                            </div>
                        )}


                    </div>
                </div>
            </div>

            {mode === 'subject_grade' && isOnline && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 pb-3.5 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                            <ClipboardPasteIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                                Tempel Data Nilai (AI)
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Cocokkan daftar nama & nilai secara otomatis
                            </p>
                        </div>
                    </div>

                    {/* Format Guide */}
                    <div className="mb-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                        <p className="text-[11px] font-bold text-brand-600 dark:text-brand-300 mb-1.5 uppercase tracking-wider">Contoh Format Teks:</p>
                        <div className="grid grid-cols-2 gap-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                            <p>Ahmad Fauzi - 85</p>
                            <p>Budi Santoso: 90</p>
                            <p>Citra Dewi 78</p>
                            <p>1. Diana Putri 92</p>
                        </div>
                    </div>

                    <textarea
                        value={pasteData}
                        onChange={e => setPasteData(e.target.value)}
                        placeholder="Paste data nilai di sini...&#10;Contoh: Budi Santoso 95"
                        rows={4}
                        className="w-full p-3 text-sm border rounded-xl bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all mb-3"
                    ></textarea>
                    <Button onClick={handleAiParse} disabled={isParsing} className="w-full bg-brand-600 hover:bg-brand-700 text-white border-none h-11 rounded-xl font-bold tracking-wide shadow-sm">
                        {isParsing ? 'Memproses...' : 'Proses dengan AI'}
                    </Button>
                </div>
            )}
        </div>
    );
};
