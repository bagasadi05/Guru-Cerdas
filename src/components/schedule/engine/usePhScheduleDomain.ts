import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useSemester } from '../../../contexts/SemesterContext';
import { softDelete } from '../../../services/SoftDeleteService';
import { exportPhScheduleIcs } from '../../../services/scheduleExportService';
import { PhScheduleEngine, ExamStatus } from './PhScheduleEngine';
import type { PhScheduleRow, ClassRow } from '../../../types';

export const COMMON_SUBJECT_SUGGESTIONS = [
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

export const PERIOD_PRESETS = ['1-2', '3-4', '5-6', '7-8'];

export interface UsePhScheduleDomainOptions {
    externalSelectedClassId?: string;
    onSelectClassId?: (classId: string) => void;
    onCanManageChange?: (canManage: boolean) => void;
}

export function usePhScheduleDomain({
    externalSelectedClassId,
    onSelectClassId,
    onCanManageChange,
}: UsePhScheduleDomainOptions = {}) {
    const { user, isAdmin } = useAuth();
    const { activeSemester, semesters } = useSemester();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [internalSelectedClassId, setInternalSelectedClassId] = useState<string>('');

    const handleSelectClass = useCallback(
        (id: string) => {
            setInternalSelectedClassId(id);
            onSelectClassId?.(id);
        },
        [onSelectClassId]
    );

    const [customSemesterId, setSelectedSemesterId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PhScheduleRow | null>(null);
    const [formData, setFormData] = useState({ subject: '', date: '', period_label: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<PhScheduleRow | null>(null);

    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Semesters options
    const semesterOptions = useMemo(() => {
        return (semesters || []).map((s) => {
            const academicYear = s.academic_years;
            const yearName = Array.isArray(academicYear) ? academicYear[0]?.name : academicYear?.name;
            return {
                value: s.id,
                label: [s.name, yearName].filter(Boolean).join(' — '),
            };
        });
    }, [semesters]);

    // Derive active semester cleanly
    const selectedSemesterId = useMemo(() => {
        if (customSemesterId) return customSemesterId;
        if (activeSemester?.id) return activeSemester.id;
        if (semesters && semesters.length > 0) return semesters[0].id;
        return '';
    }, [customSemesterId, activeSemester, semesters]);

    // Classes query
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

    const effectiveClassId = externalSelectedClassId || internalSelectedClassId || (classes.length > 0 ? classes[0].id : '');

    // Teacher assignments
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

    // Subject suggestions
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
        classSchedules.forEach((s: { subject?: string | null }) => {
            if (s.subject && s.subject.trim()) set.add(s.subject.trim());
        });
        COMMON_SUBJECT_SUGGESTIONS.forEach((s) => set.add(s));
        return Array.from(set);
    }, [classSchedules]);

    // Permissions check
    const isClassOwner = useMemo(() => {
        const cls = classes.find((c) => c.id === effectiveClassId);
        return cls ? cls.user_id === user?.id : false;
    }, [classes, effectiveClassId, user?.id]);

    const isWalasForClass = useCallback(
        (classId: string) =>
            isAdmin ||
            isClassOwner ||
            assignments.some(
                (a: { class_id: string; assignment_role: string }) =>
                    a.class_id === classId &&
                    (a.assignment_role === 'homeroom' || a.assignment_role === 'subject_teacher')
            ),
        [isAdmin, isClassOwner, assignments]
    );

    const canManage = effectiveClassId ? isWalasForClass(effectiveClassId) : false;

    useEffect(() => {
        onCanManageChange?.(canManage);
    }, [canManage, onCanManageChange]);

    // Raw PH schedules query
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

    const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE'), []);

    // Engine Projections
    const availableMonths = useMemo(() => PhScheduleEngine.getAvailableMonths(rawSchedules), [rawSchedules]);

    const filteredSchedules = useMemo(() => {
        return PhScheduleEngine.filterAndSort(
            rawSchedules,
            { searchQuery, statusFilter, selectedMonth, sortOrder },
            todayStr
        );
    }, [rawSchedules, searchQuery, statusFilter, selectedMonth, sortOrder, todayStr]);

    const groupedByDate = useMemo(() => PhScheduleEngine.groupByDate(filteredSchedules), [filteredSchedules]);

    const statusCounts = useMemo(() => PhScheduleEngine.getStatusCounts(rawSchedules, todayStr), [rawSchedules, todayStr]);

    const nextUpcomingPh = useMemo(() => PhScheduleEngine.getNextUpcoming(rawSchedules, todayStr), [rawSchedules, todayStr]);

    const scheduleAnomalies = useMemo(() => PhScheduleEngine.auditAnomalies(rawSchedules), [rawSchedules]);

    const currentClassName = useMemo(() => {
        return classes.find((c) => c.id === effectiveClassId)?.name || 'Kelas';
    }, [classes, effectiveClassId]);

    const currentSemesterName = useMemo(() => {
        return semesterOptions.find((s) => s.value === selectedSemesterId)?.label || 'Semester';
    }, [semesterOptions, selectedSemesterId]);

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

    const openEdit = useCallback((s: PhScheduleRow) => {
        setEditingSchedule(s);
        setFormData({ subject: s.subject, date: s.date, period_label: s.period_label });
        setDialogOpen(true);
    }, []);

    const handleDuplicate = useCallback(
        (s: PhScheduleRow) => {
            setEditingSchedule(null);
            setFormData({ subject: s.subject, date: s.date, period_label: s.period_label });
            setDialogOpen(true);
            toast.info('Data jadwal disalin ke formulir. Silakan sesuaikan lalu simpan.');
        },
        [toast]
    );

    const closeModal = useCallback(() => {
        if (createMutation.isPending || updateMutation.isPending) return;
        setDialogOpen(false);
        setEditingSchedule(null);
        setFormData({ subject: '', date: '', period_label: '' });
    }, [createMutation.isPending, updateMutation.isPending]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
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
        },
        [formData, effectiveClassId, selectedSemesterId, editingSchedule, updateMutation, createMutation, toast]
    );

    const handleCopyWhatsApp = useCallback(
        (filterMode: 'all' | 'upcoming' = 'all') => {
            const text = PhScheduleEngine.generateWhatsAppText(
                rawSchedules,
                { className: currentClassName, semesterName: currentSemesterName },
                filterMode,
                todayStr
            );

            if (!text) {
                toast.warning(
                    filterMode === 'upcoming'
                        ? 'Tidak ada jadwal PH mendatang.'
                        : 'Tidak ada jadwal PH untuk dibagikan.'
                );
                return;
            }

            navigator.clipboard
                .writeText(text)
                .then(() => {
                    toast.success('Format teks WhatsApp berhasil disalin ke clipboard! 📋');
                    setIsWaModalOpen(false);
                })
                .catch(() => {
                    toast.error('Gagal menyalin ke clipboard.');
                });
        },
        [rawSchedules, currentClassName, currentSemesterName, todayStr, toast]
    );

    const handleExportIcs = useCallback(() => {
        if (rawSchedules.length === 0) {
            toast.warning('Tidak ada jadwal PH untuk diekspor.');
            return;
        }
        exportPhScheduleIcs(rawSchedules, currentClassName, toast);
    }, [rawSchedules, currentClassName, toast]);

    return {
        // State & Selections
        effectiveClassId,
        handleSelectClass,
        selectedSemesterId,
        setSelectedSemesterId,
        semesterOptions,
        classes,
        isLoadingClasses,
        isLoadingSchedules,
        rawSchedules,
        filteredSchedules,
        groupedByDate,
        statusCounts,
        nextUpcomingPh,
        scheduleAnomalies,
        currentClassName,
        currentSemesterName,
        subjectSuggestions,
        todayStr,
        availableMonths,
        canManage,

        // Filters
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        selectedMonth,
        setSelectedMonth,
        viewMode,
        setViewMode,
        sortOrder,
        setSortOrder,

        // Form & Dialogs
        dialogOpen,
        editingSchedule,
        formData,
        setFormData,
        deleteConfirm,
        setDeleteConfirm,
        openAdd,
        openEdit,
        handleDuplicate,
        closeModal,
        handleSubmit,
        createMutation,
        updateMutation,
        deleteMutation,

        // Exporters
        isWaModalOpen,
        setIsWaModalOpen,
        isPrintModalOpen,
        setIsPrintModalOpen,
        handleCopyWhatsApp,
        handleExportIcs,
    };
}
