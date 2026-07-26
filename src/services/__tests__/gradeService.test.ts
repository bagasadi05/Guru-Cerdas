/**
 * Tests for Grade Service (Supabase RPC)
 *
 * Covers:
 * - validateGradeServer — server-side validation RPC
 * - bulkInsertGrades — bulk insert with offline fallback
 * - updateGradeWithVersion — optimistic locking
 * - checkRateLimit — rate limit checking RPC
 * - getAuditLogs / getUserActivityLogs — audit log queries
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../supabase', () => ({
    supabase: {
        rpc: (...args: any[]) => mockRpc(...args),
        from: (...args: any[]) => mockFrom(...args),
        auth: {
            getUser: (...args: any[]) => mockGetUser(...args),
        },
    },
    wasLastResponseQueued: vi.fn(),
}));

import {
    validateGradeServer,
    bulkInsertGrades,
    updateGradeWithVersion,
    checkRateLimit,
    getAuditLogs,
    getUserActivityLogs,
    type GradeInput,
} from '../gradeService';
import { wasLastResponseQueued } from '../supabase';

describe('gradeService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });
    });

    // ============================================
    // validateGradeServer
    // ============================================
    describe('validateGradeServer', () => {
        it('should return validation result from RPC', async () => {
            mockRpc.mockResolvedValue({
                data: { valid: true, errors: [], warnings: [] },
                error: null,
            });

            const result = await validateGradeServer('s1', 'Matematika', 85, 'UH-1');
            expect(result.valid).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('validate_grade_input', {
                p_student_id: 's1',
                p_subject: 'Matematika',
                p_score: 85,
                p_assessment_name: 'UH-1',
            });
        });

        it('should handle RPC errors gracefully', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: { message: 'RPC function not found' },
            });

            const result = await validateGradeServer('s1', 'Matematika', 85, 'UH-1');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toBe('RPC function not found');
        });
    });

    // ============================================
    // bulkInsertGrades
    // ============================================
    describe('bulkInsertGrades', () => {
        const grades: GradeInput[] = [
            { student_id: 's1', subject: 'Matematika', score: 85, assessment_name: 'UH-1' },
            { student_id: 's2', subject: 'Matematika', score: 90, assessment_name: 'UH-1' },
        ];

        it('should bulk insert via RPC', async () => {
            mockRpc.mockResolvedValue({
                data: { success: true, inserted: 2, failed: 0, errors: [] },
                error: null,
            });
            (wasLastResponseQueued as ReturnType<typeof vi.fn>).mockReturnValue(false);

            const result = await bulkInsertGrades(grades, 'teacher-1');
            expect(result.success).toBe(true);
            expect(result.inserted).toBe(2);
            expect(mockRpc).toHaveBeenCalledWith('bulk_insert_grades', {
                p_grades: grades,
                p_teacher_id: 'teacher-1',
            });
        });

        it('should return queued status when offline', async () => {
            mockRpc.mockResolvedValue({
                data: { success: true, inserted: 2, failed: 0, errors: [] },
                error: null,
            });
            (wasLastResponseQueued as ReturnType<typeof vi.fn>).mockReturnValue(true);

            const result = await bulkInsertGrades(grades, 'teacher-1');
            expect(result.success).toBe(true);
            expect(result.code).toBe('OFFLINE_QUEUED');
            expect(result.inserted).toBe(grades.length);
            // RPC is called first, then wasLastResponseQueued is checked
            expect(mockRpc).toHaveBeenCalled();
        });

        it('should detect rate limit errors', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: { message: 'rate limit exceeded', code: '429' },
            });
            (wasLastResponseQueued as ReturnType<typeof vi.fn>).mockReturnValue(false);

            const result = await bulkInsertGrades(grades, 'teacher-1');
            expect(result.success).toBe(false);
            expect(result.code).toBe('RATE_LIMIT');
            expect(result.error).toContain('Terlalu banyak request');
        });

        it('should handle generic RPC errors', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: { message: 'Database connection error' },
            });
            (wasLastResponseQueued as ReturnType<typeof vi.fn>).mockReturnValue(false);

            const result = await bulkInsertGrades(grades, 'teacher-1');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Database connection error');
        });
    });

    // ============================================
    // updateGradeWithVersion
    // ============================================
    describe('updateGradeWithVersion', () => {
        it('should update grade with version check', async () => {
            mockRpc.mockResolvedValue({
                data: { success: true, new_version: 2 },
                error: null,
            });

            const result = await updateGradeWithVersion('record-1', 90, 'Improved', 1);
            expect(result.success).toBe(true);
            expect(result.new_version).toBe(2);
            expect(mockRpc).toHaveBeenCalledWith('update_grade_with_version', {
                p_record_id: 'record-1',
                p_score: 90,
                p_notes: 'Improved',
                p_expected_version: 1,
            });
        });

        it('should handle conflict on version mismatch', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: { message: 'Version conflict: expected 1, current 2' },
            });

            const result = await updateGradeWithVersion('record-1', 90, 'Improved', 1);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Version conflict');
        });
    });

    // ============================================
    // checkRateLimit
    // ============================================
    describe('checkRateLimit', () => {
        it('should return false if no user is authenticated', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await checkRateLimit('grade_input');
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('should return rate limit status from RPC', async () => {
            mockRpc.mockResolvedValue({
                data: true,
                error: null,
            });

            const result = await checkRateLimit('grade_input', 50, 30);
            expect(result).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
                p_user_id: 'user-1',
                p_action_type: 'grade_input',
                p_max_requests: 50,
                p_window_minutes: 30,
            });
        });

        it('should return false on RPC error (fail-safe block)', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: { message: 'RPC error' },
            });

            const result = await checkRateLimit('grade_input');
            expect(result).toBe(false);
        });
    });

    // ============================================
    // getAuditLogs
    // ============================================
    describe('getAuditLogs', () => {
        /** Create a thenable mock chain matching Supabase builder pattern:
         *  .select().eq().order().limit() — and optionally .eq() after .limit()
         *  Each method returns the same chain object, and `await chain` resolves.
         */
        function createMockChain(data: any, error: any = null) {
            const chain: any = {
                eq: vi.fn(() => chain),
                order: vi.fn(() => chain),
                limit: vi.fn(() => chain),
                then: (resolve: (value: unknown) => void) => resolve({ data, error }),
            };
            return chain;
        }

        it('should fetch audit logs for a table (no recordId)', async () => {
            const mockData = [
                { id: 'log-1', action: 'INSERT', table_name: 'grades', created_at: '2024-01-01' },
            ];
            const chain = createMockChain(mockData);
            mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

            const result = await getAuditLogs('grades');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('log-1');
        });

        it('should fetch audit logs filtered by recordId', async () => {
            const mockData = [
                { id: 'log-1', action: 'INSERT', table_name: 'grades', record_id: 'rec-1', created_at: '2024-01-01' },
            ];
            const chain = createMockChain(mockData);
            mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

            const result = await getAuditLogs('grades', 'rec-1', 10);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('log-1');
        });

        it('should return empty array on error', async () => {
            const chain = createMockChain(null, { message: 'Table not found' });
            mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

            const result = await getAuditLogs('grades');
            expect(result).toEqual([]);
        });
    });

    // ============================================
    // getUserActivityLogs
    // ============================================
    describe('getUserActivityLogs', () => {
        it('should return empty array if no user', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await getUserActivityLogs();
            expect(result).toEqual([]);
        });

        it('should fetch user activity logs', async () => {
            const mockData = [
                { id: 'log-1', user_id: 'user-1', action: 'UPDATE', created_at: '2024-01-01' },
            ];
            const chain: any = {
                eq: vi.fn(() => chain),
                order: vi.fn(() => chain),
                limit: vi.fn(() => chain),
                then: (resolve: (value: unknown) => void) => resolve({ data: mockData, error: null }),
            };
            mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

            const result = await getUserActivityLogs(5);
            expect(result).toHaveLength(1);
            expect(result[0].user_id).toBe('user-1');
        });
    });
});
