/**
 * Unit tests for useBintangEvaluation shared hook
 *
 * Covers:
 * - Initial state and default values
 * - handleOpenEditModal (new student, existing eval, with quiz points)
 * - handleSaveEvaluation (success, error)
 * - handleGenerateAll (success, error, with quiz points)
 * - handlePublish (confirm + success, error)
 * - handleDownloadSinglePdf (success, error)
 * - handleDownloadClassPdf (success, error with/without class)
 * - getEvaluationForStudent and evalStats
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BintangGrade, AspectPointsSummary } from '../../../../../services/bintangService';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockUpsertEvaluation = vi.fn();
const mockBulkUpsertEvaluations = vi.fn();
const mockPublishEvaluations = vi.fn();
const mockUnpublishEvaluations = vi.fn();
const mockUnpublishSingleEvaluation = vi.fn();

vi.mock('../../../../../services/bintangService', () => ({
    bintangService: {
        upsertEvaluation: (...args: any[]) => mockUpsertEvaluation(...args),
        bulkUpsertEvaluations: (...args: any[]) => mockBulkUpsertEvaluations(...args),
        publishEvaluations: (...args: any[]) => mockPublishEvaluations(...args),
        unpublishEvaluations: (...args: any[]) => mockUnpublishEvaluations(...args),
        unpublishSingleEvaluation: (...args: any[]) => mockUnpublishSingleEvaluation(...args),
    },
    calculateAspectPoints: vi.fn(),
    pointsToGrade: vi.fn((): BintangGrade => 'A'),
    BINTANG_THRESHOLDS: [
        { grade: 'A', label: 'Sangat Baik', maxPoints: 0, color: 'emerald' },
        { grade: 'B', label: 'Baik', maxPoints: 10, color: 'blue' },
        { grade: 'C', label: 'Cukup', maxPoints: 20, color: 'amber' },
        { grade: 'D', label: 'Kurang', maxPoints: Infinity, color: 'rose' },
    ],
}));

const mockDownloadBintangReportAction = vi.fn();

vi.mock('../../../../../services/bintangPdfGenerator', () => ({
    downloadBintangReportAction: (...args: any[]) => mockDownloadBintangReportAction(...args),
}));

const mockGenerateAutoNote = vi.fn();
const mockGenerateHomeroomNote = vi.fn();

vi.mock('../../bintangConstants', () => ({
    generateAutoNote: (...args: any[]) => mockGenerateAutoNote(...args),
    generateHomeroomNote: (...args: any[]) => mockGenerateHomeroomNote(...args),
    getAspectAutoNote: vi.fn((aspect: string, grade: string) => `Auto note for ${aspect} ${grade}`),
    isAutoAdabNote: vi.fn((note?: string | null) => !note || note.startsWith('Auto note') || note.startsWith('Alhamdulillah')),
    isAutoKedisNote: vi.fn((note?: string | null) => !note || note.startsWith('Auto note') || note.startsWith('Kedisiplinan')),
    isAutoKerapianNote: vi.fn((note?: string | null) => !note || note.startsWith('Auto note') || note.startsWith('Senantiasa')),
    isAutoHomeroomNote: vi.fn((note?: string | null) => !note || note.startsWith('Alhamdulillah') || note.startsWith('Barakallah') || note.startsWith('Homeroom note')),
    gradeColors: {
        A: 'bg-emerald-100 text-emerald-800',
        B: 'bg-blue-100 text-blue-800',
        C: 'bg-amber-100 text-amber-800',
        D: 'bg-rose-100 text-rose-800',
    },
    aspectMeta: {
        ADAB: { icon: 'Shield', label: 'Adab', color: 'text-indigo-500', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200' },
        KEDISIPLINAN: { icon: 'AlertTriangle', label: 'Kedisiplinan', color: 'text-amber-500', bgLight: 'bg-amber-50', borderColor: 'border-amber-200' },
        KERAPIAN: { icon: 'Sparkles', label: 'Kerapian', color: 'text-teal-500', bgLight: 'bg-teal-50', borderColor: 'border-teal-200' },
    },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_STUDENTS = [
    { id: 'student-1', name: 'Ahmad Fauzi' },
    { id: 'student-2', name: 'Budi Santoso' },
    { id: 'student-3', name: 'Citra Dewi' },
];

const MOCK_EVALUATIONS = [
    {
        id: 'eval-1',
        student_id: 'student-2',
        month: '2026-01',
        adab_score: 'B',
        kedisiplinan_score: 'A',
        kerapian_score: 'C',
        adab_notes: 'Sudah cukup baik',
        kedisiplinan_notes: 'Sangat disiplin',
        kerapian_notes: 'Perlu lebih rapi',
        catatan_wali: 'Pertahankan semangatnya',
        is_published: false,
        evaluator_id: 'teacher-1',
    },
];

const MOCK_USER = {
    id: 'teacher-1',
    email: 'teacher@school.com',
    user_metadata: {
        full_name: 'Bapak Guru',
        avatar_url: '/avatar.jpg',
    },
};

const MOCK_ASPECT_SUMMARY_BASE: AspectPointsSummary = {
    ADAB: { points: 5, count: 1, grade: 'B' },
    KEDISIPLINAN: { points: 0, count: 0, grade: 'A' },
    KERAPIAN: { points: 12, count: 2, grade: 'C' },
};

function createDefaultOptions(overrides: Record<string, any> = {}) {
    return {
        toast: { success: vi.fn(), error: vi.fn() },
        confirmPublish: vi.fn(async (opts: any) => {
            await opts.onConfirm();
            return true;
        }),
        fetchData: vi.fn().mockResolvedValue(undefined),
        selectedMonth: '2026-01',
        user: MOCK_USER,
        students: MOCK_STUDENTS,
        evaluations: MOCK_EVALUATIONS,
        selectedClass: 'class-1',
        getStudentQuizPoints: undefined,
        ...overrides,
    };
}

function mockGetAspectSummary(_studentId: string): AspectPointsSummary {
    return {
        ...MOCK_ASPECT_SUMMARY_BASE,
        ADAB: { ...MOCK_ASPECT_SUMMARY_BASE.ADAB },
        KEDISIPLINAN: { ...MOCK_ASPECT_SUMMARY_BASE.KEDISIPLINAN },
        KERAPIAN: { ...MOCK_ASPECT_SUMMARY_BASE.KERAPIAN },
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useBintangEvaluation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations AND set safe defaults
        mockUpsertEvaluation.mockReset();
        mockBulkUpsertEvaluations.mockReset();
        mockPublishEvaluations.mockReset();
        mockUnpublishEvaluations.mockReset();
        mockUnpublishSingleEvaluation.mockReset();
        mockDownloadBintangReportAction.mockReset();
        // generateAutoNote/HomeroomNote need default return values (some tests
        // open modal without existing eval, which triggers these functions)
        mockGenerateAutoNote.mockReset();
        mockGenerateAutoNote.mockReturnValue({
            adabNote: '',
            kedisNote: '',
            kerapianNote: '',
        });
        mockGenerateHomeroomNote.mockReset();
        mockGenerateHomeroomNote.mockReturnValue('');
    });

    // ── Initialization ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('should initialize with default values', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            expect(result.current.isEditModalOpen).toBe(false);
            expect(result.current.editingStudent).toBeNull();
            expect(result.current.isSubmitting).toBe(false);
            expect(result.current.isPublishing).toBe(false);
            expect(result.current.isGenerating).toBe(false);
            expect(result.current.downloadingStudentId).toBeNull();
            expect(result.current.isDownloadingClass).toBe(false);

            expect(result.current.formData).toEqual({
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                adab_notes: '',
                kedisiplinan_notes: '',
                kerapian_notes: '',
                catatan_wali: '',
                manual_aspects: [],
            });
        });

        it('should compute evalStats correctly', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            // 3 students, 1 evaluation (not published)
            expect(result.current.evalStats).toEqual({
                filled: 1,
                published: 0,
                total: 3,
            });
        });
    });

    // ── getEvaluationForStudent ───────────────────────────────────────────────

    describe('getEvaluationForStudent', () => {
        it('should return evaluation for existing student', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            const ev = result.current.getEvaluationForStudent('student-2');
            expect(ev).toBeDefined();
            expect(ev?.student_id).toBe('student-2');
            expect(ev?.adab_score).toBe('B');
        });

        it('should return undefined for student without evaluation', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            const ev = result.current.getEvaluationForStudent('student-1');
            expect(ev).toBeUndefined();
        });
    });

    // ── handleOpenEditModal ───────────────────────────────────────────────────

    describe('handleOpenEditModal', () => {
        it('should open modal with auto-generated notes when no existing evaluation', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            mockGenerateAutoNote.mockReturnValue({
                adabNote: 'Auto adab note',
                kedisNote: 'Auto kedis note',
                kerapianNote: 'Auto kerapian note',
            });
            mockGenerateHomeroomNote.mockReturnValue('Auto homeroom note');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            expect(result.current.isEditModalOpen).toBe(true);
            expect(result.current.editingStudent).toEqual({ id: 'student-1', name: 'Ahmad Fauzi' });
            expect(mockGenerateAutoNote).toHaveBeenCalledWith('B', 'A', 'C', 0);
            expect(mockGenerateHomeroomNote).toHaveBeenCalledWith('B', 'A', 'C', 0, expect.objectContaining({ studentName: 'Ahmad Fauzi' }));
            expect(result.current.formData.adab_score).toBe('B');
            expect(result.current.formData.adab_notes).toBe('Auto adab note');
            expect(result.current.formData.catatan_wali).toBe('Auto homeroom note');
        });

        it('should open modal with existing evaluation data when available', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-2', name: 'Budi Santoso' },
                    mockGetAspectSummary,
                );
            });

            expect(result.current.isEditModalOpen).toBe(true);
            // Existing eval has adab=B, kedis=A, kerap=C
            expect(result.current.formData.adab_score).toBe('B');
            expect(result.current.formData.kedisiplinan_score).toBe('A');
            expect(result.current.formData.kerapian_score).toBe('C');
            expect(result.current.formData.adab_notes).toBe('Sudah cukup baik');
            expect(result.current.formData.catatan_wali).toBe('Pertahankan semangatnya');
            // Should NOT call generateAutoNote/HomeroomNote when eval exists
            expect(mockGenerateAutoNote).not.toHaveBeenCalled();
        });

        it('should include quiz active points in auto-notes when getStudentQuizPoints is provided', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const getStudentQuizPoints = vi.fn((id: string) => {
                return id === 'student-1' ? 5 : 0;
            });
            const options = createDefaultOptions({ getStudentQuizPoints });

            mockGenerateAutoNote.mockReturnValue({
                adabNote: 'Auto with quiz points',
                kedisNote: 'Auto kedis',
                kerapianNote: 'Auto kerapian',
            });
            mockGenerateHomeroomNote.mockReturnValue('Homeroom with quiz');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            expect(getStudentQuizPoints).toHaveBeenCalledWith('student-1');
            expect(mockGenerateAutoNote).toHaveBeenCalledWith('B', 'A', 'C', 5);
            expect(mockGenerateHomeroomNote).toHaveBeenCalledWith('B', 'A', 'C', 5, expect.objectContaining({ studentName: 'Ahmad Fauzi' }));
        });

        it('should allow regenerating homeroom note with handleRegenerateHomeroomNote', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const getStudentViolations = vi.fn(() => [
                { description: 'Terlambat masuk sekolah' },
            ]);
            const options = createDefaultOptions({ toast, getStudentViolations });

            mockGenerateHomeroomNote.mockReturnValue('Regenerated note with violations');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleRegenerateHomeroomNote(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            expect(getStudentViolations).toHaveBeenCalledWith('student-1');
            expect(result.current.formData.catatan_wali).toBe('Regenerated note with violations');
            expect(toast.success).toHaveBeenCalledWith('Catatan wali kelas berhasil dibuat ulang secara kontekstual');
        });

        it('should pass spiritual and social attitude predicates from getStudentAttitude to generateHomeroomNote', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const getStudentAttitude = vi.fn().mockReturnValue({ spiritual: 'SB', social: 'B' });
            const options = createDefaultOptions({ getStudentAttitude });

            mockGenerateHomeroomNote.mockReturnValue('Auto note with attitude');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            expect(getStudentAttitude).toHaveBeenCalledWith('student-1');
            expect(mockGenerateHomeroomNote).toHaveBeenCalledWith(
                'B', 'A', 'C', 0,
                expect.objectContaining({
                    studentName: 'Ahmad Fauzi',
                    spiritualPredicate: 'SB',
                    socialPredicate: 'B',
                })
            );
        });
    });

    // ── handleSaveEvaluation ──────────────────────────────────────────────────

    describe('handleSaveEvaluation', () => {
        it('should save evaluation successfully', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const fetchData = vi.fn().mockResolvedValue(undefined);
            const options = createDefaultOptions({ toast, fetchData });

            mockUpsertEvaluation.mockResolvedValue({ id: 'new-eval-1' });

            const { result } = renderHook(() => useBintangEvaluation(options));

            // First open modal
            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            // Then save
            const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
            await act(async () => {
                await result.current.handleSaveEvaluation(mockEvent, mockGetAspectSummary);
            });

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockUpsertEvaluation).toHaveBeenCalledWith({
                student_id: 'student-1',
                month: '2026-01',
                evaluator_id: 'teacher-1',
                adab_score: 'B',
                kedisiplinan_score: 'A',
                kerapian_score: 'C', // from aspect summary since no existing eval
                adab_notes: '',
                kedisiplinan_notes: '',
                kerapian_notes: '',
                catatan_wali: '',
                manual_aspects: [],
            });
            expect(toast.success).toHaveBeenCalledWith('Rapor BINTANG berhasil disimpan');
            expect(result.current.isEditModalOpen).toBe(false);
            expect(fetchData).toHaveBeenCalled();
        });

        it('should handle save error gracefully', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast });

            mockUpsertEvaluation.mockRejectedValue(new Error('DB error'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
            await act(async () => {
                await result.current.handleSaveEvaluation(mockEvent, mockGetAspectSummary);
            });

            expect(toast.error).toHaveBeenCalledWith('Gagal menyimpan rapor');
            // Modal should remain open on error
            expect(result.current.isEditModalOpen).toBe(true);
        });

        it('should set isSubmitting while saving', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            let resolvePromise: (value: any) => void;
            mockUpsertEvaluation.mockReturnValue(
                new Promise((resolve) => { resolvePromise = resolve; })
            );

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                result.current.handleOpenEditModal(
                    { id: 'student-1', name: 'Ahmad Fauzi' },
                    mockGetAspectSummary,
                );
            });

            const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
            let savePromise: Promise<void>;
            await act(async () => {
                savePromise = result.current.handleSaveEvaluation(mockEvent, mockGetAspectSummary);
            });

            // During save, isSubmitting should be true
            // Note: In React 18 with act, this state update is batched
            expect(result.current.isSubmitting).toBe(true);

            await act(async () => {
                resolvePromise!({ id: 'new-eval' });
                await savePromise!;
            });

            expect(result.current.isSubmitting).toBe(false);
        });

        it('should track and persist manual_aspects when score is manually modified', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();
            mockUpsertEvaluation.mockResolvedValue({ id: 'eval-saved' });

            const { result } = renderHook(() => useBintangEvaluation(options));

            // Open modal for student-1 (recommendations: Adab=B, Kedis=A, Kerapian=C)
            act(() => {
                result.current.handleOpenEditModal(MOCK_STUDENTS[0], mockGetAspectSummary);
            });

            // Teacher manually changes Adab from 'B' to 'A'
            act(() => {
                result.current.setFormData(prev => ({
                    ...prev,
                    adab_score: 'A',
                    manual_aspects: ['ADAB'],
                }));
            });

            const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
            await act(async () => {
                await result.current.handleSaveEvaluation(mockEvent, mockGetAspectSummary);
            });

            expect(mockUpsertEvaluation).toHaveBeenCalledWith(
                expect.objectContaining({
                    student_id: 'student-1',
                    adab_score: 'A',
                    manual_aspects: expect.arrayContaining(['ADAB']),
                })
            );
        });
    });

    // ── handleGenerateAll ─────────────────────────────────────────────────────

    describe('handleGenerateAll', () => {
        it('should generate evaluations for all students', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const fetchData = vi.fn().mockResolvedValue(undefined);
            const options = createDefaultOptions({ toast, fetchData });

            mockBulkUpsertEvaluations.mockResolvedValue([{ id: 'gen-1' }]);

            mockGenerateAutoNote.mockReturnValue({
                adabNote: 'Auto adab',
                kedisNote: 'Auto kedis',
                kerapianNote: 'Auto kerapian',
            });
            mockGenerateHomeroomNote.mockReturnValue('Auto homeroom');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            // Should generate for all 3 students
            expect(mockBulkUpsertEvaluations).toHaveBeenCalledTimes(1);
            const inserts = mockBulkUpsertEvaluations.mock.calls[0][0];
            expect(inserts).toHaveLength(3);
            expect(inserts[0].student_id).toBe('student-1');
            expect(inserts[1].student_id).toBe('student-2');
            expect(inserts[2].student_id).toBe('student-3');

            expect(toast.success).toHaveBeenCalledWith('Berhasil generate rapor untuk 3 siswa');
            expect(fetchData).toHaveBeenCalled();
        });

        it('should handle generate all error gracefully', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast });

            mockBulkUpsertEvaluations.mockRejectedValue(new Error('Bulk upsert failed'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            expect(toast.error).toHaveBeenCalledWith('Gagal generate rapor otomatis');
        });

        it('should include quiz points for each student when getStudentQuizPoints is provided', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const getStudentQuizPoints = vi.fn((id: string) => {
                if (id === 'student-1') return 10;
                if (id === 'student-2') return 5;
                return 0;
            });
            const options = createDefaultOptions({ getStudentQuizPoints });

            mockBulkUpsertEvaluations.mockResolvedValue([]);

            mockGenerateAutoNote.mockReturnValue({
                adabNote: 'Auto',
                kedisNote: 'Auto',
                kerapianNote: 'Auto',
            });
            mockGenerateHomeroomNote.mockReturnValue('Auto');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            // student-1 should get activePts=10, student-2 activePts=5, student-3 activePts=0
            expect(mockGenerateAutoNote).toHaveBeenNthCalledWith(1, 'B', 'A', 'C', 10);
            expect(mockGenerateAutoNote).toHaveBeenNthCalledWith(2, 'B', 'A', 'C', 5);
            expect(mockGenerateAutoNote).toHaveBeenNthCalledWith(3, 'B', 'A', 'C', 0);
        });

        it('should preserve manually edited aspect scores and not revert them on generate', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions({
                // student-2 has existing eval with manual_aspects: ['ADAB'] and adab_score='A',
                // whereas mockGetAspectSummary recommends Adab='B'
                evaluations: [
                    {
                        ...MOCK_EVALUATIONS[0],
                        student_id: 'student-2',
                        adab_score: 'A',
                        manual_aspects: ['ADAB'],
                    },
                ],
            });

            mockBulkUpsertEvaluations.mockResolvedValue([]);
            mockGenerateAutoNote.mockReturnValue({ adabNote: 'Auto', kedisNote: 'Auto', kerapianNote: 'Auto' });
            mockGenerateHomeroomNote.mockReturnValue('Auto note');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            expect(mockBulkUpsertEvaluations).toHaveBeenCalledTimes(1);
            const inserts = mockBulkUpsertEvaluations.mock.calls[0][0];
            const student2Insert = inserts.find((i: any) => i.student_id === 'student-2');

            // Adab score must remain 'A' (preserved from manual edit), NOT reverted to 'B'
            expect(student2Insert.adab_score).toBe('A');
            expect(student2Insert.manual_aspects).toContain('ADAB');

            // Kedisiplinan and Kerapian (not in manual_aspects) should use calculated grades ('A' and 'C')
            expect(student2Insert.kedisiplinan_score).toBe('A');
            expect(student2Insert.kerapian_score).toBe('C');
        });

        it('should preserve manually edited scores even without manual_aspects via backward compatibility', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions({
                // student-2 has adab_score='A' differing from calculated recommendation 'B',
                // but manual_aspects is undefined (legacy row)
                evaluations: [
                    {
                        ...MOCK_EVALUATIONS[0],
                        student_id: 'student-2',
                        adab_score: 'A',
                        manual_aspects: null,
                    },
                ],
            });

            mockBulkUpsertEvaluations.mockResolvedValue([]);
            mockGenerateAutoNote.mockReturnValue({ adabNote: 'Auto', kedisNote: 'Auto', kerapianNote: 'Auto' });
            mockGenerateHomeroomNote.mockReturnValue('Auto note');

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            const inserts = mockBulkUpsertEvaluations.mock.calls[0][0];
            const student2Insert = inserts.find((i: any) => i.student_id === 'student-2');

            // Legacy manual score 'A' must still be preserved
            expect(student2Insert.adab_score).toBe('A');
        });
    });

    // ── handlePublish ─────────────────────────────────────────────────────────

    describe('handlePublish', () => {
        it('should publish evaluations after confirmation', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const fetchData = vi.fn().mockResolvedValue(undefined);
            const confirmPublish = vi.fn(async (opts: any) => {
                await opts.onConfirm();
                return true;
            });
            const options = createDefaultOptions({
                toast,
                fetchData,
                confirmPublish,
                selectedClass: 'class-1',
                selectedMonth: '2026-01',
            });

            mockPublishEvaluations.mockResolvedValue([{ id: 'pub-1' }]);

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handlePublish();
            });

            expect(confirmPublish).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Publikasi Rapor BINTANG',
                    confirmText: 'Ya, Publikasikan',
                })
            );
            expect(mockPublishEvaluations).toHaveBeenCalledWith('class-1', '2026-01');
            expect(toast.success).toHaveBeenCalledWith('Rapor BINTANG berhasil dipublikasikan');
            expect(fetchData).toHaveBeenCalled();
        });

        it('should handle publish error gracefully', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const confirmPublish = vi.fn(async (opts: any) => {
                await opts.onConfirm();
                return true;
            });
            const options = createDefaultOptions({ toast, confirmPublish });

            mockPublishEvaluations.mockRejectedValue(new Error('Publish failed'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handlePublish();
            });

            expect(toast.error).toHaveBeenCalledWith('Gagal mempublikasikan rapor');
        });
    });

    // ── handleUnpublish ───────────────────────────────────────────────────────

    describe('handleUnpublish', () => {
        it('should unpublish class evaluations after confirmation', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const fetchData = vi.fn().mockResolvedValue(undefined);
            const confirmUnpublish = vi.fn(async (opts: any) => {
                await opts.onConfirm();
                return true;
            });
            const options = createDefaultOptions({
                toast,
                fetchData,
                confirmUnpublish,
                selectedClass: 'class-1',
                selectedMonth: '2026-01',
                evaluations: [
                    {
                        id: 'pub-1', student_id: 's-1', month: '2026-01',
                        adab_score: 'A', kedisiplinan_score: 'A', kerapian_score: 'A',
                        adab_notes: null, kedisiplinan_notes: null, kerapian_notes: null,
                        catatan_wali: null, is_published: true, evaluator_id: 'u-1',
                    }
                ],
            });

            mockUnpublishEvaluations.mockResolvedValue([{ id: 'pub-1', is_published: false }]);

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleUnpublish();
            });

            expect(confirmUnpublish).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Batalkan Publikasi Rapor BINTANG',
                    confirmText: 'Ya, Kembalikan ke Draft',
                })
            );
            expect(mockUnpublishEvaluations).toHaveBeenCalledWith('class-1', '2026-01');
            expect(toast.success).toHaveBeenCalledWith('Publikasi rapor berhasil dibatalkan. Rapor kembali ke status Draft.');
            expect(fetchData).toHaveBeenCalled();
        });

        it('should handle unpublish error gracefully', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const confirmUnpublish = vi.fn(async (opts: any) => {
                await opts.onConfirm();
                return true;
            });
            const options = createDefaultOptions({ toast, confirmUnpublish });

            mockUnpublishEvaluations.mockRejectedValue(new Error('Unpublish failed'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleUnpublish();
            });

            expect(toast.error).toHaveBeenCalledWith('Gagal membatalkan publikasi rapor');
        });
    });

    // ── handleUnpublishSingle ─────────────────────────────────────────────────

    describe('handleUnpublishSingle', () => {
        it('should unpublish a single student evaluation after confirmation', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const fetchData = vi.fn().mockResolvedValue(undefined);
            const confirmUnpublish = vi.fn(async (opts: any) => {
                await opts.onConfirm();
                return true;
            });
            const options = createDefaultOptions({
                toast,
                fetchData,
                confirmUnpublish,
                students: [{ id: 's-1', name: 'Ahmad' }],
                evaluations: [
                    {
                        id: 'pub-1', student_id: 's-1', month: '2026-01',
                        adab_score: 'A', kedisiplinan_score: 'A', kerapian_score: 'A',
                        adab_notes: null, kedisiplinan_notes: null, kerapian_notes: null,
                        catatan_wali: null, is_published: true, evaluator_id: 'u-1',
                    }
                ],
            });

            mockUnpublishSingleEvaluation.mockResolvedValue({ id: 'pub-1', is_published: false });

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleUnpublishSingle('s-1', 'Ahmad');
            });

            expect(confirmUnpublish).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Batalkan Publikasi Rapor Siswa',
                    confirmText: 'Ya, Kembalikan ke Draft',
                })
            );
            expect(mockUnpublishSingleEvaluation).toHaveBeenCalledWith('pub-1');
            expect(toast.success).toHaveBeenCalledWith('Rapor untuk Ahmad dikembalikan ke Draft');
            expect(fetchData).toHaveBeenCalled();
        });
    });

    // ── handleDownloadSinglePdf ───────────────────────────────────────────────

    describe('handleDownloadSinglePdf', () => {
        it('should download PDF for a single student', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast });

            mockDownloadBintangReportAction.mockResolvedValue(undefined);

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadSinglePdf('student-1');
            });

            expect(mockDownloadBintangReportAction).toHaveBeenCalledWith({
                studentId: 'student-1',
                month: '2026-01',
                user: {
                    id: 'teacher-1',
                    name: 'Bapak Guru',
                    avatarUrl: '/avatar.jpg',
                    email: 'teacher@school.com',
                },
            });
            expect(toast.success).toHaveBeenCalledWith('Rapor Bintang berhasil diunduh');
        });

        it('should handle download PDF error', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast });

            mockDownloadBintangReportAction.mockRejectedValue(new Error('PDF generation failed'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadSinglePdf('student-1');
            });

            expect(toast.error).toHaveBeenCalledWith('PDF generation failed');
        });

        it('should set downloadingStudentId while downloading', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            let resolvePromise: (value: any) => void;
            mockDownloadBintangReportAction.mockReturnValue(
                new Promise((resolve) => { resolvePromise = resolve; })
            );

            const { result } = renderHook(() => useBintangEvaluation(options));

            let downloadPromise: Promise<void>;
            await act(async () => {
                downloadPromise = result.current.handleDownloadSinglePdf('student-1');
            });

            expect(result.current.downloadingStudentId).toBe('student-1');

            await act(async () => {
                resolvePromise!(undefined);
                await downloadPromise!;
            });

            expect(result.current.downloadingStudentId).toBeNull();
        });
    });

    // ── handleDownloadClassPdf ────────────────────────────────────────────────

    describe('handleDownloadClassPdf', () => {
        it('should download PDF for entire class', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast, selectedClass: 'class-1' });

            mockDownloadBintangReportAction.mockResolvedValue(undefined);

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadClassPdf();
            });

            expect(mockDownloadBintangReportAction).toHaveBeenCalledWith({
                classId: 'class-1',
                month: '2026-01',
                user: expect.objectContaining({ id: 'teacher-1' }),
                // The hook reports per-student progress so the UI can show a counter.
                onProgress: expect.any(Function),
            });
            expect(toast.success).toHaveBeenCalledWith('Rapor Kelas berhasil diunduh');
        });

        it('should not download if no class is selected', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions({ selectedClass: '' });

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadClassPdf();
            });

            expect(mockDownloadBintangReportAction).not.toHaveBeenCalled();
        });

        it('should handle class PDF download error', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const toast = { success: vi.fn(), error: vi.fn() };
            const options = createDefaultOptions({ toast, selectedClass: 'class-1' });

            mockDownloadBintangReportAction.mockRejectedValue(new Error('Class PDF failed'));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadClassPdf();
            });

            expect(toast.error).toHaveBeenCalledWith('Class PDF failed');
        });
    });

    // ── Edge Cases ───────────────────────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle empty students array', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions({ students: [], evaluations: [] });

            const { result } = renderHook(() => useBintangEvaluation(options));

            expect(result.current.evalStats).toEqual({ filled: 0, published: 0, total: 0 });
        });

        it('should count published evaluations correctly', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const publishedEvaluations = [
                ...MOCK_EVALUATIONS,
                {
                    id: 'eval-2',
                    student_id: 'student-1',
                    month: '2026-01',
                    adab_score: 'A',
                    kedisiplinan_score: 'A',
                    kerapian_score: 'A',
                    adab_notes: null,
                    kedisiplinan_notes: null,
                    kerapian_notes: null,
                    catatan_wali: null,
                    is_published: true,
                    evaluator_id: 'teacher-1',
                },
            ];
            const options = createDefaultOptions({ evaluations: publishedEvaluations });

            const { result } = renderHook(() => useBintangEvaluation(options));

            expect(result.current.evalStats).toEqual({ filled: 2, published: 1, total: 3 });
        });

        it('should handle missing user gracefully for download', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions({ user: null });

            mockDownloadBintangReportAction.mockResolvedValue(undefined);

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleDownloadSinglePdf('student-1');
            });

            expect(mockDownloadBintangReportAction).toHaveBeenCalledWith({
                studentId: 'student-1',
                month: '2026-01',
                user: null,
            });
        });
    });

    // ── Automatic Note Adjustment ───────────────────────────────────────────

    describe('automatic note adjustment when grade changes', () => {
        it('should automatically adjust aspect notes and regenerate catatan_wali when score is changed via handleAspectScoreChange', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            // Open modal for student-1 (default B from mockGetAspectSummary)
            act(() => {
                result.current.handleOpenEditModal(MOCK_STUDENTS[0], mockGetAspectSummary);
            });

            expect(result.current.formData.adab_score).toBe('B');

            // Change Adab to C
            act(() => {
                result.current.handleAspectScoreChange('ADAB', 'C');
            });

            expect(result.current.formData.adab_score).toBe('C');
            expect(result.current.formData.adab_notes).toBe('Auto note for ADAB C');
            expect(result.current.formData.manual_aspects).toContain('ADAB');
            expect(mockGenerateHomeroomNote).toHaveBeenCalledWith(
                'C', 'A', 'C', 0,
                expect.objectContaining({ studentName: 'Ahmad Fauzi' })
            );
        });

        it('should NOT overwrite custom aspect notes or custom catatan_wali when score changes', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            act(() => {
                result.current.handleOpenEditModal(MOCK_STUDENTS[0], mockGetAspectSummary);
            });

            // Set custom notes
            act(() => {
                result.current.setFormData(prev => ({
                    ...prev,
                    adab_notes: 'Pesan kustom guru untuk adab Ahmad',
                    catatan_wali: 'Pesan khusus wali kelas untuk orang tua Ahmad',
                    manual_aspects: ['CUSTOM_ADAB_NOTES', 'CUSTOM_CATATAN_WALI'],
                }));
            });

            // Change Adab to A
            act(() => {
                result.current.handleAspectScoreChange('ADAB', 'A');
            });

            expect(result.current.formData.adab_score).toBe('A');
            // Custom notes must NOT be overwritten
            expect(result.current.formData.adab_notes).toBe('Pesan kustom guru untuk adab Ahmad');
            expect(result.current.formData.catatan_wali).toBe('Pesan khusus wali kelas untuk orang tua Ahmad');
        });

        it('should allow resetting aspect note to auto-generated template via handleResetAspectNote', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            const options = createDefaultOptions();

            const { result } = renderHook(() => useBintangEvaluation(options));

            act(() => {
                result.current.handleOpenEditModal(MOCK_STUDENTS[0], mockGetAspectSummary);
            });

            act(() => {
                result.current.setFormData(prev => ({
                    ...prev,
                    adab_score: 'B',
                    adab_notes: 'Catatan kustom',
                    manual_aspects: ['CUSTOM_ADAB_NOTES'],
                }));
            });

            act(() => {
                result.current.handleResetAspectNote('ADAB');
            });

            expect(result.current.formData.adab_notes).toBe('Auto note for ADAB B');
            expect(result.current.formData.manual_aspects).not.toContain('CUSTOM_ADAB_NOTES');
            expect(options.toast.success).toHaveBeenCalledWith(expect.stringContaining('berhasil direset'));
        });

        it('should synchronize aspect notes and homeroom notes with manual scores on handleGenerateAll when notes are auto', async () => {
            const { useBintangEvaluation } = await import('../useBintangEvaluation');
            // Student 2 has manual adab_score 'C'
            const evaluationsWithManual = [
                {
                    id: 'eval-1',
                    student_id: 'student-2',
                    month: '2026-01',
                    adab_score: 'C',
                    kedisiplinan_score: 'A',
                    kerapian_score: 'C',
                    adab_notes: 'Auto note for ADAB A', // Old note before score was changed to C
                    kedisiplinan_notes: null,
                    kerapian_notes: null,
                    catatan_wali: 'Alhamdulillah lama...', // Auto homeroom note from when it was A
                    is_published: false,
                    evaluator_id: 'teacher-1',
                    manual_aspects: ['ADAB'],
                },
            ];

            const options = createDefaultOptions({ evaluations: evaluationsWithManual });
            mockBulkUpsertEvaluations.mockResolvedValue(undefined);
            mockGenerateAutoNote.mockImplementation((adab, kedis, kerapian) => ({
                adabNote: `Auto note for ADAB ${adab}`,
                kedisNote: `Auto note for KEDISIPLINAN ${kedis}`,
                kerapianNote: `Auto note for KERAPIAN ${kerapian}`,
            }));

            const { result } = renderHook(() => useBintangEvaluation(options));

            await act(async () => {
                await result.current.handleGenerateAll(mockGetAspectSummary);
            });

            expect(mockBulkUpsertEvaluations).toHaveBeenCalledTimes(1);
            const inserts = mockBulkUpsertEvaluations.mock.calls[0][0];
            const student2Insert = inserts.find((i: any) => i.student_id === 'student-2');

            expect(student2Insert).toBeDefined();
            expect(student2Insert.adab_score).toBe('C');
            // Should be regenerated to reflect C, not A!
            expect(student2Insert.adab_notes).toBe('Auto note for ADAB C');
            // Homeroom note should be called with C
            expect(mockGenerateHomeroomNote).toHaveBeenCalledWith(
                'C', 'A', 'C', 0,
                expect.objectContaining({ studentName: 'Budi Santoso' })
            );
        });
    });
});
