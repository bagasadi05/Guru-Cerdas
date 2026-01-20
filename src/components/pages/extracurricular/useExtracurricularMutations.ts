/**
 * Custom hook for managing extracurricular mutations
 * Encapsulates all create, update, delete operations for the extracurricular module
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';
import { useToast } from '../../../hooks/useToast';
import {
    Extracurricular,
    ExtracurricularInsert,
    ExtracurricularAttendance,
    Gender,
    AttendanceStatus,
} from './types';
import { normalizeClassName } from './useExtracurricularData';

export interface UseExtracurricularMutationsOptions {
    selectedExtracurricular: string;
    selectedDate: string;
    editingExtracurricular: Extracurricular | null;
    onModalClose: () => void;
    onAddStudentModalClose: () => void;
}

export function useExtracurricularMutations(options: UseExtracurricularMutationsOptions) {
    const {
        selectedExtracurricular,
        selectedDate,
        editingExtracurricular,
        onModalClose,
        onAddStudentModalClose,
    } = options;
    const { user } = useAuth();
    const { activeSemester } = useSemester();
    const queryClient = useQueryClient();
    const toast = useToast();

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
            onModalClose();
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

    // Update attendance (single)
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
                notes: null,
            }];

            const { error } = await supabase.rpc('upsert_extracurricular_attendance', {
                p_items: rpcPayload,
                p_user_id: user!.id
            });

            if (error) throw error;
        },
        onMutate: async ({ studentId, studentType, status }) => {
            await queryClient.cancelQueries({ queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate] });

            const previousAttendance = queryClient.getQueryData<ExtracurricularAttendance[]>(['extracurricular_attendance', selectedExtracurricular, selectedDate]);

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
                        return [...old, newRecord as ExtracurricularAttendance];
                    }
                }
            );

            return { previousAttendance };
        },
        onError: (err, _vars, context) => {
            if (context?.previousAttendance) {
                queryClient.setQueryData(['extracurricular_attendance', selectedExtracurricular, selectedDate], context.previousAttendance);
            }
            toast.error(`Gagal menyimpan: ${(err as Error).message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate] });
        },
    });

    // Bulk Update Attendance
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

    // Create new extracurricular student
    const createStudentsMutation = useMutation({
        mutationFn: async ({ rows, bulkClassName }: {
            rows: Array<{ name: string; gender: Gender; class_name: string }>;
            bulkClassName?: string;
        }) => {
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
            onAddStudentModalClose();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    // Update extracurricular student
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
            toast.success('Siswa ekskul berhasil diperbarui');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    // Delete extracurricular student
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
            toast.success('Siswa ekskul dihapus');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    return {
        extracurricularMutation,
        deleteExtracurricularMutation,
        enrollmentMutation,
        attendanceMutation,
        bulkAttendanceMutation,
        gradeMutation,
        createStudentsMutation,
        updateExtraStudentMutation,
        deleteExtraStudentMutation,
    };
}
