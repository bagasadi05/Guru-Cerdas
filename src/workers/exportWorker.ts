/**
 * Export Worker
 * 
 * Web Worker for handling large export operations in a separate thread.
 * This prevents UI blocking during heavy export processing.
 */

// Worker message types
interface WorkerMessage {
    type: 'export';
    payload: {
        format: 'pdf' | 'excel' | 'csv';
        data: Record<string, any>[];
        columns: { key: string; label: string; type?: string }[];
        filename: string;
        title?: string;
    };
}

interface WorkerResponse {
    type: 'progress' | 'complete' | 'error';
    payload: {
        progress?: number;
        blob?: Blob;
        filename?: string;
        error?: string;
    };
}

// Format value based on type
function formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
        case 'date':
            const date = new Date(value);
            if (isNaN(date.getTime())) return String(value);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
        case 'boolean':
            return value ? 'Ya' : 'Tidak';
        case 'number':
            return typeof value === 'number' ? value.toLocaleString('id-ID') : String(value);
        default:
            return String(value);
    }
}

// Escape CSV field
function escapeCSVField(field: string): string {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

// Generate CSV in worker
function generateCSV(
    data: Record<string, any>[],
    columns: { key: string; label: string; type?: string }[],
    onProgress: (progress: number) => void
): Blob {
    onProgress(10);

    const headers = columns.map(col => escapeCSVField(col.label));
    const totalRows = data.length;
    const rows: string[] = [];

    for (let i = 0; i < totalRows; i++) {
        const row = data[i];
        const rowData = columns.map(col => escapeCSVField(formatValue(row[col.key], col.type)));
        rows.push(rowData.join(','));

        // Report progress every 100 rows
        if (i % 100 === 0) {
            onProgress(10 + Math.floor((i / totalRows) * 80));
        }
    }

    onProgress(90);

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');

    onProgress(100);

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    if (type === 'export') {
        try {
            const { format, data, columns, filename } = payload;

            const sendProgress = (progress: number) => {
                const response: WorkerResponse = {
                    type: 'progress',
                    payload: { progress },
                };
                self.postMessage(response);
            };

            let blob: Blob;

            switch (format) {
                case 'csv':
                    blob = generateCSV(data, columns, sendProgress);
                    break;
                default:
                    throw new Error(`Format ${format} not supported in worker. Use main thread for PDF/Excel.`);
            }

            const response: WorkerResponse = {
                type: 'complete',
                payload: {
                    blob,
                    filename: `${filename}.${format}`,
                },
            };
            self.postMessage(response);

        } catch (error) {
            const response: WorkerResponse = {
                type: 'error',
                payload: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
            self.postMessage(response);
        }
    }
};

export { };
