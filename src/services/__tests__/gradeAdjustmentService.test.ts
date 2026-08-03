/**
 * Tests for Grade Adjustment Service
 *
 * Covers:
 * 1. calculateFormulaScore — pure math function
 * 2. analyzeAndAdjustGradesWithAI — OpenRouter AI integration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the OpenRouter service
vi.mock('../geminiService', () => ({
    generateGeminiJson: vi.fn(),
}));

import {
    calculateFormulaScore,
    analyzeAndAdjustGradesWithAI,
} from '../gradeAdjustmentService';
import { generateGeminiJson } from '../geminiService';

describe('gradeAdjustmentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================
    // FORMULA SCORE CALCULATION
    // ============================================
    describe('calculateFormulaScore', () => {
        it('should calculate formula: (score * weight) + constant', () => {
            // (80 * 0.6) + 40 = 48 + 40 = 88
            expect(calculateFormulaScore(80)).toBe(88);
        });

        it('should return rounded integer', () => {
            // (75 * 0.6) + 40 = 45 + 40 = 85
            expect(calculateFormulaScore(75)).toBe(85);
        });

        it('should clamp to maxGrade (default 100)', () => {
            // (100 * 0.6) + 40 = 60 + 40 = 100
            expect(calculateFormulaScore(100)).toBe(100);

            // Even with high scores, should not exceed 100
            expect(calculateFormulaScore(120)).toBe(120); // > 100 returns original per logic
        });

        it('should clamp to minGrade (default 0)', () => {
            // (0 * 0.6) + 40 = 40
            expect(calculateFormulaScore(0)).toBe(40);

            // Negative scores return original
            expect(calculateFormulaScore(-10)).toBe(-10);
        });

        it('should accept custom weight', () => {
            // (80 * 0.4) + 40 = 32 + 40 = 72
            expect(calculateFormulaScore(80, 0.4)).toBe(72);
        });

        it('should accept custom constant', () => {
            // (80 * 0.6) + 30 = 48 + 30 = 78
            expect(calculateFormulaScore(80, 0.6, 30)).toBe(78);
        });

        it('should accept custom min/max grade', () => {
            // (90 * 0.6) + 40 = 54 + 40 = 94, clamped to 85 max
            expect(calculateFormulaScore(90, 0.6, 40, 0, 85)).toBe(85);

            // (20 * 0.6) + 40 = 12 + 40 = 52, clamped to 60 min
            expect(calculateFormulaScore(20, 0.6, 40, 60, 100)).toBe(60);
        });

        it('should work with edge case scores near 0 and 100', () => {
            expect(calculateFormulaScore(1)).toBe(41); // (1 * 0.6) + 40 ≈ 40.6 → 41
            expect(calculateFormulaScore(99)).toBe(99); // (99 * 0.6) + 40 = 99.4 → 99
        });

        it('should round correctly (Math.round)', () => {
            // (83 * 0.6) + 40 = 49.8 + 40 = 89.8 → 90
            expect(calculateFormulaScore(83)).toBe(90);
            // (82 * 0.6) + 40 = 49.2 + 40 = 89.2 → 89
            expect(calculateFormulaScore(82)).toBe(89);
        });
    });

    // ============================================
    // AI GRADE ADJUSTMENT
    // ============================================
    describe('analyzeAndAdjustGradesWithAI', () => {
        const mockStudents = [
            { id: 's1', name: 'Ani', score: 85 },
            { id: 's2', name: 'Budi', score: 92 },
            { id: 's3', name: 'Citra', score: 45 },
        ];

        it('should process AI result and return adjustments for all students', async () => {
            (generateGeminiJson as ReturnType<typeof vi.fn>).mockResolvedValue({
                class_analysis: 'Kelas memiliki sebaran nilai yang cukup baik.',
                adjustments: [
                    {
                        student_id: 's1',
                        student_name: 'Ani',
                        original_score: 85,
                        formula_score: 91,
                        ai_score: 93,
                        rationale: 'Nilai baik ditingkatkan karena konsisten.',
                    },
                    {
                        student_id: 's2',
                        student_name: 'Budi',
                        original_score: 92,
                        formula_score: 95,
                        ai_score: 97,
                        rationale: 'Prestasi sangat baik.',
                    },
                    {
                        student_id: 's3',
                        student_name: 'Citra',
                        original_score: 45,
                        formula_score: 67,
                        ai_score: 81,
                        rationale: 'Perbaikan signifikan.',
                    },
                ],
            });

            const result = await analyzeAndAdjustGradesWithAI(
                mockStudents,
                'Matematika',
                'Ulangan Harian 1'
            );

            expect(result.class_analysis).toBeTruthy();
            expect(result.adjustments).toHaveLength(3);
            expect(result.adjustments[0].ai_score).toBe(93);
            expect(result.adjustments[1].ai_score).toBe(97);
            expect(result.adjustments[2].ai_score).toBe(81);
        });

        it('should fallback for students missing from AI response', async () => {
            (generateGeminiJson as ReturnType<typeof vi.fn>).mockResolvedValue({
                class_analysis: 'Sebaran nilai normal.',
                adjustments: [
                    {
                        student_id: 's1',
                        student_name: 'Ani',
                        original_score: 85,
                        formula_score: 91,
                        ai_score: 93,
                        rationale: 'Baik.',
                    },
                    // s2 and s3 missing
                ],
            });

            const result = await analyzeAndAdjustGradesWithAI(
                mockStudents,
                'Matematika',
                'Ulangan Harian 1'
            );

            // s1 from AI
            const s1 = result.adjustments.find(a => a.student_id === 's1');
            expect(s1?.ai_score).toBe(93);

            // s2 should use formula score as fallback
            const s2 = result.adjustments.find(a => a.student_id === 's2');
            expect(s2?.ai_score).toBe(95); // (92 * 0.6) + 40 = 95.2 → 95

            // s3 should use formula score as fallback
            const s3 = result.adjustments.find(a => a.student_id === 's3');
            expect(s3?.ai_score).toBe(81); // (45 * 0.6) + 40 = 67, clamped to min 81
        });

        it('should clamp ai_score within target range', async () => {
            (generateGeminiJson as ReturnType<typeof vi.fn>).mockResolvedValue({
                class_analysis: 'Baik.',
                adjustments: [
                    {
                        student_id: 's1',
                        student_name: 'Ani',
                        original_score: 85,
                        formula_score: 91,
                        ai_score: 110, // above max
                        rationale: 'Sangat baik.',
                    },
                    {
                        student_id: 's2',
                        student_name: 'Budi',
                        original_score: 92,
                        formula_score: 95,
                        ai_score: 50, // below min
                        rationale: 'Kurang.',
                    },
                ],
            });

            const result = await analyzeAndAdjustGradesWithAI(
                mockStudents.slice(0, 2),
                'Matematika',
                'Ulangan Harian 1',
                75,
                0.6,
                40,
                { min: 81, max: 98 }
            );

            expect(result.adjustments[0].ai_score).toBe(98); // clamped to max
            expect(result.adjustments[1].ai_score).toBe(81); // clamped to min
        });

        it('should provide clean fallback when AI call fails', async () => {
            (generateGeminiJson as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('AI service unavailable')
            );

            const result = await analyzeAndAdjustGradesWithAI(
                mockStudents,
                'Matematika',
                'Ulangan Harian 1'
            );

            expect(result.class_analysis).toContain('default');
            expect(result.adjustments).toHaveLength(3);
            // All should use formula score as fallback
            result.adjustments.forEach(a => {
                expect(a.ai_score).toBe(a.formula_score);
                expect(a.rationale).toContain('default');
            });
        });

        it('should handle empty students array', async () => {
            (generateGeminiJson as ReturnType<typeof vi.fn>).mockResolvedValue({
                class_analysis: 'Tidak ada data.',
                adjustments: [],
            });

            const result = await analyzeAndAdjustGradesWithAI(
                [],
                'Matematika',
                'Ulangan Harian 1'
            );

            expect(result.adjustments).toHaveLength(0);
        });
    });
});
