import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { staggerContainerVariants, staggerItemVariants } from '../../utils/animations';
import { triggerSubtleConfetti } from '../../utils/confetti';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PlusIcon, ClockIcon, CalendarIcon, BookOpenIcon, GraduationCapIcon, BrainCircuitIcon, DownloadCloudIcon, AlertCircleIcon, CheckCircleIcon } from '../Icons';
import { Modal } from '../ui/Modal';
import { MarkdownText } from '../ui/MarkdownText';
import { generateOpenRouterJson } from '../../services/openRouterService';
import { supabase } from '../../services/supabase';
import { softDelete } from '../../services/SoftDeleteService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import JurnalMengajarPage from './JurnalMengajarPage';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { ValidationService } from '../../services/ValidationService';
import { ValidationRules } from '../../types';
import { componentStyles } from '../../styles/designTokens';
import { CustomDropdown } from '../ui/CustomDropdown';
import { SchedulePageSkeleton } from '../skeletons/PageSkeletons';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { ScheduleDaySelector } from '../schedule/ScheduleDaySelector';
import { ScheduleViewToolbar } from '../schedule/ScheduleViewToolbar';
import { ScheduleCard } from '../schedule/ScheduleCard';
import { FormInputWrapper } from '../schedule/FormInputWrapper';
import { NotificationPrompt } from '../schedule/NotificationPrompt';
import { daysOfWeek, formatTimeRange } from '../../utils/scheduleUtils';
import { exportSchedulePdf, exportScheduleIcs } from '../../services/scheduleExportService';
import { type ScheduleViewMode } from '../schedule/scheduleMenuConfig';
import { ScheduleRow } from '../../types';

const scheduleRules: ValidationRules = {
    subject: [ValidationService.validators.required("Mata pelajaran harus diisi")],
    class_id: [ValidationService.validators.required("Kelas harus diisi")],
    start_time: [ValidationService.validators.required("Waktu mulai harus diisi")],
    end_time: [ValidationService.validators.required("Waktu selesai harus diisi")]
};

// ScheduleWithClassName is no longer needed here; push subscription is handled by PushNotificationService
type ScheduleMutationVars =
    | { mode: 'add'; data: Database['public']['Tables']['schedules']['Insert'] }
    | { mode: 'edit'; data: Database['public']['Tables']['schedules']['Update']; id: string };

const toLiveSchedulePayload = (
    data: Database['public']['Tables']['schedules']['Insert'] | Database['public']['Tables']['schedules']['Update']
) => {
    const { day, start_time, end_time, subject, class_id, user_id } = data;
    return {
        ...(day !== undefined ? { day } : {}),
        ...(start_time !== undefined ? { start_time } : {}),
        ...(end_time !== undefined ? { end_time } : {}),
        ...(subject !== undefined ? { subject } : {}),
        ...(class_id !== undefined ? { class_id } : {}),
        ...(user_id !== undefined ? { user_id } : {}),
    };
};

const inputStyles = `${componentStyles.input} pl-10 min-h-[44px]`;

