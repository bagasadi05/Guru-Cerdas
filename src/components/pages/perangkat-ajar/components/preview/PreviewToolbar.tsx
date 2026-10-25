import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  Sliders,
  LayoutGrid,
} from 'lucide-react';
import type { PreviewDocType, PreviewOrientation } from '../../hooks/usePreviewTabExport';

interface PreviewToolbarProps {
  selectedDoc: PreviewDocType;
  onSelectDoc: (doc: PreviewDocType) => void;
  orientation: PreviewOrientation;
  onSetOrientation: (orientation: PreviewOrientation) => void;
  showIdentityEditor: boolean;
  onToggleIdentityEditor: () => void;
  isExporting: string | null;
  onExportPdf: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  selectedDoc,
  onSelectDoc,
  orientation,
  onSetOrientation,
  showIdentityEditor,
  onToggleIdentityEditor,
  isExporting,
  onExportPdf,
  onExportWord,
  onExportExcel,
  onPrint,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm print:hidden">
      {/* Document Tabs */}
      <div className="grid grid-cols-3 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onSelectDoc('PROTA')}
          className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
            selectedDoc === 'PROTA'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="sm:hidden">Prota</span>
          <span className="hidden sm:inline">Program Tahunan (Prota)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectDoc('PROMES_1');
            onSetOrientation('landscape');
          }}
          className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
            selectedDoc === 'PROMES_1'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="sm:hidden">Promes 1</span>
          <span className="hidden sm:inline">Promes Semester 1</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectDoc('PROMES_2');
            onSetOrientation('landscape');
          }}
          className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
            selectedDoc === 'PROMES_2'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="sm:hidden">Promes 2</span>
          <span className="hidden sm:inline">Promes Semester 2</span>
        </button>
      </div>

      {/* Action Buttons & Orientation Selector */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto">
        {/* Orientation Selector */}
        <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSetOrientation('landscape')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              orientation === 'landscape'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="A4 Landscape (Mendatar: 297 × 210 mm) - Standar Resmi Promes"
          >
            <LayoutGrid className="w-3.5 h-3.5 rotate-90" />
            <span>A4 Landscape</span>
          </button>
          <button
            type="button"
            onClick={() => onSetOrientation('portrait')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              orientation === 'portrait'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="A4 Portrait (Tegak: 210 × 297 mm)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4 Portrait</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onToggleIdentityEditor}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-xl transition-colors border cursor-pointer active:scale-95 ${
              showIdentityEditor
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-inner'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
            }`}
            title="Atur kop surat sekolah dan pihak penandatangan dokumen"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Atur Kop & TTD</span>
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting !== null}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 shadow-sm cursor-pointer active:scale-95"
            title="Unduh langsung sebagai dokumen PDF (.pdf) tanpa kotak dialog cetak"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>{isExporting === 'PDF' ? 'Menyiapkan...' : 'Unduh PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onExportWord}
            disabled={isExporting !== null}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer active:scale-95"
            title="Ekspor dokumen resmi ke Microsoft Word (.docx)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>{isExporting === 'WORD' ? 'Mengunduh...' : 'Unduh Word'}</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting !== null}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer active:scale-95"
            title="Ekspor tabel dan rumus jam ke Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isExporting === 'EXCEL' ? 'Mengunduh...' : 'Unduh Excel'}</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
            title="Cetak langsung ke mesin printer fisik atau dialog cetak browser"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>
    </div>
  );
};
