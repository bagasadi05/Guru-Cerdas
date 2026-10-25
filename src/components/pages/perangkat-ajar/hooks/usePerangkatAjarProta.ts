import { useMemo, useCallback } from 'react';
import type { ProtaItem, RmeSummary, CurriculumType } from '../../../../types/perangkatAjar';
import {
  validateProtaBalance,
  moveProtaItem,
  swapItemSemester,
  autoBalanceProtaJp,
} from '../../../../utils/protaEngine';
import { findCurriculumPreset, getCurriculumPreset } from '../../../../data/defaultProtaPresets';
import { useToast } from '../../../../hooks/useToast';

interface UsePerangkatAjarProtaOptions {
  protaItems: ProtaItem[];
  setProtaItems: React.Dispatch<React.SetStateAction<ProtaItem[]>>;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  subject: string;
  gradeLevel: string;
  curriculum: CurriculumType;
  triggerProtaSave: (items: ProtaItem[]) => void;
  rememberForUndo: (message: string) => void;
}

export function usePerangkatAjarProta({
  protaItems,
  setProtaItems,
  rmeSem1,
  rmeSem2,
  subject,
  gradeLevel,
  curriculum,
  triggerProtaSave,
  rememberForUndo,
}: UsePerangkatAjarProtaOptions) {
  const toast = useToast();

  const protaValidation = useMemo(
    () => validateProtaBalance(protaItems, rmeSem1, rmeSem2),
    [protaItems, rmeSem1, rmeSem2]
  );

  const presetAvailable = useMemo(
    () => curriculum === 'MERDEKA' && findCurriculumPreset(subject, gradeLevel) !== null,
    [curriculum, subject, gradeLevel]
  );

  const handleAddProtaItem = useCallback(
    (newItem: Omit<ProtaItem, 'id' | 'orderIndex'>) => {
      const item: ProtaItem = {
        ...newItem,
        id: crypto.randomUUID(),
        orderIndex: protaItems.length,
      };
      const updated = [...protaItems, item];
      setProtaItems(updated);
      triggerProtaSave(updated);
    },
    [protaItems, setProtaItems, triggerProtaSave]
  );

  const handleUpdateProtaItem = useCallback(
    (id: string, updates: Partial<ProtaItem>) => {
      const updated = protaItems.map((it) => (it.id === id ? { ...it, ...updates } : it));
      setProtaItems(updated);
      triggerProtaSave(updated);
    },
    [protaItems, setProtaItems, triggerProtaSave]
  );

  const handleDeleteProtaItem = useCallback(
    (id: string) => {
      const target = protaItems.find((it) => it.id === id);
      rememberForUndo(
        target?.learningObjectiveCode ? `Materi ${target.learningObjectiveCode} dihapus.` : 'Materi dihapus.'
      );
      const updated = protaItems.filter((it) => it.id !== id);
      setProtaItems(updated);
      triggerProtaSave(updated);
    },
    [protaItems, setProtaItems, triggerProtaSave, rememberForUndo]
  );

  const handleMoveProtaItem = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const updated = moveProtaItem(protaItems, id, direction);
      setProtaItems(updated);
      triggerProtaSave(updated);
    },
    [protaItems, setProtaItems, triggerProtaSave]
  );

  const handleSwapSemesterProtaItem = useCallback(
    (id: string) => {
      const updated = swapItemSemester(protaItems, id);
      setProtaItems(updated);
      triggerProtaSave(updated);
      toast.success('Materi dipindahkan ke semester lain.');
    },
    [protaItems, setProtaItems, triggerProtaSave, toast]
  );

  const handleAutoBalanceProta = useCallback(() => {
    if (protaItems.length === 0) {
      toast.info('Belum ada materi. Tambahkan materi atau buka Panduan Cepat.');
      return;
    }

    const result = autoBalanceProtaJp(protaItems, rmeSem1, rmeSem2);
    if (!result.isBalanced && result.adjustedItemIds.length === 0) {
      toast.info('Jam sudah pas, atau minggu efektif di Kaldik belum diisi.');
      return;
    }

    rememberForUndo(result.message || 'Jam materi diseimbangkan.');
    setProtaItems(result.items);
    triggerProtaSave(result.items);
  }, [protaItems, rmeSem1, rmeSem2, setProtaItems, triggerProtaSave, rememberForUndo, toast]);

  const handleLoadPresetMateri = useCallback(() => {
    const presetItems = getCurriculumPreset(
      subject,
      gradeLevel,
      rmeSem1.netTeachingJp,
      rmeSem2.netTeachingJp
    );
    if (!presetItems?.length) return;
    setProtaItems(presetItems);
    triggerProtaSave(presetItems);
    toast.success(`Bab bawaan ${subject} ${gradeLevel} dimuat. Sesuaikan TP-nya dengan sekolah.`);
  }, [subject, gradeLevel, rmeSem1.netTeachingJp, rmeSem2.netTeachingJp, setProtaItems, triggerProtaSave, toast]);

  return {
    protaValidation,
    presetAvailable,
    handleAddProtaItem,
    handleUpdateProtaItem,
    handleDeleteProtaItem,
    handleMoveProtaItem,
    handleSwapSemesterProtaItem,
    handleAutoBalanceProta,
    handleLoadPresetMateri,
  };
}
