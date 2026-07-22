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
    quizInfo: { name: string; subject: string; date: string };
    setQuizInfo: React.Dispatch<React.SetStateAction<{ name: string; subject: string; date: string }>>;
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
    handleSubmit?: () => void;
    isSubmitDisabled?: boolean;
    isSubmitting?: boolean;
    submitButtonTooltip?: string;
}

export const Step2_Configuration: React.FC<Step2_ConfigurationProps> = ({
    mode, isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
    quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo, isCustomSubject, setIsCustomSubject,
    uniqueSubjects, selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
    violationNotes, setViolationNotes, noteMethod, setNoteMethod, templateNote, setTemplateNote, assessmentNames,
    pasteData, setPasteData, isParsing, handleAiParse, isOnline, onOpenImport,
    bypassDuplicateGuard, setBypassDuplicateGuard,
    handleSubmit, isSubmitDisabled, isSubmitting, submitButtonTooltip
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
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-indigo-500/10">
                <div
                    className="p-5 sm:p-6 rounded-t-3xl border-b border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-white/10">
                            <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
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
                            <label htmlFor="class-select" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Kelas</label>
                            <CustomDropdown
                                id="class-select"
                                value={selectedClass}
                                onChange={setSelectedClass}
                                disabled={isLoadingClasses}
                                placeholder="-- Pilih Kelas --"
                                options={classes?.map(c => ({ value: c.id, label: c.name })) || []}
                                className="border-slate-200 dark:border-white/10 focus:ring-indigo-500"
                            />
                        </div>

                        {(mode === 'quiz' || mode === 'violation') && (
                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-md">
                                <div className="mt-0.5">
                                    <input
                                        type="checkbox"
                                        id="bypass-duplicate"
                                        checked={bypassDuplicateGuard}
                                        onChange={(e) => setBypassDuplicateGuard(e.target.checked)}
                                        className="w-5 h-5 rounded border-amber-300 dark:border-amber-500/50 text-amber-600 focus:ring-amber-500 dark:focus:ring-amber-500/50 bg-white dark:bg-amber-900/20 cursor-pointer transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="bypass-duplicate" className="text-sm font-bold text-amber-900 dark:text-amber-200 cursor-pointer block mb-1">
                                        Izinkan Input Ganda (Bypass Proteksi)
                                    </label>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Centang ini jika Anda sengaja ingin memasukkan data yang sama untuk siswa dalam waktu berdekatan. Secara default, sistem memblokir input duplikat dalam 10 menit terakhir untuk mencegah klik ganda.
                                    </p>
                                </div>
                            </div>
                        )}

                        {mode === 'quiz' && (
                            <>
                                {/* Activity Category Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Kategori Aktivitas</label>
                                    <div className="grid grid-cols-3 gap-2">
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
                                                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${quizInfo.name === CATEGORY_DEFAULT_NAMES[cat.value]
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800'
                                                    }`}
                                            >
                                                <span className="text-lg">{cat.icon}</span>
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="quiz-name" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Nama Aktivitas</label>
                                    <Input id="quiz-name" value={quizInfo.name} onChange={e => setQuizInfo(p => ({ ...p, name: e.target.value }))} placeholder="cth. Aktif Bertanya" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                    {/* Quick suggestions */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {['Aktif bertanya', 'Menjawab benar', 'Presentasi bagus', 'Diskusi aktif', 'Tugas tambahan'].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setQuizInfo(p => ({ ...p, name: suggestion }))}
                                                className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="quiz-subject" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Mata Pelajaran / Kategori</label>
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
                                    <label htmlFor="quiz-date" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Tanggal</label>
                                    <Input id="quiz-date" type="date" value={quizInfo.date} onChange={e => setQuizInfo(p => ({ ...p, date: e.target.value }))} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl" />
                                </div>
                                
                                {handleSubmit && selectedClass === 'all' && (
                                    <div className="pt-2" title={submitButtonTooltip}>
                                        <Button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitDisabled || isSubmitting}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold tracking-wide shadow-md shadow-indigo-500/30"
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
                                    <label htmlFor="grade-subject" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Mata Pelajaran</label>
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
                                    <label htmlFor="assessment-name" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Nama Penilaian</label>
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
                                    <label htmlFor="semester-select" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Semester</label>
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
                                    <label htmlFor="grade-notes" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Catatan (Opsional)</label>
                                    <Input id="grade-notes" value={subjectGradeInfo.notes} onChange={e => setSubjectGradeInfo(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan umum untuk semua nilai" className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-white/30" />
                                </div>

                                {/* Import Excel Button */}
                                {onOpenImport && (
                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            onClick={onOpenImport}
                                            className="w-full h-12 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                            Import dari Excel
                                        </Button>
                                        <p className="text-xs text-indigo-300/60 mt-2 text-center">Upload file Excel atau CSV dengan data nilai</p>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'violation' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Jenis Pelanggaran</label>
                                    <Button
                                        type="button"
                                        onClick={() => setIsViolationModalOpen(true)}
                                        className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 text-slate-900 dark:text-white rounded-xl flex items-center justify-between px-4 transition-all"
                                    >
                                        <span className={selectedViolation ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/30'}>
                                            {selectedViolation ? selectedViolation.description : '-- Pilih Pelanggaran --'}
                                        </span>
                                        <ChevronDownIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                                    </Button>
                                    {selectedViolation && (
                                        <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">{selectedViolation.points} poin</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="violation-date" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Tanggal</label>
                                    <Input id="violation-date" type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="violation-notes" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Keterangan (Opsional)</label>
                                    <textarea
                                        id="violation-notes"
                                        placeholder="Contoh: Terlambat 15 menit karena macet..."
                                        value={violationNotes}
                                        onChange={(e) => setViolationNotes(e.target.value)}
                                        className="w-full h-24 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                                    />
                                </div>
                                
                                {handleSubmit && selectedClass === 'all' && (
                                    <div className="pt-2" title={submitButtonTooltip}>
                                        <Button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitDisabled || isSubmitting}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold tracking-wide shadow-md shadow-indigo-500/30"
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
                                                className="pl-10 h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500"
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
                                                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-500 shadow-md transform scale-[1.01]'
                                                                                : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                                                                            }
                                                                        `}
                                                                    >
                                                                        <div className="flex items-start gap-4">
                                                                            <div className={`
                                                                                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-colors
                                                                                ${selectedViolationCode === violation.code
                                                                                    ? 'bg-indigo-500 text-white'
                                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                                                                }
                                                                            `}>
                                                                                {violation.points}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className={`
                                                                                    font-medium text-sm mb-1.5 leading-relaxed
                                                                                    ${selectedViolationCode === violation.code
                                                                                        ? 'text-indigo-900 dark:text-indigo-100'
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
                                                                                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 animate-fade-in">
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

                        {mode === 'bulk_report' && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="note-method" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Metode Catatan Guru</label>
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
                                        <label htmlFor="template-note" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Template Catatan</label>
                                        <textarea id="template-note" value={templateNote} onChange={e => setTemplateNote(e.target.value)} rows={4} className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"></textarea>
                                        <p className="text-xs text-indigo-600 dark:text-indigo-300">Gunakan [Nama Siswa] untuk personalisasi.</p>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'academic_print' && (
                            <div className="space-y-2">
                                <label htmlFor="print-subject" className="text-sm font-bold text-indigo-600 dark:text-indigo-200 tracking-wide uppercase">Mata Pelajaran</label>
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
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl shadow-indigo-500/10">
                    <h3 className="font-bold text-lg mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                        <ClipboardPasteIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                        Tempel Data Nilai
                    </h3>

                    {/* Format Guide */}
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-200 mb-2 uppercase tracking-wide">Format yang Didukung:</p>
                        <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-white/70">
                            <p>Ahmad Fauzi - 85</p>
                            <p>Budi Santoso: 90</p>
                            <p>Citra Dewi 78</p>
                            <p>1. Diana Putri 92</p>
                        </div>
                        <p className="mt-2 text-xxs text-indigo-500 dark:text-indigo-300/70">
                            AI akan mencocokkan nama dengan daftar siswa secara otomatis.
                        </p>
                    </div>

                    <textarea
                        value={pasteData}
                        onChange={e => setPasteData(e.target.value)}
                        placeholder="Paste data nilai di sini...&#10;Contoh: Budi Santoso 95"
                        rows={5}
                        className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all mb-3"
                    ></textarea>
                    <Button onClick={handleAiParse} disabled={isParsing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none h-12 rounded-xl font-bold tracking-wide">
                        {isParsing ? 'Memproses...' : 'Proses dengan AI'}
                    </Button>
                </div>
            )}
        </div>
    );
};
