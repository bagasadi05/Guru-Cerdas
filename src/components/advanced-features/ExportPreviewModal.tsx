import React, { useState } from 'react';
import { Check, Download, FileText, Loader2, Table, X } from 'lucide-react';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

interface ExportPreviewProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  columns: { key: keyof T; label: string }[];
  onExport: (format: ExportFormat, selectedColumns: (keyof T)[]) => void;
  title?: string;
}

export function ExportPreviewModal<T>({
  isOpen,
  onClose,
  data,
  columns,
  onExport,
  title = 'Ekspor Data',
}: ExportPreviewProps<T>) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [selectedColumns, setSelectedColumns] = useState<Set<keyof T>>(
    new Set(columns.map((column) => column.key))
  );
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (key: keyof T) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, Array.from(selectedColumns));
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const formats: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: <Table className="h-4 w-4" /> },
    { value: 'csv', label: 'CSV (.csv)', icon: <FileText className="h-4 w-4" /> },
    { value: 'pdf', label: 'PDF (.pdf)', icon: <FileText className="h-4 w-4" /> },
    { value: 'json', label: 'JSON (.json)', icon: <FileText className="h-4 w-4" /> },
  ];

  if (!isOpen) return null;

  const previewData = data.slice(0, 5);
  const previewColumns = columns.filter((column) => selectedColumns.has(column.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500">{data.length} data akan diekspor</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Format File</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    selectedFormat === format.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  {format.icon}
                  <span className="text-sm">{format.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Kolom yang Diekspor</h3>
            <div className="flex flex-wrap gap-2">
              {columns.map((column) => (
                <button
                  key={String(column.key)}
                  onClick={() => toggleColumn(column.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    selectedColumns.has(column.key)
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}
                >
                  {selectedColumns.has(column.key) && <Check className="h-3 w-3" />}
                  {column.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Pratinjau Data</h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full min-w-[500px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {previewColumns.map((column) => (
                        <th
                          key={String(column.key)}
                          className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t border-slate-100 dark:border-slate-700">
                        {previewColumns.map((column) => (
                          <td
                            key={String(column.key)}
                            className="px-3 py-2 text-slate-700 dark:text-slate-300"
                          >
                            {String(row[column.key] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.length > 5 && (
                <div className="bg-slate-50 px-3 py-2 text-center text-sm text-slate-500 dark:bg-slate-800">
                  ... dan {data.length - 5} baris lainnya
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
          <span className="text-sm text-slate-500">
            {selectedColumns.size} dari {columns.length} kolom dipilih
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.size === 0}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Ekspor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
