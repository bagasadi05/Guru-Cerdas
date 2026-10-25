import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  KaldikWeek,
  ProtaItem,
  MatrixCell,
  PromesHeader,
} from '../../../../types/perangkatAjar';
import {
  autoDistributePromes,
  applyKaldikLocks,
  getLockedWeekSlots,
} from '../../../../utils/promesEngine';
import { savePromes } from '../../../../services/perangkatAjarService';
import { useToast } from '../../../../hooks/useToast';

const PROMES_SAVE_DELAY_MS = 600;

interface UsePerangkatAjarPromesOptions {
  weeks: KaldikWeek[];
  protaItems: ProtaItem[];
  weeklyJpLimit: number;
  promesCellsSem1: MatrixCell[];
  setPromesCellsSem1: React.Dispatch<React.SetStateAction<MatrixCell[]>>;
  promesCellsSem2: MatrixCell[];
  setPromesCellsSem2: React.Dispatch<React.SetStateAction<MatrixCell[]>>;
  buildPromesHeader: (semesterNumber: 1 | 2) => PromesHeader;
  setLastSaved: React.Dispatch<React.SetStateAction<Date | null>>;
  rememberForUndo: (message: string) => void;
}

export function usePerangkatAjarPromes({
  weeks,
  protaItems,
  weeklyJpLimit,
  promesCellsSem1,
  setPromesCellsSem1,
  promesCellsSem2,
  setPromesCellsSem2,
  buildPromesHeader,
  setLastSaved,
  rememberForUndo,
}: UsePerangkatAjarPromesOptions) {
  const toast = useToast();
  const [promesSemester, setPromesSemester] = useState<1 | 2>(1);

  const promesSaveTimersRef = useRef<Partial<Record<1 | 2, ReturnType<typeof setTimeout>>>>({});
  const pendingPromesSavesRef = useRef<Partial<Record<1 | 2, () => void>>>({});

  const lockedPromesCellsSem1 = useMemo(
    () => applyKaldikLocks(promesCellsSem1, weeks, 1),
    [promesCellsSem1, weeks]
  );

  const lockedPromesCellsSem2 = useMemo(
    () => applyKaldikLocks(promesCellsSem2, weeks, 2),
    [promesCellsSem2, weeks]
  );

  const schedulePromesSave = useCallback(
    (semesterNumber: 1 | 2, cells: MatrixCell[]) => {
      const header = buildPromesHeader(semesterNumber);
      const run = () => {
        delete pendingPromesSavesRef.current[semesterNumber];
        void savePromes(header, cells).then(() => setLastSaved(new Date()));
      };
      clearTimeout(promesSaveTimersRef.current[semesterNumber]);
      pendingPromesSavesRef.current[semesterNumber] = run;
      promesSaveTimersRef.current[semesterNumber] = setTimeout(run, PROMES_SAVE_DELAY_MS);
    },
    [buildPromesHeader, setLastSaved]
  );

  const flushPendingPromesSaves = useCallback(() => {
    for (const sem of [1, 2] as const) {
      clearTimeout(promesSaveTimersRef.current[sem]);
      pendingPromesSavesRef.current[sem]?.();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pagehide', flushPendingPromesSaves);
    return () => {
      window.removeEventListener('pagehide', flushPendingPromesSaves);
      flushPendingPromesSaves();
    };
  }, [flushPendingPromesSaves]);

  const handleUpdatePromesCell = useCallback(
    (rowId: string, monthIndex: number, weekNumber: number, jp: number) => {
      if (getLockedWeekSlots(weeks, promesSemester).has(`${monthIndex}-${weekNumber}`)) {
        return;
      }

      const targetCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
      const setTargetCells = promesSemester === 1 ? setPromesCellsSem1 : setPromesCellsSem2;

      const existingIdx = targetCells.findIndex(
        (c) => c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber
      );

      const updatedCells: MatrixCell[] =
        existingIdx >= 0
          ? targetCells.map((c, i) => (i === existingIdx ? { ...c, allocatedJp: jp, isManual: true } : c))
          : [...targetCells, { rowId, monthIndex, weekNumber, allocatedJp: jp, isLocked: false, isManual: true }];

      setTargetCells(updatedCells);
      schedulePromesSave(promesSemester, updatedCells);
    },
    [weeks, promesSemester, lockedPromesCellsSem1, lockedPromesCellsSem2, setPromesCellsSem1, setPromesCellsSem2, schedulePromesSave]
  );

  const handleReleasePromesCell = useCallback(
    (rowId: string, monthIndex: number, weekNumber: number) => {
      const targetCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
      const setTargetCells = promesSemester === 1 ? setPromesCellsSem1 : setPromesCellsSem2;
      const updatedCells = targetCells.map((c) =>
        c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber
          ? { ...c, isManual: false }
          : c
      );
      setTargetCells(updatedCells);
      schedulePromesSave(promesSemester, updatedCells);
    },
    [promesSemester, lockedPromesCellsSem1, lockedPromesCellsSem2, setPromesCellsSem1, setPromesCellsSem2, schedulePromesSave]
  );

  const handleAutoDistributePromes = useCallback(() => {
    const semesterItems = protaItems
      .filter((i) => i.semesterNumber === promesSemester)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    if (semesterItems.length === 0) {
      toast.warning('Tambahkan materi di Program Tahunan (Prota) terlebih dahulu.');
      return;
    }

    const currentCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
    const manualCount = currentCells.filter((c) => c.isManual).length;
    if (currentCells.some((c) => c.allocatedJp > 0)) {
      rememberForUndo(
        manualCount > 0
          ? `Jam Semester ${promesSemester} dibagi ulang; ${manualCount} pekan yang Anda atur tetap.`
          : `Jam Promes Semester ${promesSemester} dibagi ulang.`
      );
    } else {
      toast.success(`Jam Semester ${promesSemester} sudah dibagi ke minggu efektif.`);
    }

    const newCells = autoDistributePromes({
      items: semesterItems.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: weeks,
      weeklyJpLimit,
      semesterNumber: promesSemester,
      fixedCells: currentCells,
    });

    if (promesSemester === 1) {
      setPromesCellsSem1(newCells);
    } else {
      setPromesCellsSem2(newCells);
    }
    schedulePromesSave(promesSemester, newCells);
  }, [
    protaItems,
    promesSemester,
    lockedPromesCellsSem1,
    lockedPromesCellsSem2,
    weeks,
    weeklyJpLimit,
    setPromesCellsSem1,
    setPromesCellsSem2,
    schedulePromesSave,
    rememberForUndo,
    toast,
  ]);

  const handleResetPromesMatrix = useCallback(() => {
    const currentCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
    if (!currentCells.some((c) => c.allocatedJp > 0)) return;

    rememberForUndo(`Matriks Semester ${promesSemester} dikosongkan.`);
    if (promesSemester === 1) {
      setPromesCellsSem1([]);
    } else {
      setPromesCellsSem2([]);
    }
    schedulePromesSave(promesSemester, []);
  }, [promesSemester, lockedPromesCellsSem1, lockedPromesCellsSem2, setPromesCellsSem1, setPromesCellsSem2, schedulePromesSave, rememberForUndo]);

  return {
    promesSemester,
    setPromesSemester,
    lockedPromesCellsSem1,
    lockedPromesCellsSem2,
    schedulePromesSave,
    flushPendingPromesSaves,
    handleUpdatePromesCell,
    handleReleasePromesCell,
    handleAutoDistributePromes,
    handleResetPromesMatrix,
  };
}
