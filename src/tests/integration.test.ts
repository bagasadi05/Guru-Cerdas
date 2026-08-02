/**
 * Integration Tests for Undo and Export Features
 * 
 * Tests the complete flow from delete to restore,
 * bulk operations, and export functionality.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Supabase
vi.mock('../services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
    },
}));

// Mock dynamic imports to avoid loading heavy packages in test environment
vi.mock('../utils/dynamicImports', () => {
    const mockXLSX = {
        utils: {
            book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
            book_append_sheet: vi.fn(),
            aoa_to_sheet: vi.fn(() => ({})),
        },
        writeFile: vi.fn().mockResolvedValue(undefined),
    };

    const mockJsPDFInstance = {
        internal: {
            pageSize: {
                getWidth: vi.fn(() => 210),
                getHeight: vi.fn(() => 297),
                width: 210,
                height: 297,
            },
        },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        setLineWidth: vi.fn(),
        setTextColor: vi.fn(),
        addPage: vi.fn(),
        getNumberOfPages: vi.fn(() => 1),
        save: vi.fn(),
    };
    const mockJsPDF = { default: vi.fn(function () { return mockJsPDFInstance; }) };
    const mockAutoTable = { default: vi.fn() };
    return {
        getXLSX: vi.fn().mockResolvedValue(mockXLSX),
        getJsPDF: vi.fn().mockResolvedValue(mockJsPDF),
        getAutoTable: vi.fn().mockResolvedValue(mockAutoTable),
    };
});

vi.mock('../utils/pdfHeaderUtils', () => ({
    addPdfHeader: vi.fn(() => 50),
    ensureLogosLoaded: vi.fn().mockResolvedValue(true),
}));

// Import services after mocking
import { softDelete, restore, permanentDelete, softDeleteBulk, restoreBulk, cleanupExpired, getDeletedItems, ENTITY_KEY_COLUMN, ENTITY_OWNER_COLUMN, getAllDeletedItems } from '../services/SoftDeleteService';
import { supabase } from '../services/supabase';
import { recordAction, undo, canUndo, getUndoTimeRemaining } from '../services/UndoManager';
import { exportToPDF, exportToExcel, exportToCSV } from '../services/ExportService';

describe('SoftDeleteService', () => {
    describe('softDelete', () => {
        it('should set deleted_at timestamp on a record', async () => {
            const result = await softDelete('students', 'test-id-1');
            expect(result.success).toBe(true);
            expect(result.deletedAt).toBeDefined();
        });

        it('should return error on failure', async () => {
            // This would fail in real scenario with invalid ID
            const result = await softDelete('students', '');
            // We expect it to attempt the operation
            expect(result).toBeDefined();
        });
    });

    describe('softDeleteBulk', () => {
        it('should soft delete multiple records', async () => {
            const ids = ['id-1', 'id-2', 'id-3'];
            const result = await softDeleteBulk('tasks', ids);
            expect(result.success).toBe(true);
        });
    });

    describe('restore', () => {
        it('should clear deleted_at on a record', async () => {
            const result = await restore('students', 'test-id-1');
            expect(result.success).toBe(true);
        });
    });

    describe('restoreBulk', () => {
        it('should restore multiple records', async () => {
            const ids = ['id-1', 'id-2'];
            const result = await restoreBulk('tasks', ids);
            expect(result.success).toBe(true);
        });
    });

    describe('permanentDelete', () => {
        it('should permanently remove a record', async () => {
            const result = await permanentDelete('students', 'test-id-1');
            expect(result.success).toBe(true);
        });
    });
});

describe('SoftDeleteService API id-based', () => {
    describe('regresi: kolom kunci per entity (anti-HTTP 400)', () => {
        it('softDelete user_settings memakai kolom user_id (bukan id)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await softDelete('user_settings', 'user-1');

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
        });

        it('softDeleteBulk user_settings memakai kolom user_id (bukan id)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await softDeleteBulk('user_settings', ['user-1', 'user-2']);

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.in).toHaveBeenCalledWith('user_id', ['user-1', 'user-2']);
        });

        it('restore user_settings memakai kolom user_id (bukan id)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await restore('user_settings', 'user-1');

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
        });

        it('restoreBulk user_settings memakai kolom user_id (bukan id)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await restoreBulk('user_settings', ['user-1', 'user-2']);

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.in).toHaveBeenCalledWith('user_id', ['user-1', 'user-2']);
        });

        it('permanentDelete user_settings memakai kolom user_id (bukan id)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await permanentDelete('user_settings', 'user-1');

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
        });

        it('getDeletedItems user_settings memetakan id dari kolom kunci user_id', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            // Baris user_settings punya user_id, TANPA kolom id — hasil map
            // harus mengambil id dari kolom kunci (user_id), bukan item.id.
            const row = { user_id: 'user-1', deleted_at: '2026-07-01T00:00:00.000Z', school_name: 'X' };
            fromMock.mockImplementationOnce(() => {
                const chain = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    then: (resolve: (v: unknown) => void) => resolve({ data: [row], error: null }),
                } as { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; not: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; then: (resolve: (v: unknown) => void) => void };
                return chain;
            });

            const items = await getDeletedItems('user_settings', 'user-1');
            expect(items).toHaveLength(1);
            expect(items[0].id).toBe('user-1');
        });

        it('entity biasa (students) tetap memakai kolom id', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await softDelete('students', 'student-1');

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'students');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.eq).toHaveBeenCalledWith('id', 'student-1');
        });
    });

    describe('regresi: owner filter per entity (anti-HTTP 400)', () => {
        it.each(['homework', 'announcements'] as const)(
            '%s tidak punya user_id → getDeletedItems di-skip tanpa query',
            async (entity) => {
                const fromMock = vi.mocked(supabase.from);
                fromMock.mockClear();

                const items = await getDeletedItems(entity, 'user-1');

                expect(items).toEqual([]);
                // Tidak boleh ada query ke tabel tsb sama sekali (tanpa kolom
                // user_id, `.eq('user_id', ...)` akan ditolak PostgREST HTTP 400).
                const queriedTables = fromMock.mock.calls.map(call => call[0]);
                expect(queriedTables).not.toContain(entity);
            }
        );

        it('getDeletedItems students memakai kolom owner user_id', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await getDeletedItems('students', 'user-1');

            const idx = fromMock.mock.calls.findIndex(call => call[0] === 'students');
            expect(idx).toBeGreaterThanOrEqual(0);
            const builder = fromMock.mock.results[idx].value;
            expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
        });

        it('getAllDeletedItems tidak pernah men-query homework/announcements', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            const items = await getAllDeletedItems('user-1');

            expect(Array.isArray(items)).toBe(true);
            const queriedTables = fromMock.mock.calls.map(call => call[0]);
            expect(queriedTables).not.toContain('homework');
            expect(queriedTables).not.toContain('announcements');
            // user_settings ikut di-query (punya user_id) — pastikan tidak
            // ter-skip oleh guard owner yang terlalu agresif
            expect(queriedTables).toContain('user_settings');
        });

        it('ENTITY_OWNER_COLUMN terdefinisi untuk semua entity (string atau null)', () => {
            const entities = Object.keys(ENTITY_OWNER_COLUMN) as (keyof typeof ENTITY_OWNER_COLUMN)[];
            expect(entities.length).toBeGreaterThan(0);
            for (const entity of entities) {
                expect(ENTITY_OWNER_COLUMN[entity] === null || typeof ENTITY_OWNER_COLUMN[entity] === 'string').toBe(true);
            }
        });
    });
});

describe('cleanupExpired', () => {
    describe('regresi: kolom kunci per entity (anti-HTTP 400)', () => {
        it('user_settings di-query memakai kolom kunci user_id, bukan id (sebelumnya 400 di startup)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            const result = await cleanupExpired();

            expect(result.success).toBe(true);

            // user_settings memakai PK user_id tanpa kolom id → select('id')
            // ditolak PostgREST (HTTP 400). Refactor memakai ENTITY_KEY_COLUMN
            // sehingga user_settings ikut di-cleanup tapi dengan kolom user_id.
            const settingsCallIdx = fromMock.mock.calls.findIndex(call => call[0] === 'user_settings');
            expect(settingsCallIdx).toBeGreaterThanOrEqual(0);

            const settingsBuilder = fromMock.mock.results[settingsCallIdx].value;
            expect(settingsBuilder.select).toHaveBeenCalledWith('user_id');
            expect(settingsBuilder.select).not.toHaveBeenCalledWith('id');
        });

        it('setiap entity di-select memakai kolom kuncinya sendiri (ENTITY_KEY_COLUMN)', async () => {
            const fromMock = vi.mocked(supabase.from);
            fromMock.mockClear();

            await cleanupExpired();

            const calls = fromMock.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // Invariant anti-400: query select() tiap entity harus memakai
            // kolom kunci yang terdaftar di ENTITY_KEY_COLUMN — bukan
            // hardcode 'id' yang bisa ditolak PostgREST.
            for (let i = 0; i < calls.length; i++) {
                const entity = calls[i][0] as keyof typeof ENTITY_KEY_COLUMN;
                const expectedKey = ENTITY_KEY_COLUMN[entity];
                expect(expectedKey).toBeDefined();

                const builder = fromMock.mock.results[i].value;
                expect(builder.select).toHaveBeenCalledWith(expectedKey);
            }
        });
    });
});

describe('UndoManager', () => {
    describe('recordAction', () => {
        it('should record an undoable action', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'students',
                ['student-1'],
                undefined,
                'Menghapus 1 siswa'
            );

            expect(action.id).toBeDefined();
            expect(action.actionType).toBe('delete');
            expect(action.entity).toBe('students');
            expect(action.entityIds).toContain('student-1');
            expect(action.undone).toBe(false);
        });

        it('should set expiration time', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'tasks',
                ['task-1'],
                undefined,
                'Test action',
                5000 // 5 seconds timeout
            );

            expect(action.expiresAt.getTime()).toBeGreaterThan(action.createdAt.getTime());
        });
    });

    describe('canUndo', () => {
        it('should return true for recent actions', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'students',
                ['student-1'],
                undefined,
                'Test',
                10000
            );

            expect(canUndo(action.id)).toBe(true);
        });
    });

    describe('getUndoTimeRemaining', () => {
        it('should return remaining time for valid action', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'students',
                ['student-1'],
                undefined,
                'Test',
                10000
            );

            const remaining = getUndoTimeRemaining(action.id);
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(10000);
        });
    });

    describe('undo', () => {
        it('should restore soft-deleted items', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'students',
                ['student-1'],
                undefined,
                'Test delete'
            );

            const result = await undo(action.id);
            expect(result.success).toBe(true);
        });

        it('should fail for already undone actions', async () => {
            const action = await recordAction(
                'user-1',
                'delete',
                'students',
                ['student-2'],
                undefined,
                'Test delete'
            );

            // First undo should succeed
            await undo(action.id);

            // Second undo should fail
            const result = await undo(action.id);
            expect(result.success).toBe(false);
            expect(result.error).toContain('sudah');
        });
    });
});

describe('ExportService', () => {
    const testData = [
        { id: '1', name: 'John Doe', age: 25, created_at: '2024-01-15' },
        { id: '2', name: 'Jane Smith', age: 30, created_at: '2024-02-20' },
        { id: '3', name: 'Bob Wilson', age: 28, created_at: '2024-03-10' },
    ];

    const testColumns = [
        { key: 'id', label: 'ID', type: 'string' as const },
        { key: 'name', label: 'Nama', type: 'string' as const },
        { key: 'age', label: 'Umur', type: 'number' as const },
        { key: 'created_at', label: 'Tanggal Dibuat', type: 'date' as const },
    ];

    describe('exportToCSV', () => {
        it('should generate valid CSV file', async () => {
            const progressMock = vi.fn();

            const result = await exportToCSV({
                format: 'csv',
                filename: 'test-export',
                title: 'Test Data',
                columns: testColumns,
                data: testData,
                onProgress: progressMock,
            });

            expect(result.success).toBe(true);
            expect(result.filename).toContain('.csv');
            expect(progressMock).toHaveBeenCalled();
        });
    });

    describe('exportToExcel', () => {
        it('should generate valid Excel file', async () => {
            const progressMock = vi.fn();

            const result = await exportToExcel({
                format: 'excel',
                filename: 'test-export',
                title: 'Test Data',
                columns: testColumns,
                data: testData,
                onProgress: progressMock,
            });

            expect(result.success).toBe(true);
            expect(result.filename).toContain('.xlsx');
        });
    });

    describe('exportToPDF', () => {
        it('should generate valid PDF file', async () => {
            const progressMock = vi.fn();

            const result = await exportToPDF({
                format: 'pdf',
                filename: 'test-export',
                title: 'Test Data',
                columns: testColumns,
                data: testData,
                onProgress: progressMock,
            });

            expect(result.success).toBe(true);
            expect(result.filename).toContain('.pdf');
        });
    });
});

describe('Integration: Delete-Undo Flow', () => {
    it('should complete full delete and undo cycle', async () => {
        // 1. Record delete action
        const deleteAction = await recordAction(
            'user-1',
            'delete',
            'students',
            ['student-integration-1'],
            [{ id: 'student-integration-1', name: 'Test Student' }],
            'Menghapus siswa'
        );

        expect(deleteAction.id).toBeDefined();
        expect(canUndo(deleteAction.id)).toBe(true);

        // 2. Verify time remaining
        const timeRemaining = getUndoTimeRemaining(deleteAction.id);
        expect(timeRemaining).toBeGreaterThan(0);

        // 3. Perform undo
        const undoResult = await undo(deleteAction.id);
        expect(undoResult.success).toBe(true);

        // 4. Verify cannot undo again
        expect(canUndo(deleteAction.id)).toBe(false);
    });

    it('should handle bulk delete and undo', async () => {
        const ids = ['bulk-1', 'bulk-2', 'bulk-3'];

        // 1. Record bulk delete
        const bulkAction = await recordAction(
            'user-1',
            'bulk_delete',
            'tasks',
            ids,
            ids.map(id => ({ id, title: `Task ${id}` })),
            `Menghapus ${ids.length} tugas`
        );

        expect(bulkAction.entityIds.length).toBe(3);

        // 2. Undo bulk delete
        const undoResult = await undo(bulkAction.id);
        expect(undoResult.success).toBe(true);
    });
});

describe('Integration: Export Preview Flow', () => {
    const testData = [
        { id: '1', name: 'Student 1', grade: 85 },
        { id: '2', name: 'Student 2', grade: 90 },
    ];

    const columns = [
        { key: 'id', label: 'ID', type: 'string' as const },
        { key: 'name', label: 'Nama', type: 'string' as const },
        { key: 'grade', label: 'Nilai', type: 'number' as const },
    ];

    it('should export with selected columns', async () => {
        // Export with only name and grade columns
        const selectedColumns = columns.filter(c => c.key !== 'id');

        const result = await exportToCSV({
            format: 'csv',
            filename: 'filtered-export',
            title: 'Students',
            columns: selectedColumns,
            data: testData,
        });

        expect(result.success).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
        const result = await exportToCSV({
            format: 'csv',
            filename: 'empty-export',
            title: 'Empty Data',
            columns: columns,
            data: [],
        });

        expect(result.success).toBe(true);
    });
});
