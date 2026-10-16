import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import type { AppUser } from '../../../hooks/useAuth';
import { supabase, wasLastResponseQueued } from '../../../services/supabase';
import { addToQueue } from '../../../services/offlineQueue';
import { AttendanceStatus } from '../../../types';
import type { AttendanceRecord, StudentRow, SemesterRow } from '../../../types';
import type { useToast } from '../../../hooks/useToast';
import { queryKeys } from '../../../lib/queryKeys';
import { triggerPerfectAttendanceConfetti, triggerSubtleConfetti } from '../../../utils/confetti';
import type { TablesInsert } from '../../../services/database.types';
import { attendanceCopy } from '../../../locales/attendance';
import { useI18n } from '../../../utils/i18n';

export type AttendanceSaveResult = 'saved' | 'queued' | 'failed';
interface SaveInput {
    records: TablesInsert<'attendance'>[];
    queryKey: ['attendanceData', string, string, string];
}

const ATTENDANCE_CONFLICT_KEY = 'student_id,date';

const SUNDAY_BLOCK_MESSAGE = 'Hari Minggu bukan hari sekolah. Pilih tanggal lain, atau tandai semua siswa Libur.';

/** True when a YYYY-MM-DD date falls on a Sunday (calendar date, no timezone shift). */
export const isSundayDate = (date: string): boolean => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 0;
};

