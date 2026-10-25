import { useState, useMemo, useCallback } from 'react';
import type { ProtaItem } from '../../../../../types/perangkatAjar';
import { getProtaBalanceBadgeProps } from '../../../../../utils/protaEngine';
import type { ProtaFormData, ProtaTabProps } from './types';

const INITIAL_FORM_DATA: ProtaFormData = {
  semesterNumber: 1,
  elementOrDomain: '',
  learningObjectiveCode: '',
  learningObjectiveText: '',
  coreTopic: '',
  targetJp: 4,
};

export const useProtaTabState = ({
  items,
  validation,
  onAddItem,
  onUpdateItem,
}: Pick<ProtaTabProps, 'items' | 'validation' | 'onAddItem' | 'onUpdateItem'>) => {
  const [activeSemFilter, setActiveSemFilter] = useState<'ALL' | 1 | 2>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProtaFormData>(INITIAL_FORM_DATA);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setIsAdding(false);
    setEditingId(null);
  }, []);

  const handleStartEdit = useCallback((item: ProtaItem) => {
    setFormData({
      semesterNumber: item.semesterNumber,
      elementOrDomain: item.elementOrDomain,
      learningObjectiveCode: item.learningObjectiveCode,
      learningObjectiveText: item.learningObjectiveText,
      coreTopic: item.coreTopic,
      targetJp: item.targetJp,
    });
    setEditingId(item.id);
    setIsAdding(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.learningObjectiveText.trim()) return;

      const payload = {
        semesterNumber: formData.semesterNumber,
        elementOrDomain: formData.elementOrDomain,
        learningObjectiveCode: formData.learningObjectiveCode,
        learningObjectiveText: formData.learningObjectiveText,
        coreTopic: formData.coreTopic,
        targetJp: Number(formData.targetJp) || 0,
      };

      if (editingId) {
        onUpdateItem(editingId, payload);
      } else {
        onAddItem(payload);
      }

      resetForm();
    },
    [formData, editingId, onAddItem, onUpdateItem, resetForm]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((it) => activeSemFilter === 'ALL' || it.semesterNumber === activeSemFilter)
      .sort((a, b) => {
        const semA = a.semesterNumber ?? 1;
        const semB = b.semesterNumber ?? 1;
        if (semA !== semB) return semA - semB;
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      });
  }, [items, activeSemFilter]);

  const isFirstInSemester = useCallback(
    (item: ProtaItem) => {
      const semItems = items
        .filter((i) => (i.semesterNumber ?? 1) === (item.semesterNumber ?? 1))
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return semItems.length > 0 && semItems[0].id === item.id;
    },
    [items]
  );

  const isLastInSemester = useCallback(
    (item: ProtaItem) => {
      const semItems = items
        .filter((i) => (i.semesterNumber ?? 1) === (item.semesterNumber ?? 1))
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return semItems.length > 0 && semItems[semItems.length - 1].id === item.id;
    },
    [items]
  );

  const sem1Badge = useMemo(
    () => getProtaBalanceBadgeProps(validation.statusSemester1, validation.diffSemester1),
    [validation.statusSemester1, validation.diffSemester1]
  );

  const sem2Badge = useMemo(
    () => getProtaBalanceBadgeProps(validation.statusSemester2, validation.diffSemester2),
    [validation.statusSemester2, validation.diffSemester2]
  );

  const annualBadge = useMemo(
    () => getProtaBalanceBadgeProps(validation.statusAnnual, validation.diffAnnual),
    [validation.statusAnnual, validation.diffAnnual]
  );

  const hasDiscrepancy =
    validation.statusAnnual !== 'PAS' ||
    validation.statusSemester1 !== 'PAS' ||
    validation.statusSemester2 !== 'PAS';

  const isDeficit =
    validation.statusAnnual === 'DEFISIT' ||
    validation.statusSemester1 === 'DEFISIT' ||
    validation.statusSemester2 === 'DEFISIT';

  const discrepancyTitle = useMemo(() => {
    if (validation.diffAnnual < 0) {
      return `Alokasi jam mengajar masih kurang ${Math.abs(validation.diffAnnual)} JP dari target minggu efektif!`;
    }
    if (validation.diffAnnual > 0) {
      return `Alokasi jam mengajar berlebih ${validation.diffAnnual} JP dari target minggu efektif!`;
    }
    return `Alokasi jam per semester belum seimbang (Ganjil: ${
      validation.diffSemester1 > 0 ? `+${validation.diffSemester1}` : validation.diffSemester1
    } JP, Genap: ${validation.diffSemester2 > 0 ? `+${validation.diffSemester2}` : validation.diffSemester2} JP)!`;
  }, [validation.diffAnnual, validation.diffSemester1, validation.diffSemester2]);

  const discrepancyDesc = useMemo(() => {
    if (validation.diffAnnual < 0) {
      return 'Total jam materi belum mencukupi jam efektif. Seimbangkan Jam menambah kekurangannya ke materi, mulai dari materi terbesar.';
    }
    if (validation.diffAnnual > 0) {
      return 'Total jam materi melebihi jam tatap muka yang tersedia. Seimbangkan Jam mengurangi kelebihannya, mulai dari materi terbesar.';
    }
    return 'Total jam tahunan sudah pas, tetapi pembagian Semester 1 dan 2 belum sesuai Kaldik. Seimbangkan Jam menyesuaikan tiap semester.';
  }, [validation.diffAnnual]);

  return {
    activeSemFilter,
    setActiveSemFilter,
    isAdding,
    setIsAdding,
    editingId,
    formData,
    setFormData,
    resetForm,
    handleStartEdit,
    handleSubmit,
    filteredItems,
    isFirstInSemester,
    isLastInSemester,
    sem1Badge,
    sem2Badge,
    annualBadge,
    hasDiscrepancy,
    isDeficit,
    discrepancyTitle,
    discrepancyDesc,
  };
};
