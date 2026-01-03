import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { Button } from '../ui/Button';
import { LogoutIcon, BarChartIcon, CheckCircleIcon, ShieldAlertIcon, SparklesIcon, CalendarIcon, SendIcon, UsersIcon, GraduationCapIcon, PencilIcon, TrashIcon, TrendingUpIcon, CheckSquareIcon, ClockIcon, SettingsIcon, BellIcon, DownloadIcon, BookOpenIcon } from '../Icons';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ChildDevelopmentAnalytics } from '../ui/ChildDevelopmentAnalytics';
import { generateReportCardPDF } from '../exports/generateReportCardPDF';
import { getStudentAvatar } from '../../utils/avatarUtils';

// Explicit Interfaces to replace Json types
export interface PortalStudentInfo {
    id: string;
    name: string;
    gender: 'Laki-laki' | 'Perempuan';
    class_id: string;
    avatar_url: string | null;
    access_code: string | null;
    parent_name: string | null;
    parent_phone: string | null;
    classes: { name: string };
}
export interface PortalReport {
    id: string;
    title: string;
    type: string;
    content: string;
    created_at: string;
}
export interface PortalAttendance {
    id: string;
    date: string;
    status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
    notes: string | null;
}
export interface PortalAcademicRecord {
    id: string;
    subject: string;
    score: number;
    notes: string;
    assessment_name: string | null;
}
export interface PortalViolation {
    id: string;
    date: string;
    type: string;
    points: number;
    description: string | null;
}
export interface PortalQuizPoint {
    id: string;
    points: number;
    type: string;
    reason: string;
    created_at: string;
}
export interface PortalCommunication {
    id: string;
    content: string;
    is_from_teacher: boolean;
    is_read: boolean;
    created_at: string;
    sender: 'parent' | 'teacher'; // Client-side derived property
}
export interface PortalSchedule {
    id: string;
    day: string;
    start_time: string;
    end_time: string;
    subject: string;
}
export interface PortalTask {
    id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'done';
    due_date: string | null;
}
export interface PortalAnnouncement {
    id: string;
    title: string;
    content: string;
    date: string | null;
    audience_type: string | null;
}

export interface PortalSchoolInfo {
    school_name: string;
    school_address?: string;
    semester?: string;
    academic_year?: string;
}

export type TeacherInfo = { user_id: string; full_name: string; avatar_url: string } | null;

export type PortalData = {
    student: PortalStudentInfo;
    reports: PortalReport[];
    attendanceRecords: PortalAttendance[];
    academicRecords: PortalAcademicRecord[];
    violations: PortalViolation[];
    quizPoints: PortalQuizPoint[];
    communications: PortalCommunication[];
    schedules: PortalSchedule[];
    tasks: PortalTask[];
    announcements: PortalAnnouncement[];
    teacher: TeacherInfo;
    schoolInfo: PortalSchoolInfo;
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

    const student = portalResult.student as unknown as PortalStudentInfo;

    return {
        student: { ...student, access_code: accessCode || null },
        reports: (portalResult.reports || []) as unknown as PortalReport[],
        attendanceRecords: (portalResult.attendanceRecords || []) as unknown as PortalAttendance[],
        academicRecords: (portalResult.academicRecords || []) as unknown as PortalAcademicRecord[],
        violations: (portalResult.violations || []) as unknown as PortalViolation[],
        quizPoints: (portalResult.quizPoints || []) as unknown as PortalQuizPoint[],
        communications: (portalResult.communications || []) as unknown as PortalCommunication[],
        schedules: (portalResult.schedules || []) as unknown as PortalSchedule[],
        tasks: (portalResult.tasks || []) as unknown as PortalTask[],
        announcements: (portalResult.announcements || []) as unknown as PortalAnnouncement[],
        teacher: portalResult.teacher as any,
        schoolInfo: ((portalResult as any).schoolInfo || { school_name: 'Sekolah' }) as PortalSchoolInfo,
    };
};


