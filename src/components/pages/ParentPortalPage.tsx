import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { Button } from '../ui/Button';
import { LogoutIcon, BarChartIcon, CheckCircleIcon, ShieldAlertIcon, SparklesIcon, CalendarIcon, SendIcon, UsersIcon, GraduationCapIcon, PencilIcon, TrashIcon, TrendingUpIcon } from '../Icons';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ChildDevelopmentAnalytics } from '../ui/ChildDevelopmentAnalytics';

type PortalRpcResult = Database['public']['Functions']['get_student_portal_data']['Returns'][number];
type PortalStudentInfo = PortalRpcResult['student'];
type PortalReport = PortalRpcResult['reports'][number];
type PortalAttendance = PortalRpcResult['attendanceRecords'][number];
type PortalAcademicRecord = PortalRpcResult['academicRecords'][number];
type PortalViolation = PortalRpcResult['violations'][number];
type PortalQuizPoint = PortalRpcResult['quizPoints'][number];
type PortalCommunication = PortalRpcResult['communications'][number];
type TeacherInfo = PortalRpcResult['teacher'];

type PortalData = {
    student: PortalStudentInfo & { classes: { name: string }, access_code: string | null },
    reports: PortalReport[],
    attendanceRecords: PortalAttendance[],
    academicRecords: PortalAcademicRecord[],
    violations: PortalViolation[],
    quizPoints: PortalQuizPoint[],
    communications: PortalCommunication[],
    teacher: TeacherInfo,
};


const fetchPortalData = async (studentId: string, accessCode: string): Promise<PortalData> => {
    const { data, error } = await supabase.rpc('get_student_portal_data', {
        student_id_param: studentId,
        access_code_param: accessCode,
    });

    if (error) {
        console.error("Portal access RPC failed:", error);
        throw new Error(`Gagal memuat data portal: ${error.message}.`);
    }

    if (!data || data.length === 0) {
        throw new Error("Akses ditolak. Kode akses mungkin tidak valid untuk siswa ini atau telah kedaluwarsa.");
    }

    const portalResult = data[0];

    return {
        student: { ...portalResult.student, access_code: accessCode },
        reports: portalResult.reports || [],
        attendanceRecords: portalResult.attendanceRecords || [],
        academicRecords: portalResult.academicRecords || [],
        violations: portalResult.violations || [],
        quizPoints: portalResult.quizPoints || [],
        communications: portalResult.communications || [],
        teacher: portalResult.teacher,
    };
};


