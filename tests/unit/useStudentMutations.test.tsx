import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentMutations } from '../../src/components/pages/student/hooks/useStudentMutations';

const updateCalls: Array<{ table: string; data: Record<string, unknown> }> = [];
const insertCalls: Array<{ table: string; data: Record<string, unknown> }> = [];
const selectCalls: Array<{ table: string; columns: string }> = [];

vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('../../src/services/supabase', () => {
    const makeFilterChain = (table: string, data: unknown = null) => {
        const chain: Record<string, unknown> = {
            eq: vi.fn(() => chain),
            is: vi.fn(() => chain),
            in: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            single: vi.fn(() => Promise.resolve({ data, error: null })),
            then: (resolve: (value: unknown) => void) => resolve({ data, error: null }),
        };
        return chain;
    };

    return {
        supabase: {
            auth: {
                getUser: vi.fn(() => Promise.resolve({
                    data: { user: { id: 'teacher-1', email: 'teacher@example.com' } },
                    error: null,
                })),
            },
            from: vi.fn((table: string) => ({
                select: vi.fn((columns: string) => {
                    selectCalls.push({ table, columns });
                    if (table === 'academic_records') {
                        if (columns === 'id, score') {
                            return makeFilterChain(table, [{ id: 'grade-1', score: 70 }]);
                        }
                        if (columns === 'id, student_id, user_id, subject, assessment_name, notes, score, semester_id, created_at, version') {
                            return makeFilterChain(table, [{
                                id: 'grade-existing',
                                student_id: 'student-1',
                                user_id: 'teacher-1',
                                subject: 'IPA',
                                assessment_name: 'PH 1',
                                notes: '',
                                score: 70,
                                semester_id: 'semester-1',
                                created_at: '2026-04-01T00:00:00.000Z',
                                version: 1,
                            }]);
                        }
                        return makeFilterChain(table, { id: 'grade-1', score: 70, subject: 'IPA', user_id: 'teacher-1' });
                    }
                    if (table === 'quiz_points') {
                        return makeFilterChain(table, [
                            { id: 'point-1', points: 1 },
                            { id: 'point-2', points: 2 },
                        ]);
                    }
                    return makeFilterChain(table, { id: 'record-1', user_id: 'teacher-1' });
                }),
                update: vi.fn((data: Record<string, unknown>) => {
                    updateCalls.push({ table, data });
                    return makeFilterChain(table, null);
                }),
                insert: vi.fn((data: Record<string, unknown>) => {
                    insertCalls.push({ table, data });
                    return Promise.resolve({ data: null, error: null });
                }),
                delete: vi.fn(() => makeFilterChain(table, null)),
            })),
            storage: {
                from: vi.fn(() => ({
                    upload: vi.fn(() => Promise.resolve({ error: null })),
                    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.test/file.jpg' } })),
                    remove: vi.fn(() => Promise.resolve({ error: null })),
                })),
            },
        },
    };
});

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useStudentMutations', () => {
    beforeEach(() => {
        updateCalls.length = 0;
        insertCalls.length = 0;
        selectCalls.length = 0;
        vi.clearAllMocks();
    });

    it('writes audit log when editing an academic record', async () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useStudentMutations('student-1', onClose), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.academicMutation.mutateAsync({
                operation: 'edit',
                id: 'grade-1',
                data: {
                    subject: 'IPA',
                    assessment_name: 'PH 1',
                    score: 88,
                    notes: '',
                    student_id: 'student-1',
                    user_id: 'teacher-1',
                    semester_id: 'semester-old',
                },
            });
        });

        expect(updateCalls).toContainEqual(expect.objectContaining({
            table: 'academic_records',
            data: expect.objectContaining({ semester_id: 'semester-old', score: 88 }),
        }));
        expect(insertCalls).toContainEqual(expect.objectContaining({
            table: 'audit_logs',
            data: expect.objectContaining({
                table_name: 'academic_records',
                record_id: 'grade-1',
                action: 'UPDATE',
                user_id: 'teacher-1',
            }),
        }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('updates the latest matching academic record instead of inserting a duplicate row', async () => {
        const { result } = renderHook(() => useStudentMutations('student-1', vi.fn()), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.academicMutation.mutateAsync({
                operation: 'add',
                data: {
                    subject: 'IPA',
                    assessment_name: 'PH 1',
                    score: 90,
                    notes: 'Perbaikan nilai',
                    student_id: 'student-1',
                    user_id: 'teacher-1',
                    semester_id: 'semester-1',
                },
            });
        });

        expect(updateCalls).toContainEqual(expect.objectContaining({
            table: 'academic_records',
            data: expect.objectContaining({
                assessment_name: 'PH 1',
                score: 90,
                semester_id: 'semester-1',
            }),
        }));
        expect(insertCalls).not.toContainEqual(expect.objectContaining({
            table: 'academic_records',
        }));
    });

    it('applies only available points and logs the grade and point updates', async () => {
        const { result } = renderHook(() => useStudentMutations('student-1', vi.fn()), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.applyPointsMutation.mutateAsync({
                subject: 'IPA',
                semesterId: 'semester-1',
            });
        });

        expect(updateCalls).toContainEqual(expect.objectContaining({
            table: 'academic_records',
            data: { score: 73 },
        }));
        expect(updateCalls).toContainEqual(expect.objectContaining({
            table: 'quiz_points',
            data: expect.objectContaining({ is_used: true, used_for_subject: 'IPA' }),
        }));
        expect(insertCalls.filter(call => call.table === 'audit_logs')).toHaveLength(2);
    });
});
