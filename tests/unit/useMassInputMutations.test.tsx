import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordAction } from '../../src/services/UndoManager';
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
                update: vi.fn(() => {
                    const updateChain: any = {
                        in: vi.fn(() => updateChain),
                        eq: vi.fn(() => updateChain),
                        is: vi.fn(() => updateChain),
                        select: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                    return updateChain;
                }),
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

        // Verify UndoManager recorded 'update' for existing grade and 'create' for new grade
        expect(recordAction).toHaveBeenCalledWith(
            'teacher-1',
            'update',
            'academic_records',
            ['existing-grade-1'],
            [{ score: 80, notes: '' }]
        );
        expect(recordAction).toHaveBeenCalledWith(
            'teacher-1',
            'create',
            'academic_records',
            [student2Record.id]
        );

        // Verify daily_input_log recorded correct student_count (2)
        const logCall = insertCalls.find(c => c.table === 'daily_input_log');
        expect(logCall).toBeDefined();
        expect((logCall?.payload as any).student_count).toBe(2);
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

    it('saves attitude points to quiz_points with strict 1 point lock, category, and syncs to attitude_records', async () => {
        const defaultParams: UseMassInputMutationsParams = {
            mode: 'attitude',
            selectedClass: 'class-1',
            quizInfo: {
                name: '',
                subject: '',
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
            attitudeDate: '2026-09-15',
            attitudeCategory: 'Adab & Akhlak',
            attitudeName: 'Adab & Kesantunan',
            attitudePoints: 99, // Attempts to set custom points; must strictly lock to 1!
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

        // 1. Verify quiz_points insert
        const quizInsert = insertCalls.find(c => c.table === 'quiz_points');
        expect(quizInsert).toBeDefined();
        const qpPayload = quizInsert?.payload as Array<any>;
        expect(qpPayload).toHaveLength(2);
        expect(qpPayload[0]).toMatchObject({
            student_id: 'student-1',
            quiz_name: 'Adab & Kesantunan',
            category: 'Adab & Akhlak',
            subject: null,
            quiz_date: '2026-09-15',
            points: 1,
            max_points: 1,
            semester_id: 'semester-1',
            user_id: 'teacher-1',
        });
        expect(qpPayload[1]).toMatchObject({
            student_id: 'student-2',
            quiz_name: 'Adab & Kesantunan',
            category: 'Adab & Akhlak',
            subject: null,
            quiz_date: '2026-09-15',
            points: 1,
            max_points: 1,
            semester_id: 'semester-1',
            user_id: 'teacher-1',
        });

        // 2. Verify attitude_records sync
        const attInsert = insertCalls.find(c => c.table === 'attitude_records');
        expect(attInsert).toBeDefined();
        const attPayload = attInsert?.payload as Array<any>;
        expect(attPayload).toHaveLength(2);
        expect(attPayload[0]).toMatchObject({
            student_id: 'student-1',
            subject: 'Sikap & Pembiasaan',
            assessment_name: 'Adab & Kesantunan',
            date: '2026-09-15',
            spiritual_predicate: 'SB',
            social_predicate: 'B',
            semester_id: 'semester-1',
            user_id: 'teacher-1',
        });
    });

    it('skips duplicate students in attitude mode when duplicate guard detects existing records', async () => {
        const { supabase } = await import('../../src/services/supabase');
        vi.mocked(supabase.from).mockImplementationOnce((table: string) => {
            if (table === 'quiz_points') {
                return {
                    select: vi.fn(() => ({
                        in: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        is: vi.fn().mockReturnThis(),
                        then: (resolve: (v: any) => void) => resolve({
                            data: [{ id: 'existing-qp-1', student_id: 'student-1' }],
                            error: null,
                        }),
                    })),
                    insert: vi.fn((payload: unknown) => {
                        insertCalls.push({ table, payload });
                        return {
                            select: vi.fn().mockResolvedValue({
                                data: Array.isArray(payload) ? payload.map((p: any, i: number) => ({ id: p.id || `id-${i}` })) : [{ id: 'id-1' }],
                                error: null,
                            }),
                        };
                    }),
                } as any;
            }
            return {
                insert: vi.fn((payload: unknown) => {
                    insertCalls.push({ table, payload });
                    return {
                        select: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }),
            } as any;
        });

        const defaultParams: UseMassInputMutationsParams = {
            mode: 'attitude',
            selectedClass: 'class-1',
            quizInfo: { name: '', subject: '', date: '2026-09-15', points: 1, max_points: 1 },
            subjectGradeInfo: { subject: '', assessment_name: '', notes: '', semester: 'semester-1' },
            attitudeDate: '2026-09-15',
            attitudeCategory: 'Kedisiplinan & Sikap',
            attitudeName: 'Tertib & Disiplin',
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
            bypassDuplicateGuard: false,
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
        const qpPayload = quizInsert?.payload as Array<any>;
        // student-1 was duplicate, so only student-2 is inserted!
        expect(qpPayload).toHaveLength(1);
        expect(qpPayload[0].student_id).toBe('student-2');
    });
});

/**
 * PRD §5.6: "Tetap Simpan Semua" must actually save everyone.
 *
 * The quiz branch used to read `bypassDuplicateGuard` straight from state, which
 * is still false during the same tick the dialog sets it, so the override passed
 * by the button was ignored and the confirmed students were skipped anyway.
 */
describe('useMassInputMutations - duplicate guard override', () => {
    const makeFilterChain = (data: unknown[]) => {
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

    let queryClient: QueryClient;

    beforeEach(() => {
        upsertCalls.length = 0;
        insertCalls.length = 0;
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('saves every selected student when the bypass override is passed, even if the guard finds duplicates', async () => {
        const { supabase } = await import('../../src/services/supabase');
        const fromMock = vi.mocked(supabase.from);
        const originalImplementation = fromMock.getMockImplementation();
        fromMock.mockImplementation((table: string) => ({
            select: vi.fn(() => makeFilterChain([{ id: 'existing-qp-1', student_id: 'student-1' }])),
            insert: vi.fn((payload: unknown) => {
                insertCalls.push({ table, payload });
                return {
                    select: vi.fn().mockResolvedValue({
                        data: Array.isArray(payload) ? payload.map((_p: any, i: number) => ({ id: `id-${i}` })) : [{ id: 'id-1' }],
                        error: null,
                    }),
                };
            }),
        } as any));

        try {
            const params: UseMassInputMutationsParams = {
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
                subjectGradeInfo: { subject: '', assessment_name: '', notes: '', semester: 'semester-1' },
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
                bypassDuplicateGuard: false, // dialog state not committed yet
                isScoresDirtyRef: { current: false },
                clearSubjectGradeDraft: vi.fn(),
            };

            const { result } = renderHook(() => useMassInputMutations(params), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.submitData(true);
            });

            const quizInsert = insertCalls.find(c => c.table === 'quiz_points');
            expect(quizInsert).toBeDefined();
            expect((quizInsert?.payload as Array<any>)).toHaveLength(2);
        } finally {
            if (originalImplementation) fromMock.mockImplementation(originalImplementation);
        }
    });
});

/**
 * PRD §5.1/§6.2: re-entering a grade that was deleted earlier.
 *
 * `uq_academic_records_student_subject_assessment_semester` is table-wide, so a
 * soft-deleted row still holds the key. Saving must reuse that row (and clear
 * `deleted_at`) instead of inserting a second one, and it must not wipe notes
 * that the config field left empty.
 */
describe('useMassInputMutations - reviving a soft-deleted grade', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        upsertCalls.length = 0;
        insertCalls.length = 0;
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('reuses the trashed row id, clears deleted_at, and keeps existing notes', async () => {
        const { supabase } = await import('../../src/services/supabase');
        const fromMock = vi.mocked(supabase.from);
        const originalImplementation = fromMock.getMockImplementation();

        const trashedRow = {
            id: 'trashed-grade-1',
            student_id: 'student-1',
            deleted_at: '2026-01-01T00:00:00.000Z',
            notes: 'Catatan lama guru',
        };
        const chain: any = {
            eq: vi.fn(() => chain),
            is: vi.fn(() => chain),
            in: vi.fn(() => chain),
            then: (resolve: (v: any) => void) => resolve({ data: [trashedRow], error: null }),
        };

        fromMock.mockImplementation((table: string) => ({
            select: vi.fn(() => chain),
            upsert: vi.fn((payload: unknown) => {
                upsertCalls.push({ table, payload });
                return {
                    select: vi.fn().mockResolvedValue({
                        data: Array.isArray(payload) ? payload.map((p: any) => ({ id: p.id })) : [{ id: 'id-1' }],
                        error: null,
                    }),
                };
            }),
        } as any));

        try {
            const params: UseMassInputMutationsParams = {
                mode: 'subject_grade',
                selectedClass: 'class-1',
                quizInfo: { name: '', subject: '', date: '', points: 0, max_points: 0 },
                subjectGradeInfo: {
                    subject: 'Matematika',
                    assessment_name: 'UH 1',
                    notes: '', // left empty on purpose
                    semester: 'semester-1',
                },
                scores: { 'student-1': '90' },
                validationErrors: {},
                existingGrades: [], // the trashed record is invisible to the UI query
                selectedStudentIds: new Set(['student-1']),
                selectedViolationCode: '',
                violationDate: '2026-09-14',
                violationNotes: '',
                studentsData: [],
                noteMethod: 'template',
                templateNote: '',
                pasteData: '',
                gradedCount: 1,
                filteredExistingGrades: [],
                classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
                setScores: vi.fn(),
                setSelectedStudentIds: vi.fn(),
                bypassDuplicateGuard: false,
                isScoresDirtyRef: { current: true },
                clearSubjectGradeDraft: vi.fn(),
            };

            const { result } = renderHook(() => useMassInputMutations(params), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.submitData();
            });

            const upsert = upsertCalls.find(c => c.table === 'academic_records');
            expect(upsert).toBeDefined();
            const payload = upsert?.payload as Array<any>;
            expect(payload).toHaveLength(1);
            expect(payload[0].id).toBe('trashed-grade-1');
            expect(payload[0].deleted_at).toBeNull();
            expect(payload[0].notes).toBe('Catatan lama guru');
            expect(payload[0].score).toBe(90);
        } finally {
            if (originalImplementation) fromMock.mockImplementation(originalImplementation);
        }
    });

    it('handles deleteGrades gracefully when students only have local unsaved scores', async () => {
        const setScoresMock = vi.fn();
        const setSelectedStudentIdsMock = vi.fn();
        const isScoresDirtyRef = { current: true };
        const params: UseMassInputMutationsParams = {
            mode: 'subject_grade',
            selectedClass: 'class-1',
            quizInfo: { name: '', subject: '', date: '', points: 0, max_points: 0 },
            subjectGradeInfo: {
                subject: 'Matematika',
                assessment_name: 'UH 1',
                notes: '',
                semester: 'semester-1',
            },
            scores: { 'student-local': '85' },
            validationErrors: {},
            existingGrades: [],
            selectedStudentIds: new Set(['student-local']),
            selectedViolationCode: '',
            violationDate: '2026-09-14',
            violationNotes: '',
            studentsData: [],
            noteMethod: 'template',
            templateNote: '',
            pasteData: '',
            gradedCount: 1,
            filteredExistingGrades: [],
            classes: [{ id: 'class-1', name: 'Kelas 5A' } as any],
            setScores: setScoresMock,
            setSelectedStudentIds: setSelectedStudentIdsMock,
            bypassDuplicateGuard: false,
            isScoresDirtyRef,
            clearSubjectGradeDraft: vi.fn(),
        };

        const { result } = renderHook(() => useMassInputMutations(params), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.deleteGradesAsync({ studentIds: ['student-local'], recordIds: [] });
        });

        expect(setScoresMock).toHaveBeenCalled();
        expect(setSelectedStudentIdsMock).toHaveBeenCalledWith(new Set());
    });
});

