/**
 * useExport Hook
 * 
 * Hook for integrating export preview functionality with error handling
 * across all pages that need export capabilities.
 */

import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { exportData, ExportFormat, ColumnDefinition } from '../services/ExportService';

export interface UseExportOptions {
    entityName: string;
    filename: string;
    columns: ColumnDefinition[];
}

export interface ExportState {
    isExporting: boolean;
    isPreviewOpen: boolean;
    progress: number;
    error: string | null;
}

export interface DateRange {
    start?: string;
    end?: string;
}

export function useExport(options: UseExportOptions) {
    const { entityName, filename, columns } = options;
    const toast = useToast();

    const [state, setState] = useState<ExportState>({
        isExporting: false,
        isPreviewOpen: false,
        progress: 0,
        error: null,
    });

    // Open preview modal
    const openPreview = useCallback(() => {
        setState(prev => ({ ...prev, isPreviewOpen: true, error: null }));
    }, []);

    // Close preview modal
    const closePreview = useCallback(() => {
        setState(prev => ({ ...prev, isPreviewOpen: false }));
    }, []);

    // Handle export with error handling
    const handleExport = useCallback(async (
        format: ExportFormat,
        data: Record<string, any>[],
        selectedColumns: string[],
        dateRange?: DateRange
    ): Promise<boolean> => {
        setState(prev => ({ ...prev, isExporting: true, progress: 0, error: null }));

        try {
            // Filter columns based on selection
            const exportColumns = columns.filter(col => selectedColumns.includes(col.key));

            // Filter data by date range if provided
            let filteredData = data;
            if (dateRange?.start || dateRange?.end) {
                const dateColumn = columns.find(col => col.type === 'date');
                if (dateColumn) {
                    filteredData = data.filter(item => {
                        const itemDate = item[dateColumn.key];
                        if (!itemDate) return true;
                        const date = new Date(itemDate);
                        if (dateRange.start && date < new Date(dateRange.start)) return false;
                        if (dateRange.end && date > new Date(dateRange.end)) return false;
                        return true;
                    });
                }
            }

            // Check if there's data to export
            if (filteredData.length === 0) {
                throw new Error('Tidak ada data untuk diekspor');
            }

            // Check if columns are selected
            if (exportColumns.length === 0) {
                throw new Error('Pilih minimal satu kolom untuk diekspor');
            }

            // Generate timestamp for filename
            const timestamp = new Date().toISOString().slice(0, 10);
            const fullFilename = `${filename}_${timestamp}`;

            // Perform export
            const result = await exportData({
                format,
                filename: fullFilename,
                title: entityName,
                columns: exportColumns,
                data: filteredData,
                onProgress: (progress) => {
                    setState(prev => ({ ...prev, progress }));
                },
            });

            if (!result.success) {
                throw new Error(result.error || 'Export gagal');
            }

            setState(prev => ({ ...prev, isExporting: false, progress: 100 }));
            toast.success(`${entityName} berhasil diekspor ke ${format.toUpperCase()}`);

            // Close preview after successful export
            setTimeout(() => {
                closePreview();
            }, 500);

            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Export gagal';
            setState(prev => ({
                ...prev,
                isExporting: false,
                error: errorMessage,
                progress: 0
            }));
            toast.error(errorMessage);

            // Log error for debugging
            console.error('[Export Error]', {
                entityName,
                format,
                error,
                timestamp: new Date().toISOString(),
            });

            return false;
        }
    }, [columns, filename, entityName, toast, closePreview]);

    // Retry export after error
    const retryExport = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Cancel export
    const cancelExport = useCallback(() => {
        setState(prev => ({
            ...prev,
            isExporting: false,
            progress: 0,
            error: null
        }));
        closePreview();
    }, [closePreview]);

    return {
        ...state,
        columns,
        openPreview,
        closePreview,
        handleExport,
        retryExport,
        cancelExport,
    };
}

export default useExport;