const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div
        className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl ${className}`}
        {...props}
    />
);

const AnnouncementsTicker: React.FC<{ announcements: PortalAnnouncement[] }> = ({ announcements }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (announcements.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % announcements.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [announcements.length]);

    if (!announcements.length) return null;

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
                <BellIcon className="w-4 h-4 text-amber-500 animate-pulse" />
                <div className="flex-1 overflow-hidden relative h-5">
                    {announcements.map((ann, idx) => (
                        <div
                            key={ann.id}
                            className={`absolute inset-0 flex items-center transition-all duration-500 transform ${idx === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                                }`}
                        >
                            <span className="text-sm font-medium text-amber-500 truncate mr-2">
                                [{new Date(ann.date || '').toLocaleDateString('id-ID')}]
                            </span>
                            <span className="text-sm text-amber-100 truncate">
                                {ann.title}: {ann.content}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: PortalData['student'];
    onSave: (name: string, phone: string) => Promise<void>;
}> = ({ isOpen, onClose, student, onSave }) => {
    const [name, setName] = useState(student.parent_name || '');
    const [phone, setPhone] = useState(student.parent_phone || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(name, phone);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Data Orang Tua">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama Orang Tua / Wali
                    </label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nomor WhatsApp (untuk notifikasi)
                    </label>
                    <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Pastikan nomor aktif untuk menerima notifikasi kehadiran siswa.
                    </p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                        Batal
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


const PortalHeader: React.FC<{
    student: PortalData['student'],
    announcements: PortalAnnouncement[],
    onLogout: () => void,
    onSettingsClick: () => void
}> = ({ student, announcements, onLogout, onSettingsClick }) => (
    <header className="relative overflow-hidden bg-slate-900">
        {/* Announcements Ticker */}
        <AnnouncementsTicker announcements={announcements} />

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
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Portal Orang Tua</h1>
                            <p className="text-xs sm:text-sm text-white/70">Pantau perkembangan belajar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={onSettingsClick}
                            className="text-white hover:bg-white/20 rounded-xl px-4"
                            aria-label="Pengaturan"
                        >
                            <SettingsIcon className="w-5 h-5 sm:mr-2" />
                            <span className="hidden sm:inline">Pengaturan</span>
                        </Button>
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
                </div>

                {/* Student Profile Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
                    <div className="flex items-center gap-4">
                        <img
                            src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name)}
                            alt={student.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-3 border-white/50 shadow-xl bg-slate-200"
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
    teacher: PortalData['teacher'];
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
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
                        <textarea name="message" defaultValue={modalState.data.content} rows={5} className="w-full mt-1 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"></textarea>
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
    const toast = useToast();
    const queryClient = useQueryClient();

    const [settingsOpen, setSettingsOpen] = useState(false);

    // PDF Download handler
    const handleDownloadPDF = async () => {
        if (data) {
            try {
                await generateReportCardPDF(data);
                toast.success("PDF berhasil diunduh.");
            } catch (error) {
                console.error("Failed to generate PDF", error);
                toast.error("Gagal mengunduh PDF.");
            }
        }
    };

    // Mutation for updating parent info
    const { mutate: updateParentInfo } = useMutation({
        mutationFn: async ({ name, phone }: { name: string, phone: string }) => {
            if (!data?.student.access_code) throw new Error("Kode akses hilang.");
            const { error } = await supabase.rpc('update_parent_info', {
                student_id_param: studentId!,
                access_code_param: data.student.access_code,
                new_parent_name: name,
                new_parent_phone: phone
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', studentId] });
            toast.success("Data orang tua berhasil diperbarui.");
        },
        onError: (err) => toast.error("Gagal memperbarui data: " + err.message)
    });

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
        if (!data) return { present: 0, sick: 0, permission: 0, absent: 0 };
        return {
            present: data.attendanceRecords.filter(r => r.status === 'Hadir').length,
            sick: data.attendanceRecords.filter(r => r.status === 'Sakit').length,
            permission: data.attendanceRecords.filter(r => r.status === 'Izin').length,
            absent: data.attendanceRecords.filter(r => r.status === 'Alpha').length
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

    const { student, academicRecords, violations, communications, teacher, quizPoints, attendanceRecords, schedules, tasks, announcements } = data;

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-y-auto">
            <PortalHeader
                student={student}
                announcements={announcements}
                onLogout={handleLogout}
                onSettingsClick={() => setSettingsOpen(true)}
            />

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                student={student}
                onSave={async (name, phone) => updateParentInfo({ name: name || '', phone: phone || '' })}
            />

            <main className="relative z-10 -mt-8 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
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
                                    <span>Evaluasi Siswa</span>
                                </TabsTrigger>
                                <TabsTrigger value="absensi" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>Absensi</span>
                                </TabsTrigger>
                                <TabsTrigger value="tugas" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <BookOpenIcon className="w-4 h-4" />
                                    <span>Tugas Siswa</span>
                                </TabsTrigger>
                                <TabsTrigger value="jadwal" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>Jadwal</span>
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
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                                    Laporan Akademik
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleDownloadPDF}
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Unduh Rapor (PDF)</span>
                                </Button>
                            </div>
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
                                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                                Poin Keaktifan
                            </h3>
                            <div className="space-y-3">
                                {quizPoints.length > 0 ? quizPoints.map(qp => (
                                    <div key={qp.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <SparklesIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{qp.reason}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(qp.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                                            +{qp.points} Poin
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500 text-center py-8 italic">Belum ada poin keaktifan yang tercatat.</p>}
                            </div>
                        </TabsContent>

                        {/* Evaluasi Siswa Tab */}
                        <TabsContent value="analisis" className="p-4 sm:p-6">
                            <ChildDevelopmentAnalytics
                                academicRecords={academicRecords}
                                attendanceRecords={attendanceRecords}
                                violations={violations as any}
                                studentName={student.name}
                            />
                        </TabsContent>

                        {/* Absensi Tab */}
                        <TabsContent value="absensi" className="p-4 sm:p-6">
                            <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                                    <ClockIcon className="w-5 h-5 text-indigo-500" />
                                    Riwayat Absensi
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Hadir</p>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{attendanceSummary.present}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Sakit/Izin</p>
                                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{attendanceSummary.sick + attendanceSummary.permission}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
                                        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase">Alpha</p>
                                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{attendanceSummary.absent}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">Total Pertemuan</p>
                                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{attendanceRecords.length}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {attendanceRecords.length > 0 ? attendanceRecords.map(record => (
                                        <div key={record.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                                    ${record.status === 'Hadir' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        record.status === 'Sakit' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            record.status === 'Izin' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                    {record.status.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(record.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {record.status}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold
                                                ${record.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                    record.status === 'Sakit' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                                        record.status === 'Izin' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                            'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                {record.status}
                                            </span>
                                        </div>
                                    )) : <p className="text-center text-slate-500 py-8 italic">Belum ada data absensi.</p>}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tugas Siswa Tab */}
                        <TabsContent value="tugas" className="p-4 sm:p-6">
                            <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                                    <BookOpenIcon className="w-5 h-5 text-indigo-500" />
                                    Daftar Tugas & Pekerjaan Rumah
                                </h3>
                                <div className="space-y-4">
                                    {tasks.length > 0 ? tasks.map(task => (
                                        <div key={task.id} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold mb-2">
                                                        {(task as any).subject || 'Umum'}
                                                    </span>
                                                    <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {task.title}
                                                    </h4>
                                                </div>
                                                {task.due_date && (
                                                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
                                                        <ClockIcon className="w-4 h-4" />
                                                        <span>Batas: {new Date(task.due_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                                {task.description || 'Tidak ada deskripsi detail.'}
                                            </p>
                                        </div>
                                    )) : (
                                        <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700">
                                            <BookOpenIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-medium">Hore! Tidak ada tugas aktif saat ini.</p>
                                            <p className="text-xs text-slate-400 mt-1">Nikmati waktu istirahatmu.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>


                        {/* Schedule Tab */}
                        <TabsContent value="jadwal" className="p-4 sm:p-6">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                Jadwal Pelajaran
                            </h3>
                            <div className="space-y-4">
                                {schedules.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada jadwal pelajaran.</p>
                                    </div>
                                ) : (
                                    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                                        const daySchedules = schedules.filter(s => s.day === day);
                                        if (daySchedules.length === 0) return null;
                                        return (
                                            <div key={day} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200">{day}</h4>
                                                </div>
                                                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {daySchedules.map(sch => (
                                                        <div key={sch.id} className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                                    <ClockIcon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{sch.subject}</p>
                                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{sch.start_time.substring(0, 5)} - {sch.end_time.substring(0, 5)}</p>
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
                        </TabsContent>

                        {/* Behavior Tab */}
                        <TabsContent value="perilaku" className="p-6">
                            <div className="grid grid-cols-1 gap-8">
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
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.type === 'Berat' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                        v.type === 'Sedang' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                            'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        {v.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2">{v.description || '-'}</p>
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
                            </div>
                        </TabsContent>

                        {/* Communication Tab */}
                        <TabsContent value="komunikasi">
                            <CommunicationPanel communications={communications} student={student} teacher={teacher} />
                        </TabsContent>
                    </Tabs>
                </GlassCard>
            </main >
        </div >
    );
};