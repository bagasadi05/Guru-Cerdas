import { describe, it, expect, vi } from 'vitest';
import * as facade from '../../src/components/pages/extracurricular/services/extracurricularExportService';
import * as exportModule from '../../src/components/pages/extracurricular/services/export';
import type { Extracurricular, EnrollmentView } from '../../src/components/pages/extracurricular/types';

vi.mock('../../src/utils/dynamicImports', () => {
    const saveMock = vi.fn();
    const docMock = {
        internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 }, pages: ['1', '2'] },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        text: vi.fn(),
        save: saveMock,
    };

    function MockJsPDF() {
        return docMock;
    }

    function MockWorkbook() {
        const mockRow = {
            font: {},
            alignment: {},
            fill: {},
            border: {},
            height: 20,
            eachCell: vi.fn(),
        };
        return {
            creator: '',
            addWorksheet: vi.fn().mockReturnValue({
                views: [],
                columns: [],
                addRow: vi.fn().mockReturnValue(mockRow),
                getRow: vi.fn().mockReturnValue(mockRow),
                getColumn: vi.fn().mockReturnValue({ width: 10 }),
                mergeCells: vi.fn(),
                getCell: vi.fn().mockReturnValue({
                    font: {},
                    alignment: {},
                    fill: {},
                    border: {},
                }),
            }),
            xlsx: {
                writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
            },
        };
    }

    return {
        getJsPDF: vi.fn().mockResolvedValue({
            default: MockJsPDF,
        }),
        getAutoTable: vi.fn().mockResolvedValue({
            default: vi.fn((_doc, opts) => {
                if (opts?.didDrawPage) opts.didDrawPage();
            }),
        }),
        getExcelJS: vi.fn().mockResolvedValue({
            Workbook: MockWorkbook,
        }),
    };
});

vi.mock('../../src/utils/pdfHeaderUtils', () => ({
    addPdfHeader: vi.fn().mockReturnValue(30),
    ensureLogosLoaded: vi.fn().mockResolvedValue(undefined),
}));

describe('Extracurricular Export Modules', () => {
    const dummyEkskul: Extracurricular = {
        id: 'ekskul-1',
        name: 'Pramuka Inti',
        category: 'Praja Muda Karana',
        coach_name: 'Kak Ahmad',
        schedule_day: 'Jumat',
        schedule_time: '15:00',
        description: 'Ekskul wajib kepramukaan',
        max_participants: 30,
        user_id: 'user-1',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        deleted_at: null,
    };

    const dummyEnrollments: EnrollmentView[] = [
        {
            id: 'enr-1',
            participantId: 'std-1',
            participantType: 'student',
            name: 'Budi Santoso',
            className: 'Kelas 4A',
            gender: 'Laki-laki',
        },
    ];

    it('re-exports all export functions from facade exactly matching modular export', () => {
        expect(typeof facade.exportAttendancePDF).toBe('function');
        expect(typeof facade.exportAttendanceExcel).toBe('function');
        expect(typeof facade.exportGradesPDF).toBe('function');
        expect(typeof facade.exportGradesExcel).toBe('function');

        expect(facade.exportAttendancePDF).toBe(exportModule.exportAttendancePDF);
        expect(facade.exportAttendanceExcel).toBe(exportModule.exportAttendanceExcel);
        expect(facade.exportGradesPDF).toBe(exportModule.exportGradesPDF);
        expect(facade.exportGradesExcel).toBe(exportModule.exportGradesExcel);
    });

    it('exports grades PDF without errors using modular exportGradesPDF', async () => {
        await expect(
            exportModule.exportGradesPDF({
                selectedExtracurricular: dummyEkskul,
                activeSemester: { name: 'Semester Ganjil', semester_number: 1 },
                enrollments: dummyEnrollments,
                gradesMap: {},
                gradeDrafts: {
                    'student:std-1': {
                        score: '90',
                        grade: 'A',
                        description: 'Sangat baik dan disiplin',
                    },
                },
            })
        ).resolves.toBeUndefined();
    });

    it('exports grades Excel without errors using modular exportGradesExcel', async () => {
        const originalCreateObjectURL = window.URL.createObjectURL;
        const originalRevokeObjectURL = window.URL.revokeObjectURL;
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        window.URL.revokeObjectURL = vi.fn();

        const clickMock = vi.fn();
        vi.spyOn(document, 'createElement').mockReturnValue({
            click: clickMock,
            set href(_val: string) {},
            set download(_val: string) {},
        } as unknown as HTMLAnchorElement);

        await expect(
            exportModule.exportGradesExcel({
                selectedExtracurricular: dummyEkskul,
                activeSemester: { name: 'Semester Ganjil', semester_number: 1 },
                enrollments: dummyEnrollments,
                gradesMap: {},
                gradeDrafts: {},
            })
        ).resolves.toBeUndefined();

        expect(clickMock).toHaveBeenCalled();

        window.URL.createObjectURL = originalCreateObjectURL;
        window.URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
    });
});
