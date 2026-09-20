import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useSemester } from '../../contexts/SemesterContext';
import { softDelete } from '../../services/SoftDeleteService';
import { exportPhScheduleIcs } from '../../services/scheduleExportService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CustomDropdown } from '../ui/CustomDropdown';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import {
    CalendarIcon,
    ClockIcon,
    UsersIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    CopyIcon,
    MoreVerticalIcon,
    ClipboardPenIcon,
    SearchIcon,
    AlertTriangleIcon,
    Share2Icon,
    PrinterIcon,
    CheckCircleIcon,
    XIcon,
} from '../Icons';
import { getColorForSubject } from '../../utils/scheduleUtils';
import type { PhScheduleRow, ClassRow } from '../../types';

export interface PhScheduleTabProps {
    externalOpenAdd?: boolean;
    onResetExternalOpenAdd?: () => void;
    externalTriggerWa?: boolean;
    onResetExternalTriggerWa?: () => void;
    externalTriggerPrint?: boolean;
    onResetExternalTriggerPrint?: () => void;
    externalTriggerIcs?: boolean;
    onResetExternalTriggerIcs?: () => void;
    selectedClassId?: string;
    onSelectClassId?: (classId: string) => void;
    onCanManageChange?: (canManage: boolean) => void;
}

const COMMON_SUBJECT_SUGGESTIONS = [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA',
    'IPS',
    'PAI',
    'PPKn',
    'PJOK',
    'Informatika',
    'Seni Budaya',
    'Bahasa Arab',
];

const PERIOD_PRESETS = ['1-2', '3-4', '5-6', '7-8'];

