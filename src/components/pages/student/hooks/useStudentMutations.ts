import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { useToast } from '../../../../hooks/useToast';
import { Database } from '../../../../services/database.types';
import { StudentMutationVars, ReportMutationVars, AcademicMutationVars, QuizMutationVars, ViolationMutationVars, CommunicationMutationVars } from '../types';
import { writeAuditLog } from '../../../../services/auditTrail';

const SOFT_DELETE_TABLES = new Set<keyof Database['public']['Tables']>([
    'students',
    'classes',
    'attendance',
    'academic_records',
    'quiz_points',
    'violations',
    'tasks',
]);

export const useStudentMutations = (studentId: string | undefined, onSuccessCloseModal: () => void) => {
    const toast = useToast();
    const queryClient = useQueryClient();

    const getAuthUser = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) throw new Error("User not authenticated");
        return user;
    };

    const getAuditRecord = async (table: keyof Database['public']['Tables'], id: string | number, userId: string) => {
        try {
            const { data } = await (supabase.from as any)(table)
                .select('*')
                .eq('id', String(id))
                .eq('user_id', userId)
                .single();
            return data as Record<string, unknown> | null;
        } catch {
            return null;
        }
    };

    const mutationOptions = {
        onSuccess: () => {
            // Invalidate all student-specific query keys used by StudentDetailPage
            queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentStats', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentGrades', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentQuizzes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentReports', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            onSuccessCloseModal();
            toast.success("Data berhasil disimpan!");
        },
        onError: (error: Error) => { toast.error(error.message); },
    };

    const studentMutation = useMutation({
        mutationFn: async (data: StudentMutationVars) => {
            if (!studentId) throw new Error("Student ID is missing");
            const authUser = await getAuthUser();
            const userId = authUser.id;
            const { error } = await supabase.from('students').update(data).eq('id', studentId).eq('user_id', userId);
            if (error) throw error;
        },
        ...mutationOptions
    });

    const reportMutation = useMutation({
        mutationFn: async (vars: ReportMutationVars) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            if (vars.operation === 'add') {
                const { error } = await supabase.from('reports').insert(vars.data);
                if (error) throw error;
            } else {
                const oldData = await getAuditRecord('reports', vars.id, userId);
                const { error } = await supabase.from('reports').update(vars.data).eq('id', vars.id).eq('user_id', userId);
                if (error) throw error;
                await writeAuditLog({
                    userId,
                    userEmail: authUser.email,
                    tableName: 'reports',
                    recordId: vars.id,
                    action: 'UPDATE',
                    oldData,
                    newData: vars.data as Record<string, unknown>,
                });
            }
        },
        ...mutationOptions
    });

    const academicMutation = useMutation({
        mutationFn: async (vars: AcademicMutationVars) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            if (vars.operation === 'add') {
                const { error } = await supabase.from('academic_records').insert(vars.data);
                if (error) throw error;
            } else {
                const oldData = await getAuditRecord('academic_records', vars.id, userId);
                const { error } = await supabase.from('academic_records').update(vars.data).eq('id', vars.id).eq('user_id', userId);
                if (error) throw error;
                await writeAuditLog({
                    userId,
                    userEmail: authUser.email,
                    tableName: 'academic_records',
                    recordId: vars.id,
                    action: 'UPDATE',
                    oldData,
                    newData: vars.data as Record<string, unknown>,
                });
            }
        },
        ...mutationOptions
    });

    const quizMutation = useMutation({
        mutationFn: async (vars: QuizMutationVars) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            if (vars.operation === 'add') {
                const { error } = await supabase.from('quiz_points').insert(vars.data);
                if (error) throw error;
            } else {
                const oldData = await getAuditRecord('quiz_points', vars.id, userId);
                const { error } = await supabase.from('quiz_points').update(vars.data).eq('id', vars.id).eq('user_id', userId);
                if (error) throw error;
                await writeAuditLog({
                    userId,
                    userEmail: authUser.email,
                    tableName: 'quiz_points',
                    recordId: vars.id,
                    action: 'UPDATE',
                    oldData,
                    newData: vars.data as Record<string, unknown>,
                });
            }
        },
        ...mutationOptions
    });

    const violationMutation = useMutation({
        mutationFn: async (vars: ViolationMutationVars) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            if (vars.operation === 'add') {
                const { error } = await supabase.from('violations').insert(vars.data);
                if (error) throw error;
            } else {
                const oldData = await getAuditRecord('violations', vars.id, userId);
                const { error } = await supabase.from('violations').update(vars.data).eq('id', vars.id).eq('user_id', userId);
                if (error) throw error;
                await writeAuditLog({
                    userId,
                    userEmail: authUser.email,
                    tableName: 'violations',
                    recordId: vars.id,
                    action: 'UPDATE',
                    oldData,
                    newData: vars.data as Record<string, unknown>,
                });
            }
        },
        ...mutationOptions
    });

    const communicationMutation = useMutation({
        mutationFn: async (vars: CommunicationMutationVars) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            const oldData = await getAuditRecord('communications', vars.id, userId);
            const { error } = await supabase.from('communications').update({
                message: vars.data.message
            }).eq('id', vars.id).eq('user_id', userId);
            if (error) throw error;
            await writeAuditLog({
                userId,
                userEmail: authUser.email,
                tableName: 'communications',
                recordId: vars.id,
                action: 'UPDATE',
                oldData,
                newData: vars.data,
            });
        },
        ...mutationOptions
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ table, id }: { table: keyof Database['public']['Tables'], id: string | number }) => {
            const authUser = await getAuthUser();
            const userId = authUser.id;
            const oldData = await getAuditRecord(table, id, userId);
            // If deleting a communication, also delete the attachment from storage
            if (table === 'communications') {
                // First, get the communication to check for attachment
                const { data: comm } = await supabase
                    .from('communications')
                    .select('attachment_url')
                    .eq('id', String(id))
                    .eq('user_id', userId)
                    .single();

                // If there's an attachment, delete it from storage
                if (comm?.attachment_url) {
                    try {
                        // Extract file path from URL
                        // URL format: https://xxx.supabase.co/storage/v1/object/public/communication_attachments/studentId/filename.ext
                        const url = new URL(comm.attachment_url);
                        const pathParts = url.pathname.split('/communication_attachments/');
                        if (pathParts.length > 1) {
                            const filePath = pathParts[1];
                            await supabase.storage
                                .from('communication_attachments')
                                .remove([filePath]);
                        }
                    } catch (e) {
                        console.error('Failed to delete attachment from storage:', e);
                        // Continue with deleting the record even if storage delete fails
                    }
                }
            }

            const query = SOFT_DELETE_TABLES.has(table)
                ? supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
                : supabase.from(table).delete().eq('id', id).eq('user_id', userId);
            const { error } = await query;
            if (error) throw error;
            await writeAuditLog({
                userId,
                userEmail: authUser.email,
                tableName: table,
                recordId: String(id),
                action: 'DELETE',
                oldData,
                newData: null,
            });
        },
        onSuccess: (_d, v) => {
            queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentStats', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentGrades', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentQuizzes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentReports', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items-all'] });
            onSuccessCloseModal();
            toast.success(`Data dari tabel ${v.table} berhasil dihapus.`);
        },
        onError: (error: Error) => { toast.error(error.message); }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (params: {
            message: string;
            attachment?: { file: File; type: 'image' | 'document' }
        }) => {
            if (!studentId) throw new Error("Data tidak lengkap");
            const user = await getAuthUser();

            let attachmentUrl: string | null = null;
            let attachmentName: string | null = null;
            let attachmentType: 'image' | 'document' | null = null;

            // Upload attachment if provided
            if (params.attachment) {
                const file = params.attachment.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${studentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('communication_attachments')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error(`Gagal upload file: ${uploadError.message}`);
                }

                const { data: publicUrlData } = supabase.storage
                    .from('communication_attachments')
                    .getPublicUrl(fileName);

                attachmentUrl = publicUrlData.publicUrl;
                attachmentName = file.name;
                attachmentType = params.attachment.type;
            }

            const { error } = await supabase.from('communications').insert({
                student_id: studentId,
                user_id: user.id,
                teacher_id: user.id, // Add required teacher_id
                message: params.message,
                sender: 'teacher',
                is_read: false,
                attachment_url: attachmentUrl,
                attachment_type: attachmentType,
                attachment_name: attachmentName
            });
            if (error) throw error;
            await writeAuditLog({
                userId: user.id,
                userEmail: user.email,
                tableName: 'communications',
                recordId: studentId,
                action: 'INSERT',
                oldData: null,
                newData: {
                    student_id: studentId,
                    sender: 'teacher',
                    has_attachment: !!attachmentUrl,
                },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentCommsUnreadCount', studentId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            onSuccessCloseModal();
            toast.success("Pesan berhasil dikirim!");
        },
        onError: (error: Error) => toast.error(error.message)
    });

    const applyPointsMutation = useMutation({
        mutationFn: async ({ subject, semesterId }: { subject: string; semesterId?: string | null }) => {
            if (!studentId) throw new Error("Data tidak lengkap");
            const authUser = await getAuthUser();
            const userId = authUser.id;

            let pointsQuery = supabase
                .from('quiz_points')
                .select('id, points')
                .eq('student_id', studentId)
                .eq('user_id', userId)
                .eq('is_used', false)
                .is('deleted_at', null);

            let gradeQuery = supabase
                .from('academic_records')
                .select('id, score')
                .eq('student_id', studentId)
                .eq('user_id', userId)
                .eq('subject', subject)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1);

            if (semesterId) {
                pointsQuery = pointsQuery.eq('semester_id', semesterId);
                gradeQuery = gradeQuery.eq('semester_id', semesterId);
            }

            const [{ data: points, error: pointsError }, { data: grades, error: gradeError }] = await Promise.all([
                pointsQuery,
                gradeQuery
            ]);

            if (pointsError) throw pointsError;
            if (gradeError) throw gradeError;
            if (!points || points.length === 0) throw new Error("Tidak ada poin keaktifan yang tersedia.");
            if (!grades || grades.length === 0) throw new Error("Nilai untuk mata pelajaran ini belum tersedia.");

            const currentGrade = grades[0];
            const totalPoints = points.reduce((sum, point) => sum + (point.points || 0), 0);
            const newScore = Math.min(100, currentGrade.score + totalPoints);
            const usedAt = new Date().toISOString();

            const { error: updateGradeError } = await supabase
                .from('academic_records')
                .update({ score: newScore })
                .eq('id', currentGrade.id)
                .eq('user_id', userId);

            if (updateGradeError) throw updateGradeError;

            const { error: updatePointsError } = await supabase
                .from('quiz_points')
                .update({
                    is_used: true,
                    used_at: usedAt,
                    used_for_subject: subject
                })
                .in('id', points.map(point => point.id))
                .eq('user_id', userId);

            if (updatePointsError) throw updatePointsError;
            await writeAuditLog({
                userId,
                userEmail: authUser.email,
                tableName: 'academic_records',
                recordId: currentGrade.id,
                action: 'UPDATE',
                oldData: { score: currentGrade.score },
                newData: { score: newScore, applied_points: totalPoints, subject, semester_id: semesterId || null },
            });
            await writeAuditLog({
                userId,
                userEmail: authUser.email,
                tableName: 'quiz_points',
                recordId: points.map(point => point.id).join(','),
                action: 'UPDATE',
                oldData: { is_used: false, count: points.length },
                newData: { is_used: true, used_at: usedAt, used_for_subject: subject, count: points.length },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentGrades', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentQuizzes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            onSuccessCloseModal();
            toast.success("Poin berhasil diterapkan dan nilai diperbarui!");
        },
        onError: (err: Error) => toast.error(`Gagal menerapkan poin: ${err.message}`)
    });

    return {
        studentMutation,
        reportMutation,
        academicMutation,
        quizMutation,
        violationMutation,
        communicationMutation,
        deleteMutation,
        sendMessageMutation,
        applyPointsMutation
    };
};
