import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isAiEnabled } from '../../services/supabase';
import { generateOpenRouterContent, getAssistantContent } from '../../services/openRouterService';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { generateStudentReport, ReportData, ensureLogoLoaded } from '../../services/pdfGenerator';
import { Button } from '../ui/Button';
import { PrinterIcon, ArrowLeftIcon, SettingsIcon, CalendarIcon, PencilIcon, SparklesIcon, Share2Icon } from '../Icons';
import { createWhatsAppLink, generateReportMessage } from '../../utils/whatsappUtils';
import { getJsPDF } from '../../utils/dynamicImports';
import { useToast } from '../../hooks/useToast';
import FloatingActionButton from '../ui/FloatingActionButton';
import { useSemester } from '../../contexts/SemesterContext';

type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];

const DEFAULT_ACADEMIC_DESCRIPTION = 'Capaian sesuai dengan nilai yang diperoleh.';

const fetchReportData = async (studentId: string, userId: string): Promise<ReportData> => {
    const studentRes = await supabase.from('students').select('id, name, user_id, class_id, gender, avatar_url, access_code, parent_name, parent_phone, classes(id, name)').eq('id', studentId).eq('user_id', userId).is('deleted_at', null).single();
    if (studentRes.error) throw new Error(studentRes.error.message);
    const [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes] = await Promise.all([
        supabase.from('reports').select('id, user_id, student_id, title, notes, date, category, attachment_url, tags, created_at').eq('student_id', studentId).eq('user_id', userId),
        supabase.from('attendance').select('id, student_id, user_id, date, status, notes, semester_id, created_at').eq('student_id', studentId).eq('user_id', userId).is('deleted_at', null),
        supabase.from('academic_records').select('id, student_id, user_id, subject, score, assessment_name, notes, semester_id, created_at, version').eq('student_id', studentId).eq('user_id', userId).is('deleted_at', null),
        supabase.from('violations').select('id, student_id, user_id, date, description, points, type, severity, semester_id, follow_up_status, follow_up_notes, evidence_url, parent_notified, parent_notified_at, created_at, deleted_at').eq('student_id', studentId).eq('user_id', userId).is('deleted_at', null),
        supabase.from('quiz_points').select('id, student_id, user_id, quiz_date, quiz_name, subject, points, max_points, category, is_used, used_at, used_for_subject, semester_id, created_at').eq('student_id', studentId).eq('user_id', userId).is('deleted_at', null)
    ]);
    const errors = [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes].map(r => r.error).filter(Boolean);
    if (errors.length > 0) throw new Error(errors.map(e => e!.message).join(', '));
    return {
        student: studentRes.data as any, reports: reportsRes.data || [], attendanceRecords: attendanceRes.data || [],
        academicRecords: academicRes.data || [], violations: violationsRes.data || [], quizPoints: quizPointsRes.data || []
    };
};

const getAcademicPredicate = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
};

const sanitizeAcademicDescription = (note?: string | null) => (
    (note || '')
        .replace(/\[\s*semester[^\]]*\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
);

const formatAcademicDescription = (note?: string | null) => {
    const cleanedNote = sanitizeAcademicDescription(note);
    return cleanedNote || DEFAULT_ACADEMIC_DESCRIPTION;
};

const summarizeQuizPoints = (items: Database['public']['Tables']['quiz_points']['Row'][]) => {
    const grouped = new Map<string, { activity: string; count: number; totalPoints: number }>();

    items.forEach((item) => {
        const activity = item.quiz_name || item.category || 'Aktivitas';
        const current = grouped.get(activity);

        if (current) {
            current.count += 1;
            current.totalPoints += item.points;
            return;
        }

        grouped.set(activity, {
            activity,
            count: 1,
            totalPoints: item.points
        });
    });

    return Array.from(grouped.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.activity.localeCompare(b.activity, 'id');
    });
};

