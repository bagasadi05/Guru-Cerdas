import React from 'react';
import { MotionDiv, AnimatePresence } from '../../../ui/MotionComponents';
import {
  BookOpen,
  Copy,
  Printer,
  FileText,
  FileDown,
  Minimize2,
} from 'lucide-react';
import { DownloadMenu } from './DownloadMenu';
import { ExportFailureBanner, type ExportFailure } from './ExportFailureBanner';
import { ModulAjarPreview } from './ModulAjarPreview';
import { extractStudentHtml } from '../utils/template';
import { useToast } from '../../../../hooks/useToast';
import type { FormState } from '../types';

interface ModulAjarFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  formState: FormState;
  previewMode: 'guru' | 'siswa';
  onPreviewModeChange: (mode: 'guru' | 'siswa') => void;
  generatedDocument: string;
  documentForm: FormState | null;
  logoBase64: string;
  fullscreenPreviewRef: React.RefObject<HTMLDivElement | null>;
  previewBusyFormat: 'pdf' | 'docx' | null;
  useServerExport: boolean;
  exportFailure: ExportFailure | null;
  onDismissExportFailure: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
  onPrint: () => void;
  onCopy: () => void;
  onPersistEdits: (html: string) => void;
  onMarkEdited: () => void;
  editStatus: 'unsaved' | 'saving' | 'saved' | 'error' | null;
  labels: {
    performaGuru: string;
    lembarSiswa: string;
    pdf: string;
    word: string;
    print: string;
    copy: string;
  };
}

export const ModulAjarFullscreenModal: React.FC<ModulAjarFullscreenModalProps> = ({
  isOpen,
  onClose,
  formState,
  previewMode,
  onPreviewModeChange,
  generatedDocument,
  documentForm,
  logoBase64,
  fullscreenPreviewRef,
  previewBusyFormat,
  useServerExport,
  exportFailure,
  onDismissExportFailure,
  onExportPdf,
  onExportWord,
  onPrint,
  onCopy,
  onPersistEdits,
  onMarkEdited,
  editStatus,
  labels,
}) => {
  const toast = useToast();

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col"
        >
          {/* Fullscreen Toolbar */}
          <div className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-600 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {formState.documentType} {formState.mataPelajaran || 'Pratinjau'} - Kelas{' '}
                  {formState.kelas}
                </h3>
                <p className="text-xs text-slate-400">
                  Mode Fokus Layar Penuh &bull; Klik teks untuk mengedit langsung
                </p>
              </div>
            </div>

            {/* Center Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onPreviewModeChange('guru')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                  previewMode === 'guru'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dokumen Lengkap Guru (Modul Ajar + Asesmen)"
              >
                {labels.performaGuru}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    !extractStudentHtml(
                      generatedDocument,
                      documentForm ?? formState,
                      logoBase64
                    )
                  ) {
                    toast.error(
                      'LKPD dan lembar evaluasi tidak dapat dikenali. Susun ulang dokumen terlebih dahulu.'
                    );
                    return;
                  }
                  onPreviewModeChange('siswa');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                  previewMode === 'siswa'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Lembar Kerja Peserta Didik (LKPD) Khusus Siswa"
              >
                {labels.lembarSiswa}
              </button>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-2">
              <DownloadMenu
                tone="dark"
                busy={previewBusyFormat !== null}
                items={[
                  {
                    id: 'pdf',
                    label: labels.pdf,
                    description: 'Siap cetak, tata letak A4/F4 tetap',
                    icon: FileDown,
                    onSelect: onExportPdf,
                  },
                  {
                    id: 'word',
                    label: labels.word,
                    description: useServerExport
                      ? 'Berkas .docx, bisa diedit di Word'
                      : 'Berkas .doc, bisa diedit di Word',
                    icon: FileText,
                    onSelect: onExportWord,
                  },
                  {
                    id: 'print',
                    label: labels.print,
                    description: 'Buka dialog printer',
                    icon: Printer,
                    onSelect: onPrint,
                  },
                  {
                    id: 'copy',
                    label: labels.copy,
                    icon: Copy,
                    onSelect: onCopy,
                    separatorBefore: true,
                  },
                ]}
              />
              <button
                onClick={onClose}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white ml-2 transition-all cursor-pointer active:scale-95 duration-150"
                title="Keluar Layar Penuh"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {exportFailure && (
            <ExportFailureBanner
              failure={exportFailure}
              onDismiss={onDismissExportFailure}
              tone="dark"
            />
          )}

          {/* Fullscreen Document Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-12 flex justify-center bg-slate-950/60">
            <div className="w-full max-w-4xl">
              <ModulAjarPreview
                generatedDocument={
                  previewMode === 'siswa'
                    ? extractStudentHtml(
                        generatedDocument,
                        documentForm ?? formState,
                        logoBase64
                      )
                    : generatedDocument
                }
                previewRef={fullscreenPreviewRef as React.RefObject<HTMLDivElement>}
                documentType={formState.documentType}
                zoomLevel={100}
                paperSize={formState.paperSize}
                onDocumentChange={previewMode === 'guru' ? onPersistEdits : undefined}
                onEdit={onMarkEdited}
                editStatus={previewMode === 'guru' ? editStatus : null}
              />
            </div>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
