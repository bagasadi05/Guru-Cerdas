/**
 * Export Preview Modal Component
 * 
 * Provides a preview of data before export with column selection,
 * date range filtering, format selection, and template management.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    X,
    Download,
    FileText,
    FileSpreadsheet,
    FileType,
    Calendar,
    Columns,
    Check,
    ChevronDown,
    Loader2,
    Save,
    Trash2,
    Eye,
    Settings2
} from 'lucide-react';
import { Button } from './Button';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ColumnConfig {
    key: string;
    label: string;
    selected: boolean;
    type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ExportTemplate {
    id: string;
    name: string;
    columns: string[];
    format: ExportFormat;
    dateRange?: { start?: string; end?: string };
}

export interface DateRange {
    start?: string;
    end?: string;
}

export interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: Record<string, any>[];
    columns: ColumnConfig[];
    onExport: (format: ExportFormat, selectedColumns: string[], dateRange: DateRange) => Promise<void>;
    onColumnsChange?: (columns: ColumnConfig[]) => void;
    templates?: ExportTemplate[];
    onSaveTemplate?: (template: Omit<ExportTemplate, 'id'>) => void;
    onDeleteTemplate?: (id: string) => void;
    dateField?: string; // Field name for date filtering
    totalRecords?: number;
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
    pdf: <FileText className="w-5 h-5" />,
    excel: <FileSpreadsheet className="w-5 h-5" />,
    csv: <FileType className="w-5 h-5" />,
};

const formatLabels: Record<ExportFormat, string> = {
    pdf: 'PDF Document',
    excel: 'Excel Spreadsheet',
    csv: 'CSV File',
};

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
    isOpen,
    onClose,
    title,
    data,
    columns: initialColumns,
    onExport,
    onColumnsChange,
    templates = [],
    onSaveTemplate,
    onDeleteTemplate,
    dateField,
    totalRecords,
}) => {
    const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
    const [dateRange, setDateRange] = useState<DateRange>({});
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setColumns(initialColumns);
            setExportProgress(0);
            setIsExporting(false);
        }
    }, [isOpen, initialColumns]);

    // Selected columns
    const selectedColumns = useMemo(() =>
        columns.filter(col => col.selected),
        [columns]
    );

    // Filter data by date range
    const filteredData = useMemo(() => {
        if (!dateField || (!dateRange.start && !dateRange.end)) {
            return data;
        }

        return data.filter(item => {
            const itemDate = item[dateField];
            if (!itemDate) return true;

            const date = new Date(itemDate);

            if (dateRange.start && date < new Date(dateRange.start)) {
                return false;
            }
            if (dateRange.end && date > new Date(dateRange.end)) {
                return false;
            }
            return true;
        });
    }, [data, dateField, dateRange]);

    // Preview data (first 10 rows)
    const previewData = useMemo(() =>
        filteredData.slice(0, 10),
        [filteredData]
    );

    // Toggle column selection
    const toggleColumn = useCallback((key: string) => {
        setColumns(prev => {
            const updated = prev.map(col =>
                col.key === key ? { ...col, selected: !col.selected } : col
            );
            onColumnsChange?.(updated);
            return updated;
        });
    }, [onColumnsChange]);

    // Select all columns
    const selectAllColumns = useCallback(() => {
        setColumns(prev => {
            const updated = prev.map(col => ({ ...col, selected: true }));
            onColumnsChange?.(updated);
            return updated;
        });
    }, [onColumnsChange]);

    // Deselect all columns
    const deselectAllColumns = useCallback(() => {
        setColumns(prev => {
            const updated = prev.map(col => ({ ...col, selected: false }));
            onColumnsChange?.(updated);
            return updated;
        });
    }, [onColumnsChange]);

    // Apply template
    const applyTemplate = useCallback((template: ExportTemplate) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            selected: template.columns.includes(col.key),
        })));
        setSelectedFormat(template.format);
        if (template.dateRange) {
            setDateRange(template.dateRange);
        }
        setShowTemplates(false);
    }, []);

    // Save current configuration as template
    const saveAsTemplate = useCallback(() => {
        if (!newTemplateName.trim() || !onSaveTemplate) return;

        onSaveTemplate({
            name: newTemplateName.trim(),
            columns: selectedColumns.map(c => c.key),
            format: selectedFormat,
            dateRange,
        });

        setNewTemplateName('');
        setShowTemplates(false);
    }, [newTemplateName, selectedColumns, selectedFormat, dateRange, onSaveTemplate]);

    // Handle export
    const handleExport = useCallback(async () => {
        if (selectedColumns.length === 0) return;

        setIsExporting(true);
        setExportProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setExportProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            await onExport(
                selectedFormat,
                selectedColumns.map(c => c.key),
                dateRange
            );
            setExportProgress(100);
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            clearInterval(progressInterval);
            setIsExporting(false);
        }
    }, [selectedFormat, selectedColumns, dateRange, onExport, onClose]);

    // Format cell value for display
    const formatCellValue = (value: any, type?: string): string => {
        if (value === null || value === undefined) return '-';

        switch (type) {
            case 'date':
                return new Date(value).toLocaleDateString('id-ID');
            case 'boolean':
                return value ? 'Ya' : 'Tidak';
            case 'number':
                return typeof value === 'number' ? value.toLocaleString('id-ID') : value;
            default:
                return String(value);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Export {title}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {filteredData.length} dari {totalRecords || data.length} data akan diekspor
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Eye className="w-4 h-4 inline mr-2" />
                        Preview
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Settings2 className="w-4 h-4 inline mr-2" />
                        Pengaturan
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'preview' ? (
                        <div className="space-y-4">
                            {/* Quick Actions Bar */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Format Selector */}
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                                    {(['pdf', 'excel', 'csv'] as ExportFormat[]).map(format => (
                                        <button
                                            key={format}
                                            onClick={() => setSelectedFormat(format)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedFormat === format
                                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            {formatIcons[format]}
                                            <span className="hidden sm:inline">{format.toUpperCase()}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Column Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <Columns className="w-4 h-4" />
                                        Kolom ({selectedColumns.length}/{columns.length})
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showColumnSelector && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between">
                                                    <button
                                                        onClick={selectAllColumns}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        Pilih Semua
                                                    </button>
                                                    <button
                                                        onClick={deselectAllColumns}
                                                        className="text-xs text-slate-500 hover:text-slate-700"
                                                    >
                                                        Hapus Semua
                                                    </button>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto p-2">
                                                    {columns.map(column => (
                                                        <label
                                                            key={column.key}
                                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={column.selected}
                                                                onChange={() => toggleColumn(column.key)}
                                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                                {column.label}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Date Range */}
                                {dateField && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            value={dateRange.start || ''}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Dari"
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input
                                            type="date"
                                            value={dateRange.end || ''}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Sampai"
                                        />
                                        {(dateRange.start || dateRange.end) && (
                                            <button
                                                onClick={() => setDateRange({})}
                                                className="text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Preview Table */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800">
                                                {selectedColumns.map(column => (
                                                    <th
                                                        key={column.key}
                                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                                                    >
                                                        {column.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {previewData.map((row, index) => (
                                                <tr key={index} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                                    {selectedColumns.map(column => (
                                                        <td
                                                            key={column.key}
                                                            className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap"
                                                        >
                                                            {formatCellValue(row[column.key], column.type)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {filteredData.length > 10 && (
                                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-center text-sm text-slate-500">
                                        Menampilkan 10 dari {filteredData.length} data
                                    </div>
                                )}

                                {selectedColumns.length === 0 && (
                                    <div className="p-8 text-center text-slate-500">
                                        Pilih minimal satu kolom untuk preview
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Templates */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                                    Template Export
                                </h3>
                                <div className="space-y-2">
                                    {templates.map(template => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                                    {template.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {template.columns.length} kolom • {template.format.toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => applyTemplate(template)}
                                                    className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                                >
                                                    Terapkan
                                                </button>
                                                {onDeleteTemplate && (
                                                    <button
                                                        onClick={() => onDeleteTemplate(template.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {templates.length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            Belum ada template tersimpan
                                        </p>
                                    )}
                                </div>

                                {/* Save as template */}
                                {onSaveTemplate && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                            placeholder="Nama template..."
                                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            onClick={saveAsTemplate}
                                            disabled={!newTemplateName.trim()}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Save className="w-4 h-4" />
                                            Simpan
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Export Format Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                                    Format Export
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(['pdf', 'excel', 'csv'] as ExportFormat[]).map(format => (
                                        <button
                                            key={format}
                                            onClick={() => setSelectedFormat(format)}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${selectedFormat === format
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${selectedFormat === format
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                {formatIcons[format]}
                                            </div>
                                            <p className="font-medium text-slate-800 dark:text-white">
                                                {formatLabels[format]}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {format === 'pdf' && 'Cocok untuk cetak dan presentasi'}
                                                {format === 'excel' && 'Cocok untuk analisis data'}
                                                {format === 'csv' && 'Cocok untuk import ke sistem lain'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-sm text-slate-500">
                        Format: <span className="font-medium">{selectedFormat.toUpperCase()}</span>
                        {' • '}
                        {selectedColumns.length} kolom
                        {' • '}
                        {filteredData.length} data
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={isExporting || selectedColumns.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mengekspor... {exportProgress}%
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export {selectedFormat.toUpperCase()}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Export Progress Overlay */}
                {isExporting && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 relative">
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        strokeDasharray={175.93}
                                        strokeDashoffset={175.93 * (1 - exportProgress / 100)}
                                        className="text-indigo-600 transition-all duration-300"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">
                                    {exportProgress}%
                                </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">
                                Memproses export...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportPreviewModal;