export const PhScheduleTab: React.FC<PhScheduleTabProps> = ({
    externalOpenAdd,
    onResetExternalOpenAdd,
    externalTriggerWa,
    onResetExternalTriggerWa,
    externalTriggerPrint,
    onResetExternalTriggerPrint,
    externalTriggerIcs,
    onResetExternalTriggerIcs,
    selectedClassId: externalSelectedClassId,
    onSelectClassId,
    onCanManageChange,
}) => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { activeSemester, semesters } = useSemester();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [internalSelectedClassId, setInternalSelectedClassId] = useState<string>('');
    const effectiveClassId = externalSelectedClassId || internalSelectedClassId;

    const handleSelectClass = useCallback((id: string) => {
        setInternalSelectedClassId(id);
        onSelectClassId?.(id);
    }, [onSelectClassId]);

    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'today' | 'past'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PhScheduleRow | null>(null);
    const [formData, setFormData] = useState({ subject: '', date: '', period_label: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<PhScheduleRow | null>(null);

    // Share WA Dialog & Print Modal
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const printSheetRef = useRef<HTMLDivElement>(null);

    // Semesters with academic year label
    const semesterOptions = useMemo(() => {
        return (semesters || []).map(s => {
            const academicYear = s.academic_years;
            const yearName = Array.isArray(academicYear) ? academicYear[0]?.name : academicYear?.name;
            return {
                value: s.id,
                label: [s.name, yearName].filter(Boolean).join(' — '),
            };
        });
    }, [semesters]);

    // Auto-select active semester when loaded
    useEffect(() => {
        if (!selectedSemesterId) {
            if (activeSemester?.id) {
                setSelectedSemesterId(activeSemester.id);
            } else if (semesters && semesters.length > 0) {
                setSelectedSemesterId(semesters[0].id);
            }
        }
    }, [activeSemester, semesters, selectedSemesterId]);

    // Classes
    const { data: classes = [], isLoading: isLoadingClasses } = useQuery<ClassRow[]>({
        queryKey: ['classes', 'ph-schedule-tab'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .is('deleted_at', null)
                .eq('is_archived', false)
                .order('name');
            if (error) throw error;
            return (data || []) as unknown as ClassRow[];
        },
        enabled: !!user,
    });

    // Auto-select first class once classes load if none selected
    useEffect(() => {
        if (!effectiveClassId && classes.length > 0) {
            handleSelectClass(classes[0].id);
        }
    }, [classes, effectiveClassId, handleSelectClass]);

    // Teacher assignments for walas & subject teacher check
    const { data: assignments = [] } = useQuery({
        queryKey: ['teacher-assignments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('class_id, assignment_role')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Class schedules to dynamically provide subject suggestions
    const { data: classSchedules = [] } = useQuery({
        queryKey: ['class-subjects-ph', effectiveClassId],
        queryFn: async () => {
            if (!effectiveClassId) return [];
            const { data, error } = await supabase
                .from('schedules')
                .select('subject')
                .eq('class_id', effectiveClassId)
                .is('deleted_at', null);
            if (error) return [];
            return data || [];
        },
        enabled: !!effectiveClassId,
    });

    const subjectSuggestions = useMemo(() => {
        const set = new Set<string>();
        classSchedules.forEach(s => {
            if (s.subject && s.subject.trim()) set.add(s.subject.trim());
        });
        COMMON_SUBJECT_SUGGESTIONS.forEach(s => set.add(s));
        return Array.from(set);
    }, [classSchedules]);

    // Owner check: Teachers who created the class, are walas/subject teacher, or admin can manage PH
    const isClassOwner = useMemo(() => {
        const cls = classes.find(c => c.id === effectiveClassId);
        return cls ? cls.user_id === user?.id : false;
    }, [classes, effectiveClassId, user?.id]);

    const isWalasForClass = useCallback(
        (classId: string) =>
            isAdmin ||
            isClassOwner ||
            assignments.some(
                a =>
                    a.class_id === classId &&
                    (a.assignment_role === 'homeroom' || a.assignment_role === 'subject_teacher')
            ),
        [isAdmin, isClassOwner, assignments]
    );

    const canManage = effectiveClassId ? isWalasForClass(effectiveClassId) : false;

    useEffect(() => {
        onCanManageChange?.(canManage);
    }, [canManage, onCanManageChange]);

    // PH Schedules query
    const { data: rawSchedules = [], isLoading: isLoadingSchedules } = useQuery<PhScheduleRow[]>({
        queryKey: ['ph-schedules', effectiveClassId, selectedSemesterId],
        queryFn: async () => {
            if (!effectiveClassId || !selectedSemesterId) return [];
            const { data, error } = await supabase
                .from('ph_schedules')
                .select('*')
                .eq('class_id', effectiveClassId)
                .eq('semester_id', selectedSemesterId)
                .is('deleted_at', null)
                .order('date', { ascending: true })
                .order('period_label', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!effectiveClassId && !!selectedSemesterId,
    });

    // Today in local YYYY-MM-DD
    const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE'), []);

    const getItemStatus = useCallback((dateStr: string): 'today' | 'upcoming' | 'past' => {
        if (dateStr === todayStr) return 'today';
        if (dateStr > todayStr) return 'upcoming';
        return 'past';
    }, [todayStr]);

    // Relative Date Label (e.g. "Hari Ini", "Besok", "3 hari lagi")
    const getRelativeDateLabel = useCallback((dateStr: string): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(`${dateStr}T00:00:00`);
        target.setHours(0, 0, 0, 0);
        const diffMs = target.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hari Ini';
        if (diffDays === 1) return 'Besok';
        if (diffDays === 2) return 'Lusa';
        if (diffDays > 2 && diffDays <= 7) return `${diffDays} hari lagi`;
        if (diffDays > 7 && diffDays <= 30) {
            const weeks = Math.round(diffDays / 7);
            return `${weeks} pekan lagi`;
        }
        if (diffDays === -1) return 'Kemarin';
        if (diffDays < -1) return `${Math.abs(diffDays)} hari lalu`;
        return '';
    }, []);

    // Available months in rawSchedules for quick month filtering
    const availableMonths = useMemo(() => {
        const map = new Map<string, string>();
        rawSchedules.forEach(s => {
            if (!s.date) return;
            const parts = s.date.split('-');
            if (parts.length < 2) return;
            const [y, m] = parts;
            const key = `${y}-${m}`;
            if (!map.has(key)) {
                try {
                    const d = new Date(Number(y), Number(m) - 1, 1);
                    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    map.set(key, label);
                } catch {
                    map.set(key, key);
                }
            }
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [rawSchedules]);

    // Filter & sort schedules
    const filteredSchedules = useMemo(() => {
        const filtered = rawSchedules.filter(item => {
            const matchesSearch = !searchQuery.trim() ||
                item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.period_label.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter !== 'all' && getItemStatus(item.date) !== statusFilter) {
                return false;
            }

            if (selectedMonth !== 'all' && !item.date.startsWith(selectedMonth)) {
                return false;
            }

            return true;
        });

        return [...filtered].sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
            return a.period_label.localeCompare(b.period_label);
        });
    }, [rawSchedules, searchQuery, statusFilter, selectedMonth, getItemStatus, sortOrder]);

    // Group by date
    const groupedByDate = useMemo(() => {
        const map = new Map<string, PhScheduleRow[]>();
        filteredSchedules.forEach(s => {
            const existing = map.get(s.date) || [];
            existing.push(s);
            map.set(s.date, existing);
        });
        return map;
    }, [filteredSchedules]);

    // Counts for status pills
    const statusCounts = useMemo(() => {
        let upcoming = 0;
        let today = 0;
        let past = 0;
        rawSchedules.forEach(s => {
            const st = getItemStatus(s.date);
            if (st === 'upcoming') upcoming++;
            else if (st === 'today') today++;
            else if (st === 'past') past++;
        });
        return { all: rawSchedules.length, upcoming, today, past };
    }, [rawSchedules, getItemStatus]);

    // Next upcoming PH
    const nextUpcomingPh = useMemo(() => {
        const upcoming = rawSchedules.filter(s => getItemStatus(s.date) !== 'past');
        return upcoming.length > 0 ? upcoming[0] : null;
    }, [rawSchedules, getItemStatus]);

    // Selected class name & semester name
    const currentClassName = useMemo(() => {
        return classes.find(c => c.id === effectiveClassId)?.name || 'Kelas';
    }, [classes, effectiveClassId]);

    const currentSemesterName = useMemo(() => {
        return semesterOptions.find(s => s.value === selectedSemesterId)?.label || 'Semester';
    }, [semesterOptions, selectedSemesterId]);

    // Conflict & Heavy Day Detection
    const scheduleAnomalies = useMemo(() => {
        const periodMap = new Map<string, PhScheduleRow[]>();
        const dayCountMap = new Map<string, number>();

        rawSchedules.forEach(s => {
            const key = `${s.date}___${s.period_label.trim().toLowerCase()}`;
            const existing = periodMap.get(key) || [];
            existing.push(s);
            periodMap.set(key, existing);

            dayCountMap.set(s.date, (dayCountMap.get(s.date) || 0) + 1);
        });

        const conflicts: { date: string; period: string; subjects: string[] }[] = [];
        periodMap.forEach((items, key) => {
            if (items.length > 1) {
                const [date, period] = key.split('___');
                conflicts.push({
                    date,
                    period,
                    subjects: items.map(i => i.subject),
                });
            }
        });

        const heavyDays: { date: string; count: number }[] = [];
        dayCountMap.forEach((count, date) => {
            if (count >= 3) {
                heavyDays.push({ date, count });
            }
        });

        return { conflicts, heavyDays };
    }, [rawSchedules]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: { class_id: string; semester_id: string; subject: string; date: string; period_label: string }) => {
            const { error } = await supabase.from('ph_schedules').insert({ ...data, created_by: user!.id });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            closeModal();
            toast.success('Jadwal PH berhasil ditambahkan!');
        },
        onError: (err: Error) => toast.error(`Gagal menambahkan: ${err.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }: { id: string; subject: string; date: string; period_label: string }) => {
            const { error } = await supabase.from('ph_schedules').update(data).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            closeModal();
            toast.success('Jadwal PH berhasil diperbarui!');
        },
        onError: (err: Error) => toast.error(`Gagal memperbarui: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await softDelete('ph_schedules', id);
            if (!result.success) throw new Error(result.error || 'Gagal menghapus');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            setDeleteConfirm(null);
            toast.success('Jadwal PH berhasil dihapus.');
        },
        onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
    });

    const openAdd = useCallback(() => {
        setEditingSchedule(null);
        setFormData({ subject: '', date: todayStr, period_label: '1-2' });
        setDialogOpen(true);
    }, [todayStr]);

    const openEdit = (s: PhScheduleRow) => {
        setEditingSchedule(s);
        setFormData({ subject: s.subject, date: s.date, period_label: s.period_label });
        setDialogOpen(true);
    };

    const handleDuplicate = useCallback((s: PhScheduleRow) => {
        setEditingSchedule(null);
        setFormData({ subject: s.subject, date: s.date, period_label: s.period_label });
        setDialogOpen(true);
        toast.info('Data jadwal disalin ke formulir. Silakan sesuaikan lalu simpan.');
    }, [toast]);

    const closeModal = () => {
        if (createMutation.isPending || updateMutation.isPending) return;
        setDialogOpen(false);
        setEditingSchedule(null);
        setFormData({ subject: '', date: '', period_label: '' });
    };

    // Handle external trigger for opening Add Modal from SchedulePage header
    useEffect(() => {
        if (externalOpenAdd) {
            openAdd();
            onResetExternalOpenAdd?.();
        }
    }, [externalOpenAdd, openAdd, onResetExternalOpenAdd]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.subject.trim() || !formData.date || !formData.period_label.trim()) {
            toast.warning('Semua kolom wajib diisi.');
            return;
        }
        if (!effectiveClassId || !selectedSemesterId) {
            toast.warning('Pilih kelas dan semester terlebih dahulu.');
            return;
        }

        if (editingSchedule) {
            updateMutation.mutate({ id: editingSchedule.id, ...formData });
        } else {
            createMutation.mutate({
                ...formData,
                class_id: effectiveClassId,
                semester_id: selectedSemesterId,
            });
        }
    };

    // Navigate to Mass Input directly to Step 2 with mode 'form'
    const handleInputNilai = (item: PhScheduleRow) => {
        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'form',
                    classId: item.class_id,
                    subject: item.subject,
                    assessment_name: `PH ${item.subject}`,
                }
            }
        });
    };

    const formatDateHeading = (d: string) => {
        try {
            return new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return d;
        }
    };

    // WhatsApp Copy Generator
    const handleCopyWhatsApp = (filterMode: 'all' | 'upcoming' = 'all') => {
        const listToShare = filterMode === 'upcoming'
            ? rawSchedules.filter(s => getItemStatus(s.date) !== 'past')
            : rawSchedules;

        if (listToShare.length === 0) {
            toast.warning(filterMode === 'upcoming' ? 'Tidak ada jadwal PH mendatang.' : 'Tidak ada jadwal PH untuk dibagikan.');
            return;
        }

        const dateMap = new Map<string, PhScheduleRow[]>();
        listToShare.forEach(s => {
            const arr = dateMap.get(s.date) || [];
            arr.push(s);
            dateMap.set(s.date, arr);
        });

        let message = `📅 *JADWAL PENILAIAN HARIAN (PH)*\n`;
        message += `🏫 *Kelas:* ${currentClassName}\n`;
        if (currentSemesterName) message += `🗓️ *Semester:* ${currentSemesterName}\n`;
        message += `─────────────────────────\n\n`;

        Array.from(dateMap.entries()).forEach(([date, items]) => {
            const dateHeading = formatDateHeading(date);
            const rel = getRelativeDateLabel(date);
            const relBadge = rel ? ` _(${rel})_` : '';
            message += `📌 *${dateHeading}*${relBadge}\n`;
            items.forEach(it => {
                message += `   • *Jam Ke-${it.period_label}*: ${it.subject}\n`;
            });
            message += `\n`;
        });

        message += `─────────────────────────\n`;
        message += `_Diharapkan seluruh siswa mempersiapkan diri dan hadir tepat waktu. Terima kasih._ 🙏✨`;

        navigator.clipboard.writeText(message);
        toast.success('Jadwal PH berhasil disalin! Siap ditempel di WhatsApp.');
        setIsWaModalOpen(false);
    };

    // Export to ICS Calendar
    const handleExportIcs = useCallback(() => {
        exportPhScheduleIcs(filteredSchedules, currentClassName, toast);
    }, [filteredSchedules, currentClassName, toast]);

    // Print trigger
    const handleTriggerPrint = () => {
        setIsPrintModalOpen(true);
    };

    const handleExecutePrint = useReactToPrint({
        contentRef: printSheetRef,
        documentTitle: `Agenda_PH_${currentClassName}`,
        pageStyle: `
            @page { size: A4 portrait; margin: 12mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        `,
    });

    // Handle external triggers from SchedulePage header
    useEffect(() => {
        if (externalTriggerWa) {
            setIsWaModalOpen(true);
            onResetExternalTriggerWa?.();
        }
    }, [externalTriggerWa, onResetExternalTriggerWa]);

    useEffect(() => {
        if (externalTriggerPrint) {
            setIsPrintModalOpen(true);
            onResetExternalTriggerPrint?.();
        }
    }, [externalTriggerPrint, onResetExternalTriggerPrint]);

    useEffect(() => {
        if (externalTriggerIcs) {
            handleExportIcs();
            onResetExternalTriggerIcs?.();
        }
    }, [externalTriggerIcs, handleExportIcs, onResetExternalTriggerIcs]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (authLoading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Memuat data jadwal...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stat Summary Cards Bar */}
            {effectiveClassId && selectedSemesterId && !isLoadingSchedules && rawSchedules.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200/60 dark:border-brand-500/20">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Jadwal PH</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white font-serif">{statusCounts.all} PH</div>
                            <div className="text-xxs text-slate-400 truncate">Terjadwal di semester ini</div>
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-500/20">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">PH Mendatang</div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-serif">{statusCounts.upcoming} PH</div>
                            <div className="text-xxs text-slate-400 truncate">
                                {nextUpcomingPh
                                    ? `Terdekat: ${nextUpcomingPh.subject} (${getRelativeDateLabel(nextUpcomingPh.date)})`
                                    : 'Tidak ada PH mendatang'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-500/20">
                            <CheckCircleIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">PH Terlaksana</div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-serif">{statusCounts.past} PH</div>
                            <div className="text-xxs text-slate-400 truncate">
                                {statusCounts.today > 0 ? `✨ ${statusCounts.today} PH hari ini!` : 'Selesai diuji'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Anomaly Alerts (Clash / Overload) */}
            {scheduleAnomalies.conflicts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm">
                        <h4 className="font-bold text-rose-800 dark:text-rose-300">Peringatan Bentrok Jadwal PH Terdeteksi!</h4>
                        <ul className="list-disc list-inside text-rose-700 dark:text-rose-400 space-y-0.5">
                            {scheduleAnomalies.conflicts.map((c, i) => (
                                <li key={i}>
                                    Tanggal <strong>{formatDateHeading(c.date)}</strong> (Jam {c.period}): {c.subjects.join(' dan ')} dijadwalkan bersamaan.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {scheduleAnomalies.heavyDays.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-3.5 flex items-start gap-3">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Info Kepadatan Ujian: </span>
                        {scheduleAnomalies.heavyDays.map((h, i) => (
                            <span key={i}>
                                Tanggal <strong>{formatDateHeading(h.date)}</strong> memiliki {h.count} PH dalam sehari. Pastikan tidak melebihi beban belajar siswa.
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter & Action Card (Stitch Style) */}
            <div className="bg-white/95 dark:bg-[#111c2e]/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-3 sm:p-3.5 shadow-sm dark:shadow-[0_0_0_1px_rgba(28,43,68,0.8),0_4px_20px_-2px_rgba(0,0,0,0.4)] space-y-3 sm:space-y-3.5">
                {/* Selectors Row: KELAS & SEMESTER (2 Columns) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    <div className="space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 dark:text-[#64748b] uppercase">
                            KELAS
                        </label>
                        <CustomDropdown
                            value={effectiveClassId}
                            onChange={handleSelectClass}
                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                            placeholder="Pilih Kelas"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 dark:text-[#64748b] uppercase">
                            SEMESTER
                        </label>
                        <CustomDropdown
                            value={selectedSemesterId}
                            onChange={setSelectedSemesterId}
                            options={semesterOptions}
                            placeholder="Pilih Semester"
                        />
                    </div>
                </div>

                {/* Action Buttons Row: Quick tools (Share, Print, ICS) + Primary Button (+ Tambah PH) */}
                <div className="flex items-center gap-2">
                    {/* Quick actions group */}
                    <div className="flex items-center border border-slate-200 dark:border-[#1c2b44] rounded-xl bg-slate-100/70 dark:bg-[#0f1828]/60 p-0.5">
                        <button
                            type="button"
                            onClick={() => setIsWaModalOpen(true)}
                            disabled={rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Salin Jadwal untuk WhatsApp"
                            aria-label="Bagikan WhatsApp"
                        >
                            <Share2Icon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleTriggerPrint}
                            disabled={rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Cetak Jadwal PH"
                            aria-label="Cetak"
                        >
                            <PrinterIcon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportIcs}
                            disabled={rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Ekspor Jadwal PH ke Kalender (.ics)"
                            aria-label="Kalender ICS"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Primary Button: + Tambah PH */}
                    {canManage && (
                        <button
                            type="button"
                            onClick={openAdd}
                            className="flex-1 h-10 bg-[#00d284] hover:bg-[#00ba74] text-slate-950 font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_14px_0_rgba(0,210,132,0.25)] active:scale-[0.98] whitespace-nowrap px-3"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span className="whitespace-nowrap">Tambah PH</span>
                        </button>
                    )}
                </div>

                {/* Search Input Bar (with Month filter if available) */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <SearchIcon className="w-4 h-4 text-slate-400 dark:text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Cari mata pelajaran PH..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0f1828] border border-slate-200 dark:border-[#1f314d] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#64748b] text-[13px] rounded-xl py-2.5 pl-10 pr-8 focus:outline-none focus:border-emerald-500 dark:focus:border-[#00d284]/80 transition-colors h-10"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {availableMonths.length > 0 && (
                        <div className="w-28 sm:w-36 shrink-0">
                            <CustomDropdown
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                options={[
                                    { value: 'all', label: 'Semua Bulan' },
                                    ...availableMonths,
                                ]}
                                placeholder="Bulan"
                            />
                        </div>
                    )}
                </div>

                {/* Filter Chips & Sort / View Controls Row */}
                <div className="flex items-center justify-between pt-0.5">
                    {/* Horizontal scrollable filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] whitespace-nowrap shadow-sm shrink-0 transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-slate-700/80 dark:bg-slate-700/90 text-white border border-slate-600'
                                    : 'text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Semua ({statusCounts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('today')}
                            className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                statusFilter === 'today'
                                    ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                                    : 'text-emerald-600 dark:text-[#00d284] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Hari Ini ({statusCounts.today})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('upcoming')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                statusFilter === 'upcoming'
                                    ? 'bg-blue-500 text-white shadow-sm font-semibold'
                                    : 'text-blue-500 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            <span>Mendatang ({statusCounts.upcoming})</span>
                            <span className="text-[10px]">↑</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('past')}
                            className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                statusFilter === 'past'
                                    ? 'bg-slate-400 text-white shadow-sm font-semibold'
                                    : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Selesai ({statusCounts.past})
                        </button>
                    </div>

                    {/* Controls Bar: Sort Order & View Mode */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Sort Order Toggle */}
                        <button
                            type="button"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            title={sortOrder === 'asc' ? 'Urutan: Tanggal Terdekat' : 'Urutan: Tanggal Terjauh'}
                            className="h-7 px-2 rounded-lg bg-slate-100 dark:bg-[#0f1828] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 border border-slate-200 dark:border-[#1c2b44]/80 transition-colors"
                        >
                            <span className="font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Terdekat' : 'Terjauh'}</span>
                        </button>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-slate-100 dark:bg-[#0f1828] border border-slate-200 dark:border-[#1c2b44]/80 rounded-lg p-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                title="Tampilan Grid / Kartu"
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-cyan-300 shadow-sm'
                                        : 'text-slate-400 dark:text-[#64748b] hover:text-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <rect height="5.5" rx="1.2" width="5.5" x="1" y="1" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="9.5" y="1" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="1" y="9.5" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="9.5" y="9.5" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                title="Tampilan Tabel / Daftar"
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-cyan-300 shadow-sm'
                                        : 'text-slate-400 dark:text-[#64748b] hover:text-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <line x1="8" x2="21" y1="6" y2="6" />
                                    <line x1="8" x2="21" y1="12" y2="12" />
                                    <line x1="8" x2="21" y1="18" y2="18" />
                                    <line x1="3" x2="3.01" y1="6" y2="6" />
                                    <line x1="3" x2="3.01" y1="12" y2="12" />
                                    <line x1="3" x2="3.01" y1="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {!effectiveClassId || !selectedSemesterId ? (
                <div className="bg-white dark:bg-[#111c2e]/70 rounded-2xl border border-dashed border-slate-300 dark:border-[#1c2b44] p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                    <p className="text-sm font-semibold">Pilih kelas dan semester di atas untuk melihat jadwal PH.</p>
                </div>
            ) : isLoadingSchedules || isLoadingClasses ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs">Memuat jadwal Penilaian Harian...</p>
                </div>
            ) : rawSchedules.length === 0 ? (
                /* Empty State Card (Stitch Style) */
                <div className="bg-white/90 dark:bg-[#111c2e]/70 border border-slate-200/80 dark:border-[#1c2b44]/90 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(28,43,68,0.8),0_4px_20px_-2px_rgba(0,0,0,0.4)] my-2">
                    {/* Sparkle / Star Icon Container */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-950/60 to-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_24px_-2px_rgba(6,182,212,0.2)] text-cyan-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" strokeLinejoin="round" />
                            <circle cx="19" cy="5" fill="currentColor" r="1" />
                        </svg>
                    </div>

                    {/* Heading & Copy */}
                    <div className="space-y-1.5 max-w-[280px] sm:max-w-md">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Belum Ada Jadwal PH
                        </h2>
                        <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] leading-relaxed">
                            Belum ada agenda penilaian harian yang dijadwalkan untuk {currentClassName} pada semester ini.
                        </p>
                    </div>

                    {/* Primary Action: + Tambah Jadwal PH */}
                    {canManage && (
                        <button
                            type="button"
                            onClick={openAdd}
                            className="w-full max-w-[280px] py-3 px-3 bg-[#00d284] hover:bg-[#00ba74] text-slate-950 font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_14px_0_rgba(0,210,132,0.25)] active:scale-[0.98] mt-2 whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span className="whitespace-nowrap">Tambah Jadwal PH</span>
                        </button>
                    )}
                </div>
            ) : filteredSchedules.length === 0 ? (
                <div className="bg-white dark:bg-[#111c2e]/70 rounded-2xl border border-slate-200 dark:border-[#1c2b44] p-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ditemukan jadwal PH yang cocok dengan filter pencarian Anda.
                </div>
            ) : (
                <div className="space-y-5 sm:space-y-6">
                    {Array.from(groupedByDate.entries()).map(([date, items]) => {
                        const dateStatus = getItemStatus(date);
                        const relLabel = getRelativeDateLabel(date);

                        return (
                            <div key={date} className="space-y-2.5 sm:space-y-3">
                                {/* Date Header Badge with Relative Countdown */}
                                <div className="flex items-center justify-between gap-2 px-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold ${
                                            dateStatus === 'today'
                                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                                : dateStatus === 'upcoming'
                                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white font-serif">
                                            {formatDateHeading(date)}
                                        </h3>
                                        {dateStatus === 'today' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Hari Ini
                                            </span>
                                        ) : relLabel ? (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                dateStatus === 'upcoming'
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {relLabel}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                        {items.length} PH
                                    </span>
                                </div>

                                {/* Cards View */}
                                {viewMode === 'cards' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {items.map(item => {
                                            const colorClass = getColorForSubject(item.subject);
                                            const status = getItemStatus(item.date);

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`
                                                        group relative overflow-hidden rounded-2xl transition-all duration-200
                                                        bg-white dark:bg-[#111c2e] border border-slate-200 dark:border-[#1c2b44] hover:border-emerald-500/50 dark:hover:border-emerald-500/40 shadow-sm hover:shadow-md
                                                        flex flex-col border-l-4 ${colorClass}
                                                        ${status === 'today' ? 'ring-1 ring-emerald-500/40' : ''}
                                                    `}
                                                >
                                                    <div className="p-3.5 sm:p-4 flex flex-col h-full gap-2.5 sm:gap-3">
                                                        {/* Top Row: Period Badge, Status & Actions */}
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                                                                    <ClockIcon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                                                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                                                                        Jam {item.period_label}
                                                                    </span>
                                                                </div>
                                                                {status === 'upcoming' && (
                                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                                                        Mendatang
                                                                    </span>
                                                                )}
                                                                {status === 'past' && (
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                                        Selesai
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {canManage && (
                                                                <DropdownMenu>
                                                                    <DropdownTrigger className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                                        <MoreVerticalIcon className="w-3.5 h-3.5" />
                                                                    </DropdownTrigger>
                                                                    <DropdownContent>
                                                                        <DropdownItem
                                                                            icon={<EditIcon className="w-4 h-4" />}
                                                                            onClick={() => openEdit(item)}
                                                                        >
                                                                            Edit Jadwal
                                                                        </DropdownItem>
                                                                        <DropdownItem
                                                                            icon={<CopyIcon className="w-4 h-4 text-brand-500" />}
                                                                            onClick={() => handleDuplicate(item)}
                                                                        >
                                                                            Duplikat Jadwal
                                                                        </DropdownItem>
                                                                        <DropdownItem
                                                                            icon={<TrashIcon className="w-4 h-4 text-rose-500" />}
                                                                            onClick={() => setDeleteConfirm(item)}
                                                                            className="text-rose-600 dark:text-rose-400"
                                                                        >
                                                                            Hapus
                                                                        </DropdownItem>
                                                                    </DropdownContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>

                                                        {/* Subject Title with Badge */}
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-emerald-400 transition-colors">
                                                                    {item.subject}
                                                                </h4>
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                                <UsersIcon className="w-3.5 h-3.5" />
                                                                <span>{currentClassName}</span>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Action: Input Nilai directly */}
                                                        <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleInputNilai(item)}
                                                                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#0f1828] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-[#00d284] border border-slate-200/80 dark:border-[#1c2b44] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group/btn"
                                                            >
                                                                <ClipboardPenIcon className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-emerald-500 transition-colors" />
                                                                <span>Input Nilai PH</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Table View */
                                    <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-[#1c2b44] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto scrollbar-thin">
                                            <table className="w-full text-sm min-w-[540px]" aria-label="Tabel Jadwal Penilaian Harian">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        <th className="px-4 py-3">Mata Pelajaran</th>
                                                        <th className="px-4 py-3 w-36">Jam Ke-</th>
                                                        <th className="px-4 py-3 w-32">Status</th>
                                                        <th className="px-4 py-3 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {items.map(item => {
                                                        const status = getItemStatus(item.date);
                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                                        {item.subject}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                                        <UsersIcon className="w-3 h-3" />
                                                                        <span>{currentClassName}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                                    Jam {item.period_label}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {status === 'today' && (
                                                                        <span className="text-xxs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                                                            Hari Ini
                                                                        </span>
                                                                    )}
                                                                    {status === 'upcoming' && (
                                                                        <span className="text-xxs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                                            Mendatang
                                                                        </span>
                                                                    )}
                                                                    {status === 'past' && (
                                                                        <span className="text-xxs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                                            Selesai
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleInputNilai(item)}
                                                                            className="h-7 px-2.5 text-xs font-bold text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/40 rounded-lg"
                                                                        >
                                                                            Input Nilai
                                                                        </Button>
                                                                        {canManage && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDuplicate(item)}
                                                                                    className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                                    title="Duplikat Jadwal"
                                                                                >
                                                                                    <CopyIcon className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openEdit(item)}
                                                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                                    title="Edit Jadwal"
                                                                                >
                                                                                    <EditIcon className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setDeleteConfirm(item)}
                                                                                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                                    title="Hapus Jadwal"
                                                                                >
                                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={dialogOpen}
                onClose={closeModal}
                title={editingSchedule ? 'Edit Jadwal Penilaian Harian' : 'Tambah Jadwal Penilaian Harian'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Tanggal Pelaksanaan
                        </label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="h-11 rounded-xl"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Mata Pelajaran & Materi PH
                            </label>
                            <span className="text-xxs text-slate-400">Pilih saran atau ketik manual</span>
                        </div>
                        <Input
                            type="text"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="cth. Matematika (Pecahan & Desimal)"
                            className="h-11 rounded-xl mb-2"
                            required
                        />
                        {/* Quick Subject Chips */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {subjectSuggestions.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, subject: `${s} ` })}
                                    className="px-2 py-0.5 text-xxs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 transition-colors"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Jam Pelajaran Ke-
                        </label>
                        <Input
                            type="text"
                            value={formData.period_label}
                            onChange={e => setFormData({ ...formData, period_label: e.target.value })}
                            placeholder="cth. 1-2 atau 7-8"
                            className="h-11 rounded-xl"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {PERIOD_PRESETS.map(label => {
                                const isSelected = formData.period_label === label;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, period_label: label })}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                            isSelected
                                                ? 'bg-brand-600 text-white shadow-sm font-bold scale-105'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30'
                                        }`}
                                    >
                                        Jam {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={closeModal} disabled={isPending} className="rounded-xl">
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={isPending} className="rounded-xl font-bold px-5">
                            {isPending ? 'Menyimpan...' : editingSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal PH'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* WhatsApp Share Options Modal */}
            <Modal
                isOpen={isWaModalOpen}
                onClose={() => setIsWaModalOpen(false)}
                title="Salin Format WhatsApp"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Pilih jadwal PH yang ingin disalin untuk dibagikan ke grup WhatsApp kelas atau paguyuban orang tua:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleCopyWhatsApp('upcoming')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-2.5">
                                <ClockIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                PH Mendatang Saja
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin {statusCounts.upcoming + statusCounts.today} jadwal PH aktif & yang akan datang.
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleCopyWhatsApp('all')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-white dark:bg-slate-900/50 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center mb-2.5">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                Seluruh Jadwal PH
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin semua {statusCounts.all} jadwal PH untuk semester ini.
                            </div>
                        </button>
                    </div>

                    <div className="flex justify-end pt-3">
                        <Button variant="ghost" onClick={() => setIsWaModalOpen(false)}>
                            Tutup
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Print Friendly Preview Modal */}
            <Modal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                title="Cetak Jadwal Penilaian Harian"
            >
                <div className="space-y-4 pt-2">
                    {/* Printable Sheet View */}
                    <div id="ph-schedule-print-area" ref={printSheetRef} className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-4">
                        <div className="text-center border-b pb-3 border-slate-300">
                            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                                Agenda Penilaian Harian (PH)
                            </h2>
                            <p className="text-xs text-slate-600">
                                Kelas: <strong>{currentClassName}</strong> &bull; Semester: <strong>{currentSemesterName}</strong>
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-xs min-w-[480px]" aria-label="Tabel Agenda Penilaian Harian Cetak">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800">
                                        <th className="border border-slate-300 px-2 py-1.5 w-8 text-center">No</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Hari & Tanggal</th>
                                        <th className="border border-slate-300 px-2 py-1.5 w-20 text-center">Jam Ke-</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Mata Pelajaran & Materi</th>
                                        <th className="border border-slate-300 px-3 py-1.5 w-24 text-center">Paraf Guru</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchedules.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                                            <td className="border border-slate-300 px-3 py-1.5">{formatDateHeading(item.date)}</td>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">{item.period_label}</td>
                                            <td className="border border-slate-300 px-3 py-1.5 font-medium">{item.subject}</td>
                                            <td className="border border-slate-300 px-3 py-1.5 text-center"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-4 flex justify-between text-xs text-slate-600">
                            <div className="text-center">
                                <p>Mengetahui,</p>
                                <p className="mt-8 font-bold">( Wali Kelas )</p>
                            </div>
                            <div className="text-center">
                                <p>Guru Pengampu,</p>
                                <p className="mt-8 font-bold">( ........................................ )</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setIsPrintModalOpen(false)}>
                            Tutup
                        </Button>
                        <Button variant="primary" onClick={handleExecutePrint} className="font-bold flex items-center gap-2">
                            <PrinterIcon className="w-4 h-4" />
                            <span>Cetak Sekarang</span>
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => {
                    if (deleteConfirm) {
                        deleteMutation.mutate(deleteConfirm.id);
                    }
                }}
                title="Hapus Jadwal Penilaian Harian?"
                message={
                    <span>
                        Apakah Anda yakin ingin menghapus jadwal PH untuk mata pelajaran{' '}
                        <strong>"{deleteConfirm?.subject}"</strong> pada tanggal{' '}
                        <strong>{deleteConfirm?.date ? formatDateHeading(deleteConfirm.date) : ''}</strong>?
                    </span>
                }
                confirmText="Hapus Jadwal"
                cancelText="Batal"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
};

export default PhScheduleTab;
