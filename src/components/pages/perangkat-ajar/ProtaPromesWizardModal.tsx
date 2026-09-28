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
} from 'lucide-react';
import type {
  CurriculumType,
  PhaseType,
  KaldikWeek,
  ProtaItem,
  MatrixCell,
  DocumentIdentity,
} from '../../../types/perangkatAjar';
import { getDefaultNationalKaldik } from '../../../data/defaultKaldikPresets';
import { calculateRme } from '../../../utils/kaldikEngine';
import { autoDistributePromes } from '../../../utils/promesEngine';
import {
  getCurriculumPreset,
  generateQuickDistributedProta,
} from '../../../data/defaultProtaPresets';

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardApplyData {
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
  initialAcademicYear?: string;
  initialSubject?: string;
  initialGradeLevel?: string;
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

const GRADE_LEVELS: { grade: string; phase: PhaseType }[] = [
  { grade: 'Kelas 1', phase: 'A' },
  { grade: 'Kelas 2', phase: 'A' },
  { grade: 'Kelas 3', phase: 'B' },
  { grade: 'Kelas 4', phase: 'B' },
  { grade: 'Kelas 5', phase: 'C' },
  { grade: 'Kelas 6', phase: 'C' },
];

export const ProtaPromesWizardModal: React.FC<ProtaPromesWizardModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialAcademicYear = '2024/2025',
  initialSubject = 'Bahasa Indonesia',
  initialGradeLevel = 'Kelas 4',
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Identitas & Mapel
  const [gradeLevel, setGradeLevel] = useState<string>(initialGradeLevel);
  const [subject, setSubject] = useState<string>(initialSubject);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [curriculum, setCurriculum] = useState<CurriculumType>('MERDEKA');
  const [academicYear, setAcademicYear] = useState<string>(initialAcademicYear);

  // Auto-derived phase
  const activePhase = useMemo<PhaseType>(() => {
    const matched = GRADE_LEVELS.find((g) => g.grade === gradeLevel);
    return matched ? matched.phase : 'B';
  }, [gradeLevel]);

  const effectiveSubject = customSubject.trim() ? customSubject.trim() : subject;

  // Step 2: Beban Jam Mengajar & Kaldik
  const [weeklyJpQuota, setWeeklyJpQuota] = useState<number>(4);
  const [reserveJpSem1, setReserveJpSem1] = useState<number>(2);
  const [reserveJpSem2, setReserveJpSem2] = useState<number>(2);

  // Kaldik Preset State (National Preset)
  const defaultWeeks = useMemo(() => getDefaultNationalKaldik(academicYear), [academicYear]);

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
  const [materiMethod, setMateriMethod] = useState<'preset' | 'divide' | 'custom'>('preset');
  const [numChaptersSem1, setNumChaptersSem1] = useState<number>(4);
  const [numChaptersSem2, setNumChaptersSem2] = useState<number>(4);

  // Target core topic hours (excluding reserves)
  const targetTopicJpSem1 = Math.max(1, rmeSem1.netTeachingJp);
  const targetTopicJpSem2 = Math.max(1, rmeSem2.netTeachingJp);

  // Generate Prota items based on chosen method
  const generatedProtaItems = useMemo<ProtaItem[]>(() => {
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

  // Handle final apply
  const handleApply = () => {
    // Generate Promes cells automatically for Semester 1 and 2
    const sem1Weeks = defaultWeeks.filter((w) => w.month >= 7 && w.month <= 12);
    const sem2Weeks = defaultWeeks.filter((w) => w.month >= 1 && w.month <= 6);

    const cellsSem1 = autoDistributePromes({
      items: sem1Items.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: sem1Weeks,
      weeklyJpLimit: weeklyJpQuota,
    });
    const cellsSem2 = autoDistributePromes({
      items: sem2Items.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: sem2Weeks,
      weeklyJpLimit: weeklyJpQuota,
    });

    onApply({
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
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                  Otomatis Pas
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Jawab 4 pertanyaan ringkas. Sistem otomatis menghitung alokasi jam dan matriks semester.
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
                  1. Pilih Tingkat Kelas (SD / MI)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
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
                    Preset Kalender Pendidikan Nasional
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    Otomatis Dihitung
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-snug">
                  Sistem telah menghitung hari efektif mengajar berdasarkan standar nasional (Semester 1: Juli–Desember, Semester 2: Januari–Juni):
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      materiMethod === 'preset'
                        ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      Paket Silabus Resmi (Standar Nasional)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Memuat daftar bab, elemen, dan TP standar Kurikulum Merdeka yang alokasi JP-nya sudah seimbang 100%.
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
                </div>
              </div>

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
                    ✓ Total {targetTopicJpSem1 + targetTopicJpSem2} JP Materi
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
                      Perangkat Ajar Siap Diterapkan!
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Seluruh perhitungan alokasi jam telah seimbang 100% (0 JP selisih) dan siap diterapkan ke Program Tahunan & Program Semester.
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
                      <span>{totalAllocatedSem1 + reserveJpSem1} JP (PAS)</span>
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
                      <span>{totalAllocatedSem2 + reserveJpSem2} JP (PAS)</span>
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
                    Seluruh jam materi akan langsung didistribusikan merata ke pekan-pekan efektif KBM tanpa menyentuh minggu libur/asesmen. Anda tetap dapat menggeser jam secara fleksibel di tab Promes kapan pun.
                  </span>
                </div>
              </div>
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
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Terapkan & Buka Dokumen</span>
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
