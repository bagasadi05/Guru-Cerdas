import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, wasLastResponseQueued } from '../../../services/supabase';
import { addToQueue } from '../../../services/offlineQueue';
import { AttendanceRecord, AttendanceStatus } from '../../../types';
import { queryKeys } from '../../../lib/queryKeys';
import { triggerPerfectAttendanceConfetti, triggerSubtleConfetti } from '../../../utils/confetti';

interface UseAttendanceActionsProps {
    user: any;
    selectedClass: string;
    selectedDate: string;
    students: any[];
    attendanceRecords: Record<string, AttendanceRecord>;
    setAttendanceRecords: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord>>>;
    selectedStudents: Set<string>;
    setSelectedStudents: React.Dispatch<React.SetStateAction<Set<string>>>;
    noteText: string;
    setNoteText: (text: string) => void;
    setIsNoteModalOpen: (isOpen: boolean) => void;
    unmarkedStudents: any[];
    isOnline: boolean;
    localDirtyRef: React.MutableRefObject<boolean>;
    initialSyncRef: React.MutableRefObject<boolean>;
    toast: any;
    getSemesterByDate: (date: string) => any;
    selectedSemesterId: string | null;
    activeSemester: any | null;
    setIsResetModalOpen: (isOpen: boolean) => void;
    setIsSaveConfirmOpen: (isOpen: boolean) => void;
}

export const useAttendanceActions = ({
    user,
    selectedClass,
    selectedDate,
    students,
    attendanceRecords,
    setAttendanceRecords,
    selectedStudents,
    setSelectedStudents,
    noteText,
    setNoteText,
    setIsNoteModalOpen,
    unmarkedStudents,
    isOnline,
    localDirtyRef,
    initialSyncRef,
    toast,
    getSemesterByDate,
    selectedSemesterId,
    activeSemester,
    setIsResetModalOpen,
    setIsSaveConfirmOpen,
}: UseAttendanceActionsProps) => {
    const queryClient = useQueryClient();

    const { mutate: saveAttendance, isPending: isSaving } = useMutation<any, Error, any, any>({
        mutationFn: async (records) => {
            if (isOnline) { 
                const { error } = await supabase.from('attendance').upsert(records); 
                if (error) throw error; 
                return { synced: !wasLastResponseQueued() }; 
            }
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
        onSettled: () => { 
            localDirtyRef.current = false; 
            queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] }); 
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }); 
        },
    });

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
        setAttendanceRecords(updated); performSave(updated);
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

    const performSave = (recordsOverride?: Record<string, AttendanceRecord>) => {
        if (!user || !students || isSaving) return;
        const records = { ...(recordsOverride || attendanceRecords) };
        if (!recordsOverride) {
            unmarkedStudents.forEach(s => { records[s.id] = { status: AttendanceStatus.Hadir, note: '' }; });
        }
        
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

    return {
        saveAttendance, isSaving,
        resetAttendance, isResetting,
        handleSaveNote,
        handleStatusChange,
        markRestAsPresent,
        handleApplyTemplate,
        handleResetAttendance,
        confirmResetAttendance,
        performSave,
        handleSave
    };
};
