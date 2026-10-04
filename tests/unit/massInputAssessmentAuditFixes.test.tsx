/**
 * Regression tests for the Input Penilaian audit (docs/audit-input-penilaian-2026-10-04.md).
 * Each scenario reproduced a defect before the fix; here it asserts the fixed behaviour.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMassInputViewModel } from '../../src/components/pages/mass-input/hooks/useMassInputViewModel';
import {
    executeSubjectGradeMutation,
    GradeConflictError,
    summarizeScoreChanges,
} from '../../src/components/pages/mass-input/hooks/mutations/useSubjectGradeMutation';
import { executeAttitudeMutation } from '../../src/components/pages/mass-input/hooks/mutations/useAttitudeMutation';
import { getSubjectGradeContextKey, writeSubjectGradeDraft } from '../../src/utils/subjectGradeDraftStorage';

const fixture = vi.hoisted(() => ({
    data: {} as any,
    userId: 'teacher-1',
    semesters: [] as any[],
    writes: [] as { table: string; op: string; rows: any }[],
    selectRows: {} as Record<string, any[]>,
    insertErrors: {} as Record<string, { code: string; message: string } | null>,
}));

vi.mock('react-router-dom', () => ({ useLocation: () => ({ state: {}, pathname: '/input-massal' }), useNavigate: () => vi.fn() }));
vi.mock('../../src/contexts/SemesterContext', () => ({ useSemester: () => ({ activeSemester: null, semesters: fixture.semesters }) }));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: fixture.userId, name: 'Guru' } }) }));
vi.mock('../../src/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));
vi.mock('../../src/hooks/useUserSettings', () => ({ useUserSettings: () => ({ settings: null, isLoading: true, updateSettings: vi.fn() }) }));
vi.mock('../../src/components/pages/mass-input/hooks/useMassInputData', () => ({ useMassInputData: () => fixture.data }));
vi.mock('../../src/components/pages/mass-input/hooks/useMassInputMutations', () => ({ useMassInputMutations: () => ({ isOnline: true }) }));
vi.mock('../../src/services/UndoManager', () => ({ recordAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/services/supabase', () => {
    const result = (data: any, error: any = null) => ({ data, error });
    const chain = (table: string) => {
        const c: any = {};
        ['select', 'eq', 'in', 'is', 'gte', 'order', 'range'].forEach(m => { c[m] = () => c; });
        c.then = (resolve: any) => Promise.resolve(result(fixture.selectRows[table] || [])).then(resolve);
        return c;
    };
    return {
        supabase: {
            from: (table: string) => ({
                select: () => chain(table),
                upsert: (rows: any[]) => {
                    fixture.writes.push({ table, op: 'upsert', rows });
                    return { select: async () => result(rows) };
                },
                insert: (rows: any) => {
                    fixture.writes.push({ table, op: 'insert', rows });
                    const response = result(
                        (Array.isArray(rows) ? rows : [rows]).map((r: any, i: number) => ({ id: `id-${i}`, ...r })),
                        fixture.insertErrors[table] ?? null,
                    );
                    return { then: (resolve: any) => Promise.resolve(response).then(resolve), select: async () => response };
                },
                update: (values: any) => {
                    fixture.writes.push({ table, op: 'update', rows: values });
                    const c: any = { eq: () => c, then: (resolve: any) => Promise.resolve(result(null)).then(resolve) };
                    return c;
                },
            }),
        },
    };
});

const info = { subject: 'Matematika', assessment_name: 'PH1', semester: 'sem-old', notes: '' };
const grade = (id: string, score: number) => ({
    id: `record-${id}`, student_id: id, user_id: 'teacher-1', ...info, semester_id: 'sem-old',
    score, version: 1, created_at: '2026-07-01T00:00:00Z', deleted_at: null,
});
const user = { id: 'teacher-1' } as any;

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fixture.userId = 'teacher-1';
    fixture.semesters = [];
    fixture.data = { classes: [], studentsData: [{ id: 's1', name: 'Siswa 1' }, { id: 's2', name: 'Siswa 2' }], existingGrades: undefined };
    fixture.writes = [];
    fixture.selectRows = {};
    fixture.insertErrors = {};
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('draft recovery (finding 2)', () => {
    it('keeps a restored draft instead of replacing it with older server values', () => {
        writeSubjectGradeDraft('teacher-1', { selectedClass: 'class-1', subjectGradeInfo: info, scores: { s1: '90' }, baseline: { s1: '70' } });
        const { result, rerender } = renderHook(() => useMassInputViewModel());
        expect(result.current.scores.s1).toBe('90');
        expect(result.current.restoredDraft?.count).toBe(1);

        fixture.data = { ...fixture.data, existingGrades: [grade('s1', 70), grade('s2', 65)] };
        rerender();

        expect(result.current.scores.s1).toBe('90');
        // Untouched students still show what the server holds.
        expect(result.current.scores.s2).toBe('65');
        expect(result.current.isScoresDirty).toBe(true);
    });

    it('does not show another account\'s draft', () => {
        writeSubjectGradeDraft('teacher-1', { selectedClass: 'class-1', subjectGradeInfo: info, scores: { s1: '90' } });
        fixture.userId = 'teacher-2';
        const { result } = renderHook(() => useMassInputViewModel());
        expect(result.current.step).toBe(1);
        expect(result.current.scores).toEqual({});
    });

    it('discarding the draft brings back the server values', () => {
        writeSubjectGradeDraft('teacher-1', { selectedClass: 'class-1', subjectGradeInfo: info, scores: { s1: '90' }, baseline: { s1: '70' } });
        fixture.data = { ...fixture.data, existingGrades: [grade('s1', 70)] };
        const { result } = renderHook(() => useMassInputViewModel());
        act(() => result.current.discardRestoredDraft());
        expect(result.current.scores.s1).toBe('70');
        expect(result.current.isScoresDirty).toBe(false);
        expect(result.current.restoredDraft).toBeNull();
        expect(localStorage.getItem('guru_cerdas_subject_grade_draft:teacher-1')).toBeNull();
    });
});

describe('context switches (finding 3)', () => {
    const openWithTypedScore = () => {
        writeSubjectGradeDraft('teacher-1', { selectedClass: 'class-1', subjectGradeInfo: info, scores: { s1: '95' } });
        return renderHook(() => useMassInputViewModel());
    };

    it.each([
        ['class', (vm: any) => vm.setSelectedClass('class-2')],
        ['semester', (vm: any) => vm.setSubjectGradeInfo({ ...info, semester: 'sem-new' })],
        ['assessment PH1 → PH10', (vm: any) => vm.setSubjectGradeInfo({ ...info, assessment_name: 'PH10' })],
    ])('asks before switching %s and keeps the typed scores', (_label, change) => {
        const { result } = openWithTypedScore();
        act(() => change(result.current));
        expect(result.current.pendingClearAction?.kind).toBe('switch_config');
        expect(result.current.scores.s1).toBe('95');

        act(() => result.current.dismissPendingAction());
        expect(result.current.scores.s1).toBe('95');
        expect(result.current.subjectGradeInfo.assessment_name).toBe('PH1');
    });

    it('keeps the old context as a draft and restores it when switching back', () => {
        const { result } = openWithTypedScore();
        act(() => result.current.setSubjectGradeInfo({ ...info, assessment_name: 'PH10' }));
        act(() => result.current.confirmPendingAction());
        expect(result.current.subjectGradeInfo.assessment_name).toBe('PH10');
        expect(result.current.scores).toEqual({});

        act(() => result.current.setSubjectGradeInfo({ ...info, assessment_name: 'PH1' }));
        expect(result.current.scores.s1).toBe('95');
        expect(result.current.isScoresDirty).toBe(true);
    });
});

describe('locked semester (finding 1, client side)', () => {
    it('blocks saving grades into a locked semester', () => {
        fixture.semesters = [{ id: 'sem-old', is_locked: true, start_date: '2026-01-01', end_date: '2026-06-30' }];
        writeSubjectGradeDraft('teacher-1', { selectedClass: 'class-1', subjectGradeInfo: info, scores: { s1: '95' } });
        const { result } = renderHook(() => useMassInputViewModel());
        expect(result.current.isSubmitDisabled).toBe(true);
        expect(result.current.submitButtonTooltip).toContain('dikunci');
    });
});

describe('saving only changes with a conflict check (finding 4)', () => {
    it('sends only the scores that differ from the baseline', async () => {
        fixture.selectRows.academic_records = [grade('s2', 70)];
        const message = await executeSubjectGradeMutation({
            user, subjectGradeInfo: info, scores: { s1: '70', s2: '80' }, validationErrors: {}, gradedCount: 2,
            existingGrades: [grade('s1', 70), grade('s2', 70)] as any, baselineScores: { s1: '70', s2: '70' },
        });
        const upsert = fixture.writes.find(w => w.op === 'upsert')!;
        expect(upsert.rows).toHaveLength(1);
        expect(upsert.rows[0]).toMatchObject({ student_id: 's2', score: 80, version: 2, semester_id: 'sem-old' });
        expect(message).toContain('1 nilai lain tidak berubah');
    });

    it('stops when another device changed an edited score, and can overwrite on request', async () => {
        // Device A already saved 90; this form loaded 70 and the teacher typed 85.
        fixture.selectRows.academic_records = [{ ...grade('s1', 90) }];
        const params = {
            user, subjectGradeInfo: info, scores: { s1: '85' }, validationErrors: {}, gradedCount: 1,
            existingGrades: [grade('s1', 70)] as any, baselineScores: { s1: '70' },
        };
        const error = await executeSubjectGradeMutation(params).catch(e => e);
        expect(error).toBeInstanceOf(GradeConflictError);
        expect(error.conflicts).toEqual([{ student_id: 's1', serverScore: 90, localScore: 85 }]);
        expect(fixture.writes.filter(w => w.op === 'upsert')).toHaveLength(0);

        await executeSubjectGradeMutation({ ...params, overwriteConflicts: true });
        expect(fixture.writes.find(w => w.op === 'upsert')!.rows[0]).toMatchObject({ student_id: 's1', score: 85 });
    });

    it('reports nothing to save when no score changed', async () => {
        const message = await executeSubjectGradeMutation({
            user, subjectGradeInfo: info, scores: { s1: '70' }, validationErrors: {}, gradedCount: 1,
            existingGrades: [grade('s1', 70)] as any, baselineScores: { s1: '70' },
        });
        expect(message).toContain('Tidak ada perubahan');
        expect(fixture.writes).toHaveLength(0);
    });

    it('summarises new, changed and unchanged scores', () => {
        expect(summarizeScoreChanges({ s1: '70', s2: '85', s3: '60', s4: '' }, { s1: '70', s2: '80' }))
            .toEqual({ added: 1, changed: 1, unchanged: 1 });
    });
});

describe('attitude summary sync (finding 6)', () => {
    const run = () => executeAttitudeMutation({
        user, selectedStudentIds: new Set(['s1']), attitudeName: 'Adab', attitudeCategory: 'Adab & Akhlak',
        attitudeDate: '2026-10-04', attitudeNotes: 'Membantu teman', subjectGradeInfo: { semester: '' },
        activeSemester: null, attitudeSemester: { id: 'sem-new' }, shouldBypassGuard: true, getDuplicateGuardWindowIso: () => '',
    });

    it('stores the note and the date-based semester in the attitude record', async () => {
        const message = await run();
        expect(typeof message).toBe('string');
        const record = fixture.writes.find(w => w.table === 'attitude_records')!.rows[0];
        expect(record).toMatchObject({ notes: 'Membantu teman', semester_id: 'sem-new', date: '2026-10-04' });
    });

    it('warns instead of reporting plain success when the sync fails', async () => {
        fixture.insertErrors.attitude_records = { code: '42501', message: 'permission denied' };
        const outcome = await run();
        expect(outcome).toMatchObject({ tone: 'warning' });
        expect((outcome as any).message).toContain('Rekap sikap untuk 1 siswa belum diperbarui');
    });

    it('updates an existing summary row instead of inserting a duplicate', async () => {
        fixture.selectRows.attitude_records = [{ id: 'att-1', student_id: 's1', notes: null }];
        await run();
        expect(fixture.writes.some(w => w.table === 'attitude_records' && w.op === 'insert')).toBe(false);
        expect(fixture.writes.find(w => w.table === 'attitude_records' && w.op === 'update')!.rows)
            .toMatchObject({ date: '2026-10-04', notes: 'Membantu teman' });
    });
});

describe('school dates (finding 7)', () => {
    it('defaults every date field to the WIB day at 06:30 WIB', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-04T06:30:00+07:00'));
        const { result } = renderHook(() => useMassInputViewModel());
        expect(result.current.quizInfo.date).toBe('2026-10-04');
        expect(result.current.attitudeDate).toBe('2026-10-04');
        expect(result.current.violationDate).toBe('2026-10-04');
    });
});

describe('draft storage', () => {
    it('keys drafts by context', () => {
        expect(getSubjectGradeContextKey('c', info)).toBe('c::Matematika::PH1::sem-old');
    });
});
