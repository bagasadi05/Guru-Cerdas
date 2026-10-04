import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';
import {
  BookOpen,
  Copy,
  Printer,
  FileText,
  FileDown,
  Clock,
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
import { useModulAjarForm } from './hooks/useModulAjarForm';
import { useModulAjarGenerator } from './hooks/useModulAjarGenerator';
import { useToast } from '../../../hooks/useToast';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';
import { ExportFailureBanner, type ExportFailure } from './components/ExportFailureBanner';
import { ModulAjarToolbar } from './components/ModulAjarToolbar';
import { DownloadMenu } from './components/DownloadMenu';
import {
  DocumentExportError,
  downloadBlob,
  isServerDocumentExportEnabled,
  requestDocumentExport,
  type DocumentExportRequest,
} from '../../../services/documentExportService';
import type { ExportFormat } from '../../../lib/modulAjarExport/types';

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
  } = useModulAjarForm();

  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [mobileActiveView, setMobileActiveView] = useState<'form' | 'preview'>('form');
  const [previewMode, setPreviewMode] = useState<'guru' | 'siswa'>('guru');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [aiCacheWarning, setAiCacheWarning] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [fieldLoading, setFieldLoading] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [currentLessonPlanId, setCurrentLessonPlanId] = useState<string | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportFailure, setExportFailure] = useState<ExportFailure | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
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

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load history:', error);
        setHistoryError(`Gagal memuat riwayat: ${error.message}`);
        setHistory([]);
      } else if (data) {
        setHistory(data);
        setHistoryError(null);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setHistoryError('Gagal memuat riwayat. Periksa koneksi lalu coba lagi.');
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';

  const { generateManualModulAjar, renderPrivateDraftAiModulAjar, isAiGenerating } =
    useModulAjarGenerator({
      formState,
      setFormState,
      user,
      models,
      t,
      isAiEnabled,
      logoBase64,
      fetchHistory,
      setGeneratedDocument,
      onDocumentSaved: (lessonPlanId) => {
        setCurrentLessonPlanId(lessonPlanId);
        setHasUnsavedEdits(false);
      },
      setAiCacheWarning,
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
  );

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';

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
    setMobileActiveView('preview');
    if (isAiEnabled) {
      queueHookResult.startJob();
    } else {
      generateManualModulAjar();
    }
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
        handleInputChange(field as keyof FormState, content);
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
      ? extractStudentHtml(generatedDocument, formState, logoBase64)
      : generatedDocument;
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
    setHistory((prev) =>
      prev.map((item) =>
        item.id === lessonPlanId ? { ...item, generated_content: cleanHtml } : item,
      ),
    );
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

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Cetak Modul Ajar</title>');
    const isF4 = formState.paperSize === 'F4';
    printWindow.document.write(`
      <style>
        @page {
          size: ${isF4 ? '215mm 330mm' : 'A4'};
          margin: 1.4cm 1.5cm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          padding: 0;
          margin: 0;
          color: #000000;
          background-color: #ffffff;
          line-height: 1.5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.8rem;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        td[style*="justify"], td [style*="justify"] {
          text-align: left !important;
        }
        .signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-top: 16px !important;
        }
        .keep-with-next, h1, h2, h3, h4, .section-header {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        @media print {
          body {
            font-family: 'Times New Roman', Times, serif;
            background-color: #ffffff;
            color: #000000;
            padding: 0;
            margin: 0;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .keep-with-next, h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          td[style*="background-color: #0d6b3e"], div[style*="background-color: #0d6b3e"] {
            background-color: #0d6b3e !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td[style*="background-color: #f5f0d0"], div[style*="background-color: #f5f0d0"] {
            background-color: #f5f0d0 !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.error('Gagal mencetak:', e);
      }
    }, 500);
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

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDeleteHistory = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    try {
      const { error } = await supabase.from('lesson_plans').delete().eq('id', id);
      if (!error) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        if (id === currentLessonPlanId) setCurrentLessonPlanId(null);
        if (
          generatedDocument &&
          history.find((item) => item.id === id)?.generated_content === generatedDocument
        ) {
          setGeneratedDocument('');
        }
        toast.success('Riwayat berhasil dihapus');
      } else {
        toast.error(`Gagal menghapus: ${error.message}`);
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
      toast.error('Gagal menghapus riwayat');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const restoreParameters = (plan: any) => {
    resetFormToDraft(plan);
    setGeneratedDocument(plan.generated_content);
    setCurrentLessonPlanId(plan.id);
    setHasUnsavedEdits(false);
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
    setActiveTab('preview');
    toast.success(`Draf ${item.identity?.mapel || 'Modul Ajar'} berhasil disalin ke formulir!`);
  };

  const handleExportHistoryPdf = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.generated_content) return;
    if (useServerExport) {
      exportHistoryFromServer(item, 'pdf');
      return;
    }

    toast.info('Menyiapkan file PDF, mohon tunggu sebentar...', { duration: 3000 });
    try {
      const fileName =
        `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}`
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_');
      await exportModulAjarToPdf({
        htmlContent: item.generated_content,
        fileName,
        paperSize: item.components?.paperSize === 'F4' ? 'F4' : 'A4',
      });
      toast.success('PDF berhasil diunduh!');
    } catch (err: any) {
      console.error('Failed to export history PDF:', err);
      toast.error(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleExportHistoryWord = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.generated_content) return;
    if (useServerExport) {
      exportHistoryFromServer(item, 'docx');
      return;
    }
    try {
      exportModulAjarToWord({
        htmlContent: item.generated_content,
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
    setHasUnsavedEdits(false);
    setActiveStep(1);
    setResetConfirmOpen(false);
    toast.success('Formulir berhasil direset');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-5 pb-20 lg:pb-0">
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmId}
        title={t.lessonPlan.deleteConfirm}
        message="Tindakan ini tidak dapat dibatalkan. Riwayat modul ajar ini akan dihapus permanen."
        onConfirm={confirmDeleteHistory}
        onClose={() => setDeleteConfirmId(null)}
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
        isAiGenerating={isAiGenerating}
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
              {/* AI Processing Modal Overlay */}
              {isAiGenerating && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-30 flex items-center justify-center p-6 text-center">
                  <MotionDiv
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4"
                  >
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-900/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                      <Clock className="w-6 h-6 text-brand-500 animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        AI Sedang Menyusun Dokumen
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                        Menghubungi AI... Sedang menulis skenario, LKPD, dan komponen evaluasi.
                      </p>
                    </div>
                  </MotionDiv>
                </div>
              )}

              {(queueStatus === 'pending' || queueStatus === 'processing') && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-30 flex items-center justify-center p-6 text-center">
                  <MotionDiv
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4"
                  >
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-900/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                      <Clock className="w-6 h-6 text-brand-500 animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        Antrian Pemrosesan AI
                      </h3>
                      {(queueStatus as string) === 'pending' ||
                      (queueStatus as string) === 'retry_wait' ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Permintaan dikirim ke server. Harap tunggu...
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                          Menghubungi AI... Sedang menulis perangkat ajar Anda.
                        </p>
                      )}
                    </div>
                  </MotionDiv>
                </div>
              )}

              {/* Main Document Preview */}
              {(() => {
                const documentToShow =
                  previewMode === 'siswa'
                    ? extractStudentHtml(generatedDocument, formState, logoBase64)
                    : generatedDocument;
                return (
                  <ModulAjarPreview
                    generatedDocument={documentToShow}
                    previewRef={previewRef}
                    documentType={formState.documentType}
                    zoomLevel={zoomLevel}
                    paperSize={formState.paperSize}
                    onDocumentChange={previewMode === 'guru' ? setGeneratedDocument : undefined}
                    onEdit={() => setHasUnsavedEdits(true)}
                    hasUnsavedEdits={useServerExport && hasUnsavedEdits}
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
                      ? extractStudentHtml(generatedDocument, formState, logoBase64)
                      : generatedDocument
                  }
                  previewRef={fullscreenPreviewRef}
                  documentType={formState.documentType}
                  zoomLevel={100}
                  paperSize={formState.paperSize}
                  onDocumentChange={previewMode === 'guru' ? setGeneratedDocument : undefined}
                  onEdit={() => setHasUnsavedEdits(true)}
                  hasUnsavedEdits={useServerExport && hasUnsavedEdits}
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
