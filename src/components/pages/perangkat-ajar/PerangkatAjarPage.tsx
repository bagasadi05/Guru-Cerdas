import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
import { calculateRme } from '../../../utils/kaldikEngine';
import {
  validateProtaBalance,
  moveProtaItem,
  swapItemSemester,
  autoBalanceProtaJp,
} from '../../../utils/protaEngine';
import { autoDistributePromes } from '../../../utils/promesEngine';
import { getDefaultNationalKaldik } from '../../../data/defaultKaldikPresets';
import {
  loadKaldikWeeks,
  saveKaldikWeeks,
  loadProta,
  saveProta,
  loadPromes,
  savePromes,
  saveDocumentIdentity,
  loadDocumentIdentity,
} from '../../../services/perangkatAjarService';
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

const DEFAULT_ACADEMIC_YEAR = '2024/2025';

export const PerangkatAjarPage: React.FC = () => {
  const { user } = useAuth();
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
  const [reserveJpSem1, setReserveJpSem1] = useState<number>(0);
  const [reserveJpSem2, setReserveJpSem2] = useState<number>(0);

  // Promes Tab active semester and limit
  const [promesSemester, setPromesSemester] = useState<1 | 2>(1);
  const [weeklyJpLimit, setWeeklyJpLimit] = useState<number>(4);

  // Core Data States - Distinct states for Semester 1 and Semester 2 Promes matrices
  const [weeks, setWeeks] = useState<KaldikWeek[]>(() => getDefaultNationalKaldik(DEFAULT_ACADEMIC_YEAR));
  const [protaItems, setProtaItems] = useState<ProtaItem[]>([]);
  const [promesCellsSem1, setPromesCellsSem1] = useState<MatrixCell[]>([]);
  const [promesCellsSem2, setPromesCellsSem2] = useState<MatrixCell[]>([]);
  const [protaId, setProtaId] = useState<string>(() => {
    const cached = localStorage.getItem('guru_cerdas_perangkat_ajar_active_prota_id');
    const isUuid = cached && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cached);
    return isUuid ? cached : crypto.randomUUID();
  });

  // Save/Sync status indicator
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Quick Setup Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

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

  // 1. Initial Data Load
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      try {
        const loadedWeeks = await loadKaldikWeeks(academicYear);
        if (isMounted && loadedWeeks.length > 0) {
          setWeeks(loadedWeeks);
        }

        const { header, items } = await loadProta();
        if (isMounted) {
          if (header) {
            setProtaId(header.id);
            setSubject(header.subject);
            setGradeLevel(header.gradeLevel);
            if (header.phase) setPhase(header.phase);
            setCurriculum(header.curriculum);
            setWeeklyJpQuota(header.weeklyJpQuota);
            setReserveJpSem1(header.reserveJpSem1);
            setReserveJpSem2(header.reserveJpSem2);
            setWeeklyJpLimit(header.weeklyJpQuota);
          }
          if (items && items.length > 0) {
            setProtaItems(items);
          }

          // Load Promes cells for BOTH semesters if prota exists
          if (header?.id) {
            const [promesRes1, promesRes2] = await Promise.all([
              loadPromes(header.id, 1),
              loadPromes(header.id, 2),
            ]);
            if (promesRes1.cells.length > 0) {
              setPromesCellsSem1(promesRes1.cells);
            }
            if (promesRes2.cells.length > 0) {
              setPromesCellsSem2(promesRes2.cells);
            }
          }
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
  }, [academicYear]);

  // Auto-prompt Quick Wizard if user enters Prota & Promes with zero items
  useEffect(() => {
    if (mode === 'prota-promes' && hasLoadedInitial && protaItems.length === 0) {
      const sessionKey = `guru_cerdas_prota_wizard_dismissed_${user?.id || 'guest'}`;
      const isDismissed = sessionStorage.getItem(sessionKey);
      if (!isDismissed) {
        setIsWizardOpen(true);
      }
    }
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

  // 3. Handlers
  const handleUpdateWeek = (month: number, weekNumber: number, type: WeekType) => {
    const isExisting = weeks.some((w) => w.month === month && w.weekNumber === weekNumber);
    const updated = isExisting
      ? weeks.map((w) => (w.month === month && w.weekNumber === weekNumber ? { ...w, type } : w))
      : [...weeks, { month, weekNumber, type, academicYear }];
    setWeeks(updated);
    void saveKaldikWeeks(academicYear, updated);
  };

  const handleResetKaldikToPreset = () => {
    const preset = getDefaultNationalKaldik(academicYear);
    setWeeks(preset);
    void saveKaldikWeeks(academicYear, preset);
    toast.success('Kalender Pendidikan berhasil direset ke Preset Nasional.');
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
    toast.success('Materi berhasil dipindahkan semester.');
  };

  const handleAutoBalanceProta = () => {
    if (protaItems.length === 0) {
      toast.info('Belum ada materi pembelajaran. Silakan muat contoh materi atau buka Panduan Cepat terlebih dahulu.');
      return;
    }

    const result = autoBalanceProtaJp(protaItems, rmeSem1, rmeSem2);
    if (!result.isBalanced && result.adjustedItemIds.length === 0) {
      toast.info('Alokasi jam sudah pas atau data minggu efektif di Kalender Pendidikan belum terisi.');
      return;
    }

    setProtaItems(result.items);
    triggerProtaSave(result.items);
    toast.success(result.message || '✨ Alokasi JP berhasil diseimbangkan otomatis! Target minggu efektif kini pas.');
  };

  const handleLoadSampleCurriculum = (currType: CurriculumType) => {
    let sampleItems: ProtaItem[] = [];

    if (currType === 'MERDEKA') {
      sampleItems = [
        // Semester 1
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 4.1',
          learningObjectiveText: 'Memahami ide pokok dan ide pendukung pada teks informatif lisan',
          coreTopic: 'Bab 1: Sudah Besar',
          targetJp: 18,
          orderIndex: 0,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'Membaca dan Memirsa',
          learningObjectiveCode: 'TP 4.2',
          learningObjectiveText: 'Membaca nyaring teks narasi dengan intonasi yang tepat',
          coreTopic: 'Bab 2: Di Bawah Atap',
          targetJp: 18,
          orderIndex: 1,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 4.3',
          learningObjectiveText: 'Mempresentasikan gagasan dengan volume dan pelafalan yang jelas',
          coreTopic: 'Bab 3: Lihat Sekitar',
          targetJp: 20,
          orderIndex: 2,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 4.4',
          learningObjectiveText: 'Menulis teks narasi sederhana menggunakan kalimat efektif',
          coreTopic: 'Bab 4: Meliuk dan Menerjang',
          targetJp: 20,
          orderIndex: 3,
        },
        // Semester 2
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'Menyimak',
          learningObjectiveCode: 'TP 4.5',
          learningObjectiveText: 'Mengidentifikasi informasi penting dari teks instruksional',
          coreTopic: 'Bab 5: Bertukar dan Membayar',
          targetJp: 18,
          orderIndex: 4,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'Membaca dan Memirsa',
          learningObjectiveCode: 'TP 4.6',
          learningObjectiveText: 'Menemukan makna kosakata baru menggunakan kamus',
          coreTopic: 'Bab 6: Satu Titik',
          targetJp: 18,
          orderIndex: 5,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'Berbicara',
          learningObjectiveCode: 'TP 4.7',
          learningObjectiveText: 'Berpartisipasi aktif dalam diskusi kelompok',
          coreTopic: 'Bab 7: Asal Usul',
          targetJp: 20,
          orderIndex: 6,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'Menulis',
          learningObjectiveCode: 'TP 4.8',
          learningObjectiveText: 'Menulis surat pribadi dengan struktur yang benar',
          coreTopic: 'Bab 8: Sehatlah Ragaku',
          targetJp: 20,
          orderIndex: 7,
        },
      ];
    } else {
      sampleItems = [
        // K-13 Samples
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'KI-3 & KI-4',
          learningObjectiveCode: 'KD 3.1 / 4.1',
          learningObjectiveText: 'Mencermati gagasan pokok dan gagasan pendukung dalam teks tulis',
          coreTopic: 'Indahnya Kebersamaan',
          targetJp: 38,
          orderIndex: 0,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 1,
          elementOrDomain: 'KI-3 & KI-4',
          learningObjectiveCode: 'KD 3.2 / 4.2',
          learningObjectiveText: 'Mencermati keterhubungan antargagasan dalam teks lisan dan tulis',
          coreTopic: 'Selalu Berhemat Energi',
          targetJp: 38,
          orderIndex: 1,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'KI-3 & KI-4',
          learningObjectiveCode: 'KD 3.6 / 4.6',
          learningObjectiveText: 'Menggali isi dan amanat puisi yang disajikan secara lisan dan tulis',
          coreTopic: 'Cita-Citaku',
          targetJp: 38,
          orderIndex: 2,
        },
        {
          id: crypto.randomUUID(),
          semesterNumber: 2,
          elementOrDomain: 'KI-3 & KI-4',
          learningObjectiveCode: 'KD 3.7 / 4.7',
          learningObjectiveText: 'Menggali pengetahuan baru yang terdapat pada teks nonfiksi',
          coreTopic: 'Indahnya Negeriku',
          targetJp: 38,
          orderIndex: 3,
        },
      ];
    }

    setProtaItems(sampleItems);
    triggerProtaSave(sampleItems);
    toast.success(`Contoh materi ${currType === 'MERDEKA' ? 'Kurikulum Merdeka' : 'Kurikulum 2013'} berhasil dimuat!`);
  };

  const triggerProtaSave = (itemsToSave: ProtaItem[]) => {
    setIsSaving(true);
    const header: ProtaHeader = {
      id: protaId || crypto.randomUUID(),
      userId: user?.id || 'offline_user',
      academicYear,
      subject,
      gradeLevel,
      phase: phase || undefined,
      curriculum,
      weeklyJpQuota,
      reserveJpSem1,
      reserveJpSem2,
    };

    saveProta(header, itemsToSave)
      .then((savedId) => {
        setProtaId(savedId);
        setLastSaved(new Date());
      })
      .catch((err) => {
        console.warn('[PerangkatAjarPage] Auto-save prota failed:', err);
      })
      .finally(() => setIsSaving(false));
  };

  const handleUpdatePromesCell = (
    rowId: string,
    monthIndex: number,
    weekNumber: number,
    jp: number
  ) => {
    const targetCells = promesSemester === 1 ? promesCellsSem1 : promesCellsSem2;
    const setTargetCells = promesSemester === 1 ? setPromesCellsSem1 : setPromesCellsSem2;

    const existingIdx = targetCells.findIndex(
      (c) => c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber
    );

    let updatedCells: MatrixCell[];
    if (existingIdx >= 0) {
      updatedCells = targetCells.map((c, i) =>
        i === existingIdx ? { ...c, allocatedJp: jp } : c
      );
    } else {
      updatedCells = [
        ...targetCells,
        {
          rowId,
          monthIndex,
          weekNumber,
          allocatedJp: jp,
          isLocked: false,
        },
      ];
    }

    setTargetCells(updatedCells);

    // Save Promes for the active semester
    const effectiveProtaId = (protaId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(protaId))
      ? protaId
      : crypto.randomUUID();
    if (effectiveProtaId !== protaId) {
      setProtaId(effectiveProtaId);
    }

    const header: PromesHeader = {
      id: crypto.randomUUID(),
      protaId: effectiveProtaId,
      userId: user?.id || 'offline_user',
      semesterNumber: promesSemester,
      weeklyJpLimit,
    };
    void savePromes(header, updatedCells);
  };

  const handleAutoDistributePromes = () => {
    const semesterItems = protaItems.filter((i) => i.semesterNumber === promesSemester);
    if (semesterItems.length === 0) {
      toast.warning('Tambahkan Tujuan Pembelajaran di Program Tahunan (Prota) terlebih dahulu.');
      return;
    }

    const newCells = autoDistributePromes({
      items: semesterItems.map((i) => ({ id: i.id, targetJp: i.targetJp })),
      semesterWeeks: weeks,
      weeklyJpLimit,
    });

    if (promesSemester === 1) {
      setPromesCellsSem1(newCells);
    } else {
      setPromesCellsSem2(newCells);
    }

    const effectiveProtaId = (protaId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(protaId))
      ? protaId
      : crypto.randomUUID();
    if (effectiveProtaId !== protaId) {
      setProtaId(effectiveProtaId);
    }

    const header: PromesHeader = {
      id: crypto.randomUUID(),
      protaId: effectiveProtaId,
      userId: user?.id || 'offline_user',
      semesterNumber: promesSemester,
      weeklyJpLimit,
    };
    void savePromes(header, newCells);
    toast.success(`Distribusi otomatis Semester ${promesSemester} berhasil dilakukan!`);
  };

  const handleResetPromesMatrix = () => {
    if (promesSemester === 1) {
      setPromesCellsSem1([]);
    } else {
      setPromesCellsSem2([]);
    }
    const effectiveProtaId = (protaId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(protaId))
      ? protaId
      : crypto.randomUUID();
    const header: PromesHeader = {
      id: crypto.randomUUID(),
      protaId: effectiveProtaId,
      userId: user?.id || 'offline_user',
      semesterNumber: promesSemester,
      weeklyJpLimit,
    };
    void savePromes(header, []);
    toast.info(`Matriks distribusi Semester ${promesSemester} berhasil dikosongkan.`);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveKaldikWeeks(academicYear, weeks);
      saveDocumentIdentity(identity);

      const header: ProtaHeader = {
        id: protaId || crypto.randomUUID(),
        userId: user?.id || 'offline_user',
        academicYear,
        subject,
        gradeLevel,
        phase: phase || undefined,
        curriculum,
        weeklyJpQuota,
        reserveJpSem1,
        reserveJpSem2,
      };

      const savedProtaId = await saveProta(header, protaItems);
      setProtaId(savedProtaId);

      const promesHdr1: PromesHeader = {
        id: crypto.randomUUID(),
        protaId: savedProtaId,
        userId: user?.id || 'offline_user',
        semesterNumber: 1,
        weeklyJpLimit,
      };
      const promesHdr2: PromesHeader = {
        id: crypto.randomUUID(),
        protaId: savedProtaId,
        userId: user?.id || 'offline_user',
        semesterNumber: 2,
        weeklyJpLimit,
      };

      await Promise.all([
        savePromes(promesHdr1, promesCellsSem1),
        savePromes(promesHdr2, promesCellsSem2),
      ]);

      setLastSaved(new Date());
      toast.success('Seluruh perangkat ajar (Kaldik, Prota, Promes Sem 1 & 2) berhasil disimpan!');
    } catch (err) {
      console.error('[PerangkatAjarPage] Error saving all:', err);
      toast.error('Gagal menyimpan perangkat ajar. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    const sessionKey = `guru_cerdas_prota_wizard_dismissed_${user?.id || 'guest'}`;
    sessionStorage.setItem(sessionKey, 'true');
  };

  const handleApplyWizard = async (data: WizardApplyData) => {
    // 1. Sync academic configuration
    setAcademicYear(data.academicYear);
    setSubject(data.subject);
    setGradeLevel(data.gradeLevel);
    setPhase(data.phase);
    setCurriculum(data.curriculum);
    setWeeklyJpQuota(data.weeklyJpQuota);
    setWeeklyJpLimit(data.weeklyJpQuota);
    setReserveJpSem1(data.reserveJpSem1);
    setReserveJpSem2(data.reserveJpSem2);
    setWeeks(data.weeks);
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
      await saveKaldikWeeks(data.academicYear, data.weeks);

      const header: ProtaHeader = {
        id: protaId || crypto.randomUUID(),
        userId: user?.id || 'offline_user',
        academicYear: data.academicYear,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        phase: data.phase,
        curriculum: data.curriculum,
        weeklyJpQuota: data.weeklyJpQuota,
        reserveJpSem1: data.reserveJpSem1,
        reserveJpSem2: data.reserveJpSem2,
      };

      const savedProtaId = await saveProta(header, data.protaItems);
      setProtaId(savedProtaId);

      const promesHdr1: PromesHeader = {
        id: crypto.randomUUID(),
        protaId: savedProtaId,
        userId: user?.id || 'offline_user',
        semesterNumber: 1,
        weeklyJpLimit: data.weeklyJpQuota,
      };
      const promesHdr2: PromesHeader = {
        id: crypto.randomUUID(),
        protaId: savedProtaId,
        userId: user?.id || 'offline_user',
        semesterNumber: 2,
        weeklyJpLimit: data.weeklyJpQuota,
      };

      await Promise.all([
        savePromes(promesHdr1, data.promesCellsSem1),
        savePromes(promesHdr2, data.promesCellsSem2),
      ]);

      setLastSaved(new Date());
      setIsWizardOpen(false);
      setActiveTab('prota');
      toast.success('✨ Prota dan Promes berhasil dibuat dan disimpan otomatis!');
    } catch (err) {
      console.error('[PerangkatAjarPage] Error saving wizard generated data:', err);
      toast.error('Data berhasil diterapkan di layar. Klik tombol Simpan Semua untuk memastikan penyimpanan.');
      setIsWizardOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

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

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-2xl transition-all shadow-xs hover:shadow cursor-pointer active:scale-95"
                title="Buka panduan cepat pembuatan Prota & Promes"
              >
                <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
                <span>✨ Panduan Cepat</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs">
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
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
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
            onChange={(e) => setGradeLevel(e.target.value)}
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
            rmeSem1={rmeSem1}
            rmeSem2={rmeSem2}
            weeklyJpQuota={weeklyJpQuota}
            onChangeWeeklyJpQuota={(q) => {
              setWeeklyJpQuota(q);
              setWeeklyJpLimit(q);
            }}
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
            onLoadSampleData={handleLoadSampleCurriculum}
            onOpenWizard={() => setIsWizardOpen(true)}
            onAutoBalance={handleAutoBalanceProta}
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
            onChangeWeeklyJpLimit={setWeeklyJpLimit}
            cells={promesSemester === 1 ? promesCellsSem1 : promesCellsSem2}
            onUpdateCell={handleUpdatePromesCell}
            onAutoDistribute={handleAutoDistributePromes}
            onResetMatrix={handleResetPromesMatrix}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewTab
            identity={effectiveIdentity}
            onUpdateIdentity={handleUpdateIdentity}
            protaItems={protaItems}
            validation={protaValidation}
            kaldikWeeks={weeks}
            promesCells={promesCellsSem1}
            promesCellsSem2={promesCellsSem2}
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
  />
</div>
  );
};

export default PerangkatAjarPage;
