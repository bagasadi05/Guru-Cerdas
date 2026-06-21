import { supabase } from './supabase';
import { r2StorageService } from './r2StorageService';
import {
    StudentAchievement,
    StudentAchievementInsert,
    StudentAchievementUpdate,
} from '../types/studentAchievement';

/**
 * Helper to extract file path from Supabase storage public URL.
 */
const extractStoragePathFromPublicUrl = (publicUrl: string | null | undefined, bucket: string) => {
    if (!publicUrl) return null;
    try {
        const url = new URL(publicUrl);
        const marker = `/${bucket}/`;
        const [, path] = url.pathname.split(marker);
        return path ? decodeURIComponent(path) : null;
    } catch {
        return null;
    }
};

/**
 * Fetch achievements for a specific student.
 */
export const getByStudent = async (studentId: string): Promise<StudentAchievement[]> => {
    const { data, error } = await (supabase
        .from('student_achievements' as any) as any)
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

    if (error) {
        throw error;
    }

    return (data || []) as StudentAchievement[];
};

/**
 * Upload a certificate file to student_assets bucket.
 */
export const uploadCertificate = async (
    _studentId: string,
    file: File
): Promise<{ publicUrl: string; storagePath: string }> => {
    const result = await r2StorageService.uploadFile(file, 'achievement_certificates');
    return {
        publicUrl: result.publicUrl,
        storagePath: result.key,
    };
};

/**
 * Remove a certificate file from Cloudflare R2 by its URL.
 */
export const removeCertificate = async (url: string): Promise<void> => {
    await r2StorageService.deleteFile({ publicUrl: url });
};

/**
 * Create a new student achievement.
 */
export const create = async (
    payload: Omit<StudentAchievementInsert, 'user_id'>
): Promise<StudentAchievement> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    const fullPayload: StudentAchievementInsert = {
        ...payload,
        user_id: userData.user.id,
    };

    const { data, error } = await (supabase
        .from('student_achievements' as any) as any)
        .insert(fullPayload)
        .select('*')
        .single();

    if (error) {
        throw error;
    }

    return data as StudentAchievement;
};

/**
 * Update an existing student achievement.
 */
export const update = async (
    id: string,
    payload: StudentAchievementUpdate
): Promise<StudentAchievement> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    const { data, error } = await (supabase
        .from('student_achievements' as any) as any)
        .update(payload)
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .select('*')
        .single();

    if (error) {
        throw error;
    }

    return data as StudentAchievement;
};

/**
 * Delete a student achievement. Automatically deletes the certificate file if associated.
 */
export const remove = async (id: string): Promise<void> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    // 1. Fetch details to see if a certificate needs to be deleted
    const { data: achievement, error: fetchError } = await (supabase
        .from('student_achievements' as any) as any)
        .select('certificate_url')
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();

    if (fetchError) {
        throw fetchError;
    }

    // 2. Remove certificate if it exists
    if (achievement?.certificate_url) {
        try {
            await removeCertificate(achievement.certificate_url);
        } catch (storageError) {
            console.error('Failed to delete certificate file from storage:', storageError);
        }
    }

    // 3. Delete database record
    const { error: deleteError } = await (supabase
        .from('student_achievements' as any) as any)
        .delete()
        .eq('id', id)
        .eq('user_id', userData.user.id);

    if (deleteError) {
        throw deleteError;
    }
};

export default {
    getByStudent,
    uploadCertificate,
    removeCertificate,
    create,
    update,
    remove,
};
