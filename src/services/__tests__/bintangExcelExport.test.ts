import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportBintangToExcel } from '../bintangExcelExport';

// Mock getExcelJS dynamic import (service switched from getXLSX to getExcelJS).
// The mock provides a minimal ExcelJS.Workbook surface used by exportBintangToExcel:
// addWorksheet → worksheet with mergeCells/getCell/addRow/getColumn, and workbook.xlsx.writeBuffer.
const { MockWorkbook, createdWorksheets } = vi.hoisted(() => {
    const createdWorksheets: any[] = [];
    const makeCell = () => ({ value: null, font: {}, alignment: {}, fill: {}, border: {} });
    const makeWorksheet = (name: string) => {
        const ws = {
            name,
            mergeCells: vi.fn(),
            getCell: vi.fn(() => makeCell()),
            addRow: vi.fn((row: any) => ({ eachCell: vi.fn(), font: {}, row })),
            getColumn: vi.fn(() => ({ width: 0 })),
        };
        createdWorksheets.push(ws);
        return ws;
    };
    const MockWorkbook = class {
        creator: string | null = null;
        addWorksheet = vi.fn((name: string) => makeWorksheet(name));
        xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) };
    };
    return { MockWorkbook, createdWorksheets };
});

vi.mock('../../utils/dynamicImports', () => ({
    getExcelJS: vi.fn().mockResolvedValue({ Workbook: MockWorkbook }),
    getXLSX: vi.fn().mockResolvedValue({}),
}));

describe('bintangExcelExport', () => {
    beforeEach(() => {
        // jsdom does not implement URL.createObjectURL / revokeObjectURL
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:fake'),
            revokeObjectURL: vi.fn(),
        });
        // Anchor click triggers jsdom's unimplemented navigation otherwise.
        // Capture the original first so non-'a' tags don't recurse into the spy.
        const originalCreateElement = document.createElement.bind(document);
        const fakeAnchor = { href: '', download: '', click: vi.fn() };
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag.toLowerCase() === 'a') return fakeAnchor as unknown as HTMLElement;
            return originalCreateElement(tag);
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('should export bintang data to excel without throwing errors', async () => {
        const options = {
            className: 'Kelas 5A',
            schoolName: 'SDIT GURU CERDAS',
            monthName: 'Juli 2026',
            academicYear: '2026/2027',
            semesterName: 'Ganjil',
            students: [
                { id: 's1', name: 'Ahmad' },
                { id: 's2', name: 'Budi' },
            ],
            violations: [
                {
                    student_id: 's1',
                    description: 'Terlambat masuk kelas',
                    points: 5,
                    date: '2026-07-10',
                    severity: 'sedang',
                    students: { name: 'Ahmad' },
                },
            ],
            quizPoints: [
                {
                    student_id: 's1',
                    quiz_name: 'Kuis Matik',
                    subject: 'Matematika',
                    points: 10,
                    category: 'Akademik',
                    quiz_date: '2026-07-12',
                },
            ],
            evaluations: [
                { student_id: 's1', is_published: true },
            ],
        };

        await expect(exportBintangToExcel(options)).resolves.not.toThrow();
    });

    it('should handle empty or missing optional fields gracefully', async () => {
        const options = {
            className: 'Kelas 1B',
            schoolName: 'SDIT GURU CERDAS',
            monthName: 'Agustus 2026',
            academicYear: '2026/2027',
            semesterName: 'Ganjil',
            students: [],
            violations: [],
            quizPoints: [],
            evaluations: [],
        };

        await expect(exportBintangToExcel(options)).resolves.not.toThrow();
    });

    it('should export bintang data including attitude map correctly', async () => {
        const attitudeMap = new Map([
            ['s1', { spiritual: 'SB', social: 'B' }],
            ['s2', { spiritual: 'B', social: 'SB' }],
        ]);

        const options = {
            className: 'Kelas 5A',
            schoolName: 'MI AL IRSYAD',
            monthName: 'September 2026',
            academicYear: '2026/2027',
            semesterName: 'Ganjil',
            students: [
                { id: 's1', name: 'Ahmad' },
                { id: 's2', name: 'Budi' },
            ],
            violations: [],
            quizPoints: [],
            evaluations: [],
            attitudeMap,
        };

        await expect(exportBintangToExcel(options)).resolves.not.toThrow();
    });

    it('includes Catatan Wali Kelas column and uses evaluated aspect grades in Rekap Kelas', async () => {
        createdWorksheets.length = 0;
        const options = {
            className: 'Kelas 6A',
            schoolName: 'SDIT GURU CERDAS',
            monthName: 'September 2026',
            academicYear: '2026/2027',
            semesterName: 'Ganjil',
            students: [{ id: 's1', name: 'Salman' }],
            violations: [
                // 15 violation points in Adab => raw calculated grade is C
                {
                    student_id: 's1',
                    description: 'Membuang sampah sembarangan',
                    points: 15,
                    date: '2026-09-05',
                    severity: 'sedang',
                    students: { name: 'Salman' },
                },
            ],
            quizPoints: [],
            evaluations: [
                // Teacher adjusted Adab to A and added custom homeroom note
                {
                    student_id: 's1',
                    is_published: true,
                    adab_score: 'A',
                    catatan_wali: 'Ananda Salman menunjukkan perbaikan adab yang sangat pesat.',
                },
            ],
        };

        await exportBintangToExcel(options);

        const rekapSheet = createdWorksheets.find((w: any) => w.name === 'Rekap Kelas');
        expect(rekapSheet).toBeDefined();

        const addRowCalls = rekapSheet.addRow.mock.calls.map((c: any[]) => c[0]);
        // Header row: 16 columns including Catatan Wali Kelas
        const headerRow = addRowCalls.find((r: any) => Array.isArray(r) && r.includes('Catatan Wali Kelas'));
        expect(headerRow).toBeDefined();
        expect(headerRow.length).toBe(16);
        expect(headerRow[15]).toBe('Catatan Wali Kelas');

        // Student row
        const studentRow = addRowCalls.find((r: any) => Array.isArray(r) && r[1] === 'Salman');
        expect(studentRow).toBeDefined();
        expect(studentRow.length).toBe(16);
        // Index 5 is Adab Grade: should reflect evaluated 'A', not calculated 'C'
        expect(studentRow[5]).toContain('A');
        // Index 15 is Catatan Wali
        expect(studentRow[15]).toBe('Ananda Salman menunjukkan perbaikan adab yang sangat pesat.');
    });
});
