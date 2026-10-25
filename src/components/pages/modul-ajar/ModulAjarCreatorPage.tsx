import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ModulAiUsage } from '../../../services/modulAjarAiCache';
import { useTranslation } from '../../../utils/i18n';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { extractStudentHtml } from './utils/template';
import { buildAiPromptContext } from './utils/aiPromptContext';
import type { FormState } from './types';
import {
  useModulAjarForm,
  useModulAjarHistory,
  useModulAjarGenerator,
  useModulAjarAiJob,
  useModulAjarExport,
  useModulAjarFieldAi,
  type LessonPlanListItem,
} from './hooks';
import {
  ModulAjarForm,
  ModulAjarHistory,
  ModulAjarPreview,
  ModulAjarToolbar,
  ExportFailureBanner,
  AiWaitingCard,
  ModulAjarControlStrip,
  ModulAjarDialogs,
  ModulAjarFullscreenModal,
  ModulAjarMobileSwitcher,
} from './components';

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
    saveFieldArtifact,
    getFieldOrigins,
  } = useModulAjarForm();

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

  const [deletedPlan, setDeletedPlan] = useState<LessonPlanListItem | null>(null);
  const clearDeletedPlan = useCallback(() => setDeletedPlan(null), []);

  const [aiCacheWarning, setAiCacheWarning] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [aiUsage, setAiUsage] = useState<ModulAiUsage | null>(null);
  const requestedPolicy = useRef<'reuse' | 'refresh'>('reuse');
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState<boolean>(false);

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
  const loadPlanContent = useCallback(
    async (plan: { id: string; generated_content?: string | null }) => {
      const content = await fetchPlanContent(plan);
      if (content === null) {
        toast.error('Dokumen gagal dimuat. Periksa koneksi, lalu coba lagi.');
      }
      return content;
    },
    [fetchPlanContent, toast]
  );

  const exportActions = useModulAjarExport({
    formState,
    previewMode,
    isFullscreen,
    logoBase64,
    updateHistoryItem,
    loadPlanContent,
    copySuccessLabel: t.lessonPlan.copySuccess,
  });

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
    setGeneratedDocument: exportActions.setGeneratedDocument,
    onDocumentSaved: (lessonPlanId, builtFrom) => {
      exportActions.setCurrentLessonPlanId(lessonPlanId);
      exportActions.setDocumentForm(builtFrom);
      exportActions.setDocumentHasEdits(false);
      exportActions.setHasUnsavedEdits(false);
      exportActions.setEditStatus(null);
    },
    setAiCacheWarning,
    isFieldOwnedByTeacher,
    applyGeneratedContent,
    getFieldOrigins,
    notify: { success: toast.success, error: toast.error },
  });

  const queueHookResult = useModulAjarAiJob(
    formState,
    async (resultJson, _message, signal) => {
      if (resultJson) {
        await renderPrivateDraftAiModulAjar(resultJson, signal);
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
        models.find(
          (model) =>
            model.id === formState.selectedModelId || model.nama_model === formState.modelPembelajaran
        )?.sintaks_inti,
        isFieldOwnedByTeacher
      ),
    setAiUsage,
    setAiCacheWarning
  );

  const fieldAi = useModulAjarFieldAi({
    formState,
    setFormState,
    models,
    isSubmittingQueue: queueHookResult.isSubmitting,
    handleInputChange,
    setFieldFromAi,
    saveFieldArtifact,
    setAiUsage,
    setAiCacheWarning,
  });

  const { cancelFieldControllers } = fieldAi;
  const { cancelJob } = queueHookResult;

  useEffect(() => {
    return () => {
      cancelFieldControllers();
      cancelJob();
    };
  }, [user?.id, formState.mataPelajaran, formState.topik, formState.fase, formState.kelas, cancelFieldControllers, cancelJob]);

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';

  const runGenerate = () => {
    setRegenerateConfirmOpen(false);
    setMobileActiveView('preview');
    if (isAiEnabled) {
      fieldAi.cancelFieldControllers();
      setAiCacheWarning(null);
      queueHookResult.startJob(requestedPolicy.current);
    } else {
      generateManualModulAjar();
    }
  };

  const handleGenerate = (cachePolicy: 'reuse' | 'refresh' = 'reuse') => {
    requestedPolicy.current = cachePolicy;
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
      toast.error(
        formState.profilPelajar.length === 0
          ? 'Pilih minimal 1 dimensi Profil Pelajar Pancasila di Langkah 3 (Target & Profil).'
          : 'Pilih Model Pembelajaran di Langkah 5 (Model & Waktu).'
      );
      setActiveStep(formState.profilPelajar.length === 0 ? 3 : 5);
      return;
    }
    if (exportActions.generatedDocument && exportActions.documentHasEdits) {
      setRegenerateConfirmOpen(true);
      return;
    }
    runGenerate();
  };

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
    if (id === exportActions.currentLessonPlanId) {
      exportActions.clearDocument();
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
    exportActions.setDocumentForm(restored);
    exportActions.setGeneratedDocument(content);
    exportActions.setCurrentLessonPlanId(plan.id);
    exportActions.setDocumentHasEdits(
      Boolean(plan.updated_at) && Date.parse(plan.updated_at) - Date.parse(plan.created_at) > 5000
    );
    exportActions.setHasUnsavedEdits(false);
    exportActions.setEditStatus(null);
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
    exportActions.clearDocument();
    setActiveTab('preview');
    setMobileActiveView('form');
    toast.success(
      `Isian ${item.identity?.mapel || 'modul ajar'} disalin ke formulir. Ubah seperlunya, lalu susun dokumen baru.`
    );
  };

  const handleConfirmReset = () => {
    resetFormToDraft();
    exportActions.clearDocument();
    setActiveStep(1);
    setResetConfirmOpen(false);
    toast.success('Formulir berhasil direset');
  };

  const previewLabels = {
    preview: t.lessonPlan.preview,
    history: t.lessonPlan.history,
    copy: t.lessonPlan.copy,
    pdf: t.lessonPlan.pdf,
    word: t.lessonPlan.word,
    print: t.lessonPlan.print,
  };

  const controlLabels = {
    performaGuru: t.lessonPlan.performaGuru,
    lembarSiswa: t.lessonPlan.lembarSiswa,
  };

  const fullscreenLabels = {
    performaGuru: t.lessonPlan.performaGuru,
    lembarSiswa: t.lessonPlan.lembarSiswa,
    pdf: t.lessonPlan.pdf,
    word: t.lessonPlan.word,
    print: t.lessonPlan.print,
    copy: t.lessonPlan.copy,
  };

  return (
    <div className="h-full min-w-0 flex flex-col gap-3 pb-20 lg:pb-0">
      <ModulAjarDialogs
        deletedPlan={deletedPlan}
        onUndoDeletePlan={undoDeletePlan}
        onClearDeletedPlan={clearDeletedPlan}
        regenerateConfirmOpen={regenerateConfirmOpen}
        onConfirmRegenerate={runGenerate}
        onCloseRegenerateConfirm={() => setRegenerateConfirmOpen(false)}
        resetConfirmOpen={resetConfirmOpen}
        onConfirmReset={handleConfirmReset}
        onCloseResetConfirm={() => setResetConfirmOpen(false)}
        pendingExportFormat={exportActions.pendingExportFormat}
        onConfirmSaveDraftAndExport={exportActions.saveDraftAndExport}
        onClosePendingExport={() => exportActions.setPendingExportFormat(null)}
        isSavingDraft={exportActions.isSavingDraft}
        aiCacheWarning={aiCacheWarning}
        onCloseAiCacheWarning={() => setAiCacheWarning(null)}
        aiUsage={aiUsage}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row">
        <ModulAjarMobileSwitcher
          mobileActiveView={mobileActiveView}
          onViewChange={setMobileActiveView}
          hasDocument={!!exportActions.generatedDocument}
        />

        {/* Left Column: Form & Step Wizard */}
        <ModulAjarForm
          formState={formState}
          onChange={handleInputChange}
          onProfilToggle={handleProfilToggle}
          onMetodeToggle={handleMetodeToggle}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          isGeneratingCP={isGeneratingCP}
          onGenerateCP={async () => {
            const error = await generateCP();
            if (error) toast.error(error);
          }}
          models={models}
          isLoadingModels={isLoadingModels}
          queueStatus={queueStatus}
          onGenerate={() => handleGenerate('reuse')}
          onGenerateNew={isAiEnabled ? () => handleGenerate('refresh') : undefined}
          boilerplateMissingBanner={boilerplateMissingBanner}
          onAiFillField={fieldAi.handleAiFillField}
          fieldLoading={fieldAi.fieldLoading}
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
            hasDocument={!!exportActions.generatedDocument}
            busyFormat={exportActions.previewBusyFormat}
            onExportPdf={exportActions.handleExportPdf}
            onExportWord={exportActions.handleExportWord}
            onPrint={exportActions.handlePrint}
            onCopy={exportActions.handleCopy}
            onFullscreen={() => setIsFullscreen(true)}
            wordExtension="docx"
            labels={previewLabels}
          />

          {/* Secondary Document Control Strip: Target Dokumen & Canvas Format */}
          {activeTab === 'preview' && exportActions.generatedDocument && (
            <ModulAjarControlStrip
              previewMode={previewMode}
              onPreviewModeChange={(mode) => {
                if (
                  mode === 'siswa' &&
                  !extractStudentHtml(
                    exportActions.generatedDocument,
                    exportActions.documentForm ?? formState,
                    logoBase64
                  )
                ) {
                  toast.error(
                    'LKPD dan lembar evaluasi tidak dapat dikenali. Susun ulang dokumen terlebih dahulu.'
                  );
                  return;
                }
                setPreviewMode(mode);
              }}
              paperSize={formState.paperSize || 'A4'}
              onPaperSizeChange={(size) => handleInputChange('paperSize', size)}
              zoomLevel={zoomLevel}
              onZoomIn={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
              onZoomOut={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
              onZoomReset={() => setZoomLevel(100)}
              labels={controlLabels}
            />
          )}

          {exportActions.exportFailure && (
            <ExportFailureBanner
              failure={exportActions.exportFailure}
              onDismiss={() => exportActions.setExportFailure(null)}
            />
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
                      ? extractStudentHtml(
                          exportActions.generatedDocument,
                          exportActions.documentForm ?? formState,
                          logoBase64
                        )
                      : exportActions.generatedDocument;
                  return (
                    <ModulAjarPreview
                      generatedDocument={documentToShow}
                      previewRef={exportActions.previewRef}
                      documentType={formState.documentType}
                      zoomLevel={zoomLevel}
                      paperSize={formState.paperSize}
                      onDocumentChange={
                        previewMode === 'guru' ? exportActions.persistPreviewEdits : undefined
                      }
                      onEdit={exportActions.markPreviewEdited}
                      editStatus={previewMode === 'guru' ? exportActions.editStatus : null}
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
                onExportPdf={exportActions.handleExportHistoryPdf}
                onExportWord={exportActions.handleExportHistoryWord}
                onDuplicate={handleDuplicateHistory}
                exportingKey={exportActions.exportingKey}
              />
            )}
          </div>
        </div>

        <ModulAjarFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          formState={formState}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          generatedDocument={exportActions.generatedDocument}
          documentForm={exportActions.documentForm}
          logoBase64={logoBase64}
          fullscreenPreviewRef={exportActions.fullscreenPreviewRef}
          previewBusyFormat={exportActions.previewBusyFormat}
          useServerExport={exportActions.useServerExport}
          exportFailure={exportActions.exportFailure}
          onDismissExportFailure={() => exportActions.setExportFailure(null)}
          onExportPdf={exportActions.handleExportPdf}
          onExportWord={exportActions.handleExportWord}
          onPrint={exportActions.handlePrint}
          onCopy={exportActions.handleCopy}
          onPersistEdits={exportActions.persistPreviewEdits}
          onMarkEdited={exportActions.markPreviewEdited}
          editStatus={exportActions.editStatus}
          labels={fullscreenLabels}
        />
      </div>
    </div>
  );
};

export default ModulAjarCreatorPage;
