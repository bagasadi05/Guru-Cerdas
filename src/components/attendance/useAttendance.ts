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

    // Semester filter - default to active semester
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

    // Initialize selectedSemesterId when activeSemester loads
    useEffect(() => {
        if (activeSemester && !selectedSemesterId) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const selectedSemester = useMemo(() => {
        if (!selectedSemesterId) return null;
        return semesters.find(semester => semester.id === selectedSemesterId) || null;
    }, [semesters, selectedSemesterId]);

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [calendarMonth, setCalendarMonth] = useState<string>(selectedDate.slice(0, 7));

    // Ensure selectedDate stays within semester bounds
    useEffect(() => {
        if (!selectedSemester) return;
        if (selectedDate < selectedSemester.start_date || selectedDate > selectedSemester.end_date) {
            setSelectedDate(selectedSemester.start_date);
        }
    }, [selectedDate, selectedSemester]);

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

    useEffect(() => {
        setCalendarMonth(selectedDate.slice(0, 7));
    }, [selectedDate]);

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    const { data: classes = [], isLoading: isLoadingClasses, error: classesError, refetch: refetchClasses } = useQuery({
        queryKey: ['classes', 'attendance', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name, user_id')
                .is('deleted_at', null)
                .eq('is_archived', false);
            if (error) throw error;
            return (data || []) as unknown as ClassRow[];
        },
        enabled: !!user,
    });

    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['attendanceAssignments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);

            if (error) throw error;
            return (data || []) as TeacherClassAssignmentRow[];
        },
        enabled: !!user,
    });

    const attendanceClasses = useMemo(() => {
        if (!classes || !user) return [];
        if (isAdmin) return classes;
        return classes.filter((classRow) => {
            if (classRow.user_id === user.id) return true;
            return teacherAssignments.some(a => 
                a.class_id === classRow.id 
                && (!selectedSemesterId || a.semester_id === selectedSemesterId)
            );
        });
    }, [classes, teacherAssignments, user, isAdmin, selectedSemesterId]);

    useEffect(() => {
        if (attendanceClasses.length === 0) {
            if (selectedClass) {
                setSelectedClass('');
            }
            return;
        }

        const selectedClassStillAvailable = attendanceClasses.some((classRow) => classRow.id === selectedClass);
        if (!selectedClassStillAvailable) {
            setSelectedClass(attendanceClasses[0].id);
        }
    }, [attendanceClasses, selectedClass]);

    const { data: students = [], isLoading: isLoadingStudents, error: studentsError, refetch: refetchStudents } = useQuery({
        queryKey: ['studentsForAttendance', user?.id, selectedClass],
        queryFn: async () => {
            if (!selectedClass || !user) return [];
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('id, name, class_id, user_id, gender, avatar_url')
                .eq('class_id', selectedClass)
                .is('deleted_at', null)
                .order('name', { ascending: true });
            if (studentsError) throw studentsError;
            return (studentsData || []) as unknown as StudentRow[];
        },
        enabled: !!selectedClass && !!user,
        staleTime: 0,
    });

    const { data: existingAttendance, isSuccess: hasLoadedAttendance } = useQuery({
        queryKey: ['attendanceData', user?.id, selectedClass, selectedDate],
        queryFn: async () => {
            if (!user || !students || students.length === 0) return {};
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('id, student_id, status, notes, official_status, teacher_id')
                .eq('date', selectedDate)
                .in('student_id', students.map((student) => student.id))
                .is('deleted_at', null);

            if (attendanceError) throw attendanceError;
            return (attendanceData || []).reduce<Record<string, AttendanceRecord>>((acc, record: any) => {
                acc[record.student_id] = { id: record.id, status: record.status as AttendanceStatus, note: record.notes || '' };
                return acc;
            }, {});
        },
        enabled: !!user && !!selectedClass && !!selectedDate && !!students && students.length > 0,
    });

    // Drafts belong to exactly one teacher, class, and date. Never let an
    // unsaved draft from a previous context appear in or save into a new one.
    useEffect(() => {
        const nextContext = `${user?.id || ''}:${selectedClass}:${selectedDate}`;
        if (attendanceContextRef.current === nextContext) return;

        attendanceContextRef.current = nextContext;
        initialSyncRef.current = false;
        localDirtyRef.current = false;
        setAttendanceRecords({});
        setSelectedStudents(new Set());
    }, [user?.id, selectedClass, selectedDate]);

    // Sync DB→state only once per class/date. A response that arrives after
    // a quick action must not overwrite the teacher's local changes.
    useEffect(() => {
        if (initialSyncRef.current || !hasLoadedAttendance) return;

        initialSyncRef.current = true;
        if (!localDirtyRef.current) {
            const records = existingAttendance || {};
            setAttendanceRecords(records);
        }
    }, [existingAttendance, hasLoadedAttendance, students]);

    const calendarRange = useMemo(() => {
        const [year, monthNum] = calendarMonth.split('-').map(Number);
        if (!year || !monthNum) return null;
        const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}`;
        if (!selectedSemester) return { start: monthStart, end: monthEnd };

        const start = monthStart < selectedSemester.start_date ? selectedSemester.start_date : monthStart;
        const end = monthEnd > selectedSemester.end_date ? selectedSemester.end_date : monthEnd;
        if (start > end) return null;
        return { start, end };
    }, [calendarMonth, selectedSemester]);

    const { data: calendarAttendance = [] } = useQuery({
        queryKey: ['attendanceCalendar', user?.id, selectedClass, calendarRange?.start, calendarRange?.end],
        queryFn: async () => {
            if (!user || !calendarRange || !students || students.length === 0) return [];
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, date, status')
                .in('student_id', students.map((student) => student.id))
                .gte('date', calendarRange.start)
                .lte('date', calendarRange.end)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as unknown as AttendanceRow[];
        },
        enabled: !!user && !!selectedClass && !!calendarRange && !!students && students.length > 0,
    });

    const { mutate: saveAttendance, isPending: isSaving } = useMutation<
        { synced: boolean },
        Error,
        (AttendanceInsert & { id?: string })[],
        { previousAttendance: Record<string, AttendanceRecord> | undefined }
    >({
        mutationFn: async (recordsToUpsert: (AttendanceInsert & { id?: string })[]) => {
            if (isOnline) {
                const { error } = await supabase.from('attendance').upsert(recordsToUpsert);
                if (error) throw error;
                const queued = wasLastResponseQueued();
                return { synced: !queued };
            } else {
                await addToQueue({
                    table: 'attendance',
                    operation: 'upsert',
                    payload: recordsToUpsert as Record<string, unknown>[],
                });
                return { synced: false };
            }
        },
        onMutate: async (recordsToUpsert) => {
            await queryClient.cancelQueries({ queryKey: ['attendanceData', user?.id, selectedClass, selectedDate] });
            const previousAttendance = queryClient.getQueryData<Record<string, AttendanceRecord>>(['attendanceData', user?.id, selectedClass, selectedDate]);
            queryClient.setQueryData(['attendanceData', user?.id, selectedClass, selectedDate], (old: Record<string, AttendanceRecord> = {}) => {
                const newData = { ...old };
                recordsToUpsert.forEach(record => {
                    if (record.student_id) {
                        newData[record.student_id] = { id: record.id, status: record.status as AttendanceStatus, note: record.notes || '' };
                    }
                });
                return newData;
            });
            return { previousAttendance };
        },
        onError: (err: Error, newRecords, context) => {
            queryClient.setQueryData(['attendanceData', user?.id, selectedClass, selectedDate], context?.previousAttendance);
            if (err.message?.includes('foreign key constraint')) {
                toast.error('Data siswa telah diperbarui. Memuat ulang daftar siswa terbaru...');
                queryClient.invalidateQueries({ queryKey: ['students'] });
                queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
            } else {
                toast.error(`Gagal menyimpan absensi: ${err.message}`);
            }
        },
        onSuccess: (data, variables) => {
            if (data.synced) {
                toast.success('Absensi berhasil disimpan!');

                // Check if all students are present for confetti celebration
                const allPresent = variables.every(record => record.status === 'Hadir');
                if (allPresent && variables.length > 0) {
                    setTimeout(() => {
                        triggerPerfectAttendanceConfetti();
                    }, 300);
                } else {
                    triggerSubtleConfetti();
                }
            } else {
                toast.info('Absensi disimpan offline. Akan disinkronkan saat kembali online.');
            }
        },
        onSettled: () => {
            localDirtyRef.current = false;
            // Removed queryClient.invalidateQueries for attendanceData to prevent UI flickering 
            // after save. The cache is already optimistically updated in onMutate, and local 
            // state handles the immediate UI update.
            queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        },
    });

    const attendanceSummary = useMemo(() => {
        const summary = statusOptions.reduce((acc, opt) => ({ ...acc, [opt.value]: 0 }), {} as Record<AttendanceStatus, number>);
        Object.values(attendanceRecords).forEach((record: AttendanceRecord) => {
            summary[record.status]++;
        });
        return summary;
    }, [attendanceRecords]);



    const unmarkedStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student => !attendanceRecords[student.id]?.status);
    }, [students, attendanceRecords]);

    const filteredStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student => student.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()));
    }, [students, deferredSearchQuery]);

    const calendarSummaryRecords = useMemo(() => {
        const grouped = new Map<string, AttendanceStatus[]>();
        calendarAttendance.forEach((record: AttendanceRow) => {
            const list = grouped.get(record.date) || [];
            list.push(record.status as AttendanceStatus);
            grouped.set(record.date, list);
        });

        const priority = [
            AttendanceStatus.Alpha,
            AttendanceStatus.Sakit,
            AttendanceStatus.Izin,
            AttendanceStatus.Hadir,
            AttendanceStatus.Libur,
        ];

        return Array.from(grouped.entries()).map(([date, statuses]) => {
            const counts: Record<AttendanceStatus, number> = {
                [AttendanceStatus.Hadir]: 0,
                [AttendanceStatus.Izin]: 0,
                [AttendanceStatus.Sakit]: 0,
                [AttendanceStatus.Alpha]: 0,
                [AttendanceStatus.Libur]: 0,
            };

            statuses.forEach((status) => {
                counts[status] += 1;
            });

            const nonLiburCount = statuses.filter(status => status !== AttendanceStatus.Libur).length;
            if (nonLiburCount === 0) {
                return { date, status: AttendanceStatus.Libur };
            }

            let selectedStatus = AttendanceStatus.Hadir;
            let maxCount = -1;
            priority.forEach((status) => {
                const count = status === AttendanceStatus.Libur ? 0 : counts[status];
                if (count > maxCount) {
                    maxCount = count;
                    selectedStatus = status;
                }
            });

            return { date, status: selectedStatus };
        });
    }, [calendarAttendance]);

    const isHomeroom = useMemo(() => {
        if (!selectedClass || teacherAssignments.length === 0) return false;
        return teacherAssignments.some(a => a.class_id === selectedClass && a.assignment_role === 'homeroom');
    }, [selectedClass, teacherAssignments]);

    // === Sub-hooks ===
    const {
        attendanceStreaks,
        attendanceHistory,
    } = useAttendanceStreaks(user, students, selectedDate, selectedSemester, selectedClass);

    const aiApi = useAttendanceAI(selectedClass, students, attendanceHistory);

    // Export hook needs attendanceClasses, so we call it after it's defined
    const exportApi = useAttendanceExport(user, attendanceClasses, semesters, activeSemester);

    const handleSaveNote = () => {
        if (selectedStudents.size === 0) return;
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }

        localDirtyRef.current = true;
        const updatedRecords = { ...attendanceRecords };
        Array.from(selectedStudents).forEach(studentId => {
            const currentStatus = updatedRecords[studentId]?.status || 'Izin';
            updatedRecords[studentId] = {
                ...updatedRecords[studentId],
                status: currentStatus,
                note: noteText,
            };
        });
        setAttendanceRecords(updatedRecords);
        setSelectedStudents(new Set());
        setIsNoteModalOpen(false);
        setNoteText('');
        toast.success('Catatan berhasil disimpan');
    };

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }
        localDirtyRef.current = true;
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status, note: prev[studentId]?.note || '' }
        }));
    };

    const markRestAsPresent = () => {
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }
        
        localDirtyRef.current = true;
        initialSyncRef.current = true;

        // Update local state first for immediate UI response
        const updatedRecords = { ...attendanceRecords };
        unmarkedStudents.forEach(student => {
            updatedRecords[student.id] = { status: AttendanceStatus.Hadir, note: '' };
        });
        setAttendanceRecords(updatedRecords);
        
        // Trigger save directly
        performSave();
    };

    // Handle template application
    const handleApplyTemplate = (template: { defaultStatus: AttendanceStatus, applyToAll: boolean }) => {
        if (!students || students.length === 0) return;
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }

        localDirtyRef.current = true;
        initialSyncRef.current = true;

        const unmarkedCount = template.applyToAll
            ? students.length
            : students.filter(student => !attendanceRecords[student.id]?.status).length;
        const updatedRecords = { ...attendanceRecords };

        students.forEach(student => {
            if (template.applyToAll || !updatedRecords[student.id]?.status) {
                updatedRecords[student.id] = {
                    ...updatedRecords[student.id],
                    status: template.defaultStatus,
                    note: updatedRecords[student.id]?.note || '',
                };
            }
        });

        // Keep the visible state and query cache aligned so a delayed query
        // response cannot revert a quick-action selection.
        setAttendanceRecords(updatedRecords);
        queryClient.setQueryData(
            ['attendanceData', user?.id, selectedClass, selectedDate],
            updatedRecords,
        );

        if (template.applyToAll) {
            toast.success(`Semua siswa ditandai sebagai ${template.defaultStatus}`);
        } else if (unmarkedCount > 0) {
            toast.success(`${unmarkedCount} siswa ditandai sebagai ${template.defaultStatus}`);
        } else {
            toast.info('Semua siswa sudah memiliki status absensi');
        }
    };

    // Reset Attendance Mutation
    const { mutate: resetAttendance, isPending: isResetting } = useMutation<
        void,
        Error,
        void
    >({
        mutationFn: async () => {
            if (!user || !students || students.length === 0) throw new Error('Data tidak valid');

            const studentIds = students.map(s => s.id);
            const { error } = await supabase
                .from('attendance')
                .update({ deleted_at: new Date().toISOString() } as never)
                .eq('date', selectedDate)
                .in('student_id', studentIds);

            if (error) throw error;
        },
        onSuccess: () => {
            localDirtyRef.current = false;
            setAttendanceRecords({});
            setIsResetModalOpen(false);
            toast.success('Absensi berhasil direset! Semua data absensi untuk tanggal ini telah dihapus.');

            queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceCalendar'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items-all'] });
        },
        onError: (err: Error) => {
            toast.error(`Gagal mereset absensi: ${err.message}`);
        }
    });

    const handleResetAttendance = () => {
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }
        const hasAttendanceData = Object.values(attendanceRecords).some(record => record.status);
        if (!hasAttendanceData) {
            toast.warning('Tidak ada data absensi untuk direset pada tanggal ini.');
            return;
        }
        setIsResetModalOpen(true);
    };

    const confirmResetAttendance = () => {
        resetAttendance();
    };

    const performSave = () => {
        if (!user || !students || isSaving) return;

        const recordsToSave = { ...attendanceRecords };
        unmarkedStudents.forEach(student => {
            recordsToSave[student.id] = { status: AttendanceStatus.Hadir, note: '' };
        });

        const recordsWithIds = Object.fromEntries(
            Object.entries(recordsToSave).map(([studentId, record]) => [
                studentId,
                { ...record, id: record.id || crypto.randomUUID() },
            ]),
        ) as Record<string, AttendanceRecord>;
        setAttendanceRecords(recordsWithIds);

        const validStudentIds = new Set(students.map(s => s.id));
        const semesterIdForDate = getSemesterByDate(selectedDate)?.id || selectedSemesterId || activeSemester?.id || null;
        const recordsToUpsert = Object.entries(recordsWithIds)
            .filter(([student_id]) => validStudentIds.has(student_id))
            .map(([student_id, record]) => ({
                id: record.id!,
                student_id,
                date: selectedDate,
                status: record.status,
                teacher_status: record.status,
                teacher_id: user.id,
                notes: record.note,
                user_id: user.id,
                semester_id: semesterIdForDate,
            }));

        if (recordsToUpsert.length === 0) {
            toast.warning('Tidak ada siswa valid untuk disimpan. Silakan muat ulang halaman.');
            return;
        }

        saveAttendance(recordsToUpsert);
    };

    const handleSave = () => {
        if (!user || !students) return;
        if (unmarkedStudents.length > 0) {
            setIsSaveConfirmOpen(true);
            return;
        }
        performSave();
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        await exportApi.handleExport(format, schoolName);
    };

    return {
        user,
        today,
        yesterday,
        selectedSemesterId,
        setSelectedSemesterId,
        selectedSemester,
        selectedClass,
        setSelectedClass,
        selectedDate,
        setSelectedDate,
        calendarMonth,
        setCalendarMonth,
        attendanceRecords,
        setAttendanceRecords,
        selectedStudents,
        setSelectedStudents,
        isDatePickerOpen,
        setDatePickerOpen,
        isNoteModalOpen,
        setIsNoteModalOpen,
        noteText,
        setNoteText,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        ...exportApi,
        ...aiApi,
        isResetModalOpen,
        setIsResetModalOpen,
        classes,
        isLoadingClasses,
        classesError,
        refetchClasses,
        attendanceClasses,
        students,
        isLoadingStudents,
        studentsError,
        refetchStudents,
        saveAttendance,
        isSaving,
        resetAttendance,
        isResetting,
        attendanceSummary,
        unmarkedStudents,
        filteredStudents,
        calendarSummaryRecords,
        attendanceStreaks,
        handleSaveNote,
        handleStatusChange,
        markRestAsPresent,
        handleApplyTemplate,
        handleResetAttendance,
        confirmResetAttendance,
        handleSave,
        performSave,
        isSaveConfirmOpen,
        setIsSaveConfirmOpen,
        handleExport,
        isOnline,
        isHomeroom,
    };
};
export default useAttendance;
