import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { ScheduleBatchModal } from './ScheduleBatchModal';
import { KaldikTab } from './KaldikTab';
import { ProtaTab } from './ProtaTab';
import { PromesTab } from './PromesTab';
import { PreviewTab } from './PreviewTab';
import { ProtaPromesWizardModal } from './ProtaPromesWizardModal';
import { ModulAjarCreatorPageSkeleton } from '../../skeletons/PageSkeletons';

// Extracted Presentation Components
import {
  PerangkatAjarHub,
  PerangkatAjarSubNav,
  PerangkatAjarHeader,
  PerangkatAjarMetadataBar,
  PerangkatAjarTabsNav,
  PerangkatAjarUndoBanner,
} from './components';

// Extracted Domain & State Hooks
import { usePerangkatAjarState } from './hooks/usePerangkatAjarState';
import { usePerangkatAjarPackage } from './hooks/usePerangkatAjarPackage';
import type { PerangkatAjarTab, PerangkatAjarMode } from './types/perangkatAjarPageTypes';

const ModulAjarCreatorPage = lazy(() => import('../modul-ajar/ModulAjarCreatorPage'));

export const PerangkatAjarPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  const mode: PerangkatAjarMode =
    rawMode === 'prota-promes' || rawMode === 'modul-ajar' ? rawMode : null;

  const handleSelectMode = (newMode: PerangkatAjarMode) => {
    if (newMode) {
      setSearchParams({ mode: newMode });
    } else {
      setSearchParams({});
    }
  };

  const [activeTab, setActiveTab] = useState<PerangkatAjarTab>('kaldik');

  const state = usePerangkatAjarState({
    mode,
    onSelectMode: handleSelectMode,
    onNavigateToTab: setActiveTab,
  });

  const { isPackaging, yearDocumentIds, handleDownloadPackage } = usePerangkatAjarPackage({
    protaId: state.protaId,
    subject: state.subject,
    gradeLevel: state.gradeLevel,
    academicYear: state.academicYear,
    effectiveIdentity: state.effectiveIdentity,
    currentHeader: state.currentHeader,
    protaItems: state.protaItems,
    protaValidation: state.protaValidation,
    weeks: state.weeks,
    lockedPromesCellsSem1: state.lockedPromesCellsSem1,
    lockedPromesCellsSem2: state.lockedPromesCellsSem2,
    protaList: state.protaList,
    flushPendingPromesSaves: state.flushPendingPromesSaves,
  });

  if (!mode) {
    return <PerangkatAjarHub onSelectMode={handleSelectMode} />;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Module Sub-Navigation Bar */}
      <PerangkatAjarSubNav mode={mode} onSelectMode={handleSelectMode} />

      {mode === 'modul-ajar' ? (
        <Suspense fallback={<ModulAjarCreatorPageSkeleton />}>
          <ModulAjarCreatorPage />
        </Suspense>
      ) : (
        <>
          {/* Master Page Header */}
          <PerangkatAjarHeader
            lastSaved={state.lastSaved}
            isSaving={state.isSaving}
            isPackaging={isPackaging}
            hasMultipleYearDocuments={yearDocumentIds.length > 1}
            academicYear={state.academicYear}
            onOpenWizard={() => state.handleOpenWizard(false)}
            onOpenScheduleBatch={() => void state.handleOpenScheduleBatch()}
            onDownloadPackage={handleDownloadPackage}
            onSaveAll={state.handleSaveAll}
          />

          {/* Global Metadata Bar */}
          <PerangkatAjarMetadataBar
            protaId={state.protaId}
            documentOptions={state.documentOptions}
            isKnownDocument={state.isKnownDocument}
            hasItems={state.protaItems.length > 0}
            academicYear={state.academicYear}
            subject={state.subject}
            gradeLevel={state.gradeLevel}
            phase={state.phase}
            curriculum={state.curriculum}
            onSwitchDocument={(id) => void state.handleSwitchDocument(id)}
            onNewProta={() => state.handleOpenWizard(true)}
            onDeleteDocument={() => void state.handleDeleteDocument()}
            onChangeAcademicYear={state.setAcademicYear}
            onChangeSubject={state.setSubject}
            onChangeGradeLevel={state.handleChangeGradeLevel}
            onChangePhase={state.setPhase}
            onChangeCurriculum={state.setCurriculum}
          />

          {/* Navigation Tabs */}
          <PerangkatAjarTabsNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            isProtaBalanced={state.protaValidation.statusAnnual === 'PAS'}
          />

          {/* Active Tab Content */}
          <div className="pt-2">
            {activeTab === 'kaldik' && (
              <KaldikTab
                weeks={state.weeks}
                onUpdateWeek={state.handleUpdateWeek}
                onResetToPreset={state.handleResetKaldikToPreset}
                academicYear={state.academicYear}
                semestersWithoutHolidayData={state.semestersWithoutHolidayData}
                schoolKaldikUpdatedAt={
                  state.schoolKaldik && !state.matchesSchoolKaldik
                    ? state.schoolKaldik.updatedAt ?? ''
                    : null
                }
                onUseSchoolKaldik={state.handleUseSchoolKaldik}
                onPublishSchoolKaldik={
                  state.isAdmin ? () => void state.handlePublishSchoolKaldik() : undefined
                }
                isSchoolKaldik={Boolean(state.schoolKaldik) && state.matchesSchoolKaldik}
                rmeSem1={state.rmeSem1}
                rmeSem2={state.rmeSem2}
                weeklyJpQuota={state.weeklyJpQuota}
                onChangeWeeklyJpQuota={state.setWeeklyJpQuota}
                reserveJpSem1={state.reserveJpSem1}
                onChangeReserveJpSem1={state.setReserveJpSem1}
                reserveJpSem2={state.reserveJpSem2}
                onChangeReserveJpSem2={state.setReserveJpSem2}
              />
            )}

            {activeTab === 'prota' && (
              <ProtaTab
                items={state.protaItems}
                onAddItem={state.handleAddProtaItem}
                onUpdateItem={state.handleUpdateProtaItem}
                onDeleteItem={state.handleDeleteProtaItem}
                onMoveItem={state.handleMoveProtaItem}
                onSwapSemester={state.handleSwapSemesterProtaItem}
                onLoadSampleData={state.presetAvailable ? state.handleLoadPresetMateri : undefined}
                onOpenWizard={() => state.handleOpenWizard(false)}
                onAutoBalance={state.handleAutoBalanceProta}
                onFillWithAi={() => void state.handleFillWithAi()}
                onCreateModulAjar={state.handleCreateModulAjar}
                isAiBusy={state.isAiBusy}
                curriculum={state.curriculum}
                onChangeCurriculum={state.setCurriculum}
                validation={state.protaValidation}
                rmeSem1={state.rmeSem1}
                rmeSem2={state.rmeSem2}
              />
            )}

            {activeTab === 'promes' && (
              <PromesTab
                protaItems={state.protaItems}
                semesterWeeks={state.weeks}
                semesterNumber={state.promesSemester}
                onChangeSemester={state.setPromesSemester}
                weeklyJpLimit={state.weeklyJpLimit}
                onChangeWeeklyJpLimit={state.setWeeklyJpQuota}
                cells={
                  state.promesSemester === 1
                    ? state.lockedPromesCellsSem1
                    : state.lockedPromesCellsSem2
                }
                onUpdateCell={state.handleUpdatePromesCell}
                onAutoDistribute={state.handleAutoDistributePromes}
                onReleaseCell={state.handleReleasePromesCell}
                onResetMatrix={state.handleResetPromesMatrix}
              />
            )}

            {activeTab === 'preview' && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">Paket lengkap (ZIP)</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Prota (Word) serta Promes Semester 1 dan 2 (Excel, lengkap dengan matriks pekan) sekaligus.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPackage('current')}
                    disabled={isPackaging}
                    className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Dokumen ini</span>
                  </button>
                  {yearDocumentIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => void handleDownloadPackage('year')}
                      disabled={isPackaging}
                      className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Semua Prota {state.academicYear} ({yearDocumentIds.length})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <PreviewTab
                identity={state.effectiveIdentity}
                onUpdateIdentity={state.handleUpdateIdentity}
                protaItems={state.protaItems}
                validation={state.protaValidation}
                kaldikWeeks={state.weeks}
                promesCells={state.lockedPromesCellsSem1}
                promesCellsSem2={state.lockedPromesCellsSem2}
              />
            )}
          </div>
        </>
      )}

      {/* Quick Setup Wizard Modal for Prota & Promes */}
      <ProtaPromesWizardModal
        isOpen={state.isWizardOpen}
        onClose={state.handleCloseWizard}
        onApply={state.handleApplyWizard}
        initialAcademicYear={state.academicYear}
        initialSubject={state.subject}
        initialGradeLevel={state.gradeLevel}
        initialCurriculum={state.curriculum}
        initialWeeklyJpQuota={state.weeklyJpQuota}
        currentWeeks={state.weeks}
        hasExistingData={state.protaItems.length > 0}
        preferNewDocument={state.wizardPrefersNew}
      />

      {/* Timetable Batch Modal */}
      <ScheduleBatchModal
        isOpen={state.isScheduleBatchOpen}
        onClose={() => state.setIsScheduleBatchOpen(false)}
        status={state.scheduleStatus}
        plans={state.schedulePlans}
        academicYear={state.academicYear}
        isCreating={state.isCreatingBatch}
        progress={state.batchProgress}
        onCreate={(keys, useAi) => void state.handleCreateFromSchedule(keys, useAi)}
      />

      {/* Floating Undo Notification */}
      {state.undo && mode === 'prota-promes' && (
        <PerangkatAjarUndoBanner
          message={state.undo.message}
          onUndo={() => void state.handleUndo()}
          onDismiss={() => state.setUndo(null)}
        />
      )}
    </div>
  );
};

export default PerangkatAjarPage;
