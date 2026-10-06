import { describe, it, expect, vi, beforeEach } from 'vitest';

const existingRows: Array<Record<string, unknown>> = [];
const insertedPayloads: unknown[] = [];

vi.mock('../../src/services/supabase', () => {
    const selectChain = () => {
        const chain: Record<string, unknown> = {};
        chain.in = () => chain;
        chain.eq = () => chain;
        chain.is = () => Promise.resolve({ data: existingRows, error: null });
        return chain;
    };
    return {
        supabase: {
            from: vi.fn(() => ({
                select: selectChain,
                insert: (rows: unknown[]) => {
                    insertedPayloads.push(rows);
                    return { select: () => Promise.resolve({ data: (rows as unknown[]).map((_, i) => ({ id: `new-${i}` })), error: null }) };
                },
            })),
        },
    };
});
vi.mock('../../src/services/UndoManager', () => ({ recordAction: vi.fn() }));

import { buildQuizPointDailyKey } from '../../src/utils/academicRecordUtils';
import { executeQuizPointsMutation } from '../../src/components/pages/mass-input/hooks/mutations/useQuizPointsMutation';

const baseParams = {
    user: { id: 'teacher-B' } as never,
    quizInfo: { name: 'Menjawab benar', subject: 'Matematika', date: '2026-09-21', points: 1, max_points: 1 },
    activeSemester: { id: 'sem-1' },
    shouldBypassGuard: false,
    getDuplicateGuardWindowIso: () => '',
};

describe('buildQuizPointDailyKey', () => {
    it('ignores teacher, semester and letter case', () => {
        expect(buildQuizPointDailyKey({ student_id: 's1', subject: 'Matematika', quiz_name: 'Menjawab Benar ', quiz_date: '2026-09-21' }))
            .toBe(buildQuizPointDailyKey({ student_id: 's1', subject: ' matematika', quiz_name: 'menjawab benar', quiz_date: '2026-09-21' }));
    });

    it('still separates different days and subjects', () => {
        const base = { student_id: 's1', subject: 'Matematika', quiz_name: 'Menjawab benar', quiz_date: '2026-09-21' };
        expect(buildQuizPointDailyKey(base)).not.toBe(buildQuizPointDailyKey({ ...base, quiz_date: '2026-09-22' }));
        expect(buildQuizPointDailyKey(base)).not.toBe(buildQuizPointDailyKey({ ...base, subject: 'IPA' }));
    });
});

describe('executeQuizPointsMutation duplicate guard', () => {
    beforeEach(() => {
        existingRows.length = 0;
        insertedPayloads.length = 0;
    });

    it('skips a student another teacher already credited for the same activity (different case)', async () => {
        existingRows.push({ student_id: 's1', subject: 'matematika', quiz_name: 'MENJAWAB BENAR', quiz_date: '2026-09-21' });

        const message = await executeQuizPointsMutation({ ...baseParams, selectedStudentIds: new Set(['s1', 's2']) });

        const inserted = insertedPayloads[0] as Array<{ student_id: string }>;
        expect(inserted.map(r => r.student_id)).toEqual(['s2']);
        expect(message).toContain('1 data duplikat dilewati');
    });

    it('inserts nothing when every selected student already has the point', async () => {
        existingRows.push({ student_id: 's1', subject: 'Matematika', quiz_name: 'Menjawab benar', quiz_date: '2026-09-21' });

        const message = await executeQuizPointsMutation({ ...baseParams, selectedStudentIds: new Set(['s1']) });

        expect(insertedPayloads).toHaveLength(0);
        expect(message).toContain('Tidak ada poin baru');
    });
});
