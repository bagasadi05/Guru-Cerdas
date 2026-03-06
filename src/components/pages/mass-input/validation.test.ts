import { describe, expect, it } from 'vitest';
import { getSemesterValidationError, normalizeAiScore } from './validation';

describe('mass input validation', () => {
    describe('getSemesterValidationError', () => {
        it('returns error for subject grade without semester', () => {
            expect(getSemesterValidationError('subject_grade', '', 'sem-1')).toBe(
                'Pilih semester terlebih dahulu sebelum menyimpan nilai.'
            );
        });

        it('returns error for quiz without active semester', () => {
            expect(getSemesterValidationError('quiz', 'sem-1', undefined)).toBe(
                'Semester aktif tidak ditemukan. Atur semester aktif terlebih dahulu.'
            );
        });

        it('returns empty string when semester requirement is fulfilled', () => {
            expect(getSemesterValidationError('violation', '', 'sem-1')).toBe('');
            expect(getSemesterValidationError('subject_grade', 'sem-1', 'sem-1')).toBe('');
        });
    });

    describe('normalizeAiScore', () => {
        it('normalizes valid score values', () => {
            expect(normalizeAiScore('88')).toBe('88');
            expect(normalizeAiScore(' 88,5 ')).toBe('88.5');
            expect(normalizeAiScore(100)).toBe('100');
        });

        it('returns null for invalid score values', () => {
            expect(normalizeAiScore('')).toBeNull();
            expect(normalizeAiScore('-1')).toBeNull();
            expect(normalizeAiScore('101')).toBeNull();
            expect(normalizeAiScore('nilai bagus')).toBeNull();
            expect(normalizeAiScore(null)).toBeNull();
        });
    });
});
