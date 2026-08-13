import { useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { type TeacherClassAssignmentRow } from '../../../services/teacherAssignments';
import { AttendanceRecord, AttendanceStatus, StudentRow, ClassRow, AttendanceRow } from '../../../types';

interface UseAttendanceDataProps {
    user: any;
    isAdmin: boolean;
    selectedSemesterId: string | null;
    selectedSemester: any;
    selectedClass: string;
    setSelectedClass: (id: string) => void;
    selectedDate: string;
    calendarMonth: string;
    setAttendanceRecords: (records: Record<string, AttendanceRecord>) => void;
    setSelectedStudents: (students: Set<string>) => void;
}

export const useAttendanceData = ({
    user,
    isAdmin,
    selectedSemesterId,
    selectedSemester,
    selectedClass,
    setSelectedClass,
    selectedDate,
    calendarMonth,
    setAttendanceRecords,
    setSelectedStudents,
}: UseAttendanceDataProps) => {
    const initialSyncRef = useRef(false);
    const localDirtyRef = useRef(false);
    const attendanceContextRef = useRef<string>('');

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
    }, [attendanceClasses, selectedClass, setSelectedClass]);

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
    }, [user?.id, selectedClass, selectedDate, setAttendanceRecords, setSelectedStudents]);

    useEffect(() => {
        if (initialSyncRef.current || !hasLoadedAttendance) return;
        initialSyncRef.current = true;
        if (!localDirtyRef.current) setAttendanceRecords(existingAttendance || {});
    }, [existingAttendance, hasLoadedAttendance, students, setAttendanceRecords]);

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

    return {
        classes, isLoadingClasses, classesError, refetchClasses,
        teacherAssignments,
        attendanceClasses,
        students, isLoadingStudents, studentsError, refetchStudents,
        calendarRange,
        calendarAttendance,
        initialSyncRef,
        localDirtyRef,
        hasLoadedAttendance,
    };
};
