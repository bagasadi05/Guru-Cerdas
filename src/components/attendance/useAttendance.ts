import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSemester } from '../../contexts/SemesterContext';
import { statusOptions } from '../../constants';
import { AttendanceStatus } from '../../types';
import { queryKeys } from '../../lib/queryKeys';
import { attendanceAutoFillService, type MissingWeekday } from '../../services/attendanceAutoFillService';

import { useAttendanceState } from './hooks/useAttendanceState';
import { useAttendanceData } from './hooks/useAttendanceData';
import { useAttendanceActions } from './hooks/useAttendanceActions';
import { useAttendanceStreaks } from './useAttendanceStreaks';
import { useAttendanceAI } from './useAttendanceAI';
import { useAttendanceExport } from './useAttendanceExport';

export const useAttendance = () => {
    const { user, isAdmin } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const { schoolName } = useUserSettings();
    const { activeSemester, getSemesterByDate, semesters } = useSemester();

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    const state = useAttendanceState(today);
    const {
        selectedSemesterId,
        setSelectedSemesterId,
        selectedDate,
        setSelectedDate,
        selectedClass,
    } = state;

    useEffect(() => { 
        if (activeSemester && !selectedSemesterId) {
            setSelectedSemesterId(activeSemester.id); 
        }
    }, [activeSemester, selectedSemesterId, setSelectedSemesterId]);

    const selectedSemester = useMemo(() => {
        if (!selectedSemesterId) return null;
        return semesters.find(s => s.id === selectedSemesterId) || null;
    }, [semesters, selectedSemesterId]);

    useEffect(() => { 
        if (selectedSemester && (selectedDate < selectedSemester.start_date || selectedDate > selectedSemester.end_date)) {
            setSelectedDate(selectedSemester.start_date); 
        }
    }, [selectedDate, selectedSemester, setSelectedDate]);

    const data = useAttendanceData({
        user,
        isAdmin,
        selectedSemesterId: state.selectedSemesterId,
        selectedSemester,
        selectedClass: state.selectedClass,
        setSelectedClass: state.setSelectedClass,
        selectedDate: state.selectedDate,
        calendarMonth: state.calendarMonth,
        setAttendanceRecords: state.setAttendanceRecords,
        setSelectedStudents: state.setSelectedStudents,
        setIsDirty: state.setIsDirty,
    });

    const attendanceSummary = useMemo(() => {
        const s = statusOptions.reduce((acc, o) => ({ ...acc, [o.value]: 0 }), {} as Record<AttendanceStatus, number>);
        Object.values(state.attendanceRecords).forEach(r => { if (r.status) s[r.status]++; });
        return s;
    }, [state.attendanceRecords]);

    const unmarkedStudents = useMemo(() => 
        data.students.filter(s => !state.attendanceRecords[s.id]?.status), 
    [data.students, state.attendanceRecords]);

    const filteredStudents = useMemo(() => 
        data.students.filter(s => s.name.toLowerCase().includes(state.deferredSearchQuery.toLowerCase())), 
    [data.students, state.deferredSearchQuery]);

    const calendarSummaryRecords = useMemo(() => {
        const g = new Map<string, AttendanceStatus[]>();
        data.calendarAttendance.forEach((r: any) => { 
            const l = g.get(r.date) || []; 
            l.push(r.status as AttendanceStatus); 
            g.set(r.date, l); 
        });
        const priority = [AttendanceStatus.Alpha, AttendanceStatus.Sakit, AttendanceStatus.Izin, AttendanceStatus.Hadir, AttendanceStatus.Libur];
        return Array.from(g.entries()).map(([date, statuses]) => {
            const c: Record<string, number> = {}; 
            statuses.forEach(s => c[s] = (c[s] || 0) + 1);
            if (statuses.filter(s => s !== AttendanceStatus.Libur).length === 0) return { date, status: AttendanceStatus.Libur };
            let sel = AttendanceStatus.Hadir, max = -1;
            priority.forEach(s => { 
                const n = s === AttendanceStatus.Libur ? 0 : (c[s] || 0); 
                if (n > max) { max = n; sel = s; } 
            });
            return { date, status: sel };
        });
    }, [data.calendarAttendance]);

    const isHomeroom = useMemo(() => 
        !!state.selectedClass && data.teacherAssignments.some(a => a.class_id === state.selectedClass && a.assignment_role === 'homeroom'), 
    [state.selectedClass, data.teacherAssignments]);

    const { attendanceStreaks, attendanceHistory } = useAttendanceStreaks(user, data.students, state.selectedDate, selectedSemester, state.selectedClass);
    const aiApi = useAttendanceAI(state.selectedClass, data.students, attendanceHistory);
    const exportApi = useAttendanceExport(user, data.attendanceClasses, semesters, activeSemester);

    const actions = useAttendanceActions({
        user,
        selectedClass: state.selectedClass,
        selectedDate: state.selectedDate,
        students: data.students,
        attendanceRecords: state.attendanceRecords,
        setAttendanceRecords: state.setAttendanceRecords,
        selectedStudents: state.selectedStudents,
        setSelectedStudents: state.setSelectedStudents,
        noteText: state.noteText,
        setNoteText: state.setNoteText,
        setIsNoteModalOpen: state.setIsNoteModalOpen,
        unmarkedStudents,
        isOnline,
        localDirtyRef: data.localDirtyRef,
        initialSyncRef: data.initialSyncRef,
        toast,
        getSemesterByDate,
        selectedSemesterId: state.selectedSemesterId,
        activeSemester,
        setIsResetModalOpen: state.setIsResetModalOpen,
        setIsSaveConfirmOpen: state.setIsSaveConfirmOpen,
        setIsDirty: state.setIsDirty,
    });

    const queryClient = useQueryClient();
    const [missingWeekdays, setMissingWeekdays] = useState<MissingWeekday[]>([]);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isAssistantDismissed, setIsAssistantDismissed] = useState(false);

    // Reset dismissed state if class changes
    useEffect(() => {
        setIsAssistantDismissed(false);
    }, [selectedClass]);

    const { students } = data;
    const studentIdsKey = useMemo(() => (students || []).map(s => s.id).sort().join(','), [students]);

    const checkMissingWeekdays = useCallback(async () => {
        if (!selectedClass || !students || students.length === 0) {
            setMissingWeekdays(prev => (prev.length > 0 ? [] : prev));
            return;
        }
        try {
            const studentIds = students.map(s => s.id);
            const missing = await attendanceAutoFillService.getMissingWeekdaysForClass(
                selectedClass,
                studentIds,
                today
            );
            setMissingWeekdays(missing);
        } catch (err) {
            console.warn('Failed to check missing weekdays:', err);
        }
    }, [selectedClass, students, today]);

    useEffect(() => {
        if (!selectedClass || !students || students.length === 0) {
            setMissingWeekdays(prev => (prev.length > 0 ? [] : prev));
            return;
        }

        let isMounted = true;
        const studentIds = students.map(s => s.id);
        attendanceAutoFillService.getMissingWeekdaysForClass(
            selectedClass,
            studentIds,
            today
        ).then(missing => {
            if (isMounted) {
                setMissingWeekdays(missing);
            }
        }).catch(err => {
            console.warn('Failed to check missing weekdays:', err);
        });

        return () => {
            isMounted = false;
        };
    }, [selectedClass, studentIdsKey, students, today]);

    const handleAutoFillWeekdays = useCallback(async (targetDate?: string) => {
        if (!state.selectedClass) return;
        setIsAutoFilling(true);
        try {
            const res = await attendanceAutoFillService.autoFillWeeklyAttendance({
                classId: state.selectedClass,
                targetDate: targetDate || state.selectedDate,
                notes: '[Auto-fill Cepat: Hadir]',
            });
            toast.success(`Berhasil mengisi ${res.total_inserted} data kehadiran sebagai Hadir!`);
            await queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
            await queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] });
            await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
            await checkMissingWeekdays();
        } catch (err: any) {
            console.error('Auto-fill failed:', err);
            toast.error(err.message || 'Gagal mengisi absensi otomatis');
        } finally {
            setIsAutoFilling(false);
        }
    }, [state.selectedClass, state.selectedDate, toast, queryClient, checkMissingWeekdays]);

    const isCurrentDateAutoFilled = useMemo(() => {
        return attendanceAutoFillService.isDateAutoFilled(state.attendanceRecords);
    }, [state.attendanceRecords]);

    const handleExport = async (format: 'pdf' | 'excel') => { 
        await exportApi.handleExport(format, schoolName); 
    };

    return {
        user, today, yesterday,
        ...state,
        selectedSemester,
        ...data,
        ...actions,
        ...exportApi, 
        ...aiApi,
        attendanceSummary, 
        unmarkedStudents, 
        filteredStudents,
        calendarSummaryRecords, 
        attendanceStreaks,
        handleExport, 
        isOnline, 
        isHomeroom,
        missingWeekdays,
        isAutoFilling,
        isAssistantDismissed,
        setIsAssistantDismissed,
        handleAutoFillWeekdays,
        isCurrentDateAutoFilled,
        checkMissingWeekdays,
    };
};

export default useAttendance;