const summarizeViolations = (items: Database['public']['Tables']['violations']['Row'][]) => {
    const grouped = new Map<string, { note: string; count: number; totalPoints: number }>();

    items.forEach((item) => {
        const note = item.description?.trim() || 'Catatan perilaku';
        const current = grouped.get(note);

        if (current) {
            current.count += 1;
            current.totalPoints += item.points;
            return;
        }

        grouped.set(note, {
            note,
            count: 1,
            totalPoints: item.points
        });
    });

    return Array.from(grouped.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.note.localeCompare(b.note, 'id');
    });
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
    const { semesters, activeSemester, activeAcademicYear } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [academicYear, setAcademicYear] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Initialize with active semester
    useEffect(() => {
        if (activeSemester && !selectedSemesterId) {
            setSelectedSemesterId(activeSemester.id);
            setAcademicYear(activeAcademicYear?.name || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`);
        }
    }, [activeSemester, activeAcademicYear?.name, selectedSemesterId]);

    // Derived semester name for display
    const semesterName = useMemo(() => {
        const sem = semesters.find(s => s.id === selectedSemesterId);
        return sem ? (sem.semester_number % 2 !== 0 ? 'Ganjil' : 'Genap') : 'Ganjil';
    }, [semesters, selectedSemesterId]);

    const { data, isLoading, isError, error } = useQuery<ReportData>({
        queryKey: ['reportData', studentId, user?.id],
        queryFn: () => fetchReportData(studentId!, user!.id),
        enabled: !!studentId && !!user,
    });

    const generateAiNote = async () => {
        if (!data) return;

        if (!isAiEnabled) {
            toast.error("API Key Gemini belum diset. Harap cek file .env dan restart server.");
            return;
        }

        setIsGeneratingAi(true);
        try {
            const avgScore = Math.round(data.academicRecords.reduce((a, b) => a + b.score, 0) / (data.academicRecords.length || 1));
            const attendanceRate = data.attendanceRecords.length > 0
                ? Math.round((data.attendanceRecords.filter(r => r.status === 'Hadir').length / data.attendanceRecords.length) * 100)
                : 100;
            const violationCount = data.violations.length;

            const systemPrompt = `Anda adalah wali kelas yang menulis catatan rapor. ATURAN KETAT:
1. Tulis HANYA 2-3 kalimat singkat (maksimal 50 kata)
2. Gunakan format: [Penilaian Singkat]. [Saran/Motivasi].
3. Hindari pengulangan data angka
4. Langsung to the point, tidak bertele-tele
5. Bahasa Indonesia formal tapi hangat`;

            const prompt = `Buat catatan wali kelas SINGKAT untuk:
- Nama: ${data.student.name}
- Nilai rata-rata: ${avgScore}  
- Kehadiran: ${attendanceRate}%
- Pelanggaran: ${violationCount}

Contoh format yang diharapkan:
"${data.student.name} menunjukkan prestasi akademik yang baik dengan sikap disiplin. Terus pertahankan semangat belajar dan keaktifan di kelas."

Tulis catatan sesuai format di atas (2-3 kalimat saja):`;

            const response = await generateOpenRouterContent([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]);

            let text = getAssistantContent(response) || '';

            // Clean up: remove quotes and excessive whitespace
            text = text.replace(/^["']|["']$/g, '').trim();

            // Limit to ~3 sentences if AI still generates too much
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            if (sentences.length > 3) {
                text = sentences.slice(0, 3).join('. ').trim() + '.';
            }

            setCustomNote(text);
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
        if (allSubjects.length > 0) {
            setSelectedSubjects(prev => prev.size === 0 ? new Set(allSubjects) : prev);
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

    const handlePrint = async () => {
        if (!data) {
            toast.error("Data laporan tidak tersedia untuk dicetak.");
            return;
        }
        try {
            // Ensure logo is loaded before generating PDF
            await ensureLogoLoaded();

            const { default: jsPDF } = await getJsPDF();
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            await generateStudentReport(doc, {
                ...data,
                academicRecords: filteredAcademicRecords,
                attendanceRecords: filteredAttendance,
                quizPoints: filteredQuizPoints,
                violations: filteredViolations
            }, customNote, reportDate, semesterName, academicYear, user);
            doc.save(`Rapor_${data.student.name}.pdf`);
            toast.success("Rapor berhasil diunduh sebagai PDF!");
        } catch (e: unknown) {
            toast.error(`Gagal membuat PDF: ${(e as Error).message}`);
        }
    };

    const filteredAcademicRecords = useMemo(() => {
        if (!data) return [];
        if (!selectedSemesterId) return data.academicRecords;
        return data.academicRecords.filter(r => r.semester_id === selectedSemesterId);
    }, [data, selectedSemesterId]);

    const academicRecordsBySubject = useMemo((): Record<string, AcademicRecordRow[]> => {
        if (!data) return {};
        const filtered = showAllSubjects
            ? filteredAcademicRecords
            : filteredAcademicRecords.filter(r => selectedSubjects.has(r.subject || 'Lainnya'));

        return filtered.reduce((acc: Record<string, AcademicRecordRow[]>, record: AcademicRecordRow) => {
            const subject = record.subject || 'Lainnya';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(record);
            return acc;
        }, {} as Record<string, AcademicRecordRow[]>);
    }, [data, filteredAcademicRecords, showAllSubjects, selectedSubjects]);

    const filteredAttendance = useMemo(() => {
        if (!data) return [];
        if (!selectedSemesterId) return data.attendanceRecords;
        return data.attendanceRecords.filter(r => r.semester_id === selectedSemesterId);
    }, [data, selectedSemesterId]);

    const filteredQuizPoints = useMemo(() => {
        if (!data) return [];
        if (!selectedSemesterId) return data.quizPoints;
        return data.quizPoints.filter(r => r.semester_id === selectedSemesterId);
    }, [data, selectedSemesterId]);

    const summarizedQuizPoints = useMemo(() => summarizeQuizPoints(filteredQuizPoints), [filteredQuizPoints]);

    const filteredViolations = useMemo(() => {
        if (!data) return [];
        if (!selectedSemesterId) return data.violations;
        return data.violations.filter(r => r.semester_id === selectedSemesterId);
    }, [data, selectedSemesterId]);
    const summarizedViolations = useMemo(() => summarizeViolations(filteredViolations), [filteredViolations]);

    const attendanceSummary = useMemo(() => {
        return filteredAttendance.reduce((acc, record) => {
            if (record.status !== 'Hadir') { (acc as any)[record.status] = ((acc as any)[record.status] || 0) + 1; }
            return acc;
        }, { Sakit: 0, Izin: 0, Alpha: 0 });
    }, [filteredAttendance]);

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
                                value={selectedSemesterId}
                                onChange={(e) => setSelectedSemesterId(e.target.value)}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all font-medium text-sm"
                            >
                                {semesters.map(sem => (
                                    <option key={sem.id} value={sem.id}>
                                        {sem.academic_years?.name} - {sem.semester_number % 2 !== 0 ? 'Ganjil' : 'Genap'}
                                    </option>
                                ))}
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
                        href={createWhatsAppLink(data.student.parent_phone || '', generateReportMessage(data.student.name, Math.round(data.academicRecords.reduce((a, b) => a + b.score, 0) / (data.academicRecords.length || 1)), semesterName))}
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
                        <header className="-mx-6 md:-mx-[20mm] -mt-6 md:-mt-[20mm] px-6 md:px-[20mm] pt-6 md:pt-[18mm] pb-5 mb-6 rounded-t-2xl bg-white dark:bg-slate-900 border-b-4 border-slate-800 dark:border-slate-100">
                            <div className="rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-4 md:px-6 md:py-5">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="w-20 md:w-24 flex justify-center">
                                        <img
                                            src="/logo_sekolah.png"
                                            alt="Logo Sekolah"
                                            className="w-16 h-16 md:w-20 md:h-20 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] md:text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Kementerian Agama Republik Indonesia</p>
                                        <p className="text-[10px] md:text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mt-1">Madrasah Ibtidaiyah</p>
                                        <h1 className="text-lg md:text-[28px] font-bold uppercase tracking-[0.08em] font-serif text-slate-900 dark:text-white mt-2">Laporan Hasil Belajar Siswa</h1>
                                        <h2 className="text-sm md:text-lg font-bold mt-2 text-emerald-800 dark:text-emerald-300">MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN</h2>
                                        <p className="text-[11px] md:text-sm mt-2 text-slate-600 dark:text-slate-400">Jl. Diponegoro No. 123, Madiun, Jawa Timur | Telp. (0351) 123456</p>
                                    </div>
                                    <div className="w-16 md:w-20 flex justify-center">
                                        <img
                                            src="/logo_kemenag.png"
                                            alt="Logo Kemenag"
                                            className="w-14 md:w-16 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* --- STUDENT INFO --- */}
                        <div className="mb-8 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="grid grid-cols-[108px_10px_1fr] gap-y-2">
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Nama Siswa</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{data.student.name}</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Kelas</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{data.student.classes?.name || 'N/A'}</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">NIS/NISN</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">- / -</span>
                                </div>
                                <div className="grid grid-cols-[108px_10px_1fr] gap-y-2">
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Tahun Ajaran</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{academicYear}</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Semester</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{semesterName}</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Fase</span>
                                    <span className="text-slate-500">:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">-</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ACADEMICS --- */}
                        <section className="mb-8">
                            <div className="rounded-t-xl bg-emerald-800 dark:bg-emerald-700 px-4 py-2.5">
                                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-white">A. Capaian Akademik</h3>
                            </div>
                            <div className="overflow-x-auto rounded-b-xl border border-t-0 border-slate-300 dark:border-slate-700">
                                <table className="w-full text-sm border-collapse min-w-[680px] md:min-w-0">
                                    <thead>
                                        <tr className="bg-slate-800 dark:bg-slate-700 text-white">
                                            <th className="p-3 text-center w-10 font-bold">No</th>
                                            <th className="p-3 text-left font-bold">Mata Pelajaran</th>
                                            <th className="p-3 text-left font-bold">Penilaian</th>
                                            <th className="p-3 text-center w-16 font-bold">Nilai</th>
                                            <th className="p-3 text-center w-16 font-bold">Pred</th>
                                            <th className="p-3 text-left font-bold">Deskripsi Capaian</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(academicRecordsBySubject).map(([subject, records], subjIndex) => (
                                            <React.Fragment key={subject}>
                                                <tr className="border-t-2 border-slate-300 bg-slate-100/90 dark:border-slate-600 dark:bg-slate-800/90">
                                                    <td colSpan={6} className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">
                                                        Mata Pelajaran: {subject}
                                                    </td>
                                                </tr>
                                                {(records as AcademicRecordRow[]).map((record, index) => {
                                                    const predicate = getAcademicPredicate(record.score);
                                                    return (
                                                        <tr key={record.id} className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                                            <td className="p-3 text-center text-slate-600 dark:text-slate-400">{subjIndex + 1}.{index + 1}</td>
                                                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{index === 0 ? subject : ''}</td>
                                                            <td className="p-3 text-slate-700 dark:text-slate-300">{record.assessment_name || '-'}</td>
                                                            <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100">{record.score}</td>
                                                            <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100">{predicate}</td>
                                                            <td className="p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{index === 0 ? formatAcademicDescription(record.notes) : ''}</td>
                                                        </tr>
                                                    );
                                                })}
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
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm border-collapse min-w-[520px] md:min-w-0">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                <th className="p-3 text-center w-10 font-bold">No</th>
                                                <th className="p-3 text-left font-bold">Catatan</th>
                                                <th className="p-3 text-center w-24 font-bold">Frekuensi</th>
                                                <th className="p-3 text-center w-24 font-bold">Total Poin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summarizedViolations.length > 0 ? summarizedViolations.map((v, index) => (
                                                <tr key={`${v.note}-${index}`} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-slate-800">
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{index + 1}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200">{v.note}</td>
                                                    <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{v.count}x</td>
                                                    <td className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">{v.totalPoints}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="p-4 text-center italic text-slate-600 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-900/10">
                                                        Siswa menunjukkan sikap yang baik dan terpuji selama pembelajaran.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        {/* --- QUIZ POINTS (NEW) --- */}
                        {filteredQuizPoints.length > 0 && (
                            <section className="mb-8">
                                <h3 className="text-base font-bold mb-3 border-b-2 border-indigo-500 dark:border-indigo-400 pb-1 uppercase tracking-wide text-indigo-700 dark:text-indigo-400">D. Keaktifan & Prestasi</h3>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm border-collapse min-w-[520px] md:min-w-0">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                <th className="p-3 text-center w-10 font-bold">No</th>
                                                <th className="p-3 text-left font-bold">Kegiatan</th>
                                                <th className="p-3 text-center w-24 font-bold">Frekuensi</th>
                                                <th className="p-3 text-center w-24 font-bold">Total Poin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summarizedQuizPoints.map((q, index) => (
                                                <tr key={`${q.activity}-${index}`} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-slate-800">
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{index + 1}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200">{q.activity}</td>
                                                    <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{q.count}x</td>
                                                    <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{q.totalPoints}</td>
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
                                {filteredQuizPoints.length > 0 ? 'E. Catatan Wali Kelas' : 'D. Catatan Wali Kelas'}
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
