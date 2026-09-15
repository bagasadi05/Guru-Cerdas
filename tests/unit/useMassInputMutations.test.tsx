import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMassInputMutations, UseMassInputMutationsParams } from '../../src/components/pages/mass-input/hooks/useMassInputMutations';

const upsertCalls: Array<{ table: string; payload: unknown; options?: unknown }> = [];
const insertCalls: Array<{ table: string; payload: unknown }> = [];

vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }),
}));

vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'teacher-1', name: 'Guru Test' },
    }),
}));

vi.mock('../../src/contexts/SemesterContext', () => ({
    useSemester: () => ({
        activeSemester: { id: 'semester-1', name: 'Semester 1' },
        activeAcademicYear: { id: 'ay-1', name: '2025/2026' },
    }),
}));

vi.mock('../../src/services/UndoManager', () => ({
    recordAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/confetti', () => ({
    triggerStarsConfetti: vi.fn(),
}));

vi.mock('../../src/services/supabase', () => {
    const makeFilterChain = (data: unknown = []) => {
        const chain: any = {
            eq: vi.fn(() => chain),
            gte: vi.fn(() => chain),
            is: vi.fn(() => chain),
            in: vi.fn(() => chain),
            order: vi.fn(() => chain),
            then: (resolve: (v: any) => void) => resolve({ data, error: null }),
        };
        return chain;
    };

    return {
        supabase: {
            from: vi.fn((table: string) => ({
                select: vi.fn(() => makeFilterChain([])),
                upsert: vi.fn((payload: unknown, options?: unknown) => {
                    upsertCalls.push({ table, payload, options });
                    return {
                        select: vi.fn().mockResolvedValue({
                            data: Array.isArray(payload) ? payload.map((p: any) => ({ id: p.id || 'id-generated' })) : [{ id: 'id-1' }],
                            error: null,
                        }),
                    };
                }),
                insert: vi.fn((payload: unknown) => {
                    insertCalls.push({ table, payload });
                    return {
                        select: vi.fn().mockResolvedValue({
                            data: Array.isArray(payload) ? payload.map((p: any, i: number) => ({ id: p.id || `id-${i}` })) : [{ id: 'id-1' }],
                            error: null,
                        }),
                    };
                }),
            })),
        },
    };
});

