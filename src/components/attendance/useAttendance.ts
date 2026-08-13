import { useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSemester } from '../../contexts/SemesterContext';
import { statusOptions } from '../../constants';
import { AttendanceStatus } from '../../types';

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

    useEffect(() => { 
        if (activeSemester && !state.selectedSemesterId) {
            state.setSelectedSemesterId(activeSemester.id); 
        }
    }, [activeSemester, state.selectedSemesterId, state.setSelectedSemesterId]);

    const selectedSemester = useMemo(() => {
        if (!state.selectedSemesterId) return null;
        return semesters.find(s => s.id === state.selectedSemesterId) || null;
    }, [semesters, state.selectedSemesterId]);

    useEffect(() => { 
        if (selectedSemester && (state.selectedDate < selectedSemester.start_date || state.selectedDate > selectedSemester.end_date)) {
            state.setSelectedDate(selectedSemester.start_date); 
        }
    }, [state.selectedDate, selectedSemester, state.setSelectedDate]);

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
    });

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
    };
};

export default useAttendance;
