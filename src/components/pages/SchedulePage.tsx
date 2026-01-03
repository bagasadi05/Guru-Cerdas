import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '../../utils/animations';
import { triggerSubtleConfetti } from '../../utils/confetti';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TrashIcon, PlusIcon, ClockIcon, CalendarIcon, BookOpenIcon, GraduationCapIcon, BrainCircuitIcon, DownloadCloudIcon, BellIcon, MoreVerticalIcon, EditIcon, CopyIcon, UsersIcon, AlertCircleIcon } from '../Icons';
import { Modal } from '../ui/Modal';
import FloatingActionButton from '../ui/FloatingActionButton';
import { MarkdownText } from '../ui/MarkdownText';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
// import { Type } from '@google/genai';
// import { ai } from '../../services/supabase';
import { generateOpenRouterJson } from '../../services/openRouterService';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as ics from 'ics';
import { ValidationService } from '../../services/ValidationService';
import { ValidationRules } from '../../types';
import { SchedulePageSkeleton } from '../skeletons/PageSkeletons';
import { addPdfHeader, ensureLogosLoaded } from '../../utils/pdfHeaderUtils';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { LayoutGridIcon, ListIcon } from '../Icons';

const scheduleRules: ValidationRules = {
    subject: [ValidationService.validators.required("Mata pelajaran harus diisi")],
    class_id: [ValidationService.validators.required("Kelas harus diisi")],
    start_time: [ValidationService.validators.required("Waktu mulai harus diisi")],
    end_time: [ValidationService.validators.required("Waktu selesai harus diisi")]
};


const daysOfWeek: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ScheduleWithClassName = ScheduleRow & { className?: string };
type ScheduleMutationVars =
    | { mode: 'add'; data: Database['public']['Tables']['schedules']['Insert'] }
    | { mode: 'edit'; data: Database['public']['Tables']['schedules']['Update']; id: string };



const FormInputWrapper: React.FC<{ children: React.ReactNode; label: string; icon: React.FC<{ className?: string }> }> = ({ children, label, icon: Icon }) => (
    <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-2">{label}</label>
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="h-5 w-5 text-slate-400 dark:text-gray-400" />
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
        <div className="relative z-10 bg-green-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-green-200 dark:border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <BellIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Jangan Lewatkan Jadwal</h4>
                    <p className="text-sm text-slate-600 dark:text-gray-300">Aktifkan notifikasi untuk mendapatkan pengingat 5 menit sebelum kelas dimulai.</p>
                </div>
            </div>
            <Button onClick={onEnable} disabled={isLoading} className="w-full sm:w-auto flex-shrink-0 bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20">
                {isLoading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
            </Button>
        </div>
    )
};

interface ScheduleCardProps {
    item: ScheduleRow;
    isOngoing: boolean;
    isPast: boolean;
    onEdit: (item: ScheduleRow) => void;
    onDuplicate: (item: ScheduleRow) => void;
    onDelete: (item: ScheduleRow) => void;
    getDuration: (start: string, end: string) => number;
}


