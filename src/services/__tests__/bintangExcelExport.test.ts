import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportBintangToExcel } from '../bintangExcelExport';

// Mock getExcelJS dynamic import (service switched from getXLSX to getExcelJS).
// The mock provides a minimal ExcelJS.Workbook surface used by exportBintangToExcel:
// addWorksheet → worksheet with mergeCells/getCell/addRow/getColumn, and workbook.xlsx.writeBuffer.
const { MockWorkbook } = vi.hoisted(() => {
    const makeCell = () => ({ value: null, font: {}, alignment: {}, fill: {}, border: {} });
    const makeWorksheet = () => ({
        mergeCells: vi.fn(),
        getCell: vi.fn(() => makeCell()),
        addRow: vi.fn(() => ({ eachCell: vi.fn(), font: {} })),
        getColumn: vi.fn(() => ({ width: 0 })),
    });
    const MockWorkbook = class {
        creator: string | null = null;
        addWorksheet = vi.fn(() => makeWorksheet());
        xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) };
    };
    return { MockWorkbook };
});

vi.mock('../../utils/dynamicImports', () => ({
    getExcelJS: vi.fn().mockResolvedValue({ Workbook: MockWorkbook }),
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
});
