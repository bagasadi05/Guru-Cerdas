import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { useToast } from '../../../../hooks/useToast';
import { Database } from '../../../../services/database.types';
import { StudentMutationVars, ReportMutationVars, AcademicMutationVars, QuizMutationVars, ViolationMutationVars, CommunicationMutationVars } from '../types';

export const useStudentMutations = (studentId: string | undefined, onSuccessCloseModal: () => void) => {
    const toast = useToast();
    const queryClient = useQueryClient();

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            onSuccessCloseModal();
            toast.success("Data berhasil disimpan!");
        },
        onError: (error: Error) => { toast.error(error.message); },
    };

    const studentMutation = useMutation({
        mutationFn: async (data: StudentMutationVars) => {
            if (!studentId) throw new Error("Student ID is missing");
            const { error } = await supabase.from('students').update(data).eq('id', studentId);
            if (error) throw error;
        },
        ...mutationOptions
    });

    const reportMutation = useMutation({
        mutationFn: async (vars: ReportMutationVars) => {
            if (vars.operation === 'add') {
                const { error } = await supabase.from('reports').insert(vars.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('reports').update(vars.data).eq('id', vars.id);
                if (error) throw error;
            }
        },
        ...mutationOptions
    });

    const academicMutation = useMutation({
        mutationFn: async (vars: AcademicMutationVars) => {
            if (vars.operation === 'add') {
                const { error } = await supabase.from('academic_records').insert(vars.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('academic_records').update(vars.data).eq('id', vars.id);
                if (error) throw error;
            }
        },
        ...mutationOptions
    });

    const quizMutation = useMutation({
        mutationFn: async (vars: QuizMutationVars) => {
            if (vars.operation === 'add') {
                const { error } = await supabase.from('quiz_points').insert(vars.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('quiz_points').update(vars.data).eq('id', vars.id);
                if (error) throw error;
            }
        },
        ...mutationOptions
    });

    const violationMutation = useMutation({
        mutationFn: async (vars: ViolationMutationVars) => {
            if (vars.operation === 'add') {
                const { error } = await supabase.from('violations').insert(vars.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('violations').update(vars.data).eq('id', vars.id);
                if (error) throw error;
            }
        },
        ...mutationOptions
    });

    const communicationMutation = useMutation({
        mutationFn: async (vars: CommunicationMutationVars) => {
            const { error } = await supabase.from('communications').update(vars.data).eq('id', vars.id);
            if (error) throw error;
        },
        ...mutationOptions
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ table, id }: { table: keyof Database['public']['Tables'], id: string | number }) => {
            // If deleting a communication, also delete the attachment from storage
            if (table === 'communications') {
                // First, get the communication to check for attachment
                const { data: comm } = await supabase
                    .from('communications')
                    .select('attachment_url')
                    .eq('id', String(id))
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

            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_d, v) => {
            queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

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
                message: params.message,
                sender: 'teacher',
                is_read: false,
                attachment_url: attachmentUrl,
                attachment_type: attachmentType,
                attachment_name: attachmentName
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
        },
        onError: (error: Error) => toast.error(error.message)
    });

    const applyPointsMutation = useMutation({
        mutationFn: async (subject: string) => {
            if (!studentId) throw new Error("Data tidak lengkap");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase.rpc('apply_quiz_points_to_grade', {
                student_id_param: studentId,
                subject_param: subject,
                user_id_param: user.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
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
