import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { generateOpenRouterJson } from '../../services/openRouterService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { addToQueue } from '../../services/offlineQueue';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSemester } from '../../contexts/SemesterContext';
import { queryKeys } from '../../lib/queryKeys';
import { hasHomeroomAssignment, type TeacherClassAssignmentRow } from '../../services/teacherAssignments';
import { AttendanceRecord, AttendanceStatus, AttendanceInsert, AiAnalysis, StudentRow, ClassRow, AttendanceRow } from '../../types';
import { statusOptions } from '../../constants';
import { getAutoTable, getJsPDF, getXLSX } from '../../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../../utils/pdfHeaderUtils';
import { triggerPerfectAttendanceConfetti, triggerSubtleConfetti } from '../../utils/confetti';
import { type AttendanceViewMode } from './attendanceMenuConfig';

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

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedExportClass, setSelectedExportClass] = useState<string>('all');
    const [exportPeriod, setExportPeriod] = useState<'monthly' | 'semester'>('monthly');
    const [exportSemesterId, setExportSemesterId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (activeSemester && !exportSemesterId) {
            setExportSemesterId(activeSemester.id);
        }
    }, [activeSemester, exportSemesterId]);

    useEffect(() => {
        setCalendarMonth(selectedDate.slice(0, 7));
    }, [selectedDate]);

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<AiAnalysis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
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
                .select('id, name, class_id, user_id')
                .eq('class_id', selectedClass)
                .is('deleted_at', null)
                .order('name', { ascending: true });
            if (studentsError) throw studentsError;
            return (studentsData || []) as unknown as StudentRow[];
        },
        enabled: !!selectedClass && !!user
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
            setAttendanceRecords(existingAttendance || {});
        }
    }, [existingAttendance, hasLoadedAttendance]);

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
                return { synced: true };
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
            toast.error(`Gagal menyimpan absensi: ${err.message}`);
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
            queryClient.invalidateQueries({ queryKey: ['attendanceData', user?.id, selectedClass, selectedDate] });
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

    const handleSaveNote = () => {
        if (selectedStudents.size === 0) return;
        if (isSaving) {
            toast.warning('Tunggu sampai proses simpan selesai.');
            return;
        }

        const studentsWithStatus = Array.from(selectedStudents).filter(studentId => attendanceRecords[studentId]?.status);
        if (studentsWithStatus.length === 0) {
            toast.warning('Pilih status absensi siswa terlebih dahulu sebelum menambahkan catatan.');
            return;
        }

        localDirtyRef.current = true;
        const updatedRecords = { ...attendanceRecords };
        studentsWithStatus.forEach(studentId => {
            updatedRecords[studentId] = { ...updatedRecords[studentId], note: noteText };
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
        
        // Update local state first for immediate UI response
        const updatedRecords = { ...attendanceRecords };
        unmarkedStudents.forEach(student => {
            updatedRecords[student.id] = { status: AttendanceStatus.Hadir, note: '' };
        });
        setAttendanceRecords(updatedRecords);
        
        // Trigger save directly
        performSave();
    };

    const streakRange = useMemo(() => {
        if (selectedSemester) {
            return { start: selectedSemester.start_date, end: selectedSemester.end_date };
        }
        const end = selectedDate;
        const startDate = new Date(`${selectedDate}T00:00:00`);
        startDate.setDate(startDate.getDate() - 30);
        const start = startDate.toISOString().split('T')[0];
        return { start, end };
    }, [selectedDate, selectedSemester]);

    const { data: attendanceHistory = [] } = useQuery({
        queryKey: ['attendanceHistory', user?.id, selectedClass, streakRange.start, streakRange.end],
        queryFn: async () => {
            if (!user || !students || students.length === 0) return [];
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, date, status')
                .gte('date', streakRange.start)
                .lte('date', streakRange.end)
                .in('student_id', students.map(student => student.id))
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as unknown as AttendanceRow[];
        },
        enabled: !!user && !!students && students.length > 0,
    });

    // Calculate attendance streaks with real historical data
    const attendanceStreaks = useMemo(() => {
        if (!students || students.length === 0 || attendanceHistory.length === 0) return [];

        const recordsByStudent = new Map<string, AttendanceRow[]>();
        attendanceHistory.forEach((record: AttendanceRow) => {
            const list = recordsByStudent.get(record.student_id) || [];
            list.push(record);
            recordsByStudent.set(record.student_id, list);
        });

        const parseDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);
        const dateKey = (date: Date) => date.toISOString().split('T')[0];

        return students
            .map((student) => {
                const records = recordsByStudent.get(student.id) || [];
                if (records.length === 0) return null;

                records.sort((a, b) => a.date.localeCompare(b.date));

                const total = records.length;
                const presentCount = records.filter(record => record.status === AttendanceStatus.Hadir).length;
                const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

                let longestStreak = 0;
                let currentRun = 0;
                let prevDate: Date | null = null;
                let prevWasPresent = false;

                records.forEach((record) => {
                    const currentDate = parseDate(record.date);
                    const isPresent = record.status === AttendanceStatus.Hadir;
                    const isConsecutive = prevDate
                        ? (currentDate.getTime() - prevDate.getTime()) / 86400000 === 1
                        : false;

                    if (isPresent) {
                        if (prevWasPresent && isConsecutive) {
                            currentRun += 1;
                        } else {
                            currentRun = 1;
                        }
                        longestStreak = Math.max(longestStreak, currentRun);
                    } else {
                        currentRun = 0;
                    }

                    prevDate = currentDate;
                    prevWasPresent = isPresent;
                });

                const statusByDate = new Map<string, AttendanceStatus>();
                records.forEach((record) => {
                    statusByDate.set(record.date, record.status as AttendanceStatus);
                });

                let currentStreak = 0;
                const cursor = parseDate(selectedDate);
                while (true) {
                    const status = statusByDate.get(dateKey(cursor));
                    if (status !== AttendanceStatus.Hadir) break;
                    currentStreak += 1;
                    cursor.setDate(cursor.getDate() - 1);
                }

                return {
                    studentId: student.id,
                    studentName: student.name,
                    currentStreak,
                    longestStreak,
                    attendanceRate,
                };
            })
            .filter((streak): streak is NonNullable<typeof streak> => Boolean(streak));
    }, [attendanceHistory, selectedDate, students]);

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

        const semesterIdForDate = getSemesterByDate(selectedDate)?.id || selectedSemesterId || activeSemester?.id || null;
        const recordsToUpsert = Object.entries(recordsWithIds).map(([student_id, record]) => ({
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

    const fetchAttendanceDataForExport = async () => {
        if (!user) return null;
        let startDate, endDate;

        if (exportPeriod === 'monthly') {
            const [year, monthNum] = exportMonth.split('-').map(Number);
            startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
            endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}`;
        } else {
            const semester = semesters.find(s => s.id === exportSemesterId);
            if (!semester) throw new Error('Semester tidak valid');
            startDate = semester.start_date;
            endDate = semester.end_date;
        }

        const exportClasses = selectedExportClass === 'all'
            ? attendanceClasses
            : attendanceClasses.filter((classRow) => classRow.id === selectedExportClass);

        if (exportClasses.length === 0) {
            return { students: [], attendance: [], classes: [] };
        }

        const classIds = exportClasses.map((classRow) => classRow.id);

        const [studentsRes, attendanceRes] = await Promise.all([
            supabase
                .from('students')
                .select('id, name, class_id, user_id')
                .in('class_id', classIds)
                .is('deleted_at', null),
            supabase
                .from('attendance')
                .select('student_id, date, status')
                .gte('date', startDate)
                .lte('date', endDate)
                .is('deleted_at', null),
        ]);

        if (studentsRes.error || attendanceRes.error) throw new Error('Gagal mengambil data untuk ekspor.');

        const classRows = exportClasses;
        const studentRows = (studentsRes.data || []) as unknown as StudentRow[];
        const attendanceRows = (attendanceRes.data || []) as unknown as AttendanceRow[];
        const classMap = new Map(classRows.map(c => [c.id, { name: c.name }]));
        const studentsWithClasses = studentRows.map((s: StudentRow) => ({
            ...s,
            classes: s.class_id ? (classMap.get(s.class_id) || null) : null
        }));

        return { students: studentsWithClasses, attendance: attendanceRows, classes: classRows };
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        setIsExporting(true);
        toast.info(`Membuat laporan ${format.toUpperCase()}...`);
        try {
            const data = await fetchAttendanceDataForExport();
            if (!data || !data.students || data.students.length === 0) {
                toast.warning("Tidak ada data untuk periode yang dipilih.");
                return;
            }

            const { students, attendance, classes } = data;

            let exportTitle = '';
            if (exportPeriod === 'monthly') {
                const [year, monthNum] = exportMonth.split('-').map(Number);
                const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
                exportTitle = `Absensi ${monthName} ${year}`;
            } else {
                const semester = semesters.find(s => s.id === exportSemesterId);
                exportTitle = `Absensi Semester ${semester?.semester_number === 1 ? 'Ganjil' : 'Genap'} ${semester?.academic_years?.name || ''}`;
            }

            let studentsByClass = classes.map((c: ClassRow) => ({
                ...c,
                students: students.filter((s: StudentRow) => s.class_id === c.id).sort((a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name))
            })).filter((c) => c.students.length > 0);

            if (selectedExportClass !== 'all') {
                studentsByClass = studentsByClass.filter((c: ClassRow) => c.id === selectedExportClass);
            }

            if (exportPeriod === 'monthly' && format === 'pdf') {
                await ensureLogosLoaded();
                const [year, monthNum] = exportMonth.split('-').map(Number);
                const daysInMonth = new Date(year, monthNum, 0).getDate();
                const _monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });

                const { default: jsPDF } = await getJsPDF();
                const { default: autoTable } = await getAutoTable();
                const doc = new jsPDF({ orientation: 'landscape' });
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                let isFirstClass = true;

                for (const classData of studentsByClass) {
                    if (!isFirstClass) doc.addPage('landscape');
                    isFirstClass = false;

                    const titleText = `REKAPITULASI KEHADIRAN SISWA - KELAS ${classData.name.toUpperCase()}`;
                    const subText = `${exportTitle.toUpperCase()} • KKM: ${schoolName || '-'}`;
                    const headerY = addPdfHeader(doc, { schoolName, orientation: 'landscape' });
                    const pageWidthHeader = doc.internal.pageSize.getWidth();
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(titleText, pageWidthHeader / 2, headerY, { align: 'center' });
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(subText, pageWidthHeader / 2, headerY + 5, { align: 'center' });

                    const attendanceMap = new Map<string, Map<string, AttendanceStatus>>();
                    attendance.forEach((r: AttendanceRow) => {
                        const stdMap = attendanceMap.get(r.student_id) || new Map<string, AttendanceStatus>();
                        stdMap.set(r.date, r.status as AttendanceStatus);
                        attendanceMap.set(r.student_id, stdMap);
                    });

                    const headers = ['No', 'Nama Siswa'];
                    for (let day = 1; day <= daysInMonth; day++) {
                        headers.push(String(day));
                    }
                    headers.push('H', 'S', 'I', 'A');

                    const rows = classData.students.map((student: StudentRow, index: number) => {
                        const stdMap = attendanceMap.get(student.id);
                        const rowData: string[] = [String(index + 1), student.name];
                        let h = 0, s = 0, izin = 0, a = 0;

                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const status = stdMap?.get(dateStr);
                            if (status === 'Hadir') {
                                rowData.push('✓');
                                h++;
                            } else if (status === 'Sakit') {
                                rowData.push('S');
                                s++;
                            } else if (status === 'Izin') {
                                rowData.push('I');
                                izin++;
                            } else if (status === 'Alpha') {
                                rowData.push('A');
                                a++;
                            } else {
                                rowData.push('-');
                            }
                        }

                        rowData.push(String(h), String(s), String(izin), String(a));
                        return rowData;
                    });

                    autoTable(doc, {
                        head: [headers],
                        body: rows,
                        startY: 38,
                        styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
                        columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
                        headStyles: { fillColor: [79, 70, 229] },
                        didDrawPage: (_data) => {
                            doc.setFontSize(8);
                            doc.setTextColor(100);
                            doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 10);
                            doc.text(`Halaman ${doc.internal.pages.length - 1}`, pageWidth - 25, pageHeight - 10);
                        }
                    });
                }

                doc.save(`Laporan_Absensi_Bulanan_${exportMonth}.pdf`);
                toast.success("Laporan PDF berhasil diunduh!");
            } else if (exportPeriod === 'semester' && format === 'pdf') {
                await ensureLogosLoaded();
                const { default: jsPDF } = await getJsPDF();
                const { default: autoTable } = await getAutoTable();
                const doc = new jsPDF();
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                let isFirstClass = true;

                for (const classData of studentsByClass) {
                    if (!isFirstClass) doc.addPage();
                    isFirstClass = false;

                    const titleText = `RINGKASAN ABSENSI SEMESTER - KELAS ${classData.name.toUpperCase()}`;
                    const subText = `${exportTitle.toUpperCase()} • ${schoolName || '-'}`;
                    const headerY = addPdfHeader(doc, { schoolName, orientation: 'portrait' });
                    const pageWidthHeader2 = doc.internal.pageSize.getWidth();
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(titleText, pageWidthHeader2 / 2, headerY, { align: 'center' });
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(subText, pageWidthHeader2 / 2, headerY + 5, { align: 'center' });

                    const attendanceMap = new Map<string, { h: number, s: number, i: number, a: number }>();
                    attendance.forEach((r: AttendanceRow) => {
                        const current = attendanceMap.get(r.student_id) || { h: 0, s: 0, i: 0, a: 0 };
                        if (r.status === 'Hadir') current.h++;
                        else if (r.status === 'Sakit') current.s++;
                        else if (r.status === 'Izin') current.i++;
                        else if (r.status === 'Alpha') current.a++;
                        attendanceMap.set(r.student_id, current);
                    });

                    const headers = ['No', 'Nama Siswa', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Persentase'];
                    const rows = classData.students.map((student: StudentRow, index: number) => {
                        const counts = attendanceMap.get(student.id) || { h: 0, s: 0, i: 0, a: 0 };
                        const totalDays = counts.h + counts.s + counts.i + counts.a;
                        const percent = totalDays > 0 ? `${Math.round((counts.h / totalDays) * 100)}%` : '100%';

                        return [
                            String(index + 1),
                            student.name,
                            String(counts.h),
                            String(counts.s),
                            String(counts.i),
                            String(counts.a),
                            percent
                        ];
                    });

                    autoTable(doc, {
                        head: [headers],
                        body: rows,
                        startY: 38,
                        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
                        columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
                        headStyles: { fillColor: [79, 70, 229] },
                        didDrawPage: (_data) => {
                            doc.setFontSize(8);
                            doc.setTextColor(100);
                            doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 10);
                            doc.text(`Halaman ${doc.internal.pages.length - 1}`, pageWidth - 25, pageHeight - 10);
                        }
                    });
                }

                doc.save(`Laporan_Absensi_Semester_${exportSemesterId}.pdf`);
                toast.success("Laporan PDF berhasil diunduh!");
            } else if (format === 'excel') {
                const XLSX = await getXLSX();
                const wb = XLSX.utils.book_new();

                for (const classData of studentsByClass) {
                    const sheetData = classData.students.map((student: StudentRow, index: number) => {
                        const stdAtt = attendance.filter((r: AttendanceRow) => r.student_id === student.id);
                        const h = stdAtt.filter(r => r.status === 'Hadir').length;
                        const s = stdAtt.filter(r => r.status === 'Sakit').length;
                        const i = stdAtt.filter(r => r.status === 'Izin').length;
                        const a = stdAtt.filter(r => r.status === 'Alpha').length;
                        const total = h + s + i + a;
                        const pct = total > 0 ? `${Math.round((h / total) * 100)}%` : '100%';

                        return {
                            'No': index + 1,
                            'Nama Siswa': student.name,
                            'Hadir (H)': h,
                            'Sakit (S)': s,
                            'Izin (I)': i,
                            'Alpha (A)': a,
                            'Persentase Kehadiran': pct
                        };
                    });

                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(wb, ws, `Kelas ${classData.name}`);
                }

                await XLSX.writeFile(wb, `Laporan_Absensi_${exportPeriod === 'monthly' ? exportMonth : 'Semester'}.xlsx`);
                toast.success("Laporan Excel berhasil diunduh!");
            }
        } catch (err: unknown) {
            toast.error(`Gagal mengekspor laporan: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsExporting(false);
            setIsExportOpen(false);
        }
    };

    const setIsExportOpen = (open: boolean) => {
        setIsExportModalOpen(open);
    };

    const handleAnalyzeAttendance = async () => {
        if (!selectedClass || !students || students.length === 0) return;
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        setAiAnalysisResult(null);

        try {
            const historyText = attendanceHistory
                .map((r: AttendanceRow) => `${r.date}: Student ID ${r.student_id} is ${r.status}`)
                .join('\n');

            const prompt = `Lakukan analisis data kehadiran historis untuk Kelas ${selectedClass} berikut:
Daftar Siswa: ${students.map(s => `ID: ${s.id}, Nama: ${s.name}`).join('; ')}
Data Riwayat Absensi:
${historyText || 'Tidak ada riwayat absensi.'}

Berikan analisis dalam format JSON murni yang sesuai dengan schema TypeScript:
{
  "perfect_attendance": ["nama siswa yang hadir sempurna"],
  "frequent_absentees": [{"student_name": "nama", "absent_days": jumlah_hari}],
  "pattern_warnings": [{"pattern_description": "deskripsi pola", "implicated_students": ["nama siswa"]}]
}`;

            const jsonData = await generateOpenRouterJson<AiAnalysis>(prompt);
            setAiAnalysisResult(jsonData);
        } catch (err: unknown) {
            toast.error("Gagal menganalisis data. Coba lagi dalam beberapa saat.");
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
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
        isExportModalOpen,
        setIsExportModalOpen,
        exportMonth,
        setExportMonth,
        selectedExportClass,
        setSelectedExportClass,
        exportPeriod,
        setExportPeriod,
        exportSemesterId,
        setExportSemesterId,
        isExporting,
        isAiModalOpen,
        setIsAiModalOpen,
        aiAnalysisResult,
        isAiLoading,
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
        handleAnalyzeAttendance,
        isOnline,
    };
};
export default useAttendance;
