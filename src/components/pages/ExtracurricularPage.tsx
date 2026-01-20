import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSemester } from '../../contexts/SemesterContext';
import { useToast } from '../../hooks/useToast';
import { Trophy, Users, Calendar, GraduationCap, Plus, Search, Trash2, UserCog, Pencil, CheckCircle2, Info, Activity, XCircle, Clock, Save, CheckSquare, FileText, FileSpreadsheet, CalendarOff } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { Database } from '../../services/database.types';
import { getJsPDF, getAutoTable, getXLSX } from '../../utils/dynamicImports';

type Class = Database['public']['Tables']['classes']['Row'];
type AttendanceStatus = Database['public']['Tables']['extracurricular_attendance']['Row']['status'];
type Gender = Database['public']['Enums']['gender_enum'];

// Types
type Extracurricular = Database['public']['Tables']['extracurriculars']['Row'];
type ExtracurricularInsert = Database['public']['Tables']['extracurriculars']['Insert'];
type ExtracurricularAttendance = Database['public']['Tables']['extracurricular_attendance']['Row'];
type ExtracurricularGrade = Database['public']['Tables']['extracurricular_grades']['Row'];
type Student = Database['public']['Tables']['students']['Row'];
type ExtracurricularStudent = Database['public']['Tables']['extracurricular_students']['Row'];

type EnrollmentView = {
    id: string;
    participantId: string;
    participantType: 'student' | 'extracurricular_student';
    name: string;
    className: string | null;
};

type TabType = 'list' | 'enrollment' | 'attendance' | 'grades' | 'students';

// Tab configuration
const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'list', label: 'Daftar Ekskul', icon: Trophy },
    { id: 'students', label: 'Daftar Siswa', icon: UserCog },
    { id: 'enrollment', label: 'Pendaftaran', icon: Users },
    { id: 'attendance', label: 'Presensi', icon: Calendar },
    { id: 'grades', label: 'Nilai', icon: GraduationCap },
];

// Category options
const CATEGORIES = ['Olahraga', 'Seni', 'Akademik', 'Keagamaan', 'Lainnya'];
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];


const ExtracurricularPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { activeSemester } = useSemester();

    // State
    const [activeTab, setActiveTab] = useState<TabType>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExtracurricular, setSelectedExtracurricular] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [editingExtracurricular, setEditingExtracurricular] = useState<Extracurricular | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Form state for new/edit extracurricular
    const [formData, setFormData] = useState<Partial<ExtracurricularInsert>>({
        name: '',
        category: '',
        description: '',
        schedule_day: '',
        schedule_time: '',
        coach_name: '',
        max_participants: 30,
        is_active: true,
    });

    // Form state for new student
    const [newStudentRows, setNewStudentRows] = useState<Array<{ name: string; gender: Gender; class_name: string }>>([
        { name: '', gender: 'Laki-laki', class_name: '' },
    ]);
    const [bulkClassName, setBulkClassName] = useState('');
    const [editingExtraStudent, setEditingExtraStudent] = useState<ExtracurricularStudent | null>(null);
    const [confirmDeleteExtraStudent, setConfirmDeleteExtraStudent] = useState<ExtracurricularStudent | null>(null);
    const [studentClassFilter, setStudentClassFilter] = useState<string>('all');

    // Manual Attendance States
    const [autoSaveAttendance, setAutoSaveAttendance] = useState(true);
    const [localAttendance, setLocalAttendance] = useState<Record<string, string>>({});

    // ==================== QUERIES ====================

    // Fetch all extracurriculars
    const { data: extracurriculars = [], isLoading: loadingExtracurriculars } = useQuery({
        queryKey: ['extracurriculars', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurriculars')
                .select('*')
                .eq('user_id', user!.id)
                .order('name');
            if (error) throw error;
            return data as Extracurricular[];
        },
        enabled: !!user,
    });

    const selectedExtracurricularData = useMemo(() => {
        return extracurriculars.find((e) => e.id === selectedExtracurricular);
    }, [extracurriculars, selectedExtracurricular]);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // Fetch students based on selected class
    const { data: students = [] } = useQuery({
        queryKey: ['students', user?.id, selectedClassId],
        queryFn: async () => {
            let query = supabase
                .from('students')
                .select('*')
                .is('deleted_at', null)
                .eq('user_id', user!.id)
                .order('name');

            if (selectedClassId) {
                query = query.eq('class_id', selectedClassId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Student[];
        },
        enabled: !!user,
    });

    const selectedClassName = useMemo(() => {
        if (!selectedClassId) return '';
        return classes.find((c) => c.id === selectedClassId)?.name || '';
    }, [classes, selectedClassId]);

    const normalizedClassName = useMemo(() => {
        if (!selectedClassName) return '';
        return selectedClassName.trim().replace(/\s+/g, ' ').toUpperCase();
    }, [selectedClassName]);

    // Fetch extracurricular-only students (filtered by class for enrollment tab)
    const { data: extracurricularStudents = [] } = useQuery({
        queryKey: ['extracurricular_students', user?.id, normalizedClassName],
        queryFn: async () => {
            let query = supabase
                .from('extracurricular_students')
                .select('*')
                .eq('user_id', user!.id)
                .order('name');

            if (normalizedClassName) {
                query = query.eq('class_name', normalizedClassName);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as ExtracurricularStudent[];
        },
        enabled: !!user,
    });

    // Fetch ALL extracurricular students (for student list tab)
    const { data: allExtracurricularStudents = [], isLoading: loadingAllExtraStudents } = useQuery({
        queryKey: ['all_extracurricular_students', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_students')
                .select('*')
                .eq('user_id', user!.id)
                .order('name');
            if (error) throw error;
            return data as ExtracurricularStudent[];
        },
        enabled: !!user,
    });

    // Fetch enrollments for selected extracurricular
    const { data: enrollments = [] } = useQuery({
        queryKey: ['student_extracurriculars', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const [studentRes, extraRes] = await Promise.all([
                supabase
                    .from('student_extracurriculars')
                    .select('id, student_id, extracurricular_id, semester_id, students(id, name, class_id, classes(name))')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .not('student_id', 'is', null),
                supabase
                    .from('student_extracurriculars')
                    .select('id, extracurricular_student_id, extracurricular_id, semester_id, extracurricular_students(id, name, class_name)')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .not('extracurricular_student_id', 'is', null),
            ]);

            if (studentRes.error) throw studentRes.error;
            if (extraRes.error) throw extraRes.error;

            const studentEnrollments = (studentRes.data || []).map((row: any): EnrollmentView => ({
                id: row.id,
                participantId: row.student_id,
                participantType: 'student',
                name: row.students?.name || 'Siswa',
                className: row.students?.classes?.name || null,
            }));

            const extraEnrollments = (extraRes.data || []).map((row: any): EnrollmentView => ({
                id: row.id,
                participantId: row.extracurricular_student_id,
                participantType: 'extracurricular_student',
                name: row.extracurricular_students?.name || 'Siswa Ekskul',
                className: row.extracurricular_students?.class_name || null,
            }));

            return [...studentEnrollments, ...extraEnrollments];
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // Fetch attendance for selected extracurricular and date
    const { data: attendanceRecords = [] } = useQuery({
        queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_attendance')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('date', selectedDate);
            if (error) throw error;
            return data as ExtracurricularAttendance[];
        },
        enabled: !!selectedExtracurricular && !!selectedDate,
    });

    // Fetch grades for selected extracurricular
    const { data: grades = [] } = useQuery({
        queryKey: ['extracurricular_grades', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_grades')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('semester_id', activeSemester!.id);
            if (error) throw error;
            return data as ExtracurricularGrade[];
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // ==================== MUTATIONS ====================

    // Create/Update extracurricular
    const extracurricularMutation = useMutation({
        mutationFn: async (data: Partial<ExtracurricularInsert>) => {
            if (editingExtracurricular) {
                const { error } = await supabase
                    .from('extracurriculars')
                    .update(data)
                    .eq('id', editingExtracurricular.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('extracurriculars')
                    .insert({ ...data, user_id: user!.id } as ExtracurricularInsert);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurriculars'] });
            if (editingExtracurricular) {
                toast.success('Ekskul berhasil diperbarui');
            } else {
                toast.success('Ekskul berhasil ditambahkan');
            }
            handleCloseModal();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Delete extracurricular
    const deleteExtracurricularMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('extracurriculars')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurriculars'] });
            toast.success('Ekskul berhasil dihapus');
        },
    });

    // Enroll/Unenroll student
    const enrollmentMutation = useMutation({
        mutationFn: async ({
            studentId,
            studentType,
            action,
        }: {
            studentId: string;
            studentType: 'student' | 'extracurricular_student';
            action: 'enroll' | 'unenroll';
        }) => {
            if (action === 'enroll') {
                const payload =
                    studentType === 'student'
                        ? { student_id: studentId }
                        : { extracurricular_student_id: studentId };
                const { error } = await supabase
                    .from('student_extracurriculars')
                    .insert({
                        ...payload,
                        extracurricular_id: selectedExtracurricular,
                        semester_id: activeSemester!.id,
                        user_id: user!.id,
                    });
                if (error) throw error;
            } else {
                const deleteQuery = supabase
                    .from('student_extracurriculars')
                    .delete()
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id);

                const { error } =
                    studentType === 'student'
                        ? await deleteQuery.eq('student_id', studentId)
                        : await deleteQuery.eq('extracurricular_student_id', studentId);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            toast.success('Status pendaftaran siswa berhasil diperbarui');
        },
    });

    // Update attendance
    const attendanceMutation = useMutation({
        mutationFn: async ({
            studentId,
            studentType,
            status,
        }: {
            studentId: string;
            studentType: 'student' | 'extracurricular_student';
            status: string;
        }) => {
            const rpcPayload = [{
                student_id: studentType === 'student' ? studentId : null,
                extracurricular_student_id: studentType === 'extracurricular_student' ? studentId : null,
                extracurricular_id: selectedExtracurricular,
                semester_id: activeSemester?.id || null,
                date: selectedDate,
                status: status,
                notes: null, // explicit null to preserve existing
            }];

            const { error } = await supabase.rpc('upsert_extracurricular_attendance', {
                p_items: rpcPayload,
                p_user_id: user!.id
            });

            if (error) throw error;
        },
        onMutate: async ({ studentId, studentType, status }) => {
            // Cancel any outgoing refetches for this query
            await queryClient.cancelQueries({ queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate] });

            // Snapshot the previous value
            const previousAttendance = queryClient.getQueryData<ExtracurricularAttendance[]>(['extracurricular_attendance', selectedExtracurricular, selectedDate]);

            // Optimistically update to the new value
            queryClient.setQueryData<ExtracurricularAttendance[]>(
                ['extracurricular_attendance', selectedExtracurricular, selectedDate],
                (old = []) => {
                    const newRecord = {
                        id: 'temp-' + Date.now(),
                        student_id: studentType === 'student' ? studentId : null,
                        extracurricular_student_id: studentType === 'extracurricular_student' ? studentId : null,
                        extracurricular_id: selectedExtracurricular,
                        semester_id: activeSemester?.id || null,
                        date: selectedDate,
                        status: status as AttendanceStatus,
                        notes: null,
                        user_id: user!.id,
                        created_at: new Date().toISOString(),
                    };

                    // Check if record exists
                    const exists = old.find(r =>
                        (studentType === 'student' && r.student_id === studentId) ||
                        (studentType === 'extracurricular_student' && r.extracurricular_student_id === studentId)
                    );

                    if (exists) {
                        return old.map(r =>
                            ((studentType === 'student' && r.student_id === studentId) ||
                                (studentType === 'extracurricular_student' && r.extracurricular_student_id === studentId))
                                ? { ...r, status: status as AttendanceStatus }
                                : r
                        );
                    } else {
                        // @ts-expect-error - Ignoring strict type check for temp ID in optimistic update
                        return [...old, newRecord];
                    }
                }
            );

            return { previousAttendance };
        },
        onError: (err, newTodo, context) => {
            // Rollback on error
            if (context?.previousAttendance) {
                queryClient.setQueryData(['extracurricular_attendance', selectedExtracurricular, selectedDate], context.previousAttendance);
            }
            toast.error(`Gagal menyimpan: ${err.message}`);
        },
        onSettled: () => {
            // Example: if you want to ensure the specific row is definitely correct after server response
            // queryClient.invalidateQueries({ queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate] });
            // NOTE: We generally avoid immediate invalidation if we trust the server response matches our intent,
            // or delay it slightly to avoid UI flicker.
            // For now, let's strictly invalidate to ensure consistency.
            queryClient.invalidateQueries({ queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate] });
        },
    });

    // Bulk Update Attendance (Manual Mode)
    const bulkAttendanceMutation = useMutation({
        mutationFn: async (items: Array<{ studentId: string; studentType: string; status: string }>) => {
            const rpcPayload = items.map(item => ({
                student_id: item.studentType === 'student' ? item.studentId : null,
                extracurricular_student_id: item.studentType === 'extracurricular_student' ? item.studentId : null,
                extracurricular_id: selectedExtracurricular,
                semester_id: activeSemester?.id || null,
                date: selectedDate,
                status: item.status,
                notes: null
            }));

            const { error } = await supabase.rpc('upsert_extracurricular_attendance', {
                p_items: rpcPayload,
                p_user_id: user!.id
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_attendance'] });
            setLocalAttendance({}); // Clear local changes on success
            toast.success('Presensi berhasil disimpan');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    // Update grade
    const gradeMutation = useMutation({
        mutationFn: async ({
            studentId,
            studentType,
            grade,
            description,
        }: {
            studentId: string;
            studentType: 'student' | 'extracurricular_student';
            grade: string;
            description?: string;
        }) => {
            const payload =
                studentType === 'student'
                    ? { student_id: studentId }
                    : { extracurricular_student_id: studentId };
            const onConflict =
                studentType === 'student'
                    ? 'student_id,extracurricular_id,semester_id'
                    : 'extracurricular_student_id,extracurricular_id,semester_id';

            if (!activeSemester?.id) {
                throw new Error('Semester aktif tidak ditemukan');
            }

            const { error } = await supabase
                .from('extracurricular_grades')
                .upsert({
                    ...payload,
                    extracurricular_id: selectedExtracurricular,
                    semester_id: activeSemester.id,
                    grade,
                    description,
                    user_id: user!.id,
                    updated_at: new Date().toISOString(),
                }, { onConflict });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_grades'] });
            toast.success('Nilai berhasil disimpan');
        },
    });

    // Create manually added student
    const createStudentsMutation = useMutation({
        mutationFn: async (rows: Array<{ name: string; gender: Gender; class_name: string }>) => {
            if (!selectedExtracurricular || !activeSemester?.id) {
                throw new Error('Pilih ekstrakurikuler terlebih dahulu.');
            }

            const prepared = rows
                .map((row) => {
                    const name = row.name.trim();
                    const className = row.class_name ? normalizeClassName(row.class_name) : (bulkClassName ? normalizeClassName(bulkClassName) : '');
                    return {
                        name,
                        gender: row.gender,
                        class_name: className || null,
                        user_id: user?.id || '',
                    };
                })
                .filter((row) => row.name.length > 0);

            if (prepared.length === 0) {
                throw new Error('Tidak ada data siswa yang valid.');
            }

            const { data: inserted, error } = await supabase
                .from('extracurricular_students')
                .insert(prepared)
                .select();

            if (error) throw error;

            const enrollPayload = (inserted || []).map((student) => ({
                extracurricular_student_id: student.id,
                extracurricular_id: selectedExtracurricular,
                semester_id: activeSemester.id,
                user_id: user!.id,
            }));

            if (enrollPayload.length > 0) {
                const { error: enrollError } = await supabase
                    .from('student_extracurriculars')
                    .insert(enrollPayload);
                if (enrollError) throw enrollError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            toast.success('Siswa berhasil ditambahkan dan didaftarkan');
            setIsAddStudentModalOpen(false);
            setNewStudentRows([{ name: '', gender: 'Laki-laki', class_name: '' }]);
            setBulkClassName('');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const updateExtraStudentMutation = useMutation({
        mutationFn: async (data: { id: string; name: string; gender: Gender; class_name: string }) => {
            const { error } = await supabase
                .from('extracurricular_students')
                .update({
                    name: data.name.trim(),
                    gender: data.gender,
                    class_name: data.class_name ? normalizeClassName(data.class_name) : null,
                })
                .eq('id', data.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['all_extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            setEditingExtraStudent(null);
            toast.success('Siswa ekskul berhasil diperbarui');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const deleteExtraStudentMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('extracurricular_students')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['all_extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            setConfirmDeleteExtraStudent(null);
            setEditingExtraStudent(null);
            toast.success('Siswa ekskul dihapus');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    // ==================== HANDLERS ====================

    const handleOpenModal = (extracurricular?: Extracurricular) => {
        if (extracurricular) {
            setEditingExtracurricular(extracurricular);
            setFormData({
                name: extracurricular.name,
                category: extracurricular.category || '',
                description: extracurricular.description || '',
                schedule_day: extracurricular.schedule_day || '',
                schedule_time: extracurricular.schedule_time || '',
                coach_name: extracurricular.coach_name || '',
                max_participants: extracurricular.max_participants,
                is_active: extracurricular.is_active,
            });
        } else {
            setEditingExtracurricular(null);
            setFormData({
                name: '',
                category: '',
                description: '',
                schedule_day: '',
                schedule_time: '',
                coach_name: '',
                max_participants: 30,
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingExtracurricular(null);
    };

    const handleSubmitExtracurricular = (e: React.FormEvent) => {
        e.preventDefault();
        extracurricularMutation.mutate(formData);
    };

    // Filtered extracurriculars based on search
    const filteredExtracurriculars = useMemo(() => {
        return extracurriculars.filter((e) => {
            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.category?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
            if (statusFilter === 'active' && !e.is_active) return false;
            if (statusFilter === 'inactive' && e.is_active) return false;
            return true;
        });
    }, [extracurriculars, searchTerm, categoryFilter, statusFilter]);

    const extracurricularStats = useMemo(() => {
        const active = extracurriculars.filter((e) => e.is_active).length;
        return {
            total: extracurriculars.length,
            active,
            inactive: extracurriculars.length - active,
        };
    }, [extracurriculars]);

    const classNameById = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach((c: Class) => map.set(c.id, c.name));
        return map;
    }, [classes]);

    const normalizeClassName = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();

    const participants = useMemo(() => {
        const baseStudents = students.map((s) => ({
            id: s.id,
            type: 'student' as const,
            name: s.name,
            className: s.class_id ? classNameById.get(s.class_id) || null : null,
        }));

        const extra = extracurricularStudents.map((s) => ({
            id: s.id,
            type: 'extracurricular_student' as const,
            name: s.name,
            className: s.class_name || null,
        }));

        return [...baseStudents, ...extra];
    }, [students, extracurricularStudents, classNameById]);

    // Enrolled participants for quick lookup
    const enrolledParticipantIds = useMemo(() => {
        return new Set(enrollments.map((e) => `${e.participantType}:${e.participantId}`));
    }, [enrollments]);

    // Attendance status map for quick lookup
    const attendanceMap = useMemo(() => {
        const map: Record<string, string> = {};
        attendanceRecords.forEach((a) => {
            const key = a.student_id
                ? `student:${a.student_id}`
                : a.extracurricular_student_id
                    ? `extracurricular_student:${a.extracurricular_student_id}`
                    : '';
            if (key) map[key] = a.status;
        });
        return map;
    }, [attendanceRecords]);

    // Grades map for quick lookup
    const gradesMap = useMemo(() => {
        const map: Record<string, ExtracurricularGrade> = {};
        grades.forEach((g: ExtracurricularGrade) => {
            const key = g.student_id
                ? `student:${g.student_id}`
                : g.extracurricular_student_id
                    ? `extracurricular_student:${g.extracurricular_student_id}`
                    : '';
            if (key) map[key] = g;
        });
        return map;
    }, [grades]);

    // Get unique class names from extracurricular students
    const uniqueExtraStudentClasses = useMemo(() => {
        const classSet = new Set<string>();
        allExtracurricularStudents.forEach((s) => {
            if (s.class_name) classSet.add(s.class_name);
        });
        return Array.from(classSet).sort();
    }, [allExtracurricularStudents]);

    // Filter extracurricular students by class
    const filteredExtraStudents = useMemo(() => {
        if (studentClassFilter === 'all') return allExtracurricularStudents;
        return allExtracurricularStudents.filter((s) => s.class_name === studentClassFilter);
    }, [allExtracurricularStudents, studentClassFilter]);

    // ==================== ATTENDANCE LOGIC ====================

    // Merged attendance for display (server + local)
    const mergedAttendance = useMemo(() => {
        return { ...attendanceMap, ...localAttendance };
    }, [attendanceMap, localAttendance]);

    const pendingChangesCount = Object.keys(localAttendance).length;

    const handleAttendanceClick = (studentId: string, studentType: 'student' | 'extracurricular_student', status: string) => {
        if (autoSaveAttendance) {
            attendanceMutation.mutate({ studentId, studentType, status });
        } else {
            const key = studentType === 'student' ? `student:${studentId}` : `extracurricular_student:${studentId}`;
            setLocalAttendance(prev => ({ ...prev, [key]: status }));
        }
    };

    const handleSaveAttendance = () => {
        const items = Object.entries(localAttendance).map(([key, status]) => {
            const [type, id] = key.split(':');
            return {
                studentId: id,
                studentType: type === 'student' ? 'student' : 'extracurricular_student',
                status
            };
        });
        bulkAttendanceMutation.mutate(items);
    };

    const handleMarkAll = (status: string) => {
        if (autoSaveAttendance) {
            const items = enrollments.map(e => ({
                studentId: e.participantId,
                studentType: e.participantType,
                status: status
            }));
            if (items.length > 0 && window.confirm(`Tandai ${items.length} siswa sebagai ${status}?`)) {
                bulkAttendanceMutation.mutate(items);
            }
        } else {
            const newLocal = { ...localAttendance };
            enrollments.forEach(e => {
                const key = e.participantType === 'student' ? `student:${e.participantId}` : `extracurricular_student:${e.participantId}`;
                newLocal[key] = status;
            });
            setLocalAttendance(newLocal);
            toast.success(`Semua ditandai ${status} (Belum disimpan)`);
        }
    };

    const handleExportPDF = async () => {
        if (!selectedExtracurricularData) return;

        try {
            // Calculate date range for the month
            const date = new Date(selectedDate);
            const year = date.getFullYear();
            const month = date.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            // Fetch all attendance for this month
            const { data: monthlyAttendance, error } = await supabase
                .from('extracurricular_attendance')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;

            // Process data into a map: "id:day" -> status
            const attendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach(record => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                attendanceMap[`${id}:${day}`] = record.status;
            });

            const { default: jsPDF } = await getJsPDF();
            const { default: autoTable } = await getAutoTable();
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

            // Header
            doc.setFontSize(14);
            doc.text(`Rekap Presensi Bulanan - ${selectedExtracurricularData.name}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Periode: ${monthName} | Total Siswa: ${enrollments.length}`, 14, 22);

            // Table columns: No, Nama, Kelas, 1...31, H, S, I, A
            const daysColumns = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            const tableColumn = ["No", "Nama", "Kelas", ...daysColumns, "H", "S", "I", "A"];

            const tableRows = enrollments.sort((a, b) => {
                const classCompare = (a.className || '').localeCompare(b.className || '');
                if (classCompare !== 0) return classCompare;
                return a.name.localeCompare(b.name);
            }).map((enrollment, index) => {
                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let h = 0, s = 0, iz = 0, a = 0;

                const dailyStatuses = daysColumns.map(day => {
                    const status = attendanceMap[`${id}:${day}`] || '';
                    if (status === 'Hadir') { h++; return 'H'; }
                    if (status === 'Sakit') { s++; return 'S'; }
                    if (status === 'Izin') { iz++; return 'I'; }
                    if (status === 'Alpha') { a++; return 'A'; }
                    if (status === 'Libur') return 'L';
                    return '';
                });

                return [index + 1, enrollment.name, enrollment.className || '-', ...dailyStatuses, h, s, iz, a];
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 28,
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11], fontSize: 7, halign: 'center' },
                styles: { fontSize: 6, cellPadding: 1 },
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 18 } }
            });

            doc.save(`Rekap_Presensi_${selectedExtracurricularData.name}_${monthName}.pdf`);
            toast.success('Download PDF berhasil');
        } catch (err: any) {
            toast.error(`Gagal export: ${err.message}`);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedExtracurricularData) return;

        try {
            // Calculate date range for the month
            const date = new Date(selectedDate);
            const year = date.getFullYear();
            const month = date.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            // Fetch all attendance for this month
            const { data: monthlyAttendance, error } = await supabase
                .from('extracurricular_attendance')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;

            // Process data into a map: "id:day" -> status
            const attendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach(record => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                attendanceMap[`${id}:${day}`] = record.status;
            });

            const XLSX = await getXLSX();
            const workbook = XLSX.utils.book_new();

            // Headers: No, Nama, Kelas, 1...31, H, S, I, A
            const daysHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            const headers = ["No", "Nama Siswa", "Kelas", ...daysHeaders, "Hadir", "Sakit", "Izin", "Alpha"];

            // Data rows
            const dataRows = enrollments.sort((a, b) => {
                const classCompare = (a.className || '').localeCompare(b.className || '');
                if (classCompare !== 0) return classCompare;
                return a.name.localeCompare(b.name);
            }).map((enrollment, index) => {
                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let h = 0, s = 0, iz = 0, a = 0;

                const dailyStatuses = daysHeaders.map(day => {
                    const status = attendanceMap[`${id}:${day}`] || '-';
                    if (status === 'Hadir') { h++; return 'H'; }
                    if (status === 'Sakit') { s++; return 'S'; }
                    if (status === 'Izin') { iz++; return 'I'; }
                    if (status === 'Alpha') { a++; return 'A'; }
                    if (status === 'Libur') return 'L';
                    return '-';
                });

                return [index + 1, enrollment.name, enrollment.className || '-', ...dailyStatuses, h, s, iz, a];
            });

            const wsData = [
                [`Rekap Presensi Bulanan - ${selectedExtracurricularData.name}`],
                [`Periode: ${monthName}`],
                [''],
                headers,
                ...dataRows
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            worksheet['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 12 },
                ...Array(daysInMonth).fill({ wch: 3 }),
                { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Bulanan");
            XLSX.writeFile(workbook, `Rekap_Presensi_${selectedExtracurricularData.name}_${monthName}.xlsx`);
            toast.success('Download Excel berhasil');
        } catch (err: any) {
            toast.error(`Gagal export: ${err.message}`);
        }
    };

    // Export Functions (Grades)
    const handleExportGradesPDF = async () => {
        if (!selectedExtracurricularData) return;

        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF();
        const semesterName = activeSemester ? `${activeSemester.name} (Semester ${activeSemester.semester_number})` : '-';

        doc.setFontSize(18);
        doc.text(`Nilai Ekstrakurikuler: ${selectedExtracurricularData.name}`, 14, 22);

        doc.setFontSize(11);
        doc.text(`Semester: ${semesterName}`, 14, 32);
        if (selectedExtracurricularData.coach_name) {
            doc.text(`Pembina: ${selectedExtracurricularData.coach_name}`, 14, 38);
        }

        const tableBody = enrollments.map((enrollment, index) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const grade = gradesMap[key];
            return [
                index + 1,
                enrollment.name,
                enrollment.className || '-',
                grade?.grade || '-',
                grade?.description || '-'
            ];
        });

        autoTable(doc, {
            head: [['No', 'Nama Siswa', 'Kelas', 'Nilai', 'Deskripsi']],
            body: tableBody,
            startY: 45,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [245, 158, 11] },
        });

        doc.save(`Nilai_Ekskul_${selectedExtracurricularData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportGradesExcel = async () => {
        if (!selectedExtracurricularData) return;

        const XLSX = await getXLSX();
        const data = enrollments.map((enrollment, index) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const grade = gradesMap[key];
            return {
                'No': index + 1,
                'Nama Siswa': enrollment.name,
                'Kelas': enrollment.className || '-',
                'Nilai': grade?.grade || '-',
                'Deskripsi': grade?.description || '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");

        const max_width = data.reduce((w, r) => Math.max(w, r['Nama Siswa'].length), 10);
        worksheet["!cols"] = [{ wch: 5 }, { wch: max_width + 2 }, { wch: 10 }, { wch: 10 }, { wch: 30 }];

        XLSX.writeFile(workbook, `Nilai_Ekskul_${selectedExtracurricularData.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // ==================== RENDER ====================

    return (
        <div className="min-h-screen h-full flex flex-col space-y-6 overflow-auto pb-6 px-1">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">
                                Ekstrakurikuler
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Kelola kegiatan ekstrakurikuler, pendaftaran, presensi, dan nilai siswa
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Ekskul
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari ekstrakurikuler..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                </div>
                {(activeTab === 'enrollment' || activeTab === 'attendance' || activeTab === 'grades') && (
                    <select
                        value={selectedExtracurricular}
                        onChange={(e) => setSelectedExtracurricular(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 min-w-[200px]"
                    >
                        <option value="">Pilih Ekskul</option>
                        {extracurriculars.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name}
                            </option>
                        ))}
                    </select>
                )}
                {activeTab === 'enrollment' && (
                    <>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 min-w-[150px]"
                        >
                            <option value="">Semua Kelas</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setIsAddStudentModalOpen(true)}
                            disabled={!selectedExtracurricular}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Siswa Baru
                        </button>
                    </>
                )}
                {activeTab === 'attendance' && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportPDF}
                            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Export PDF"
                        >
                            <FileText className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Export Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </button>
                        <DatePicker
                            value={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            className="min-w-[200px]"
                            align="right"
                        />
                    </div>
                )}
            </div>

            {activeTab === 'list' && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Ekskul</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{extracurricularStats.total}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Aktif</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{extracurricularStats.active}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Nonaktif</p>
                            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{extracurricularStats.inactive}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryFilter === 'all'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                }`}
                        >
                            Semua
                        </button>
                        {CATEGORIES.map((category) => (
                            <button
                                key={category}
                                onClick={() => setCategoryFilter(category)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryFilter === category
                                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/40'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'active'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                }`}
                        >
                            Aktif
                        </button>
                        <button
                            onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'inactive'
                                ? 'bg-slate-700 text-white border-slate-700'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                }`}
                        >
                            Nonaktif
                        </button>
                        {(categoryFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                            <button
                                onClick={() => {
                                    setCategoryFilter('all');
                                    setStatusFilter('all');
                                    setSearchTerm('');
                                }}
                                className="ml-auto px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab !== 'list' && selectedExtracurricularData && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            {selectedExtracurricularData.name}
                        </span>
                        {selectedExtracurricularData.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                {selectedExtracurricularData.category}
                            </span>
                        )}
                        {selectedExtracurricularData.schedule_day && (
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                {selectedExtracurricularData.schedule_day}
                                {selectedExtracurricularData.schedule_time && ` • ${selectedExtracurricularData.schedule_time}`}
                            </span>
                        )}
                        {selectedExtracurricularData.coach_name && (
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                Pembina: {selectedExtracurricularData.coach_name}
                            </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Maks: {selectedExtracurricularData.max_participants} peserta
                        </span>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {/* Tab: Daftar Ekskul */}
                {activeTab === 'list' && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {loadingExtracurriculars ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                            ))
                        ) : filteredExtracurriculars.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <Trophy className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' ? (
                                    <>
                                        <p className="text-slate-500 dark:text-slate-400">Tidak ada ekskul yang cocok dengan filter</p>
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setCategoryFilter('all');
                                                setStatusFilter('all');
                                            }}
                                            className="mt-4 text-amber-500 hover:text-amber-600 font-medium"
                                        >
                                            Reset filter
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-slate-500 dark:text-slate-400">Belum ada ekstrakurikuler</p>
                                        <button
                                            onClick={() => handleOpenModal()}
                                            className="mt-4 text-amber-500 hover:text-amber-600 font-medium"
                                        >
                                            Tambah ekskul pertama
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            filteredExtracurriculars.map((extracurricular) => (
                                <div
                                    key={extracurricular.id}
                                    className="relative p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-800 dark:text-white">{extracurricular.name}</h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                    {extracurricular.category || 'Lainnya'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${extracurricular.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            {extracurricular.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>

                                    {extracurricular.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                                            {extracurricular.description}
                                        </p>
                                    )}

                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        {extracurricular.schedule_day && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-amber-500" />
                                                <span>
                                                    {extracurricular.schedule_day}
                                                    {extracurricular.schedule_time && ` • ${extracurricular.schedule_time}`}
                                                </span>
                                            </div>
                                        )}
                                        {extracurricular.coach_name && (
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="w-4 h-4 text-slate-400" />
                                                <span>Pembina: {extracurricular.coach_name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span>Max: {extracurricular.max_participants} peserta</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(extracurricular)}
                                            className="flex-1 px-3 py-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Hapus ekskul ini?')) {
                                                    deleteExtracurricularMutation.mutate(extracurricular.id);
                                                }
                                            }}
                                            className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Tab: Pendaftaran */}
                {activeTab === 'enrollment' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {!selectedExtracurricular ? (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">Pilih ekstrakurikuler terlebih dahulu</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Nama Siswa</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Kelas</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {participants.map((student) => {
                                            const key = `${student.type}:${student.id}`;
                                            const isEnrolled = enrolledParticipantIds.has(key);
                                            return (
                                                <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-slate-800 dark:text-white font-medium">{student.name}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                        {student.className || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${isEnrolled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                            {isEnrolled ? 'Terdaftar' : 'Belum'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => enrollmentMutation.mutate({
                                                                    studentId: student.id,
                                                                    studentType: student.type,
                                                                    action: isEnrolled ? 'unenroll' : 'enroll'
                                                                })}
                                                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${isEnrolled
                                                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                                                                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100'
                                                                    }`}
                                                            >
                                                                {isEnrolled ? 'Keluarkan' : 'Daftarkan'}
                                                            </button>
                                                            {student.type === 'extracurricular_student' && (
                                                                <button
                                                                    onClick={() => {
                                                                        const target = extracurricularStudents.find((s) => s.id === student.id) || null;
                                                                        setEditingExtraStudent(target);
                                                                    }}
                                                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Presensi */}
                {/* Tab: Presensi */}
                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        {!selectedExtracurricular ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                                <Calendar className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Pilih Ekstrakurikuler</h3>
                                <p className="text-slate-500 dark:text-slate-400">Silakan pilih ekstrakurikuler dulu untuk mencatat presensi</p>
                            </div>
                        ) : (
                            <>
                                {/* Info & Stats Card */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {selectedExtracurricularData && (
                                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg lg:col-span-1">
                                            <h3 className="text-xl font-bold mb-1">{selectedExtracurricularData.name}</h3>
                                            <div className="space-y-2 mt-4 text-amber-100 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{selectedExtracurricularData.schedule_day || '-'}, {selectedExtracurricularData.schedule_time || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <UserCog className="w-4 h-4" />
                                                    <span>{selectedExtracurricularData.coach_name || 'Belum ada pembina'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span>Maks. {selectedExtracurricularData.max_participants} peserta</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Daily Stats */}
                                    {/* Daily Stats & Controls */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                    Ringkasan Kehadiran
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                                        <button
                                                            onClick={() => {
                                                                if (!autoSaveAttendance && pendingChangesCount > 0) {
                                                                    if (!window.confirm('Ada perubahan belum disimpan. Nonaktifkan simpan otomatis akan menghapus perubahan lokal?')) {
                                                                        return;
                                                                    }
                                                                    setLocalAttendance({});
                                                                }
                                                                setAutoSaveAttendance(!autoSaveAttendance);
                                                            }}
                                                            className={`
                                                                relative px-3 py-1.5 text-xs font-medium rounded-md transition-all
                                                                ${autoSaveAttendance
                                                                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                                }
                                                            `}
                                                        >
                                                            Otomatis
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setAutoSaveAttendance(false);
                                                            }}
                                                            className={`
                                                                relative px-3 py-1.5 text-xs font-medium rounded-md transition-all
                                                                ${!autoSaveAttendance
                                                                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                                }
                                                            `}
                                                        >
                                                            Manual
                                                        </button>
                                                    </div>

                                                    {!autoSaveAttendance && (
                                                        <>
                                                            <div className="flex gap-2">
                                                                {[
                                                                    { label: 'Hadir', status: 'Hadir', icon: CheckSquare, color: 'emerald', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
                                                                    { label: 'Sakit', status: 'Sakit', icon: Activity, color: 'amber', bg: 'bg-amber-50', hover: 'hover:bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
                                                                    { label: 'Izin', status: 'Izin', icon: Info, color: 'blue', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
                                                                    { label: 'Libur', status: 'Libur', icon: CalendarOff, color: 'purple', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' },
                                                                ].map((btn) => (
                                                                    <button
                                                                        key={btn.status}
                                                                        onClick={() => handleMarkAll(btn.status)}
                                                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${btn.text} ${btn.bg} ${btn.hover} border ${btn.border} rounded-lg transition-colors`}
                                                                    >
                                                                        <btn.icon className="w-3.5 h-3.5" />
                                                                        Semua {btn.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={handleSaveAttendance}
                                                                disabled={pendingChangesCount === 0 || bulkAttendanceMutation.isPending}
                                                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                                {bulkAttendanceMutation.isPending ? 'Menyimpan...' : `Simpan (${pendingChangesCount})`}
                                                            </button>
                                                        </>
                                                    )}

                                                    {autoSaveAttendance && (
                                                        <div className="flex gap-2">
                                                            {[
                                                                { label: 'Hadir', status: 'Hadir', icon: CheckSquare, color: 'emerald', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
                                                                { label: 'Sakit', status: 'Sakit', icon: Activity, color: 'amber', bg: 'bg-amber-50', hover: 'hover:bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
                                                                { label: 'Izin', status: 'Izin', icon: Info, color: 'blue', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
                                                                { label: 'Libur', status: 'Libur', icon: CalendarOff, color: 'purple', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' },
                                                            ].map((btn) => (
                                                                <button
                                                                    key={btn.status}
                                                                    onClick={() => handleMarkAll(btn.status)}
                                                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${btn.text} ${btn.bg} ${btn.hover} border ${btn.border} rounded-lg transition-colors`}
                                                                >
                                                                    <btn.icon className="w-3.5 h-3.5" />
                                                                    Semua {btn.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Hadir', key: 'Hadir', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                                                    { label: 'Izin', key: 'Izin', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                                                    { label: 'Sakit', key: 'Sakit', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                                                    { label: 'Alpha', key: 'Alpha', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
                                                    { label: 'Libur', key: 'Libur', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
                                                ].map((stat) => {
                                                    const count = enrollments.reduce((acc, curr) => {
                                                        const key = `${curr.participantType}:${curr.participantId}`;
                                                        return mergedAttendance[key] === stat.key ? acc + 1 : acc;
                                                    }, 0);
                                                    return (
                                                        <div key={stat.key} className={`rounded-xl p-3 ${stat.bg}`}>
                                                            <p className={`text-xs font-medium ${stat.color} uppercase`}>{stat.label}</p>
                                                            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{count}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Table */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                    {enrollments.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Users className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                            <p className="text-slate-500 dark:text-slate-400">Belum ada siswa terdaftar di ekskul ini</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Siswa</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kelas</th>
                                                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Kehadiran</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {enrollments.sort((a, b) => a.name.localeCompare(b.name)).map((enrollment) => {
                                                        const key = `${enrollment.participantType}:${enrollment.participantId}`;
                                                        const currentStatus = mergedAttendance[key] || '';

                                                        return (
                                                            <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-slate-800 dark:text-white">{enrollment.name}</div>
                                                                    {enrollment.participantType === 'extracurricular_student' && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-1">
                                                                            Siswa Ekskul
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                                    {enrollment.className || '-'}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex justify-center flex-wrap gap-2">
                                                                        {[
                                                                            { id: 'Hadir', label: 'Hadir', icon: CheckCircle2, activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800' },
                                                                            { id: 'Izin', label: 'Izin', icon: Info, activeClass: 'bg-blue-500 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' },
                                                                            { id: 'Sakit', label: 'Sakit', icon: Activity, activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800' },
                                                                            { id: 'Alpha', label: 'Alpha', icon: XCircle, activeClass: 'bg-red-500 text-white shadow-md shadow-red-500/20 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-800' },
                                                                            { id: 'Libur', label: 'Libur', icon: CalendarOff, activeClass: 'bg-purple-500 text-white shadow-md shadow-purple-500/20 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800' },
                                                                        ].map((status) => {
                                                                            const Icon = status.icon;
                                                                            const isActive = currentStatus === status.id;
                                                                            return (
                                                                                <button
                                                                                    key={status.id}
                                                                                    onClick={() => handleAttendanceClick(enrollment.participantId, enrollment.participantType, status.id)}
                                                                                    className={`
                                                                                        relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                                                                                        disabled:opacity-50 disabled:cursor-not-allowed
                                                                                        ${isActive
                                                                                            ? status.activeClass
                                                                                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                                                        }
                                                                                    `}
                                                                                    disabled={!selectedExtracurricular}
                                                                                >
                                                                                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                                                    <span className={!isActive ? 'hidden sm:inline' : ''}>{status.label}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Tab: Nilai */}
                {activeTab === 'grades' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {!selectedExtracurricular ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Pilih ekstrakurikuler untuk melihat nilai</p>
                            </div>
                        ) : (
                            <div>
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-amber-500" />
                                        Input Nilai & Deskripsi
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleExportGradesPDF}
                                            disabled={enrollments.length === 0}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FileText className="w-4 h-4" />
                                            PDF
                                        </button>
                                        <button
                                            onClick={handleExportGradesExcel}
                                            disabled={enrollments.length === 0}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Excel
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Siswa</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kelas</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[200px]">Nilai</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deskripsi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {enrollments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                        Belum ada siswa terdaftar di ekskul ini
                                                    </td>
                                                </tr>
                                            ) : (
                                                enrollments.sort((a, b) => a.name.localeCompare(b.name)).map((enrollment) => {
                                                    const key = `${enrollment.participantType}:${enrollment.participantId}`;
                                                    const gradeData = gradesMap[key];

                                                    return (
                                                        <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-slate-800 dark:text-white">{enrollment.name}</div>
                                                                {enrollment.participantType === 'extracurricular_student' && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-1">Siswa Ekskul</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                                {enrollment.className || '-'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-center gap-1">
                                                                    {['A', 'B', 'C', 'D'].map((grade) => (
                                                                        <button
                                                                            key={grade}
                                                                            onClick={() => gradeMutation.mutate({
                                                                                studentId: enrollment.participantId,
                                                                                studentType: enrollment.participantType,
                                                                                grade: grade,
                                                                                description: gradeData?.description || ''
                                                                            })}
                                                                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${gradeData?.grade === grade
                                                                                ? grade === 'A' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' :
                                                                                    grade === 'B' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' :
                                                                                        grade === 'C' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' :
                                                                                            'bg-red-500 text-white shadow-md shadow-red-500/20'
                                                                                : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                                                }`}
                                                                        >
                                                                            {grade}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <textarea
                                                                    placeholder="Deskripsi kemampuan..."
                                                                    defaultValue={gradeData?.description || ''}
                                                                    onBlur={(e) => {
                                                                        if (gradeData?.grade) {
                                                                            gradeMutation.mutate({
                                                                                studentId: enrollment.participantId,
                                                                                studentType: enrollment.participantType,
                                                                                grade: gradeData.grade,
                                                                                description: e.target.value
                                                                            });
                                                                        }
                                                                    }}
                                                                    rows={1}
                                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-y min-h-[40px] group-hover:bg-white dark:group-hover:bg-slate-800"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Daftar Siswa Ekskul */}
                {activeTab === 'students' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Daftar Siswa Ekstrakurikuler</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Kelola siswa yang hanya terdaftar di ekstrakurikuler (bukan siswa kelas reguler)
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Class Filter */}
                                <select
                                    value={studentClassFilter}
                                    onChange={(e) => setStudentClassFilter(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="all">Semua Kelas</option>
                                    {uniqueExtraStudentClasses.map((className) => (
                                        <option key={className} value={className}>
                                            Kelas {className}
                                        </option>
                                    ))}
                                </select>
                                <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                    Total: <span className="font-semibold text-amber-600">{filteredExtraStudents.length}</span> siswa
                                </div>
                            </div>
                        </div>

                        {loadingAllExtraStudents ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredExtraStudents.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <UserCog className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">
                                    {studentClassFilter === 'all'
                                        ? 'Belum ada siswa ekstrakurikuler'
                                        : `Tidak ada siswa di kelas ${studentClassFilter}`}
                                </p>
                                {studentClassFilter === 'all' && (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                        Tambahkan siswa baru melalui tab Pendaftaran
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nama Siswa</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jenis Kelamin</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kelas</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal Daftar</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredExtraStudents.map((student, index) => (
                                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{index + 1}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-slate-800 dark:text-white">{student.name}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === 'Laki-laki'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                                        }`}>
                                                        {student.gender === 'Laki-laki' ? 'L' : 'P'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                    {student.class_name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(student.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setEditingExtraStudent(student)}
                                                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                            title="Edit Siswa"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteExtraStudent(student)}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Hapus Siswa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Add/Edit Extracurricular */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingExtracurricular ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmitExtracurricular} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nama Ekskul <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Futsal, Pramuka, Paduan Suara"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Kategori
                                </label>
                                <select
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">Pilih Kategori</option>
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Deskripsi
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Deskripsi kegiatan ekskul..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Hari
                                    </label>
                                    <select
                                        value={formData.schedule_day || ''}
                                        onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="">Pilih Hari</option>
                                        {DAYS.map((day) => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Waktu
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schedule_time || ''}
                                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                                        placeholder="14:00 - 16:00"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Nama Pembina
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.coach_name || ''}
                                        onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                                        placeholder="Nama pembina"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Max Peserta
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_participants || 30}
                                        onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active ?? true}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">
                                    Ekskul aktif
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={extracurricularMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {extracurricularMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                , document.body)}

            {/* Modal: Add Manual Student */}
            {isAddStudentModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddStudentModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Tambah Siswa Baru
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Tambah siswa baru secara massal dan daftarkan langsung ke ekskul ini.
                            </p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createStudentsMutation.mutate(newStudentRows);
                        }} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Kelas Default <span className="text-slate-400 text-xs font-normal">(Opsional)</span>
                                </label>
                                <select
                                    value={bulkClassName}
                                    onChange={(e) => setBulkClassName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">Tidak ada</option>
                                    {classes.map((c: Class) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">
                                    Kelas default akan digunakan jika kolom kelas per siswa kosong.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {newStudentRows.map((row, index) => (
                                    <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Siswa {index + 1}
                                            </p>
                                            {newStudentRows.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewStudentRows((prev) => prev.filter((_, idx) => idx !== index));
                                                    }}
                                                    className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Nama Siswa <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={row.name}
                                                    onChange={(e) => {
                                                        const next = [...newStudentRows];
                                                        next[index] = { ...next[index], name: e.target.value };
                                                        setNewStudentRows(next);
                                                    }}
                                                    placeholder="Nama Lengkap Siswa"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Jenis Kelamin
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['Laki-laki', 'Perempuan'].map((gender) => (
                                                        <button
                                                            key={gender}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = [...newStudentRows];
                                                                next[index] = { ...next[index], gender: gender as Gender };
                                                                setNewStudentRows(next);
                                                            }}
                                                            className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${row.gender === gender
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400'
                                                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                                }`}
                                                        >
                                                            {gender}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Kelas (Opsional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={row.class_name}
                                                    onChange={(e) => {
                                                        const next = [...newStudentRows];
                                                        next[index] = { ...next[index], class_name: e.target.value };
                                                        setNewStudentRows(next);
                                                    }}
                                                    placeholder="mis. 7B"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setNewStudentRows((prev) => [...prev, { name: '', gender: 'Laki-laki', class_name: '' }])}
                                className="w-full px-4 py-2.5 rounded-xl border border-dashed border-amber-300 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Baris
                            </button>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddStudentModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={createStudentsMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {createStudentsMutation.isPending ? 'Menyimpan...' : 'Simpan & Daftar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                , document.body)}

            {/* Modal: Edit Extracurricular Student */}
            {editingExtraStudent && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingExtraStudent(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Edit Siswa Ekskul
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Perbarui nama, jenis kelamin, atau kelas khusus ekskul.
                            </p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateExtraStudentMutation.mutate({
                                id: editingExtraStudent.id,
                                name: editingExtraStudent.name,
                                gender: editingExtraStudent.gender || 'Laki-laki',
                                class_name: editingExtraStudent.class_name || '',
                            });
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nama Siswa <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingExtraStudent.name}
                                    onChange={(e) => setEditingExtraStudent({ ...editingExtraStudent, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Jenis Kelamin
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Laki-laki', 'Perempuan'].map((gender) => (
                                        <button
                                            key={gender}
                                            type="button"
                                            onClick={() => setEditingExtraStudent({
                                                ...editingExtraStudent,
                                                gender: gender as Gender
                                            })}
                                            className={`px-4 py-2.5 rounded-xl border font-medium transition-all ${editingExtraStudent.gender === gender
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400'
                                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {gender}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Kelas (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={editingExtraStudent.class_name || ''}
                                    onChange={(e) => setEditingExtraStudent({ ...editingExtraStudent, class_name: e.target.value })}
                                    placeholder="mis. 7B"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingExtraStudent(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateExtraStudentMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                                >
                                    {updateExtraStudentMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                        <div className="px-6 pb-6">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteExtraStudent(editingExtraStudent)}
                                className="w-full px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Hapus Siswa Ekskul
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Confirm Delete Extracurricular Student */}
            {confirmDeleteExtraStudent && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteExtraStudent(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Hapus Siswa Ekskul
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 dark:text-slate-400">
                                Hapus <strong className="text-slate-900 dark:text-white">{confirmDeleteExtraStudent.name}</strong>? Data presensi/nilai ekskul terkait juga akan terhapus.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteExtraStudent(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteExtraStudentMutation.mutate(confirmDeleteExtraStudent.id)}
                                    disabled={deleteExtraStudentMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-70"
                                >
                                    {deleteExtraStudentMutation.isPending ? 'Menghapus...' : 'Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </div>
    );
};

export default ExtracurricularPage;
