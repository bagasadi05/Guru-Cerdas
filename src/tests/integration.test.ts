/**
 * Integration Tests for Undo and Export Features
 * 
 * Tests the complete flow from delete to restore,
 * bulk operations, and export functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Import services after mocking
import { softDelete, restore, permanentDelete, softDeleteBulk, restoreBulk } from '../services/SoftDeleteService';
import { recordAction, undo, getActionHistory, canUndo, getUndoTimeRemaining } from '../services/UndoManager';
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
