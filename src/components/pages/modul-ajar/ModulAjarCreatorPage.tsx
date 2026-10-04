import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';
import {
  BookOpen,
  Copy,
  Printer,
  FileText,
  FileDown,
  ZoomIn,
  ZoomOut,
  Minimize2,
} from 'lucide-react';
import { useTranslation } from '../../../utils/i18n';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { FormState } from './types';
import { extractStudentHtml } from './utils/template';
import { exportModulAjarToPdf } from './utils/pdfExport';
import { exportModulAjarToWord } from './utils/wordExport';
import { printModulAjarHtml } from './utils/printDocument';
import { sanitizeContent } from '../../../services/securityEnhanced';
import { useModulAjarAiJob } from './hooks/useModulAjarAiJob';
import {
  generateTujuanPembelajaran,
  generatePemahamanBermakna,
  generatePertanyaanPemantik,
  generateMateriAjar,
  generateLkpdTugas,
  generateSoalEvaluasi,
  generatePengayaan,
  generateRemedial,
  generateGlosarium,
  generateDaftarPustaka,
  generateKompetensiAwal,
  generateCapaianPembelajaran,
} from '../../../services/modulAjarAiFieldGenerator';
import { ModulAjarForm } from './components/ModulAjarForm';
import { ModulAjarHistory } from './components/ModulAjarHistory';
import { ModulAjarPreview } from './components/ModulAjarPreview';
import { CONTENT_FIELDS, type ContentField, useModulAjarForm } from './hooks/useModulAjarForm';
import { buildAiPromptContext } from './utils/aiPromptContext';
import { useModulAjarGenerator } from './hooks/useModulAjarGenerator';
import { type LessonPlanListItem, useModulAjarHistory } from './hooks/useModulAjarHistory';
import { UndoBar } from './components/UndoBar';
import { useToast } from '../../../hooks/useToast';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';
import { ExportFailureBanner, type ExportFailure } from './components/ExportFailureBanner';
import { ModulAjarToolbar } from './components/ModulAjarToolbar';
import { AiWaitingCard } from './components/AiWaitingCard';
import { DownloadMenu } from './components/DownloadMenu';
import {
  DocumentExportError,
  downloadBlob,
  isServerDocumentExportEnabled,
  requestDocumentExport,
  type DocumentExportRequest,
} from '../../../services/documentExportService';
import type { ExportFormat } from '../../../lib/modulAjarExport/types';

const isContentField = (field: string): field is ContentField =>
  (CONTENT_FIELDS as readonly string[]).includes(field);

interface ServerExportJob extends DocumentExportRequest {
  /** `preview` or the history item's ID; drives the per-button loading state. */
  source: string;
}

const ModulAjarCreatorPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  const {
    formState,
    setFormState,
    activeStep,
    setActiveStep,
    isGeneratingCP,
    boilerplateMissingBanner,
    models,
    isLoadingModels,
    handleInputChange,
    handleProfilToggle,
    handleMetodeToggle,
    generateCP,
    resetFormToDraft,
    autoDistributeTime,
    isFieldOwnedByTeacher,
    applyGeneratedContent,
    setFieldFromAi,
  } = useModulAjarForm();

  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [mobileActiveView, setMobileActiveView] = useState<'form' | 'preview'>('form');
  const [previewMode, setPreviewMode] = useState<'guru' | 'siswa'>('guru');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    history,
    isLoading: isLoadingHistory,
    error: historyError,
    fetchHistory,
    loadPlanContent: fetchPlanContent,
    softDelete,
    undoDelete,
    updateLocal: updateHistoryItem,
  } = useModulAjarHistory(user?.id);
  /** The document just removed from Riwayat, while Urungkan is still offered. */
  const [deletedPlan, setDeletedPlan] = useState<LessonPlanListItem | null>(null);
  // Stable, so the undo bar's timer is not restarted by every re-render.
  const clearDeletedPlan = useCallback(() => setDeletedPlan(null), []);

  const [aiCacheWarning, setAiCacheWarning] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [fieldLoading, setFieldLoading] = useState<Record<string, boolean>>({});
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [currentLessonPlanId, setCurrentLessonPlanId] = useState<string | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportFailure, setExportFailure] = useState<ExportFailure | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  /** Saving state of live preview edits. */
  const [editStatus, setEditStatus] = useState<'unsaved' | 'saving' | 'saved' | 'error' | null>(null);
  /** The form the displayed document was built from (identity on the student sheet). */
  const [documentForm, setDocumentForm] = useState<FormState | null>(null);
  /**
   * The displayed document holds text typed in the preview. A regenerated
   * document is built from the form, so those edits would not carry over.
   */
  const [documentHasEdits, setDocumentHasEdits] = useState<boolean>(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState<boolean>(false);
  const exportInFlightRef = useRef(false);
  const useServerExport = isServerDocumentExportEnabled();

  const previewRef = useRef<HTMLDivElement>(null);
  const fullscreenPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/logo_sekolah.png')
      .then((res) => {
        if (!res.ok) return null;
        return res.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => console.error('Failed to load logo_sekolah.png:', err));
  }, []);

  /** Loads one saved document's HTML; history rows are listed without it. */
  const loadPlanContent = async (plan: { id: string; generated_content?: string | null }) => {
    const content = await fetchPlanContent(plan);
    if (content === null) toast.error('Dokumen gagal dimuat. Periksa koneksi, lalu coba lagi.');
    return content;
  };

  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';

  const {
    generateManualModulAjar,
    renderPrivateDraftAiModulAjar,
    isAiGenerating,
    isSubmitting: isGeneratorSubmitting,
  } = useModulAjarGenerator({
      formState,
      setFormState,
      user,
      models,
      t,
      isAiEnabled,
      logoBase64,
      fetchHistory,
      setGeneratedDocument,
      onDocumentSaved: (lessonPlanId, builtFrom) => {
        setCurrentLessonPlanId(lessonPlanId);
        setDocumentForm(builtFrom);
        setDocumentHasEdits(false);
        setHasUnsavedEdits(false);
        setEditStatus(null);
      },
      setAiCacheWarning,
      isFieldOwnedByTeacher,
      applyGeneratedContent,
      notify: { success: toast.success, error: toast.error },
    });

  const queueHookResult = useModulAjarAiJob(
    formState,
    async (resultJson) => {
      if (resultJson) {
        await renderPrivateDraftAiModulAjar(resultJson);
      } else {
        await generateManualModulAjar();
      }
      fetchHistory();
    },
    (errMsg) => {
      console.warn(`[AI Queue] Job error: ${errMsg}`);
      toast.error(errMsg || 'Gagal menyusun modul ajar dengan AI. Silakan coba lagi.');
    },
    () =>
      buildAiPromptContext(
        formState,
        isFieldOwnedByTeacher('manualTujuanPembelajaran') ? formState.manualTujuanPembelajaran : '',
      ),
  );

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';

  const runGenerate = () => {
    setRegenerateConfirmOpen(false);
    setMobileActiveView('preview');
    if (isAiEnabled) {
      queueHookResult.startJob();
    } else {
      generateManualModulAjar();
    }
  };

  const handleGenerate = () => {
    if (!formState.mataPelajaran || !formState.topik) {
      toast.error(t.lessonPlan.validateSubject);
      return;
    }
    if (!formState.capaianPembelajaran && !formState.manualTujuanPembelajaran) {
      toast.error('Lengkapi Capaian atau Tujuan Pembelajaran sebelum menyusun modul ajar.');
      setActiveStep(4);
      return;
    }
    if (formState.profilPelajar.length === 0 || !formState.modelPembelajaran) {
      toast.error('Pilih profil pelajar dan model pembelajaran sebelum menyusun modul ajar.');
      setActiveStep(formState.profilPelajar.length === 0 ? 3 : 5);
      return;
    }
    if (generatedDocument && documentHasEdits) {
      setRegenerateConfirmOpen(true);
      return;
    }
    runGenerate();
  };

  const FIELD_LABELS: Record<string, string> = {
    manualTujuanPembelajaran: 'Tujuan Pembelajaran',
    manualPemahamanBermakna: 'Pemahaman Bermakna',
    manualPertanyaanPemantik: 'Pertanyaan Pemantik',
    manualMateriAjar: 'Ringkasan Materi Ajar',
    manualLkpdTugas: 'Lembar Kerja Peserta Didik (LKPD)',
    manualSoalEvaluasi: 'Soal Evaluasi & Penskoran',
    manualPengayaan: 'Aktivitas Pengayaan',
    manualRemedial: 'Aktivitas Remedial',
    manualGlosarium: 'Glosarium',
    manualDaftarPustaka: 'Daftar Pustaka',
    kompetensiAwal: 'Kompetensi Awal',
    capaianPembelajaran: 'Capaian Pembelajaran',
  };

  const handleAiFillField = async (field: string) => {
    if (!formState.mataPelajaran?.trim() || !formState.topik?.trim()) {
      toast.error('Silakan isi Mata Pelajaran dan Topik terlebih dahulu sebelum menggunakan AI.');
      return;
    }

    const label = FIELD_LABELS[field] || 'konten';
    setFieldLoading((prev) => ({ ...prev, [field]: true }));
    try {
      const ctx = {
        mapel: formState.mataPelajaran.trim(),
        topik: formState.topik.trim(),
        fase: formState.fase || 'A',
        kelas: formState.kelas,
        modelPembelajaran: formState.modelPembelajaran,
        alokasiWaktu: `${formState.jpPerPertemuan} JP × ${formState.durasiPerJp} menit`,
        profilPelajarPancasila: formState.profilPelajar,
        temaKbc: formState.temaKbc,
        materiInsersi: formState.materiInsersi,
        isKbcIntegrated:
          formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta',
      };
      let content = '';

      switch (field) {
        case 'manualTujuanPembelajaran':
          content = await generateTujuanPembelajaran(ctx);
          break;
        case 'manualPemahamanBermakna':
          content = await generatePemahamanBermakna(ctx);
          break;
        case 'manualPertanyaanPemantik':
          content = await generatePertanyaanPemantik(ctx);
          break;
        case 'manualMateriAjar':
          content = await generateMateriAjar(ctx);
          break;
        case 'manualLkpdTugas':
          content = await generateLkpdTugas(ctx);
          break;
        case 'manualSoalEvaluasi':
          content = await generateSoalEvaluasi(ctx);
          break;
        case 'manualPengayaan':
          content = await generatePengayaan(ctx);
          break;
        case 'manualRemedial':
          content = await generateRemedial(ctx);
          break;
        case 'manualGlosarium':
          content = await generateGlosarium(ctx);
          break;
        case 'manualDaftarPustaka':
          content = await generateDaftarPustaka(ctx);
          break;
        case 'kompetensiAwal':
          content = await generateKompetensiAwal(ctx);
          break;
        case 'capaianPembelajaran':
          content = await generateCapaianPembelajaran(ctx);
          break;
        default:
          return;
      }

      if (content) {
        if (isContentField(field)) setFieldFromAi(field, content);
        else handleInputChange(field as keyof FormState, content);
        toast.success(`✨ ${label} berhasil disusun oleh AI!`);
      } else {
        toast.error(`Gagal menghasilkan ${label}. Silakan coba lagi.`);
      }
    } catch (err: any) {
      console.error(`[AI Field] ${field} generation failed:`, err);
      toast.error(err.message || `Gagal menyusun ${label} dengan AI. Silakan coba lagi.`);
    } finally {
      setFieldLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const previewBusyFormat: 'pdf' | 'docx' | null =
    exportingKey === 'preview:docx'
      ? 'docx'
      : exportingKey === 'preview:pdf' || isExportingPdf
        ? 'pdf'
        : exportingKey !== null
          ? 'pdf'
          : null;

  const handleCopy = async () => {
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    if (!targetRef.current) return;
    try {
      await navigator.clipboard.writeText(targetRef.current.innerText);
      toast.success(t.lessonPlan.copySuccess);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Gagal menyalin teks');
    }
  };

  const getDocumentForOutput = (targetRef: React.RefObject<HTMLDivElement>) => {
    const livePreview = targetRef.current?.innerHTML;
    if (livePreview) return livePreview;
    if (!generatedDocument) return '';
    return previewMode === 'siswa'
      ? extractStudentHtml(generatedDocument, documentForm ?? formState, logoBase64)
      : generatedDocument;
  };

  /**
   * Live preview edits are saved to the document as soon as the teacher
   * leaves the text. Before, they only reached the database through the
   * server export dialog and were lost on reload.
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

  const runServerExport = async (job: ServerExportJob) => {
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setExportingKey(`${job.source}:${job.format}`);
    setExportFailure(null);
    try {
      const { blob, fileName } = await requestDocumentExport(job);
      downloadBlob(blob, fileName);
      toast.success(
        job.format === 'pdf' ? 'PDF berhasil diunduh' : 'File Word (.docx) berhasil diunduh',
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
      // Rethrow so the confirmation dialog stays open for another attempt.
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
      toast.success('PDF berhasil diunduh!');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
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

  const handleExportWord = () => {
    if (useServerExport) {
      exportPreviewFromServer('docx');
      return;
    }
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const htmlContent = getDocumentForOutput(targetRef);
    if (!htmlContent) return;

    try {
      const typeSuffix = previewMode === 'siswa' ? 'LKPD_Siswa' : formState.documentType;
      exportModulAjarToWord({
        htmlContent,
        fileName: `${typeSuffix}_${formState.mataPelajaran}_Kelas${formState.kelas}`,
        paperSize: formState.paperSize,
        title: `${typeSuffix} ${formState.mataPelajaran}`,
      });
      toast.success('File Word (.doc) berhasil diunduh');
    } catch (err: unknown) {
      console.error('Failed to export Word:', err);
      toast.error(
        `Gagal mengunduh Word: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`,
      );
    }
  };

  /**
   * Removes a document from Riwayat right away and offers Urungkan for 10 s.
   * The row is soft-deleted, so undoing brings it back unchanged.
   */
  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let removed: LessonPlanListItem | null;
    try {
      removed = await softDelete(id);
    } catch (err) {
      console.error('Failed to delete history item:', err);
      toast.error('Gagal menghapus. Periksa koneksi, lalu coba lagi.');
      return;
    }
    // The document on screen was the one deleted: nothing left to show or save to.
    if (id === currentLessonPlanId) {
      setCurrentLessonPlanId(null);
      setGeneratedDocument('');
      setDocumentForm(null);
      setDocumentHasEdits(false);
      setHasUnsavedEdits(false);
      setEditStatus(null);
    }
    if (removed) setDeletedPlan(removed);
  };

  const undoDeletePlan = async () => {
    const plan = deletedPlan;
    setDeletedPlan(null);
    if (!plan) return;
    try {
      await undoDelete(plan);
      toast.success('Modul ajar dikembalikan ke Riwayat.');
    } catch (err) {
      console.error('Failed to undo delete:', err);
      toast.error('Gagal mengembalikan modul ajar. Coba lagi.');
    }
  };

  const restoreParameters = async (plan: any) => {
    const content = await loadPlanContent(plan);
    if (content === null) return;
    const restored = resetFormToDraft(plan);
    setDocumentForm(restored);
    setGeneratedDocument(content);
    setCurrentLessonPlanId(plan.id);
    // A plan updated well after it was created was edited in the preview.
    setDocumentHasEdits(
      Boolean(plan.updated_at) && Date.parse(plan.updated_at) - Date.parse(plan.created_at) > 5000,
    );
    setHasUnsavedEdits(false);
    setEditStatus(null);
    setActiveTab('preview');
    setMobileActiveView('preview');
    toast.success(t.lessonPlan.restoreSuccess);
  };

  const handleApplyPreset = (presetData: Partial<FormState>) => {
    setFormState((prev) => ({
      ...prev,
      ...presetData,
    }));
    toast.success(`Preset ${presetData.mataPelajaran || 'Modul Ajar'} berhasil dimuat!`);
  };

  const handleDuplicateHistory = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    resetFormToDraft(item);
    // The copy is a new draft: the old document must not stay on screen as if it were it.
    setGeneratedDocument('');
    setCurrentLessonPlanId(null);
    setDocumentForm(null);
    setDocumentHasEdits(false);
    setHasUnsavedEdits(false);
    setEditStatus(null);
    setActiveTab('preview');
    setMobileActiveView('form');
    toast.success(
      `Isian ${item.identity?.mapel || 'modul ajar'} disalin ke formulir. Ubah seperlunya, lalu susun dokumen baru.`,
    );
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
      toast.success('PDF berhasil diunduh!');
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
    try {
      exportModulAjarToWord({
        htmlContent,
        fileName: `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}`,
        paperSize: item.components?.paperSize === 'F4' ? 'F4' : 'A4',
        title: item.document_type || 'Modul Ajar',
      });
      toast.success('File Word (.doc) berhasil diunduh');
    } catch (err: unknown) {
      console.error('Failed to export history Word:', err);
      toast.error(
        `Gagal mengunduh Word: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`,
      );
    }
  };

  const handleConfirmReset = () => {
    resetFormToDraft();
    setGeneratedDocument('');
    setCurrentLessonPlanId(null);
    setDocumentForm(null);
    setDocumentHasEdits(false);
    setHasUnsavedEdits(false);
    setEditStatus(null);
    setActiveStep(1);
    setResetConfirmOpen(false);
    toast.success('Formulir berhasil direset');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-5 pb-20 lg:pb-0">
      {deletedPlan && (
        <UndoBar
          key={deletedPlan.id}
          message="Modul ajar dihapus dari Riwayat."
          onUndo={undoDeletePlan}
          onExpire={clearDeletedPlan}
        />
      )}

      {/* Regenerating replaces preview edits with a document built from the form */}
      <ConfirmationDialog
        isOpen={regenerateConfirmOpen}
        title="Susun ulang dokumen?"
        message="Dokumen baru dibuat dari isian formulir, jadi perubahan yang Anda ketik langsung di dokumen tidak ikut. Dokumen yang sekarang tetap tersimpan sebagai versi sebelumnya di Riwayat."
        onConfirm={runGenerate}
        onClose={() => setRegenerateConfirmOpen(false)}
        variant="warning"
        confirmText="Susun Ulang"
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={resetConfirmOpen}
        title="Reset Formulir Modul Ajar?"
        message="Seluruh isian formulir saat ini akan dikembalikan ke pengaturan awal. Pastikan draf penting sudah tersimpan."
        onConfirm={handleConfirmReset}
        onClose={() => setResetConfirmOpen(false)}
        variant="warning"
        confirmText="Ya, Reset Form"
      />

      {/* Unsaved preview edits: the server exports the stored document */}
      <ConfirmationDialog
        isOpen={!!pendingExportFormat}
        title="Simpan perubahan sebelum mengunduh?"
        message="Berkas dibuat dari dokumen yang tersimpan. Simpan dulu agar perubahan Anda ikut masuk ke berkas."
        onConfirm={saveDraftAndExport}
        onClose={() => setPendingExportFormat(null)}
        variant="info"
        confirmText="Simpan & Unduh"
        isPending={isSavingDraft}
      />

      {/* AI Cache Warning Toast */}
      {aiCacheWarning && (
        <div className="fixed top-16 right-4 z-50 max-w-sm bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 dark:text-amber-400 font-bold">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">
                Draf AI tidak tersimpan ke Bank
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{aiCacheWarning}</p>
            </div>
            <button
              onClick={() => setAiCacheWarning(null)}
              className="text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 font-bold px-1"
              aria-label="Tutup peringatan"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobile Segmented View Switcher (< lg) */}
      <div className="lg:hidden flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
        <button
          type="button"
          onClick={() => setMobileActiveView('form')}
          className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mobileActiveView === 'form'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Formulir Modul</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveView('preview')}
          className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mobileActiveView === 'preview'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>2. Pratinjau & Riwayat</span>
          {generatedDocument && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Left Column: Form & Step Wizard */}
      <ModulAjarForm
        formState={formState}
        onChange={handleInputChange}
        onProfilToggle={handleProfilToggle}
        onMetodeToggle={handleMetodeToggle}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        isGeneratingCP={isGeneratingCP}
        onGenerateCP={generateCP}
        models={models}
        isLoadingModels={isLoadingModels}
        queueStatus={queueStatus}
        onGenerate={handleGenerate}
        boilerplateMissingBanner={boilerplateMissingBanner}
        onAiFillField={handleAiFillField}
        fieldLoading={fieldLoading}
        isAiGenerating={isAiGenerating || isGeneratorSubmitting}
        onResetForm={() => setResetConfirmOpen(true)}
        onApplyPreset={handleApplyPreset}
        autoDistributeTime={autoDistributeTime}
        className={mobileActiveView === 'form' ? 'flex' : 'hidden lg:flex'}
      />

      {/* Right Column: Preview & History Workspace */}
      <div
        className={`flex-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] ${
          mobileActiveView === 'preview' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
        }`}
      >
        <ModulAjarToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          historyCount={history.length}
          hasDocument={!!generatedDocument}
          busyFormat={previewBusyFormat}
          onExportPdf={handleExportPdf}
          onExportWord={handleExportWord}
          onPrint={handlePrint}
          onCopy={handleCopy}
          onFullscreen={() => setIsFullscreen(true)}
          wordExtension={useServerExport ? 'docx' : 'doc'}
          labels={{
            preview: t.lessonPlan.preview,
            history: t.lessonPlan.history,
            copy: t.lessonPlan.copy,
            pdf: t.lessonPlan.pdf,
            word: t.lessonPlan.word,
            print: t.lessonPlan.print,
          }}
        />

        {/* Secondary Document Control Strip: Target Dokumen & Canvas Format */}
        {activeTab === 'preview' && generatedDocument && (
          <div className="min-h-11 py-1.5 bg-slate-50/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between px-3 sm:px-4 shrink-0 z-10 gap-2">
            {/* Left: Mode Switcher (Target Dokumen) */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline">
                Target Dokumen:
              </span>
              <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setPreviewMode('guru')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                    previewMode === 'guru'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  title="Dokumen Lengkap Guru (Modul Ajar + Asesmen)"
                >
                  <span>{t.lessonPlan.performaGuru}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('siswa')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                    previewMode === 'siswa'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  title="Lembar Kerja Peserta Didik (LKPD) Khusus Siswa"
                >
                  <span>{t.lessonPlan.lembarSiswa}</span>
                </button>
              </div>
            </div>

            {/* Right: Paper Size & Zoom Level */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Paper Size Switcher */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleInputChange('paperSize', 'A4')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer active:scale-95 duration-150 ${
                    (formState.paperSize || 'A4') === 'A4'
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Format Kertas A4 (210 × 297 mm)"
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('paperSize', 'F4')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer active:scale-95 duration-150 ${
                    formState.paperSize === 'F4'
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
                  onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-90"
                  title="Perkecil (Zoom Out)"
                  aria-label="Perkecil Skala"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-1.5 text-[10px] font-semibold hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-95 min-w-[36px] text-center"
                  title="Reset Skala 100%"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-90"
                  title="Perbesar (Zoom In)"
                  aria-label="Perbesar Skala"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {exportFailure && (
          <ExportFailureBanner failure={exportFailure} onDismiss={() => setExportFailure(null)} />
        )}

        {/* Workspace Canvas Body */}
        <div className="relative flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/50 scrollbar-thin">
          {activeTab === 'preview' ? (
            <>
              {/* AI fallback inside the template path (no job to cancel) */}
              {isAiGenerating && <AiWaitingCard title="AI sedang menyusun dokumen" />}

              {(queueStatus === 'pending' || queueStatus === 'processing') && (
                <AiWaitingCard
                  title="AI sedang menyusun modul ajar"
                  startedAt={queueHookResult.startedAt}
                  onCancel={() => {
                    queueHookResult.cancelJob();
                    toast.info('Penyusunan dibatalkan. Isian formulir tidak berubah.');
                  }}
                />
              )}

              {/* Main Document Preview */}
              {(() => {
                const documentToShow =
                  previewMode === 'siswa'
                    ? extractStudentHtml(generatedDocument, documentForm ?? formState, logoBase64)
                    : generatedDocument;
                return (
                  <ModulAjarPreview
                    generatedDocument={documentToShow}
                    previewRef={previewRef}
                    documentType={formState.documentType}
                    zoomLevel={zoomLevel}
                    paperSize={formState.paperSize}
                    onDocumentChange={previewMode === 'guru' ? persistPreviewEdits : undefined}
                    onEdit={markPreviewEdited}
                    editStatus={previewMode === 'guru' ? editStatus : null}
                  />
                );
              })()}
            </>
          ) : (
            <ModulAjarHistory
              history={history}
              isLoading={isLoadingHistory}
              error={historyError}
              onRestore={restoreParameters}
              onDelete={deleteHistoryItem}
              onExportPdf={handleExportHistoryPdf}
              onExportWord={handleExportHistoryWord}
              onDuplicate={handleDuplicateHistory}
              exportingKey={exportingKey}
            />
          )}
        </div>
      </div>

      {/* Fullscreen Reading & Editing Modal */}
      <AnimatePresence>
        {isFullscreen && (
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
                  onClick={() => setPreviewMode('guru')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                    previewMode === 'guru'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Dokumen Lengkap Guru (Modul Ajar + Asesmen)"
                >
                  {t.lessonPlan.performaGuru}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('siswa')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                    previewMode === 'siswa'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Lembar Kerja Peserta Didik (LKPD) Khusus Siswa"
                >
                  {t.lessonPlan.lembarSiswa}
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
                      label: t.lessonPlan.pdf,
                      description: 'Siap cetak, tata letak A4/F4 tetap',
                      icon: FileDown,
                      onSelect: handleExportPdf,
                    },
                    {
                      id: 'word',
                      label: t.lessonPlan.word,
                      description: useServerExport
                        ? 'Berkas .docx, bisa diedit di Word'
                        : 'Berkas .doc, bisa diedit di Word',
                      icon: FileText,
                      onSelect: handleExportWord,
                    },
                    {
                      id: 'print',
                      label: t.lessonPlan.print,
                      description: 'Buka dialog printer',
                      icon: Printer,
                      onSelect: handlePrint,
                    },
                    {
                      id: 'copy',
                      label: t.lessonPlan.copy,
                      icon: Copy,
                      onSelect: handleCopy,
                      separatorBefore: true,
                    },
                  ]}
                />
                <button
                  onClick={() => setIsFullscreen(false)}
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
                onDismiss={() => setExportFailure(null)}
                tone="dark"
              />
            )}

            {/* Fullscreen Document Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 flex justify-center bg-slate-950/60">
              <div className="w-full max-w-4xl">
                <ModulAjarPreview
                  generatedDocument={
                    previewMode === 'siswa'
                      ? extractStudentHtml(generatedDocument, documentForm ?? formState, logoBase64)
                      : generatedDocument
                  }
                  previewRef={fullscreenPreviewRef}
                  documentType={formState.documentType}
                  zoomLevel={100}
                  paperSize={formState.paperSize}
                  onDocumentChange={previewMode === 'guru' ? persistPreviewEdits : undefined}
                  onEdit={markPreviewEdited}
                  editStatus={previewMode === 'guru' ? editStatus : null}
                />
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModulAjarCreatorPage;
