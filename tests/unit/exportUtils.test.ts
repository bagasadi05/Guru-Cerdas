import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToExcel, exportAttendanceToExcel, exportSemesterAttendanceToExcel } from '../../src/utils/exportUtils';

// Mock dynamic imports module
const mockXLSX = {
    utils: {
        book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
        json_to_sheet: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
};

// Mock getExcelJS (ExcelJS) — used by exportAttendanceToExcel.
// Minimal surface: Workbook with addWorksheet → worksheet (mergeCells/getCell/addRow/getRow/getColumn),
// and workbook.xlsx.writeBuffer. Includes a registry so tests can assert on the created workbook.
const { MockWorkbook, workbookInstances } = vi.hoisted(() => {
    const makeCell = () => ({ value: null, font: {}, alignment: {}, fill: {}, border: {} });
    const makeRow = () => ({
        getCell: vi.fn(() => makeCell()),
        eachCell: vi.fn(),
        values: [],
    });
    const makeWorksheet = () => ({
        mergeCells: vi.fn(),
        getCell: vi.fn(() => makeCell()),
        addRow: vi.fn(() => makeRow()),
        getRow: vi.fn(() => makeRow()),
        getColumn: vi.fn(() => ({ width: 0 })),
        views: [],
    });
    const workbookInstances: { creator: string | null; addWorksheet: ReturnType<typeof vi.fn>; xlsx: { writeBuffer: ReturnType<typeof vi.fn> } }[] = [];
    const MockWorkbook = class {
        creator: string | null = null;
        addWorksheet = vi.fn(() => makeWorksheet());
        xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) };
        constructor() {
            workbookInstances.push(this);
        }
    };
    return { MockWorkbook, workbookInstances };
});

vi.mock('../../src/utils/dynamicImports', () => ({
    getXLSX: vi.fn(() => Promise.resolve(mockXLSX)),
    getExcelJS: vi.fn(() => Promise.resolve({ Workbook: MockWorkbook })),
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

        await exportToExcel(null as unknown as never[], 'test');

        expect(consoleSpy).toHaveBeenCalledWith('No data to export');
        expect(mockXLSX.utils.book_new).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

describe('exportAttendanceToExcel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workbookInstances.length = 0;

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
        workbookInstances.length = 0;
    });

    it('should export attendance data to excel without throwing (uses getExcelJS)', async () => {
        const classesData = [{ name: '5A', teacherName: 'Bagas Riyadi, S.Pd', students: [{ id: 's1', name: 'Ahmad' }] }];
        const attendanceData = [
            { student_id: 's1', date: '2026-07-01', status: 'Hadir' },
            { student_id: 's1', date: '2026-07-02', status: 'Sakit' },
        ];

        await expect(
            exportAttendanceToExcel(classesData, attendanceData, 'Juli', 2026, 7, 31, 'attendance-5A-juli-2026')
        ).resolves.not.toThrow();

        // ExcelJS path exercised: workbook created + worksheet added + buffer written
        expect(workbookInstances).toHaveLength(1);
        expect(workbookInstances[0].creator).toBe('MI AL IRSYAD KOTA MADIUN');
        expect(workbookInstances[0].addWorksheet).toHaveBeenCalledWith('5A');
        expect(workbookInstances[0].xlsx.writeBuffer).toHaveBeenCalled();
    });

    it('should handle empty class list gracefully', async () => {
        await expect(
            exportAttendanceToExcel([], [], 'Juli', 2026, 7, 31, 'empty')
        ).resolves.not.toThrow();

        expect(workbookInstances).toHaveLength(1);
        expect(workbookInstances[0].addWorksheet).not.toHaveBeenCalled();
        expect(workbookInstances[0].xlsx.writeBuffer).toHaveBeenCalled();
    });
});

describe('exportSemesterAttendanceToExcel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workbookInstances.length = 0;

        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:fake'),
            revokeObjectURL: vi.fn(),
        });
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
        workbookInstances.length = 0;
    });

    it('should export semester attendance data to excel with teacher signature', async () => {
        const classesData = [{ name: '4B', teacherName: 'Irene Saraswaty, S.S', students: [{ id: 's1', name: 'Zahra' }] }];
        const attendanceData = [
            { student_id: 's1', date: '2026-08-01', status: 'Hadir' },
        ];

        await expect(
            exportSemesterAttendanceToExcel(classesData, attendanceData, 'Ganjil 2026/2027', 'semester-4B')
        ).resolves.not.toThrow();

        expect(workbookInstances).toHaveLength(1);
        expect(workbookInstances[0].addWorksheet).toHaveBeenCalledWith('4B');
        expect(workbookInstances[0].xlsx.writeBuffer).toHaveBeenCalled();
    });
});
