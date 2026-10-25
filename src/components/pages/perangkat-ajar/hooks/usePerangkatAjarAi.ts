import { useState, useCallback } from 'react';
import type {
  KaldikWeek,
  ProtaItem,
  ProtaHeader,
  MatrixCell,
  CurriculumType,
  PhaseType,
  RmeSummary,
} from '../../../../types/perangkatAjar';
import { autoDistributePromes } from '../../../../utils/promesEngine';
import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
} from '../../../../services/protaAiGenerator';
import type { HeaderFields } from '../types/perangkatAjarPageTypes';
import { useToast } from '../../../../hooks/useToast';

interface UsePerangkatAjarAiOptions {
  subject: string;
  gradeLevel: string;
  phase: PhaseType | undefined;
  curriculum: CurriculumType;
  weeks: KaldikWeek[];
  weeklyJpLimit: number;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  protaItems: ProtaItem[];
  currentHeader: HeaderFields;
  userId: string;
  flushPendingPromesSaves: () => void;
  rememberForUndo: (message: string) => void;
  setProtaItems: React.Dispatch<React.SetStateAction<ProtaItem[]>>;
  setPromesCellsSem1: React.Dispatch<React.SetStateAction<MatrixCell[]>>;
  setPromesCellsSem2: React.Dispatch<React.SetStateAction<MatrixCell[]>>;
  persistDocument: (
    header: ProtaHeader,
    items: ProtaItem[],
    cellsSem1: MatrixCell[],
    cellsSem2: MatrixCell[],
    limit: number
  ) => Promise<string>;
}

export function usePerangkatAjarAi({
  subject,
  gradeLevel,
  phase,
  curriculum,
  weeks,
  weeklyJpLimit,
  rmeSem1,
  rmeSem2,
  protaItems,
  currentHeader,
  userId,
  flushPendingPromesSaves,
  rememberForUndo,
  setProtaItems,
  setPromesCellsSem1,
  setPromesCellsSem2,
  persistDocument,
}: UsePerangkatAjarAiOptions) {
  const toast = useToast();
  const [isAiBusy, setIsAiBusy] = useState(false);

  const handleFillWithAi = useCallback(async () => {
    if (!subject.trim() || !gradeLevel.trim()) {
      toast.info('Isi mata pelajaran dan kelas terlebih dahulu.');
      return;
    }
    flushPendingPromesSaves();
    setIsAiBusy(true);
    try {
      const topics = await generateProtaTopicsWithAi({ subject, gradeLevel, phase, curriculum });
      const items = aiTopicsToProtaItems(topics, rmeSem1.netTeachingJp, rmeSem2.netTeachingJp);
      const distribute = (semesterNumber: 1 | 2) =>
        autoDistributePromes({
          items: items
            .filter((it) => it.semesterNumber === semesterNumber)
            .map((it) => ({ id: it.id, targetJp: it.targetJp })),
          semesterWeeks: weeks,
          weeklyJpLimit,
          semesterNumber,
        });
      const cellsSem1 = distribute(1);
      const cellsSem2 = distribute(2);

      if (protaItems.length > 0) {
        rememberForUndo('Materi diganti draf dari AI.');
      }
      setProtaItems(items);
      setPromesCellsSem1(cellsSem1);
      setPromesCellsSem2(cellsSem2);
      await persistDocument({ ...currentHeader, userId }, items, cellsSem1, cellsSem2, weeklyJpLimit);
      if (protaItems.length === 0) {
        toast.success(`Draf materi ${subject} ${gradeLevel} dari AI siap. Periksa dengan CP terbaru.`);
      }
    } catch (err) {
      console.warn('[PerangkatAjarPage] AI Prota draft failed:', err);
      toast.error(err instanceof Error ? err.message : 'AI tidak bisa dihubungi. Coba lagi.');
    } finally {
      setIsAiBusy(false);
    }
  }, [
    subject,
    gradeLevel,
    phase,
    curriculum,
    weeks,
    weeklyJpLimit,
    rmeSem1.netTeachingJp,
    rmeSem2.netTeachingJp,
    protaItems.length,
    currentHeader,
    userId,
    flushPendingPromesSaves,
    rememberForUndo,
    setProtaItems,
    setPromesCellsSem1,
    setPromesCellsSem2,
    persistDocument,
    toast,
  ]);

  return {
    isAiBusy,
    setIsAiBusy,
    handleFillWithAi,
  };
}
