import { describe, it, expect } from 'vitest';
import { findStudentMatch } from '../../src/utils/studentMatcher';
import { utils, WorksheetShim } from '../../src/utils/xlsxShim';

describe('Excel Import & Validation Tests', () => {
    describe('Student Matcher (Fuzzy & Token overlap)', () => {
        const students = [
            { id: '1', name: 'Ahmad Fauzi' },
            { id: '2', name: 'Budi Utomo' },
            { id: '3', name: 'Muhammad Fachri' },
            { id: '4', name: 'Dewi Lestari' }
        ];

        it('should find exact matches', () => {
            const result = findStudentMatch('Ahmad Fauzi', students);
            expect(result.studentId).toBe('1');
            expect(result.method).toBe('exact');
            expect(result.confidence).toBe(100);
        });

        it('should match with different casing and spaces', () => {
            const result = findStudentMatch('  ahmad   fauzi  ', students);
            expect(result.studentId).toBe('1');
            expect(result.method).toBe('exact');
        });

        it('should find partial matches', () => {
            const result = findStudentMatch('Ahmad', students);
            expect(result.studentId).toBe('1');
            expect(result.method).toBe('partial');
            expect(result.confidence).toBe(85);
        });

        it('should match fuzzy name with abbreviation', () => {
            // M. Fachri should match Muhammad Fachri via token overlap
            const result = findStudentMatch('M. Fachri', students);
            expect(result.studentId).toBe('3');
            expect(result.method).toBe('token');
            expect(result.confidence).toBeGreaterThanOrEqual(75);
        });

        it('should return none when no match is found', () => {
            const result = findStudentMatch('Zulkifli', students);
            expect(result.studentId).toBe('');
            expect(result.method).toBe('none');
            expect(result.confidence).toBe(0);
        });
    });

    describe('xlsxShim blankrows filter', () => {
        it('should filter out blank rows if blankrows is false', () => {
            const ws = new WorksheetShim();
            ws.rows = [
                ['No', 'Nama Siswa', 'Nilai'],
                ['', '', ''], // empty row
                [1, 'Budi', 85],
                [undefined, null, ''], // empty row
                [2, 'Dewi', 90]
            ];

            const result = utils.sheet_to_json(ws, { header: 1, blankrows: false });
            expect(result.length).toBe(3);
            expect(result[0]).toEqual(['No', 'Nama Siswa', 'Nilai']);
            expect(result[1]).toEqual([1, 'Budi', 85]);
            expect(result[2]).toEqual([2, 'Dewi', 90]);
        });

        it('should keep blank rows if blankrows is not false', () => {
            const ws = new WorksheetShim();
            ws.rows = [
                ['No', 'Nama Siswa', 'Nilai'],
                ['', '', ''],
                [1, 'Budi', 85]
            ];

            const result = utils.sheet_to_json(ws, { header: 1 });
            expect(result.length).toBe(3);
        });
    });
});