describe('useMassInputMutations - Grade & Attitude Upsert', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        upsertCalls.length = 0;
        insertCalls.length = 0;
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
    });

    const createWrapper = () => {
        return ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    };

    it('upserts academic_records on primary key id without passing invalid composite onConflict', async () => {
        const defaultParams: UseMassInputMutationsParams = {
            mode: 'subject_grade',
            selectedClass: 'class-1',
            quizInfo: { name: '', subject: '', date: '', points: 0, max_points: 0 },
            subjectGradeInfo: {
                subject: 'Matematika',
                assessment_name: 'UH 1',
                notes: 'Bagus',
                semester: 'semester-1',
            },
            scores: {
                'student-1': '90',
                'student-2': '85',
            },
            validationErrors: {},
            existingGrades: [
                {
                    id: 'existing-grade-1',
                    student_id: 'student-1',
                    user_id: 'teacher-1',
                    subject: 'Matematika',
                    assessment_name: 'UH 1',
                    score: 80,
                    notes: '',
                    semester_id: 'semester-1',
                    created_at: '2026-01-01',
                    version: 1,
                    deleted_at: null,
                },
            ],
            selectedStudentIds: new Set(['student-1', 'student-2']),
            selectedViolationCode: '',
            violationDate: '2026-09-14',
            violationNotes: '',
            studentsData: [],
            noteMethod: 'template',
            templateNote: '',
            pasteData: '',
            gradedCount: 2,
            filteredExistingGrades: [],
            classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
            setScores: vi.fn(),
            setSelectedStudentIds: vi.fn(),
            bypassDuplicateGuard: false,
            isScoresDirtyRef: { current: true },
            clearSubjectGradeDraft: vi.fn(),
        };

        const { result } = renderHook(() => useMassInputMutations(defaultParams), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            result.current.submitData();
        });

        const academicUpsert = upsertCalls.find(c => c.table === 'academic_records');
        expect(academicUpsert).toBeDefined();
        // Crucial: no onConflict option should be passed, allowing resolution on primary key 'id'
        expect(academicUpsert?.options).toBeUndefined();

        const payload = academicUpsert?.payload as Array<any>;
        expect(payload).toHaveLength(2);

        // Student 1 had existing grade -> should reuse existing-grade-1 id
        const student1Record = payload.find(r => r.student_id === 'student-1');
        expect(student1Record).toBeDefined();
        expect(student1Record.id).toBe('existing-grade-1');
        expect(student1Record.score).toBe(90);

        // Student 2 had no existing grade -> should receive a new generated UUID id
        const student2Record = payload.find(r => r.student_id === 'student-2');
        expect(student2Record).toBeDefined();
        expect(student2Record.id).toBeTruthy();
        expect(student2Record.id).not.toBe('existing-grade-1');
        expect(student2Record.score).toBe(85);
    });

    it('inserts attitude_records cleanly without invalid onConflict option', async () => {
        const defaultParams: UseMassInputMutationsParams = {
            mode: 'attitude',
            selectedClass: 'class-1',
            quizInfo: { name: '', subject: '', date: '', points: 0, max_points: 0 },
            subjectGradeInfo: {
                subject: '',
                assessment_name: '',
                notes: '',
                semester: 'semester-1',
            },
            attitudeDate: '2026-09-14',
            attitudeCategory: 'Adab & Akhlak',
            attitudeName: 'Sholat Dhuha',
            attitudePoints: 2,
            attitudeNotes: 'Tertib',
            scores: {},
            validationErrors: {},
            existingGrades: [],
            selectedStudentIds: new Set(['student-1']),
            selectedViolationCode: '',
            violationDate: '2026-09-14',
            violationNotes: '',
            studentsData: [],
            noteMethod: 'template',
            templateNote: '',
            pasteData: '',
            gradedCount: 0,
            filteredExistingGrades: [],
            classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
            setScores: vi.fn(),
            setSelectedStudentIds: vi.fn(),
            bypassDuplicateGuard: false,
            isScoresDirtyRef: { current: true },
            clearSubjectGradeDraft: vi.fn(),
        };

        const { result } = renderHook(() => useMassInputMutations(defaultParams), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            result.current.submitData();
        });

        const attitudeInsert = insertCalls.find(c => c.table === 'attitude_records');
        expect(attitudeInsert).toBeDefined();
        const payload = attitudeInsert?.payload as Array<any>;
        expect(payload).toHaveLength(1);
        expect(payload[0].student_id).toBe('student-1');
        expect(payload[0].assessment_name).toBe('Sholat Dhuha');
    });

    it('inserts quiz_points with category and locked 1 point per student', async () => {
        const defaultParams: UseMassInputMutationsParams = {
            mode: 'quiz',
            selectedClass: 'class-1',
            quizInfo: {
                name: 'Menjawab pertanyaan guru',
                category: 'menjawab',
                subject: 'Matematika',
                date: '2026-09-15',
                points: 1,
                max_points: 1,
            },
            subjectGradeInfo: {
                subject: '',
                assessment_name: '',
                notes: '',
                semester: 'semester-1',
            },
            scores: {},
            validationErrors: {},
            existingGrades: [],
            selectedStudentIds: new Set(['student-1', 'student-2']),
            selectedViolationCode: '',
            violationDate: '2026-09-15',
            violationNotes: '',
            studentsData: [],
            noteMethod: 'template',
            templateNote: '',
            pasteData: '',
            gradedCount: 0,
            filteredExistingGrades: [],
            classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
            setScores: vi.fn(),
            setSelectedStudentIds: vi.fn(),
            bypassDuplicateGuard: true,
            isScoresDirtyRef: { current: false },
            clearSubjectGradeDraft: vi.fn(),
        };

        const { result } = renderHook(() => useMassInputMutations(defaultParams), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.submitData();
        });

        const quizInsert = insertCalls.find(c => c.table === 'quiz_points');
        expect(quizInsert).toBeDefined();
        const payload = quizInsert?.payload as Array<any>;
        expect(payload).toHaveLength(2);

        // Verify payload integrity: category is preserved and points are locked to 1
        expect(payload[0]).toMatchObject({
            student_id: 'student-1',
            quiz_name: 'Menjawab pertanyaan guru',
            category: 'menjawab',
            subject: 'Matematika',
            quiz_date: '2026-09-15',
            points: 1,
            max_points: 1,
            semester_id: 'semester-1',
            user_id: 'teacher-1',
        });
        expect(payload[1]).toMatchObject({
            student_id: 'student-2',
            quiz_name: 'Menjawab pertanyaan guru',
            category: 'menjawab',
            subject: 'Matematika',
            quiz_date: '2026-09-15',
            points: 1,
            max_points: 1,
            semester_id: 'semester-1',
            user_id: 'teacher-1',
        });
    });

    it('falls back to category lainnya and enforces strict 1 point rule', async () => {
        const defaultParams: UseMassInputMutationsParams = {
            mode: 'quiz',
            selectedClass: 'class-1',
            quizInfo: {
                name: 'Tugas Tambahan Khusus',
                // No category provided
                subject: 'IPA',
                date: '2026-09-15',
                points: 99, // Attempts to set high points, must be locked to 1!
                max_points: 99,
            },
            subjectGradeInfo: {
                subject: '',
                assessment_name: '',
                notes: '',
                semester: 'semester-1',
            },
            scores: {},
            validationErrors: {},
            existingGrades: [],
            selectedStudentIds: new Set(['student-3']),
            selectedViolationCode: '',
            violationDate: '2026-09-15',
            violationNotes: '',
            studentsData: [],
            noteMethod: 'template',
            templateNote: '',
            pasteData: '',
            gradedCount: 0,
            filteredExistingGrades: [],
            classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
            setScores: vi.fn(),
            setSelectedStudentIds: vi.fn(),
            bypassDuplicateGuard: true,
            isScoresDirtyRef: { current: false },
            clearSubjectGradeDraft: vi.fn(),
        };

        const { result } = renderHook(() => useMassInputMutations(defaultParams), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.submitData();
        });

        const quizInsert = insertCalls.find(c => c.table === 'quiz_points');
        expect(quizInsert).toBeDefined();
        const payload = quizInsert?.payload as Array<any>;
        expect(payload).toHaveLength(1);
        expect(payload[0].category).toBe('lainnya');
        expect(payload[0].points).toBe(1);
        expect(payload[0].max_points).toBe(1);
    });
});
