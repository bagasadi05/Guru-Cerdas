import { useState } from 'react';
import {
    useStudentAchievements,
    useDeleteAchievement,
    useCreateAchievement,
    useUpdateAchievement,
} from '../../../../../hooks/useAchievements';
import achievementService from '../../../../../services/achievementService';
import type { AchievementFormValues } from '../../schemas';

interface UseStudentAchievementActionsParams {
    studentId?: string;
    modalState: any;
    setModalState: React.Dispatch<React.SetStateAction<any>>;
    selectedSemesterId: string | null;
    toast: any;
}

export function useStudentAchievementActions({
    studentId,
    modalState,
    setModalState,
    selectedSemesterId,
    toast,
}: UseStudentAchievementActionsParams) {
    const [fileActionStatus, setFileActionStatus] = useState<'idle' | 'uploading' | 'deleting'>('idle');

    const {
        data: achievements = [],
        isLoading: isAchievementsLoading,
        error: achievementsError,
    } = useStudentAchievements(studentId || '');

    const deleteAchievementMutation = useDeleteAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });

    const createAchievementMutation = useCreateAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });

    const updateAchievementMutation = useUpdateAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });

    const handleDeleteAchievement = (id: string) => {
        setModalState({
            type: 'confirmDelete',
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus data prestasi ini secara permanen beserta file sertifikatnya?',
            onConfirm: () => {
                setModalState((prev: any) => ({ ...prev, isPending: true }));
                deleteAchievementMutation.mutate(id);
            },
            isPending: false,
        });
    };

    const handleAchievementSubmit = async (
        data: AchievementFormValues & { evidence_file?: File | null; certificate_removed?: boolean }
    ) => {
        if (!studentId) return;

        let certificateUrl =
            modalState.type === 'achievement' && modalState.mode === 'edit'
                ? modalState.data?.certificate_url
                : null;
        let certificateName =
            modalState.type === 'achievement' && modalState.mode === 'edit'
                ? modalState.data?.certificate_name
                : null;

        if (data.evidence_file) {
            setFileActionStatus('uploading');
            try {
                const uploadResult = await achievementService.uploadCertificate(studentId, data.evidence_file);
                if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.certificate_url) {
                    await achievementService.removeCertificate(modalState.data.certificate_url);
                }
                certificateUrl = uploadResult.publicUrl;
                certificateName = data.evidence_file.name;
            } catch (error: any) {
                toast.error(`Gagal mengunggah file: ${error.message}`);
                setFileActionStatus('idle');
                return;
            }
        } else if (data.certificate_removed === true) {
            if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.certificate_url) {
                setFileActionStatus('deleting');
                try {
                    await achievementService.removeCertificate(modalState.data.certificate_url);
                } catch (error: any) {
                    toast.error(`Gagal menghapus file lama: ${error.message}`);
                    setFileActionStatus('idle');
                    return;
                }
            }
            certificateUrl = null;
            certificateName = null;
        }

        const payload = {
            title: data.title,
            category: data.category,
            level: data.level,
            rank: data.rank || null,
            organizer: data.organizer || null,
            date: data.date,
            description: data.description || null,
            points: data.points || null,
            certificate_url: certificateUrl,
            certificate_name: certificateName,
            semester_id: selectedSemesterId || null,
        };

        const mutationOptions = {
            onSettled: () => {
                setFileActionStatus('idle');
            },
        };

        if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.id) {
            updateAchievementMutation.mutate(
                {
                    id: modalState.data.id,
                    payload,
                },
                mutationOptions
            );
        } else {
            createAchievementMutation.mutate(payload, mutationOptions);
        }
    };

    return {
        achievements,
        isAchievementsLoading,
        achievementsError,
        fileActionStatus,
        handleDeleteAchievement,
        handleAchievementSubmit,
        isSubmittingAchievement:
            createAchievementMutation.isPending || updateAchievementMutation.isPending,
        deleteAchievementMutation,
        createAchievementMutation,
        updateAchievementMutation,
    };
}
