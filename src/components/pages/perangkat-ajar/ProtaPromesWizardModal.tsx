import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Layers,
  Wand2,
  Info,
  Bot,
  Loader2,
} from 'lucide-react';
import type {
  CurriculumType,
  PhaseType,
  KaldikWeek,
  ProtaItem,
  MatrixCell,
  DocumentIdentity,
} from '../../../types/perangkatAjar';
import { generateKaldikFromCalendar } from '../../../utils/kaldikCalendarGenerator';
import {
  calculateRme,
  getAcademicYearOptions,
  getPhaseForGrade,
} from '../../../utils/kaldikEngine';
import { autoDistributePromes } from '../../../utils/promesEngine';
import {
  findCurriculumPreset,
  getCurriculumPreset,
  generateQuickDistributedProta,
} from '../../../data/defaultProtaPresets';
import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
  type AiProtaTopics,
} from '../../../services/protaAiGenerator';

export type WizardStep = 1 | 2 | 3 | 4;

export type WizardApplyTarget = 'new' | 'replace';

export interface WizardApplyData {
  target: WizardApplyTarget;
  academicYear: string;
  subject: string;
  gradeLevel: string;
  phase: PhaseType;
  curriculum: CurriculumType;
  weeklyJpQuota: number;
  reserveJpSem1: number;
  reserveJpSem2: number;
  weeks: KaldikWeek[];
  protaItems: ProtaItem[];
  promesCellsSem1: MatrixCell[];
  promesCellsSem2: MatrixCell[];
  identityUpdates: Partial<DocumentIdentity>;
}

interface ProtaPromesWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: WizardApplyData) => void;
  initialAcademicYear: string;
  initialSubject?: string;
  initialGradeLevel?: string;
  initialCurriculum?: CurriculumType;
  initialWeeklyJpQuota?: number;
  /** The teacher's Kaldik for `initialAcademicYear`; used instead of the national preset. */
  currentWeeks: KaldikWeek[];
  /** The open document already has materi; step 4 then asks whether to replace it. */
  hasExistingData: boolean;
  /** Preselects "save as a new document" (used by the "Prota baru" button). */
  preferNewDocument?: boolean;
}

const COMMON_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'IPAS',
  'Pendidikan Pancasila',
  'Pendidikan Agama Islam',
  'Bahasa Inggris',
  'Seni Rupa',
  'PJOK',
];

const GRADE_LEVELS: { grade: string; phase: PhaseType }[] = Array.from({ length: 12 }, (_, i) => {
  const grade = `Kelas ${i + 1}`;
  return { grade, phase: getPhaseForGrade(grade) ?? 'A' };
});

