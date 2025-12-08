/**
 * React Hook for Grade Management with Backend Integration
 * 
 * Provides:
 * - Bulk grade submission with retry
 * - Optimistic locking for updates
 * - Rate limit awareness
 * - Audit log viewing
 */

import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import {
    bulkInsertGrades,
    updateGradeWithVersion,
    checkRateLimit,
    getAuditLogs,
    GradeInput,
    BulkInsertResult,
    UpdateWithVersionResult,
    AuditLog,
} from '../services/gradeService';
import { createBackup, restoreBackup, createGradeBackupKey } from '../utils/dataBackup';
import { parseError } from '../utils/errorMessages';

interface UseGradeManagementOptions {
    classId?: string;
    subject?: string;
    assessmentName?: string;
}

interface UseGradeManagementReturn {
    // State
    isSubmitting: boolean;
    lastResult: BulkInsertResult | null;

    // Actions
    submitGrades: (grades: GradeInput[]) => Promise<BulkInsertResult>;
    updateGrade: (recordId: string, score: number, notes: string, version: number) => Promise<UpdateWithVersionResult>;
    retrySubmit: () => Promise<BulkInsertResult | null>;

    // Audit
    fetchAuditLogs: (recordId?: string) => Promise<AuditLog[]>;

    // Rate limit
    checkCanSubmit: () => Promise<boolean>;
}

export const useGradeManagement = (
    options: UseGradeManagementOptions = {}
): UseGradeManagementReturn => {
    const { classId = '', subject = '', assessmentName = '' } = options;
    const toast = useToast();
    const { user } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState<BulkInsertResult | null>(null);
    const [lastGrades, setLastGrades] = useState<GradeInput[] | null>(null);

    /**
     * Check if user can submit (rate limit)
     */
    const checkCanSubmit = useCallback(async (): Promise<boolean> => {
        const canSubmit = await checkRateLimit('bulk_insert_grades', 10, 60);
        if (!canSubmit) {
            toast.error('Terlalu banyak request. Tunggu beberapa menit.');
        }
        return canSubmit;
    }, [toast]);

    /**
     * Submit grades with backup and retry capability
     */
    const submitGrades = useCallback(async (grades: GradeInput[]): Promise<BulkInsertResult> => {
        if (!user) {
            return {
                success: false,
                inserted: 0,
                failed: grades.length,
                errors: [],
                error: 'Anda harus login terlebih dahulu',
            };
        }

        setIsSubmitting(true);
        setLastGrades(grades);

        // Create backup before submit
        const backupKey = createGradeBackupKey(classId, subject, assessmentName);
        createBackup(grades, {
            key: backupKey,
            context: `Nilai ${subject} - ${assessmentName}`,
        });

        try {
            const result = await bulkInsertGrades(grades, user.id);
            setLastResult(result);

            if (result.success) {
                toast.success(`${result.inserted} nilai berhasil disimpan!`);
            } else if (result.code === 'RATE_LIMIT') {
                toast.error('Terlalu banyak request. Tunggu beberapa menit.');
            } else if (result.failed > 0) {
                toast.warning(`${result.inserted} berhasil, ${result.failed} gagal. Periksa error.`);
            } else {
                const errorInfo = parseError(new Error(result.error));
                toast.error(errorInfo.message);
            }

            return result;
        } catch (error) {
            const errorInfo = parseError(error);
            toast.error(errorInfo.message);

            const failResult: BulkInsertResult = {
                success: false,
                inserted: 0,
                failed: grades.length,
                errors: [],
                error: errorInfo.message,
            };
            setLastResult(failResult);
            return failResult;
        } finally {
            setIsSubmitting(false);
        }
    }, [user, classId, subject, assessmentName, toast]);

    /**
     * Retry last failed submission
     */
    const retrySubmit = useCallback(async (): Promise<BulkInsertResult | null> => {
        if (!lastGrades) {
            // Try to restore from backup
            const backupKey = createGradeBackupKey(classId, subject, assessmentName);
            const restored = restoreBackup<GradeInput[]>(backupKey);

            if (restored) {
                return submitGrades(restored);
            }

            toast.error('Tidak ada data untuk di-retry');
            return null;
        }

        return submitGrades(lastGrades);
    }, [lastGrades, classId, subject, assessmentName, submitGrades, toast]);

    /**
     * Update single grade with optimistic locking
     */
    const updateGrade = useCallback(async (
        recordId: string,
        score: number,
        notes: string,
        version: number
    ): Promise<UpdateWithVersionResult> => {
        setIsSubmitting(true);

        try {
            const result = await updateGradeWithVersion(recordId, score, notes, version);

            if (result.success) {
                toast.success('Nilai berhasil diupdate');
            } else if (result.code === 'CONFLICT') {
                toast.warning('Data telah diubah oleh pengguna lain. Muat ulang halaman.');
            } else if (result.code === 'NOT_FOUND') {
                toast.error('Data tidak ditemukan');
            } else {
                toast.error(result.error || 'Gagal mengupdate nilai');
            }

            return result;
        } catch (error) {
            const errorInfo = parseError(error);
            toast.error(errorInfo.message);
            return {
                success: false,
                error: errorInfo.message,
            };
        } finally {
            setIsSubmitting(false);
        }
    }, [toast]);

    /**
     * Fetch audit logs for a record
     */
    const fetchAuditLogs = useCallback(async (recordId?: string): Promise<AuditLog[]> => {
        return getAuditLogs('academic_records', recordId);
    }, []);

    return {
        isSubmitting,
        lastResult,
        submitGrades,
        updateGrade,
        retrySubmit,
        fetchAuditLogs,
        checkCanSubmit,
    };
};

export default useGradeManagement;