interface UseAttendanceActionsProps {
    user: AppUser | User | null;
    selectedClass: string;
    selectedDate: string;
    students: StudentRow[];
    attendanceRecords: Record<string, AttendanceRecord>;
    setAttendanceRecords: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord>>>;
    selectedStudents: Set<string>;
    setSelectedStudents: React.Dispatch<React.SetStateAction<Set<string>>>;
    noteText: string;
    setNoteText: (text: string) => void;
    setIsNoteModalOpen: (isOpen: boolean) => void;
    unmarkedStudents: StudentRow[];
    isOnline: boolean;
    localDirtyRef: React.MutableRefObject<boolean>;
    initialSyncRef: React.MutableRefObject<boolean>;
    toast: ReturnType<typeof useToast>;
    getSemesterByDate: (date: string) => SemesterRow | null | undefined;
    selectedSemesterId: string | null;
    activeSemester: SemesterRow | null;
    setIsResetModalOpen: (isOpen: boolean) => void;
    setIsSaveConfirmOpen: (isOpen: boolean) => void;
    setIsDirty: (dirty: boolean) => void;
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
    setIsDirty,
}: UseAttendanceActionsProps) => {
    const queryClient = useQueryClient();
    const { language } = useI18n();
    const copy = attendanceCopy[language];
    const saveLock = useRef(false);
    const confirmation = useRef<{ promise: Promise<AttendanceSaveResult | null>; resolve: (result: AttendanceSaveResult | null) => void; save: () => Promise<AttendanceSaveResult> } | null>(null);
    const activeContext = useRef('');
    activeContext.current = `${user?.id}:${selectedClass}:${selectedDate}`;
    useEffect(() => () => { confirmation.current?.resolve(null); confirmation.current = null; }, [user?.id, selectedClass, selectedDate]);

    const { mutate: saveAttendance, mutateAsync: saveAsync, isPending: isSaving } = useMutation<{ synced: boolean }, Error, SaveInput, { previousAttendance: Record<string, AttendanceRecord> | undefined }>({
        networkMode: 'always',
        mutationFn: async ({ records }) => {
            // Conflict on (student_id, date), not id: the unique index also covers
            // soft-deleted rows, so a reset day or a second teacher saving the same
            // class must update the existing row instead of inserting a new one.
            if (isOnline) {
                const { error } = await supabase.from('attendance').upsert(records, { onConflict: ATTENDANCE_CONFLICT_KEY });
                if (error) throw error;
                return { synced: !wasLastResponseQueued() };
            }
            await addToQueue({ table: 'attendance', operation: 'upsert', payload: records as Record<string, unknown>[], onConflict: ATTENDANCE_CONFLICT_KEY, userId: user?.id }, { requirePersistence: true });
            return { synced: false };
        },
        onMutate: async ({ records, queryKey }) => {
            await queryClient.cancelQueries({ queryKey });
            const prev = queryClient.getQueryData<Record<string, AttendanceRecord>>(queryKey);
            queryClient.setQueryData(queryKey, (old: Record<string, AttendanceRecord> = {}) => {
                const n = { ...old }; records.forEach(r => { if (r.student_id) n[r.student_id] = { status: r.status as AttendanceStatus, note: r.notes || '' }; });
                return n;
            });
            return { previousAttendance: prev };
        },
        onError: (err, vars, ctx) => {
            queryClient.setQueryData(vars.queryKey, ctx?.previousAttendance);
            toast.error(err.message?.includes('foreign key') ? 'Data siswa telah diperbarui.' : `Gagal menyimpan: ${err.message}`);
        },
        onSuccess: (data, vars) => {
            if (data.synced) {
                toast.success('Absensi berhasil disimpan!');
                const all = vars.records.every(r => r.status === 'Hadir');
                setTimeout(() => all && vars.records.length > 0 ? triggerPerfectAttendanceConfetti() : triggerSubtleConfetti(), 300);
            } else toast.info('Absensi disimpan offline.');
            if (activeContext.current === `${vars.queryKey[1]}:${vars.queryKey[2]}:${vars.queryKey[3]}`) {
                localDirtyRef.current = false;
                setIsDirty(false);
            }
        },
        onSettled: () => { 
            queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] }); 
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }); 
        },
    });

    const handleSaveNote = () => {
        if (selectedStudents.size === 0) return;
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true;
        setIsDirty(true);
        const updated = { ...attendanceRecords };
        Array.from(selectedStudents).forEach(id => { updated[id] = { ...updated[id], status: updated[id]?.status || 'Izin', note: noteText }; });
        setAttendanceRecords(updated); setSelectedStudents(new Set()); setIsNoteModalOpen(false); setNoteText('');
        toast.info(copy.noteApplied);
    };

    const handleStatusChange = useCallback((studentId: string, status: AttendanceStatus) => {
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true;
        setIsDirty(true);
        setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status, note: prev[studentId]?.note || '' } }));
    }, [isSaving, toast, localDirtyRef, setIsDirty, setAttendanceRecords]);

    const markRestAsPresent = () => {
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        if (isSundayDate(selectedDate)) { toast.error(SUNDAY_BLOCK_MESSAGE); return; }
        localDirtyRef.current = true; initialSyncRef.current = true;
        setIsDirty(true);
        const updated = { ...attendanceRecords };
        unmarkedStudents.forEach(s => { updated[s.id] = { status: AttendanceStatus.Hadir, note: '' }; });
        setAttendanceRecords(updated);
    };

    const handleApplyTemplate = (template: { defaultStatus: AttendanceStatus; applyToAll: boolean }) => {
        if (!students.length) return;
        if (isSaving) { toast.warning('Tunggu sampai proses simpan selesai.'); return; }
        localDirtyRef.current = true; initialSyncRef.current = true;
        setIsDirty(true);
        const uc = template.applyToAll ? students.length : students.filter(s => !attendanceRecords[s.id]?.status).length;
        const updated = { ...attendanceRecords };
        students.forEach(s => { if (template.applyToAll || !updated[s.id]?.status) updated[s.id] = { ...updated[s.id], status: template.defaultStatus, note: updated[s.id]?.note || '' }; });
        setAttendanceRecords(updated);
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
            localDirtyRef.current = false; setIsDirty(false); setAttendanceRecords({}); setIsResetModalOpen(false);
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

    const performSave = async (recordsOverride?: Record<string, AttendanceRecord>): Promise<AttendanceSaveResult> => {
        if (!user || !students.length || isSaving || saveLock.current) return 'failed';
        const records = { ...(recordsOverride || attendanceRecords) };
        if (!recordsOverride) {
            unmarkedStudents.forEach(s => { records[s.id] = { status: AttendanceStatus.Hadir, note: '' }; });
        }
        
        // Sunday attendance inflates presence stats; only an all-"Libur" day is allowed.
        if (isSundayDate(selectedDate) && Object.values(records).some(r => r.status && r.status !== AttendanceStatus.Libur)) {
            toast.error(SUNDAY_BLOCK_MESSAGE);
            return 'failed';
        }

        const withIds = Object.fromEntries(Object.entries(records).map(([id, r]) => [id, { ...r, id: r.id || crypto.randomUUID() }])) as Record<string, AttendanceRecord>;
        localDirtyRef.current = true;
        setIsDirty(true);
        setAttendanceRecords(withIds);
        
        const validIds = new Set(students.map(s => s.id));
        const semId = getSemesterByDate(selectedDate)?.id || selectedSemesterId || activeSemester?.id || null;
        
        // No id in the payload: existing rows keep theirs, new rows get the DB default.
        const toUpsert = Object.entries(withIds).filter(([sid]) => validIds.has(sid)).map(([sid, r]) => ({
            student_id: sid, date: selectedDate, status: r.status, teacher_status: r.status,
            teacher_id: user.id, notes: r.note, user_id: user.id, semester_id: semId, deleted_at: null,
        }));
        
        if (toUpsert.length === 0) { toast.warning('Tidak ada siswa valid.'); return 'failed'; }
        saveLock.current = true;
        try {
            const result = await saveAsync({ records: toUpsert, queryKey: ['attendanceData', user.id, selectedClass, selectedDate] });
            return result.synced ? 'saved' : 'queued';
        } catch {
            return 'failed';
        } finally {
            saveLock.current = false;
        }
    };

    const handleSave = (): Promise<AttendanceSaveResult | null> => {
        if (confirmation.current) return confirmation.current.promise;
        if (!user || !students.length || isSaving || saveLock.current) return Promise.resolve('failed');
        if (isSundayDate(selectedDate) && unmarkedStudents.length > 0) { toast.error(SUNDAY_BLOCK_MESSAGE); return Promise.resolve('failed'); }
        if (unmarkedStudents.length > 0) {
            let resolve!: (result: AttendanceSaveResult | null) => void;
            const promise = new Promise<AttendanceSaveResult | null>(done => { resolve = done; });
            confirmation.current = { promise, resolve, save: () => performSave() };
            setIsSaveConfirmOpen(true);
            return promise;
        }
        return performSave();
    };
    const cancelSave = () => {
        confirmation.current?.resolve(null);
        confirmation.current = null;
        setIsSaveConfirmOpen(false);
    };
    const confirmSave = async () => {
        const pending = confirmation.current;
        if (!pending) return;
        confirmation.current = null;
        setIsSaveConfirmOpen(false);
        pending.resolve(await pending.save());
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
        confirmSave,
        cancelSave,
        handleSave
    };
};