export const ProtaPromesWizardModal: React.FC<ProtaPromesWizardModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialAcademicYear,
  initialSubject = 'Bahasa Indonesia',
  initialGradeLevel = 'Kelas 4',
  initialCurriculum = 'MERDEKA',
  initialWeeklyJpQuota = 4,
  currentWeeks,
  hasExistingData,
  preferNewDocument = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Identitas & Mapel
  const [gradeLevel, setGradeLevel] = useState<string>(initialGradeLevel);
  const [subject, setSubject] = useState<string>(initialSubject);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [curriculum, setCurriculum] = useState<CurriculumType>(initialCurriculum);
  const [academicYear, setAcademicYear] = useState<string>(initialAcademicYear);

  const activePhase = useMemo<PhaseType>(() => getPhaseForGrade(gradeLevel) ?? 'B', [gradeLevel]);

  const effectiveSubject = customSubject.trim() ? customSubject.trim() : subject;

  // Step 2: Beban Jam Mengajar & Kaldik
  const [weeklyJpQuota, setWeeklyJpQuota] = useState<number>(initialWeeklyJpQuota);
  const [reserveJpSem1, setReserveJpSem1] = useState<number>(2);
  const [reserveJpSem2, setReserveJpSem2] = useState<number>(2);

  const [target, setTarget] = useState<WizardApplyTarget>('new');

  // The modal stays mounted, so refresh its answers from the open document on every open.
  useEffect(() => {
    if (!isOpen) return;
    const isPresetSubject = COMMON_SUBJECTS.includes(initialSubject);
    setStep(1);
    setGradeLevel(initialGradeLevel);
    setSubject(isPresetSubject ? initialSubject : COMMON_SUBJECTS[0]);
    setCustomSubject(isPresetSubject ? '' : initialSubject);
    setCurriculum(initialCurriculum);
    setAcademicYear(initialAcademicYear);
    setWeeklyJpQuota(initialWeeklyJpQuota);
    // An empty document is reused; one with materi is kept unless the teacher picks replace.
    setTarget(preferNewDocument || hasExistingData ? 'new' : 'replace');
    // Only re-seed when the modal opens; later prop changes must not wipe the teacher's answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // A teacher's own Kaldik applies to the year it was made for; other years use that year's dates.
  const defaultWeeks = useMemo(
    () =>
      academicYear === initialAcademicYear && currentWeeks.length > 0
        ? currentWeeks
        : generateKaldikFromCalendar(academicYear).weeks,
    [academicYear, initialAcademicYear, currentWeeks]
  );
  const usesOwnKaldik = defaultWeeks === currentWeeks;

  // Compute RME for both semesters
  const rmeSem1 = useMemo(
    () => calculateRme(defaultWeeks, 1, weeklyJpQuota, reserveJpSem1),
    [defaultWeeks, weeklyJpQuota, reserveJpSem1]
  );
  const rmeSem2 = useMemo(
    () => calculateRme(defaultWeeks, 2, weeklyJpQuota, reserveJpSem2),
    [defaultWeeks, weeklyJpQuota, reserveJpSem2]
  );

  // Step 3: Pilihan Metode Penentuan Materi
  const [chosenMethod, setMateriMethod] = useState<'preset' | 'divide' | 'ai'>('preset');
  const [numChaptersSem1, setNumChaptersSem1] = useState<number>(4);
  const [numChaptersSem2, setNumChaptersSem2] = useState<number>(4);

  // Bundled chapter lists exist only for a few Kurikulum Merdeka subject/grade pairs.
  const presetAvailable =
    curriculum === 'MERDEKA' && findCurriculumPreset(effectiveSubject, gradeLevel) !== null;
  const materiMethod = chosenMethod === 'preset' && !presetAvailable ? 'divide' : chosenMethod;

  // AI drafts belong to one subject, grade and curriculum; changing any of them discards it.
  const aiKey = `${effectiveSubject}|${gradeLevel}|${curriculum}`;
  const [aiDraft, setAiDraft] = useState<{ key: string; topics: AiProtaTopics } | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiError, setAiError] = useState('');
  const aiTopics = aiDraft?.key === aiKey ? aiDraft.topics : null;
  const waitingForAi = materiMethod === 'ai' && !aiTopics;

  const handleGenerateWithAi = async () => {
    setAiStatus('loading');
    setAiError('');
    const key = aiKey;
    try {
      const topics = await generateProtaTopicsWithAi({
        subject: effectiveSubject,
        gradeLevel,
        phase: activePhase,
        curriculum,
      });
      setAiDraft({ key, topics });
      setAiStatus('idle');
    } catch (err) {
      setAiStatus('error');
      setAiError(err instanceof Error ? err.message : 'AI tidak bisa dihubungi. Coba lagi.');
    }
  };

  // Target core topic hours (excluding reserves)
  const targetTopicJpSem1 = Math.max(1, rmeSem1.netTeachingJp);
  const targetTopicJpSem2 = Math.max(1, rmeSem2.netTeachingJp);

  // Generate Prota items based on chosen method
  const generatedProtaItems = useMemo<ProtaItem[]>(() => {
    if (materiMethod === 'ai') {
      return aiTopics ? aiTopicsToProtaItems(aiTopics, targetTopicJpSem1, targetTopicJpSem2) : [];
    }
    if (materiMethod === 'preset') {
      const presetItems = getCurriculumPreset(
        effectiveSubject,
        gradeLevel,
        targetTopicJpSem1,
        targetTopicJpSem2
      );
      if (presetItems && presetItems.length > 0) {
        return presetItems;
      }
    }

    // Default or 'divide': Generate evenly divided chapters
    return generateQuickDistributedProta(
      effectiveSubject,
      gradeLevel,
      numChaptersSem1,
      numChaptersSem2,
      targetTopicJpSem1,
      targetTopicJpSem2
    );
  }, [
    materiMethod,
    aiTopics,
    effectiveSubject,
    gradeLevel,
    targetTopicJpSem1,
    targetTopicJpSem2,
    numChaptersSem1,
    numChaptersSem2,
  ]);

  const sem1Items = useMemo(
    () => generatedProtaItems.filter((i) => i.semesterNumber === 1),
    [generatedProtaItems]
  );
  const sem2Items = useMemo(
    () => generatedProtaItems.filter((i) => i.semesterNumber === 2),
    [generatedProtaItems]
  );

  const totalAllocatedSem1 = sem1Items.reduce((acc, i) => acc + i.targetJp, 0);
  const totalAllocatedSem2 = sem2Items.reduce((acc, i) => acc + i.targetJp, 0);
  const diffSem1 = totalAllocatedSem1 - rmeSem1.netTeachingJp;
  const diffSem2 = totalAllocatedSem2 - rmeSem2.netTeachingJp;
  const isBalanced = diffSem1 === 0 && diffSem2 === 0;

  // Handle final apply
  const handleApply = () => {
    const cellsSem1 = autoDistributePromes({
      items: sem1Items.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: defaultWeeks,
      weeklyJpLimit: weeklyJpQuota,
      semesterNumber: 1,
    });
    const cellsSem2 = autoDistributePromes({
      items: sem2Items.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: defaultWeeks,
      weeklyJpLimit: weeklyJpQuota,
      semesterNumber: 2,
    });

    onApply({
      target,
      academicYear,
      subject: effectiveSubject,
      gradeLevel,
      phase: activePhase,
      curriculum,
      weeklyJpQuota,
      reserveJpSem1,
      reserveJpSem2,
      weeks: defaultWeeks,
      protaItems: generatedProtaItems,
      promesCellsSem1: cellsSem1,
      promesCellsSem2: cellsSem2,
      identityUpdates: {
        subject: effectiveSubject,
        gradeLevel,
        phase: `Fase ${activePhase}`,
        curriculum,
        academicYear,
      },
    });

    onClose();
  };

  // Prevent background scroll and allow closing with Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-50/70 via-emerald-50/40 to-white dark:from-slate-800/80 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600 text-white shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Panduan Cepat Prota & Promes</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Empat langkah. Jam per materi dan matriks Promes dihitung dari minggu efektif Kaldik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Step Progress Pills */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold shrink-0">
          {[
            { num: 1 as WizardStep, label: 'Identitas & Mapel' },
            { num: 2 as WizardStep, label: 'Jam & Kaldik' },
            { num: 3 as WizardStep, label: 'Materi (TP)' },
            { num: 4 as WizardStep, label: 'Ringkasan & Terapkan' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`py-1.5 px-1 sm:px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                step === s.num
                  ? 'bg-brand-600 text-white font-bold shadow-xs'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num ? 'bg-white text-brand-600 font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {s.num}
              </span>
              <span className="hidden sm:inline truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* ============================================================== */}
          {/* STEP 1: IDENTITAS & MATA PELAJARAN                            */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Pilih Kelas
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {GRADE_LEVELS.map((g) => (
                    <button
                      key={g.grade}
                      type="button"
                      onClick={() => setGradeLevel(g.grade)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        gradeLevel === g.grade
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                      }`}
                    >
                      <div>{g.grade}</div>
                      <div className={`text-[10px] font-normal ${gradeLevel === g.grade ? 'text-brand-100' : 'text-slate-400'}`}>
                        Fase {g.phase}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Pilih Mata Pelajaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {COMMON_SUBJECTS.map((sub) => {
                    const isSelected = subject === sub && !customSubject.trim();
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSubject(sub);
                          setCustomSubject('');
                        }}
                        className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                    Atau ketik nama mata pelajaran lain:
                  </span>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Contoh: Bahasa Jawa / Seni Musik / Koding & Robotik"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kurikulum Pembelajaran
                  </label>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value as CurriculumType)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="MERDEKA">Kurikulum Merdeka</option>
                    <option value="K13">Kurikulum 2013 (K-13)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Ajaran
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {getAcademicYearOptions(new Date(), initialAcademicYear).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: BEBAN JAM & KALENDER PENDIDIKAN                       */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Beban Mengajar / Jam Pelajaran (JP) per Pekan
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {[2, 3, 4, 5, 6].map((jp) => (
                    <button
                      key={jp}
                      type="button"
                      onClick={() => setWeeklyJpQuota(jp)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        weeklyJpQuota === jp
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                      }`}
                    >
                      {jp} JP / Minggu
                    </button>
                  ))}
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={weeklyJpQuota}
                      onChange={(e) => setWeeklyJpQuota(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-2 px-2 text-center text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold"
                      title="Kustom JP"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic National Kaldik Card */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {usesOwnKaldik ? 'Kalender Pendidikan Anda' : `Kalender ${academicYear}`}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-snug">
                  {usesOwnKaldik
                    ? `Minggu efektif dihitung dari Kaldik ${academicYear} yang sudah Anda atur di tab Kaldik.`
                    : `Belum ada Kaldik tersimpan untuk ${academicYear}. Dipakai kalender dari tanggal tahun itu dan libur nasional SKB 3 Menteri. Sesuaikan di tab Kaldik bila kalender sekolah berbeda.`}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Semester 1 (Ganjil)</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      {rmeSem1.effectiveWeeks} Pekan Efektif KBM
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      = {rmeSem1.totalAvailableJp} JP Tersedia
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Semester 2 (Genap)</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      {rmeSem2.effectiveWeeks} Pekan Efektif KBM
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      = {rmeSem2.totalAvailableJp} JP Tersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* Reserve JP Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Jam Pelajaran Cadangan (Remedial & Pengayaan)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Disisihkan untuk pendalaman materi, remedial, atau antisipasi jam KBM yang terpotong kegiatan sekolah.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Cadangan Semester 1:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[0, 2, 4].map((cad) => (
                        <button
                          key={cad}
                          type="button"
                          onClick={() => setReserveJpSem1(cad)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            reserveJpSem1 === cad
                              ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          {cad} JP
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Cadangan Semester 2:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[0, 2, 4].map((cad) => (
                        <button
                          key={cad}
                          type="button"
                          onClick={() => setReserveJpSem2(cad)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            reserveJpSem2 === cad
                              ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          {cad} JP
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: PENENTUAN MATERI (TP)                                 */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Pilih Cara Menentukan Materi & Tujuan Pembelajaran (TP):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMateriMethod('preset')}
                    disabled={!presetAvailable}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                      materiMethod === 'preset'
                        ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      Daftar Bab Bawaan
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {presetAvailable
                        ? `Bab, elemen, dan TP contoh dari buku Kurikulum Merdeka ${effectiveSubject} ${gradeLevel}. Periksa dan sesuaikan dengan TP sekolah.`
                        : `Belum tersedia untuk ${effectiveSubject} ${gradeLevel}${curriculum === 'K13' ? ' (K-13)' : ''}. Pakai AI atau pembagian per bab.`}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMateriMethod('divide')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      materiMethod === 'divide'
                        ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-600" />
                      Bagi Rata Berdasarkan Jumlah Bab
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Cukup tentukan berapa bab per semester. Sistem membagi rata seluruh jam tanpa perlu hitung rumus.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMateriMethod('ai')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer sm:col-span-2 ${
                      materiMethod === 'ai'
                        ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-brand-600" />
                      Susun dengan AI
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      AI membuat draf elemen, TP, dan bab untuk {effectiveSubject} {gradeLevel}. Jamnya tetap dihitung dari Kaldik.
                      Periksa kesesuaiannya dengan CP terbaru sebelum dipakai.
                    </p>
                  </button>
                </div>
              </div>

              {materiMethod === 'ai' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => void handleGenerateWithAi()}
                    disabled={aiStatus === 'loading'}
                    className="flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-60"
                  >
                    {aiStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    <span>
                      {aiStatus === 'loading' ? 'AI sedang menyusun...' : aiTopics ? 'Buat ulang dengan AI' : 'Buat dengan AI'}
                    </span>
                  </button>
                  {aiStatus === 'error' && <p className="text-rose-600 dark:text-rose-400">{aiError}</p>}
                  {aiTopics && aiStatus !== 'loading' && (
                    <p className="text-slate-500 dark:text-slate-400">Draf dari AI. Periksa dan sunting di tab Prota setelah diterapkan.</p>
                  )}
                </div>
              )}

              {materiMethod === 'divide' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Berapa bab / lingkup materi yang diajarkan?
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Jumlah Bab Semester 1:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={numChaptersSem1}
                        onChange={(e) => setNumChaptersSem1(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Jumlah Bab Semester 2:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={numChaptersSem2}
                        onChange={(e) => setNumChaptersSem2(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview of chapters generated */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pratinjau Materi yang Akan Dibuat ({generatedProtaItems.length} Materi):
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Total {totalAllocatedSem1 + totalAllocatedSem2} JP materi
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 text-xs">
                  {generatedProtaItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                          {item.semesterNumber === 1 ? '[Sem 1]' : '[Sem 2]'} {item.learningObjectiveCode}:
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{item.coreTopic}</span>
                      </div>
                      <span className="font-bold text-brand-600 dark:text-brand-400 text-xs shrink-0">
                        {item.targetJp} JP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: RINGKASAN & KONFIRMASI                                */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Ringkasan
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      {isBalanced
                        ? 'Jam materi sama dengan jam efektif di kedua semester.'
                        : 'Jam materi belum sama dengan jam efektif. Seimbangkan di tab Prota setelah diterapkan.'}
                    </p>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">SEMESTER 1 (GANJIL)</span>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Pekan Efektif KBM:</span>
                      <strong>{rmeSem1.effectiveWeeks} Pekan</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Materi Pokok ({sem1Items.length} Bab):</span>
                      <strong>{totalAllocatedSem1} JP</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Jam Cadangan:</span>
                      <strong>{reserveJpSem1} JP</strong>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Total Alokasi:</span>
                      <span>
                        {totalAllocatedSem1 + reserveJpSem1} JP{diffSem1 === 0 ? '' : ` (${diffSem1 > 0 ? '+' : ''}${diffSem1})`}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">SEMESTER 2 (GENAP)</span>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Pekan Efektif KBM:</span>
                      <strong>{rmeSem2.effectiveWeeks} Pekan</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Materi Pokok ({sem2Items.length} Bab):</span>
                      <strong>{totalAllocatedSem2} JP</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Jam Cadangan:</span>
                      <strong>{reserveJpSem2} JP</strong>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Total Alokasi:</span>
                      <span>
                        {totalAllocatedSem2 + reserveJpSem2} JP{diffSem2 === 0 ? '' : ` (${diffSem2 > 0 ? '+' : ''}${diffSem2})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promes Note */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Matriks Program Semester (Promes) Otomatis Terisi</span>
                  <span className="text-[11px] leading-snug">
                    Jam materi diisi berurutan ke minggu KBM; minggu libur dan asesmen dilewati. Jam bisa digeser di tab Promes.
                  </span>
                </div>
              </div>

              {hasExistingData && !preferNewDocument && (
                <fieldset className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                  <legend className="px-1 font-bold text-slate-700 dark:text-slate-300">Simpan hasilnya ke</legend>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="wizard-target"
                      checked={target === 'new'}
                      onChange={() => setTarget('new')}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Dokumen baru</strong>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Prota yang sedang dibuka tetap utuh. Pindah dokumen lewat pilihan di atas halaman.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="wizard-target"
                      checked={target === 'replace'}
                      onChange={() => setTarget('replace')}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Ganti isi dokumen ini</strong>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Materi dan Promes yang ada diganti. Bisa dibatalkan sesaat setelah diterapkan.
                      </span>
                    </span>
                  </label>
                </fieldset>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : 1))}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <div />
          )}

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Langkah {step} dari 4
          </div>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : 4))}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>Lanjut ke Langkah {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={waitingForAi}
              title={waitingForAi ? 'Buat draf materi dengan AI di langkah 3 terlebih dahulu' : undefined}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Terapkan</span>
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
