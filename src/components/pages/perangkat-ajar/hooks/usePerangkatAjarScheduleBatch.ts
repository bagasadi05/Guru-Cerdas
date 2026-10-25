import { useState, useCallback } from 'react';
import type {
  KaldikWeek,
  ProtaHeader,
  ProtaItem,
  CurriculumType,
  PromesHeader,
} from '../../../../types/perangkatAjar';
import {
  saveProta,
  savePromes,
  loadTeachingSchedule,
  type ProtaSummary,
} from '../../../../services/perangkatAjarService';
import {
  buildProtaDocument,
  planProtaFromSchedule,
  type PlannedProta,
} from '../../../../utils/protaSchedulePlanner';
import {
  generateProtaTopicsWithAi,
  type AiProtaTopics,
} from '../../../../services/protaAiGenerator';
import { useToast } from '../../../../hooks/useToast';

interface UsePerangkatAjarScheduleBatchOptions {
  weeks: KaldikWeek[];
  protaList: ProtaSummary[];
  academicYear: string;
  curriculum: CurriculumType;
  userId: string;
  buildPromesHeader: (semesterNumber: 1 | 2, id?: string, limit?: number) => PromesHeader;
  flushPendingPromesSaves: () => void;
  refreshProtaList: () => void;
  applyDocument: (header: ProtaHeader, items: ProtaItem[]) => Promise<void>;
  onNavigateToTab: (tab: 'kaldik' | 'prota' | 'promes' | 'preview') => void;
}

export function usePerangkatAjarScheduleBatch({
  weeks,
  protaList,
  academicYear,
  curriculum,
  userId,
  buildPromesHeader,
  flushPendingPromesSaves,
  refreshProtaList,
  applyDocument,
  onNavigateToTab,
}: UsePerangkatAjarScheduleBatchOptions) {
  const toast = useToast();

  const [isScheduleBatchOpen, setIsScheduleBatchOpen] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [schedulePlans, setSchedulePlans] = useState<PlannedProta[]>([]);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const handleOpenScheduleBatch = useCallback(async () => {
    setIsScheduleBatchOpen(true);
    setScheduleStatus('loading');
    try {
      const entries = await loadTeachingSchedule();
      setSchedulePlans(planProtaFromSchedule(entries, protaList, academicYear, curriculum));
      setScheduleStatus('ready');
    } catch (err) {
      console.warn('[PerangkatAjarPage] Failed to read teaching schedule:', err);
      setScheduleStatus('error');
    }
  }, [protaList, academicYear, curriculum]);

  const handleCreateFromSchedule = useCallback(
    async (keys: string[], useAi: boolean) => {
      const plans = schedulePlans.filter((plan) => keys.includes(plan.key));
      if (plans.length === 0) return;
      flushPendingPromesSaves();
      setIsCreatingBatch(true);

      const created: Array<{ header: ProtaHeader; items: ProtaItem[] }> = [];
      let failed = 0;
      let aiFailed = 0;
      for (const [index, plan] of plans.entries()) {
        setBatchProgress({ done: index, total: plans.length });
        let topics: AiProtaTopics | undefined;
        if (useAi && !plan.hasPreset) {
          try {
            topics = await generateProtaTopicsWithAi({
              subject: plan.subject,
              gradeLevel: plan.gradeLevel,
              phase: plan.phase,
              curriculum,
            });
          } catch (err) {
            console.warn('[PerangkatAjarPage] AI draft failed, using outline:', plan.key, err);
            aiFailed++;
          }
        }
        const built = buildProtaDocument(plan, weeks, academicYear, curriculum, { topics });
        const header: ProtaHeader = { ...built.header, userId };
        try {
          await saveProta(header, built.items);
          await Promise.all([
            savePromes(buildPromesHeader(1, header.id, plan.weeklyJp), built.cellsSem1),
            savePromes(buildPromesHeader(2, header.id, plan.weeklyJp), built.cellsSem2),
          ]);
          created.push({ header, items: built.items });
        } catch (err) {
          console.warn('[PerangkatAjarPage] Failed to create Prota from schedule:', plan.key, err);
          failed++;
        }
      }

      setIsCreatingBatch(false);
      setBatchProgress(null);
      refreshProtaList();
      if (created.length > 0) {
        setIsScheduleBatchOpen(false);
        await applyDocument(created[0].header, created[0].items);
        onNavigateToTab('prota');
        toast.success(
          `${created.length} Prota & Promes dibuat. Unduh semuanya sekaligus lewat tombol Unduh Paket.`
        );
      }
      if (failed > 0) {
        toast.error(`${failed} Prota gagal dibuat. Periksa koneksi lalu coba lagi.`);
      }
      if (aiFailed > 0) {
        toast.warning(`AI gagal menyusun TP untuk ${aiFailed} mapel; mapel itu memakai kerangka 4 + 4 bab.`);
      }
    },
    [
      schedulePlans,
      weeks,
      academicYear,
      curriculum,
      userId,
      buildPromesHeader,
      flushPendingPromesSaves,
      refreshProtaList,
      applyDocument,
      onNavigateToTab,
      toast,
    ]
  );

  return {
    isScheduleBatchOpen,
    setIsScheduleBatchOpen,
    scheduleStatus,
    setScheduleStatus,
    schedulePlans,
    setSchedulePlans,
    isCreatingBatch,
    batchProgress,
    handleOpenScheduleBatch,
    handleCreateFromSchedule,
  };
}
