import { describe, expect, it } from 'vitest';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../src/utils/academicRecordUtils';
import type { AcademicRecordRow, QuizPointRow, ViolationRow } from '../../src/components/pages/student/types';

describe('academicRecordUtils', () => {
    it('keeps only the latest row for the same logical assessment record', () => {
        const records = [
            {
                id: 'old-row',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Informatika',
                assessment_name: 'PH 6',
                score: 59,
                notes: '',
                semester_id: 'semester-2',
                created_at: '2026-04-20T07:00:00.000Z',
                version: 1,
            },
            {
                id: 'new-row',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Informatika',
                assessment_name: 'PH 6',
                score: 61,
                notes: '',
                semester_id: 'semester-2',
                created_at: '2026-04-20T08:00:00.000Z',
                version: 2,
            },
            {
                id: 'other-assessment',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Informatika',
                assessment_name: 'PH 5',
                score: 63,
                notes: '',
                semester_id: 'semester-2',
                created_at: '2026-03-05T08:00:00.000Z',
                version: 1,
            },
        ] as AcademicRecordRow[];

        expect(dedupeAcademicRecords(records).map((record) => record.id)).toEqual([
            'new-row',
            'other-assessment',
        ]);
    });

    it('keeps only the latest identical quiz point record per student activity', () => {
        const records = [
            {
                id: 'quiz-old',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Bahasa Indonesia',
                quiz_name: 'Mengerjakan tugas tambahan',
                quiz_date: '2026-04-01',
                semester_id: 'semester-2',
                points: 1,
                max_points: 1,
                created_at: '2026-04-01T06:45:30.000Z',
            },
            {
                id: 'quiz-new',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Bahasa Indonesia',
                quiz_name: 'Mengerjakan tugas tambahan',
                quiz_date: '2026-04-01',
                semester_id: 'semester-2',
                points: 1,
                max_points: 1,
                created_at: '2026-04-01T06:45:32.000Z',
            },
            {
                id: 'quiz-other',
                student_id: 'student-1',
                user_id: 'teacher-1',
                subject: 'Bahasa Indonesia',
                quiz_name: 'Presentasi',
                quiz_date: '2026-04-01',
                semester_id: 'semester-2',
                points: 1,
                max_points: 1,
                created_at: '2026-04-01T07:00:00.000Z',
            },
        ] as QuizPointRow[];

        expect(dedupeQuizPoints(records).map((record) => record.id)).toEqual([
            'quiz-new',
            'quiz-other',
        ]);
    });

    it('keeps only the latest identical violation record for the same day', () => {
        const records = [
            {
                id: 'violation-old',
                student_id: 'student-1',
                user_id: 'teacher-1',
                date: '2026-02-02',
                description: 'Tanpa atribut sekolah',
                points: 3,
                type: '02',
                semester_id: 'semester-2',
                created_at: '2026-02-02T02:48:53.000Z',
            },
            {
                id: 'violation-new',
                student_id: 'student-1',
                user_id: 'teacher-1',
                date: '2026-02-02',
                description: 'Tanpa atribut sekolah',
                points: 3,
                type: '02',
                semester_id: 'semester-2',
                created_at: '2026-02-02T02:56:22.000Z',
            },
            {
                id: 'violation-other',
                student_id: 'student-1',
                user_id: 'teacher-1',
                date: '2026-02-03',
                description: 'Terlambat',
                points: 2,
                type: '01',
                semester_id: 'semester-2',
                created_at: '2026-02-03T02:56:22.000Z',
            },
        ] as ViolationRow[];

        expect(dedupeViolations(records).map((record) => record.id)).toEqual([
            'violation-new',
            'violation-other',
        ]);
    });
});
