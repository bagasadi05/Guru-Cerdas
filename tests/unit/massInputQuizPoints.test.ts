import { describe, it, expect } from 'vitest';
import {
    QUIZ_ACTIVITY_CATEGORIES,
    QUIZ_CATEGORY_DEFAULT_NAMES,
    QUIZ_ACTIVITY_SUGGESTIONS,
} from '../../src/components/pages/mass-input/constants';
import { dedupeQuizPoints, buildQuizPointIdentityKey } from '../../src/utils/academicRecordUtils';

describe('Mass Input Quiz Points - Categories and Suggestions', () => {
    it('defines the standard activity categories matching BINTANG system', () => {
        const categoryValues = QUIZ_ACTIVITY_CATEGORIES.map(c => c.value);
        expect(categoryValues).toEqual([
            'bertanya',
            'menjawab',
            'presentasi',
            'diskusi',
            'tugas_tambahan',
            'lainnya',
        ]);

        QUIZ_ACTIVITY_CATEGORIES.forEach(cat => {
            expect(cat.icon).toBeTruthy();
            expect(cat.label).toBeTruthy();
        });
    });

    it('provides meaningful default activity descriptions for all categories', () => {
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.bertanya).toBe('Aktif bertanya di kelas');
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.menjawab).toBe('Menjawab pertanyaan guru');
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.presentasi).toBe('Presentasi tugas');
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.diskusi).toBe('Aktif dalam diskusi');
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.tugas_tambahan).toBe('Mengerjakan tugas tambahan');
        expect(QUIZ_CATEGORY_DEFAULT_NAMES.lainnya).toBe('Partisipasi aktif');
    });

    it('provides dynamic contextual suggestions for each category', () => {
        expect(QUIZ_ACTIVITY_SUGGESTIONS.bertanya).toContain('Aktif bertanya di kelas');
        expect(QUIZ_ACTIVITY_SUGGESTIONS.menjawab).toContain('Menjawab pertanyaan guru');
        expect(QUIZ_ACTIVITY_SUGGESTIONS.presentasi).toContain('Presentasi tugas kelompok');
        expect(QUIZ_ACTIVITY_SUGGESTIONS.diskusi).toContain('Aktif dalam diskusi kelompok');
        expect(QUIZ_ACTIVITY_SUGGESTIONS.tugas_tambahan).toContain('Mengerjakan soal tambahan');
        expect(QUIZ_ACTIVITY_SUGGESTIONS.lainnya).toContain('Partisipasi aktif');

        Object.keys(QUIZ_ACTIVITY_SUGGESTIONS).forEach(key => {
            expect(QUIZ_ACTIVITY_SUGGESTIONS[key].length).toBeGreaterThanOrEqual(3);
        });
    });
});

describe('Mass Input Quiz Points - Deduplication Logic', () => {
    it('generates consistent identity key for quiz point records', () => {
        const key1 = buildQuizPointIdentityKey({
            student_id: 'std-1',
            subject: 'Matematika',
            quiz_name: 'Bertanya di kelas',
            quiz_date: '2026-09-15',
            semester_id: 'sem-1',
            user_id: 'teacher-1',
        });
        const key2 = buildQuizPointIdentityKey({
            student_id: 'std-1',
            subject: ' matematika ',
            quiz_name: 'bertanya di kelas',
            quiz_date: '2026-09-15',
            semester_id: 'sem-1',
            user_id: 'teacher-1',
        });
        expect(key1).toBe(key2);
    });

    it('dedupes quiz point records and keeps the latest created record', () => {
        const records = [
            {
                id: 'qp-1',
                student_id: 'std-1',
                subject: 'Matematika',
                quiz_name: 'Bertanya di kelas',
                quiz_date: '2026-09-15',
                semester_id: 'sem-1',
                user_id: 'teacher-1',
                points: 1,
                max_points: 1,
                created_at: '2026-09-15T08:00:00.000Z',
            },
            {
                id: 'qp-2',
                student_id: 'std-1',
                subject: 'Matematika',
                quiz_name: 'Bertanya di kelas',
                quiz_date: '2026-09-15',
                semester_id: 'sem-1',
                user_id: 'teacher-1',
                points: 1,
                max_points: 1,
                created_at: '2026-09-15T09:00:00.000Z',
            },
            {
                id: 'qp-3',
                student_id: 'std-2',
                subject: 'Matematika',
                quiz_name: 'Menjawab pertanyaan',
                quiz_date: '2026-09-15',
                semester_id: 'sem-1',
                user_id: 'teacher-1',
                points: 1,
                max_points: 1,
                created_at: '2026-09-15T08:30:00.000Z',
            },
        ];

        const deduped = dedupeQuizPoints(records);
        expect(deduped).toHaveLength(2);
        const std1Record = deduped.find(r => r.student_id === 'std-1');
        expect(std1Record?.id).toBe('qp-2');
    });
});
