import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, ai } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { generateStudentReport, ReportData } from '../../services/pdfGenerator';
import { Button } from '../ui/Button';
import { PrinterIcon, ArrowLeftIcon, GraduationCapIcon, SettingsIcon, CalendarIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '../Icons';
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

    // ... (existing code)

    const generateAiNote = async () => {
        if (!data || !ai) return;
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
                model: 'gemini-1.5-flash',
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

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (isError) return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-red-500">Error: {error.message}</div>;
    if (!data) return null;

    return (
        <div className="h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 font-sans overflow-hidden">
            {/* Sidebar / Settings Panel */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-full md:w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out
                ${isSettingsOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:shadow-none border-r border-gray-200 dark:border-gray-700 flex flex-col
            `}>
                {/* ... (existing header) */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        Pengaturan Rapor
                    </h2>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSettingsOpen(false)}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Academic Info Settings */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tahun Ajaran
                            </label>
                            <input
                                type="text"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Contoh: 2024 / 2025"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Semester
                            </label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Tanggal Rapor
                        </label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>

                    {/* Teacher Note Editor */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <PencilIcon className="w-4 h-4" />
                                Catatan Wali Kelas
                            </label>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={generateAiNote}
                                disabled={isGeneratingAi}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30 text-xs h-7 px-2"
                            >
                                {isGeneratingAi ? <span className="animate-spin mr-1">⏳</span> : <SparklesIcon className="w-3 h-3 mr-1" />}
                                Buat dengan AI
                            </Button>
                        </div>
                        <textarea
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3"
                            placeholder="Tulis catatan untuk siswa..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Catatan ini akan muncul di bagian bawah rapor.
                        </p>
                    </div>

                    {/* Subject Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filter Mata Pelajaran
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setShowAllSubjects(true); setSelectedSubjects(new Set(allSubjects)); }}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${showAllSubjects
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 font-medium'
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setShowAllSubjects(false)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${!showAllSubjects
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 font-medium'
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
                            >
                                Pilih Manual
                            </button>
                        </div>

                        {!showAllSubjects && (
                            <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                {allSubjects.map(subject => (
                                    <button
                                        key={subject}
                                        onClick={() => toggleSubject(subject)}
                                        className={`px-2 py-1 text-xs rounded-md border transition-all ${selectedSubjects.has(subject)
                                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                                            : 'bg-white border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'}`}
                                    >
                                        {subject}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <Button onClick={handlePrint} className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
                        <PrinterIcon className="w-4 h-4 mr-2" />
                        Cetak PDF Sekarang
                    </Button>
                </div>
            </aside>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                <header className="flex-shrink-0 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:hidden z-20">
                    <div className="flex items-center gap-3">
                        <Link to={`/siswa/${studentId}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <h1 className="font-bold text-gray-900 dark:text-white">Pratinjau Rapor</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                        <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                </header>

                {/* Desktop Header */}
                <header className="hidden md:flex flex-shrink-0 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <Link to={`/siswa/${studentId}`}>
                            <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Kembali
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
                        <h1 className="font-bold text-lg text-gray-900 dark:text-white">Pratinjau Rapor Siswa</h1>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {data.student.name} - Kelas {data.student.classes?.name}
                    </div>
                </header>

                {/* Preview Content */}
                <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-2 md:p-8 flex justify-center">
                    <div id="printable-area" className="w-full md:w-[210mm] md:min-h-[297mm] bg-white text-black shadow-sm md:shadow-2xl rounded-sm p-4 md:p-[20mm] origin-top transform transition-transform">
                        {/* --- HEADER --- */}
                        <header className="text-center border-b-2 border-black pb-4 mb-6">
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 rounded-full flex items-center justify-center">
                                    <GraduationCapIcon className="w-6 h-6 md:w-8 md:h-8 text-black" />
                                </div>
                                <div>
                                    <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider">Laporan Hasil Belajar</h1>
                                    <h2 className="text-xs md:text-sm font-medium mt-1">MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN</h2>
                                </div>
                            </div>
                        </header>

                        {/* --- STUDENT INFO --- */}
                        <div className="mb-6 md:mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="font-bold">Nama Siswa</span>
                                    <span>: {data.student.name}</span>
                                    <span className="font-bold">Kelas</span>
                                    <span>: {data.student.classes?.name || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="font-bold">Tahun Ajaran</span>
                                    <span>: {academicYear}</span>
                                    <span className="font-bold">Semester</span>
                                    <span>: {semester}</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ACADEMICS --- */}
                        <section className="mb-6 md:mb-8">
                            <h3 className="text-sm md:text-base font-bold mb-3 border-b border-black pb-1">A. Capaian Akademik</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs md:text-sm border-collapse border border-black min-w-[600px] md:min-w-0">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-2 text-center w-8 md:w-10">No</th>
                                            <th className="border border-black p-2 text-left">Mata Pelajaran</th>
                                            <th className="border border-black p-2 text-left">Penilaian</th>
                                            <th className="border border-black p-2 text-center w-12 md:w-16">Nilai</th>
                                            <th className="border border-black p-2 text-left">Deskripsi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(academicRecordsBySubject).map(([subject, records], subjIndex) => (
                                            <React.Fragment key={subject}>
                                                {(records as AcademicRecordRow[]).map((record, index) => (
                                                    <tr key={record.id}>
                                                        <td className="border border-black p-2 text-center">{index === 0 ? subjIndex + 1 : ''}</td>
                                                        <td className="border border-black p-2 font-medium">{index === 0 ? subject : ''}</td>
                                                        <td className="border border-black p-2">{record.assessment_name || '-'}</td>
                                                        <td className="border border-black p-2 text-center font-bold">{record.score}</td>
                                                        <td className="border border-black p-2 text-xs italic">{record.notes || 'Capaian sesuai dengan nilai yang diperoleh.'}</td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* --- BEHAVIOR & ATTENDANCE --- */}
                        <section className="mb-6 md:mb-8 flex flex-col md:flex-row gap-6 md:gap-8">
                            <div className="flex-1">
                                <h3 className="text-sm md:text-base font-bold mb-3 border-b border-black pb-1">B. Ketidakhadiran</h3>
                                <table className="w-full text-xs md:text-sm border-collapse border border-black">
                                    <tbody>
                                        <tr><td className="border border-black p-2">Sakit</td><td className="border border-black p-2 text-center font-bold">{attendanceSummary.Sakit} hari</td></tr>
                                        <tr><td className="border border-black p-2">Izin</td><td className="border border-black p-2 text-center font-bold">{attendanceSummary.Izin} hari</td></tr>
                                        <tr><td className="border border-black p-2">Tanpa Keterangan</td><td className="border border-black p-2 text-center font-bold">{attendanceSummary.Alpha} hari</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-[1.5]">
                                <h3 className="text-sm md:text-base font-bold mb-3 border-b border-black pb-1">C. Catatan Perilaku</h3>
                                <div className="border border-black p-3 min-h-[80px] md:min-h-[100px] text-xs md:text-sm">
                                    <ul className="list-disc list-inside space-y-1">
                                        {(data.violations || []).length > 0
                                            ? (data.violations || []).map(v => <li key={v.id}>{v.description}</li>)
                                            : <li>Siswa menunjukkan sikap yang baik dan terpuji selama pembelajaran.</li>
                                        }
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* --- QUIZ POINTS (NEW) --- */}
                        {(data.quizPoints || []).length > 0 && (
                            <section className="mb-6 md:mb-8">
                                <h3 className="text-sm md:text-base font-bold mb-3 border-b border-black pb-1">D. Keaktifan & Prestasi</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs md:text-sm border-collapse border border-black min-w-[600px] md:min-w-0">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-black p-2 text-center w-10">No</th>
                                                <th className="border border-black p-2 text-left">Kegiatan</th>
                                                <th className="border border-black p-2 text-center w-20">Poin</th>
                                                <th className="border border-black p-2 text-center w-32">Tanggal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.quizPoints.map((q, index) => (
                                                <tr key={q.id}>
                                                    <td className="border border-black p-2 text-center">{index + 1}</td>
                                                    <td className="border border-black p-2">{q.quiz_name}</td>
                                                    <td className="border border-black p-2 text-center font-bold">{q.points}</td>
                                                    <td className="border border-black p-2 text-center">{new Date(q.created_at).toLocaleDateString('id-ID')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* --- TEACHER NOTE --- */}
                        <section className="mb-8 md:mb-12">
                            <h3 className="text-sm md:text-base font-bold mb-3 border-b border-black pb-1">
                                {(data.quizPoints || []).length > 0 ? 'E. Catatan Wali Kelas' : 'D. Catatan Wali Kelas'}
                            </h3>
                            <div className="border border-black p-3 md:p-4 min-h-[60px] md:min-h-[80px] text-xs md:text-sm italic bg-gray-50">
                                {customNote || "Tidak ada catatan."}
                            </div>
                        </section>

                        {/* --- SIGNATURES --- */}
                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start text-sm mt-8 gap-8 md:gap-0">
                            <div className="text-center w-full md:w-64">
                                <p className="mb-16 md:mb-20">Orang Tua/Wali</p>
                                <p>(___________________)</p>
                            </div>
                            <div className="text-center w-full md:w-64">
                                <p className="mb-2">Madiun, {new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p className="mb-16 md:mb-20">Wali Kelas</p>
                                <p className="font-bold underline">{user?.name}</p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Mobile FAB */}
                <FloatingActionButton
                    icon={<PrinterIcon className="w-6 h-6" />}
                    onClick={handlePrint}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-purple-600 hover:bg-purple-700"
                />
            </div>
        </div>
    );
};

export default ReportPage;