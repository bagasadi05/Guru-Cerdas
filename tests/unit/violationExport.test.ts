
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportViolationsToPDF, exportViolationsToExcel } from '../../src/services/violationExport';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { ViolationRow } from '../../src/components/pages/student/types';

vi.mock('jspdf', () => {
    const jsPDFInstance = {
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        save: vi.fn(),
        lastAutoTable: { finalY: 100 }
    };
    const jsPDFMock = vi.fn(() => jsPDFInstance);

    return {
        default: jsPDFMock,
        jsPDF: jsPDFMock
    };
});

vi.mock('jspdf-autotable', () => ({
    default: vi.fn(),
}));

vi.mock('xlsx', () => ({
    utils: {
        book_new: vi.fn(() => ({})),
        aoa_to_sheet: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
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

    it('should call jsPDF to export PDF', () => {
        exportViolationsToPDF(mockOptions);
        expect(jsPDF).toHaveBeenCalled();
        // We can't easily check the instance methods without deeper mocking, 
        // but verifying the constructor call confirms the function ran.
    });

    it('should call xlsx to export Excel', () => {
        exportViolationsToExcel(mockOptions);
        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
        expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('.xlsx'));
    });
});
