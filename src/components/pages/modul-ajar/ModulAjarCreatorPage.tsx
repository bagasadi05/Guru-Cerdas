import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MotionDiv } from '../../ui/MotionComponents';
import { BookOpen, History, Copy, Printer, FileText, Clock } from 'lucide-react';
import { useTranslation } from '../../../utils/i18n';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { FormState } from './types';
import { extractStudentHtml } from './utils/template';
import { useModulAjarAiJob } from './hooks/useModulAjarAiJob';
import {
  generateTujuanPembelajaran,
  generatePertanyaanPemantik,
  generateLkpdTugas,
  generateSoalEvaluasi,
  generateKompetensiAwal,
  generateCapaianPembelajaran,
} from '../../../services/modulAjarAiFieldGenerator';
import { ModulAjarForm } from './components/ModulAjarForm';
import { ModulAjarHistory } from './components/ModulAjarHistory';
import { ModulAjarPreview } from './components/ModulAjarPreview';
import { useModulAjarForm } from './hooks/useModulAjarForm';
import { useModulAjarGenerator } from './hooks/useModulAjarGenerator';

const ModulAjarCreatorPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
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
  } = useModulAjarForm();

  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [previewMode, setPreviewMode] = useState<'guru' | 'siswa'>('guru');
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  const [aiCacheWarning, setAiCacheWarning] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [fieldLoading, setFieldLoading] = useState<Record<string, boolean>>({});

  const previewRef = useRef<HTMLDivElement>(null);

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
      console.warn(`[AI Queue] Job notice: ${errMsg}`);
    }
  );

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';

  const handleGenerate = () => {
    if (!formState.mataPelajaran || !formState.topik) {
      alert(t.lessonPlan.validateSubject);
      return;
    }
    if (isAiEnabled) {
      queueHookResult.startJob();
    } else {
      generateManualModulAjar();
    }
  };

  const handleAiFillField = async (field: string) => {
    if (!formState.mataPelajaran || !formState.topik) {
      alert(t.lessonPlan.validateTopic);
      return;
    }
    setFieldLoading(prev => ({ ...prev, [field]: true }));
    try {
      const ctx = { mapel: formState.mataPelajaran, topik: formState.topik, fase: formState.fase, modelPembelajaran: formState.modelPembelajaran };
      let content = '';

      switch (field) {
        case 'manualTujuanPembelajaran':
          content = await generateTujuanPembelajaran(ctx);
          break;
        case 'manualPertanyaanPemantik':
          content = await generatePertanyaanPemantik(ctx);
          break;
        case 'manualLkpdTugas':
          content = await generateLkpdTugas(ctx);
          break;
        case 'manualSoalEvaluasi':
          content = await generateSoalEvaluasi(ctx);
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

      handleInputChange(field as keyof FormState, content);
    } catch (err: any) {
      console.error(`[AI Field] ${field} generation failed:`, err);
      alert(t.lessonPlan.saveFailed.replace('{message}', err.message));
    } finally {
      setFieldLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleCopy = async () => {
    if (!previewRef.current) return;
    try {
      await navigator.clipboard.writeText(previewRef.current.innerText);
      alert(t.lessonPlan.copySuccess);
    } catch (e) {
      console.error('Gagal menyalin ke clipboard:', e);
      alert('Gagal menyalin. Coba lagi atau gunakan Ctrl+C.');
    }
  };

  const handlePrint = () => {
    // Prefer the raw generated HTML (full inline styling) over the
    // sanitized preview DOM, which strips style attributes needed for print.
    const printContent = generatedDocument || previewRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Cetak Modul Ajar</title>');
    printWindow.document.write(`
      <style>
        body { font-family: 'Times New Roman', Times, serif; padding: 20px; color: #000; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
        @media print {
          body { font-family: 'Times New Roman', Times, serif; background-color: #ffffff; color: #000000; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td[style*="background-color: #0d6b3e"] { background-color: #0d6b3e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td[style*="background-color: #f5f0d0"] { background-color: #f5f0d0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    // Use the raw generated HTML (full inline styling) rather than the
    // sanitized preview DOM so the .doc keeps table borders & colors.
    const printContent = generatedDocument || previewRef.current?.innerHTML;
    if (!printContent) return;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + printContent + footer;
    
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
    if (!confirm(t.lessonPlan.deleteConfirm)) return;
    try {
      const { error } = await supabase.from('lesson_plans').delete().eq('id', id);
      if (!error) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (generatedDocument && history.find(item => item.id === id)?.generated_content === generatedDocument) {
          setGeneratedDocument('');
        }
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const restoreParameters = (plan: any) => {
    resetFormToDraft(plan);
    setGeneratedDocument(plan.generated_content);
    setActiveTab('preview');
    alert(t.lessonPlan.restoreSuccess);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 pb-20 lg:pb-0">
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
      />

      <div className="flex-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)]">
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-2.5 sm:px-4 shrink-0 shadow-sm z-10 gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview' 
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t.lessonPlan.preview}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              {t.lessonPlan.history}
            </button>
          </div>

          {activeTab === 'preview' && generatedDocument && (
            <div className="flex bg-brand-50/80 dark:bg-brand-950/30 p-0.5 rounded-lg border border-brand-100 dark:border-brand-900/30">
              <button
                onClick={() => setPreviewMode('guru')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  previewMode === 'guru'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-brand-600 dark:text-brand-400 hover:bg-brand-100/50 dark:hover:bg-brand-950/50'
                }`}
              >
                {t.lessonPlan.performaGuru}
              </button>
              <button
                onClick={() => setPreviewMode('siswa')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  previewMode === 'siswa'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-brand-600 dark:text-brand-400 hover:bg-brand-100/50 dark:hover:bg-brand-950/50'
                }`}
              >
                {t.lessonPlan.lembarSiswa}
              </button>
            </div>
          )}
          
          {activeTab === 'preview' && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={handleCopy} disabled={!generatedDocument} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-brand-600 transition-colors disabled:opacity-50" title={t.lessonPlan.copy}>
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handlePrint} disabled={!generatedDocument} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium" title={t.lessonPlan.pdf}>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">{t.lessonPlan.pdf}</span>
              </button>
              <button onClick={handleExportWord} disabled={!generatedDocument} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium" title={t.lessonPlan.word}>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t.lessonPlan.word}</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/50">
          {activeTab === 'preview' ? (
            <>
              {isAiGenerating && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-6 text-center">
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
                      <h3 className="font-bold text-slate-800 dark:text-white">AI Sedang Bekerja</h3>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">Menghubungi AI... Sedang menulis perangkat ajar Anda.</p>
                    </div>
                  </MotionDiv>
                </div>
              )}

              {(queueStatus === 'pending' || queueStatus === 'processing') && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-6 text-center">
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">Permintaan dikirim ke server. Harap tunggu...</p>
                      ) : (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">Menghubungi AI... Sedang menulis perangkat ajar Anda.</p>
                      )}
                    </div>
                  </MotionDiv>
                </div>
              )}

              {(() => {
                const documentToShow = previewMode === 'siswa'
                  ? extractStudentHtml(generatedDocument, formState, logoBase64)
                  : generatedDocument;
                return (
                  <ModulAjarPreview
                    generatedDocument={documentToShow}
                    previewRef={previewRef}
                    documentType={formState.documentType}
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
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModulAjarCreatorPage;
