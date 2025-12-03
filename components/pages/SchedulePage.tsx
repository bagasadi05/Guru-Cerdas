import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TrashIcon, PlusIcon, ClockIcon, PencilIcon, CalendarIcon, BookOpenIcon, GraduationCapIcon, BrainCircuitIcon, DownloadCloudIcon, BellIcon, MoreVerticalIcon, EditIcon, CopyIcon, UsersIcon, AlertCircleIcon } from '../Icons';
import { Modal } from '../ui/Modal';
import FloatingActionButton from '../ui/FloatingActionButton';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { Type } from '@google/genai';
import { supabase, ai } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as ics from 'ics';

const daysOfWeek: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ScheduleWithClassName = ScheduleRow & { className?: string };
type ScheduleMutationVars =
    | { mode: 'add'; data: Database['public']['Tables']['schedules']['Insert'] }
    | { mode: 'edit'; data: Database['public']['Tables']['schedules']['Update']; id: string };

const FormInputWrapper: React.FC<{ children: React.ReactNode; label: string; icon: React.FC<any> }> = ({ children, label, icon: Icon }) => (
    <div>
        <label className="block text-sm font-bold text-gray-200 mb-2">{label}</label>
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="h-5 w-5 text-gray-400" />
            </div>
            {children}
        </div>
    </div>
);

