import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';
import {
  BookOpen,
  History,
  Copy,
  Printer,
  FileText,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Loader2
} from 'lucide-react';
import { useTranslation } from '../../../utils/i18n';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { FormState } from './types';
import { extractStudentHtml, cleanHtmlForWordExport } from './utils/template';
import { exportModulAjarToPdf } from './utils/pdfExport';
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

  const previewRef = useRef<HTMLDivElement>(null);
  const fullscreenPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/logo_sekolah.png')
      .then(res => {
        if (!res.ok) return null;
        return res.blob();
      })
      .then(blob => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error('Failed to load logo_sekolah.png:', err));
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
  
  const { generateManualModulAjar, renderPrivateDraftAiModulAjar, isAiGenerating } = useModulAjarGenerator({
    formState,
    setFormState,
    user,
    models,
    t,
    isAiEnabled,
    logoBase64,
    fetchHistory,
    setGeneratedDocument,
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
    }
  );

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';

  const handleGenerate = () => {
    if (!formState.mataPelajaran || !formState.topik) {
      toast.error(t.lessonPlan.validateSubject);
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
    setFieldLoading(prev => ({ ...prev, [field]: true }));
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
        isKbcIntegrated: formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta',
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
      setFieldLoading(prev => ({ ...prev, [field]: false }));
    }
  };

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

  const handleExportPdf = async () => {
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const documentToExport = previewMode === 'siswa'
      ? (extractStudentHtml(generatedDocument, formState, logoBase64) || targetRef.current?.innerHTML)
      : (generatedDocument || targetRef.current?.innerHTML);

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
    const printContent = generatedDocument || targetRef.current?.innerHTML;
    if (!printContent) return;
    
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
      try { printWindow.print(); } catch (e) { console.error('Gagal mencetak:', e); }
    }, 500);
  };

  const handleExportWord = () => {
    const targetRef = isFullscreen ? fullscreenPreviewRef : previewRef;
    const printContent = generatedDocument || targetRef.current?.innerHTML;
    if (!printContent) return;

    const isF4 = formState.paperSize === 'F4';
    const wordStyles = `
      <style>
        <!--
        @page WordSection1 {
          size: ${isF4 ? '612pt 936pt' : '595.3pt 841.9pt'}; /* ${isF4 ? 'F4 / Folio (215x330mm)' : 'A4 (210x297mm)'} */
          margin: 56.7pt 56.7pt 56.7pt 56.7pt; /* 2 cm margins */
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.WordSection1 {
          page: WordSection1;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.45;
          color: #000000;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
          margin-bottom: 8pt;
        }
        tr {
          page-break-inside: avoid;
          mso-line-break-rule: exactly;
        }
        .signature-block {
          page-break-inside: avoid;
          margin-top: 14pt;
        }
        .keep-with-next, h1, h2, h3, h4 {
          page-break-after: avoid;
        }
        td, th {
          vertical-align: top;
          padding: 4pt 6pt;
        }
        p {
          margin-top: 0pt;
          margin-bottom: 4pt;
          line-height: 1.45;
        }
        h1, h2, h3, h4 {
          margin-top: 6pt;
          margin-bottom: 3pt;
        }
        -->
      </style>
    `;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${formState.documentType} ${formState.mataPelajaran}</title>
  ${wordStyles}
</head>
<body>
<div class="WordSection1">`;
    const footer = `</div></body></html>`;
    const cleanedContent = cleanHtmlForWordExport(printContent);
    const sourceHTML = header + cleanedContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formState.documentType}_${formState.mataPelajaran}_Kelas${formState.kelas}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        setHistory(prev => prev.filter(item => item.id !== id));
        if (generatedDocument && history.find(item => item.id === id)?.generated_content === generatedDocument) {
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
    setActiveTab('preview');
    setMobileActiveView('preview');
    toast.success(t.lessonPlan.restoreSuccess);
  };

  const handleApplyPreset = (presetData: Partial<FormState>) => {
    setFormState(prev => ({
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

    toast.info('Menyiapkan file PDF, mohon tunggu sebentar...', { duration: 3000 });
    try {
      const fileName = `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}`
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_');
      await exportModulAjarToPdf({
        htmlContent: item.generated_content,
        fileName,
        paperSize: 'A4',
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
    
    const wordStyles = `
      <style>
        <!--
        @page WordSection1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 56.7pt 56.7pt 56.7pt 56.7pt;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.45; color: #000000; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        tr { page-break-inside: avoid; mso-line-break-rule: exactly; }
        .signature-block { page-break-inside: avoid; margin-top: 14pt; }
        .keep-with-next, h1, h2, h3, h4 { page-break-after: avoid; }
        td, th { padding: 4pt 6pt; vertical-align: top; }
        p { margin-top: 0pt; margin-bottom: 4pt; line-height: 1.45; }
        h1, h2, h3, h4 { margin-top: 6pt; margin-bottom: 3pt; }
        -->
      </style>
    `;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${item.document_type || 'Modul Ajar'}</title>
  ${wordStyles}
</head>
<body>
<div class="WordSection1">`;
    const footer = `</div></body></html>`;
    const cleanedContent = cleanHtmlForWordExport(item.generated_content);
    const sourceHTML = header + cleanedContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.document_type || 'ModulAjar'}_${item.identity?.mapel || 'Mapel'}_Kelas${item.identity?.kelas || ''}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('File Word (.doc) berhasil diunduh');
  };

  const handleConfirmReset = () => {
    resetFormToDraft();
    setGeneratedDocument('');
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

      {/* AI Cache Warning Toast */}
      {aiCacheWarning && (
        <div className="fixed top-16 right-4 z-50 max-w-sm bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 dark:text-amber-400 font-bold">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">Draf AI tidak tersimpan ke Bank</p>
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
      <div className={`flex-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] ${
        mobileActiveView === 'preview' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
      }`}>
        
        {/* Workspace Toolbar Header */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 shadow-xs z-20 gap-2">
          
          {/* Left Tabs: Preview vs Riwayat */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button 
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                activeTab === 'preview' 
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t.lessonPlan.preview}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-150 whitespace-nowrap ${
                activeTab === 'history'
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>{t.lessonPlan.history}</span>
              {history.length > 0 && (
                <span className="px-1.5 py-0.2 bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 rounded-full text-[10px] font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* Right Action Tools: Salin, Cetak/PDF, Unduh Word, Layar Penuh */}
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!generatedDocument}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 duration-150 shrink-0 border border-slate-200/50 dark:border-slate-800"
                title={t.lessonPlan.copy}
                aria-label={t.lessonPlan.copy}
              >
                <Copy className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!generatedDocument || isExportingPdf}
                className="h-9 px-3 hover:bg-red-100 dark:hover:bg-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/80 dark:border-red-900/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 duration-150 shrink-0"
                title="Langsung Unduh Dokumen ke Format PDF"
                aria-label={t.lessonPlan.pdf}
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-red-500 dark:text-red-400" />
                ) : (
                  <Download className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                )}
                <span className="whitespace-nowrap">{t.lessonPlan.pdf}</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                disabled={!generatedDocument}
                className="h-9 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/40 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/80 dark:border-blue-900/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 duration-150 shrink-0"
                title="Unduh Dokumen ke Format Microsoft Word (.doc)"
                aria-label={t.lessonPlan.word}
              >
                <FileText className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                <span className="whitespace-nowrap">{t.lessonPlan.word}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!generatedDocument}
                className="h-9 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 duration-150 shrink-0"
                title="Cetak Fisik / Buka Dialog Cetak Printer"
                aria-label={t.lessonPlan.print}
              >
                <Printer className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline whitespace-nowrap">{t.lessonPlan.print}</span>
              </button>

              {generatedDocument && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer active:scale-95 duration-150 shrink-0 border border-slate-200/60 dark:border-slate-800"
                  title="Mode Layar Penuh (Fokus)"
                  aria-label="Mode Layar Penuh (Fokus)"
                >
                  <Maximize2 className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          )}
        </div>

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
                  onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
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
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
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
                      <h3 className="font-bold text-slate-800 dark:text-white">AI Sedang Menyusun Dokumen</h3>
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
                      <h3 className="font-bold text-slate-800 dark:text-white">Antrian Pemrosesan AI</h3>
                      {(queueStatus as string) === 'pending' || (queueStatus as string) === 'retry_wait' ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Permintaan dikirim ke server. Harap tunggu...</p>
                      ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">Menghubungi AI... Sedang menulis perangkat ajar Anda.</p>
                      )}
                    </div>
                  </MotionDiv>
                </div>
              )}

              {/* Main Document Preview */}
              {(() => {
                const documentToShow = previewMode === 'siswa'
                  ? extractStudentHtml(generatedDocument, formState, logoBase64)
                  : generatedDocument;
                return (
                  <ModulAjarPreview
                    generatedDocument={documentToShow}
                    previewRef={previewRef}
                    documentType={formState.documentType}
                    zoomLevel={zoomLevel}
                    paperSize={formState.paperSize}
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
                    {formState.documentType} {formState.mataPelajaran || 'Pratinjau'} - Kelas {formState.kelas}
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
                <button
                  onClick={handleCopy}
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 duration-150"
                  title="Salin Teks"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 min-h-[36px] bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 duration-150"
                  title="Langsung Unduh Dokumen ke Format PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{t.lessonPlan.pdf}</span>
                </button>
                <button
                  onClick={handleExportWord}
                  className="px-3 py-1.5 min-h-[36px] bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 duration-150"
                  title="Unduh Dokumen ke Format Microsoft Word (.doc)"
                >
                  <FileText className="w-4 h-4" />
                  <span>{t.lessonPlan.word}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 duration-150 border border-slate-700"
                  title="Cetak Fisik / Buka Dialog Cetak Printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.lessonPlan.print}</span>
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white ml-2 transition-all cursor-pointer active:scale-95 duration-150"
                  title="Keluar Layar Penuh"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

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
