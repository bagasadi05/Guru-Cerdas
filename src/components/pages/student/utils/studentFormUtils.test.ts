import { describe, expect, it } from 'vitest';
import { isStudentNameValid, normalizeStudentName } from './studentFormUtils';

describe('studentFormUtils', () => {
    it('normalizes student name by trimming and collapsing spaces', () => {
        expect(normalizeStudentName('  Siti   Nurhaliza  ')).toBe('Siti Nurhaliza');
    });

    it('validates student name correctly', () => {
        expect(isStudentNameValid('Budi')).toBe(true);
        expect(isStudentNameValid('   ')).toBe(false);
    });
});
