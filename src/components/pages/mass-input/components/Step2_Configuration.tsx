import React, { useState } from 'react';
import { Input } from '../../../ui/Input';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { XCircleIcon, ChevronDownIcon, SparklesIcon, ClipboardPasteIcon, SearchIcon, CheckIcon, UploadIcon } from '../../../Icons';
import { violationList } from '../../../../services/violations.data';
import { InputMode, ClassRow } from '../types';
import { SemesterSelector } from '../../../ui/SemesterSelector';

const CATEGORY_DEFAULT_NAMES: Record<string, string> = {
    bertanya: 'Aktif bertanya di kelas',
    menjawab: 'Menjawab pertanyaan guru',
    presentasi: 'Presentasi tugas',
    diskusi: 'Aktif dalam diskusi',
    tugas: 'Mengerjakan tugas tambahan',
    lainnya: 'Partisipasi aktif',
};

interface Step2_ConfigurationProps {
    mode: InputMode | null;
    isConfigOpen: boolean;
    setIsConfigOpen: (open: boolean) => void;
    selectedClass: string;
    setSelectedClass: (id: string) => void;
    classes: ClassRow[] | undefined;
    isLoadingClasses: boolean;
    quizInfo: { name: string; subject: string; date: string; points: number; max_points: number };
    setQuizInfo: React.Dispatch<React.SetStateAction<{ name: string; subject: string; date: string; points: number; max_points: number }>>;
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
    handleSubmit?: () => void;
    isSubmitDisabled?: boolean;
    isSubmitting?: boolean;
    submitButtonTooltip?: string;
}

