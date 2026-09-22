import React, { useState, useRef } from 'react';
import { r2StorageService } from '../../../../../services/r2StorageService';
import { optimizeImage } from '../../../../utils/image';
import { generateSimpleAccessCode } from '../../../../../utils/accessCode';
import { logger } from '../../../../../services/logger';
import { useToast } from '../../../../../hooks/useToast';
import { StudentWithClass } from '../../types';

interface UseStudentProfileActionsParams {
    studentId: string | undefined;
    studentDetails: { student: StudentWithClass } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    studentMutation: any;
    toast: ReturnType<typeof useToast>;
}

export function useStudentProfileActions({
    studentId,
    studentDetails,
    studentMutation,
    toast,
}: UseStudentProfileActionsParams) {
    const [copied, setCopied] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handleCopyAccessCode = () => {
        if (!studentDetails?.student.access_code) return;
        navigator.clipboard.writeText(studentDetails.student.access_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateAccessCode = async () => {
        if (!studentId || studentMutation.isPending) return;
        const newCode = generateSimpleAccessCode();
        studentMutation.mutate({ access_code: newCode });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !studentId) return;
        setIsUploadingPhoto(true);
        const file = e.target.files[0];
        try {
            const optimizedBlob = await optimizeImage(file, { maxWidth: 300, quality: 0.8 });
            const fileToUpload = new File([optimizedBlob], file.name || 'avatar.jpg', { type: 'image/jpeg' });
            const result = await r2StorageService.uploadFile(fileToUpload, 'student_avatars');

            // Delete old avatar if it exists
            const oldAvatarUrl = studentDetails?.student?.avatar_url;
            if (oldAvatarUrl) {
                try {
                    await r2StorageService.deleteFile({ publicUrl: oldAvatarUrl });
                } catch (delErr) {
                    console.error('Failed to delete old student avatar:', delErr);
                }
            }

            studentMutation.mutate({ avatar_url: result.publicUrl });
        } catch (error: unknown) {
            toast.error(`Gagal unggah foto: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleShare = () => {
        if (navigator.share && studentDetails?.student.access_code) {
            navigator.share({
                title: `Akses Portal Siswa - ${studentDetails.student.name}`,
                text: `Gunakan kode akses ${studentDetails.student.access_code} untuk melihat perkembangan ${studentDetails.student.name} di portal siswa.`,
                url: window.location.origin,
            })
                .then(() => logger.debug('Access code shared', 'StudentDetail'))
                .catch((error) => logger.warn('Share sheet dismissed or failed', 'StudentDetail', error));
        } else {
            toast.info('Fitur berbagi tidak didukung di browser ini. Silakan salin kodenya secara manual.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return {
        copied,
        setCopied,
        photoInputRef,
        isUploadingPhoto,
        handleCopyAccessCode,
        handleGenerateAccessCode,
        handlePhotoChange,
        handleShare,
        handlePrint,
    };
}
