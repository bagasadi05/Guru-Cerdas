import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMassInputState } from '../../src/components/pages/mass-input/hooks/useMassInputState';
import { useMassInputMutations, UseMassInputMutationsParams } from '../../src/components/pages/mass-input/hooks/useMassInputMutations';
import { Step2_Footer } from '../../src/components/pages/mass-input/components/Step2_Footer';
import { validateSingleGrade } from '../../src/utils/gradeValidator';

const upsertCalls: Array<{ table: string; payload: unknown }> = [];

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useLocation: () => ({ pathname: '/mass-input', state: {} }),
    useNavigate: () => vi.fn(),
}));

vi.mock('../../src/contexts/SemesterContext', () => ({
    useSemester: () => ({
        activeSemester: { id: 'sem-1', name: 'Semester 1' },
        activeAcademicYear: { id: 'ay-1', name: '2025/2026' },
    }),
}));

vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'teacher-1', name: 'Guru Test', school_name: 'SD Cerdas' },
    }),
}));

vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
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
                upsert: vi.fn((payload: unknown) => {
                    upsertCalls.push({ table, payload });
                    return {
                        select: vi.fn().mockResolvedValue({
                            data: Array.isArray(payload) ? payload.map((p: any) => ({ id: p.id || 'id-generated' })) : [{ id: 'id-1' }],
                            error: null,
                        }),
                    };
                }),
                insert: vi.fn((payload: unknown) => ({
                    select: vi.fn().mockResolvedValue({
                        data: Array.isArray(payload) ? payload.map((p: any, i: number) => ({ id: p.id || `id-${i}` })) : [{ id: 'id-1' }],
                        error: null,
                    }),
                })),
            })),
        },
    };
});