export const Step2_Configuration: React.FC<Step2_ConfigurationProps> = ({
    mode, isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
    quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo, isCustomSubject, setIsCustomSubject,
    uniqueSubjects, selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
    violationNotes, setViolationNotes, noteMethod, setNoteMethod, templateNote, setTemplateNote,
    pasteData, setPasteData, isParsing, handleAiParse, isOnline, onOpenImport,
    handleSubmit, isSubmitDisabled, isSubmitting, submitButtonTooltip, kkm, setKkm
}) => {
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    const [violationSearchTerm, setViolationSearchTerm] = useState('');
    const [isCustomAssessment, setIsCustomAssessment] = useState(false);

    // Find selected violation
    const selectedViolation = violationList.find(v => v.code === selectedViolationCode);

    // Filter violations based on search
    const filteredViolations = violationList.filter(v =>
        v.description.toLowerCase().includes(violationSearchTerm.toLowerCase()) ||
        v.code.toLowerCase().includes(violationSearchTerm.toLowerCase())
    );

    const handleViolationSelect = (code: string) => {
        setSelectedViolationCode(code);
        setIsViolationModalOpen(false);
        setViolationSearchTerm('');
    };
    return (
        <div className="lg:col-span-1 space-y-6 animate-fade-in-left">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-brand-600/10">
                <div
                    className="p-5 sm:p-6 rounded-t-3xl border-b border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center border border-brand-200 dark:border-white/10">
                            <SparklesIcon className="w-5 h-5 text-brand-600 dark:text-brand-300" />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-wide">Konfigurasi</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden lg:inline text-xs font-bold text-slate-400 dark:text-slate-500">
                            {isConfigOpen ? 'Sembunyikan' : 'Tampilkan'}
                        </span>
                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 dark:text-white/70 transition-transform duration-300 ${isConfigOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                <div className={`p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900/50 ${isConfigOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="class-select" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Kelas</label>
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
                                    <label className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Kategori Aktivitas</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { value: 'bertanya', label: 'Bertanya', icon: '❓' },
                                            { value: 'menjawab', label: 'Menjawab', icon: '💡' },
                                            { value: 'presentasi', label: 'Presentasi', icon: '🎤' },
                                            { value: 'diskusi', label: 'Diskusi', icon: '💬' },
                                            { value: 'tugas', label: 'Tugas Tambahan', icon: '📝' },
                                            { value: 'lainnya', label: 'Lainnya', icon: '⭐' },
                                        ].map((cat) => (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => {
                                                    setQuizInfo(p => ({ ...p, name: CATEGORY_DEFAULT_NAMES[cat.value] || cat.label }));
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left min-w-0 overflow-hidden ${quizInfo.name === CATEGORY_DEFAULT_NAMES[cat.value]
                                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 bg-white dark:bg-slate-800'
                                                    }`}
                                            >
                                                <span className="text-base sm:text-lg flex-shrink-0">{cat.icon}</span>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate min-w-0 leading-tight">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="quiz-name" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Nama Aktivitas</label>
                                    <Input id="quiz-name" value={quizInfo.name} onChange={e => setQuizInfo(p => ({ ...p, name: e.target.value }))} placeholder="cth. Aktif Bertanya" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                    {/* Quick suggestions */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {['Aktif bertanya', 'Menjawab benar', 'Presentasi bagus', 'Diskusi aktif', 'Tugas tambahan'].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setQuizInfo(p => ({ ...p, name: suggestion }))}
                                                className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
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
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor="quiz-points" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Poin</label>
                                        <Input id="quiz-points" type="number" min="1" max="100" value={quizInfo.points} onChange={e => setQuizInfo(p => ({ ...p, points: Math.max(1, Number(e.target.value) || 1) }))} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-center font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="quiz-max-points" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Poin Maks</label>
                                        <Input id="quiz-max-points" type="number" min="1" max="100" value={quizInfo.max_points} onChange={e => setQuizInfo(p => ({ ...p, max_points: Math.max(1, Number(e.target.value) || 1) }))} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-center font-bold" />
                                    </div>
                                </div>
                                
                                {handleSubmit && selectedClass === 'all' && (
                                    <div className="pt-2" title={submitButtonTooltip}>
                                        <Button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitDisabled || isSubmitting}
                                            className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold tracking-wide shadow-md shadow-brand-600/30"
                                        >
                                            <CheckIcon className="w-5 h-5 mr-2" />
                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Keaktifan'}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'subject_grade' && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="grade-subject" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Mata Pelajaran</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="grade-subject"
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
                                            <Input
                                                id="assessment-name"
                                                value={subjectGradeInfo.assessment_name}
                                                onChange={e => setSubjectGradeInfo(p => ({ ...p, assessment_name: e.target.value }))}
                                                placeholder="Ketik nama penilaian baru..."
                                                autoFocus
                                                required
                                                className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => { setIsCustomAssessment(false); setSubjectGradeInfo(p => ({ ...p, assessment_name: '' })); }}
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
                                            options={[
                                                ...['PH 1', 'PH 2', 'PH 3', 'PH 4', 'PH 5', 'PH 6', 'PH 7', 'PH 8', 'SAS', 'SAT'].map(s => ({ value: s, label: s })),
                                                { value: '__NEW__', label: '+ Ketik Penilaian Baru' }
                                            ]}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="semester-select" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Semester</label>
                                    <SemesterSelector
                                        value={subjectGradeInfo.semester}
                                        onChange={(val) => setSubjectGradeInfo(p => ({ ...p, semester: val }))}
                                        includeAllOption={false}
                                        activeOnly={true}
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
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Jenis Pelanggaran</label>
                                    <Button
                                        type="button"
                                        onClick={() => setIsViolationModalOpen(true)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-500/50 text-slate-900 dark:text-white rounded-xl flex items-center justify-between px-4 transition-all"
                                    >
                                        <span className={selectedViolation ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/30'}>
                                            {selectedViolation ? selectedViolation.description : '-- Pilih Pelanggaran --'}
                                        </span>
                                        <ChevronDownIcon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                                    </Button>
                                    {selectedViolation && (
                                        <p className="text-xs text-brand-600 dark:text-brand-300 mt-1">{selectedViolation.points} poin</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="violation-date" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Tanggal</label>
                                    <Input id="violation-date" type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="violation-notes" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Keterangan (Opsional)</label>
                                    <textarea
                                        id="violation-notes"
                                        placeholder="Contoh: Terlambat 15 menit karena macet..."
                                        value={violationNotes}
                                        onChange={(e) => setViolationNotes(e.target.value)}
                                        className="w-full h-24 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-500/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-all"
                                    />
                                </div>
                                
                                {handleSubmit && selectedClass === 'all' && (
                                    <div className="pt-2" title={submitButtonTooltip}>
                                        <Button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitDisabled || isSubmitting}
                                            className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold tracking-wide shadow-md shadow-brand-600/30"
                                        >
                                            <CheckIcon className="w-5 h-5 mr-2" />
                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggaran'}
                                        </Button>
                                    </div>
                                )}

                                {/* Violation Selection Modal */}
                                <Modal
                                    isOpen={isViolationModalOpen}
                                    onClose={() => { setIsViolationModalOpen(false); setViolationSearchTerm(''); }}
                                    title="Pilih Jenis Pelanggaran"
                                    icon={<SparklesIcon className="w-6 h-6" />}
                                >
                                    <div className="space-y-4">
                                        {/* Search Input */}
                                        <div className="relative sticky top-0 z-10">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Cari pelanggaran..."
                                                value={violationSearchTerm}
                                                onChange={(e) => setViolationSearchTerm(e.target.value)}
                                                className="pl-10 h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Violations List */}
                                        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                            {filteredViolations.length === 0 ? (
                                                <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                        <SearchIcon className="w-8 h-8 opacity-50" />
                                                    </div>
                                                    <p className="font-medium">Tidak ada pelanggaran ditemukan</p>
                                                    <p className="text-sm opacity-70">Coba kata kunci lain</p>
                                                </div>
                                            ) : (
                                                ['Ringan', 'Sedang', 'Berat'].map(category => {
                                                    const categoryViolations = filteredViolations.filter(v => v.category === category);
                                                    if (categoryViolations.length === 0) return null;

                                                    const colorClass =
                                                        category === 'Ringan' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                                                            category === 'Sedang' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                                                                'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';

                                                    return (
                                                        <div key={category} className="space-y-3">
                                                            <div className={`sticky top-0 z-0 px-4 py-2 rounded-lg border backdrop-blur-md font-bold text-sm tracking-wide uppercase flex items-center gap-2 ${colorClass}`}>
                                                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                                                Pelanggaran {category}
                                                            </div>
                                                            <div className="grid gap-3">
                                                                {categoryViolations.map((violation) => (
                                                                    <div
                                                                        key={violation.code}
                                                                        onClick={() => handleViolationSelect(violation.code)}
                                                                        className={`
                                                                            relative p-4 rounded-xl cursor-pointer transition-all duration-200 border group
                                                                            ${selectedViolationCode === violation.code
                                                                                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-500 shadow-md transform scale-[1.01]'
                                                                                : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md'
                                                                            }
                                                                        `}
                                                                    >
                                                                        <div className="flex items-start gap-4">
                                                                            <div className={`
                                                                                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-colors
                                                                                ${selectedViolationCode === violation.code
                                                                                    ? 'bg-brand-600 text-white'
                                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-600 dark:group-hover:text-brand-400'
                                                                                }
                                                                            `}>
                                                                                {violation.points}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className={`
                                                                                    font-medium text-sm mb-1.5 leading-relaxed
                                                                                    ${selectedViolationCode === violation.code
                                                                                        ? 'text-brand-900 dark:text-brand-100'
                                                                                        : 'text-gray-900 dark:text-gray-100'
                                                                                    }
                                                                                `}>
                                                                                    {violation.description}
                                                                                </h4>
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                                                        #{violation.code}
                                                                                    </span>
                                                                                    {selectedViolationCode === violation.code && (
                                                                                        <span className="text-xs font-medium text-brand-600 dark:text-brand-400 flex items-center gap-1 animate-fade-in">
                                                                                            <CheckIcon className="w-3 h-3" /> Terpilih
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </Modal>
                            </>
                        )}

                        {mode === 'attitude' && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="attitude-subject" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Mata Pelajaran</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <Input id="attitude-subject" value={subjectGradeInfo.subject} onChange={e => setSubjectGradeInfo(p => ({ ...p, subject: e.target.value }))} placeholder="Ketik nama mapel..." autoFocus required className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                            <Button variant="outline" onClick={() => { setIsCustomSubject(false); setSubjectGradeInfo(p => ({ ...p, subject: '' })); }} title="Kembali ke daftar" className="px-3 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"><XCircleIcon className="w-5 h-5" /></Button>
                                        </div>
                                    ) : (
                                        <CustomDropdown id="attitude-subject" value={subjectGradeInfo.subject} onChange={val => { if (val === '__NEW__') { setIsCustomSubject(true); setSubjectGradeInfo(p => ({ ...p, subject: '' })); } else { setSubjectGradeInfo(p => ({ ...p, subject: val })); } }} placeholder="-- Pilih Mapel --" options={[{ value: 'Umum', label: 'Umum (Semua Mapel)' }, ...(uniqueSubjects?.map(s => ({ value: s, label: s })) || []), { value: '__NEW__', label: '+ Ketik Mapel Baru' }]} />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="attitude-assessment" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Nama Penilaian</label>
                                    <Input id="attitude-assessment" value={subjectGradeInfo.assessment_name} onChange={e => setSubjectGradeInfo(p => ({ ...p, assessment_name: e.target.value }))} placeholder="cth. Sikap Semester Ganjil" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="attitude-semester" className="text-sm font-bold text-brand-600 dark:text-brand-200 tracking-wide uppercase">Semester</label>
                                    <SemesterSelector value={subjectGradeInfo.semester} onChange={(val) => setSubjectGradeInfo(p => ({ ...p, semester: val }))} includeAllOption={false} activeOnly={true} showIcon={true} className="w-full" />
                                </div>
                                <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20">
                                    <p className="text-xs font-bold text-pink-700 dark:text-pink-300 mb-2">Predikat Sikap:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-pink-600 dark:text-pink-400">
                                        <span>SB = Sangat Baik</span><span>B = Baik</span>
                                        <span>C = Cukup</span><span>K = Kurang</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20">
                                    <p className="text-xs text-sky-600 dark:text-sky-300">
                                        Isi predikat Sikap Spiritual (KI-1) dan Sikap Sosial (KI-2) untuk setiap siswa di panel daftar siswa.
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
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl shadow-brand-600/10">
                    <h3 className="font-bold text-lg mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                        <ClipboardPasteIcon className="w-5 h-5 text-brand-600 dark:text-brand-300" />
                        Tempel Data Nilai
                    </h3>

                    {/* Format Guide */}
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <p className="text-xs font-bold text-brand-600 dark:text-brand-200 mb-2 uppercase tracking-wide">Format yang Didukung:</p>
                        <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-white/70">
                            <p>Ahmad Fauzi - 85</p>
                            <p>Budi Santoso: 90</p>
                            <p>Citra Dewi 78</p>
                            <p>1. Diana Putri 92</p>
                        </div>
                        <p className="mt-2 text-xxs text-brand-500 dark:text-brand-300/70">
                            AI akan mencocokkan nama dengan daftar siswa secara otomatis.
                        </p>
                    </div>

                    <textarea
                        value={pasteData}
                        onChange={e => setPasteData(e.target.value)}
                        placeholder="Paste data nilai di sini...&#10;Contoh: Budi Santoso 95"
                        rows={5}
                        className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all mb-3"
                    ></textarea>
                    <Button onClick={handleAiParse} disabled={isParsing} className="w-full bg-brand-600 hover:bg-brand-700 text-white border-none h-12 rounded-xl font-bold tracking-wide">
                        {isParsing ? 'Memproses...' : 'Proses dengan AI'}
                    </Button>
                </div>
            )}
        </div>
    );
};
