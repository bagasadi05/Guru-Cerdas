import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Layers,
  FileSpreadsheet,
  Eye,
  Save,
  CheckCircle,
  CalendarRange,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  X,
  CalendarClock,
  Download,
  Trash2,
} from 'lucide-react';
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
} from '../../../types/perangkatAjar';
import {
  calculateRme,
  getAcademicYearOptions,
  getCurrentAcademicYear,
  getPhaseForGrade,
} from '../../../utils/kaldikEngine';
import {
  validateProtaBalance,
  moveProtaItem,
  swapItemSemester,
  autoBalanceProtaJp,
} from '../../../utils/protaEngine';
import {
  autoDistributePromes,
  applyKaldikLocks,
  getLockedWeekSlots,
} from '../../../utils/promesEngine';
import { generateKaldikFromCalendar } from '../../../utils/kaldikCalendarGenerator';
import { findCurriculumPreset, getCurriculumPreset } from '../../../data/defaultProtaPresets';
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
} from '../../../services/perangkatAjarService';
import { writeModulAjarPrefill } from '../modul-ajar/utils/protaPrefill';
import {
  buildProtaDocument,
  planProtaFromSchedule,
  type PlannedProta,
} from '../../../utils/protaSchedulePlanner';
import type { PackageDocument } from '../../../utils/perangkatAjarPackage';
import { ScheduleBatchModal } from './ScheduleBatchModal';
import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
  type AiProtaTopics,
} from '../../../services/protaAiGenerator';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { KaldikTab } from './KaldikTab';
import { ProtaTab } from './ProtaTab';
import { PromesTab } from './PromesTab';
import { PreviewTab } from './PreviewTab';
import { ProtaPromesWizardModal, type WizardApplyData } from './ProtaPromesWizardModal';
import { ModulAjarCreatorPageSkeleton } from '../../skeletons/PageSkeletons';

const ModulAjarCreatorPage = lazy(() => import('../modul-ajar/ModulAjarCreatorPage'));

const DEFAULT_ACADEMIC_YEAR = getCurrentAcademicYear();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_PROTA_KEY = 'guru_cerdas_perangkat_ajar_active_prota_id';
const HEADER_AUTOSAVE_DELAY_MS = 800;
const PROMES_SAVE_DELAY_MS = 600;
const UNDO_WINDOW_MS = 10_000;

type HeaderFields = Omit<ProtaHeader, 'userId' | 'createdAt' | 'updatedAt'>;

interface UndoSnapshot {
  message: string;
  header: HeaderFields;
  protaItems: ProtaItem[];
  promesCellsSem1: MatrixCell[];
  promesCellsSem2: MatrixCell[];
  /** Set when the action replaced the Kaldik. */
  weeks?: KaldikWeek[];
  /** Set when a whole document was deleted; undo saves it again and reopens it. */
  deletedDocument?: {
    header: ProtaHeader;
    items: ProtaItem[];
    cellsSem1: MatrixCell[];
    cellsSem2: MatrixCell[];
  };
}

const headerKeyOf = (h: HeaderFields) =>
  JSON.stringify([
    h.id,
    h.academicYear,
    h.subject,
    h.gradeLevel,
    h.phase ?? null,
    h.curriculum,
    h.weeklyJpQuota,
    h.reserveJpSem1,
    h.reserveJpSem2,
  ]);

const formatDocumentLabel = (doc: Pick<ProtaSummary, 'subject' | 'gradeLevel' | 'academicYear'>) =>
  [doc.subject || 'Tanpa mapel', doc.gradeLevel, doc.academicYear].filter(Boolean).join(' · ');

