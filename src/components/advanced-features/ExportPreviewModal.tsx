import React, { useState } from 'react';
import { Download, FileText, Loader2, Table } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

interface ExportPreviewProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  columns: { key: keyof T; label: string }[];
  onExport: (format: ExportFormat, selectedColumns: (keyof T)[]) => void | Promise<void>;
  supportedFormats?: readonly ExportFormat[];
  title?: string;
}

const allFormats: { value: ExportFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'json', label: 'JSON (.json)' },
];

export function ExportPreviewModal<T>({
  isOpen,
  onClose,
  data,
  columns,
  onExport,
  supportedFormats = ['xlsx', 'csv', 'pdf', 'json'],
  title = 'Ekspor Data',
}: ExportPreviewProps<T>) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(supportedFormats[0] || 'xlsx');
  const [selectedColumns, setSelectedColumns] = useState<Set<keyof T>>(
    new Set(columns.map((column) => column.key)),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const formats = allFormats.filter((format) => supportedFormats.includes(format.value));
  const activeFormat = supportedFormats.includes(selectedFormat)
    ? selectedFormat
    : supportedFormats[0];
  const previewColumns = columns.filter((column) => selectedColumns.has(column.key));

  const toggleColumn = (key: keyof T) => {
    setSelectedColumns((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (!activeFormat || isExporting || !previewColumns.length) return;
    setIsExporting(true);
    setExportError('');
    try {
      await onExport(
        activeFormat,
        previewColumns.map((column) => column.key),
      );
      onClose();
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Ekspor gagal. Silakan coba kembali.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? () => {} : onClose}
      title={title}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {previewColumns.length} dari {columns.length} kolom dipilih
          </span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Batal
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !previewColumns.length || !activeFormat}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Mengekspor...' : 'Ekspor'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {data.length} data akan diekspor
        </p>
        {exportError && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
          >
            {exportError}
          </p>
        )}
        <fieldset disabled={isExporting}>
          <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Format Berkas
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {formats.map((format) => (
              <button
                type="button"
                key={format.value}
                onClick={() => setSelectedFormat(format.value)}
                aria-pressed={activeFormat === format.value}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
                  activeFormat === format.value
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'border-slate-400 text-slate-700 hover:bg-slate-50 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {format.value === 'xlsx' ? (
                  <Table className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" />
                )}
                {format.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={isExporting}>
          <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kolom yang Diekspor
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {columns.map((column) => (
              <label
                key={String(column.key)}
                className="flex min-h-[44px] items-center gap-3 rounded-lg border border-slate-400 px-3 py-2 text-sm text-slate-700 dark:border-slate-500 dark:text-slate-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  className="h-5 w-5 shrink-0 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                />
                {column.label}
              </label>
            ))}
          </div>
        </fieldset>
        <section aria-label="Pratinjau data">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pratinjau Data
          </h3>
          {previewColumns.length ? (
            <div
              className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-700"
              tabIndex={0}
              role="region"
              aria-label="Tabel pratinjau ekspor"
            >
              <table
                className="w-full text-sm whitespace-nowrap"
                aria-label="Pratinjau data ekspor"
              >
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    {previewColumns.map((column) => (
                      <th
                        scope="col"
                        key={String(column.key)}
                        className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-t border-slate-200 dark:border-slate-700">
                      {previewColumns.map((column) => (
                        <td
                          key={String(column.key)}
                          className="px-3 py-2 text-slate-700 dark:text-slate-200"
                        >
                          {String(row[column.key] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Belum ada kolom yang dipilih.
            </p>
          )}
          {data.length > 5 && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {data.length - 5} baris lainnya
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
