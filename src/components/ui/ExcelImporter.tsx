import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, FileSpreadsheetIcon, DownloadIcon, XIcon, CheckCircleIcon, AlertTriangleIcon, Loader2Icon } from '../Icons';
import { Button } from './Button';
import { useExcelParser, ParseResult, ExcelColumn } from '../../hooks/useExcelParser';

interface ExcelImporterProps {
    columns: ExcelColumn[];
    onImport: (data: Record<string, any>[]) => void;
    onCancel?: () => void;
    templateData?: { id: string; name: string }[];
    maxRows?: number;
    title?: string;
    description?: string;
    className?: string;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
    columns,
    onImport,
    onCancel,
    templateData,
    maxRows = 500,
    title = 'Import dari Excel',
    description = 'Upload file Excel atau CSV untuk mengimport data',
    className = '',
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { parse, generateGradeTemplate, isParsing, error } = useExcelParser();

    const [isDragging, setIsDragging] = useState(false);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
    const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');

    // Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            await handleFile(file);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleFile(file);
        }
    }, []);

    // Process file
    const handleFile = async (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            '.xlsx',
            '.xls',
            '.csv'
        ];

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(extension || '')) {
            alert('Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV.');
            return;
        }

        const result = await parse(file, {
            expectedColumns: columns,
            maxRows,
        });

        setParseResult(result);

        // Set initial column mappings from suggestions
        const mappings: Record<string, string> = {};
        result.suggestedMappings.forEach(m => {
            if (m.confidence >= 0.5) {
                mappings[m.targetColumn] = m.sourceColumn;
            }
        });
        setColumnMappings(mappings);

        setStep('preview');
    };

    // Download template
    const handleDownloadTemplate = () => {
        if (templateData && templateData.length > 0) {
            generateGradeTemplate(templateData, {
                filename: 'template_input_nilai.xlsx',
            });
        }
    };

    // Handle import confirmation
    const handleConfirmImport = () => {
        if (!parseResult) return;

        // Map data according to column mappings
        const mappedData = parseResult.data.map(row => {
            const mapped: Record<string, any> = {};
            columns.forEach(col => {
                const sourceCol = columnMappings[col.key];
                if (sourceCol && row[sourceCol] !== undefined) {
                    const value = row[sourceCol];
                    mapped[col.key] = col.type === 'number'
                        ? (value === '' ? '' : Number(value))
                        : String(value);
                }
            });
            return mapped;
        }).filter(row => Object.keys(row).length > 0);

        onImport(mappedData);
        resetState();
    };

    // Reset state
    const resetState = () => {
        setParseResult(null);
        setColumnMappings({});
        setStep('upload');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Render upload step
    const renderUploadStep = () => (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                </div>
                {onCancel && (
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <XIcon className="w-5 h-5" />
                    </Button>
                )}
            </div>

            {/* Drop zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${isDragging
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="flex flex-col items-center gap-3">
                    {isParsing ? (
                        <Loader2Icon className="w-12 h-12 text-indigo-500 animate-spin" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <UploadIcon className="w-8 h-8 text-indigo-500" />
                        </div>
                    )}

                    <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                            {isParsing ? 'Memproses file...' : 'Drag & drop file di sini'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            atau klik untuk memilih file
                        </p>
                    </div>

                    <p className="text-xs text-gray-400">
                        Format: Excel (.xlsx, .xls) atau CSV
                    </p>
                </div>
            </div>

            {/* Template download */}
            {templateData && templateData.length > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheetIcon className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Template Excel
                            </p>
                            <p className="text-xs text-blue-500">
                                Download template dengan daftar {templateData.length} siswa
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        Download
                    </Button>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangleIcon className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );

    // Render preview step
    const renderPreviewStep = () => {
        if (!parseResult) return null;

        const hasErrors = parseResult.errors.length > 0;
        const previewRows = parseResult.data.slice(0, 10);

        return (
            <div className={`space-y-4 ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Preview Data</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {parseResult.totalRows} baris ditemukan
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetState}>
                        <XIcon className="w-4 h-4 mr-1" />
                        Batal
                    </Button>
                </div>

                {/* Errors */}
                {hasErrors && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Peringatan
                                </p>
                                <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 space-y-1">
                                    {parseResult.errors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Column Mapping */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Pemetaan Kolom
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {columns.map(col => {
                            const mapping = parseResult.suggestedMappings.find(m => m.targetColumn === col.key);
                            const currentMapping = columnMappings[col.key];

                            return (
                                <div key={col.key} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                                        {col.label}
                                        {col.required && <span className="text-red-500">*</span>}
                                    </span>
                                    <select
                                        value={currentMapping || ''}
                                        onChange={(e) => setColumnMappings(prev => ({
                                            ...prev,
                                            [col.key]: e.target.value
                                        }))}
                                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                    >
                                        <option value="">-- Pilih Kolom --</option>
                                        {parseResult.headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    {mapping && mapping.confidence >= 0.8 && (
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Preview Table */}
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                                {columns.map(col => (
                                    <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {previewRows.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                    {columns.map(col => {
                                        const sourceCol = columnMappings[col.key];
                                        const value = sourceCol ? row[sourceCol] : '-';
                                        return (
                                            <td key={col.key} className="px-3 py-2 text-gray-900 dark:text-white">
                                                {String(value)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {parseResult.totalRows > 10 && (
                        <div className="px-3 py-2 text-xs text-center text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                            Menampilkan 10 dari {parseResult.totalRows} baris
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={resetState} className="flex-1">
                        Kembali
                    </Button>
                    <Button
                        onClick={handleConfirmImport}
                        disabled={!columns.every(c => !c.required || columnMappings[c.key])}
                        className="flex-1"
                    >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Import {parseResult.totalRows} Data
                    </Button>
                </div>
            </div>
        );
    };

    return step === 'upload' ? renderUploadStep() : renderPreviewStep();
};

export default ExcelImporter;
