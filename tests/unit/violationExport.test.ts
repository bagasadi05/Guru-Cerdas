import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportViolationsToPDF, exportViolationsToExcel } from '../../src/services/violationExport';
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
            user_id: 'u1'
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

    it('should call xlsx to export Excel', async () => {
        await exportViolationsToExcel(mockOptions);
        expect(mockXLSX.utils.book_new).toHaveBeenCalled();
        expect(mockXLSX.utils.aoa_to_sheet).toHaveBeenCalled();
        expect(mockXLSX.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('.xlsx'));
    });
});
