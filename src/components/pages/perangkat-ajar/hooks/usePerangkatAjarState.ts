import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  ProtaItem,
  ProtaHeader,
  PromesHeader,
  MatrixCell,
  CurriculumType,
  PhaseType,
  DocumentIdentity,
} from '../../../../types/perangkatAjar';
import {
  getCurrentAcademicYear,
  getPhaseForGrade,
} from '../../../../utils/kaldikEngine';
import {
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
  type ProtaSummary,
} from '../../../../services/perangkatAjarService';
import { writeModulAjarPrefill } from '../../modul-ajar/utils/protaPrefill';
import { planProtaFromSchedule } from '../../../../utils/protaSchedulePlanner';
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

import { usePerangkatAjarKaldik } from './usePerangkatAjarKaldik';
import { usePerangkatAjarProta } from './usePerangkatAjarProta';
import { usePerangkatAjarPromes } from './usePerangkatAjarPromes';
import { usePerangkatAjarScheduleBatch } from './usePerangkatAjarScheduleBatch';
import { usePerangkatAjarAi } from './usePerangkatAjarAi';

const DEFAULT_ACADEMIC_YEAR = getCurrentAcademicYear();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_PROTA_KEY = 'guru_cerdas_perangkat_ajar_active_prota_id';
const HEADER_AUTOSAVE_DELAY_MS = 800;
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

  // Core Data States
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

  const protaItemsRef = useRef(protaItems);
  useEffect(() => {
    protaItemsRef.current = protaItems;
  }, [protaItems]);

  const savedHeaderKeyRef = useRef<string | null>(null);

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

  // Kaldik Sub-hook
  const kaldikDomain = usePerangkatAjarKaldik({
    academicYear,
    weeklyJpQuota,
    reserveJpSem1,
    reserveJpSem2,
    rememberForUndo,
  });

  // Prota Auto-save
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

  // Prota Sub-hook
  const protaDomain = usePerangkatAjarProta({
    protaItems,
    setProtaItems,
    rmeSem1: kaldikDomain.rmeSem1,
    rmeSem2: kaldikDomain.rmeSem2,
    subject,
    gradeLevel,
    curriculum,
    triggerProtaSave,
    rememberForUndo,
  });

  // Promes Sub-hook
  const promesDomain = usePerangkatAjarPromes({
    weeks: kaldikDomain.weeks,
    protaItems,
    weeklyJpLimit,
    promesCellsSem1,
    setPromesCellsSem1,
    promesCellsSem2,
    setPromesCellsSem2,
    buildPromesHeader,
    setLastSaved,
    rememberForUndo,
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
      semesterNumber: promesDomain.promesSemester,
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
      promesDomain.promesSemester,
    ]
  );

  const handleUpdateIdentity = (updates: Partial<DocumentIdentity>) => {
    setIdentity((prev) => {
      const next = { ...prev, ...updates };
      saveDocumentIdentity(next);
      return next;
    });
  };

  const persistDocument = useCallback(
    async (
      header: ProtaHeader,
      items: ProtaItem[],
      cellsSem1: MatrixCell[],
      cellsSem2: MatrixCell[],
      limit: number
    ) => {
      promesDomain.flushPendingPromesSaves();
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
    [buildPromesHeader, promesDomain, refreshProtaList]
  );

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

  const isKnownDocument = protaList.some((doc) => doc.id === protaId);

  // Auto-save on header changes
  useEffect(() => {
    if (!hasLoadedInitial || savedHeaderKeyRef.current === headerKey) return;
    if (!isKnownDocument && protaItemsRef.current.length === 0) return;
    const timer = setTimeout(() => triggerProtaSave(protaItemsRef.current), HEADER_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [headerKey, hasLoadedInitial, isKnownDocument, triggerProtaSave]);

  // Schedule Batch Sub-hook
  const scheduleBatchDomain = usePerangkatAjarScheduleBatch({
    weeks: kaldikDomain.weeks,
    protaList,
    academicYear,
    curriculum,
    userId,
    buildPromesHeader,
    flushPendingPromesSaves: promesDomain.flushPendingPromesSaves,
    refreshProtaList,
    applyDocument,
    onNavigateToTab,
  });

  // AI Sub-hook
  const aiDomain = usePerangkatAjarAi({
    subject,
    gradeLevel,
    phase,
    curriculum,
    weeks: kaldikDomain.weeks,
    weeklyJpLimit,
    rmeSem1: kaldikDomain.rmeSem1,
    rmeSem2: kaldikDomain.rmeSem2,
    protaItems,
    currentHeader,
    userId,
    flushPendingPromesSaves: promesDomain.flushPendingPromesSaves,
    rememberForUndo,
    setProtaItems,
    setPromesCellsSem1,
    setPromesCellsSem2,
    persistDocument,
  });

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
        scheduleBatchDomain.setSchedulePlans(plans);
        scheduleBatchDomain.setScheduleStatus('ready');
        scheduleBatchDomain.setIsScheduleBatchOpen(true);
      })
      .catch(openFallbackWizard);
    return () => {
      isMounted = false;
    };
    // Runs once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasLoadedInitial, protaItems.length, user?.id]);

  const handleChangeGradeLevel = (value: string) => {
    setGradeLevel(value);
    const derivedPhase = getPhaseForGrade(value);
    if (derivedPhase) setPhase(derivedPhase);
  };

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
      kaldikDomain.setWeeks(snapshot.weeks);
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

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveKaldikWeeks(academicYear, kaldikDomain.weeks);
      saveDocumentIdentity(identity);
      await persistDocument(
        { ...currentHeader, userId },
        protaItems,
        promesDomain.lockedPromesCellsSem1,
        promesDomain.lockedPromesCellsSem2,
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
    promesDomain.flushPendingPromesSaves();
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
    promesDomain.flushPendingPromesSaves();
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
    if (sameYear) kaldikDomain.setWeeks(data.weeks);
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

  const handleDeleteDocument = async () => {
    if (!isKnownDocument && protaItems.length === 0) return;
    promesDomain.flushPendingPromesSaves();
    const deletedDocument = {
      header: { ...currentHeader, userId },
      items: protaItems,
      cellsSem1: promesDomain.lockedPromesCellsSem1,
      cellsSem2: promesDomain.lockedPromesCellsSem2,
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
    weeks: kaldikDomain.weeks,
    protaItems,
    promesCellsSem1,
    promesCellsSem2,
    protaId,
    protaList,
    documentOptions,
    isKnownDocument,
    // Promes state
    promesSemester: promesDomain.promesSemester,
    setPromesSemester: promesDomain.setPromesSemester,
    lockedPromesCellsSem1: promesDomain.lockedPromesCellsSem1,
    lockedPromesCellsSem2: promesDomain.lockedPromesCellsSem2,
    // RME & validation
    rmeSem1: kaldikDomain.rmeSem1,
    rmeSem2: kaldikDomain.rmeSem2,
    protaValidation: protaDomain.protaValidation,
    presetAvailable: protaDomain.presetAvailable,
    semestersWithoutHolidayData: kaldikDomain.semestersWithoutHolidayData,
    // Kaldik handlers
    handleUpdateWeek: kaldikDomain.handleUpdateWeek,
    handleResetKaldikToPreset: kaldikDomain.handleResetKaldikToPreset,
    // School kaldik
    schoolKaldik: kaldikDomain.schoolKaldik,
    matchesSchoolKaldik: kaldikDomain.matchesSchoolKaldik,
    handleUseSchoolKaldik: kaldikDomain.handleUseSchoolKaldik,
    handlePublishSchoolKaldik: kaldikDomain.handlePublishSchoolKaldik,
    // Sync & saving
    isSaving,
    lastSaved,
    handleSaveAll,
    flushPendingPromesSaves: promesDomain.flushPendingPromesSaves,
    // Undo
    undo,
    handleUndo,
    setUndo,
    // Prota Actions
    handleAddProtaItem: protaDomain.handleAddProtaItem,
    handleUpdateProtaItem: protaDomain.handleUpdateProtaItem,
    handleDeleteProtaItem: protaDomain.handleDeleteProtaItem,
    handleMoveProtaItem: protaDomain.handleMoveProtaItem,
    handleSwapSemesterProtaItem: protaDomain.handleSwapSemesterProtaItem,
    handleAutoBalanceProta: protaDomain.handleAutoBalanceProta,
    handleLoadPresetMateri: protaDomain.handleLoadPresetMateri,
    // Promes Actions
    handleUpdatePromesCell: promesDomain.handleUpdatePromesCell,
    handleReleasePromesCell: promesDomain.handleReleasePromesCell,
    handleAutoDistributePromes: promesDomain.handleAutoDistributePromes,
    handleResetPromesMatrix: promesDomain.handleResetPromesMatrix,
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
    isScheduleBatchOpen: scheduleBatchDomain.isScheduleBatchOpen,
    setIsScheduleBatchOpen: scheduleBatchDomain.setIsScheduleBatchOpen,
    scheduleStatus: scheduleBatchDomain.scheduleStatus,
    schedulePlans: scheduleBatchDomain.schedulePlans,
    isCreatingBatch: scheduleBatchDomain.isCreatingBatch,
    batchProgress: scheduleBatchDomain.batchProgress,
    handleOpenScheduleBatch: scheduleBatchDomain.handleOpenScheduleBatch,
    handleCreateFromSchedule: scheduleBatchDomain.handleCreateFromSchedule,
    // AI
    isAiBusy: aiDomain.isAiBusy,
    handleFillWithAi: aiDomain.handleFillWithAi,
    // Modul Ajar navigation
    handleCreateModulAjar,
  };
}