describe('Diagnosis: Input Penilaian (Mass Input) Bugs', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        sessionStorage.clear();
        upsertCalls.length = 0;
        vi.clearAllMocks();
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

    describe('Bug 1: Cross-Assessment Context Reset', () => {
        it('should reset scores, errors, and dirty state when assessment_name changes', () => {
            const { result } = renderHook(() => useMassInputState());

            act(() => {
                result.current.setMode('subject_grade');
                result.current.setSelectedClass('class-1');
                result.current.setSubjectGradeInfo({
                    subject: 'Matematika',
                    assessment_name: 'PH 1',
                    notes: '',
                    semester: 'sem-1',
                });
            });

            // Teacher enters scores for PH 1
            act(() => {
                result.current.handleScoreChange('student-1', '85');
            });

            expect(result.current.scores['student-1']).toBe('85');
            expect(result.current.isScoresDirtyRef.current).toBe(true);

            // Teacher switches assessment to PH 2
            act(() => {
                result.current.setSubjectGradeInfo({
                    subject: 'Matematika',
                    assessment_name: 'PH 2',
                    notes: '',
                    semester: 'sem-1',
                });
            });

            // In buggy code: scores still has student-1: '85', isScoresDirtyRef.current is still true!
            // In expected fixed code: scores and dirty flag are reset for the new assessment!
            expect(result.current.scores).toEqual({});
            expect(result.current.isScoresDirtyRef.current).toBe(false);
        });

        it('should reset scores, errors, and dirty state when subject changes', () => {
            const { result } = renderHook(() => useMassInputState());

            act(() => {
                result.current.setMode('subject_grade');
                result.current.setSelectedClass('class-1');
                result.current.setSubjectGradeInfo({
                    subject: 'Matematika',
                    assessment_name: 'PH 1',
                    notes: '',
                    semester: 'sem-1',
                });
            });

            act(() => {
                result.current.handleScoreChange('student-1', '90');
            });

            expect(result.current.scores['student-1']).toBe('90');

            // Teacher switches subject to IPA
            act(() => {
                result.current.setSubjectGradeInfo(prev => ({
                    ...prev,
                    subject: 'IPA',
                }));
            });

            expect(result.current.scores).toEqual({});
            expect(result.current.isScoresDirtyRef.current).toBe(false);
        });
    });

    describe('Bug 2: Indonesian Decimal Comma Support', () => {
        it('should accept decimal grades with comma (e.g. 85,5) without validation error', () => {
            const { result } = renderHook(() => useMassInputState());

            act(() => {
                result.current.handleScoreChange('student-1', '85,5');
            });

            // In buggy code: Number("85,5") is NaN -> validationErrors['student-1'] = 'Nilai harus antara 0-100'
            // In fixed code: comma is treated as decimal separator -> no validation error
            expect(result.current.validationErrors['student-1']).toBeUndefined();
            expect(result.current.scores['student-1']).toBe('85,5');
        });

        it('validateSingleGrade should accept comma decimals', () => {
            const res = validateSingleGrade('77,5');
            expect(res.isValid).toBe(true);
            expect(res.error).toBeNull();
        });

        it('useMassInputMutations should save comma decimal grades as proper float numbers, never NaN', async () => {
            const defaultParams: UseMassInputMutationsParams = {
                mode: 'subject_grade',
                selectedClass: 'class-1',
                quizInfo: { name: '', subject: '', date: '', points: 0, max_points: 0 },
                subjectGradeInfo: {
                    subject: 'Matematika',
                    assessment_name: 'UH 1',
                    notes: '',
                    semester: 'sem-1',
                },
                scores: {
                    'student-1': '85,5',
                },
                validationErrors: {},
                existingGrades: [],
                selectedStudentIds: new Set(['student-1']),
                selectedViolationCode: '',
                violationDate: '2026-09-14',
                violationNotes: '',
                studentsData: [{ id: 'student-1', name: 'Budi', class_id: 'class-1' }] as any,
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

            const { result } = renderHook(() => useMassInputMutations(defaultParams), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.submitData();
            });

            expect(upsertCalls.length).toBeGreaterThan(0);
            const academicUpsert = upsertCalls.find(c => c.table === 'academic_records');
            expect(academicUpsert).toBeDefined();
            const savedRecords = academicUpsert!.payload as Array<{ score: number }>;
            // In buggy code: Number("85,5") is NaN, score becomes NaN in DB payload!
            // In fixed code: score is 85.5
            expect(savedRecords[0].score).toBe(85.5);
            expect(Number.isNaN(savedRecords[0].score)).toBe(false);
        });
    });

    describe('Bug 3: Bersihkan Button in Attitude Mode', () => {
        it('should render Bersihkan button when students are selected in attitude mode', () => {
            const onClear = vi.fn();
            render(
                <Step2_Footer
                    mode="attitude"
                    summaryText="2 Siswa Dipilih"
                    selectedStudentIds={new Set(['student-1', 'student-2'])}
                    gradedCount={0}
                    onClearRequest={onClear}
                    isExporting={false}
                    exportProgress=""
                />
            );

            // In buggy code: mode !== 'attitude' prevented button from being rendered
            const clearButton = screen.queryByRole('button', { name: /bersihkan/i });
            expect(clearButton).not.toBeNull();
        });
    });

    describe('Bug 4: Batch Score Fill', () => {
        it('should atomically update scores and validation errors for multiple students without dropping errors', () => {
            const { result } = renderHook(() => useMassInputState());

            expect(typeof (result.current as any).handleBatchScoreChange).toBe('function');

            act(() => {
                (result.current as any).handleBatchScoreChange({
                    'student-1': '85',
                    'student-2': '150', // Invalid: > 100
                    'student-3': '92',
                });
            });

            expect(result.current.scores['student-1']).toBe('85');
            expect(result.current.scores['student-2']).toBe('150');
            expect(result.current.scores['student-3']).toBe('92');
            expect(result.current.validationErrors['student-2']).toBe('Nilai harus antara 0-100');
            expect(result.current.validationErrors['student-1']).toBeUndefined();
            expect(result.current.isScoresDirtyRef.current).toBe(true);
        });
    });
});
