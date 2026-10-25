import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ModulAjarControlStripProps {
  previewMode: 'guru' | 'siswa';
  onPreviewModeChange: (mode: 'guru' | 'siswa') => void;
  paperSize: string;
  onPaperSizeChange: (size: 'A4' | 'F4') => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  labels: {
    performaGuru: string;
    lembarSiswa: string;
  };
}

export const ModulAjarControlStrip: React.FC<ModulAjarControlStripProps> = ({
  previewMode,
  onPreviewModeChange,
  paperSize,
  onPaperSizeChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  labels,
}) => {
  return (
    <div className="min-h-11 py-1.5 bg-slate-50/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between px-3 sm:px-4 shrink-0 z-10 gap-2">
      {/* Left: Mode Switcher (Target Dokumen) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline">
          Target Dokumen:
        </span>
        <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onPreviewModeChange('guru')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap flex items-center gap-1.5 ${
              previewMode === 'guru'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Dokumen Lengkap Guru (Modul Ajar + Asesmen)"
          >
            <span>{labels.performaGuru}</span>
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange('siswa')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap flex items-center gap-1.5 ${
              previewMode === 'siswa'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Lembar Kerja Peserta Didik (LKPD) Khusus Siswa"
          >
            <span>{labels.lembarSiswa}</span>
          </button>
        </div>
      </div>

      {/* Right: Paper Size & Zoom Level */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Paper Size Switcher */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onPaperSizeChange('A4')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer active:scale-95 duration-150 ${
              (paperSize || 'A4') === 'A4'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Format Kertas A4 (210 × 297 mm)"
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => onPaperSizeChange('F4')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer active:scale-95 duration-150 ${
              paperSize === 'F4'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Format Kertas F4 / Folio (215 × 330 mm)"
          >
            F4
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-90"
            title="Perkecil (Zoom Out)"
            aria-label="Perkecil Skala"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            className="px-1.5 text-[10px] font-semibold hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-95 min-w-[36px] text-center"
            title="Reset Skala 100%"
          >
            {zoomLevel}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-90"
            title="Perbesar (Zoom In)"
            aria-label="Perbesar Skala"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
