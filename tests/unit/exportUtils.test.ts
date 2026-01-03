import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToExcel } from '../../src/utils/exportUtils';
import * as XLSX from 'xlsx';

// Mock the xlsx module
vi.mock('xlsx', () => {
    return {
        utils: {
            book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
            json_to_sheet: vi.fn(() => ({})),
            book_append_sheet: vi.fn(),
        },
        writeFile: vi.fn(),
    };
});

describe('exportToExcel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should export data to excel successfully', () => {
        const data = [
            { name: 'John Doe', age: 30 },
            { name: 'Jane Doe', age: 25 },
        ];
        const fileName = 'test-export';
        const sheetName = 'TestSheet';

        exportToExcel(data, fileName, sheetName);

        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), sheetName);
        expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), `${fileName}.xlsx`);
    });

    it('should use default sheet name if not provided', () => {
        const data = [{ name: 'John' }];
        const fileName = 'test';

        exportToExcel(data, fileName);

        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Sheet1');
    });

    it('should warn and not export if data is empty', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        exportToExcel([], 'test');

        expect(consoleSpy).toHaveBeenCalledWith('No data to export');
        expect(XLSX.utils.book_new).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should warn and not export if data is null/undefined', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // @ts-expect-error - Testing invalid input
        exportToExcel(null, 'test');

        expect(consoleSpy).toHaveBeenCalledWith('No data to export');
        expect(XLSX.utils.book_new).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
