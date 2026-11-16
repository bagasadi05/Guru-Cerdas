import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportViolationsToPDF, exportViolationsToExcel, exportBulkViolationsToExcel } from '../../src/services/violationExport';
import { ViolationRow } from '../../src/components/pages/student/types';

// Track calls for assertions
const pdfCalls = {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
};

// Create jsPDF as a proper class mock
class MockJsPDF {
    internal = {
        pageSize: {
            getWidth: () => 210,
            getHeight: () => 297,
        },
    };
    lastAutoTable = { finalY: 100 };
    
    setFontSize = pdfCalls.setFontSize;
    setFont = pdfCalls.setFont;
    text = pdfCalls.text;
    save = pdfCalls.save;
    line = vi.fn();
    addImage = vi.fn();
}

// Mock XLSX
const mockXLSX = {
    utils: {
        book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
        aoa_to_sheet: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
};

// Mock autoTable
const mockAutoTable = vi.fn();

// Mock dynamicImports module
vi.mock('../../src/utils/dynamicImports', () => ({
    getJsPDF: vi.fn(() => Promise.resolve({ default: MockJsPDF })),
    getAutoTable: vi.fn(() => Promise.resolve({ default: mockAutoTable })),
    getXLSX: vi.fn(() => Promise.resolve(mockXLSX)),
    getExcelJS: vi.fn(() => Promise.resolve({ Workbook: class {} })),
}));

// Mock pdfHeaderUtils
vi.mock('../../src/utils/pdfHeaderUtils', () => ({
    addPdfHeader: vi.fn(() => 30),
    ensureLogosLoaded: vi.fn(() => Promise.resolve()),
}));

describe('violationExport Service', () => {
    const mockViolations: ViolationRow[] = [
        {
            id: '1',
            student_id: 's1',
            date: '2025-01-01',
            description: 'Late',
            points: 5,
            severity: 'ringan',
            follow_up_status: 'pending',
            evidence_url: null,
            created_at: '2025-01-01',
            follow_up_notes: null,
            parent_notified: false,
            parent_notified_at: null,
            user_id: 'u1',
            context_notes: 'Terlambat karena ban bocor'
        }
    ];

    const mockOptions = {
        studentName: 'Budi',
        schoolName: 'SMP 1',
        className: '7A',
        violations: mockViolations
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call jsPDF to export PDF', async () => {
        await exportViolationsToPDF(mockOptions);
        // Verify the PDF methods were called
        expect(pdfCalls.setFontSize).toHaveBeenCalled();
        expect(pdfCalls.setFont).toHaveBeenCalled();
        expect(pdfCalls.text).toHaveBeenCalled();
    });

    it('should include Keterangan column in PDF export', async () => {
        await exportViolationsToPDF(mockOptions);
        expect(mockAutoTable).toHaveBeenCalled();
        const tableConfig = mockAutoTable.mock.calls[0][1];
        expect(tableConfig.head[0]).toContain('Keterangan');
        expect(tableConfig.body[0]).toContain('Terlambat karena ban bocor');
    });

    it('should call xlsx to export Excel', async () => {
        await exportViolationsToExcel(mockOptions);
        expect(mockXLSX.utils.book_new).toHaveBeenCalled();
        expect(mockXLSX.utils.aoa_to_sheet).toHaveBeenCalled();
        expect(mockXLSX.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('.xlsx'));
    });

    it('sanitizes sheet names and aligns 8-column merges/widths in bulk Excel export', async () => {
        const sheets: Record<string, unknown>[] = [];
        mockXLSX.utils.aoa_to_sheet.mockImplementation(() => {
            const ws: Record<string, unknown> = {};
            sheets.push(ws);
            return ws;
        });

        await exportBulkViolationsToExcel({
            className: 'Kelas 4A',
            schoolName: 'SDN 1',
            violations: [
                { ...mockViolations[0], id: 'v1', student_id: 's1' },
                { ...mockViolations[0], id: 'v2', student_id: 's2' },
            ],
            students: [
                { id: 's1', name: 'A/B:C?D*E[F]' },
                { id: 's2', name: 'A/B:C?D*E[F]' },
            ],
        });

        expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);
        const firstSheetName = mockXLSX.utils.book_append_sheet.mock.calls[0][2] as string;
        const secondSheetName = mockXLSX.utils.book_append_sheet.mock.calls[1][2] as string;
        expect(firstSheetName).not.toMatch(/[:\\/?*[\]]/);
        expect(firstSheetName.length).toBeLessThanOrEqual(31);
        expect(secondSheetName.length).toBeLessThanOrEqual(31);

        const ws = sheets[0] as { '!merges': { e: { c: number } }[]; '!cols': unknown[] };
        expect(ws['!cols']).toHaveLength(8);
        expect(ws['!merges'][0].e.c).toBe(7);
    });
});