const NotificationPrompt: React.FC<{
    onEnable: () => Promise<void>;
    isLoading: boolean;
}> = ({ onEnable, isLoading }) => {
    return (
        <div className="relative z-10 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <BellIcon className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                    <h4 className="font-bold text-white">Jangan Lewatkan Jadwal</h4>
                    <p className="text-sm text-gray-300">Aktifkan notifikasi untuk mendapatkan pengingat 5 menit sebelum kelas dimulai.</p>
                </div>
            </div>
            <Button onClick={onEnable} disabled={isLoading} className="w-full sm:w-auto flex-shrink-0">
                {isLoading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
            </Button>
        </div>
    )
};

const SchedulePage: React.FC = () => {
    const { user, isNotificationsEnabled, enableScheduleNotifications } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; data: ScheduleRow | null }>({ isOpen: false, mode: 'add', data: null });
    const [formData, setFormData] = useState<Omit<Database['public']['Tables']['schedules']['Insert'], 'id' | 'created_at' | 'user_id'>>({ day: 'Senin', start_time: '08:00', end_time: '09:30', subject: '', class_id: '' });

    const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('id-ID', { weekday: 'long' }));

    // Ensure selectedDay is valid, fallback to Senin if not
    useEffect(() => {
        if (!daysOfWeek.includes(selectedDay as any)) {
            setSelectedDay('Senin');
        }
    }, []);

    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isAnalysisLoading, setAnalysisLoading] = useState(false);

    // Drag and drop state (simplified for list view if needed, or removed if not applicable)
    // For now, we'll keep it but it might need adjustment for the new layout
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
    const [conflictWarnings, setConflictWarnings] = useState<{ day: string; time: string; subjects: string[] }[]>([]);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; data: ScheduleRow | null }>({ isOpen: false, data: null });


    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timerId);
    }, []);

    // Helper to get day number (e.g., 25)
    const getDayNumber = (dayName: string) => {
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const targetDayIndex = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].indexOf(dayName);

        if (targetDayIndex === -1) return '';

        const diff = targetDayIndex - currentDayIndex;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        return targetDate.getDate();
    };

    const { data: schedule = [], isLoading: pageLoading, isError, error: queryError } = useQuery({
        queryKey: ['schedule', user?.id],
        queryFn: async (): Promise<ScheduleRow[]> => {
            const { data, error } = await supabase.from('schedules').select('*').eq('user_id', user!.id).order('day').order('start_time');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (isError) {
            toast.error(`Gagal memuat jadwal: ${(queryError as Error).message}`);
        }
    }, [isError, queryError, toast]);

    useEffect(() => {
        const conflicts: { day: string; time: string; subjects: string[] }[] = [];
        daysOfWeek.forEach(day => {
            const daySchedule = schedule.filter(s => s.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
            for (let i = 0; i < daySchedule.length - 1; i++) {
                const current = daySchedule[i];
                const next = daySchedule[i + 1];
                const currentEnd = current.end_time;
                const nextStart = next.start_time;
                if (currentEnd > nextStart) {
                    const existingConflict = conflicts.find(c => c.day === day && c.time === `${nextStart}-${currentEnd}`);
                    if (existingConflict) {
                        if (!existingConflict.subjects.includes(next.subject)) {
                            existingConflict.subjects.push(next.subject);
                        }
                    } else {
                        conflicts.push({ day, time: `${nextStart}-${currentEnd}`, subjects: [current.subject, next.subject] });
                    }
                }
            }
        });
        setConflictWarnings(conflicts);
    }, [schedule]);

    const scheduleMutation = useMutation({
        mutationFn: async (scheduleData: ScheduleMutationVars) => {
            if (scheduleData.mode === 'add') {
                const { error } = await supabase.from('schedules').insert(scheduleData.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('schedules').update(scheduleData.data).eq('id', scheduleData.id);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            toast.success("Jadwal berhasil disimpan!");
            handleCloseModal();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('schedules').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            toast.success("Jadwal berhasil dihapus.");
        },
        onError: (error: Error) => toast.error(error.message)
    });

    const handleOpenAddModal = () => {
        setFormData({ day: (selectedDay as any) || 'Senin', start_time: '08:00', end_time: '09:30', subject: '', class_id: '' });
        setModalState({ isOpen: true, mode: 'add', data: null });
    };
    const handleOpenEditModal = (item: ScheduleRow) => { setFormData({ day: item.day, start_time: item.start_time, end_time: item.end_time, subject: item.subject, class_id: item.class_id }); setModalState({ isOpen: true, mode: 'edit', data: item }); };
    const handleCloseModal = () => { if (scheduleMutation.isPending) return; setModalState({ isOpen: false, mode: 'add', data: null }); };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;

        if (modalState.mode === 'add') {
            scheduleMutation.mutate({ mode: 'add', data: { ...formData, user_id: user.id } });
        } else if (modalState.data) {
            scheduleMutation.mutate({ mode: 'edit', data: formData, id: modalState.data.id });
        }
    };

    const handleDeleteClick = (item: ScheduleRow) => {
        setConfirmModalState({ isOpen: true, data: item });
    };

    const handleConfirmDelete = () => {
        if (confirmModalState.data) {
            deleteScheduleMutation.mutate(confirmModalState.data.id);
        }
        setConfirmModalState({ isOpen: false, data: null });
    };

    const handleAnalyzeSchedule = async () => {
        setAnalysisModalOpen(true); setAnalysisLoading(true); setAnalysisResult(null);
        const systemInstruction = `Anda adalah seorang analis efisiensi jadwal. Tugas Anda adalah menemukan potensi masalah dan peluang optimasi dalam jadwal guru. Jawaban Anda harus dalam format JSON yang sesuai dengan skema yang diberikan. Format teks di dalam JSON harus menggunakan markdown (e.g., '**Teks Tebal**').`;
        const prompt = `Analisis data jadwal JSON berikut dan berikan wawasan. Fokus pada: 1. Konflik Jadwal: Identifikasi jika ada jadwal yang tumpang tindih. Jika tidak ada, sebutkan itu. 2. Hari Terpadat: Tentukan hari mana yang memiliki sesi pelajaran terbanyak dan paling sedikit. 3. Saran Optimasi: Berikan saran untuk mendistribusikan beban kerja secara lebih merata jika perlu. Judul saran (seperti 'Perataan Beban Kerja') harus ditebalkan. Data Jadwal: ${JSON.stringify(schedule)}`;
        const responseSchema = { type: Type.OBJECT, properties: { sections: { type: Type.ARRAY, description: "Array berisi bagian-bagian analisis: Konflik Jadwal, Hari Terpadat, dan Saran Optimasi.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Judul bagian, diformat dengan markdown untuk bold." }, points: { type: Type.ARRAY, description: "Daftar poin-poin untuk bagian ini.", items: { type: Type.STRING } } } } } } };

        try {
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema, } });
            setAnalysisResult(JSON.parse(response.text || '{}'));
        } catch (error) {
            console.error("Schedule Analysis Error:", error);
            setAnalysisResult({ error: "Gagal menganalisis jadwal. Silakan coba lagi." });
        } finally {
            setAnalysisLoading(false);
        }
    };

    const handleExportPdf = () => {
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada jadwal untuk diekspor.");
            return;
        }

        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 20;

        const dayHexColors: { [key in typeof daysOfWeek[number]]: string } = {
            Senin: '#3b82f6',  // blue-500
            Selasa: '#10b981', // emerald-500
            Rabu: '#f59e0b',   // amber-500
            Kamis: '#8b5cf6', // violet-500
            Jumat: '#f43f5e',   // rose-500
        };

        // PDF Header
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor('#111827');
        doc.text("Jadwal Mengajar Mingguan", pageW / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor('#6b7280');
        doc.text(`Laporan untuk: ${user?.name || 'Guru'}`, pageW / 2, y, { align: 'center' });
        y += 15;

        // PDF Body
        daysOfWeek.forEach(day => {
            const itemsForDay = schedule.filter(item => item.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (itemsForDay.length === 0) return;

            const mainColor = dayHexColors[day] || '#6b7280';

            if (y + 15 > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }

            // Day Header
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(mainColor);
            doc.text(day, margin, y);
            y += 2;
            doc.setDrawColor(mainColor);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageW - margin, y);
            y += 8;

            // Schedule Items
            itemsForDay.forEach(item => {
                const cardHeight = 25;
                if (y + cardHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }

                // Card background
                doc.setFillColor(248, 250, 252); // slate-50
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.setLineWidth(0.2);
                doc.roundedRect(margin, y, pageW - (margin * 2), cardHeight, 3, 3, 'FD');

                const cardContentX = margin + 5;
                let currentY = y + 8;

                // Subject
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59); // slate-800
                doc.text(item.subject, cardContentX, currentY);

                // Class and Time on the same line
                currentY += 8;
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139); // slate-500
                doc.text(`Kelas ${item.class_id}`, cardContentX, currentY);

                const timeText = `${item.start_time} - ${item.end_time}`;
                const timeTextWidth = doc.getTextWidth(timeText);
                doc.text(timeText, pageW - margin - 5 - timeTextWidth, currentY);

                y += cardHeight + 4;
            });
            y += 8;
        });

        // PDF Footer
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(`Dibuat pada ${new Date().toLocaleString('id-ID')}`, margin, doc.internal.pageSize.getHeight() - 10);

        doc.save('Jadwal_Mengajar.pdf');
        toast.success("Jadwal PDF berhasil diunduh!");
    };

    const handleExportToIcs = () => {
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada jadwal untuk diekspor.");
            return;
        }

        const dayToICalDay: Record<string, 'MO' | 'TU' | 'WE' | 'TH' | 'FR'> = {
            'Senin': 'MO',
            'Selasa': 'TU',
            'Rabu': 'WE',
            'Kamis': 'TH',
            'Jumat': 'FR',
        };
        const dayNameToIndex: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

        const events: ics.EventAttributes[] = schedule.map(item => {
            const [startHour, startMinute] = item.start_time.split(':').map(Number);
            const [endHour, endMinute] = item.end_time.split(':').map(Number);

            const now = new Date();
            const targetDayIndex = dayNameToIndex[item.day];
            const currentDayIndex = now.getDay();

            let dayDifference = targetDayIndex - currentDayIndex;
            if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)))) {
                dayDifference += 7;
            }

            const eventDate = new Date();
            eventDate.setDate(now.getDate() + dayDifference);

            const year = eventDate.getFullYear();
            const month = eventDate.getMonth() + 1;
            const day = eventDate.getDate();

            return {
                uid: `guru-pwa-${item.id}@myapp.com`,
                title: `${item.subject} (Kelas ${item.class_id})`,
                start: [year, month, day, startHour, startMinute],
                end: [year, month, day, endHour, endMinute],
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayToICalDay[item.day]}`,
                description: `Jadwal mengajar untuk kelas ${item.class_id}`,
                location: 'Sekolah',
                startOutputType: 'local',
                endOutputType: 'local',
                alarms: [
                    {
                        action: 'display',
                        description: 'Pengingat Kelas',
                        trigger: { minutes: 10, before: true },
                    }
                ]
            };
        });

        ics.createEvents(events, (error, value) => {
            if (error) {
                toast.error("Gagal membuat file kalender.");
                console.error(error);
                return;
            }
            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'jadwal_mengajar.ics';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("File kalender (.ics) berhasil diunduh!");
        });
    };

    // Helper to check status
    const getScheduleStatus = (item: ScheduleRow) => {
        const now = new Date();
        const currentDayName = now.toLocaleDateString('id-ID', { weekday: 'long' });

        if (item.day !== currentDayName) return 'upcoming'; // Or 'other-day'

        const [startHour, startMinute] = item.start_time.split(':').map(Number);
        const [endHour, endMinute] = item.end_time.split(':').map(Number);

        const startTime = new Date(now);
        startTime.setHours(startHour, startMinute, 0);

        const endTime = new Date(now);
        endTime.setHours(endHour, endMinute, 0);

        if (now >= startTime && now <= endTime) return 'ongoing';
        if (now > endTime) return 'past';
        return 'upcoming';
    };

    const getDuration = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
    };

    // Drag and Drop Handlers (Simplified for now, maybe re-implement for list reordering later)
    // Removed column-based drag and drop logic for now as we are switching to list view per day
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: ScheduleRow) => {
        // Implementation for reordering within the list could go here
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        // Cleanup
    };

    const handleEnableNotifications = async () => {
        setIsEnablingNotifications(true);
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada data jadwal untuk notifikasi.");
            setIsEnablingNotifications(false);
            return;
        }

        const { data: classes, error } = await supabase.from('classes').select('id, name').eq('user_id', user!.id);
        if (error) {
            toast.error("Gagal mengambil data kelas untuk notifikasi.");
            setIsEnablingNotifications(false);
            return;
        }

        const classMap = new Map<string, string>((classes || []).map(c => [c.id, c.name]));
        const scheduleWithClassNames: ScheduleWithClassName[] = schedule.map(item => ({
            ...item,
            className: classMap.get(item.class_id) || item.class_id
        }));

        const success = await enableScheduleNotifications(scheduleWithClassNames);
        if (success) {
            toast.success("Notifikasi jadwal berhasil diaktifkan!");
        }
        setIsEnablingNotifications(false);
    };

    if (pageLoading) return <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const inputStyles = "pl-10 bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:border-blue-500 dark:bg-white/10 dark:border-white/20 dark:placeholder:text-gray-400 dark:text-white dark:focus:bg-white/20 dark:focus:border-purple-400 rounded-xl";

    const currentDaySchedule = schedule.filter(s => s.day === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <div className="w-full min-h-full bg-[#0B1120] text-white pb-24 animate-fade-in-up">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Jadwal Pelajaran</h1>
                        <p className="mt-1 text-slate-400">
                            Kelola dan pantau jadwal mengajar Anda.
                        </p>
                    </div>
                    <div className="flex gap-2 self-end md:self-center">
                        <Button onClick={handleAnalyzeSchedule} variant="outline" size="sm" disabled={!isOnline || schedule.length === 0} className="rounded-lg border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"><BrainCircuitIcon className="w-4 h-4 mr-2 text-purple-400" />Analisis AI</Button>
                        <Button onClick={handleExportPdf} variant="outline" size="sm" className="rounded-lg border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"><DownloadCloudIcon className="w-4 h-4 mr-2" />PDF</Button>
                        <Button onClick={handleExportToIcs} variant="outline" size="sm" className="rounded-lg border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"><CalendarIcon className="w-4 h-4 mr-2" />ICS</Button>
                    </div>
                </header>

                {/* Day Selector */}
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex md:grid md:grid-cols-6 gap-2 min-w-max md:min-w-0">
                        {daysOfWeek.map((day) => {
                            const isToday = day === new Date().toLocaleDateString('id-ID', { weekday: 'long' });
                            const isSelected = selectedDay === day;

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`
                                        relative flex-1 min-w-[100px] md:min-w-0 p-4 rounded-xl transition-all duration-300
                                        flex flex-col items-center justify-center gap-1
                                        ${isSelected
                                            ? 'bg-[#4F46E5] text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }
                                    `}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{day}</span>
                                    <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-white'}`}>{getDayNumber(day)}</span>
                                    {isToday && <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!isNotificationsEnabled && <NotificationPrompt onEnable={handleEnableNotifications} isLoading={isEnablingNotifications} />}

                {conflictWarnings.length > 0 && (
                    <div className="bg-red-500/10 rounded-2xl border border-red-500/20 p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                            <AlertCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-200 mb-1">Konflik Jadwal Terdeteksi!</h4>
                                <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                                    {conflictWarnings.map((conflict, idx) => (
                                        <li key={idx}>
                                            <span className="font-semibold">{conflict.day}</span> ({conflict.time}): {conflict.subjects.join(' & ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <span className="bg-[#4F46E5] text-white px-3 py-1 rounded-lg text-sm font-medium">
                                {currentDaySchedule.length} Sesi
                            </span>
                            <span className="text-slate-600">|</span>
                            <span>{selectedDay}</span>
                        </h2>
                    </div>

                    {currentDaySchedule.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#0F172A] rounded-3xl border border-dashed border-slate-800">
                            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <CalendarIcon className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Hari Libur?</h3>
                            <p className="text-slate-400 max-w-xs mx-auto mb-6">
                                Belum ada jadwal pelajaran untuk hari {selectedDay}.
                            </p>
                            <Button onClick={() => handleOpenAddModal()} variant="outline" className="rounded-full border-slate-700 text-slate-300 hover:bg-slate-800">
                                <PlusIcon className="w-4 h-4 mr-2" /> Tambah Jadwal
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                            {currentDaySchedule.map((item, index) => {
                                const status = getScheduleStatus(item);
                                const isOngoing = status === 'ongoing';
                                const isPast = status === 'past';

                                return (
                                    <div
                                        key={item.id}
                                        className={`
                                            group relative overflow-hidden rounded-2xl transition-all duration-300
                                            bg-[#0F172A] border border-slate-800 hover:border-slate-700
                                            ${isOngoing ? 'ring-1 ring-indigo-500/50' : ''}
                                        `}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="p-5 flex flex-col h-full">
                                            {/* Top Row: Time & Checkbox */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium tracking-wide">{item.start_time} - {item.end_time}</span>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownTrigger className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                                                        <MoreVerticalIcon className="w-4 h-4" />
                                                    </DropdownTrigger>
                                                    <DropdownContent>
                                                        <DropdownItem icon={<EditIcon className="w-4 h-4" />} onClick={() => handleOpenEditModal(item)}>Edit</DropdownItem>
                                                        <DropdownItem icon={<CopyIcon className="w-4 h-4" />} onClick={() => {
                                                            const newItem = { ...item, id: undefined };
                                                            setFormData({ day: item.day, start_time: item.start_time, end_time: item.end_time, subject: `${item.subject} (Copy)`, class_id: item.class_id });
                                                            setModalState({ isOpen: true, mode: 'add', data: null });
                                                        }}>Duplikat</DropdownItem>
                                                        <DropdownItem icon={<TrashIcon className="w-4 h-4 text-red-500" />} onClick={() => handleDeleteClick(item)} className="text-red-400">Hapus</DropdownItem>
                                                    </DropdownContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Middle Row: Subject & Class */}
                                            <div className="mb-auto space-y-2">
                                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {item.subject}
                                                </h3>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <UsersIcon className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Kelas {item.class_id}</span>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Status & Duration */}
                                            <div className="mt-8 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isOngoing ? 'bg-green-500 animate-pulse' : isPast ? 'bg-slate-600' : 'bg-indigo-500'}`}></div>
                                                    <span className={`text-xs font-medium ${isOngoing ? 'text-green-400' : 'text-slate-500'}`}>
                                                        {isOngoing ? 'Sedang Berlangsung' : isPast ? 'Selesai' : 'Akan Datang'}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-slate-600">
                                                    {getDuration(item.start_time, item.end_time)} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <FloatingActionButton
                position="bottom-right"
                offset={{ bottom: 88, right: 16 }}
                size={64}
                onClick={() => handleOpenAddModal()}
                className="z-40 shadow-xl shadow-blue-500/20"
            >
                <div className="flex items-center gap-2">
                    <PlusIcon className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-base font-medium whitespace-nowrap">
                        Tambah Jadwal
                    </span>
                </div>
            </FloatingActionButton>

            <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} title={modalState.mode === 'add' ? 'Tambah Jadwal Baru' : 'Edit Jadwal'} icon={<CalendarIcon className="h-5 w-5" />}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <FormInputWrapper label="Hari" icon={CalendarIcon}>
                        <select value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value as ScheduleRow['day'] })} className={`w-full ${inputStyles}`}>{daysOfWeek.map(d => <option key={d} value={d} className="bg-gray-800">{d}</option>)}</select>
                    </FormInputWrapper>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInputWrapper label="Waktu Mulai" icon={ClockIcon}><Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className={inputStyles} required /></FormInputWrapper>
                        <FormInputWrapper label="Waktu Selesai" icon={ClockIcon}><Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className={inputStyles} required /></FormInputWrapper>
                    </div>
                    <FormInputWrapper label="Mata Pelajaran" icon={BookOpenIcon}><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className={inputStyles} required placeholder="cth. Matematika" /></FormInputWrapper>
                    <FormInputWrapper label="ID Kelas" icon={GraduationCapIcon}><Input value={formData.class_id} onChange={e => setFormData({ ...formData, class_id: e.target.value })} className={inputStyles} required placeholder="cth. 7A" /></FormInputWrapper>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={handleCloseModal} disabled={scheduleMutation.isPending}>Batal</Button><Button type="submit" disabled={scheduleMutation.isPending}>{scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button></div>
                </form>
            </Modal>
            <Modal isOpen={isAnalysisModalOpen} onClose={() => setAnalysisModalOpen(false)} title="Analisis Jadwal AI" icon={<BrainCircuitIcon className="h-5 w-5" />}>
                {isAnalysisLoading ? <div className="text-center py-8">Menganalisis jadwal...</div> : analysisResult ? (
                    analysisResult.error ? <p className="text-red-400">{analysisResult.error}</p> : (
                        <div className="space-y-4">
                            {analysisResult.sections?.map((section: any, index: number) => (
                                <div key={index}>
                                    <h4 className="font-bold text-lg text-purple-300" dangerouslySetInnerHTML={{ __html: section.title }}></h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
                                        {section.points?.map((point: string, pIndex: number) => <li key={pIndex}>{point}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )
                ) : <div className="text-center py-8">Tidak ada hasil analisis.</div>}
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