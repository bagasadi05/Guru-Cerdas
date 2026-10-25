import { useState, useEffect, useMemo } from 'react';
import type {
  CurriculumType,
  PhaseType,
  ProtaItem,
} from '../../../../../types/perangkatAjar';
import { generateKaldikFromCalendar } from '../../../../../utils/kaldikCalendarGenerator';
import {
  calculateRme,
  getPhaseForGrade,
} from '../../../../../utils/kaldikEngine';
import { autoDistributePromes } from '../../../../../utils/promesEngine';
import {
  findCurriculumPreset,
  getCurriculumPreset,
  generateQuickDistributedProta,
} from '../../../../../data/defaultProtaPresets';
import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
  type AiProtaTopics,
} from '../../../../../services/protaAiGenerator';
import {
  WizardStep,
  WizardApplyTarget,
  ProtaPromesWizardModalProps,
  COMMON_SUBJECTS,
} from './types';

export const useProtaWizardState = ({
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
}: ProtaPromesWizardModalProps) => {
  const [step, setStep] = useState<WizardStep>(1);

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

  return {
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
    activePhase,
    effectiveSubject,
    weeklyJpQuota,
    setWeeklyJpQuota,
    reserveJpSem1,
    setReserveJpSem1,
    reserveJpSem2,
    setReserveJpSem2,
    target,
    setTarget,
    defaultWeeks,
    usesOwnKaldik,
    rmeSem1,
    rmeSem2,
    chosenMethod,
    setMateriMethod,
    numChaptersSem1,
    setNumChaptersSem1,
    numChaptersSem2,
    setNumChaptersSem2,
    presetAvailable,
    materiMethod,
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
  };
};
