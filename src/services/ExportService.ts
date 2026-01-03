/**
 * Export Service
 * 
 * Handles data export to PDF, Excel, and CSV formats.
 * Includes progress tracking and error handling.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ColumnDefinition {
    key: string;
    label: string;
    type?: 'string' | 'number' | 'date' | 'boolean';
    width?: number;
}

export interface ExportOptions {
    format: ExportFormat;
    filename: string;
    title?: string;
    columns: ColumnDefinition[];
    data: Record<string, any>[];
    onProgress?: (progress: number) => void;
    includeHeader?: boolean;
    includeFooter?: boolean;
    dateFormat?: string;
}

export interface ExportResult {
    success: boolean;
    filename?: string;
    error?: string;
}

/**
 * Format value based on column type
 */
function formatValue(value: any, type?: string, dateFormat?: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
        case 'date': {
            const date = new Date(value);
            if (isNaN(date.getTime())) return String(value);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
        }
        case 'boolean':
            return value ? 'Ya' : 'Tidak';
        case 'number':
            return typeof value === 'number' ? value.toLocaleString('id-ID') : String(value);
        default:
            return String(value);
    }
}

/**
 * Export to PDF using jsPDF and autoTable
 */
export async function exportToPDF(options: ExportOptions): Promise<ExportResult> {
    try {
        const {
            filename,
            title,
            columns,
            data,
            onProgress,
            includeHeader = true,
            includeFooter = true,
        } = options;

        onProgress?.(10);

        // Create PDF document
        const doc = new jsPDF({
            orientation: data.length > 100 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        onProgress?.(20);

        // Add header
        if (includeHeader && title) {
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Diekspor pada: ${new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}`, 14, 28);
            doc.text(`Total: ${data.length} data`, 14, 34);
        }

        onProgress?.(40);

        // Prepare table data
        const headers = columns.map(col => col.label);
        const rows = data.map(row =>
            columns.map(col => formatValue(row[col.key], col.type))
        );

        onProgress?.(60);

        // Add table
        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: includeHeader && title ? 40 : 14,
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [99, 102, 241], // Indigo
                textColor: 255,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252], // Slate-50
            },
            didDrawPage: (data) => {
                // Add footer on each page
                if (includeFooter) {
                    const pageCount = doc.getNumberOfPages();
                    const currentPage = data.pageNumber;

                    doc.setFontSize(8);
                    doc.setTextColor(128);
                    doc.text(
                        `Halaman ${currentPage} dari ${pageCount}`,
                        doc.internal.pageSize.width / 2,
                        doc.internal.pageSize.height - 10,
                        { align: 'center' }
                    );
                }
            },
        });

        onProgress?.(90);

        // Save file
        const fullFilename = `${filename}.pdf`;
        doc.save(fullFilename);

        onProgress?.(100);

        return { success: true, filename: fullFilename };
    } catch (error) {
        console.error('PDF export failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export PDF'
        };
    }
}

/**
 * Export to Excel using xlsx library
 */
export async function exportToExcel(options: ExportOptions): Promise<ExportResult> {
    try {
        const {
            filename,
            title,
            columns,
            data,
            onProgress,
        } = options;

        onProgress?.(10);

        // Create workbook
        const wb = XLSX.utils.book_new();

        onProgress?.(20);

        // Prepare data with headers
        const headers = columns.map(col => col.label);
        const rows = data.map(row =>
            columns.map(col => {
                const value = row[col.key];
                // Keep numbers and dates as their original types for Excel
                if (col.type === 'number' && typeof value === 'number') {
                    return value;
                }
                if (col.type === 'date' && value) {
                    return new Date(value);
                }
                if (col.type === 'boolean') {
                    return value ? 'Ya' : 'Tidak';
                }
                return value ?? '';
            })
        );

        onProgress?.(40);

        // Create worksheet
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = columns.map(col => ({
            wch: col.width || Math.max(col.label.length, 15)
        }));
        ws['!cols'] = colWidths;

        onProgress?.(60);

        // Add worksheet to workbook
        const sheetName = (title || 'Data').substring(0, 31); // Excel sheet name limit
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        onProgress?.(80);

        // Generate file
        const fullFilename = `${filename}.xlsx`;
        XLSX.writeFile(wb, fullFilename);

        onProgress?.(100);

        return { success: true, filename: fullFilename };
    } catch (error) {
        console.error('Excel export failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export Excel'
        };
    }
}

/**
 * Export to CSV with UTF-8 BOM for Excel compatibility
 */
export async function exportToCSV(options: ExportOptions): Promise<ExportResult> {
    try {
        const {
            filename,
            columns,
            data,
            onProgress,
        } = options;

        onProgress?.(10);

        // Prepare headers
        const headers = columns.map(col => escapeCSVField(col.label));

        onProgress?.(30);

        // Prepare rows
        const rows = data.map(row =>
            columns.map(col => escapeCSVField(formatValue(row[col.key], col.type)))
        );

        onProgress?.(60);

        // Create CSV content with BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\r\n');

        onProgress?.(80);

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onProgress?.(100);

        return { success: true, filename: `${filename}.csv` };
    } catch (error) {
        console.error('CSV export failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export CSV'
        };
    }
}

/**
 * Escape CSV field to handle special characters
 */
function escapeCSVField(field: string): string {
    if (field === null || field === undefined) return '';

    const stringField = String(field);

    // If field contains comma, newline, or quote, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }

    return stringField;
}

/**
 * Main export function that routes to appropriate format handler
 */
export async function exportData(options: ExportOptions): Promise<ExportResult> {
    const { format } = options;

    switch (format) {
        case 'pdf':
            return exportToPDF(options);
        case 'excel':
            return exportToExcel(options);
        case 'csv':
            return exportToCSV(options);
        default:
            return { success: false, error: `Unsupported format: ${format}` };
    }
}

/**
 * Export with Web Worker for large datasets (optional enhancement)
 */
export async function exportDataAsync(
    options: ExportOptions,
    onProgress?: (progress: number) => void
): Promise<ExportResult> {
    return new Promise((resolve) => {
        // For large datasets, we could use a Web Worker here
        // For now, we use the synchronous version with progress callbacks
        exportData({ ...options, onProgress })
            .then(resolve)
            .catch(error => resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Export failed'
            }));
    });
}

export default {
    exportData,
    exportToPDF,
    exportToExcel,
    exportToCSV,
    exportDataAsync,
};
