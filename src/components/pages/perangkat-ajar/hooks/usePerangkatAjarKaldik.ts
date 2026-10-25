import { useState, useEffect, useMemo, useCallback } from 'react';
import type { KaldikWeek, WeekType, RmeSummary } from '../../../../types/perangkatAjar';
import { calculateRme } from '../../../../utils/kaldikEngine';
import { generateKaldikFromCalendar } from '../../../../utils/kaldikCalendarGenerator';
import {
  loadKaldikWeeks,
  saveKaldikWeeks,
  loadSchoolKaldik,
  publishSchoolKaldik,
  type SchoolKaldik,
} from '../../../../services/perangkatAjarService';
import { useToast } from '../../../../hooks/useToast';

interface UsePerangkatAjarKaldikOptions {
  academicYear: string;
  weeklyJpQuota: number;
  reserveJpSem1: number;
  reserveJpSem2: number;
  rememberForUndo: (message: string, extra?: { weeks?: KaldikWeek[] }) => void;
}

export function usePerangkatAjarKaldik({
  academicYear,
  weeklyJpQuota,
  reserveJpSem1,
  reserveJpSem2,
  rememberForUndo,
}: UsePerangkatAjarKaldikOptions) {
  const toast = useToast();

  const [weeks, setWeeks] = useState<KaldikWeek[]>(
    () => generateKaldikFromCalendar(academicYear).weeks
  );
  const [schoolKaldik, setSchoolKaldik] = useState<SchoolKaldik | null>(null);

  // Load Kaldik for academic year
  useEffect(() => {
    let isMounted = true;
    loadKaldikWeeks(academicYear)
      .then((loadedWeeks) => {
        if (isMounted && loadedWeeks.length > 0) setWeeks(loadedWeeks);
      })
      .catch((err) => console.warn('[PerangkatAjarPage] Failed to load Kaldik:', err));
    return () => {
      isMounted = false;
    };
  }, [academicYear]);

  // Load School Kaldik
  useEffect(() => {
    let isMounted = true;
    loadSchoolKaldik(academicYear).then((result) => {
      if (isMounted) setSchoolKaldik(result);
    });
    return () => {
      isMounted = false;
    };
  }, [academicYear]);

  const matchesSchoolKaldik = useMemo(() => {
    if (!schoolKaldik) return true;
    const key = (w: KaldikWeek) => `${w.month}-${w.weekNumber}`;
    const own = new Map(weeks.map((w) => [key(w), w.type]));
    return schoolKaldik.weeks.every((w) => own.get(key(w)) === w.type);
  }, [schoolKaldik, weeks]);

  const semestersWithoutHolidayData = useMemo(
    () => generateKaldikFromCalendar(academicYear).semestersWithoutHolidayData,
    [academicYear]
  );

  const rmeSem1: RmeSummary = useMemo(
    () => calculateRme(weeks, 1, weeklyJpQuota, reserveJpSem1),
    [weeks, weeklyJpQuota, reserveJpSem1]
  );

  const rmeSem2: RmeSummary = useMemo(
    () => calculateRme(weeks, 2, weeklyJpQuota, reserveJpSem2),
    [weeks, weeklyJpQuota, reserveJpSem2]
  );

  const handleUpdateWeek = useCallback(
    (month: number, weekNumber: number, type: WeekType) => {
      setWeeks((prev) => {
        const isExisting = prev.some((w) => w.month === month && w.weekNumber === weekNumber);
        const updated = isExisting
          ? prev.map((w) => (w.month === month && w.weekNumber === weekNumber ? { ...w, type } : w))
          : [...prev, { month, weekNumber, type, academicYear }];
        void saveKaldikWeeks(academicYear, updated);
        return updated;
      });
    },
    [academicYear]
  );

  const handleResetKaldikToPreset = useCallback(() => {
    const { weeks: generated } = generateKaldikFromCalendar(academicYear);
    rememberForUndo(`Kaldik ${academicYear} disusun ulang dari tanggal.`, { weeks });
    setWeeks(generated);
    void saveKaldikWeeks(academicYear, generated);
  }, [academicYear, weeks, rememberForUndo]);

  const handleUseSchoolKaldik = useCallback(() => {
    if (!schoolKaldik) return;
    rememberForUndo(`Kaldik diganti Kaldik sekolah ${academicYear}.`, { weeks });
    setWeeks(schoolKaldik.weeks);
    void saveKaldikWeeks(academicYear, schoolKaldik.weeks);
  }, [schoolKaldik, weeks, academicYear, rememberForUndo]);

  const handlePublishSchoolKaldik = useCallback(async () => {
    try {
      await publishSchoolKaldik(academicYear, weeks);
      setSchoolKaldik({ weeks, updatedAt: new Date().toISOString() });
      toast.success(`Kaldik ${academicYear} diterbitkan untuk semua guru.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menerbitkan Kaldik sekolah.');
    }
  }, [academicYear, weeks, toast]);

  return {
    weeks,
    setWeeks,
    schoolKaldik,
    setSchoolKaldik,
    matchesSchoolKaldik,
    semestersWithoutHolidayData,
    rmeSem1,
    rmeSem2,
    handleUpdateWeek,
    handleResetKaldikToPreset,
    handleUseSchoolKaldik,
    handlePublishSchoolKaldik,
  };
}
