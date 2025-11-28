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
        mutationFn: async (messageText: string) => {
            if (!studentId) throw new Error("Data tidak lengkap");
            // Note: user_id needs to be passed or retrieved from auth context if not available here. 
            // Assuming we pass it or get it from supabase.auth.getUser() but hooks rules apply.
            // Better to pass user object or ID to the hook.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase.from('communications').insert({
                student_id: studentId,
                user_id: user.id,
                message: messageText,
                sender: 'teacher',
                is_read: false
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
            // onSuccessCloseModal(); // Usually we don't close modal for sending message, or maybe we do? 
            // In the original code: setNewMessage('') was called.
            // We might need a specific callback for this.
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
