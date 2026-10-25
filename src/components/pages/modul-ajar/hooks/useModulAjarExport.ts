import { useState, useRef } from 'react';
import type React from 'react';
import type { FormState } from '../types';
import type { LessonPlanListItem } from './useModulAjarHistory';
import type { ExportFormat } from '../../../../lib/modulAjarExport/types';
import type { ExportFailure } from '../components/ExportFailureBanner';
import { useToast } from '../../../../hooks/useToast';
import { supabase } from '../../../../services/supabase';
import { sanitizeContent } from '../../../../services/securityEnhanced';
import { extractStudentHtml } from '../utils/template';
import { exportModulAjarToPdf } from '../utils/pdfExport';
import { exportModulAjarToWord } from '../utils/wordExport';
import { printModulAjarHtml } from '../utils/printDocument';
import {
  DocumentExportError,
  downloadBlob,
  isServerDocumentExportEnabled,
  requestDocumentExport,
  type DocumentExportRequest,
} from '../../../../services/documentExportService';

interface ServerExportJob extends DocumentExportRequest {
  /** `preview` or the history item's ID; drives the per-button loading state. */
  source: string;
}

interface UseModulAjarExportParams {
  formState: FormState;
  previewMode: 'guru' | 'siswa';
  isFullscreen: boolean;
  logoBase64: string;
  updateHistoryItem: (id: string, partial: Partial<LessonPlanListItem>) => void;
  loadPlanContent: (plan: { id: string; generated_content?: string | null }) => Promise<string | null>;
  copySuccessLabel: string;
}