const SchedulePage: React.FC = () => {
    const { user, loading: authLoading, isNotificationsEnabled } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();

    const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
    const getDateOffsetForDay = (dayName: string): Date => {
        const today = new Date();
        const targetIdx = DAY_NAMES.indexOf(dayName as typeof DAY_NAMES[number]);
        if (targetIdx === -1) return today;
        const diff = targetIdx - today.getDay();
        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return d;
    };
    const getLocalDateStringForDay = (dayName: string): string => getDateOffsetForDay(dayName).toLocaleDateString('sv-SE');

    const handleIsiJurnal = (item: ScheduleRow) => {
        const dateStr = getLocalDateStringForDay(item.day);
        const params = new URLSearchParams({ classId: item.class_id || '', subject: item.subject, date: dateStr, scheduleId: item.id });
        navigate(`/jurnal?${params.toString()}`);
    };

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; data: ScheduleRow | null }>({ isOpen: false, mode: 'add', data: null });
    const [formData, setFormData] = useState<Omit<Database['public']['Tables']['schedules']['Insert'], 'id' | 'created_at' | 'user_id'>>({ day: 'Senin', start_time: '08:00', end_time: '09:30', subject: '', class_id: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<ScheduleViewMode>('daily');
    const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('id-ID', { weekday: 'long' }));
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ sections: { title: string; points: string[] }[] } | { error: string } | null>(null);
    const [isAnalysisLoading, setAnalysisLoading] = useState(false);
    const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(isNotificationsEnabled);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; data: ScheduleRow | null }>({ isOpen: false, data: null });
    const lastScheduleErrorRef = useRef<string | null>(null);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        setNotificationsEnabled(isNotificationsEnabled);
    }, [isNotificationsEnabled]);

    useEffect(() => {
        if (!daysOfWeek.includes(selectedDay)) {
            setSelectedDay('Senin');
        }
    }, [selectedDay]);

    const getDayNumber = (dayName: string) => {
        const d = getDateOffsetForDay(dayName);
        return d.getDate();
    };

    const { data: rawSchedule = [], isLoading: pageLoading, isError, error: queryError } = useQuery({
        queryKey: ['schedule', user?.id],
        queryFn: async (): Promise<ScheduleRow[]> => {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .order('day')
                .order('start_time');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const { data: classes = [], isLoading: isLoadingClasses, isError: isClassesError, refetch: refetchClasses } = useQuery({
        queryKey: ['classes', 'schedule', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .is('deleted_at', null)
                .eq('is_archived', false)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['teacherClassAssignments', 'schedule', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('*')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const accessibleClasses = useMemo(() => {
        const assignedClassIds = new Set(
            teacherAssignments.map(a => a.class_id)
        );
        return classes.filter(c =>
            c.user_id === user?.id || assignedClassIds.has(c.id)
        );
    }, [classes, user, teacherAssignments]);

    const classNameMap = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach(c => map.set(c.id, c.name));
        return map;
    }, [classes]);

    const schedule = rawSchedule;
    const scheduleByDay = useMemo(() => {
        const map: Record<string, ScheduleRow[]> = {};
        daysOfWeek.forEach(day => { map[day] = []; });
        schedule.forEach(item => { if (map[item.day]) map[item.day].push(item); });
        daysOfWeek.forEach(day => {
            if (map[day].length > 1) map[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
        return map;
    }, [schedule]);

    useEffect(() => {
        if (!isError) { lastScheduleErrorRef.current = null; return; }
        const message = `Gagal memuat jadwal: ${(queryError as Error).message}`;
        if (lastScheduleErrorRef.current !== message) {
            toast.error(message);
            lastScheduleErrorRef.current = message;
        }
    }, [isError, queryError, toast]);

    const conflictWarnings = useMemo(() => {
        const conflicts: { day: string; time: string; subjects: string[] }[] = [];
        daysOfWeek.forEach(day => {
            const daySchedule = scheduleByDay[day] || [];
            for (let i = 0; i < daySchedule.length - 1; i++) {
                const current = daySchedule[i];
                const next = daySchedule[i + 1];
                if (current.end_time > next.start_time) {
                    const conflictTime = formatTimeRange(next.start_time, current.end_time);
                    const existingConflict = conflicts.find(c => c.day === day && c.time === conflictTime);
                    if (existingConflict) {
                        if (!existingConflict.subjects.includes(next.subject)) existingConflict.subjects.push(next.subject);
                    } else {
                        conflicts.push({ day, time: conflictTime, subjects: [current.subject, next.subject] });
                    }
                }
            }
        });
        return conflicts;
    }, [scheduleByDay]);

    const scheduleMutation = useMutation({
        mutationFn: async (scheduleData: ScheduleMutationVars) => {
            if (scheduleData.mode === 'add') {
                const { error } = await supabase.from('schedules').insert(toLiveSchedulePayload(scheduleData.data) as Database['public']['Tables']['schedules']['Insert']);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('schedules').update(toLiveSchedulePayload(scheduleData.data) as Database['public']['Tables']['schedules']['Update']).eq('id', scheduleData.id);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            toast.success("Jadwal berhasil disimpan!");
            handleCloseModal();
            setTimeout(() => triggerSubtleConfetti(), 300);
        },
        onError: (error: Error) => toast.error(error.message)
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await softDelete('schedules', id);
            if (!result.success) throw new Error(result.error || 'Gagal menghapus jadwal');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            toast.success("Jadwal berhasil dihapus.");
        },
        onError: (error: Error) => toast.error(error.message)
    });

    const handleOpenAddModal = (day?: string) => {
        setFormData({ day: day || selectedDay || 'Senin', start_time: '08:00', end_time: '09:30', subject: '', class_id: '' });
        setModalState({ isOpen: true, mode: 'add', data: null });
        setErrors({});
    };
    const handleOpenEditModal = (item: ScheduleRow) => {
        setFormData({ day: item.day, start_time: item.start_time, end_time: item.end_time, subject: item.subject, class_id: item.class_id });
        setModalState({ isOpen: true, mode: 'edit', data: item });
        setErrors({});
    };
    const handleCloseModal = () => { if (scheduleMutation.isPending) return; setModalState({ isOpen: false, mode: 'add', data: null }); setErrors({}); };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const validationResult = ValidationService.validateForm({
            subject: formData.subject, class_id: formData.class_id, start_time: formData.start_time, end_time: formData.end_time
        }, scheduleRules);
        if (!validationResult.isValid) { setErrors(validationResult.errors); return; }

        if (formData.end_time <= formData.start_time) {
            setErrors({ end_time: 'Waktu selesai harus setelah waktu mulai.' });
            return;
        }

        if (!accessibleClasses.some((classItem) => classItem.id === formData.class_id)) {
            setErrors({ class_id: 'Pilih kelas yang tersedia pada daftar.' });
            return;
        }

        const toMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const formStart = toMinutes(formData.start_time);
        const formEnd = toMinutes(formData.end_time);

        const hasConflict = schedule.some((item) => {
            const itemStart = toMinutes(item.start_time);
            const itemEnd = toMinutes(item.end_time);
            return (
                item.id !== modalState.data?.id
                && item.day === formData.day
                && formStart < itemEnd
                && formEnd > itemStart
            );
        });
        if (hasConflict) {
            setErrors({ start_time: 'Waktu ini bertabrakan dengan jadwal mengajar lain.' });
            return;
        }

        setErrors({});
        if (modalState.mode === 'add') {
            scheduleMutation.mutate({ mode: 'add', data: { ...formData, user_id: user.id } });
        } else if (modalState.data) {
            scheduleMutation.mutate({ mode: 'edit', data: formData, id: modalState.data.id });
        }
    };

    const handleDeleteClick = (item: ScheduleRow) => setConfirmModalState({ isOpen: true, data: item });
    const handleConfirmDelete = () => {
        if (confirmModalState.data) deleteScheduleMutation.mutate(confirmModalState.data.id);
        setConfirmModalState({ isOpen: false, data: null });
    };

    const handleAnalyzeSchedule = async () => {
        setAnalysisModalOpen(true); setAnalysisLoading(true); setAnalysisResult(null);
        const systemInstruction = `Anda adalah seorang analis efisiensi jadwal...`;
        const prompt = `Analisis data jadwal JSON berikut dan berikan wawasan. Fokus pada: 1. Konflik Jadwal... Data Jadwal: ${JSON.stringify(schedule)}`;
        try {
            const result = await generateOpenRouterJson<{ sections: { title: string; points: string[] }[] }>(prompt, systemInstruction);
            setAnalysisResult(result);
        } catch (error) {
            console.error("Schedule Analysis Error:", error);
            setAnalysisResult({ error: "Gagal menganalisis jadwal. Silakan coba lagi." });
        } finally { setAnalysisLoading(false); }
    };

    const handleExportPdf = () => exportSchedulePdf(schedule, scheduleByDay, user?.name || 'Guru', toast);
    const handleExportToIcs = () => exportScheduleIcs(schedule, toast);

    const handleEnableNotifications = async () => {
        setIsEnablingNotifications(true);
        if (!user) {
            toast.warning("Anda harus login terlebih dahulu.");
            setIsEnablingNotifications(false);
            return;
        }
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada data jadwal untuk notifikasi.");
            setIsEnablingNotifications(false);
            return;
        }
        try {
            // Use PushNotificationService to properly subscribe via PushManager
            // and persist the subscription in the push_subscriptions table.
            // The old enableScheduleNotifications() path only posted a message to
            // the SW which has been deprecated (SW no longer listens for SCHEDULE_UPDATED).
            const { pushNotificationService } = await import('../../services/PushNotificationService');
            const result = await pushNotificationService.enable(user.id);
            if (result.enabled && result.serverRegistered) {
                // Also sync the legacy flag so isNotificationsEnabled stays in sync
                localStorage.setItem('scheduleNotificationsEnabled', 'true');
                setNotificationsEnabled(true);
                toast.success('Notifikasi jadwal berhasil diaktifkan! Anda akan diingatkan sebelum jam mengajar.');
            } else if (result.permission === 'denied') {
                toast.error("Izin notifikasi ditolak oleh browser. Buka pengaturan browser untuk mengizinkan notifikasi.");
            } else {
                toast.warning("Notifikasi belum bisa diaktifkan. Pastikan browser mendukung Web Push.");
            }
        } catch (error) {
            console.error('Enable notifications error:', error);
            const msg = error instanceof Error ? error.message : 'Gagal mengaktifkan notifikasi.';
            toast.error(msg);
        } finally {
            setIsEnablingNotifications(false);
        }
    };

    const getScheduleStatus = (item: ScheduleRow, now: Date) => {
        const currentDayName = now.toLocaleDateString('id-ID', { weekday: 'long' });
        if (item.day !== currentDayName) return 'upcoming';
        const [startHour, startMinute] = item.start_time.split(':').map(Number);
        const [endHour, endMinute] = item.end_time.split(':').map(Number);
        const startTime = new Date(now); startTime.setHours(startHour, startMinute, 0);
        const endTime = new Date(now); endTime.setHours(endHour, endMinute, 0);
        if (now >= startTime && now <= endTime) return 'ongoing';
        if (now > endTime) return 'past';
        return 'upcoming';
    };

    const getDuration = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
    };

    const [searchParams, setSearchParams] = useSearchParams();
    const activeMainTab = searchParams.get('tab') === 'jurnal' ? 'jurnal' : 'jadwal';

    if (authLoading || pageLoading) return <SchedulePageSkeleton />;

    const currentDaySchedule = scheduleByDay[selectedDay] || [];

    return (
        <div className="w-full min-h-full bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-white pb-24">
            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Main Section Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white font-serif">Jadwal & Jurnal Mengajar</h1>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Kelola jadwal pelajaran dan catat jurnal harian mengajar dalam satu tempat.</p>
                    </div>
                    {activeMainTab === 'jadwal' && (
                        <div className="flex flex-wrap gap-2 self-end md:self-center">
                            <Button onClick={() => handleOpenAddModal()} variant="primary" size="sm"
                                className="h-10 px-3 sm:px-4 rounded-lg">
                                <PlusIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Tambah Jadwal</span>
                            </Button>
                            <Button onClick={handleAnalyzeSchedule} variant="outline" size="sm" disabled={!isOnline || schedule.length === 0}
                                className="h-10 px-3 sm:px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white">
                                <BrainCircuitIcon className="w-4 h-4 sm:mr-2 text-emerald-500 dark:text-emerald-400" />
                                <span className="hidden sm:inline">Analisis AI</span>
                            </Button>
                            <Button onClick={handleExportPdf} variant="outline" size="sm"
                                className="h-10 px-3 sm:px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white">
                                <DownloadCloudIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">PDF</span>
                            </Button>
                            <Button onClick={handleExportToIcs} variant="outline" size="sm"
                                className="h-10 px-3 sm:px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white">
                                <CalendarIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">ICS</span>
                            </Button>
                        </div>
                    )}
                </header>

                {/* Tab Navigation Pill */}
                <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl w-fit border border-slate-300/40 dark:border-slate-700/40">
                    <button
                        onClick={() => setSearchParams({})}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                            activeMainTab === 'jadwal'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Jadwal Mengajar</span>
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: 'jurnal' })}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                            activeMainTab === 'jurnal'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <BookOpenIcon className="w-4 h-4" />
                        <span>Jurnal Harian Mengajar</span>
                    </button>
                </div>

                {activeMainTab === 'jurnal' ? (
                    <JurnalMengajarPage />
                ) : (
                    <>

                {!notificationsEnabled && <NotificationPrompt onEnable={handleEnableNotifications} isLoading={isEnablingNotifications} />}

                {conflictWarnings.length > 0 ? (
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                            <AlertCircleIcon className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-700 dark:text-red-200 mb-1">Konflik Jadwal Terdeteksi!</h4>
                                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-300 space-y-1">
                                    {conflictWarnings.map((conflict, idx) => (
                                        <li key={idx}>
                                            <span className="font-semibold">{conflict.day}</span> ({conflict.time}): {conflict.subjects.join(' & ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : schedule.length > 0 ? (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                            <CheckCircleIcon className="w-5 h-5" />
                            Tidak ada konflik jadwal.
                        </div>
                    </div>
                ) : null}

                <div className="space-y-6">
                    <ScheduleDaySelector days={daysOfWeek} selectedDay={selectedDay} onSelectDay={setSelectedDay} getDayNumber={getDayNumber} />
                    <ScheduleViewToolbar viewMode={viewMode} selectedDay={selectedDay} currentDaySessions={currentDaySchedule.length} onViewModeChange={setViewMode} />

                    {viewMode === 'weekly' ? (
                        <WeeklyScheduleView schedule={schedule} classes={classes} onEdit={handleOpenEditModal} onIsiJurnal={handleIsiJurnal} />
                    ) : (
                        <>
                            {currentDaySchedule.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center bg-white dark:bg-[#0F172A] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                                        <CalendarIcon className="w-7 h-7 text-slate-400 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Tidak Ada Jadwal</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto mb-4">
                                        Belum ada jadwal untuk hari {selectedDay}. Tambahkan jadwal pertama Anda.
                                    </p>
                                    <Button onClick={() => handleOpenAddModal()} variant="outline" size="sm" className="rounded-full border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <PlusIcon className="w-4 h-4 mr-1.5" /> Tambah Jadwal
                                    </Button>
                                </div>
                            ) : (
                                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                                    variants={staggerContainerVariants} initial="initial" animate="animate">
                                    {currentDaySchedule.map((item, index) => {
                                        const status = getScheduleStatus(item, currentTime);
                                        return (
                                            <motion.div key={item.id} variants={staggerItemVariants} custom={index}>
                                                <ScheduleCard
                                                    item={item}
                                                    classNameLabel={item.class_id ? classNameMap.get(item.class_id) : undefined}
                                                    isOngoing={status === 'ongoing'}
                                                    isPast={status === 'past'}
                                                    onEdit={handleOpenEditModal}
                                                    onDuplicate={(item) => {
                                                        setFormData({ day: item.day, start_time: item.start_time, end_time: item.end_time, subject: `${item.subject} (Copy)`, class_id: item.class_id });
                                                        setModalState({ isOpen: true, mode: 'add', data: null });
                                                    }}
                                                    onDelete={handleDeleteClick}
                                                    getDuration={getDuration}
                                                    onIsiJurnal={handleIsiJurnal}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
                </>
                )}
            </div>

            <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} title={modalState.mode === 'add' ? 'Tambah Jadwal Baru' : 'Edit Jadwal'} icon={<CalendarIcon className="h-5 w-5" />}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <FormInputWrapper label="Hari" icon={CalendarIcon}>
                        <CustomDropdown
                            value={formData.day}
                            onChange={(val) => setFormData({ ...formData, day: val as ScheduleRow['day'] })}
                            options={daysOfWeek.map(d => ({ value: d, label: d }))}
                        />
                    </FormInputWrapper>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInputWrapper label="Waktu Mulai" icon={ClockIcon}><Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className={inputStyles} error={errors.start_time} /></FormInputWrapper>
                        <FormInputWrapper label="Waktu Selesai" icon={ClockIcon}><Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className={inputStyles} error={errors.end_time} /></FormInputWrapper>
                    </div>
                    <FormInputWrapper label="Mata Pelajaran" icon={BookOpenIcon}><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className={inputStyles} placeholder="cth. Matematika" error={errors.subject} /></FormInputWrapper>
                    <FormInputWrapper label="Kelas" icon={GraduationCapIcon}>
                        {isLoadingClasses ? (
                            <div className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" aria-label="Memuat kelas" />
                        ) : isClassesError ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/50 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                                <span>Gagal memuat kelas.</span>
                                <Button type="button" size="sm" variant="ghost" onClick={() => refetchClasses()}>Coba lagi</Button>
                            </div>
                        ) : accessibleClasses.length > 0 ? (
                            <CustomDropdown
                                value={formData.class_id ?? ''}
                                onChange={(val) => setFormData({ ...formData, class_id: val })}
                                options={accessibleClasses.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="Pilih Kelas"
                            />
                        ) : (
                            <p className="rounded-lg border border-amber-200 dark:border-amber-900/50 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                Belum ada kelas aktif. Tambahkan kelas terlebih dahulu sebelum membuat jadwal.
                            </p>
                        )}
                        {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id}</p>}
                    </FormInputWrapper>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={handleCloseModal} disabled={scheduleMutation.isPending}>Batal</Button>
                        <Button type="submit" disabled={scheduleMutation.isPending || isLoadingClasses || isClassesError || accessibleClasses.length === 0}>{scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isAnalysisModalOpen} onClose={() => setAnalysisModalOpen(false)} title="Analisis Jadwal AI" icon={<BrainCircuitIcon className="h-5 w-5" />}>
                {isAnalysisLoading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-slate-500">Menganalisis jadwal...</p>
                    </div>
                ) : analysisResult ? (
                    'error' in analysisResult ? (
                        <p className="text-red-400">{(analysisResult as { error: string }).error}</p>
                    ) : (
                        <div className="space-y-4">
                            {(analysisResult as { sections: { title: string; points: string[] }[] }).sections?.map((section, index) => (
                                <div key={index}>
                                    <h4 className="font-bold text-lg text-purple-300"><MarkdownText text={section.title} /></h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
                                        {section.points?.map((point, pIndex) => <li key={pIndex}><MarkdownText text={point} /></li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-8 text-sm text-slate-500">Tidak ada hasil analisis.</div>
                )}
            </Modal>

            <Modal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, data: null })} title="Konfirmasi Hapus">
                <p>Anda yakin ingin menghapus jadwal <strong className="text-white">"{confirmModalState.data?.subject}"</strong> pada hari <strong className="text-white">{confirmModalState.data?.day}</strong>?</p>
                <div className="flex justify-end gap-2 pt-4 mt-4">
                    <Button variant="ghost" onClick={() => setConfirmModalState({ isOpen: false, data: null })} disabled={deleteScheduleMutation.isPending}>Batal</Button>
                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteScheduleMutation.isPending}>{deleteScheduleMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default SchedulePage;
