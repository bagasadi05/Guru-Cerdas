import React from 'react';
import { MotionDiv, AnimatePresence } from '../../../ui/MotionComponents';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Target,
  FileEdit,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from '../../../../utils/i18n';
import { FormState } from '../types';
import { useOptionalSemester } from '../../../../contexts/SemesterContext';
import { getCurrentSemester } from '../../../../utils/semesterUtils';
import {
  useTopikRecommendations,
  useRubrikTemplates,
  useTemaKbc,
  useMateriInsersiMulti,
  useLearningModels,
} from '../hooks/useModulAjarQueries';
import { PANCA_CINTA_TOPICS_FALLBACK, MATERI_INSERSI_FALLBACK } from '../constants/kbcConstants';
import { Step1Kurikulum } from './steps/Step1Kurikulum';
import { Step2Identitas } from './steps/Step2Identitas';
import { Step3TargetProfil } from './steps/Step3TargetProfil';
import { Step4KomponenInti } from './steps/Step4KomponenInti';
import { Step5ModelWaktu } from './steps/Step5ModelWaktu';

interface ModulAjarFormProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onProfilToggle: (profil: string) => void;
  onMetodeToggle: (metode: string) => void;
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  isGeneratingCP: boolean;
  onGenerateCP: () => void;
  models: any[];
  isLoadingModels: boolean;
  queueStatus: string;
  onGenerate: () => void;
  boilerplateMissingBanner?: string | null;
  onAiFillField?: (field: string) => void;
  fieldLoading?: Record<string, boolean>;
  isAiGenerating?: boolean;
  onResetForm?: () => void;
  onApplyPreset?: (presetData: Partial<FormState>) => void;
  autoDistributeTime?: () => void;
}