export const useModulAjarExport = ({
  formState,
  previewMode,
  isFullscreen,
  logoBase64,
  updateHistoryItem,
  loadPlanContent,
  copySuccessLabel,
}: UseModulAjarExportParams) => {
  const toast = useToast();

  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [currentLessonPlanId, setCurrentLessonPlanId] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<FormState | null>(null);
  const [documentHasEdits, setDocumentHasEdits] = useState<boolean>(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<'unsaved' | 'saving' | 'saved' | 'error' | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportFailure, setExportFailure] = useState<ExportFailure | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  const exportInFlightRef = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fullscreenPreviewRef = useRef<HTMLDivElement>(null);

  const useServerExport = isServerDocumentExportEnabled();

  const previewBusyFormat: 'pdf' | 'docx' | null =
    exportingKey === 'preview:docx'
      ? 'docx'
      : exportingKey === 'preview:pdf' || isExportingPdf
        ? 'pdf'
        : exportingKey !== null
          ? 'pdf'
          : null;

  const getDocumentForOutput = (targetRef: React.RefObject<HTMLDivElement | null>) => {
    const livePreview = targetRef.current?.innerHTML;
    if (livePreview) return livePreview;
    if (!generatedDocument) return '';
    return previewMode === 'siswa'
      ? extractStudentHtml(generatedDocument, documentForm ?? formState, logoBase64)
      : generatedDocument;
  };

  /**
   * Live preview edits are saved to the document as soon as the teacher
   * leaves the text.
   */
  const persistPreviewEdits = async (html: string) => {
    setGeneratedDocument(html);
    if (!hasUnsavedEdits || !currentLessonPlanId) return;
    const lessonPlanId = currentLessonPlanId;
    const cleanHtml = sanitizeContent(html);
    setEditStatus('saving');
    const { error } = await supabase
      .from('lesson_plans')
      .update({ generated_content: cleanHtml, updated_at: new Date().toISOString() })
      .eq('id', lessonPlanId);
    if (error) {
      console.error('Failed to save preview edits:', error);
      setEditStatus('error');
      return;
    }
    setHasUnsavedEdits(false);
    setDocumentHasEdits(true);
    setEditStatus('saved');
    updateHistoryItem(lessonPlanId, { generated_content: cleanHtml });
  };

  const markPreviewEdited = () => {
    setHasUnsavedEdits(true);
    setEditStatus('unsaved');
  };

  const handleCopy = async () => {
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    if (!targetRef.current) return;
    try {
      await navigator.clipboard.writeText(targetRef.current.innerText);
      toast.success(copySuccessLabel);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Gagal menyalin teks');
    }
  };

  const handlePrint = () => {
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const rawContent = getDocumentForOutput(targetRef);
    if (!rawContent) return;
    const printContent = sanitizeContent(rawContent);

    if (!printModulAjarHtml(printContent, formState.paperSize)) {
      toast.error('Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.');
    }
  };

  const runServerExport = async (job: ServerExportJob) => {
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setExportingKey(`${job.source}:${job.format}`);
    setExportFailure(null);
    try {
      const { blob, fileName } = await requestDocumentExport(job);
      downloadBlob(blob, fileName);
      toast.success(
        job.format === 'pdf' ? 'PDF berhasil diunduh' : 'File Word (.docx) berhasil diunduh'
      );
    } catch (err) {
      console.error(`Failed to export ${job.format}:`, err);
      const error = err instanceof DocumentExportError ? err : new DocumentExportError('UNKNOWN');
      setExportFailure({
        message: error.message,
        onRetry: error.retryable ? () => void runServerExport(job) : undefined,
        onPrintFallback: job.format === 'pdf' && job.source === 'preview' ? handlePrint : undefined,
      });
    } finally {
      exportInFlightRef.current = false;
      setExportingKey(null);
    }
  };

  const exportPreviewFromServer = (format: ExportFormat) => {
    if (!currentLessonPlanId) {
      setExportFailure({
        message: 'Dokumen ini belum tersimpan. Susun ulang dokumen agar tersimpan, lalu unduh lagi.',
      });
      return;
    }
    if (hasUnsavedEdits) {
      setPendingExportFormat(format);
      return;
    }
    void runServerExport({
      source: 'preview',
      lessonPlanId: currentLessonPlanId,
      format,
      paperSize: formState.paperSize === 'F4' ? 'F4' : 'A4',
      variant: previewMode,
    });
  };

  /** Persists live preview edits, then exports the saved version. */
  const saveDraftAndExport = async () => {
    const format = pendingExportFormat;
    const lessonPlanId = currentLessonPlanId;
    if (!format || !lessonPlanId) return;

    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const liveHtml = previewMode === 'guru' ? targetRef.current?.innerHTML : undefined;
    const cleanHtml = sanitizeContent(liveHtml || generatedDocument);

    setIsSavingDraft(true);
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({ generated_content: cleanHtml, updated_at: new Date().toISOString() })
        .eq('id', lessonPlanId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save draft before export:', err);
      toast.error('Perubahan gagal disimpan. Periksa koneksi, lalu coba lagi.');
      throw err;
    } finally {
      setIsSavingDraft(false);
    }

    setGeneratedDocument(cleanHtml);
    setHasUnsavedEdits(false);
    setDocumentHasEdits(true);
    setEditStatus('saved');
    updateHistoryItem(lessonPlanId, { generated_content: cleanHtml });
    void runServerExport({
      source: 'preview',
      lessonPlanId,
      format,
      paperSize: formState.paperSize === 'F4' ? 'F4' : 'A4',
      variant: previewMode,
    });
  };

  const exportHistoryFromServer = (item: any, format: ExportFormat) => {
    void runServerExport({
      source: item.id,
      lessonPlanId: item.id,
      format,
      paperSize: item.components?.paperSize === 'F4' ? 'F4' : 'A4',
      variant: 'guru',
    });
  };

  const handleExportPdf = async () => {
    if (useServerExport) {
      exportPreviewFromServer('pdf');
      return;
    }
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const documentToExport = getDocumentForOutput(targetRef);

    if (!documentToExport) return;

    setIsExportingPdf(true);
    toast.info('Menyiapkan file PDF, mohon tunggu sebentar...', { duration: 3000 });
    try {
      const typeSuffix = previewMode === 'siswa' ? 'LKPD_Siswa' : formState.documentType;
      const fileName = `${typeSuffix}_${formState.mataPelajaran}_Kelas${formState.kelas}`
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_');
      await exportModulAjarToPdf({
        htmlContent: documentToExport,
        fileName,
        paperSize: formState.paperSize,
      });
      toast.info('Pilih Simpan sebagai PDF pada dialog cetak untuk menyimpan dokumen.');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportWord = async () => {
    if (useServerExport) {
      exportPreviewFromServer('docx');
      return;
    }
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const htmlContent = getDocumentForOutput(targetRef);
    if (!htmlContent) return;

    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setExportingKey('preview:docx');
    try {
      const typeSuffix = previewMode === 'siswa' ? 'LKPD_Siswa' : formState.documentType;
      await exportModulAjarToWord({
        htmlContent,
        fileName: `${typeSuffix}_${formState.mataPelajaran}_Kelas${formState.kelas}`,
        paperSize: formState.paperSize,
        title: `${typeSuffix} ${formState.mataPelajaran}`,
      });
      toast.success('File Word (.docx) berhasil diunduh');
    } catch (err: unknown) {
      console.error('Failed to export Word:', err);
      toast.error(
        `Gagal mengunduh Word: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`
      );
    } finally {
      exportInFlightRef.current = false;
      setExportingKey(null);
    }
  };

  const handleExportHistoryPdf = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (useServerExport) {
      exportHistoryFromServer(item, 'pdf');
      return;
    }
    const htmlContent = await loadPlanContent(item);
    if (!htmlContent) return;

    toast.info('Menyiapkan file PDF, mohon tunggu sebentar...', { duration: 3000 });
    try {
      const fileName =
        `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}`
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_');
      await exportModulAjarToPdf({
        htmlContent,
        fileName,
        paperSize: item.components?.paperSize === 'F4' ? 'F4' : 'A4',
      });
      toast.info('Pilih Simpan sebagai PDF pada dialog cetak untuk menyimpan dokumen.');
    } catch (err: any) {
      console.error('Failed to export history PDF:', err);
      toast.error(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleExportHistoryWord = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (useServerExport) {
      exportHistoryFromServer(item, 'docx');
      return;
    }
    const htmlContent = await loadPlanContent(item);
    if (!htmlContent) return;
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setExportingKey(`${item.id}:docx`);
    try {
      await exportModulAjarToWord({
        htmlContent,
        fileName: `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}`,
        paperSize: item.components?.paperSize === 'F4' ? 'F4' : 'A4',
        title: item.document_type || 'Modul Ajar',
      });
      toast.success('File Word (.docx) berhasil diunduh');
    } catch (err: unknown) {
      console.error('Failed to export history Word:', err);
      toast.error(
        `Gagal mengunduh Word: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`
      );
    } finally {
      exportInFlightRef.current = false;
      setExportingKey(null);
    }
  };

  const clearDocument = () => {
    setCurrentLessonPlanId(null);
    setGeneratedDocument('');
    setDocumentForm(null);
    setDocumentHasEdits(false);
    setHasUnsavedEdits(false);
    setEditStatus(null);
  };

  return {
    generatedDocument,
    setGeneratedDocument,
    currentLessonPlanId,
    setCurrentLessonPlanId,
    documentForm,
    setDocumentForm,
    documentHasEdits,
    setDocumentHasEdits,
    hasUnsavedEdits,
    setHasUnsavedEdits,
    editStatus,
    setEditStatus,
    exportingKey,
    setExportingKey,
    isExportingPdf,
    exportFailure,
    setExportFailure,
    pendingExportFormat,
    setPendingExportFormat,
    isSavingDraft,
    previewRef,
    fullscreenPreviewRef,
    previewBusyFormat,
    useServerExport,
    persistPreviewEdits,
    markPreviewEdited,
    handleCopy,
    handlePrint,
    handleExportPdf,
    handleExportWord,
    handleExportHistoryPdf,
    handleExportHistoryWord,
    saveDraftAndExport,
    clearDocument,
  };
};
