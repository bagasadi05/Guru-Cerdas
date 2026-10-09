import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useSemester } from '../../../contexts/SemesterContext';
import { softDelete } from '../../../services/SoftDeleteService';
import { exportPhScheduleIcs } from '../../../services/scheduleExportService';
import { PhScheduleEngine, ExamStatus } from './PhScheduleEngine';
import { validatePhDraft, type PhDraft } from './phScheduleValidation';
import type { PhScheduleRow, ClassRow } from '../../../types';
import { choosePhClass } from './phSchedulePresentation';

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

/**
 * Normalizes subject names to official school title formats.
 * e.g. "Ass. Bhs Arab" -> "Bahasa Arab"
 * e.g. "BHS INDONESIA" -> "Bahasa Indonesia"
 */
export function normalizeSubjectDisplay(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim();

    // Strip leading "Ass." or "Ass " (Assessment / Assistant prefix)
    cleaned = cleaned.replace(/^Ass\.?\s+/i, '');

    // Common abbreviations
    const lower = cleaned.toLowerCase();
    if (lower === 'bhs arab' || lower === 'bhs. arab' || lower === 'bahasa arab') return 'Bahasa Arab';
    if (lower === 'bhs indonesia' || lower === 'bhs. indonesia' || lower === 'bahasa indonesia') return 'Bahasa Indonesia';
    if (lower === 'bhs inggris' || lower === 'bhs. inggris' || lower === 'bahasa inggris') return 'Bahasa Inggris';
    if (lower === 'bhs jawa' || lower === 'bhs. jawa' || lower === 'bahasa jawa') return 'Bahasa Jawa';
    if (lower === 'ipas' || lower === 'i.p.a.s') return 'IPAS';
    if (lower === 'ipa') return 'IPA';
    if (lower === 'ips') return 'IPS';
    if (lower === 'pjok') return 'PJOK';
    if (lower === 'ppkn' || lower === 'pkn') return 'PPKn';
    if (lower === 'pai') return 'PAI';

    // Standardize title case if all caps (e.g. "MATEMATIKA" -> "Matematika")
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 4) {
        return cleaned.charAt(0) + cleaned.slice(1).toLowerCase();
    }

    return cleaned;
}

export const PERIOD_PRESETS = ['1-2', '3-4', '5-6', '7-8'];

