import { describe, it, expect, vi } from 'vitest';
import { exportBintangToExcel } from '../bintangExcelExport';

// Mock getXLSX dynamic import
vi.mock('../../utils/dynamicImports', () => ({
    getXLSX: vi.fn().mockResolvedValue({
        utils: {
            book_new: () => ({ SheetNames: [], Sheets: {} }),
            book_append_sheet: vi.fn(),
            aoa_to_sheet: vi.fn().mockReturnValue({}),
        },
        writeFile: vi.fn().mockResolvedValue(undefined),
    }),
}));

describe('bintangExcelExport', () => {
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
