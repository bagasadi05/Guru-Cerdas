import React, { useState, useRef, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import {
    UploadCloudIcon,
    FileSpreadsheetIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    DownloadIcon,
    RefreshCwIcon,
    ArrowRightIcon
} from 'lucide-react';
import {
    parseFile,
    autoDetectMappings,
    parseAndValidate,
    downloadTemplate,
    ColumnMapping,
    ParsedRow,
    STUDENT_FIELDS
} from '../../services/ImportService';
import { Select } from './Select';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (validRows: ParsedRow[]) => Promise<void>;
    title?: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export const ImportModal: React.FC<ImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    title = 'Import Data Siswa'
}) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[][]>([]);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep('upload');
        setFile(null);
        setHeaders([]);
        setRows([]);
        setMappings([]);
        setParsedRows([]);
        setIsProcessing(false);
        setImportResult(null);
        setError(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const { headers: parsedHeaders, rows: parsedRows } = await parseFile(selectedFile);
            setFile(selectedFile);
            setHeaders(parsedHeaders);
            setRows(parsedRows);

            // Auto-detect mappings
            const detectedMappings = autoDetectMappings(parsedHeaders);
            setMappings(detectedMappings);

            setStep('mapping');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMappingChange = (targetField: string, sourceColumn: string) => {
        setMappings(prev => {
            // Remove existing mapping for this target
            const filtered = prev.filter(m => m.targetField !== targetField);

            if (sourceColumn) {
                const fieldInfo = STUDENT_FIELDS.find(f => f.key === targetField);
                filtered.push({
                    sourceColumn,
                    targetField,
                    required: fieldInfo?.required || false,
                });
            }

            return filtered;
        });
    };

    const handlePreview = () => {
        const validated = parseAndValidate(headers, rows, mappings);
        setParsedRows(validated);
        setStep('preview');
    };

    const handleImport = async () => {
        const validRows = parsedRows.filter(r => r.isValid);
        if (validRows.length === 0) return;

        setStep('importing');
        setIsProcessing(true);

        try {
            await onImport(validRows);
            setImportResult({
                success: validRows.length,
                failed: parsedRows.length - validRows.length
            });
            setStep('complete');
        } catch (err: any) {
            setError(err.message);
            setStep('preview');
        } finally {
            setIsProcessing(false);
        }
    };

    const validCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows]);
    const invalidCount = useMemo(() => parsedRows.filter(r => !r.isValid).length, [parsedRows]);

    const renderUploadStep = () => (
        <div className="space-y-6">
            {/* Drop Zone */}
            <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50"
                onClick={() => fileInputRef.current?.click()}
            >
                <FileSpreadsheetIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Klik untuk memilih file
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Format yang didukung: .xlsx, .xls, .csv
                </p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                />
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Template Download */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                <div className="flex items-start gap-3">
                    <DownloadIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">
                            Butuh template?
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadTemplate('xlsx')}
                                className="text-indigo-600 border-indigo-300 hover:bg-indigo-100 dark:text-indigo-400 dark:border-indigo-700"
                            >
                                <DownloadIcon className="w-3 h-3 mr-1" />
                                Excel (.xlsx)
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadTemplate('csv')}
                                className="text-indigo-600 border-indigo-300 hover:bg-indigo-100 dark:text-indigo-400 dark:border-indigo-700"
                            >
                                <DownloadIcon className="w-3 h-3 mr-1" />
                                CSV (.csv)
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <RefreshCwIcon className="w-5 h-5 animate-spin" />
                    <span>Membaca file...</span>
                </div>
            )}
        </div>
    );

    const renderMappingStep = () => (
        <div className="space-y-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    File: <span className="font-medium text-slate-900 dark:text-white">{file?.name}</span>
                    <span className="mx-2">•</span>
                    {rows.length} baris data ditemukan
                </p>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-slate-900 dark:text-white">Pemetaan Kolom</h4>

                {STUDENT_FIELDS.map(field => {
                    const currentMapping = mappings.find(m => m.targetField === field.key);

                    return (
                        <div key={field.key} className="flex items-center gap-3">
                            <div className="w-1/3">
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                            <div className="flex-1">
                                <Select
                                    value={currentMapping?.sourceColumn || ''}
                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    className="w-full text-sm"
                                >
                                    <option value="">-- Pilih Kolom --</option>
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setStep('upload')} className="flex-1">
                    Kembali
                </Button>
                <Button
                    onClick={handlePreview}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!mappings.some(m => m.targetField === 'name')}
                >
                    Lanjut ke Preview
                </Button>
            </div>
        </div>
    );

    const renderPreviewStep = () => (
        <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{parsedRows.length}</div>
                    <div className="text-xs text-slate-500">Total Baris</div>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{validCount}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">Valid</div>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{invalidCount}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Error</div>
                </div>
            </div>

            {/* Data Preview Table */}
            <div className="max-h-64 overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Baris</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Nama</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Gender</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Kelas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {parsedRows.slice(0, 50).map((row) => (
                            <tr
                                key={row.rowNumber}
                                className={row.isValid ? '' : 'bg-red-50 dark:bg-red-900/10'}
                            >
                                <td className="px-3 py-2">
                                    {row.isValid ? (
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <XCircleIcon className="w-4 h-4 text-red-500" />
                                    )}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                                <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">
                                    {row.data.name || '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                    {row.data.gender || '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                    {row.data.class_name || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {parsedRows.length > 50 && (
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500">
                        Menampilkan 50 dari {parsedRows.length} baris
                    </div>
                )}
            </div>

            {/* Errors Summary */}
            {invalidCount > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                        {invalidCount} baris memiliki error:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 max-h-24 overflow-auto">
                        {parsedRows
                            .filter(r => !r.isValid)
                            .slice(0, 10)
                            .flatMap(r => r.errors)
                            .map((err, i) => (
                                <li key={i}>Baris {err.row}: {err.message}</li>
                            ))}
                    </ul>
                </div>
            )}

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setStep('mapping')} className="flex-1">
                    Kembali
                </Button>
                <Button
                    onClick={handleImport}
                    disabled={validCount === 0 || isProcessing}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isProcessing ? (
                        <>
                            <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" />
                            Mengimport...
                        </>
                    ) : (
                        `Import ${validCount} Siswa`
                    )}
                </Button>
            </div>
        </div>
    );

    const renderCompleteStep = () => (
        <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Import Berhasil!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                    {importResult?.success} siswa berhasil ditambahkan
                    {importResult?.failed ? `, ${importResult.failed} dilewati` : ''}
                </p>
            </div>

            <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Selesai
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
        >
            {step === 'upload' && renderUploadStep()}
            {step === 'mapping' && renderMappingStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'importing' && (
                <div className="py-12 text-center">
                    <RefreshCwIcon className="w-12 h-12 mx-auto text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Mengimport data...</p>
                </div>
            )}
            {step === 'complete' && renderCompleteStep()}
        </Modal>
    );
};

export default ImportModal;
