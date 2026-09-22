import { describe, it, expect, vi } from 'vitest';
import {
    dedupeViolations,
    dedupeQuizPoints,
    buildViolationIdentityKey,
} from '../../src/utils/academicRecordUtils';
import { calculateAspectPoints, bintangService } from '../../src/services/bintangService';
import type { ViolationRow } from '../../src/components/pages/student/types';

describe('BINTANG Violation Deduplication & Diagnosis Suite', () => {

    describe('1. Logical Violation Identity & Deduplication', () => {
        it('should build identity key based on student_id, normalized description, and date (independent of teacher)', () => {
            const vi1 = {
                student_id: 'student-1',
                description: 'Terlambat Masuk Sekolah ',
                date: '2026-09-22',
                user_id: 'teacher-A',
                points: 5,
                type: '01',
                semester_id: 'sem-1',
            };
            const vi2 = {
                student_id: 'student-1',
                description: 'terlambat masuk sekolah',
                date: '2026-09-22',
                user_id: 'teacher-B',
                points: 5,
                type: '01',
                semester_id: 'sem-1',
            };

            expect(buildViolationIdentityKey(vi1 as unknown as ViolationRow)).toBe(buildViolationIdentityKey(vi2 as unknown as ViolationRow));
        });

        it('should deduplicate multiple violation records on the same day for the same student across different teachers', () => {
            const records = [
                {
                    id: 'vio-picket',
                    student_id: 'student-1',
                    user_id: 'teacher-picket',
                    date: '2026-09-22',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    created_at: '2026-09-22T07:15:00.000Z',
                },
                {
                    id: 'vio-walas',
                    student_id: 'student-1',
                    user_id: 'teacher-walas',
                    date: '2026-09-22',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    created_at: '2026-09-22T07:30:00.000Z',
                },
                {
                    id: 'vio-diff-date',
                    student_id: 'student-1',
                    user_id: 'teacher-picket',
                    date: '2026-09-23',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    created_at: '2026-09-23T07:15:00.000Z',
                },
            ] as unknown as ViolationRow[];

            const deduped = dedupeViolations(records);
            expect(deduped).toHaveLength(2);
            // On 2026-09-22, keep the latest created_at ('vio-walas')
            const sept22 = deduped.find(v => v.date === '2026-09-22');
            expect(sept22?.id).toBe('vio-walas');
            expect(deduped.map(v => v.id)).toContain('vio-diff-date');
        });

        it('should handle missing created_at without crashing or NaN', () => {
            const records = [
                {
                    id: 'vio-1',
                    student_id: 'student-1',
                    date: '2026-09-22',
                    description: 'Rambut tidak rapi',
                    points: 3,
                },
                {
                    id: 'vio-2',
                    student_id: 'student-1',
                    date: '2026-09-22',
                    description: 'Rambut tidak rapi',
                    points: 3,
                },
            ] as unknown as ViolationRow[];

            const deduped = dedupeViolations(records);
            expect(deduped).toHaveLength(1);
        });

        it('deduplicates quiz points across different teachers for the same student activity and date', () => {
            const quizList = [
                {
                    id: 'qp-1',
                    student_id: 'student-1',
                    subject: 'Tahfidz',
                    quiz_name: 'Hafalan Surat An-Naba',
                    quiz_date: '2026-09-22',
                    points: 5,
                    user_id: 'teacher-A',
                    created_at: '2026-09-22T08:00:00.000Z',
                },
                {
                    id: 'qp-2',
                    student_id: 'student-1',
                    subject: 'Tahfidz',
                    quiz_name: 'Hafalan Surat An-Naba',
                    quiz_date: '2026-09-22',
                    points: 5,
                    user_id: 'teacher-B',
                    created_at: '2026-09-22T08:05:00.000Z',
                },
            ];

            const deduped = dedupeQuizPoints(quizList);
            expect(deduped).toHaveLength(1);
            expect(deduped[0].id).toBe('qp-2');
        });
    });

    describe('2. Score Impact of Deduplication', () => {
        it('prevents false grade degradation when identical violations are deduplicated', () => {
            // Raw violations duplicated 3 times due to concurrent submit
            const duplicatedViolations = [
                { description: 'Terlambat masuk sekolah', points: 5 },
                { description: 'Terlambat masuk sekolah', points: 5 },
                { description: 'Terlambat masuk sekolah', points: 5 },
            ];

            // If not deduplicated: 15 points -> Grade C
            const rawScore = calculateAspectPoints(duplicatedViolations);
            expect(rawScore.KEDISIPLINAN.points).toBe(15);
            expect(rawScore.KEDISIPLINAN.grade).toBe('C');

            // When deduplicated: 5 points -> Grade B
            const singleViolation = [{ description: 'Terlambat masuk sekolah', points: 5 }];
            const dedupedScore = calculateAspectPoints(singleViolation);
            expect(dedupedScore.KEDISIPLINAN.points).toBe(5);
            expect(dedupedScore.KEDISIPLINAN.grade).toBe('B');
        });
    });

    describe('3. bulkInsertViolations Payload Sanitization', () => {
        it('filters out duplicated student records within the same batch payload', async () => {
            const spy = vi.spyOn(bintangService, 'bulkInsertViolations');

            const batch = [
                {
                    student_id: 'student-1',
                    date: '2026-09-22',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    user_id: 'teacher-1',
                },
                {
                    student_id: 'student-1',
                    date: '2026-09-22',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    user_id: 'teacher-1',
                },
                {
                    student_id: 'student-2',
                    date: '2026-09-22',
                    description: 'Terlambat masuk sekolah',
                    points: 5,
                    user_id: 'teacher-1',
                },
            ];

            await bintangService.bulkInsertViolations(batch as unknown as Parameters<typeof bintangService.bulkInsertViolations>[0]);

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
});
