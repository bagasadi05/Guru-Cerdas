import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  KaldikWeek,
  ProtaItem,
  ProtaHeader,
  PromesHeader,
  MatrixCell,
  WeekType,
  CurriculumType,
  PhaseType,
  DocumentIdentity,
} from '../../../../types/perangkatAjar';
import {
  calculateRme,
  getCurrentAcademicYear,
  getPhaseForGrade,
} from '../../../../utils/kaldikEngine';
import {
  validateProtaBalance,
  moveProtaItem,
  swapItemSemester,
  autoBalanceProtaJp,
} from '../../../../utils/protaEngine';
import {
  autoDistributePromes,
  applyKaldikLocks,
  getLockedWeekSlots,
} from '../../../../utils/promesEngine';
import { generateKaldikFromCalendar } from '../../../../utils/kaldikCalendarGenerator';
import { findCurriculumPreset, getCurriculumPreset } from '../../../../data/defaultProtaPresets';
import {
  loadKaldikWeeks,
  saveKaldikWeeks,
  loadProta,
  saveProta,
  loadPromes,
  savePromes,
  saveDocumentIdentity,
  loadDocumentIdentity,
  listProta,
  loadTeachingSchedule,
  deleteProta,
  loadSchoolKaldik,
  publishSchoolKaldik,
  type ProtaSummary,
  type SchoolKaldik,
} from '../../../../services/perangkatAjarService';
import { writeModulAjarPrefill } from '../../modul-ajar/utils/protaPrefill';
import {
  buildProtaDocument,
  planProtaFromSchedule,
  type PlannedProta,
} from '../../../../utils/protaSchedulePlanner';
import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
  type AiProtaTopics,
} from '../../../../services/protaAiGenerator';
import { useUserSettings } from '../../../../hooks/useUserSettings';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import type { WizardApplyData } from '../ProtaPromesWizardModal';
import {
  headerKeyOf,
  formatDocumentLabel,
  type HeaderFields,
  type UndoSnapshot,
  type PerangkatAjarMode,
} from '../types/perangkatAjarPageTypes';

const DEFAULT_ACADEMIC_YEAR = getCurrentAcademicYear();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_PROTA_KEY = 'guru_cerdas_perangkat_ajar_active_prota_id';
const HEADER_AUTOSAVE_DELAY_MS = 800;
const PROMES_SAVE_DELAY_MS = 600;
const UNDO_WINDOW_MS = 10_000;

interface UsePerangkatAjarStateOptions {
  mode: PerangkatAjarMode;
  onSelectMode: (mode: PerangkatAjarMode) => void;
  onNavigateToTab: (tab: 'kaldik' | 'prota' | 'promes' | 'preview') => void;
}

