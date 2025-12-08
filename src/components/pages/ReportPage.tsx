import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, ai, isAiEnabled } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { generateStudentReport, ReportData } from '../../services/pdfGenerator';
import { Button } from '../ui/Button';
import { PrinterIcon, ArrowLeftIcon, GraduationCapIcon, SettingsIcon, CalendarIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, Share2Icon } from '../Icons';
import { createWhatsAppLink, generateReportMessage } from '../../utils/whatsappUtils';
import jsPDF from 'jspdf';
import { useToast } from '../../hooks/useToast';
import FloatingActionButton from '../ui/FloatingActionButton';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type ReportRow = Database['public']['Tables']['reports']['Row'];
type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
type ViolationRow = Database['public']['Tables']['violations']['Row'];
type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];
type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'id' | 'name'> | null };

const fetchReportData = async (studentId: string, userId: string): Promise<ReportData> => {
    const studentRes = await supabase.from('students').select('*, classes(id, name)').eq('id', studentId).eq('user_id', userId).single();
    if (studentRes.error) throw new Error(studentRes.error.message);
    const [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes] = await Promise.all([
        supabase.from('reports').select('*').eq('student_id', studentId),
        supabase.from('attendance').select('*').eq('student_id', studentId),
        supabase.from('academic_records').select('*').eq('student_id', studentId),
        supabase.from('violations').select('*').eq('student_id', studentId),
        supabase.from('quiz_points').select('*').eq('student_id', studentId)
    ]);
    const errors = [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes].map(r => r.error).filter(Boolean);
    if (errors.length > 0) throw new Error(errors.map(e => e!.message).join(', '));
    return {
        student: studentRes.data as any, reports: reportsRes.data || [], attendanceRecords: attendanceRes.data || [],
        academicRecords: academicRes.data || [], violations: violationsRes.data || [], quizPoints: quizPointsRes.data || []
    };
};

const ReportPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { user } = useAuth();
    const toast = useToast();
    const [showAllSubjects, setShowAllSubjects] = useState(true);
    const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

    // New State for Customization
    const [customNote, setCustomNote] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [semester, setSemester] = useState('Ganjil');
    const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const { data, isLoading, isError, error } = useQuery<ReportData>({
        queryKey: ['reportData', studentId, user?.id],
        queryFn: () => fetchReportData(studentId!, user!.id),
        enabled: !!studentId && !!user,
    });

    const generateAiNote = async () => {
        if (!data || !ai) return;

        if (!isAiEnabled) {
            toast.error("API Key Gemini belum diset. Harap cek file .env dan restart server.");
            return;
        }

        setIsGeneratingAi(true);
        try {
            const prompt = `
                Buatkan catatan wali kelas untuk rapor siswa berikut:
                Nama: ${data.student.name}
                Rata-rata Nilai: ${Math.round(data.academicRecords.reduce((a, b) => a + b.score, 0) / (data.academicRecords.length || 1))}
                Total Pelanggaran: ${data.violations.length}
                Total Kehadiran: ${data.attendanceRecords.filter(r => r.status === 'Hadir').length} dari ${data.attendanceRecords.length} hari.
                
                Berikan catatan yang motivatif, personal, dan profesional dalam 2-3 kalimat. Bahasa Indonesia.
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = result.text || '';
            setCustomNote(text.trim());
            toast.success("Catatan berhasil dibuat oleh AI!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat catatan AI.");
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const allSubjects = useMemo(() => {
        if (!data) return [];
        return [...new Set(data.academicRecords.map(r => r.subject || 'Lainnya'))];
    }, [data]);

    useEffect(() => {
        if (allSubjects.length > 0 && selectedSubjects.size === 0) {
            setSelectedSubjects(new Set(allSubjects));
        }
    }, [allSubjects]);

    const toggleSubject = (subject: string) => {
        setSelectedSubjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subject)) {
                newSet.delete(subject);
            } else {
                newSet.add(subject);
            }
            return newSet;
        });
    };

    const handlePrint = () => {
        if (!data) {
            toast.error("Data laporan tidak tersedia untuk dicetak.");
            return;
        }
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            generateStudentReport(doc, data, customNote, reportDate, semester, academicYear, user);
            doc.save(`Rapor_${data.student.name}.pdf`);
            toast.success("Rapor berhasil diunduh sebagai PDF!");
        } catch (e: any) {
            toast.error(`Gagal membuat PDF: ${e.message}`);
        }
    };

    const academicRecordsBySubject = useMemo((): Record<string, AcademicRecordRow[]> => {
        if (!data) return {};
        const filtered = showAllSubjects
            ? data.academicRecords
            : data.academicRecords.filter(r => selectedSubjects.has(r.subject || 'Lainnya'));

        return filtered.reduce((acc: Record<string, AcademicRecordRow[]>, record: AcademicRecordRow) => {
            const subject = record.subject || 'Lainnya';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(record);
            return acc;
        }, {} as Record<string, AcademicRecordRow[]>);
    }, [data, showAllSubjects, selectedSubjects]);

    const attendanceSummary = useMemo(() => {
        if (!data) return { Sakit: 0, Izin: 0, Alpha: 0 };
        return data.attendanceRecords.reduce((acc, record) => {
            if (record.status !== 'Hadir') { (acc as any)[record.status] = ((acc as any)[record.status] || 0) + 1; }
            return acc;
        }, { Sakit: 0, Izin: 0, Alpha: 0 });
    }, [data]);

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (isError) return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 text-red-500">Error: {error.message}</div>;
    if (!data) return null;

    return (
        <div className="h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
            {/* Sidebar / Settings Panel */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-full md:w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800
                ${isSettingsOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:shadow-none flex flex-col
            `}>
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Pengaturan Rapor
                    </h2>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSettingsOpen(false)}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {/* Academic Info Settings */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Tahun Ajaran
                            </label>
                            <input
                                type="text"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                                placeholder="Contoh: 2024 / 2025"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Semester
                            </label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-indigo-500" />
                            Tanggal Rapor
                        </label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    {/* Teacher Note Editor */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <PencilIcon className="w-4 h-4 text-indigo-500" />
                                Catatan Wali Kelas
                            </label>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={generateAiNote}
                                disabled={isGeneratingAi}
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 text-xs h-7 px-2 rounded-lg"
                            >
                                {isGeneratingAi ? <span className="animate-spin mr-1">⏳</span> : <SparklesIcon className="w-3 h-3 mr-1" />}
                                Buat dengan AI
                            </Button>
                        </div>
                        <textarea
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            rows={6}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-4 transition-all text-justify min-h-[150px] overflow-y-auto whitespace-pre-wrap resize-y"
                            placeholder="Tulis catatan untuk siswa..."
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Catatan ini akan muncul di bagian bawah rapor.
                        </p>
                    </div>

                    {/* Subject Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Filter Mata Pelajaran
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setShowAllSubjects(true); setSelectedSubjects(new Set(allSubjects)); }}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${showAllSubjects
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setShowAllSubjects(false)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${!showAllSubjects
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                            >
                                Pilih Manual
                            </button>
                        </div>

                        {!showAllSubjects && (
                            <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                {allSubjects.map(subject => (
                                    <button
                                        key={subject}
                                        onClick={() => toggleSubject(subject)}
                                        className={`px-2 py-1 text-xs rounded-md border transition-all ${selectedSubjects.has(subject)
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
                                            : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'}`}
                                    >
                                        {subject}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <Button onClick={handlePrint} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 h-12 rounded-xl text-base font-bold">
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Cetak PDF Sekarang
                    </Button>

                    <a
                        href={createWhatsAppLink(data.student.parent_phone || '', generateReportMessage(data.student.name, Math.round(data.academicRecords.reduce((a, b) => a + b.score, 0) / (data.academicRecords.length || 1)), semester))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 h-12 rounded-xl text-base font-bold transition-all"
                    >
                        <Share2Icon className="w-5 h-5 mr-2" />
                        Kirim ke WhatsApp
                    </a>
                </div>
            </aside>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100 dark:bg-black/20">
                {/* Mobile Header */}
                <header className="flex-shrink-0 h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden z-20">
                    <div className="flex items-center gap-3">
                        <Link to={`/siswa/${studentId}`} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <ArrowLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </Link>
                        <h1 className="font-bold text-slate-900 dark:text-white">Pratinjau Rapor</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                        <SettingsIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                </header>

                {/* Desktop Header */}
                <header className="hidden md:flex flex-shrink-0 h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 items-center justify-between px-6 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <Link to={`/siswa/${studentId}`}>
                            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Kembali
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <h1 className="font-bold text-lg text-slate-900 dark:text-white">Pratinjau Rapor Siswa</h1>
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                        {data.student.name} - Kelas {data.student.classes?.name}
                    </div>
                </header>

                {/* Preview Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-indigo-950">
                    <div id="printable-area" className="w-full md:w-[210mm] md:min-h-[297mm] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl md:shadow-2xl rounded-2xl p-6 md:p-[20mm] origin-top transform transition-transform animate-fade-in border border-slate-200 dark:border-slate-700">
                        {/* --- HEADER --- */}
                        <header className="text-center border-b-2 border-indigo-500 dark:border-indigo-400 pb-4 mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 -mx-6 md:-mx-[20mm] -mt-6 md:-mt-[20mm] px-6 md:px-[20mm] pt-6 md:pt-[20mm] rounded-t-2xl">
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <GraduationCapIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider font-serif bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Laporan Hasil Belajar</h1>
                                    <h2 className="text-sm md:text-base font-medium mt-1 tracking-wide text-slate-600 dark:text-slate-400">MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN</h2>
                                </div>
                            </div>
                        </header>

                        {/* --- STUDENT INFO --- */}
                        <div className="mb-8 p-4 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400">Nama Siswa</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">: {data.student.name}</span>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400">Kelas</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">: {data.student.classes?.name || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400">Tahun Ajaran</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">: {academicYear}</span>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400">Semester</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">: {semester}</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ACADEMICS --- */}
                        <section className="mb-8">
                            <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">A. Capaian Akademik</h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm border-collapse min-w-[600px] md:min-w-0">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                            <th className="p-3 text-center w-10 font-bold">No</th>
                                            <th className="p-3 text-left font-bold">Mata Pelajaran</th>
                                            <th className="p-3 text-left font-bold">Penilaian</th>
                                            <th className="p-3 text-center w-16 font-bold">Nilai</th>
                                            <th className="p-3 text-left font-bold">Deskripsi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(academicRecordsBySubject).map(([subject, records], subjIndex) => (
                                            <React.Fragment key={subject}>
                                                {(records as AcademicRecordRow[]).map((record, index) => (
                                                    <tr key={record.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-slate-800">
                                                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">{index === 0 ? subjIndex + 1 : ''}</td>
                                                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{index === 0 ? subject : ''}</td>
                                                        <td className="p-3 text-slate-700 dark:text-slate-300">{record.assessment_name || '-'}</td>
                                                        <td className={`p-3 text-center font-bold ${record.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : record.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{record.score}</td>
                                                        <td className="p-3 text-xs italic text-slate-500 dark:text-slate-400">{record.notes || 'Capaian sesuai dengan nilai yang diperoleh.'}</td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* --- BEHAVIOR & ATTENDANCE --- */}
                        <section className="mb-8 flex flex-col md:flex-row gap-8">
                            <div className="flex-1">
                                <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">B. Ketidakhadiran</h3>
                                <table className="w-full text-sm border-collapse rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <tbody>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10">
                                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">Sakit</td>
                                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{attendanceSummary.Sakit} hari</td>
                                        </tr>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10">
                                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">Izin</td>
                                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{attendanceSummary.Izin} hari</td>
                                        </tr>
                                        <tr className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10">
                                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">Tanpa Keterangan</td>
                                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{attendanceSummary.Alpha} hari</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-[1.5]">
                                <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">C. Catatan Perilaku</h3>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[120px] text-sm bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <ul className="list-disc list-inside space-y-2">
                                        {(data.violations || []).length > 0
                                            ? (data.violations || []).map(v => <li key={v.id} className="text-slate-700 dark:text-slate-300">{v.description}</li>)
                                            : <li className="italic text-slate-600 dark:text-slate-400">Siswa menunjukkan sikap yang baik dan terpuji selama pembelajaran.</li>
                                        }
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* --- QUIZ POINTS (NEW) --- */}
                        {(data.quizPoints || []).length > 0 && (
                            <section className="mb-8">
                                <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">D. Keaktifan & Prestasi</h3>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm border-collapse min-w-[600px] md:min-w-0">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                <th className="p-3 text-center w-10 font-bold">No</th>
                                                <th className="p-3 text-left font-bold">Kegiatan</th>
                                                <th className="p-3 text-center w-20 font-bold">Poin</th>
                                                <th className="p-3 text-center w-32 font-bold">Tanggal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.quizPoints.map((q, index) => (
                                                <tr key={q.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-slate-800">
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{index + 1}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200">{q.quiz_name}</td>
                                                    <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">+{q.points}</td>
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{new Date(q.created_at).toLocaleDateString('id-ID')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* --- TEACHER NOTE --- */}
                        <section className="mb-12">
                            <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                                {(data.quizPoints || []).length > 0 ? 'E. Catatan Wali Kelas' : 'D. Catatan Wali Kelas'}
                            </h3>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[100px] text-sm italic bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 font-serif leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm text-justify">
                                {customNote || "Tidak ada catatan khusus."}
                            </div>
                        </section>

                        {/* --- SIGNATURES --- */}
                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start text-sm mt-12 gap-12 md:gap-0">
                            <div className="text-center w-full md:w-64">
                                <p className="mb-24 font-medium text-slate-600 dark:text-slate-400">Orang Tua/Wali</p>
                                <p className="border-t border-slate-400 dark:border-slate-600 pt-2 mx-8 text-slate-800 dark:text-slate-300 font-medium">( ....................................... )</p>
                            </div>
                            <div className="text-center w-full md:w-64">
                                <p className="mb-1 text-slate-600 dark:text-slate-400">Madiun, {new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p className="mb-24 font-medium text-slate-600 dark:text-slate-400">Wali Kelas</p>
                                <p className="font-bold border-b border-slate-400 dark:border-slate-600 pb-1 mx-8 text-slate-800 dark:text-slate-200">{user?.name}</p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Mobile FAB */}
                <FloatingActionButton
                    icon={<PrinterIcon className="w-6 h-6" />}
                    onClick={handlePrint}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30"
                />
            </div>
        </div>
    );
};

export default ReportPage;