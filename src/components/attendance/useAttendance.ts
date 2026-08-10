import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, wasLastResponseQueued } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { addToQueue } from '../../services/offlineQueue';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSemester } from '../../contexts/SemesterContext';
import { queryKeys } from '../../lib/queryKeys';
import { type TeacherClassAssignmentRow } from '../../services/teacherAssignments';
import { AttendanceRecord, AttendanceStatus, AttendanceInsert, StudentRow, ClassRow, AttendanceRow } from '../../types';
import { statusOptions } from '../../constants';
import { triggerPerfectAttendanceConfetti, triggerSubtleConfetti } from '../../utils/confetti';
import { type AttendanceViewMode } from './attendanceMenuConfig';
import { useAttendanceStreaks } from './useAttendanceStreaks';
import { useAttendanceAI } from './useAttendanceAI';
import { useAttendanceExport } from './useAttendanceExport';

export const useAttendance = () => {
    const { user, isAdmin } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const queryClient = useQueryClient();
    const { schoolName } = useUserSettings();
    const { activeSemester, getSemesterByDate, semesters } = useSemester();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
    useEffect(() => { if (activeSemester && !selectedSemesterId) setSelectedSemesterId(activeSemester.id); }, [activeSemester, selectedSemesterId]);

    const selectedSemester = useMemo(() => {
        if (!selectedSemesterId) return null;
        return semesters.find(s => s.id === selectedSemesterId) || null;
    }, [semesters, selectedSemesterId]);

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [calendarMonth, setCalendarMonth] = useState<string>(selectedDate.slice(0, 7));

    useEffect(() => { if (selectedSemester && (selectedDate < selectedSemester.start_date || selectedDate > selectedSemester.end_date)) setSelectedDate(selectedSemester.start_date); }, [selectedDate, selectedSemester]);

    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
    const initialSyncRef = useRef(false);
    const localDirtyRef = useRef(false);
    const attendanceContextRef = useRef<string>('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [viewMode, setViewMode] = useState<AttendanceViewMode>('list');

    useEffect(() => { setCalendarMonth(selectedDate.slice(0, 7)); }, [selectedDate]);

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    const { data: classes = [], isLoading: isLoadingClasses, error: classesError, refetch: refetchClasses } = useQuery({
        queryKey: ['classes', 'attendance', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('id, name, user_id').is('deleted_at', null).eq('is_archived', false);
            if (error) throw error;
            return (data || []) as unknown as ClassRow[];
        },
        enabled: !!user,
    });

    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['attendanceAssignments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('teacher_class_assignments').select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at').eq('teacher_user_id', user.id).is('deleted_at', null);
            if (error) throw error;
            return (data || []) as TeacherClassAssignmentRow[];
        },
        enabled: !!user,
    });

    const attendanceClasses = useMemo(() => {
        if (!classes || !user) return [];
        if (isAdmin) return classes;
        return classes.filter(c => c.user_id === user.id || teacherAssignments.some(a => a.class_id === c.id && (!selectedSemesterId || a.semester_id === selectedSemesterId)));
    }, [classes, teacherAssignments, user, isAdmin, selectedSemesterId]);

    useEffect(() => {
        if (attendanceClasses.length === 0) { if (selectedClass) setSelectedClass(''); return; }
        if (!attendanceClasses.some(c => c.id === selectedClass)) setSelectedClass(attendanceClasses[0].id);
    }, [attendanceClasses, selectedClass]);

    const { data: students = [], isLoading: isLoadingStudents, error: studentsError, refetch: refetchStudents } = useQuery({
        queryKey: ['studentsForAttendance', user?.id, selectedClass],
        queryFn: async () => {
            if (!selectedClass || !user) return [];
            const { data, error } = await supabase.from('students').select('id, name, class_id, user_id, gender, avatar_url').eq('class_id', selectedClass).is('deleted_at', null).order('name');
            if (error) throw error;
            return (data || []) as unknown as StudentRow[];
        },
        enabled: !!selectedClass && !!user,
        staleTime: 0,
    });

    const { data: existingAttendance, isSuccess: hasLoadedAttendance } = useQuery({
        queryKey: ['attendanceData', user?.id, selectedClass, selectedDate],
        queryFn: async () => {
            if (!user || !students || students.length === 0) return {};
            const { data, error } = await supabase.from('attendance').select('id, student_id, status, notes, official_status, teacher_id').eq('date', selectedDate).in('student_id', students.map(s => s.id)).is('deleted_at', null);
            if (error) throw error;
            return (data || []).reduce<Record<string, AttendanceRecord>>((acc, r: any) => { acc[r.student_id] = { id: r.id, status: r.status as AttendanceStatus, note: r.notes || '' }; return acc; }, {});
        },
        enabled: !!user && !!selectedClass && !!selectedDate && students.length > 0,
    });

    useEffect(() => {
        const nextContext = `${user?.id || ''}:${selectedClass}:${selectedDate}`;
        if (attendanceContextRef.current === nextContext) return;
        attendanceContextRef.current = nextContext;
        initialSyncRef.current = false; localDirtyRef.current = false;
        setAttendanceRecords({}); setSelectedStudents(new Set());
    }, [user?.id, selectedClass, selectedDate]);

    useEffect(() => {
        if (initialSyncRef.current || !hasLoadedAttendance) return;
        initialSyncRef.current = true;
        if (!localDirtyRef.current) setAttendanceRecords(existingAttendance || {});
    }, [existingAttendance, hasLoadedAttendance, students]);

    const calendarRange = useMemo(() => {
        const [y, m] = calendarMonth.split('-').map(Number);
        if (!y || !m) return null;
        const ms = `${y}-${String(m).padStart(2, '0')}-01`;
        const me = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
        if (!selectedSemester) return { start: ms, end: me };
        const s = ms < selectedSemester.start_date ? selectedSemester.start_date : ms;
        const e = me > selectedSemester.end_date ? selectedSemester.end_date : me;
        return s > e ? null : { start: s, end: e };
    }, [calendarMonth, selectedSemester]);

    const { data: calendarAttendance = [] } = useQuery({
        queryKey: ['attendanceCalendar', user?.id, selectedClass, calendarRange?.start, calendarRange?.end],
        queryFn: async () => {
            if (!user || !calendarRange || !students.length) return [];
            const { data, error } = await supabase.from('attendance').select('student_id, date, status').in('student_id', students.map(s => s.id)).gte('date', calendarRange.start).lte('date', calendarRange.end).is('deleted_at', null);
            if (error) throw error;
            return (data || []) as unknown as AttendanceRow[];
        },
        enabled: !!user && !!selectedClass && !!calendarRange && students.length > 0,
    });

    const { mutate: saveAttendance, isPending: isSaving } = useMutation<any, Error, any, any>({
        mutationFn: async (records) => {
            if (isOnline) { const { error } = await supabase.from('attendance').upsert(records); if (error) throw error; return { synced: !wasLastResponseQueued() }; }
            await addToQueue({ table: 'attendance', operation: 'upsert', payload: records as Record<string, unknown>[] });
            return { synced: false };
        },
        onMutate: async (records) => {
            await queryClient.cancelQueries({ queryKey: ['attendanceData', user?.id, selectedClass, selectedDate] });
            const prev = queryClient.getQueryData(['attendanceData', user?.id, selectedClass, selectedDate]);
            queryClient.setQueryData(['attendanceData', user?.id, selectedClass, selectedDate], (old: any = {}) => {
                const n = { ...old }; records.forEach((r: any) => { if (r.student_id) n[r.student_id] = { id: r.id, status: r.status, note: r.notes || '' }; });
                return n;
            });
            return { previousAttendance: prev };
        },
        onError: (err: any, _r, ctx: any) => {
            queryClient.setQueryData(['attendanceData', user?.id, selectedClass, selectedDate], ctx?.previousAttendance);
            toast.error(err.message?.includes('foreign key') ? 'Data siswa telah diperbarui.' : `Gagal menyimpan: ${err.message}`);
        },
        onSuccess: (data, vars) => {
            if (data.synced) {
                toast.success('Absensi berhasil disimpan!');
                const all = vars.every((r: any) => r.status === 'Hadir');
                setTimeout(() => all && vars.length > 0 ? triggerPerfectAttendanceConfetti() : triggerSubtleConfetti(), 300);
            } else toast.info('Absensi disimpan offline.');
        },
        onSettled: () => { localDirtyRef.current = false; queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] }); queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }); },
    });

    const attendanceSummary = useMemo(() => {
        const s = statusOptions.reduce((acc, o) => ({ ...acc, [o.value]: 0 }), {} as Record<AttendanceStatus, number>);
        Object.values(attendanceRecords).forEach(r => { if (r.status) s[r.status]++; });
        return s;
    }, [attendanceRecords]);

    const unmarkedStudents = useMemo(() => students.filter(s => !attendanceRecords[s.id]?.status), [students, attendanceRecords]);
    const filteredStudents = useMemo(() => students.filter(s => s.name.toLowerCase().includes(deferredSearchQuery.toLowerCase())), [students, deferredSearchQuery]);

    const calendarSummaryRecords = useMemo(() => {
        const g = new Map<string, AttendanceStatus[]>();
        calendarAttendance.forEach((r: AttendanceRow) => { const l = g.get(r.date) || []; l.push(r.status as AttendanceStatus); g.set(r.date, l); });
        const priority = [AttendanceStatus.Alpha, AttendanceStatus.Sakit, AttendanceStatus.Izin, AttendanceStatus.Hadir, AttendanceStatus.Libur];
        return Array.from(g.entries()).map(([date, statuses]) => {
            const c: Record<string, number> = {}; statuses.forEach(s => c[s] = (c[s] || 0) + 1);
            if (statuses.filter(s => s !== AttendanceStatus.Libur).length === 0) return { date, status: AttendanceStatus.Libur };
            let sel = AttendanceStatus.Hadir, max = -1;
            priority.forEach(s => { const n = s === AttendanceStatus.Libur ? 0 : (c[s] || 0); if (n > max) { max = n; sel = s; } });
            return { date, status: sel };
        });
    }, [calendarAttendance]);

    const isHomeroom = useMemo(() => !!selectedClass && teacherAssignments.some(a => a.class_id === selectedClass && a.assignment_role === 'homeroom'), [selectedClass, teacherAssignments]);

    const { attendanceStreaks, attendanceHistory } = useAttendanceStreaks(user, students, selectedDate, selectedSemester, selectedClass);
    const aiApi = useAttendanceAI(selectedClass, students, attendanceHistory);
    const exportApi = useAttendanceExport(user, attendanceClasses, semesters, activeSemester);

    const handleSaveNote = () => {
        if (selectedStudents.size === 0) return;
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true;
        const updated = { ...attendanceRecords };
        Array.from(selectedStudents).forEach(id => { updated[id] = { ...updated[id], status: updated[id]?.status || 'Izin', note: noteText }; });
        setAttendanceRecords(updated); setSelectedStudents(new Set()); setIsNoteModalOpen(false); setNoteText('');
        toast.success('Catatan berhasil disimpan');
    };

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true;
        setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status, note: prev[studentId]?.note || '' } }));
    };

    const markRestAsPresent = () => {
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true; initialSyncRef.current = true;
        const updated = { ...attendanceRecords };
        unmarkedStudents.forEach(s => { updated[s.id] = { status: AttendanceStatus.Hadir, note: '' }; });
        setAttendanceRecords(updated); performSave();
    };

    const handleApplyTemplate = (template: { defaultStatus: AttendanceStatus; applyToAll: boolean }) => {
        if (!students.length) return;
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true; initialSyncRef.current = true;
        const uc = template.applyToAll ? students.length : students.filter(s => !attendanceRecords[s.id]?.status).length;
        const updated = { ...attendanceRecords };
        students.forEach(s => { if (template.applyToAll || !updated[s.id]?.status) updated[s.id] = { ...updated[s.id], status: template.defaultStatus, note: updated[s.id]?.note || '' }; });
        setAttendanceRecords(updated);
        queryClient.setQueryData(['attendanceData', user?.id, selectedClass, selectedDate], updated);
        if (template.applyToAll) toast.success(`Semua siswa ditandai ${template.defaultStatus}`);
        else if (uc > 0) toast.success(`${uc} siswa ditandai ${template.defaultStatus}`);
        else toast.info('Semua siswa sudah memiliki status');
    };

    const { mutate: resetAttendance, isPending: isResetting } = useMutation<void, Error, void>({
        mutationFn: async () => {
            if (!user || !students.length) throw new Error('Data tidak valid');
            const ids = students.map(s => s.id);
            const { error } = await supabase.from('attendance').update({ deleted_at: new Date().toISOString() } as never).eq('date', selectedDate).in('student_id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            localDirtyRef.current = false; setAttendanceRecords({}); setIsResetModalOpen(false);
            toast.success('Absensi berhasil direset!');
            ['attendanceData', 'attendanceCalendar', 'dashboardData', 'deleted-items', 'deleted-items-all'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
        },
        onError: (err) => toast.error(`Gagal mereset: ${err.message}`),
    });

    const handleResetAttendance = () => {
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        if (!Object.values(attendanceRecords).some(r => r.status)) { toast.warning('Tidak ada data absensi.'); return; }
        setIsResetModalOpen(true);
    };
    const confirmResetAttendance = () => resetAttendance();

    const performSave = () => {
        if (!user || !students || isSaving) return;
        const records = { ...attendanceRecords };
        unmarkedStudents.forEach(s => { records[s.id] = { status: AttendanceStatus.Hadir, note: '' }; });
        const withIds = Object.fromEntries(Object.entries(records).map(([id, r]) => [id, { ...r, id: r.id || crypto.randomUUID() }])) as Record<string, AttendanceRecord>;
        setAttendanceRecords(withIds);
        const validIds = new Set(students.map(s => s.id));
        const semId = getSemesterByDate(selectedDate)?.id || selectedSemesterId || activeSemester?.id || null;
        const toUpsert = Object.entries(withIds).filter(([sid]) => validIds.has(sid)).map(([sid, r]) => ({
            id: r.id!, student_id: sid, date: selectedDate, status: r.status, teacher_status: r.status,
            teacher_id: user.id, notes: r.note, user_id: user.id, semester_id: semId,
        }));
        if (toUpsert.length === 0) { toast.warning('Tidak ada siswa valid.'); return; }
        saveAttendance(toUpsert);
    };

    const handleSave = () => {
        if (!user || !students) return;
        if (unmarkedStudents.length > 0) { setIsSaveConfirmOpen(true); return; }
        performSave();
    };

    const handleExport = async (format: 'pdf' | 'excel') => { await exportApi.handleExport(format, schoolName); };

    return {
        user, today, yesterday,
        selectedSemesterId, setSelectedSemesterId, selectedSemester,
        selectedClass, setSelectedClass, selectedDate, setSelectedDate,
        calendarMonth, setCalendarMonth, attendanceRecords, setAttendanceRecords,
        selectedStudents, setSelectedStudents,
        isDatePickerOpen, setDatePickerOpen, isNoteModalOpen, setIsNoteModalOpen,
        noteText, setNoteText, searchQuery, setSearchQuery,
        viewMode, setViewMode,
        ...exportApi, ...aiApi,
        isResetModalOpen, setIsResetModalOpen,
        classes, isLoadingClasses, classesError, refetchClasses,
        attendanceClasses,
        students, isLoadingStudents, studentsError, refetchStudents,
        saveAttendance, isSaving, resetAttendance, isResetting,
        attendanceSummary, unmarkedStudents, filteredStudents,
        calendarSummaryRecords, attendanceStreaks,
        handleSaveNote, handleStatusChange,
        markRestAsPresent, handleApplyTemplate,
        handleResetAttendance, confirmResetAttendance,
        handleSave, performSave,
        isSaveConfirmOpen, setIsSaveConfirmOpen,
        handleExport, isOnline, isHomeroom,
    };
};

export default useAttendance;
