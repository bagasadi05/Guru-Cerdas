import React from 'react';
import { createPortal } from 'react-dom';
import {
  WizardStep,
  WizardApplyTarget,
  WizardApplyData,
  ProtaPromesWizardModalProps,
  COMMON_SUBJECTS,
  GRADE_LEVELS,
  useProtaWizardState,
  WizardHeader,
  WizardStepIdentity,
  WizardStepKaldikQuota,
  WizardStepMateriSelection,
  WizardStepSummaryApply,
  WizardFooter,
} from './components/wizard';

export type { WizardStep, WizardApplyTarget, WizardApplyData, ProtaPromesWizardModalProps };
export { COMMON_SUBJECTS, GRADE_LEVELS };

export const ProtaPromesWizardModal: React.FC<ProtaPromesWizardModalProps> = (props) => {
  const { isOpen, onClose, hasExistingData, preferNewDocument, initialAcademicYear } = props;

  const {
    step,
    setStep,
    gradeLevel,
    setGradeLevel,
    subject,
    setSubject,
    customSubject,
    setCustomSubject,
    curriculum,
    setCurriculum,
    academicYear,
    setAcademicYear,
    effectiveSubject,
    weeklyJpQuota,
    setWeeklyJpQuota,
    reserveJpSem1,
    setReserveJpSem1,
    reserveJpSem2,
    setReserveJpSem2,
    target,
    setTarget,
    usesOwnKaldik,
    rmeSem1,
    rmeSem2,
    numChaptersSem1,
    setNumChaptersSem1,
    numChaptersSem2,
    setNumChaptersSem2,
    presetAvailable,
    materiMethod,
    setMateriMethod,
    aiTopics,
    aiStatus,
    aiError,
    waitingForAi,
    handleGenerateWithAi,
    generatedProtaItems,
    sem1Items,
    sem2Items,
    totalAllocatedSem1,
    totalAllocatedSem2,
    diffSem1,
    diffSem2,
    isBalanced,
    handleApply,
  } = useProtaWizardState(props);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Progress */}
        <WizardHeader
          step={step}
          onSetStep={setStep}
          onClose={onClose}
        />

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {step === 1 && (
            <WizardStepIdentity
              gradeLevel={gradeLevel}
              onGradeLevelChange={setGradeLevel}
              subject={subject}
              onSubjectChange={setSubject}
              customSubject={customSubject}
              onCustomSubjectChange={setCustomSubject}
              curriculum={curriculum}
              onCurriculumChange={setCurriculum}
              academicYear={academicYear}
              onAcademicYearChange={setAcademicYear}
              initialAcademicYear={initialAcademicYear}
            />
          )}

          {step === 2 && (
            <WizardStepKaldikQuota
              weeklyJpQuota={weeklyJpQuota}
              onWeeklyJpQuotaChange={setWeeklyJpQuota}
              usesOwnKaldik={usesOwnKaldik}
              academicYear={academicYear}
              rmeSem1={rmeSem1}
              rmeSem2={rmeSem2}
              reserveJpSem1={reserveJpSem1}
              onReserveJpSem1Change={setReserveJpSem1}
              reserveJpSem2={reserveJpSem2}
              onReserveJpSem2Change={setReserveJpSem2}
            />
          )}

          {step === 3 && (
            <WizardStepMateriSelection
              curriculum={curriculum}
              effectiveSubject={effectiveSubject}
              gradeLevel={gradeLevel}
              presetAvailable={presetAvailable}
              materiMethod={materiMethod}
              onMateriMethodChange={setMateriMethod}
              aiStatus={aiStatus}
              aiError={aiError}
              aiTopics={aiTopics}
              onGenerateWithAi={handleGenerateWithAi}
              numChaptersSem1={numChaptersSem1}
              onNumChaptersSem1Change={setNumChaptersSem1}
              numChaptersSem2={numChaptersSem2}
              onNumChaptersSem2Change={setNumChaptersSem2}
              generatedProtaItems={generatedProtaItems}
              totalAllocatedSem1={totalAllocatedSem1}
              totalAllocatedSem2={totalAllocatedSem2}
            />
          )}

          {step === 4 && (
            <WizardStepSummaryApply
              isBalanced={isBalanced}
              rmeSem1={rmeSem1}
              rmeSem2={rmeSem2}
              sem1Items={sem1Items}
              sem2Items={sem2Items}
              totalAllocatedSem1={totalAllocatedSem1}
              totalAllocatedSem2={totalAllocatedSem2}
              reserveJpSem1={reserveJpSem1}
              reserveJpSem2={reserveJpSem2}
              diffSem1={diffSem1}
              diffSem2={diffSem2}
              hasExistingData={hasExistingData}
              preferNewDocument={preferNewDocument}
              target={target}
              onTargetChange={setTarget}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <WizardFooter
          step={step}
          onPrevStep={() => setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : 1))}
          onNextStep={() => setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : 4))}
          onApply={handleApply}
          waitingForAi={waitingForAi}
        />
      </div>
    </div>,
    document.body
  );
};