export const PerangkatAjarPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { settings: userSettings, schoolName } = useUserSettings();
  const toast = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  const mode = rawMode === 'prota-promes' || rawMode === 'modul-ajar' ? rawMode : null;

  const handleSelectMode = (newMode: 'prota-promes' | 'modul-ajar' | null) => {
    if (newMode) {
      setSearchParams({ mode: newMode });
    } else {
      setSearchParams({});
    }
  };

  const [activeTab, setActiveTab] = useState<'kaldik' | 'prota' | 'promes' | 'preview'>('kaldik');

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

  // Promes Tab active semester and limit
  const [promesSemester, setPromesSemester] = useState<1 | 2>(1);
  // Promes uses the same weekly JP as the Prota; there is no separate limit to keep in sync.

  // Core Data States - Distinct states for Semester 1 and Semester 2 Promes matrices
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
  const [isPackaging, setIsPackaging] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [isAiBusy, setIsAiBusy] = useState(false);

  const protaItemsRef = useRef(protaItems);
  useEffect(() => {
    protaItemsRef.current = protaItems;
  }, [protaItems]);

  // Header values last written (or loaded); autosave skips when nothing changed.
  const savedHeaderKeyRef = useRef<string | null>(null);
  const promesSaveTimersRef = useRef<Partial<Record<1 | 2, ReturnType<typeof setTimeout>>>>({});
  const pendingPromesSavesRef = useRef<Partial<Record<1 | 2, () => void>>>({});

  // Document Identity for official exports with persistence fallback
  const [identity, setIdentity] = useState<DocumentIdentity>(() => {
    const cached = loadDocumentIdentity();
    return {
      ministryName: cached?.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
      regionalOffice: cached?.regionalOffice || 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
      schoolName: cached?.schoolName || schoolName || userSettings?.school_name || 'MI AL IRSYAD KOTA MADIUN',
      schoolAddress: cached?.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
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
      signatureDate: cached?.signatureDate || new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      showLogos: cached?.showLogos ?? true,
    };
  });

  // Compute effective document identity combining saved identity with active configuration
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
    [identity, schoolName, userSettings?.school_name, user?.name, subject, gradeLevel, phase, curriculum, academicYear, promesSemester]
  );

  const handleUpdateIdentity = (updates: Partial<DocumentIdentity>) => {
    setIdentity((prev) => {
      const next = { ...prev, ...updates };
      saveDocumentIdentity(next);
      return next;
    });
  };

  const currentHeader: HeaderFields = {
    id: protaId,
    academicYear,
    subject,
    gradeLevel,
    phase: phase || undefined,
    curriculum,
    weeklyJpQuota,
    reserveJpSem1,
    reserveJpSem2,
  };
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

  // Promes edits are batched; write the last one out before the page goes away.
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

  // 1. Initial document load
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

  // Kaldik belongs to the academic year, not to a single Prota.
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

  // First visit with nothing to show: offer to build everything from the timetable when there
  // is one, otherwise open the Quick Wizard. Shown once per session.
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
    // Runs once per visit; later changes to these values must not reopen the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasLoadedInitial, protaItems.length, user?.id]);

  // 2. Pure Calculations (RME & Prota Validation)
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

  // 3. Persistence helpers
  const buildPromesHeader = (semesterNumber: 1 | 2, id: string = protaId, limit = weeklyJpLimit): PromesHeader => ({
    id: crypto.randomUUID(),
    protaId: id,
    userId,
    semesterNumber,
    weeklyJpLimit: limit,
  });

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
    // currentHeader is rebuilt every render; headerKey captures every field it holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [headerKey, userId, refreshProtaList]
  );

  // Header fields (mapel, kelas, JP, cadangan, ...) save on their own after a short pause.
  // A brand-new document without materi is not written until it has content.
  const isKnownDocument = protaList.some((doc) => doc.id === protaId);
  useEffect(() => {
    if (!hasLoadedInitial || savedHeaderKeyRef.current === headerKey) return;
    if (!isKnownDocument && protaItemsRef.current.length === 0) return;
    const timer = setTimeout(() => triggerProtaSave(protaItemsRef.current), HEADER_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [headerKey, hasLoadedInitial, isKnownDocument, triggerProtaSave]);

  const schedulePromesSave = (semesterNumber: 1 | 2, cells: MatrixCell[]) => {
    const header = buildPromesHeader(semesterNumber);
    const run = () => {
      delete pendingPromesSavesRef.current[semesterNumber];
      void savePromes(header, cells).then(() => setLastSaved(new Date()));
    };
    clearTimeout(promesSaveTimersRef.current[semesterNumber]);
    pendingPromesSavesRef.current[semesterNumber] = run;
    promesSaveTimersRef.current[semesterNumber] = setTimeout(run, PROMES_SAVE_DELAY_MS);
  };

  /** Writes the Prota first, then both Promes, so allocations never point at missing items. */
  const persistDocument = async (
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
  };

  const rememberForUndo = (message: string, extra: Pick<UndoSnapshot, 'weeks'> = {}) => {
    setUndo({ message, header: currentHeader, protaItems, promesCellsSem1, promesCellsSem2, ...extra });
  };

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

  // 4. Handlers
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
    rememberForUndo(target?.learningObjectiveCode ? `Materi ${target.learningObjectiveCode} dihapus.` : 'Materi dihapus.');
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

  /** Hands a week back to "Bagi ulang": keeps its hours for now but no longer protects them. */
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

    // 1. Sync academic configuration
    setProtaId(targetId);
    setAcademicYear(data.academicYear);
    setSubject(data.subject);
    setGradeLevel(data.gradeLevel);
    setPhase(data.phase);
    setCurriculum(data.curriculum);
    setWeeklyJpQuota(data.weeklyJpQuota);
    setReserveJpSem1(data.reserveJpSem1);
    setReserveJpSem2(data.reserveJpSem2);
    // Another year's Kaldik is loaded by the academic-year effect; the teacher's saved
    // calendar for that year must not be overwritten with the wizard's preset.
    if (sameYear) setWeeks(data.weeks);
    setProtaItems(data.protaItems);
    setPromesCellsSem1(data.promesCellsSem1);
    setPromesCellsSem2(data.promesCellsSem2);

    // 2. Sync Document Identity
    const updatedIdentity = { ...identity, ...data.identityUpdates };
    setIdentity(updatedIdentity);
    saveDocumentIdentity(updatedIdentity);

    // 3. Persist everything to database/storage
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
      setActiveTab('prota');
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

  // School Kaldik published by an admin for this academic year.
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
    handleSelectMode('modul-ajar');
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
      setActiveTab('prota');
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
      // New items get new ids, so both Promes are rebuilt for them.
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

  const yearDocumentIds = useMemo(() => {
    const ids = protaList.filter((doc) => doc.academicYear === academicYear).map((doc) => doc.id);
    return ids.includes(protaId) || protaItems.length === 0 ? ids : [protaId, ...ids];
  }, [protaList, academicYear, protaId, protaItems.length]);

  const identityFor = (h: Pick<ProtaHeader, 'subject' | 'gradeLevel' | 'phase' | 'curriculum' | 'academicYear'>): DocumentIdentity => ({
    ...effectiveIdentity,
    subject: h.subject,
    gradeLevel: h.gradeLevel,
    phase: h.phase ? `Fase ${h.phase}` : undefined,
    curriculum: h.curriculum,
    academicYear: h.academicYear,
  });

  const currentPackageDocument = (): PackageDocument => ({
    identity: identityFor(currentHeader),
    items: protaItems,
    validation: protaValidation,
    weeks,
    cellsSem1: lockedPromesCellsSem1,
    cellsSem2: lockedPromesCellsSem2,
  });

  const loadPackageDocument = async (id: string): Promise<PackageDocument | null> => {
    if (id === protaId) return currentPackageDocument();
    const { header, items } = await loadProta(id);
    if (!header) return null;
    const [promes1, promes2] = await Promise.all([loadPromes(id, 1), loadPromes(id, 2)]);
    const validation = validateProtaBalance(
      items,
      calculateRme(weeks, 1, header.weeklyJpQuota, header.reserveJpSem1),
      calculateRme(weeks, 2, header.weeklyJpQuota, header.reserveJpSem2)
    );
    return {
      identity: identityFor(header),
      items,
      validation,
      weeks,
      cellsSem1: applyKaldikLocks(promes1.cells, weeks, 1),
      cellsSem2: applyKaldikLocks(promes2.cells, weeks, 2),
    };
  };

  const handleDownloadPackage = async (scope: 'current' | 'year') => {
    if (protaItems.length === 0 && scope === 'current') {
      toast.info('Dokumen ini belum berisi materi.');
      return;
    }
    flushPendingPromesSaves();
    setIsPackaging(true);
    try {
      const documents =
        scope === 'current'
          ? [currentPackageDocument()]
          : (await Promise.all(yearDocumentIds.map(loadPackageDocument))).filter(
              (doc): doc is PackageDocument => doc !== null && doc.items.length > 0
            );
      if (documents.length === 0) {
        toast.info('Belum ada Prota berisi materi untuk tahun ajaran ini.');
        return;
      }

      const { buildPerangkatAjarPackage, toSafeFileName } = await import('../../../utils/perangkatAjarPackage');
      const blob = await buildPerangkatAjarPackage(documents);
      const fileName =
        scope === 'current'
          ? `Prota Promes ${subject} ${gradeLevel}.zip`
          : `Perangkat Ajar ${academicYear.replace('/', '-')}.zip`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = toSafeFileName(fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 1500);
      toast.success(
        documents.length === 1
          ? 'Paket Prota & Promes diunduh.'
          : `Paket ${documents.length} Prota & Promes diunduh.`
      );
    } catch (err) {
      console.error('[PerangkatAjarPage] Package download failed:', err);
      toast.error('Gagal membuat paket. Coba lagi, atau unduh satu per satu di tab Pratinjau.');
    } finally {
      setIsPackaging(false);
    }
  };

  const documentOptions = isKnownDocument
    ? protaList
    : [{ id: protaId, subject, gradeLevel, academicYear }, ...protaList];

  if (!mode) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-3.5 sm:px-6 pb-24 sm:pb-20 animate-fade-in">
        {/* Hub Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 pt-3 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Pusat Perangkat Ajar Kurikulum Merdeka
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Perangkat Ajar Guru
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Pilih dokumen yang ingin Bapak/Ibu susun: modul ajar (RPP) lengkap dengan bantuan AI cerdas, atau perencanaan tahunan & pembagian jam mengajar (Prota & Promes). Seluruh dokumen siap cetak dan ekspor resmi.
          </p>
        </div>

        {/* 2 Big Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 pt-1">
          {/* Card 1: Modul Ajar (RPP) */}
          <div
            onClick={() => handleSelectMode('modul-ajar')}
            className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-sm">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Bantuan Cerdas AI
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Modul Ajar & RPP
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Penyusunan Modul Ajar dan RPP Kurikulum Merdeka secara otomatis dengan bantuan AI. Dilengkapi tujuan pembelajaran, lembar kerja siswa (LKPD), rubrik asesmen, dan ekspor Word.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Penyusunan otomatis Tujuan Pembelajaran, Pemantik, & LKPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Dukungan pembelajaran aktif dan materi berdiferensiasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Bank draf tersimpan otomatis & dapat diedit kapan saja</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Bisa langsung dicetak rapi atau diekspor ke Microsoft Word (.docx)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-3 sm:pt-4">
              <button
                type="button"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/30 active:scale-[0.99]"
              >
                <span>Mulai Susun Modul Ajar</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Prota & Promes */}
          <div
            onClick={() => handleSelectMode('prota-promes')}
            className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                  <CalendarRange className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Kalender & Pembagian Jam
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Prota & Promes
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Perencanaan alokasi waktu tahunan dan pembagian jam mengajar mingguan. Dilengkapi Kalender Pendidikan, Rincian Minggu Efektif (RME), dan matriks jam otomatis.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Kalender Pendidikan otomatis sesuai kalender resmi sekolah</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Hitung otomatis Minggu Efektif dan jam tatap muka (JP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Matriks pembagian jam mengajar per pekan (Semester 1 & 2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Cetak dokumen A4 Landscape atau ekspor ke Word & Excel</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-3 sm:pt-4">
              <button
                type="button"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/30 active:scale-[0.99]"
              >
                <span>Buka Prota & Promes</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Module Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:px-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleSelectMode(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all min-h-[40px]"
            title="Kembali ke pilihan menu Perangkat Ajar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Pilihan Menu</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            Perangkat Ajar <span className="mx-1">/</span>{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {mode === 'modul-ajar' ? 'Modul Ajar (RPP)' : 'Prota & Promes'}
            </strong>
          </div>
        </div>

        {/* Quick Module Switcher */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => handleSelectMode('prota-promes')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0 ${
              mode === 'prota-promes'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Prota & Promes</span>
          </button>
          <button
            onClick={() => handleSelectMode('modul-ajar')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0 ${
              mode === 'modul-ajar'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Modul Ajar</span>
          </button>
        </div>
      </div>

      {mode === 'modul-ajar' ? (
        <Suspense fallback={<ModulAjarCreatorPageSkeleton />}>
          <ModulAjarCreatorPage />
        </Suspense>
      ) : (
        <>
          {/* 1. Master Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-full border border-brand-200 dark:border-brand-800">
                  Perencanaan Pembelajaran
                </span>
                {lastSaved && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Tersimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2">
                Program Tahunan (Prota) & Program Semester (Promes)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Atur kalender pendidikan, hitung minggu efektif, dan susun pembagian jam mengajar tatap muka per minggu secara rapi dan seimbang sesuai panduan resmi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              <button
                type="button"
                onClick={() => handleOpenWizard(false)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-2xl transition-all shadow-xs hover:shadow cursor-pointer active:scale-95"
                title="Buka panduan cepat pembuatan Prota & Promes"
              >
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span>Panduan Cepat</span>
              </button>
              <button
                type="button"
                onClick={() => void handleOpenScheduleBatch()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all"
                title="Buat Prota & Promes untuk semua mapel dan kelas di jadwal mengajar"
              >
                <CalendarClock className="w-4 h-4" />
                <span>Buat dari Jadwal</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPackage(yearDocumentIds.length > 1 ? 'year' : 'current')}
                disabled={isPackaging}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all disabled:opacity-50"
                title={
                  yearDocumentIds.length > 1
                    ? `Unduh Prota & Promes untuk ${yearDocumentIds.length} dokumen tahun ${academicYear} dalam satu ZIP`
                    : 'Unduh Prota (Word) dan Promes Semester 1 & 2 (Excel) dalam satu ZIP'
                }
              >
                <Download className="w-4 h-4" />
                <span>{isPackaging ? 'Menyiapkan...' : 'Unduh Paket'}</span>
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-2xl transition-all shadow-sm hover:shadow"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua'}</span>
              </button>
            </div>
          </div>

      {/* 2. Global Metadata Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="prota-document-picker" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Dokumen Prota
          </label>
          <select
            id="prota-document-picker"
            value={protaId}
            onChange={(e) => void handleSwitchDocument(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            {documentOptions.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.id === protaId && !isKnownDocument
                  ? `${formatDocumentLabel(doc)} (belum tersimpan)`
                  : formatDocumentLabel(doc)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => handleOpenWizard(true)}
          className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Prota baru</span>
        </button>
        {(isKnownDocument || protaItems.length > 0) && (
          <button
            type="button"
            onClick={() => void handleDeleteDocument()}
            aria-label="Hapus dokumen Prota ini"
            title="Hapus dokumen ini beserta Promes-nya (bisa dibatalkan sesaat)"
            className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={academicYear}
            aria-label="Pilih Tahun Ajaran"
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            {getAcademicYearOptions(new Date(), academicYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            aria-label="Mata Pelajaran"
            placeholder="Mata Pelajaran"
            onChange={(e) => setSubject(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Kelas
          </label>
          <input
            type="text"
            value={gradeLevel}
            aria-label="Tingkat Kelas"
            placeholder="Kelas 4"
            onChange={(e) => handleChangeGradeLevel(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Fase Belajar
          </label>
          <select
            value={phase || 'B'}
            aria-label="Fase Kurikulum Merdeka"
            onChange={(e) => setPhase((e.target.value as PhaseType) || undefined)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="A">Fase A (Kelas 1-2 SD)</option>
            <option value="B">Fase B (Kelas 3-4 SD)</option>
            <option value="C">Fase C (Kelas 5-6 SD)</option>
            <option value="D">Fase D (Kelas 7-9 SMP)</option>
            <option value="E">Fase E (Kelas 10 SMA)</option>
            <option value="F">Fase F (Kelas 11-12 SMA)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Kurikulum
          </label>
          <select
            value={curriculum}
            aria-label="Format Kurikulum"
            onChange={(e) => setCurriculum(e.target.value as CurriculumType)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="MERDEKA">Kurikulum Merdeka</option>
            <option value="K13">Kurikulum 2013 (K-13)</option>
          </select>
        </div>
      </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth space-x-1 sm:space-x-2 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('kaldik')}
          className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
            activeTab === 'kaldik'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">1. Kaldik & RME</span>
          <span className="hidden sm:inline">1. Kalender Pendidikan & RME</span>
        </button>

        <button
          onClick={() => setActiveTab('prota')}
          className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
            activeTab === 'prota'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">2. Prota</span>
          <span className="hidden sm:inline">2. Program Tahunan (Prota)</span>
          {protaValidation.statusAnnual !== 'PAS' && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('promes')}
          className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
            activeTab === 'promes'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">3. Promes</span>
          <span className="hidden sm:inline">3. Program Semester (Promes)</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
            activeTab === 'preview'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Eye className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">4. Pratinjau & Ekspor</span>
          <span className="hidden sm:inline">4. Pratinjau & Ekspor Resmi</span>
        </button>
      </div>

      {/* 4. Active Tab Content */}
      <div className="pt-2">
        {activeTab === 'kaldik' && (
          <KaldikTab
            weeks={weeks}
            onUpdateWeek={handleUpdateWeek}
            onResetToPreset={handleResetKaldikToPreset}
            academicYear={academicYear}
            semestersWithoutHolidayData={semestersWithoutHolidayData}
            schoolKaldikUpdatedAt={schoolKaldik && !matchesSchoolKaldik ? schoolKaldik.updatedAt ?? '' : null}
            onUseSchoolKaldik={handleUseSchoolKaldik}
            onPublishSchoolKaldik={isAdmin ? () => void handlePublishSchoolKaldik() : undefined}
            isSchoolKaldik={Boolean(schoolKaldik) && matchesSchoolKaldik}
            rmeSem1={rmeSem1}
            rmeSem2={rmeSem2}
            weeklyJpQuota={weeklyJpQuota}
            onChangeWeeklyJpQuota={setWeeklyJpQuota}
            reserveJpSem1={reserveJpSem1}
            onChangeReserveJpSem1={setReserveJpSem1}
            reserveJpSem2={reserveJpSem2}
            onChangeReserveJpSem2={setReserveJpSem2}
          />
        )}

        {activeTab === 'prota' && (
          <ProtaTab
            items={protaItems}
            onAddItem={handleAddProtaItem}
            onUpdateItem={handleUpdateProtaItem}
            onDeleteItem={handleDeleteProtaItem}
            onMoveItem={handleMoveProtaItem}
            onSwapSemester={handleSwapSemesterProtaItem}
            onLoadSampleData={presetAvailable ? handleLoadPresetMateri : undefined}
            onOpenWizard={() => handleOpenWizard(false)}
            onAutoBalance={handleAutoBalanceProta}
            onFillWithAi={() => void handleFillWithAi()}
            onCreateModulAjar={handleCreateModulAjar}
            isAiBusy={isAiBusy}
            curriculum={curriculum}
            onChangeCurriculum={setCurriculum}
            validation={protaValidation}
            rmeSem1={rmeSem1}
            rmeSem2={rmeSem2}
          />
        )}

        {activeTab === 'promes' && (
          <PromesTab
            protaItems={protaItems}
            semesterWeeks={weeks}
            semesterNumber={promesSemester}
            onChangeSemester={setPromesSemester}
            weeklyJpLimit={weeklyJpLimit}
            onChangeWeeklyJpLimit={setWeeklyJpQuota}
            cells={promesSemester === 1 ? lockedPromesCellsSem1 : lockedPromesCellsSem2}
            onUpdateCell={handleUpdatePromesCell}
            onAutoDistribute={handleAutoDistributePromes}
            onReleaseCell={handleReleasePromesCell}
            onResetMatrix={handleResetPromesMatrix}
          />
        )}

        {activeTab === 'preview' && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Paket lengkap (ZIP)</p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Prota (Word) serta Promes Semester 1 dan 2 (Excel, lengkap dengan matriks pekan) sekaligus.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:flex gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadPackage('current')}
                disabled={isPackaging}
                className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Dokumen ini</span>
              </button>
              {yearDocumentIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => void handleDownloadPackage('year')}
                  disabled={isPackaging}
                  className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Semua Prota {academicYear} ({yearDocumentIds.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <PreviewTab
            identity={effectiveIdentity}
            onUpdateIdentity={handleUpdateIdentity}
            protaItems={protaItems}
            validation={protaValidation}
            kaldikWeeks={weeks}
            promesCells={lockedPromesCellsSem1}
            promesCellsSem2={lockedPromesCellsSem2}
          />
        )}
      </div>
    </>
  )}

  {/* Quick Setup Wizard Modal for Prota & Promes */}
  <ProtaPromesWizardModal
    isOpen={isWizardOpen}
    onClose={handleCloseWizard}
    onApply={handleApplyWizard}
    initialAcademicYear={academicYear}
    initialSubject={subject}
    initialGradeLevel={gradeLevel}
    initialCurriculum={curriculum}
    initialWeeklyJpQuota={weeklyJpQuota}
    currentWeeks={weeks}
    hasExistingData={protaItems.length > 0}
    preferNewDocument={wizardPrefersNew}
  />

  <ScheduleBatchModal
    isOpen={isScheduleBatchOpen}
    onClose={() => setIsScheduleBatchOpen(false)}
    status={scheduleStatus}
    plans={schedulePlans}
    academicYear={academicYear}
    isCreating={isCreatingBatch}
    progress={batchProgress}
    onCreate={(keys, useAi) => void handleCreateFromSchedule(keys, useAi)}
  />

  {undo && mode === 'prota-promes' && (
    <div
      role="status"
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 max-w-[calc(100vw-32px)] pl-4 pr-1.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs shadow-lg"
    >
      <span className="truncate">{undo.message}</span>
      <button
        type="button"
        onClick={() => void handleUndo()}
        className="shrink-0 min-h-[36px] px-3 font-bold text-emerald-300 hover:text-emerald-200 rounded-lg hover:bg-white/10"
      >
        Batalkan
      </button>
      <button
        type="button"
        onClick={() => setUndo(null)}
        aria-label="Tutup"
        className="shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )}
</div>
  );
};

export default PerangkatAjarPage;
