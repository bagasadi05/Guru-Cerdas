import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dedupeQuizPoints, buildQuizPointIdentityKey } from '../../src/utils/academicRecordUtils';
import { calculateAspectPoints, bintangService } from '../../src/services/bintangService';
import type { QuizPointRow } from '../../src/components/pages/student/types';

// Captured supabase calls
let insertedPayloads: any[] = [];
let mockExistingRows: any[] = [];

vi.mock('../../src/services/supabase', () => {
    return {
        supabase: {
            from: vi.fn((table: string) => {
                if (table === 'quiz_points') {
                    const chain: any = {
                        select: vi.fn((_columns?: string) => chain),
                        in: vi.fn((_column: string, _values: any[]) => chain),
                        is: vi.fn((_column: string, _value: any) => chain),
                        insert: vi.fn((payload: any) => {
                            insertedPayloads = Array.isArray(payload) ? payload : [payload];
                            return {
                                select: vi.fn().mockResolvedValue({ data: insertedPayloads, error: null }),
                            };
                        }),
                        then: (resolve: (v: any) => void) => {
                            resolve({ data: mockExistingRows, error: null });
                        },
                    };
                    return chain;
                }
                return {};
            }),
        },
    };
});

describe('BINTANG & Mass Input Quiz Points Deduplication Suite', () => {
    beforeEach(() => {
        insertedPayloads = [];
        mockExistingRows = [];
        vi.clearAllMocks();
    });

    describe('1. In-batch Deduplication in bintangService.insertQuizPoints', () => {
        it('deduplicates identical student records within a single input batch', async () => {
            const rawBatch = [
                {
                    student_id: 'student-1',
                    quiz_name: 'Keaktifan Tanya Jawab',
                    subject: 'Matematika',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
                // Exact duplicate submitted simultaneously (e.g. double click)
                {
                    student_id: 'student-1',
                    quiz_name: 'Keaktifan Tanya Jawab',
                    subject: 'Matematika',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
                // Different student in same batch
                {
                    student_id: 'student-2',
                    quiz_name: 'Keaktifan Tanya Jawab',
                    subject: 'Matematika',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
            ];

            const result = await bintangService.insertQuizPoints(rawBatch as any);

            expect(insertedPayloads).toHaveLength(2);
            expect(insertedPayloads.map(p => p.student_id)).toEqual(['student-1', 'student-2']);
            expect(result).toHaveLength(2);
        });

        it('skips records that already exist in Supabase unless allowDuplicates is true', async () => {
            // Suppose student-1 already has this record in the database
            mockExistingRows = [
                {
                    student_id: 'student-1',
                    quiz_date: '2026-09-23',
                    quiz_name: 'Keaktifan Tanya Jawab',
                    subject: 'Matematika',
                    semester_id: 'sem-1',
                },
            ];

            const batch = [
                {
                    student_id: 'student-1',
                    quiz_name: 'keaktifan tanya jawab ', // different casing & trailing space
                    subject: 'matematika',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
                {
                    student_id: 'student-3',
                    quiz_name: 'Keaktifan Tanya Jawab',
                    subject: 'Matematika',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
            ];

            const result = await bintangService.insertQuizPoints(batch as any);

            // student-1 should be skipped because it already exists; only student-3 is inserted
            expect(insertedPayloads).toHaveLength(1);
            expect(insertedPayloads[0].student_id).toBe('student-3');
            expect(result).toHaveLength(1);
        });

        it('returns empty array when all payloads in batch already exist in DB', async () => {
            mockExistingRows = [
                {
                    student_id: 'student-1',
                    quiz_date: '2026-09-23',
                    quiz_name: 'Diskusi Kelompok',
                    subject: 'IPA',
                    semester_id: 'sem-1',
                },
            ];

            const batch = [
                {
                    student_id: 'student-1',
                    quiz_name: 'Diskusi Kelompok',
                    subject: 'IPA',
                    quiz_date: '2026-09-23',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    semester_id: 'sem-1',
                },
            ];

            const result = await bintangService.insertQuizPoints(batch as any);
            expect(insertedPayloads).toHaveLength(0);
            expect(result).toEqual([]);
        });
    });

    describe('2. Downstream dedupeQuizPoints Identity Matching', () => {
        it('normalizes subject and quiz_name whitespace and case in identity key', () => {
            const key1 = buildQuizPointIdentityKey({
                student_id: 's-10',
                subject: '  Matematika  ',
                quiz_name: 'Kuis Bab 1',
                quiz_date: '2026-09-23',
                semester_id: 'sem-1',
            });

            const key2 = buildQuizPointIdentityKey({
                student_id: 's-10',
                subject: 'matematika',
                quiz_name: 'kuis bab 1',
                quiz_date: '2026-09-23',
                semester_id: 'sem-1',
            });

            expect(key1).toBe(key2);
        });

        it('keeps the newest record when duplicate records exist in the database', () => {
            const records: QuizPointRow[] = [
                {
                    id: 'qp-old',
                    student_id: 's-10',
                    subject: 'Matematika',
                    quiz_name: 'Kuis Bab 1',
                    quiz_date: '2026-09-23',
                    semester_id: 'sem-1',
                    points: 5,
                    max_points: 100,
                    user_id: 'teacher-1',
                    created_at: '2026-09-23T08:00:00Z',
                } as unknown as QuizPointRow,
                {
                    id: 'qp-new',
                    student_id: 's-10',
                    subject: 'Matematika',
                    quiz_name: 'Kuis Bab 1',
                    quiz_date: '2026-09-23',
                    semester_id: 'sem-1',
                    points: 10,
                    max_points: 100,
                    user_id: 'teacher-1',
                    created_at: '2026-09-23T08:00:05Z', // 5 seconds later
                } as unknown as QuizPointRow,
            ];

            const deduped = dedupeQuizPoints(records);
            expect(deduped).toHaveLength(1);
            expect(deduped[0].id).toBe('qp-new');
            expect(deduped[0].points).toBe(10);
        });
    });

    describe('3. Score Offset Impact', () => {
        it('does not over-offset violation points when quiz points are properly deduplicated', () => {
            const violations = [
                { description: 'Terlambat masuk sekolah', points: 15 }, // Kedisiplinan: 15 pts (Grade C)
            ];

            // If duplicates occur: e.g. 5 points entered 3 times = 15 points
            const bloatedQuizPointsTotal = 15;
            const bloatedResult = calculateAspectPoints(violations, bloatedQuizPointsTotal);
            // Bloated offset wipes out all violation points completely (15 - 15 = 0 net points -> Grade A)
            expect(bloatedResult.KEDISIPLINAN.grade).toBe('A');

            // With deduplication: only 1 legitimate entry of 5 points (15 - 5 = 10 net points -> Grade B)
            const dedupedQuizPointsTotal = 5;
            const correctResult = calculateAspectPoints(violations, dedupedQuizPointsTotal);
            expect(correctResult.KEDISIPLINAN.grade).toBe('B');
        });
    });
});
