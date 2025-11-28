import React from 'react';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Button } from '../../../ui/Button';
import { XCircleIcon, ChevronDownIcon, SparklesIcon, ClipboardPasteIcon } from '../../../Icons';
import { violationList } from '../../../../services/violations.data';
import { InputMode, ClassRow } from '../types';

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
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string };
    setSubjectGradeInfo: React.Dispatch<React.SetStateAction<{ subject: string; assessment_name: string; notes: string }>>;
    isCustomSubject: boolean;
    setIsCustomSubject: (isCustom: boolean) => void;
    uniqueSubjects: string[] | undefined;
    selectedViolationCode: string;
    setSelectedViolationCode: (code: string) => void;
    violationDate: string;
    setViolationDate: (date: string) => void;
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
}

export const Step2_Configuration: React.FC<Step2_ConfigurationProps> = ({
    mode, isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
    quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo, isCustomSubject, setIsCustomSubject,
    uniqueSubjects, selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
    noteMethod, setNoteMethod, templateNote, setTemplateNote, assessmentNames,
    pasteData, setPasteData, isParsing, handleAiParse, isOnline
}) => {
    return (
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
                <div
                    className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center cursor-pointer lg:cursor-default"
                    onClick={() => window.innerWidth < 1024 && setIsConfigOpen(!isConfigOpen)}
                >
                    <h3 className="font-bold text-lg">Konfigurasi</h3>
                    <ChevronDownIcon className={`w-5 h-5 lg:hidden transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className={`p-4 sm:p-6 ${isConfigOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="class-select" className="text-sm font-medium text-gray-300">Kelas</label>
                            <Select id="class-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={isLoadingClasses}>
                                {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                        {mode === 'quiz' && (
                            <>
                                <div>
                                    <label htmlFor="quiz-name" className="text-sm font-medium text-gray-300">Nama Aktivitas</label>
                                    <Input id="quiz-name" value={quizInfo.name} onChange={e => setQuizInfo(p => ({ ...p, name: e.target.value }))} placeholder="cth. Aktif Bertanya" />
                                </div>
                                <div>
                                    <label htmlFor="quiz-subject" className="text-sm font-medium text-gray-300">Mata Pelajaran</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="quiz-subject"
                                                value={quizInfo.subject}
                                                onChange={e => setQuizInfo(p => ({ ...p, subject: e.target.value }))}
                                                placeholder="Ketik nama mapel baru..."
                                                autoFocus
                                                required
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => { setIsCustomSubject(false); setQuizInfo(p => ({ ...p, subject: '' })); }}
                                                title="Kembali ke daftar"
                                                className="px-3"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Select
                                            id="quiz-subject"
                                            value={quizInfo.subject}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsCustomSubject(true);
                                                    setQuizInfo(p => ({ ...p, subject: '' }));
                                                } else {
                                                    setQuizInfo(p => ({ ...p, subject: e.target.value }));
                                                }
                                            }}
                                            required
                                        >
                                            <option value="">-- Pilih Mapel --</option>
                                            {uniqueSubjects?.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="__NEW__" className="font-bold text-purple-400 bg-purple-900/20">+ Tambah Mapel Baru</option>
                                        </Select>
                                    )}
                                </div>
                                <div><label htmlFor="quiz-date" className="text-sm font-medium text-gray-300">Tanggal</label><Input id="quiz-date" type="date" value={quizInfo.date} onChange={e => setQuizInfo(p => ({ ...p, date: e.target.value }))} /></div>
                            </>
                        )}
                        {mode === 'subject_grade' && (
                            <>
                                <div>
                                    <label htmlFor="grade-subject" className="text-sm font-medium text-gray-300">Mata Pelajaran</label>
                                    {isCustomSubject ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="grade-subject"
                                                value={subjectGradeInfo.subject}
                                                onChange={e => setSubjectGradeInfo(p => ({ ...p, subject: e.target.value }))}
                                                placeholder="Ketik nama mapel baru..."
                                                autoFocus
                                                required
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => { setIsCustomSubject(false); setSubjectGradeInfo(p => ({ ...p, subject: '' })); }}
                                                title="Kembali ke daftar"
                                                className="px-3"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Select
                                            id="grade-subject"
                                            value={subjectGradeInfo.subject}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsCustomSubject(true);
                                                    setSubjectGradeInfo(p => ({ ...p, subject: '' }));
                                                } else {
                                                    setSubjectGradeInfo(p => ({ ...p, subject: e.target.value }));
                                                }
                                            }}
                                            required
                                        >
                                            <option value="">-- Pilih Mapel --</option>
                                            {uniqueSubjects?.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="__NEW__" className="font-bold text-purple-400 bg-purple-900/20">+ Tambah Mapel Baru</option>
                                        </Select>
                                    )}
                                </div>
                                <div><label htmlFor="assessment-name" className="text-sm font-medium text-gray-300">Nama Penilaian</label><Input id="assessment-name" value={subjectGradeInfo.assessment_name} onChange={e => setSubjectGradeInfo(p => ({ ...p, assessment_name: e.target.value }))} placeholder="cth. PH 1, UTS" required /></div>
                                <div><label htmlFor="grade-notes" className="text-sm font-medium text-gray-300">Catatan (Opsional)</label><Input id="grade-notes" value={subjectGradeInfo.notes} onChange={e => setSubjectGradeInfo(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan umum untuk semua nilai" /></div>
                            </>
                        )}
                        {mode === 'violation' && (
                            <>
                                <div>
                                    <label htmlFor="violation-type" className="text-sm font-medium text-gray-300">Jenis Pelanggaran</label>
                                    <Select id="violation-type" value={selectedViolationCode} onChange={e => setSelectedViolationCode(e.target.value)}>
                                        <option value="">-- Pilih Pelanggaran --</option>
                                        {violationList.map(v => <option key={v.code} value={v.code}>{v.description} ({v.points} poin)</option>)}
                                    </Select>
                                </div>
                                <div><label htmlFor="violation-date" className="text-sm font-medium text-gray-300">Tanggal</label><Input id="violation-date" type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} /></div>
                            </>
                        )}
                        {mode === 'bulk_report' && (
                            <>
                                <div>
                                    <label htmlFor="note-method" className="text-sm font-medium text-gray-300">Metode Catatan Guru</label>
                                    <Select id="note-method" value={noteMethod} onChange={e => setNoteMethod(e.target.value as any)}>
                                        <option value="ai">Generate dengan AI</option>
                                        <option value="template">Gunakan Template</option>
                                    </Select>
                                </div>
                                {noteMethod === 'template' && (
                                    <div>
                                        <label htmlFor="template-note" className="text-sm font-medium text-gray-300">Template Catatan</label>
                                        <textarea id="template-note" value={templateNote} onChange={e => setTemplateNote(e.target.value)} rows={4} className="w-full mt-1 p-2 border rounded-md bg-white/10 border-white/20 text-white placeholder:text-gray-400"></textarea>
                                        <p className="text-xs text-gray-400 mt-1">Gunakan [Nama Siswa] untuk personalisasi.</p>
                                    </div>
                                )}
                            </>
                        )}
                        {mode === 'academic_print' && (
                            <div>
                                <label htmlFor="print-subject" className="text-sm font-medium text-gray-300">Mata Pelajaran</label>
                                <Input id="print-subject" list="subjects-datalist" value={subjectGradeInfo.subject} onChange={e => setSubjectGradeInfo(p => ({ ...p, subject: e.target.value }))} placeholder="Pilih atau ketik mapel" />
                                <datalist id="subjects-datalist">{uniqueSubjects?.map(s => <option key={s} value={s} />)}</datalist>
                            </div>
                        )}
                        {mode === 'delete_subject_grade' && (
                            <>
                                <div>
                                    <label htmlFor="delete-subject" className="text-sm font-medium text-gray-300">Mata Pelajaran</label>
                                    <Input id="delete-subject" list="subjects-datalist" value={subjectGradeInfo.subject} onChange={e => setSubjectGradeInfo(p => ({ ...p, subject: e.target.value, assessment_name: '' }))} placeholder="Pilih atau ketik mapel" required />
                                    <datalist id="subjects-datalist">{uniqueSubjects?.map(s => <option key={s} value={s} />)}</datalist>
                                </div>
                                <div>
                                    <label htmlFor="delete-assessment" className="text-sm font-medium text-gray-300">Nama Penilaian</label>
                                    <Select id="delete-assessment" value={subjectGradeInfo.assessment_name} onChange={e => setSubjectGradeInfo(p => ({ ...p, assessment_name: e.target.value }))} disabled={!subjectGradeInfo.subject || !assessmentNames} required>
                                        <option value="">-- Pilih Penilaian --</option>
                                        {assessmentNames?.map(name => <option key={name} value={name}>{name}</option>)}
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {mode === 'subject_grade' && isOnline && (
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                    <h3 className="font-bold text-lg mb-4 border-b border-white/10 pb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-400" />Tempel Data Nilai</h3>
                    <textarea value={pasteData} onChange={e => setPasteData(e.target.value)} placeholder="Contoh:&#10;Budi Santoso   95&#10;Ani Wijaya      88" rows={4} className="w-full p-2 border rounded-md bg-white/10 border-white/20 text-white placeholder:text-gray-400"></textarea>
                    <Button onClick={handleAiParse} disabled={isParsing} className="mt-2"><ClipboardPasteIcon className="w-4 h-4 mr-2" />{isParsing ? 'Memproses...' : 'Proses dengan AI'}</Button>
                </div>
            )}
        </div>
    );
};