export type PhViewMode = 'weekly' | 'cards' | 'table';

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
    const { user } = useAuth();
    const { activeSemester, semesters } = useSemester();
    const toast = useToast();
    const queryClient = useQueryClient();
    const classStorageKey = user ? `portal-guru:ph-class:${user.id}` : '';
    const rememberedClassId = useMemo(() => {
        try { return classStorageKey ? localStorage.getItem(classStorageKey) || '' : ''; }
        catch { return ''; }
    }, [classStorageKey]);

    const [internalSelection, setInternalSelection] = useState({ userId: user?.id, classId: '' });

    const handleSelectClass = useCallback(
        (id: string) => {
            setInternalSelection({ userId: user?.id, classId: id });
            try { if (classStorageKey) localStorage.setItem(classStorageKey, id); }
            catch { /* The current selection still works when browser storage is unavailable. */ }
            onSelectClassId?.(id);
        },
        [onSelectClassId, classStorageKey, user?.id]
    );

    const [customSemesterId, setSelectedSemesterId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilterValue] = useState<ExamStatus | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [viewMode, setViewMode] = useState<PhViewMode>('weekly');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const setStatusFilter = useCallback((status: ExamStatus | 'all') => {
        setStatusFilterValue(status);
        setSortOrder(status === 'past' ? 'desc' : 'asc');
    }, []);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PhScheduleRow | null>(null);
    const [formData, setFormData] = useState({ subject: '', date: '', period_label: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<PhScheduleRow | null>(null);

    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);

    // Semesters options
    const semesterOptions = useMemo(() => {
        return (semesters || []).map((s) => {
            const academicYear = s.academic_years;
            const yearName = Array.isArray(academicYear) ? academicYear[0]?.name : academicYear?.name;
            return {
                value: s.id,
                label: [s.name, yearName].filter(Boolean).join(' - '),
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
    const { data: classes = [], isLoading: isLoadingClasses, error: classesError, refetch: refetchClasses } = useQuery<Pick<ClassRow, 'id' | 'name' | 'wali_kelas_id'>[]>({
        queryKey: ['classes', 'ph-schedule-picker', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('list_ph_schedule_classes');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Teacher assignments
    const { data: assignments = [], error: assignmentsError, refetch: refetchAssignments } = useQuery({
        queryKey: ['teacher-assignments-ph', user?.id, selectedSemesterId],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('class_id, assignment_role')
                .eq('teacher_user_id', user.id)
                .eq('semester_id', selectedSemesterId)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user && !!selectedSemesterId,
    });
    const effectiveClassId = choosePhClass(classes,
        [externalSelectedClassId, internalSelection.userId === user?.id ? internalSelection.classId : '', rememberedClassId],
        [...assignments.filter(item => item.assignment_role === 'homeroom').map(item => item.class_id),
            ...classes.filter(item => item.wali_kelas_id === user?.id && selectedSemesterId === activeSemester?.id).map(item => item.id)]);
    const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);

    // Homeroom teachers and admins manage every PH in the class.
    const permissions = useQuery({
        queryKey: ['ph-permissions', user?.id, effectiveClassId, selectedSemesterId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('can_manage_ph_schedule', { p_class_id: effectiveClassId, p_semester_id: selectedSemesterId });
            if (error) throw error;
            return data === true;
        },
        enabled: !!user && !!effectiveClassId && !!selectedSemesterId,
    });

    // Any approved teacher may add PH; they then manage only their own.
    const addPermission = useQuery({
        queryKey: ['ph-add-permission', user?.id, effectiveClassId, selectedSemesterId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('can_add_ph_schedule', { p_class_id: effectiveClassId, p_semester_id: selectedSemesterId });
            if (error) throw error;
            return data === true;
        },
        enabled: !!user && !!effectiveClassId && !!selectedSemesterId,
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
            if (s.subject && s.subject.trim()) {
                const normalized = normalizeSubjectDisplay(s.subject);
                if (normalized) set.add(normalized);
            }
        });
        COMMON_SUBJECT_SUGGESTIONS.forEach((s) => set.add(s));
        return Array.from(set);
    }, [classSchedules]);

    const canManageAll = permissions.data === true && !permissions.isError;
    const canAdd = canManageAll || (addPermission.data === true && !addPermission.isError);
    const canModify = useCallback(
        (schedule: Pick<PhScheduleRow, 'created_by'>) => canManageAll || (canAdd && schedule.created_by === user?.id),
        [canManageAll, canAdd, user?.id],
    );

    useEffect(() => {
        onCanManageChange?.(canAdd);
    }, [canAdd, onCanManageChange]);

    // Raw PH schedules query
    const { data: rawSchedules = [], isLoading: isLoadingSchedules, error: schedulesError, refetch: refetchSchedules } = useQuery<PhScheduleRow[]>({
        queryKey: ['ph-schedules', effectiveClassId, selectedSemesterId, user?.id],
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
        enabled: !!user && !!effectiveClassId && !!selectedSemesterId,
    });

    const [todayStr, setTodayStr] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
    useEffect(() => {
        const timer = window.setInterval(() => setTodayStr(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })), 60000);
        return () => window.clearInterval(timer);
    }, []);
    const reportPreview = useQuery({
        queryKey: ['ph-report-preview', user?.id, effectiveClassId, todayStr],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('preview_wa_ph_schedule', { p_class_id: effectiveClassId, p_report_date: todayStr });
            if (error) throw error;
            return data ?? '';
        },
        enabled: !!user && !!effectiveClassId && isReportPreviewOpen,
        staleTime: 0,
    });

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
            if (!user || !canAdd) throw new Error('Anda tidak memiliki izin menambah PH di kelas ini.');
            const issue = validatePhDraft(data, selectedSemester, rawSchedules);
            if (issue) throw new Error(issue);
            const { error } = await supabase.from('ph_schedules').insert({ ...data, created_by: user.id });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['ph-report-preview'] });
            setDialogOpen(false);
            setEditingSchedule(null);
            toast.success('Jadwal PH berhasil ditambahkan!');
        },
        onError: (err: Error) => toast.error(`Gagal menambahkan: ${err.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }: { id: string; subject: string; date: string; period_label: string }) => {
            const target = rawSchedules.find((s) => s.id === id);
            if (!target || !canModify(target)) throw new Error('Hanya pembuat jadwal, wali kelas, atau admin yang dapat mengubah PH ini.');
            const issue = validatePhDraft({ ...data, id }, selectedSemester, rawSchedules);
            if (issue) throw new Error(issue);
            const { data: updated, error } = await supabase.from('ph_schedules').update(data).eq('id', id).eq('class_id', effectiveClassId).eq('semester_id', selectedSemesterId).select('id');
            if (error) throw error;
            if (!updated?.length) throw new Error('Jadwal tidak diperbarui. Muat ulang data dan periksa izin Anda.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['ph-report-preview'] });
            setDialogOpen(false);
            setEditingSchedule(null);
            toast.success('Jadwal PH berhasil diperbarui!');
        },
        onError: (err: Error) => toast.error(`Gagal memperbarui: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const target = rawSchedules.find((s) => s.id === id);
            if (!target || !canModify(target)) throw new Error('Hanya pembuat jadwal, wali kelas, atau admin yang dapat mengubah PH ini.');
            const result = await softDelete('ph_schedules', id);
            if (!result.success) throw new Error(result.error || 'Gagal menghapus');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['ph-report-preview'] });
            setDeleteConfirm(null);
            toast.success('Jadwal PH berhasil dihapus.');
        },
        onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
    });

    const batchMutation = useMutation({
        mutationFn: async (drafts: PhDraft[]) => {
            if (!user || !canAdd) throw new Error('Anda tidak memiliki izin menambah PH di kelas ini.');
            if (!drafts.length || drafts.length > 20) throw new Error('Isi 1–20 jadwal dalam satu penyimpanan.');
            for (const [index, draft] of drafts.entries()) {
                const issue = validatePhDraft(draft, selectedSemester, [...rawSchedules, ...drafts.slice(0, index)]);
                if (issue) throw new Error(`Jadwal ${index + 1}: ${issue}`);
            }
            const { error } = await supabase.from('ph_schedules').insert(drafts.map((draft) => ({
                subject: draft.subject.trim(), date: draft.date, period_label: draft.period_label.trim(),
                class_id: effectiveClassId, semester_id: selectedSemesterId, created_by: user.id,
            })));
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ph-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['ph-report-preview'] });
            setIsBatchOpen(false);
            toast.success('Semua jadwal PH berhasil disimpan.');
        },
        onError: (err: Error) => toast.error(`Gagal menyimpan jadwal: ${err.message}`),
    });

    const openAdd = useCallback((initialDate?: unknown) => {
        setEditingSchedule(null);
        const dateToUse = typeof initialDate === 'string' ? initialDate : todayStr;
        setFormData({ subject: '', date: dateToUse, period_label: '1-2' });
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
            if (createMutation.isPending || updateMutation.isPending) return;
            if (editingSchedule ? !canModify(editingSchedule) : !canAdd) {
                toast.warning(editingSchedule ? 'Hanya pembuat jadwal, wali kelas, atau admin yang dapat mengubah PH ini.' : 'Anda tidak memiliki izin menambah PH di kelas ini.');
                return;
            }
            const issue = validatePhDraft({ ...formData, id: editingSchedule?.id }, selectedSemester, rawSchedules);
            if (issue) { toast.warning(issue); return; }
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
        [canAdd, canModify, selectedSemester, rawSchedules, formData, effectiveClassId, selectedSemesterId, editingSchedule, updateMutation, createMutation, toast]
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
        canAdd,
        canManageAll,
        canModify,
        selectedSemester,
        loadError: classesError || assignmentsError || permissions.error || addPermission.error || schedulesError,
        retryLoad: () => { void refetchClasses(); void refetchAssignments(); void permissions.refetch(); void addPermission.refetch(); void refetchSchedules(); },
        isBatchOpen, setIsBatchOpen, batchMutation,
        isReportPreviewOpen, setIsReportPreviewOpen, reportPreview,

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
