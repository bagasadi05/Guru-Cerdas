import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import achievementService from '../services/achievementService';
import { queryKeys } from '../lib/queryKeys';
import { StudentAchievementInsert, StudentAchievementUpdate } from '../types/studentAchievement';
import { useToast } from './useToast';

/**
 * Hook to retrieve achievements for a student.
 */
export const useStudentAchievements = (studentId: string) => {
    return useQuery({
        queryKey: queryKeys.achievements.byStudent(studentId),
        queryFn: () => achievementService.getByStudent(studentId),
        enabled: !!studentId,
    });
};

/**
 * Hook to create a new achievement.
 */
export const useCreateAchievement = (studentId: string, onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (payload: Omit<StudentAchievementInsert, 'user_id' | 'student_id'>) => {
            return achievementService.create({
                ...payload,
                student_id: studentId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.achievements.byStudent(studentId),
            });
            // Also invalidate dashboard data as achievements can affect it
            queryClient.invalidateQueries({
                queryKey: queryKeys.dashboard.all,
            });
            toast.success('Prestasi berhasil ditambahkan!');
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menambahkan prestasi: ${error.message}`);
        },
    });
};

/**
 * Hook to update an existing achievement.
 */
export const useUpdateAchievement = (studentId: string, onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: StudentAchievementUpdate }) => {
            return achievementService.update(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.achievements.byStudent(studentId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.dashboard.all,
            });
            toast.success('Prestasi berhasil diperbarui!');
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal memperbarui prestasi: ${error.message}`);
        },
    });
};

/**
 * Hook to delete an achievement.
 */
export const useDeleteAchievement = (studentId: string, onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => {
            return achievementService.remove(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.achievements.byStudent(studentId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.dashboard.all,
            });
            toast.success('Prestasi berhasil dihapus!');
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus prestasi: ${error.message}`);
        },
    });
};