const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div
        className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl ${className}`}
        {...props}
    />
);

const PortalHeader: React.FC<{ student: PortalData['student'], onLogout: () => void }> = ({ student, onLogout }) => (
    <header className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />


        <div className="relative z-10 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                            <GraduationCapIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Portal Siswa</h1>
                            <p className="text-xs sm:text-sm text-white/70">Pantau perkembangan belajar</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onLogout}
                        className="text-white hover:bg-white/20 rounded-xl px-4"
                        aria-label="Logout"
                    >
                        <LogoutIcon className="w-5 h-5 mr-2" />
                        <span className="hidden sm:inline">Keluar</span>
                    </Button>
                </div>

                {/* Student Profile Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
                    <div className="flex items-center gap-4">
                        <img
                            src={student.avatar_url}
                            alt={student.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-3 border-white/50 shadow-xl"
                        />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{student.name}</h2>
                            <p className="text-white/80 text-sm sm:text-base">Kelas {student.classes.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-xs text-white/90">
                                    <UsersIcon className="w-3 h-3" />
                                    Siswa Aktif
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

const StatCard: React.FC<{ icon: React.ElementType, label: string, value: string | number, colorClass: string }> = ({ icon: Icon, label, value, colorClass }) => (
    <div className="group relative p-4 sm:p-6 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Decorative Background */}
        <div className={`absolute -top-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full opacity-20 ${colorClass.replace('bg-gradient-to-br', 'bg')}`} />
        <div className="relative z-10">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-3 sm:mb-4 flex items-center justify-center shadow-lg ${colorClass}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
        </div>
    </div>
);


const CommunicationPanel: React.FC<{
    communications: PortalCommunication[];
    student: PortalData['student'];
    teacher: TeacherInfo;
}> = ({ communications, student, teacher }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const [modalState, setModalState] = useState<{ type: 'closed' | 'edit' | 'delete', data: PortalCommunication | null }>({ type: 'closed', data: null });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { mutate: sendMessage, isPending: isSending } = useMutation({
        mutationFn: async (messageText: string) => {
            if (!student.access_code || !teacher) throw new Error("Informasi tidak lengkap untuk mengirim pesan.");
            const { error } = await supabase.rpc('send_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_param: messageText,
                teacher_user_id_param: teacher.user_id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            setNewMessage('');
        },
        onError: (err: Error) => toast.error(`Gagal mengirim pesan: ${err.message}`),
    });

    const { mutate: updateMessage, isPending: isUpdating } = useMutation({
        mutationFn: async ({ messageId, newMessageText }: { messageId: string, newMessageText: string }) => {
            if (!student.access_code) throw new Error("Kode akses tidak valid.");
            const { error } = await supabase.rpc('update_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_id_param: messageId,
                new_message_param: newMessageText
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            toast.success("Pesan berhasil diperbarui.");
            setModalState({ type: 'closed', data: null });
        },
        onError: (err: Error) => toast.error(`Gagal memperbarui pesan: ${err.message}`),
    });

    const { mutate: deleteMessage, isPending: isDeleting } = useMutation({
        mutationFn: async (messageId: string) => {
            if (!student.access_code) throw new Error("Kode akses tidak valid.");
            const { error } = await supabase.rpc('delete_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_id_param: messageId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            toast.success("Pesan berhasil dihapus.");
            setModalState({ type: 'closed', data: null });
        },
        onError: (err: Error) => toast.error(`Gagal menghapus pesan: ${err.message}`),
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [communications]);

    return (
        <>
            <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {communications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <SendIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>Belum ada pesan. Mulai percakapan dengan wali kelas.</p>
                        </div>
                    ) : communications.map(msg => (
                        <div key={msg.id} className={`group flex items-start gap-3 ${msg.sender === 'parent' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'teacher' && <img src={teacher?.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" alt="Guru" />}
                            <div className={`relative max-w-md p-4 rounded-2xl text-sm shadow-sm ${msg.sender === 'parent' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'}`}>
                                {/* Attachment Display */}
                                {(msg as any).attachment_url && (
                                    <div className="mb-3">
                                        {(msg as any).attachment_type === 'image' ? (
                                            <a href={(msg as any).attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                                                <img
                                                    src={(msg as any).attachment_url}
                                                    alt="Attachment"
                                                    className="max-w-full rounded-lg max-h-48 object-cover hover:opacity-90 transition-opacity"
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={(msg as any).attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 p-3 rounded-lg ${msg.sender === 'parent' ? 'bg-indigo-700/50 hover:bg-indigo-700/70' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'} transition-colors`}
                                            >
                                                <svg className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                                <span className="text-xs font-medium truncate">{(msg as any).attachment_name || 'Dokumen'}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                <div className={`flex items-center gap-1 text-[10px] mt-2 opacity-80 ${msg.sender === 'parent' ? 'text-indigo-100 justify-end' : 'text-slate-400 justify-end'}`}>
                                    <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.sender === 'parent' && msg.is_read && <CheckCircleIcon className="w-3 h-3" />}
                                </div>
                                {msg.sender === 'parent' && (
                                    <div className="absolute top-0 -left-20 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-slate-600 dark:text-slate-300" onClick={() => setModalState({ type: 'edit', data: msg })}><PencilIcon className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-red-500" onClick={() => setModalState({ type: 'delete', data: msg })}><TrashIcon className="w-4 h-4" /></Button>
                                    </div>
                                )}
                            </div>
                            {msg.sender === 'parent' && <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-800"><UsersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (newMessage.trim()) sendMessage(newMessage); }} className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Ketik pesan untuk wali kelas..."
                        className="flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"><SendIcon className="w-5 h-5" /></Button>
                </form>
            </div>

            {modalState.type === 'edit' && modalState.data && (
                <Modal title="Edit Pesan" isOpen={true} onClose={() => setModalState({ type: 'closed', data: null })}>
                    <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const message = formData.get('message') as string; updateMessage({ messageId: modalState.data!.id, newMessageText: message }); }}>
                        <textarea name="message" defaultValue={modalState.data.message} rows={5} className="w-full mt-1 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"></textarea>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed', data: null })}>Batal</Button>
                            <Button type="submit" disabled={isUpdating} className="bg-indigo-600 text-white hover:bg-indigo-700">{isUpdating ? "Menyimpan..." : "Simpan"}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {modalState.type === 'delete' && modalState.data && (
                <Modal title="Hapus Pesan" isOpen={true} onClose={() => setModalState({ type: 'closed', data: null })}>
                    <p className="text-slate-600 dark:text-slate-300">Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed', data: null })}>Batal</Button>
                        <Button variant="destructive" onClick={() => deleteMessage(modalState.data!.id)} disabled={isDeleting}>{isDeleting ? "Menghapus..." : "Hapus"}</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};


export const ParentPortalPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const accessCode = sessionStorage.getItem('portal_access_code');

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['portalData', studentId],
        queryFn: () => fetchPortalData(studentId!, accessCode!),
        enabled: !!studentId && !!accessCode,
        retry: false,
    });

    useEffect(() => {
        if (!accessCode) {
            navigate('/portal-login', { replace: true });
        }
        if (isError) {
            console.error("Portal Data Fetch Error:", error);
            sessionStorage.removeItem('portal_access_code');
            navigate('/portal-login', { replace: true });
        }
    }, [accessCode, isError, error, navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('portal_access_code');
        navigate('/', { replace: true });
    };

    const attendanceSummary = useMemo(() => {
        if (!data) return { present: 0, absent: 0 };
        return {
            present: data.attendanceRecords.filter(r => r.status === 'Hadir').length,
            absent: data.attendanceRecords.filter(r => r.status !== 'Hadir').length
        }
    }, [data]);

    const totalViolationPoints = useMemo(() => data?.violations.reduce((sum, v) => sum + v.points, 0) || 0, [data]);
    const averageScore = useMemo(() => {
        if (!data || data.academicRecords.length === 0) return 'N/A';
        const total = data.academicRecords.reduce((sum, r) => sum + r.score, 0);
        return Math.round(total / data.academicRecords.length);
    }, [data]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!data) return null;

    const { student, academicRecords, violations, communications, teacher, quizPoints, attendanceRecords } = data;

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-y-auto">
            <PortalHeader student={student} onLogout={handleLogout} />

            <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
                {/* Summary Section */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                    <StatCard icon={BarChartIcon} label="Rata-rata Nilai" value={averageScore} colorClass="bg-gradient-to-br from-purple-500 to-indigo-500" />
                    <StatCard icon={CheckCircleIcon} label="Total Hadir" value={attendanceSummary.present} colorClass="bg-gradient-to-br from-emerald-500 to-teal-500" />
                    <StatCard icon={CalendarIcon} label="Total Absen" value={attendanceSummary.absent} colorClass="bg-gradient-to-br from-amber-500 to-orange-500" />
                    <StatCard icon={ShieldAlertIcon} label="Poin Pelanggaran" value={totalViolationPoints} colorClass="bg-gradient-to-br from-rose-500 to-red-500" />
                </section>

                {/* Tabbed Content */}
                <GlassCard className="animate-fade-in-up delay-100">
                    <Tabs defaultValue="akademik" className="w-full">
                        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 min-w-max sm:w-auto">
                                <TabsTrigger value="akademik" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <BarChartIcon className="w-4 h-4" />
                                    <span>Akademik</span>
                                </TabsTrigger>
                                <TabsTrigger value="analisis" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <TrendingUpIcon className="w-4 h-4" />
                                    <span>Analisis</span>
                                </TabsTrigger>
                                <TabsTrigger value="perilaku" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <ShieldAlertIcon className="w-4 h-4" />
                                    <span>Perilaku</span>
                                </TabsTrigger>
                                <TabsTrigger value="komunikasi" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <SendIcon className="w-4 h-4" />
                                    <span>Chat</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Academic Tab */}
                        <TabsContent value="akademik" className="p-4 sm:p-6">
                            {/* Subject Average Chart */}
                            {academicRecords.length > 0 && (() => {
                                // Group by subject and calculate average
                                const subjectData = academicRecords.reduce((acc, r) => {
                                    if (!acc[r.subject]) {
                                        acc[r.subject] = { total: 0, count: 0, scores: [] };
                                    }
                                    acc[r.subject].total += r.score;
                                    acc[r.subject].count += 1;
                                    acc[r.subject].scores.push({ name: r.assessment_name || '', score: r.score, notes: r.notes || '', id: r.id });
                                    return acc;
                                }, {} as Record<string, { total: number; count: number; scores: { name: string; score: number; notes: string; id: string }[] }>);

                                const subjects = Object.keys(subjectData).sort();
                                const maxScore = 100;

                                return (
                                    <>
                                        {/* Chart Section */}
                                        <div className="mb-8 p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                                                <BarChartIcon className="w-5 h-5 text-indigo-500" />
                                                Grafik Rata-rata Nilai per Mapel
                                            </h3>
                                            <div className="space-y-3">
                                                {subjects.map((subject, index) => {
                                                    const avg = Math.round(subjectData[subject].total / subjectData[subject].count);
                                                    const percentage = (avg / maxScore) * 100;
                                                    const barColor = avg >= 75 ? 'bg-emerald-500' : avg >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                                                    const textColor = avg >= 75 ? 'text-emerald-600 dark:text-emerald-400' : avg >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

                                                    return (
                                                        <div key={subject} className="group">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{subject}</span>
                                                                <span className={`text-sm font-bold ${textColor}`}>{avg}</span>
                                                            </div>
                                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                                                                    style={{
                                                                        width: `${percentage}%`,
                                                                        animationDelay: `${index * 100}ms`
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                                                <span>{subjectData[subject].count} penilaian</span>
                                                                <span>{avg >= 75 ? '✓ Tuntas' : avg >= 60 ? '⚠ Perlu Bimbingan' : '✗ Belum Tuntas'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Legend */}
                                            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700/30">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-400">≥75 Tuntas</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-400">60-74 Perlu Bimbingan</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-400">&lt;60 Belum Tuntas</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grouped by Subject */}
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                                            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                                            Detail Nilai per Mapel
                                        </h3>
                                        <div className="space-y-6">
                                            {subjects.map(subject => {
                                                const avg = Math.round(subjectData[subject].total / subjectData[subject].count);
                                                const avgColor = avg >= 75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : avg >= 60 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20';

                                                return (
                                                    <div key={subject} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                        {/* Subject Header */}
                                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white">{subject}</h4>
                                                                <p className="text-xs text-slate-500">{subjectData[subject].count} penilaian</p>
                                                            </div>
                                                            <div className={`px-3 py-1.5 rounded-xl font-bold text-lg ${avgColor}`}>
                                                                Ø {avg}
                                                            </div>
                                                        </div>

                                                        {/* Score List */}
                                                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                            {subjectData[subject].scores.map(score => {
                                                                const scoreColor = score.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : score.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
                                                                return (
                                                                    <div key={score.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-medium text-sm text-indigo-600 dark:text-indigo-400">{score.name || 'Penilaian'}</p>
                                                                            {score.notes && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{score.notes}</p>}
                                                                        </div>
                                                                        <div className={`font-bold text-2xl ${scoreColor} ml-4`}>{score.score}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}

                            {academicRecords.length === 0 && (
                                <p className="text-slate-500 text-center py-12 italic">Belum ada data nilai akademik.</p>
                            )}

                            <h3 className="text-lg font-bold mt-10 mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                                Poin Keaktifan
                            </h3>
                            <div className="space-y-3">
                                {quizPoints.length > 0 ? quizPoints.map(qp => (
                                    <div key={qp.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <SparklesIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{qp.quiz_name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(qp.quiz_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                                            +{qp.points} Poin
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500 text-center py-8 italic">Belum ada poin keaktifan yang tercatat.</p>}
                            </div>
                        </TabsContent>

                        {/* Analysis Tab - New */}
                        <TabsContent value="analisis" className="p-4 sm:p-6">
                            <ChildDevelopmentAnalytics
                                academicRecords={academicRecords}
                                attendanceRecords={attendanceRecords}
                                violations={violations}
                                studentName={student.name}
                            />
                        </TabsContent>

                        {/* Behavior & Attendance Tab */}
                        <TabsContent value="perilaku" className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                                        <div className="w-1 h-6 bg-rose-500 rounded-full"></div>
                                        Catatan Pelanggaran
                                    </h3>
                                    <div className="space-y-3">
                                        {violations.length > 0 ? violations.map(v => (
                                            <div key={v.id} className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold px-2 py-1 rounded-md">{new Date(v.date).toLocaleDateString('id-ID')}</span>
                                                    <span className="font-bold text-rose-600 dark:text-rose-400">+{v.points} Poin</span>
                                                </div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{v.description}</p>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                                <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                                                <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada catatan pelanggaran.</p>
                                                <p className="text-sm text-slate-400 dark:text-slate-500">Perilaku siswa sangat baik.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                                        Riwayat Kehadiran
                                    </h3>
                                    <div className="space-y-2">
                                        {attendanceRecords.length > 0 ? [...attendanceRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(att => { // Show last 10
                                            const statusInfo = {
                                                'Hadir': { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' },
                                                'Izin': { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' },
                                                'Sakit': { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20' },
                                                'Alpha': { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20' },
                                            }[att.status];
                                            return (
                                                <div key={att.id} className={`p-3 rounded-xl flex justify-between items-center border ${statusInfo?.bg}`}>
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                                    <p className={`font-bold text-xs px-3 py-1 rounded-full bg-white/50 dark:bg-black/20 ${statusInfo?.color}`}>{att.status}</p>
                                                </div>
                                            )
                                        }) : <p className="text-slate-500 text-center py-8 italic">Belum ada data kehadiran.</p>}
                                        {attendanceRecords.length > 10 && <p className="text-xs text-center text-slate-400 mt-4">Menampilkan 10 catatan terakhir...</p>}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Communication Tab */}
                        <TabsContent value="komunikasi">
                            <CommunicationPanel communications={communications} student={student} teacher={teacher} />
                        </TabsContent>
                    </Tabs>
                </GlassCard>
            </main>
        </div>
    );
};