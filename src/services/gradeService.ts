/**
 * Supabase RPC Service for Grade Management
 * 
 * Integrates with backend functions for:
 * - Bulk grade insert with validation
 * - Conflict resolution (optimistic locking)
 * - Audit log viewing
 */

import { supabase } from './supabase';

// Types
export interface GradeInput {
    student_id: string;
    subject: string;
    score: number;
    assessment_name: string;
    notes?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
}

export interface BulkInsertResult {
    success: boolean;
    inserted: number;
    failed: number;
    errors: { student_id: string; errors: { field: string; message: string }[] }[];
    error?: string;
    code?: string;
}

export interface UpdateWithVersionResult {
    success: boolean;
    new_version?: number;
    current_version?: number;
    error?: string;
    code?: 'NOT_FOUND' | 'CONFLICT' | 'UPDATE_FAILED';
}

export interface AuditLog {
    id: string;
    created_at: string;
    user_id: string;
    user_email: string;
    table_name: string;
    record_id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
}

/**
 * Validate a single grade input server-side
 */
export const validateGradeServer = async (
    studentId: string,
    subject: string,
    score: number,
    assessmentName: string
): Promise<ValidationResult> => {
    const { data, error } = await supabase.rpc('validate_grade_input', {
        p_student_id: studentId,
        p_subject: subject,
        p_score: score,
        p_assessment_name: assessmentName,
    });

    if (error) {
        console.error('Validation RPC error:', error);
        return {
            valid: false,
            errors: [{ field: 'general', message: error.message }],
            warnings: [],
        };
    }

    return data as ValidationResult;
};

/**
 * Bulk insert grades with server-side validation and transaction
 */
export const bulkInsertGrades = async (
    grades: GradeInput[],
    teacherId: string
): Promise<BulkInsertResult> => {
    const { data, error } = await supabase.rpc('bulk_insert_grades', {
        p_grades: grades,
        p_teacher_id: teacherId,
    });

    if (error) {
        console.error('Bulk insert RPC error:', error);

        // Check for rate limit error
        if (error.message.includes('rate limit') || error.code === '429') {
            return {
                success: false,
                inserted: 0,
                failed: grades.length,
                errors: [],
                error: 'Terlalu banyak request. Tunggu beberapa saat.',
                code: 'RATE_LIMIT',
            };
        }

        return {
            success: false,
            inserted: 0,
            failed: grades.length,
            errors: [],
            error: error.message,
        };
    }

    return data as BulkInsertResult;
};

/**
 * Update grade with version check (optimistic locking)
 */
export const updateGradeWithVersion = async (
    recordId: string,
    score: number,
    notes: string,
    expectedVersion: number
): Promise<UpdateWithVersionResult> => {
    const { data, error } = await supabase.rpc('update_grade_with_version', {
        p_record_id: recordId,
        p_score: score,
        p_notes: notes,
        p_expected_version: expectedVersion,
    });

    if (error) {
        console.error('Update with version RPC error:', error);
        return {
            success: false,
            error: error.message,
        };
    }

    return data as UpdateWithVersionResult;
};

/**
 * Check rate limit status
 */
export const checkRateLimit = async (
    actionType: string,
    maxRequests: number = 100,
    windowMinutes: number = 60
): Promise<boolean> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: user.user.id,
        p_action_type: actionType,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes,
    });

    if (error) {
        console.error('Rate limit check error:', error);
        return true; // Allow on error to not block user
    }

    return data as boolean;
};

/**
 * Get audit logs for a specific record
 */
export const getAuditLogs = async (
    tableName: string,
    recordId?: string,
    limit: number = 50
): Promise<AuditLog[]> => {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', tableName)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (recordId) {
        query = query.eq('record_id', recordId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Audit logs fetch error:', error);
        return [];
    }

    return data as AuditLog[];
};

/**
 * Get user's recent activity from audit logs
 */
export const getUserActivityLogs = async (
    limit: number = 20
): Promise<AuditLog[]> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('User activity logs fetch error:', error);
        return [];
    }

    return data as AuditLog[];
};

export default {
    validateGradeServer,
    bulkInsertGrades,
    updateGradeWithVersion,
    checkRateLimit,
    getAuditLogs,
    getUserActivityLogs,
};
