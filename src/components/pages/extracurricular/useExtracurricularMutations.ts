/**
 * Custom hook for managing extracurricular mutations
 * Encapsulates all create, update, delete operations for the extracurricular module
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { softDelete } from '../../../services/SoftDeleteService';
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

async function enrollSingleParticipant(params: {
    extracurricularId: string;
    semesterId: string;
    userId: string;
    studentId: string;
    studentType: 'student' | 'extracurricular_student';
}) {
    const { extracurricularId, semesterId, userId, studentId, studentType } = params;
    const colName = studentType === 'student' ? 'student_id' : 'extracurricular_student_id';

    // Check if an enrollment row (active or soft-deleted) already exists to avoid partial unique index conflict
    const existingQuery = supabase
        .from('student_extracurriculars')
        .select('id, deleted_at')
        .eq('extracurricular_id', extracurricularId)
        .eq('semester_id', semesterId)
        .eq(colName, studentId)
        .maybeSingle();

    const { data: existing, error: selectError } = await existingQuery;
    if (!selectError && existing?.id) {
        if (existing.deleted_at !== null) {
            const { error: restoreError } = await supabase
                .from('student_extracurriculars')
                .update({ deleted_at: null, status: 'active' } as never)
                .eq('id', existing.id);
            if (restoreError) throw restoreError;
        }
        return;
    }

    const payload =
        studentType === 'student'
            ? { student_id: studentId }
            : { extracurricular_student_id: studentId };

    const { error } = await supabase
        .from('student_extracurriculars')
        .insert({
            ...payload,
            extracurricular_id: extracurricularId,
            semester_id: semesterId,
            user_id: userId,
        });
    if (error) throw error;
}

async function upsertSingleGrade(params: {
    extracurricularId: string;
    semesterId: string;
    userId: string;
    studentId: string;
    studentType: 'student' | 'extracurricular_student';
    grade?: string | null;
    score?: number | null;
    description?: string | null;
}) {
    const {
        extracurricularId,
        semesterId,
        userId,
        studentId,
        studentType,
        grade,
        score,
        description,
    } = params;

    const colName = studentType === 'student' ? 'student_id' : 'extracurricular_student_id';

    // Check if grade row already exists (avoids PostgREST ON CONFLICT failure on partial unique indexes)
    const { data: existing, error: selectError } = await supabase
        .from('extracurricular_grades')
        .select('id')
        .eq('extracurricular_id', extracurricularId)
        .eq('semester_id', semesterId)
        .eq(colName, studentId)
        .maybeSingle();

    if (!selectError && existing?.id) {
        const { error: updateError } = await supabase
            .from('extracurricular_grades')
            .update({
                grade: grade ?? null,
                score: score ?? null,
                description: description ?? null,
                deleted_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        if (updateError) throw updateError;
        return;
    }

    const payload =
        studentType === 'student'
            ? { student_id: studentId }
            : { extracurricular_student_id: studentId };

    const { error: insertError } = await supabase
        .from('extracurricular_grades')
        .insert({
            ...payload,
            extracurricular_id: extracurricularId,
            semester_id: semesterId,
            grade: grade ?? null,
            score: score ?? null,
            description: description ?? null,
            user_id: userId,
        });

    if (insertError) throw insertError;
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
            const result = await softDelete('extracurriculars', id);
            if (!result.success) throw new Error(result.error || 'Gagal menghapus ekskul');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurriculars'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars_counts'] });
            toast.success('Ekskul berhasil dihapus');
        },
        onError: (error: Error) => {
            toast.error(error.message);
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
            if (!selectedExtracurricular || !activeSemester?.id) {
                throw new Error('Semester aktif atau ekstrakurikuler belum dipilih');
            }

            if (action === 'enroll') {
                await enrollSingleParticipant({
                    extracurricularId: selectedExtracurricular,
                    semesterId: activeSemester.id,
                    userId: user!.id,
                    studentId,
                    studentType,
                });
            } else {
                const now = new Date().toISOString();
                const deleteQuery = supabase
                    .from('student_extracurriculars')
                    .update({ deleted_at: now } as never)
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester.id);

                const { error } =
                    studentType === 'student'
                        ? await deleteQuery.eq('student_id', studentId)
                        : await deleteQuery.eq('extracurricular_student_id', studentId);

                if (error) throw error;
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars_counts'] });
            toast.success(
                variables.action === 'enroll'
                    ? 'Siswa berhasil didaftarkan ke ekstrakurikuler'
                    : 'Siswa dikeluarkan dari ekstrakurikuler'
            );
        },
        onError: (error: Error) => {
            toast.error(`Gagal memperbarui anggota: ${error.message}`);
        },
    });

    // Bulk Enroll students
    const bulkEnrollmentMutation = useMutation({
        mutationFn: async (items: Array<{ studentId: string; studentType: 'student' | 'extracurricular_student' }>) => {
            if (!selectedExtracurricular || !activeSemester?.id) {
                throw new Error('Semester aktif atau ekstrakurikuler belum dipilih');
            }
            for (const item of items) {
                await enrollSingleParticipant({
                    extracurricularId: selectedExtracurricular,
                    semesterId: activeSemester.id,
                    userId: user!.id,
                    studentId: item.studentId,
                    studentType: item.studentType,
                });
            }
            return items.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars_counts'] });
            toast.success(`${count} siswa berhasil didaftarkan ke ekstrakurikuler`);
        },
        onError: (error: Error) => {
            toast.error(`Gagal mendaftarkan siswa: ${error.message}`);
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

    // Update grade (single)
    const gradeMutation = useMutation({
        mutationFn: async ({
            studentId,
            studentType,
            grade,
            score,
            description,
        }: {
            studentId: string;
            studentType: 'student' | 'extracurricular_student';
            grade?: string | null;
            score?: number | null;
            description?: string | null;
        }) => {
            if (!activeSemester?.id) {
                throw new Error('Semester aktif tidak ditemukan');
            }
            await upsertSingleGrade({
                extracurricularId: selectedExtracurricular,
                semesterId: activeSemester.id,
                userId: user!.id,
                studentId,
                studentType,
                grade,
                score,
                description,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_grades'] });
            toast.success('Nilai berhasil disimpan');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Bulk update grades
    const bulkGradeMutation = useMutation({
        mutationFn: async (
            items: Array<{
                studentId: string;
                studentType: 'student' | 'extracurricular_student';
                grade?: string | null;
                score?: number | null;
                description?: string | null;
            }>
        ) => {
            if (!activeSemester?.id) {
                throw new Error('Semester aktif tidak ditemukan');
            }
            for (const item of items) {
                await upsertSingleGrade({
                    extracurricularId: selectedExtracurricular,
                    semesterId: activeSemester.id,
                    userId: user!.id,
                    studentId: item.studentId,
                    studentType: item.studentType,
                    grade: item.grade,
                    score: item.score,
                    description: item.description,
                });
            }
            return items.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_grades'] });
            toast.success(`Nilai & deskripsi untuk ${count} siswa berhasil disimpan`);
        },
        onError: (error: Error) => {
            toast.error(`Gagal menyimpan nilai massal: ${error.message}`);
        },
    });

    // Create new extracurricular student (works both globally and inside a selected extracurricular)
    const createStudentsMutation = useMutation({
        mutationFn: async ({ rows, bulkClassName }: {
            rows: Array<{ name: string; gender: Gender; class_name: string }>;
            bulkClassName?: string;
        }) => {
            const prepared = rows
                .map((row) => {
                    const name = row.name.trim();
                    const className = row.class_name.trim()
                        ? normalizeClassName(row.class_name)
                        : bulkClassName?.trim()
                            ? normalizeClassName(bulkClassName)
                            : '';
                    return {
                        name,
                        gender: row.gender,
                        class_name: className || null,
                        user_id: user?.id || '',
                    };
                })
                .filter((row) => row.name.length > 0);

            if (prepared.length === 0) {
                throw new Error('Masukkan minimal satu nama siswa yang valid.');
            }

            const { data: inserted, error } = await supabase
                .from('extracurricular_students')
                .insert(prepared)
                .select();

            if (error) throw error;

            // If currently inside a specific extracurricular and active semester exists, auto-enroll them
            if (selectedExtracurricular && activeSemester?.id && inserted && inserted.length > 0) {
                const enrollPayload = inserted.map((student) => ({
                    extracurricular_student_id: student.id,
                    extracurricular_id: selectedExtracurricular,
                    semester_id: activeSemester.id,
                    user_id: user!.id,
                }));

                const { error: enrollError } = await supabase
                    .from('student_extracurriculars')
                    .insert(enrollPayload);
                if (enrollError) throw enrollError;
            }

            return {
                createdCount: inserted?.length || prepared.length,
                autoEnrolled: Boolean(selectedExtracurricular && activeSemester?.id),
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['all_extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars_counts'] });
            toast.success(
                result.autoEnrolled
                    ? `${result.createdCount} siswa eksternal ditambahkan & didaftarkan ke ekstrakurikuler`
                    : `${result.createdCount} siswa eksternal berhasil ditambahkan`
            );
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
            toast.success('Data siswa eksternal berhasil diperbarui');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    // Delete extracurricular student
    const deleteExtraStudentMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await softDelete('extracurricular_students', id);
            if (!result.success) throw new Error(result.error || 'Gagal menghapus siswa ekskul');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['all_extracurricular_students'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars'] });
            queryClient.invalidateQueries({ queryKey: ['student_extracurriculars_counts'] });
            toast.success('Siswa eksternal berhasil dihapus');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    return {
        extracurricularMutation,
        deleteExtracurricularMutation,
        enrollmentMutation,
        bulkEnrollmentMutation,
        attendanceMutation,
        bulkAttendanceMutation,
        gradeMutation,
        bulkGradeMutation,
        createStudentsMutation,
        updateExtraStudentMutation,
        deleteExtraStudentMutation,
    };
}