export const ModulAjarForm: React.FC<ModulAjarFormProps> = ({
  formState,
  onChange,
  onProfilToggle,
  onMetodeToggle,
  activeStep,
  setActiveStep,
  isGeneratingCP,
  onGenerateCP,
  queueStatus,
  onGenerate,
  onAiFillField,
  fieldLoading,
  isAiGenerating,
  onResetForm,
  onApplyPreset,
  autoDistributeTime,
}) => {
  const { t } = useTranslation();
  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';

  const semesterContext = useOptionalSemester();
  const activeAcademicYear = semesterContext?.activeAcademicYear;
  const activeSemester = semesterContext?.activeSemester;
  const defaultTerm = getCurrentSemester();
  const currentActiveYearName = activeAcademicYear?.name || defaultTerm.academicYear;
  const currentActiveSemName = activeSemester?.name
    ? (activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2 ? 'Genap' : 'Ganjil')
    : (defaultTerm.semester === '1' ? 'Ganjil' : 'Genap');

  const aiProps = { onAiFillField, fieldLoading };

  const PROFIL_OPTIONS = [
    'Beriman & Bertakwa',
    'Berkebinekaan Global',
    'Bergotong Royong',
    'Mandiri',
    'Bernalar Kritis',
    'Kreatif',
  ];
  const METODE_OPTIONS = [
    'Ceramah',
    'Diskusi',
    'Tanya Jawab',
    'Demonstrasi',
    'Eksperimen',
    'Proyek',
    'Role Playing',
    'Penugasan',
  ];

  const { data: recommendations = [] } = useTopikRecommendations(formState.mataPelajaran);
  const { data: rubrikDiskusi = [] } = useRubrikTemplates('diskusi');
  const { data: rubrikPresentasi = [] } = useRubrikTemplates('presentasi');
  const { data: rubrikSikap = [] } = useRubrikTemplates('sikap');
  
  useLearningModels();
  const { data: temaKbcData = [] } = useTemaKbc();
  const { data: materiInsersiData = [] } = useMateriInsersiMulti(formState.temaKbc);

  const topicsToDisplay = temaKbcData.length > 0 ? temaKbcData : PANCA_CINTA_TOPICS_FALLBACK;
  const materiToDisplay = materiInsersiData.length > 0 
    ? materiInsersiData.map(m => m.konten)
    : formState.temaKbc.flatMap(id => MATERI_INSERSI_FALLBACK[id] || []);

  const WIZARD_STEPS = [
    { id: 1, label: 'Kurikulum', short: '1. Kurikulum', icon: Sparkles },
    { id: 2, label: 'Identitas', short: '2. Identitas', icon: BookOpen },
    { id: 3, label: 'Target & Profil', short: '3. Profil', icon: Target },
    { id: 4, label: 'Komponen Inti', short: '4. Inti & LKPD', icon: FileEdit },
    { id: 5, label: 'Model & Waktu', short: '5. Model', icon: Clock },
  ];

  const isStepComplete = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return !!formState.generationMethod && !!formState.documentType;
      case 2:
        return !!formState.mataPelajaran && !!formState.topik && !!formState.kelas;
      case 3:
        return formState.profilPelajar.length > 0 && !!formState.kompetensiAwal;
      case 4:
        return !!formState.capaianPembelajaran || !!formState.manualTujuanPembelajaran;
      case 5:
        return !!formState.modelPembelajaran;
      default:
        return false;
    }
  };

  const adjustPendahuluan = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    let newInti = total - newVal - formState.alokasiPenutup;
    let newPenutup = formState.alokasiPenutup;
    if (newInti < 10) {
      newInti = 10;
      newPenutup = total - newVal - 10;
    }
    if (newPenutup < 5) {
      newPenutup = 5;
      newInti = total - newVal - 5;
    }
    onChange('alokasiPendahuluan', newVal);
    onChange('alokasiInti', newInti);
    onChange('alokasiPenutup', newPenutup);
  };

  const adjustPenutup = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    let newInti = total - formState.alokasiPendahuluan - newVal;
    let newPendahuluan = formState.alokasiPendahuluan;
    if (newInti < 10) {
      newInti = 10;
      newPendahuluan = total - newVal - 10;
    }
    if (newPendahuluan < 5) {
      newPendahuluan = 5;
      newInti = total - newVal - 5;
    }
    onChange('alokasiPenutup', newVal);
    onChange('alokasiInti', newInti);
    onChange('alokasiPendahuluan', newPendahuluan);
  };

  const adjustInti = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    const remaining = total - newVal;
    let newPendahuluan = Math.round(remaining * (formState.alokasiPendahuluan / (formState.alokasiPendahuluan + formState.alokasiPenutup || 1)));
    let newPenutup = remaining - newPendahuluan;
    if (newPendahuluan < 5) {
      newPendahuluan = 5;
      newPenutup = remaining - 5;
    }
    if (newPenutup < 5) {
      newPenutup = 5;
      newPendahuluan = remaining - 5;
    }
    onChange('alokasiInti', newVal);
    onChange('alokasiPendahuluan', newPendahuluan);
    onChange('alokasiPenutup', newPenutup);
  };

  const appendToField = (field: 'manualLkpdTugas' | 'manualSoalEvaluasi', snippet: string) => {
    const current = (formState[field] as string) || '';
    const updated = current ? current + '\n\n' + snippet : snippet;
    onChange(field, updated);
  };

  return (
    <div className="w-full lg:w-[46%] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] overflow-hidden">
      
      {/* Header with Title & Reset Action */}
      <div className="p-4 lg:px-5 lg:pt-4 lg:pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              {t.lessonPlan.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Langkah {activeStep} dari 5 &bull; {WIZARD_STEPS[activeStep - 1]?.label}
            </p>
          </div>

          {onResetForm && (
            <button
              type="button"
              onClick={onResetForm}
              className="p-1.5 lg:px-2.5 lg:py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Reset Form / Buat Draf Baru"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Interactive Clickable Step Wizard Pills */}
        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {WIZARD_STEPS.map(step => {
            const isActive = activeStep === step.id;
            const isCompleted = isStepComplete(step.id);
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`Pindah ke ${step.label}`}
              >
                <div className="flex items-center gap-1">
                  <StepIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-xs">{step.label}</span>
                  <span className="md:hidden text-[10px]">{step.id}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scrollable Step Form Body */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeStep === 1 && (
              <Step1Kurikulum
                formState={formState}
                onChange={onChange}
                onApplyPreset={onApplyPreset}
                isAiEnabled={isAiEnabled}
                currentActiveYearName={currentActiveYearName}
                currentActiveSemName={currentActiveSemName}
                t={t}
                topicsToDisplay={topicsToDisplay}
                materiToDisplay={materiToDisplay}
              />
            )}

            {activeStep === 2 && (
              <Step2Identitas
                formState={formState}
                onChange={onChange}
                recommendations={recommendations}
                t={t}
              />
            )}

            {activeStep === 3 && (
              <Step3TargetProfil
                formState={formState}
                onChange={onChange}
                t={t}
                aiProps={aiProps}
              />
            )}

            {activeStep === 4 && (
              <Step4KomponenInti
                formState={formState}
                onChange={onChange}
                onProfilToggle={onProfilToggle}
                isGeneratingCP={isGeneratingCP}
                onGenerateCP={onGenerateCP}
                PROFIL_OPTIONS={PROFIL_OPTIONS}
                t={t}
                aiProps={aiProps}
                appendToField={appendToField}
              />
            )}

            {activeStep === 5 && (
              <Step5ModelWaktu
                formState={formState}
                onChange={onChange}
                onMetodeToggle={onMetodeToggle}
                METODE_OPTIONS={METODE_OPTIONS}
                t={t}
                aiProps={aiProps}
                autoDistributeTime={autoDistributeTime}
                rubrikDiskusi={rubrikDiskusi}
                rubrikPresentasi={rubrikPresentasi}
                rubrikSikap={rubrikSikap}
                adjustPendahuluan={adjustPendahuluan}
                adjustInti={adjustInti}
                adjustPenutup={adjustPenutup}
              />
            )}
          </MotionDiv>
        </AnimatePresence>
      </div>

      {/* Wizard Footer Controls */}
      <div className="p-3.5 lg:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3 shrink-0">
        {activeStep > 1 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev - 1)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">{t.lessonPlan.previous}</span>
            <span className="xs:hidden">Prev</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] text-slate-400 hidden sm:block">
          Langkah {activeStep} dari 5
        </div>

        {activeStep < 5 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev + 1)}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-brand-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{t.lessonPlan.next}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={queueStatus === 'pending' || queueStatus === 'processing' || isAiGenerating || !formState.mataPelajaran || !formState.topik}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md transition-all text-xs sm:text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.lessonPlan.create.replace('{type}', formState.documentType)}</span>
          </button>
        )}
      </div>
    </div>
  );
};
