import React from 'react';
import { Info } from 'lucide-react';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
  KaldikWeek,
  MatrixCell,
} from '../../../types/perangkatAjar';
import { usePreviewTabExport } from './hooks/usePreviewTabExport';
import {
  PreviewToolbar,
  PreviewIdentityEditor,
  PreviewDocument,
} from './components/preview';

interface PreviewTabProps {
  identity: DocumentIdentity;
  onUpdateIdentity: (updates: Partial<DocumentIdentity>) => void;
  protaItems: ProtaItem[];
  validation: ProtaValidationResult;
  kaldikWeeks: KaldikWeek[];
  promesCells: MatrixCell[];
  promesCellsSem2?: MatrixCell[];
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  identity,
  onUpdateIdentity,
  protaItems,
  validation,
  kaldikWeeks,
  promesCells,
  promesCellsSem2,
}) => {
  const {
    selectedDoc,
    setSelectedDoc,
    orientation,
    setOrientation,
    showIdentityEditor,
    setShowIdentityEditor,
    isExporting,
    printRef,
    handleExportExcel,
    handleExportWord,
    handleExportPdf,
    handlePrint,
    currentPromesSemester,
    currentPromesItems,
    monthNames,
    activePromesCells,
    protaSem1Items,
    protaSem2Items,
    totalJpSem1,
    totalJpSem2,
    totalPromesTargetJp,
  } = usePreviewTabExport({
    identity,
    protaItems,
    validation,
    kaldikWeeks,
    promesCells,
    promesCellsSem2,
  });

  return (
    <div className="space-y-6">
      {/* Dynamic CSS injection for standard browser Ctrl+P fallback */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm 10mm 8mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* 1. Action Toolbar & Document Switcher */}
      <PreviewToolbar
        selectedDoc={selectedDoc}
        onSelectDoc={setSelectedDoc}
        orientation={orientation}
        onSetOrientation={setOrientation}
        showIdentityEditor={showIdentityEditor}
        onToggleIdentityEditor={() => setShowIdentityEditor((prev) => !prev)}
        isExporting={isExporting}
        onExportPdf={handleExportPdf}
        onExportWord={handleExportWord}
        onExportExcel={handleExportExcel}
        onPrint={() => handlePrint()}
      />

      {/* 2. Identity Editor Panel */}
      {showIdentityEditor && (
        <PreviewIdentityEditor
          identity={identity}
          onUpdateIdentity={onUpdateIdentity}
          onClose={() => setShowIdentityEditor(false)}
        />
      )}

      {/* 3. Live A4 Printable Document Container */}
      <div className="bg-slate-200/70 dark:bg-slate-950 p-2 sm:p-6 rounded-2xl flex flex-col items-center overflow-x-auto print:bg-white print:p-0">
        {/* Mobile Horizontal Swipe Hint */}
        <div className="sm:hidden w-full mb-2.5 px-3 py-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 print:hidden">
          <span className="text-sm">📱</span>
          <span>
            Pratinjau Cetak ({orientation === 'landscape' ? 'Landscape' : 'Portrait'}): Geser horizontal untuk melihat dokumen penuh.
          </span>
        </div>

        {/* Information bar above document preview */}
        <div className="flex flex-wrap items-center justify-between w-full max-w-[297mm] mb-3 px-1 text-xs text-slate-500 dark:text-slate-400 print:hidden gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Format: A4 {orientation === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium hidden sm:inline">
              ✓ Kop Resmi Kementerian Agama RI & Satuan Pendidikan
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Gunakan tombol cetak atau pintasan browser Ctrl+P</span>
          </div>
        </div>

        {/* Sheet Card */}
        <PreviewDocument
          printRef={printRef}
          orientation={orientation}
          identity={identity}
          selectedDoc={selectedDoc}
          currentPromesSemester={currentPromesSemester}
          protaSem1Items={protaSem1Items}
          protaSem2Items={protaSem2Items}
          totalJpSem1={totalJpSem1}
          totalJpSem2={totalJpSem2}
          validation={validation}
          currentPromesItems={currentPromesItems}
          monthNames={monthNames}
          kaldikWeeks={kaldikWeeks}
          activePromesCells={activePromesCells}
          totalPromesTargetJp={totalPromesTargetJp}
        />
      </div>
    </div>
  );
};
