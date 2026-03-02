import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToExcel } from '../../src/utils/exportUtils';

// Mock dynamic imports module
const mockXLSX = {
    utils: {
        book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
        json_to_sheet: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
};

vi.mock('../../src/utils/dynamicImports', () => ({
    getXLSX: vi.fn(() => Promise.resolve(mockXLSX)),
}));

describe('exportToExcel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should export data to excel successfully', async () => {
        const data = [
            { name: 'John Doe', age: 30 },
            { name: 'Jane Doe', age: 25 },
        ];
        const fileName = 'test-export';
        const sheetName = 'TestSheet';

        await exportToExcel(data, fileName, sheetName);

        expect(mockXLSX.utils.book_new).toHaveBeenCalled();
        expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
        expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), sheetName);
        expect(mockXLSX.writeFile).toHaveBeenCalledWith(expect.anything(), `${fileName}.xlsx`);
    });

    it('should use default sheet name if not provided', async () => {
        const data = [{ name: 'John' }];
        const fileName = 'test';

        await exportToExcel(data, fileName);

        expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Sheet1');
    });

    it('should warn and not export if data is empty', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        await exportToExcel([], 'test');

        expect(consoleSpy).toHaveBeenCalledWith('No data to export');
        expect(mockXLSX.utils.book_new).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should warn and not export if data is null/undefined', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // @ts-expect-error - Testing invalid input
        await exportToExcel(null, 'test');

        expect(consoleSpy).toHaveBeenCalledWith('No data to export');
        expect(mockXLSX.utils.book_new).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