const getColorForSubject = (subject: string): string => {
    if (!subject) return 'border-l-slate-400';
    const colors = [
        'border-l-blue-500',
        'border-l-green-500',
        'border-l-purple-500',
        'border-l-amber-500',
        'border-l-rose-500',
        'border-l-cyan-500',
        'border-l-indigo-500',
        'border-l-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const ScheduleCard: React.FC<ScheduleCardProps> = ({ item, isOngoing, isPast, onEdit, onDuplicate, onDelete, getDuration }) => {
    const colorClass = useMemo(() => getColorForSubject(item.subject), [item.subject]);

    return (
        <div
            className={`
            group relative overflow-hidden rounded-2xl transition-all duration-300
            bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md
            ${isOngoing ? 'ring-1 ring-green-500/50' : ''}
            flex flex-col border-l-4 ${colorClass}
        `}
        >
            <div className="p-4 flex flex-col h-full gap-4">
                {/* Top Row: Time & Checkbox */}
                <div className="flex justify-between items-start">
                    <div className="schedule-time-badge flex items-center gap-2">
                        <ClockIcon className="w-3 h-3" />
                        <span className="text-[10px] sm:text-xs font-semibold tracking-wide">{item.start_time} - {item.end_time}</span>
                    </div>

                    <DropdownMenu>
                        <DropdownTrigger className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors">
                            <MoreVerticalIcon className="w-3.5 h-3.5" />
                        </DropdownTrigger>
                        <DropdownContent>
                            <DropdownItem icon={<EditIcon className="w-4 h-4" />} onClick={() => onEdit(item)}>Edit</DropdownItem>
                            <DropdownItem icon={<CopyIcon className="w-4 h-4" />} onClick={() => onDuplicate(item)}>Duplikat</DropdownItem>
                            <DropdownItem icon={<TrashIcon className="w-4 h-4 text-red-500" />} onClick={() => onDelete(item)} className="text-red-400">Hapus</DropdownItem>
                        </DropdownContent>
                    </DropdownMenu>
                </div>

                {/* Middle Row: Subject & Class */}
                <div className="mb-auto space-y-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                        {item.subject}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <UsersIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Kelas {item.class_id}</span>
                    </div>
                </div>

                {/* Bottom Row: Status & Duration */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOngoing ? 'bg-green-500 animate-pulse' : isPast ? 'bg-slate-400 dark:bg-slate-600' : 'bg-emerald-500'}`}></div>
                        <span className={`text-[10px] font-medium ${isOngoing ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isOngoing ? 'Berlangsung' : isPast ? 'Selesai' : 'Nanti'}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
                        {getDuration(item.start_time, item.end_time)}m
                    </span>
                </div>
            </div>
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
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
    const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('id-ID', { weekday: 'long' }));

    // Ensure selectedDay is valid, fallback to Senin if not
    useEffect(() => {
        if (!daysOfWeek.includes(selectedDay)) {
            setSelectedDay('Senin');
        }
    }, [selectedDay]);

    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ sections: { title: string; points: string[] }[] } | { error: string } | null>(null);
    const [isAnalysisLoading, setAnalysisLoading] = useState(false);

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

    const { data: rawSchedule, isLoading: pageLoading, isError, error: queryError } = useQuery({
        queryKey: ['schedule', user?.id],
        queryFn: async (): Promise<ScheduleRow[]> => {
            const { data, error } = await supabase.from('schedules').select('*').eq('user_id', user!.id).order('day').order('start_time');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('*').eq('user_id', user!.id).order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const schedule = useMemo(() => rawSchedule || [], [rawSchedule]);

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
            // Trigger celebration!
            setTimeout(() => triggerSubtleConfetti(), 300);
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

    const handleOpenAddModal = (day?: string) => {
        setFormData({ day: (day || selectedDay) as any || 'Senin', start_time: '08:00', end_time: '09:30', subject: '', class_id: '' });
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
            subject: formData.subject,
            class_id: formData.class_id,
            start_time: formData.start_time,
            end_time: formData.end_time
        }, scheduleRules);

        if (!validationResult.isValid) {
            setErrors(validationResult.errors);
            return;
        }
        setErrors({});

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
        const systemInstruction = `Anda adalah seorang analis efisiensi jadwal. Tugas Anda adalah menemukan potensi masalah dan peluang optimasi dalam jadwal guru. Jawaban Anda harus dalam format JSON yang valid.
        
        Format JSON yang diharapkan:
        {
          "sections": [
            {
              "title": "Judul Bagian (e.g., **Konflik Jadwal**)",
              "points": ["Poin 1", "Poin 2"]
            }
          ]
        }
        
        Format teks di dalam JSON harus menggunakan markdown (e.g., '**Teks Tebal**').`;
        const prompt = `Analisis data jadwal JSON berikut dan berikan wawasan. Fokus pada: 1. Konflik Jadwal: Identifikasi jika ada jadwal yang tumpang tindih. Jika tidak ada, sebutkan itu. 2. Hari Terpadat: Tentukan hari mana yang memiliki sesi pelajaran terbanyak dan paling sedikit. 3. Saran Optimasi: Berikan saran untuk mendistribusikan beban kerja secara lebih merata jika perlu. Judul saran (seperti 'Perataan Beban Kerja') harus ditebalkan. Data Jadwal: ${JSON.stringify(schedule)}`;
        // const responseSchema = { type: Type.OBJECT, properties: { sections: { type: Type.ARRAY, description: "Array berisi bagian-bagian analisis: Konflik Jadwal, Hari Terpadat, dan Saran Optimasi.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Judul bagian, diformat dengan markdown untuk bold." }, points: { type: Type.ARRAY, description: "Daftar poin-poin untuk bagian ini.", items: { type: Type.STRING } } } } } } };

        try {
            const result = await generateOpenRouterJson<{ sections: { title: string; points: string[] }[] }>(prompt, systemInstruction);
            setAnalysisResult(result);
        } catch (error) {
            console.error("Schedule Analysis Error:", error);
            setAnalysisResult({ error: "Gagal menganalisis jadwal. Silakan coba lagi." });
        } finally {
            setAnalysisLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada jadwal untuk diekspor.");
            return;
        }

        // Ensure logos are loaded
        await ensureLogosLoaded();

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const colGap = 10;
        const colWidth = (pageWidth - (margin * 2) - colGap) / 2;

        // Colors
        // Colors
        const colors = {
            primary: [16, 185, 129], // Emerald 500 (approx)
            text: [31, 41, 55],    // Gray 800
            secondaryText: [107, 114, 128], // Gray 500
            lightBg: [249, 250, 251], // Gray 50
            border: [229, 231, 235], // Gray 200
        };

        const dayHexColors: { [key in typeof daysOfWeek[number]]: string } = {
            Senin: '#3b82f6',  // blue-500
            Selasa: '#10b981', // emerald-500
            Rabu: '#f59e0b',   // amber-500
            Kamis: '#8b5cf6',  // violet-500
            Jumat: '#f43f5e',  // rose-500
            Sabtu: '#6366f1',  // indigo-500
        };

        // --- DRAW HEADER ---
        const drawHeader = () => {
            // Add header with logos
            const headerY = addPdfHeader(doc, { orientation: 'portrait' });

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.text("Jadwal Mengajar", pageWidth / 2, headerY, { align: 'center' });

            // Guru Info
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
            const teacherName = user?.name || 'Guru';
            doc.text(`Guru: ${teacherName}`, margin, headerY + 8);
            doc.text(`Tahun Ajaran: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, pageWidth - margin, headerY + 8, { align: 'right' });

            return headerY + 15;
        };

        const startY = drawHeader();
        let yLeft = startY;
        let yRight = startY;

        // --- DRAW SCHEDULE CARDS ---

        daysOfWeek.forEach((day) => {
            const itemsForDay = schedule.filter(item => item.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (itemsForDay.length === 0) return;

            // Determine column (Zig-zag fill: Left, Right, Left, Right or filling shortest column)
            // Simple approach: alternating columns
            // Better approach for masonry: add to the column with smaller Y
            const isLeft = yLeft <= yRight;
            const currentX = isLeft ? margin : margin + colWidth + colGap;
            let currentY = isLeft ? yLeft : yRight;

            // Calculate Card Height estimation
            const headerHeight = 12;
            const itemHeight = 18;
            const cardHeight = headerHeight + (itemsForDay.length * itemHeight) + 5; // +padding

            // Check page break
            if (currentY + cardHeight > pageHeight - margin) {
                doc.addPage();
                drawHeader();
                yLeft = 45;
                yRight = 45;
                currentY = 45;
                // If adding page, reset both columns, but we must decide where to put this card.
                // It goes to Left column on new page.
                if (!isLeft) {
                    // If we were supposed to be on right but right is full (and left confusingly full too implied), 
                    // simple reset puts it on left.
                }
            }

            // Draw Card Container
            // Header Background
            const dayColor = dayHexColors[day] || '#6b7280';
            doc.setFillColor(dayColor);
            doc.setDrawColor(dayColor);
            doc.roundedRect(currentX, currentY, colWidth, headerHeight, 2, 2, 'F');
            // Fix bottom corners of header to be square
            doc.rect(currentX, currentY + headerHeight - 2, colWidth, 2, 'F');

            // Text Header
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(day.toUpperCase(), currentX + 4, currentY + 8);

            // Container Body Border
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.setLineWidth(0.2);
            doc.setFillColor(255, 255, 255);
            // Draw body box
            doc.rect(currentX, currentY + headerHeight, colWidth, cardHeight - headerHeight, 'S'); // 'S' for stroke only

            // Draw Items
            let itemY = currentY + headerHeight + 6;
            itemsForDay.forEach((item, idx) => {
                // Time
                doc.setFont("courier", "bold");
                doc.setFontSize(9);
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.text(`${item.start_time} - ${item.end_time}`, currentX + 4, itemY);

                // Subject
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                const subject = item.subject.length > 25 ? item.subject.substring(0, 23) + '...' : item.subject;
                doc.text(subject, currentX + 4, itemY + 5);

                // Class Badge (simulated)
                const classText = `Kelas ${item.class_id}`;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
                doc.text(classText, currentX + 4, itemY + 9);

                // Divider line if not last item
                if (idx < itemsForDay.length - 1) {
                    doc.setDrawColor(243, 244, 246); // Very light gray
                    doc.line(currentX + 4, itemY + 12, currentX + colWidth - 4, itemY + 12);
                }

                itemY += itemHeight;
            });

            // Update Y tracking
            const usedHeight = cardHeight + 8; // + spacing between cards
            if (isLeft) yLeft += usedHeight;
            else yRight += usedHeight;
        });

        // Loop Page Numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Hal ${i} dari ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(`Portal Guru App`, margin, pageHeight - 10);
        }

        doc.save('Jadwal_Mengajar.pdf');
        toast.success("Jadwal PDF (Format Baru) berhasil diunduh!");
    };

    const handleExportToIcs = () => {
        if (!schedule || schedule.length === 0) {
            toast.warning("Tidak ada jadwal untuk diekspor.");
            return;
        }

        const dayToICalDay: Record<string, 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'> = {
            'Senin': 'MO',
            'Selasa': 'TU',
            'Rabu': 'WE',
            'Kamis': 'TH',
            'Jumat': 'FR',
            'Sabtu': 'SA',
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
    const getScheduleStatus = (item: ScheduleRow, now: Date) => {
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

    if (pageLoading) return <SchedulePageSkeleton />;
    const inputStyles = "pl-10 bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:border-blue-500 dark:bg-white/10 dark:border-white/20 dark:placeholder:text-gray-400 dark:text-white dark:focus:bg-white/20 dark:focus:border-purple-400 rounded-xl";

    const currentDaySchedule = schedule.filter(s => s.day === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <div className="w-full min-h-full bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-white pb-24 animate-fade-in-up">
            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white font-serif">Jadwal Mengajar</h1>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                            Kelola dan pantau jadwal mengajar Anda.
                        </p>
                    </div>
                    <div className="flex gap-2 self-end md:self-center">
                        <Button onClick={handleAnalyzeSchedule} variant="outline" size="sm" disabled={!isOnline || schedule.length === 0} className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"><BrainCircuitIcon className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400" />Analisis AI</Button>
                        <Button onClick={handleExportPdf} variant="outline" size="sm" className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"><DownloadCloudIcon className="w-4 h-4 mr-2" />PDF</Button>
                        <Button onClick={handleExportToIcs} variant="outline" size="sm" className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"><CalendarIcon className="w-4 h-4 mr-2" />ICS</Button>
                    </div>
                </header>

                {!isNotificationsEnabled && <NotificationPrompt onEnable={handleEnableNotifications} isLoading={isEnablingNotifications} />}

                {conflictWarnings.length > 0 && (
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
                )}

                {/* Day Selector & List (Visible on all screens) */}
                <div className="space-y-6">
                    <div className="grid grid-cols-6 gap-3">
                        {daysOfWeek.map((day) => {
                            const isToday = day === new Date().toLocaleDateString('id-ID', { weekday: 'long' });
                            const isSelected = selectedDay === day;

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`
                                        relative p-4 rounded-2xl transition-all duration-300
                                        flex flex-col items-center justify-center gap-1.5
                                        ${isSelected
                                            ? 'bg-[#10B981] text-white shadow-lg shadow-green-500/30 scale-[1.02]'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50'
                                        }
                                    `}
                                >
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-green-100' : 'text-slate-400 dark:text-slate-500'}`}>{day.substring(0, 3)}</span>
                                    <span className="text-2xl font-bold">{getDayNumber(day)}</span>
                                    {isToday && <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            <span className="bg-[#10B981] text-white px-3 py-1 rounded-lg text-sm font-medium">
                                {viewMode === 'daily' ? `${currentDaySchedule.length} Sesi` : 'Mingguan'}
                            </span>
                            <span className="text-slate-400 dark:text-slate-600">|</span>
                            <span>{viewMode === 'daily' ? selectedDay : 'Ringkasan Minggu Ini'}</span>
                        </h2>

                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white dark:bg-slate-700 shadow text-green-600 dark:text-green-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Tampilan Harian"
                            >
                                <ListIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'weekly' ? 'bg-white dark:bg-slate-700 shadow text-green-600 dark:text-green-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Tampilan Mingguan"
                            >
                                <LayoutGridIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {viewMode === 'weekly' ? (
                        <WeeklyScheduleView schedule={schedule} onEdit={handleOpenEditModal} />
                    ) : (
                        <>
                            {currentDaySchedule.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#0F172A] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                        <CalendarIcon className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Kosong</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-4">
                                        Tidak ada jadwal untuk hari ini.
                                    </p>
                                    <Button onClick={() => handleOpenAddModal()} variant="outline" size="sm" className="rounded-full border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <PlusIcon className="w-3.5 h-3.5 mr-2" /> Tambah
                                    </Button>
                                </div>
                            ) : (
                                <motion.div
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                                    variants={staggerContainerVariants}
                                    initial="initial"
                                    animate="animate"
                                >
                                    {currentDaySchedule.map((item, index) => {
                                        const status = getScheduleStatus(item, currentTime);
                                        return (
                                            <motion.div
                                                key={item.id}
                                                variants={staggerItemVariants}
                                                custom={index}
                                            >
                                                <ScheduleCard
                                                    item={item}
                                                    isOngoing={status === 'ongoing'}
                                                    isPast={status === 'past'}
                                                    onEdit={handleOpenEditModal}
                                                    onDuplicate={(item) => {
                                                        setFormData({ day: item.day, start_time: item.start_time, end_time: item.end_time, subject: `${item.subject} (Copy)`, class_id: item.class_id });
                                                        setModalState({ isOpen: true, mode: 'add', data: null });
                                                    }}
                                                    onDelete={handleDeleteClick}
                                                    getDuration={getDuration}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <FloatingActionButton
                position="bottom-right"
                offset={{ bottom: 88, right: 16 }}
                size={64}
                onClick={() => handleOpenAddModal()}
                className="z-40 shadow-xl shadow-blue-500/20 lg:hidden"
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
                        <select value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value as ScheduleRow['day'] })} className={`w-full ${inputStyles}`}>{daysOfWeek.map(d => <option key={d} value={d} className="dark:bg-gray-800">{d}</option>)}</select>
                    </FormInputWrapper>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInputWrapper label="Waktu Mulai" icon={ClockIcon}><Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className={inputStyles} error={errors.start_time} /></FormInputWrapper>
                        <FormInputWrapper label="Waktu Selesai" icon={ClockIcon}><Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className={inputStyles} error={errors.end_time} /></FormInputWrapper>
                    </div>
                    <FormInputWrapper label="Mata Pelajaran" icon={BookOpenIcon}><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className={inputStyles} placeholder="cth. Matematika" error={errors.subject} /></FormInputWrapper>
                    <FormInputWrapper label="Kelas" icon={GraduationCapIcon}>
                        {classes && classes.length > 0 ? (
                            <select
                                value={formData.class_id}
                                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                                className={`w-full ${inputStyles}`}
                            >
                                <option value="" disabled>Pilih Kelas</option>
                                {classes.map(c => <option key={c.id} value={c.name} className="dark:bg-gray-800">{c.name}</option>)}
                            </select>
                        ) : (
                            <Input value={formData.class_id} onChange={e => setFormData({ ...formData, class_id: e.target.value })} className={inputStyles} placeholder="cth. 7A" error={errors.class_id} />
                        )}
                        {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id}</p>}
                    </FormInputWrapper>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={handleCloseModal} disabled={scheduleMutation.isPending}>Batal</Button><Button type="submit" disabled={scheduleMutation.isPending}>{scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button></div>
                </form>
            </Modal>
            <Modal isOpen={isAnalysisModalOpen} onClose={() => setAnalysisModalOpen(false)} title="Analisis Jadwal AI" icon={<BrainCircuitIcon className="h-5 w-5" />}>
                {isAnalysisLoading ? <div className="text-center py-8">Menganalisis jadwal...</div> : analysisResult ? (
                    'error' in analysisResult ? <p className="text-red-400">{(analysisResult as { error: string }).error}</p> : (
                        <div className="space-y-4">
                            {(analysisResult as { sections: { title: string; points: string[] }[] }).sections?.map((section: { title: string; points: string[] }, index: number) => (
                                <div key={index}>
                                    <h4 className="font-bold text-lg text-purple-300">
                                        <MarkdownText text={section.title} />
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
                                        {section.points?.map((point: string, pIndex: number) => <li key={pIndex}><MarkdownText text={point} /></li>)}
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