export function usePerangkatAjarState({
  mode,
  onSelectMode,
  onNavigateToTab,
}: UsePerangkatAjarStateOptions) {
  const { user, isAdmin } = useAuth();
  const { settings: userSettings, schoolName } = useUserSettings();
  const toast = useToast();

  // Academic Configuration
  const [academicYear, setAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [subject, setSubject] = useState<string>('Bahasa Indonesia');
  const [gradeLevel, setGradeLevel] = useState<string>('Kelas 4');
  const [phase, setPhase] = useState<PhaseType | undefined>('B');
  const [curriculum, setCurriculum] = useState<CurriculumType>('MERDEKA');
  const [weeklyJpQuota, setWeeklyJpQuota] = useState<number>(4);
  const weeklyJpLimit = weeklyJpQuota;
  const [reserveJpSem1, setReserveJpSem1] = useState<number>(0);
  const [reserveJpSem2, setReserveJpSem2] = useState<number>(0);

  // Promes Tab active semester
  const [promesSemester, setPromesSemester] = useState<1 | 2>(1);

  // Core Data States
  const [weeks, setWeeks] = useState<KaldikWeek[]>(() => generateKaldikFromCalendar(DEFAULT_ACADEMIC_YEAR).weeks);
  const [protaItems, setProtaItems] = useState<ProtaItem[]>([]);
  const [promesCellsSem1, setPromesCellsSem1] = useState<MatrixCell[]>([]);
  const [promesCellsSem2, setPromesCellsSem2] = useState<MatrixCell[]>([]);
  const [protaId, setProtaId] = useState<string>(() => {
    const cached = localStorage.getItem(ACTIVE_PROTA_KEY);
    return cached && UUID_REGEX.test(cached) ? cached : crypto.randomUUID();
  });
  const [protaList, setProtaList] = useState<ProtaSummary[]>([]);

  // Save/Sync status indicator
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Quick Setup Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardPrefersNew, setWizardPrefersNew] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const [undo, setUndo] = useState<UndoSnapshot | null>(null);

  const [isScheduleBatchOpen, setIsScheduleBatchOpen] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [schedulePlans, setSchedulePlans] = useState<PlannedProta[]>([]);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [isAiBusy, setIsAiBusy] = useState(false);

  const protaItemsRef = useRef(protaItems);
  useEffect(() => {
    protaItemsRef.current = protaItems;
  }, [protaItems]);

  const savedHeaderKeyRef = useRef<string | null>(null);
  const promesSaveTimersRef = useRef<Partial<Record<1 | 2, ReturnType<typeof setTimeout>>>>({});
  const pendingPromesSavesRef = useRef<Partial<Record<1 | 2, () => void>>>({});

  // Document Identity
  const [identity, setIdentity] = useState<DocumentIdentity>(() => {
    const cached = loadDocumentIdentity();
    return {
      ministryName: cached?.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
      regionalOffice: cached?.regionalOffice || 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
      schoolName: cached?.schoolName || schoolName || userSettings?.school_name || 'MI AL IRSYAD KOTA MADIUN',
      schoolAddress:
        cached?.schoolAddress ||
        'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
      schoolPhone: cached?.schoolPhone || '(0351) 463765',
      schoolEmail: cached?.schoolEmail || 'mialirsyadkotamadiun@gmail.com',
      schoolWebsite: cached?.schoolWebsite || 'mialirsyadkotamadiun.sch.id',
      subject: cached?.subject || 'Bahasa Indonesia',
      gradeLevel: cached?.gradeLevel || 'Kelas 4',
      phase: cached?.phase || 'Fase B',
      curriculum: cached?.curriculum || 'MERDEKA',
      academicYear: cached?.academicYear || DEFAULT_ACADEMIC_YEAR,
      semesterNumber: cached?.semesterNumber || 1,
      principalRole: cached?.principalRole || 'Kepala Madrasah',
      principalName: cached?.principalName || 'H. Masturi, S.Pd.I.',
      principalNip: cached?.principalNip || '-',
      teacherRole: cached?.teacherRole || 'Guru Mata Pelajaran',
      teacherName: cached?.teacherName || user?.name || 'Bagas Riyadi, S.Pd',
      teacherNip: cached?.teacherNip || '-',
      city: cached?.city || 'Madiun',
      signatureDate:
        cached?.signatureDate ||
        new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      showLogos: cached?.showLogos ?? true,
    };
  });

  const effectiveIdentity: DocumentIdentity = useMemo(
    () => ({
      ...identity,
      schoolName: identity.schoolName || schoolName || userSettings?.school_name || 'MI AL IRSYAD KOTA MADIUN',
      teacherName: identity.teacherName || user?.name || 'Bagas Riyadi, S.Pd',
      subject,
      gradeLevel,
      phase: phase ? `Fase ${phase}` : undefined,
      curriculum,
      academicYear,
      semesterNumber: promesSemester,
    }),
    [
      identity,
      schoolName,
      userSettings?.school_name,
      user?.name,
      subject,
      gradeLevel,
      phase,
      curriculum,
      academicYear,
      promesSemester,
    ]
  );

  const handleUpdateIdentity = (updates: Partial<DocumentIdentity>) => {
    setIdentity((prev) => {
      const next = { ...prev, ...updates };
      saveDocumentIdentity(next);
      return next;
    });
  };

  const currentHeader: HeaderFields = useMemo(
    () => ({
      id: protaId,
      academicYear,
      subject,
      gradeLevel,
      phase: phase || undefined,
      curriculum,
      weeklyJpQuota,
      reserveJpSem1,
      reserveJpSem2,
    }),
    [
      protaId,
      academicYear,
      subject,
      gradeLevel,
      phase,
      curriculum,
      weeklyJpQuota,
      reserveJpSem1,
      reserveJpSem2,
    ]
  );

  const headerKey = headerKeyOf(currentHeader);
  const userId = user?.id || 'offline_user';

  const refreshProtaList = useCallback(() => {
    listProta()
      .then(setProtaList)
      .catch((err) => console.warn('[PerangkatAjarPage] Failed to list Prota documents:', err));
  }, []);

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

  const applyDocument = useCallback(
    async (header: ProtaHeader, items: ProtaItem[], isCurrent: () => boolean = () => true) => {
      const [promesRes1, promesRes2] = await Promise.all([
        loadPromes(header.id, 1),
        loadPromes(header.id, 2),
      ]);
      if (!isCurrent()) return;

      savedHeaderKeyRef.current = headerKeyOf(header);
      setProtaId(header.id);
      setAcademicYear(header.academicYear || DEFAULT_ACADEMIC_YEAR);
      setSubject(header.subject);
      setGradeLevel(header.gradeLevel);
      setPhase(header.phase);
      setCurriculum(header.curriculum);
      setWeeklyJpQuota(header.weeklyJpQuota);
      setReserveJpSem1(header.reserveJpSem1);
      setReserveJpSem2(header.reserveJpSem2);
      setProtaItems(items);
      setPromesCellsSem1(promesRes1.cells);
      setPromesCellsSem2(promesRes2.cells);
      setUndo(null);
      try {
        localStorage.setItem(ACTIVE_PROTA_KEY, header.id);
      } catch (_err) {
        void _err;
      }
    },
    []
  );

  // Initial document load
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      try {
        const [{ header, items }, list] = await Promise.all([loadProta(), listProta()]);
        if (!isMounted) return;
        setProtaList(list);
        if (header) {
          await applyDocument(header, items, () => isMounted);
        }
      } catch (err) {
        console.warn('Error loading initial perangkat ajar:', err);
      } finally {
        if (isMounted) {
          setHasLoadedInitial(true);
        }
      }
    }

    void initData();
    return () => {
      isMounted = false;
    };
  }, [applyDocument]);

  // Kaldik belongs to the academic year
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

  // First visit with nothing to show
  const firstVisitHandledRef = useRef(false);
  useEffect(() => {
    if (mode !== 'prota-promes' || !hasLoadedInitial || protaItems.length > 0) return;
    if (firstVisitHandledRef.current) return;
    const sessionKey = `guru_cerdas_prota_wizard_dismissed_${user?.id || 'guest'}`;
    if (sessionStorage.getItem(sessionKey)) return;
    firstVisitHandledRef.current = true;

    let isMounted = true;
    const openFallbackWizard = () => {
      if (isMounted) setIsWizardOpen(true);
    };
    if (protaList.length > 0) {
      openFallbackWizard();
      return;
    }
    loadTeachingSchedule()
      .then((entries) => {
        if (!isMounted) return;
        const plans = planProtaFromSchedule(entries, protaList, academicYear, curriculum);
        if (plans.length === 0) {
          openFallbackWizard();
          return;
        }
        sessionStorage.setItem(sessionKey, 'true');
        setSchedulePlans(plans);
        setScheduleStatus('ready');
        setIsScheduleBatchOpen(true);
      })
      .catch(openFallbackWizard);
    return () => {
      isMounted = false;
    };
    // Runs once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasLoadedInitial, protaItems.length, user?.id]);

  // Pure Calculations
  const rmeSem1 = useMemo(
    () => calculateRme(weeks, 1, weeklyJpQuota, reserveJpSem1),
    [weeks, weeklyJpQuota, reserveJpSem1]
  );

  const rmeSem2 = useMemo(
    () => calculateRme(weeks, 2, weeklyJpQuota, reserveJpSem2),
    [weeks, weeklyJpQuota, reserveJpSem2]
  );

  const protaValidation = useMemo(
    () => validateProtaBalance(protaItems, rmeSem1, rmeSem2),
    [protaItems, rmeSem1, rmeSem2]
  );

  const lockedPromesCellsSem1 = useMemo(
    () => applyKaldikLocks(promesCellsSem1, weeks, 1),
    [promesCellsSem1, weeks]
  );

  const lockedPromesCellsSem2 = useMemo(
    () => applyKaldikLocks(promesCellsSem2, weeks, 2),
    [promesCellsSem2, weeks]
  );

  const presetAvailable =
    curriculum === 'MERDEKA' && findCurriculumPreset(subject, gradeLevel) !== null;

  const buildPromesHeader = useCallback(
    (semesterNumber: 1 | 2, id: string = protaId, limit = weeklyJpLimit): PromesHeader => ({
      id: crypto.randomUUID(),
      protaId: id,
      userId,
      semesterNumber,
      weeklyJpLimit: limit,
    }),
    [protaId, userId, weeklyJpLimit]
  );

  const triggerProtaSave = useCallback(
    (itemsToSave: ProtaItem[]) => {
      setIsSaving(true);
      savedHeaderKeyRef.current = headerKeyOf(currentHeader);
      saveProta({ ...currentHeader, userId }, itemsToSave)
        .then(() => {
          setLastSaved(new Date());
          refreshProtaList();
        })
        .catch((err) => {
          console.warn('[PerangkatAjarPage] Auto-save prota failed:', err);
        })
        .finally(() => setIsSaving(false));
    },
    [currentHeader, userId, refreshProtaList]
  );

  const isKnownDocument = protaList.some((doc) => doc.id === protaId);
  useEffect(() => {
    if (!hasLoadedInitial || savedHeaderKeyRef.current === headerKey) return;
    if (!isKnownDocument && protaItemsRef.current.length === 0) return;
    const timer = setTimeout(() => triggerProtaSave(protaItemsRef.current), HEADER_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [headerKey, hasLoadedInitial, isKnownDocument, triggerProtaSave]);

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
    [buildPromesHeader]
  );

  const persistDocument = useCallback(
    async (
      header: ProtaHeader,
      items: ProtaItem[],
      cellsSem1: MatrixCell[],
      cellsSem2: MatrixCell[],
      limit: number
    ) => {
      for (const sem of [1, 2] as const) {
        clearTimeout(promesSaveTimersRef.current[sem]);
        delete pendingPromesSavesRef.current[sem];
      }
      savedHeaderKeyRef.current = headerKeyOf(header);
      const savedId = await saveProta(header, items);
      await Promise.all([
        savePromes(buildPromesHeader(1, savedId, limit), cellsSem1),
        savePromes(buildPromesHeader(2, savedId, limit), cellsSem2),
      ]);
      setLastSaved(new Date());
      refreshProtaList();
      return savedId;
    },
    [buildPromesHeader, refreshProtaList]
  );

  const rememberForUndo = useCallback(
    (message: string, extra: Pick<UndoSnapshot, 'weeks'> = {}) => {
      setUndo({
        message,
        header: currentHeader,
        protaItems,
        promesCellsSem1,
        promesCellsSem2,
        ...extra,
      });
    },
    [currentHeader, protaItems, promesCellsSem1, promesCellsSem2]
  );

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const handleUndo = async () => {
    if (!undo) return;
    const snapshot = undo;
    setUndo(null);
    if (snapshot.deletedDocument) {
      const { header: deletedHeader, items, cellsSem1, cellsSem2 } = snapshot.deletedDocument;
      setIsSaving(true);
      try {
        await persistDocument(deletedHeader, items, cellsSem1, cellsSem2, deletedHeader.weeklyJpQuota);
        await applyDocument(deletedHeader, items);
        toast.info('Dokumen dikembalikan.');
      } catch (err) {
        console.warn('[PerangkatAjarPage] Restoring deleted Prota failed:', err);
        toast.error('Dokumen gagal dikembalikan. Periksa koneksi lalu coba lagi.');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    const { header } = snapshot;
    setAcademicYear(header.academicYear);
    setSubject(header.subject);
    setGradeLevel(header.gradeLevel);
    setPhase(header.phase);
    setCurriculum(header.curriculum);
    setWeeklyJpQuota(header.weeklyJpQuota);
    setReserveJpSem1(header.reserveJpSem1);
    setReserveJpSem2(header.reserveJpSem2);
    setProtaItems(snapshot.protaItems);
    setPromesCellsSem1(snapshot.promesCellsSem1);
    setPromesCellsSem2(snapshot.promesCellsSem2);
    if (snapshot.weeks) {
      setWeeks(snapshot.weeks);
      void saveKaldikWeeks(header.academicYear, snapshot.weeks);
    }
    setIsSaving(true);
    try {
      await persistDocument(
        { ...header, userId },
        snapshot.protaItems,
        snapshot.promesCellsSem1,
        snapshot.promesCellsSem2,
        weeklyJpLimit
      );
      toast.info('Perubahan dibatalkan.');
    } catch (err) {
      console.warn('[PerangkatAjarPage] Undo save failed:', err);
      toast.error('Perubahan dibatalkan di layar, tetapi gagal disimpan. Tekan Simpan Semua.');
    } finally {
      setIsSaving(false);
    }
  };

  // Kaldik handlers
  const handleUpdateWeek = (month: number, weekNumber: number, type: WeekType) => {
    const isExisting = weeks.some((w) => w.month === month && w.weekNumber === weekNumber);
    const updated = isExisting
      ? weeks.map((w) => (w.month === month && w.weekNumber === weekNumber ? { ...w, type } : w))
      : [...weeks, { month, weekNumber, type, academicYear }];
    setWeeks(updated);
    void saveKaldikWeeks(academicYear, updated);
  };

  const semestersWithoutHolidayData = useMemo(
    () => generateKaldikFromCalendar(academicYear).semestersWithoutHolidayData,
    [academicYear]
  );

  const handleResetKaldikToPreset = () => {
    const { weeks: generated } = generateKaldikFromCalendar(academicYear);
    rememberForUndo(`Kaldik ${academicYear} disusun ulang dari tanggal.`, { weeks });
    setWeeks(generated);
    void saveKaldikWeeks(academicYear, generated);
  };

  const handleChangeGradeLevel = (value: string) => {
    setGradeLevel(value);
    const derivedPhase = getPhaseForGrade(value);
    if (derivedPhase) setPhase(derivedPhase);
  };

  // Prota CRUD
  const handleAddProtaItem = (newItem: Omit<ProtaItem, 'id' | 'orderIndex'>) => {
    const item: ProtaItem = {
      ...newItem,
      id: crypto.randomUUID(),
      orderIndex: protaItems.length,
    };
    const updated = [...protaItems, item];
    setProtaItems(updated);
    triggerProtaSave(updated);
  };

  const handleUpdateProtaItem = (id: string, updates: Partial<ProtaItem>) => {
    const updated = protaItems.map((it) => (it.id === id ? { ...it, ...updates } : it));
    setProtaItems(updated);
    triggerProtaSave(updated);
  };

  const handleDeleteProtaItem = (id: string) => {
    const target = protaItems.find((it) => it.id === id);
    rememberForUndo(
      target?.learningObjectiveCode ? `Materi ${target.learningObjectiveCode} dihapus.` : 'Materi dihapus.'
    );
    const updated = protaItems.filter((it) => it.id !== id);
    setProtaItems(updated);
    triggerProtaSave(updated);
  };

  const handleMoveProtaItem = (id: string, direction: 'up' | 'down') => {
    const updated = moveProtaItem(protaItems, id, direction);
    setProtaItems(updated);
    triggerProtaSave(updated);
  };

  const handleSwapSemesterProtaItem = (id: string) => {
    const updated = swapItemSemester(protaItems, id);
    setProtaItems(updated);
    triggerProtaSave(updated);
    toast.success('Materi dipindahkan ke semester lain.');
  };

  const handleAutoBalanceProta = () => {
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
  };

  const handleLoadPresetMateri = () => {
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
  };

  // Promes handlers
  const handleUpdatePromesCell = (
    rowId: string,
    monthIndex: number,
    weekNumber: number,
    jp: number
  ) => {
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
  };

  const handleReleasePromesCell = (rowId: string, monthIndex: number, weekNumber: number) => {
    const targetCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
    const setTargetCells = promesSemester === 1 ? setPromesCellsSem1 : setPromesCellsSem2;
    const updatedCells = targetCells.map((c) =>
      c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber
        ? { ...c, isManual: false }
        : c
    );
    setTargetCells(updatedCells);
    schedulePromesSave(promesSemester, updatedCells);
  };

  const handleAutoDistributePromes = () => {
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
  };

  const handleResetPromesMatrix = () => {
    const currentCells = promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2;
    if (!currentCells.some((c) => c.allocatedJp > 0)) return;

    rememberForUndo(`Matriks Semester ${promesSemester} dikosongkan.`);
    if (promesSemester === 1) {
      setPromesCellsSem1([]);
    } else {
      setPromesCellsSem2([]);
    }
    schedulePromesSave(promesSemester, []);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveKaldikWeeks(academicYear, weeks);
      saveDocumentIdentity(identity);
      await persistDocument(
        { ...currentHeader, userId },
        protaItems,
        lockedPromesCellsSem1,
        lockedPromesCellsSem2,
        weeklyJpLimit
      );
      toast.success('Kaldik, Prota, dan Promes Semester 1 & 2 tersimpan.');
    } catch (err) {
      console.error('[PerangkatAjarPage] Error saving all:', err);
      toast.error('Gagal menyimpan perangkat ajar. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchDocument = async (id: string) => {
    if (id === protaId) return;
    flushPendingPromesSaves();
    try {
      const { header, items } = await loadProta(id);
      if (!header) {
        toast.error('Dokumen tidak ditemukan.');
        refreshProtaList();
        return;
      }
      await applyDocument(header, items);
    } catch (err) {
      console.warn('[PerangkatAjarPage] Failed to open Prota:', err);
      toast.error('Gagal membuka dokumen. Periksa koneksi lalu coba lagi.');
    }
  };

  const handleOpenWizard = (preferNew: boolean) => {
    setWizardPrefersNew(preferNew);
    setIsWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    const sessionKey = `guru_cerdas_prota_wizard_dismissed_${user?.id || 'guest'}`;
    sessionStorage.setItem(sessionKey, 'true');
  };

  const handleApplyWizard = async (data: WizardApplyData) => {
    flushPendingPromesSaves();
    const isReplacing = data.target === 'replace';
    if (isReplacing && protaItems.length > 0) {
      rememberForUndo('Isi dokumen diganti hasil Panduan Cepat.');
    } else {
      setUndo(null);
    }
    const targetId = isReplacing ? protaId : crypto.randomUUID();
    const sameYear = data.academicYear === academicYear;

    setProtaId(targetId);
    setAcademicYear(data.academicYear);
    setSubject(data.subject);
    setGradeLevel(data.gradeLevel);
    setPhase(data.phase);
    setCurriculum(data.curriculum);
    setWeeklyJpQuota(data.weeklyJpQuota);
    setReserveJpSem1(data.reserveJpSem1);
    setReserveJpSem2(data.reserveJpSem2);
    if (sameYear) setWeeks(data.weeks);
    setProtaItems(data.protaItems);
    setPromesCellsSem1(data.promesCellsSem1);
    setPromesCellsSem2(data.promesCellsSem2);

    const updatedIdentity = { ...identity, ...data.identityUpdates };
    setIdentity(updatedIdentity);
    saveDocumentIdentity(updatedIdentity);

    setIsSaving(true);
    try {
      await persistDocument(
        {
          id: targetId,
          userId,
          academicYear: data.academicYear,
          subject: data.subject,
          gradeLevel: data.gradeLevel,
          phase: data.phase,
          curriculum: data.curriculum,
          weeklyJpQuota: data.weeklyJpQuota,
          reserveJpSem1: data.reserveJpSem1,
          reserveJpSem2: data.reserveJpSem2,
        },
        data.protaItems,
        data.promesCellsSem1,
        data.promesCellsSem2,
        data.weeklyJpQuota
      );
      try {
        localStorage.setItem(ACTIVE_PROTA_KEY, targetId);
      } catch (_err) {
        void _err;
      }

      setIsWizardOpen(false);
      onNavigateToTab('prota');
      if (!isReplacing || protaItems.length === 0) {
        toast.success(`Prota & Promes ${data.subject} ${data.gradeLevel} dibuat dan disimpan.`);
      }
    } catch (err) {
      console.error('[PerangkatAjarPage] Error saving wizard generated data:', err);
      toast.error('Hasil sudah tampil di layar, tetapi gagal disimpan. Tekan Simpan Semua.');
      setIsWizardOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // School Kaldik
  const [schoolKaldik, setSchoolKaldik] = useState<SchoolKaldik | null>(null);
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

  const handleUseSchoolKaldik = () => {
    if (!schoolKaldik) return;
    rememberForUndo(`Kaldik diganti Kaldik sekolah ${academicYear}.`, { weeks });
    setWeeks(schoolKaldik.weeks);
    void saveKaldikWeeks(academicYear, schoolKaldik.weeks);
  };

  const handlePublishSchoolKaldik = async () => {
    try {
      await publishSchoolKaldik(academicYear, weeks);
      setSchoolKaldik({ weeks, updatedAt: new Date().toISOString() });
      toast.success(`Kaldik ${academicYear} diterbitkan untuk semua guru.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menerbitkan Kaldik sekolah.');
    }
  };

  const handleDeleteDocument = async () => {
    if (!isKnownDocument && protaItems.length === 0) return;
    flushPendingPromesSaves();
    const deletedDocument = {
      header: { ...currentHeader, userId },
      items: protaItems,
      cellsSem1: lockedPromesCellsSem1,
      cellsSem2: lockedPromesCellsSem2,
    };
    const label = formatDocumentLabel(currentHeader);
    try {
      await deleteProta(protaId);
    } catch (err) {
      console.warn('[PerangkatAjarPage] Failed to delete Prota:', err);
      toast.error('Gagal menghapus dokumen. Periksa koneksi lalu coba lagi.');
      return;
    }

    const next = protaList.find((doc) => doc.id !== protaId);
    if (next) {
      await handleSwitchDocument(next.id);
    } else {
      const blankId = crypto.randomUUID();
      savedHeaderKeyRef.current = null;
      setProtaId(blankId);
      setSubject('');
      setGradeLevel('');
      setProtaItems([]);
      setPromesCellsSem1([]);
      setPromesCellsSem2([]);
    }
    setUndo({
      message: `Prota ${label} dihapus.`,
      header: currentHeader,
      protaItems: [],
      promesCellsSem1: [],
      promesCellsSem2: [],
      deletedDocument,
    });
    refreshProtaList();
  };

  const handleCreateModulAjar = (item: ProtaItem) => {
    writeModulAjarPrefill({
      subject,
      gradeLevel,
      phase,
      academicYear,
      curriculum,
      semesterNumber: item.semesterNumber,
      learningObjectiveCode: item.learningObjectiveCode,
      learningObjectiveText: item.learningObjectiveText,
      coreTopic: item.coreTopic,
      targetJp: item.targetJp,
    });
    onSelectMode('modul-ajar');
  };

  const handleOpenScheduleBatch = async () => {
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
  };

  const handleCreateFromSchedule = async (keys: string[], useAi: boolean) => {
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
  };

  const handleFillWithAi = async () => {
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
  };

  const documentOptions = useMemo(
    () =>
      isKnownDocument
        ? protaList
        : [{ id: protaId, subject, gradeLevel, academicYear }, ...protaList],
    [isKnownDocument, protaList, protaId, subject, gradeLevel, academicYear]
  );

  return {
    // Auth info
    isAdmin,
    // Academic config
    academicYear,
    setAcademicYear,
    subject,
    setSubject,
    gradeLevel,
    handleChangeGradeLevel,
    phase,
    setPhase,
    curriculum,
    setCurriculum,
    weeklyJpQuota,
    setWeeklyJpQuota,
    weeklyJpLimit,
    reserveJpSem1,
    setReserveJpSem1,
    reserveJpSem2,
    setReserveJpSem2,
    // Document Identity
    identity,
    effectiveIdentity,
    handleUpdateIdentity,
    currentHeader,
    // Core data
    weeks,
    protaItems,
    promesCellsSem1,
    promesCellsSem2,
    protaId,
    protaList,
    documentOptions,
    isKnownDocument,
    // Promes state
    promesSemester,
    setPromesSemester,
    lockedPromesCellsSem1,
    lockedPromesCellsSem2,
    // RME & validation
    rmeSem1,
    rmeSem2,
    protaValidation,
    presetAvailable,
    semestersWithoutHolidayData,
    // Kaldik handlers
    handleUpdateWeek,
    handleResetKaldikToPreset,
    // School kaldik
    schoolKaldik,
    matchesSchoolKaldik,
    handleUseSchoolKaldik,
    handlePublishSchoolKaldik,
    // Sync & saving
    isSaving,
    lastSaved,
    handleSaveAll,
    flushPendingPromesSaves,
    // Undo
    undo,
    handleUndo,
    setUndo,
    // Prota Actions
    handleAddProtaItem,
    handleUpdateProtaItem,
    handleDeleteProtaItem,
    handleMoveProtaItem,
    handleSwapSemesterProtaItem,
    handleAutoBalanceProta,
    handleLoadPresetMateri,
    // Promes Actions
    handleUpdatePromesCell,
    handleReleasePromesCell,
    handleAutoDistributePromes,
    handleResetPromesMatrix,
    // Document Actions
    handleSwitchDocument,
    handleDeleteDocument,
    // Wizard
    isWizardOpen,
    wizardPrefersNew,
    handleOpenWizard,
    handleCloseWizard,
    handleApplyWizard,
    // Schedule Batch
    isScheduleBatchOpen,
    setIsScheduleBatchOpen,
    scheduleStatus,
    schedulePlans,
    isCreatingBatch,
    batchProgress,
    handleOpenScheduleBatch,
    handleCreateFromSchedule,
    // AI
    isAiBusy,
    handleFillWithAi,
    // Modul Ajar navigation
    handleCreateModulAjar,
  };
}
