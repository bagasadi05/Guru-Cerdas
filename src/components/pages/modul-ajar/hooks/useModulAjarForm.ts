import { useState, useCallback, useEffect, useRef } from 'react';
import { FormState } from '../types';
import { useAuth } from '../../../../hooks/useAuth';
import { useOptionalSemester } from '../../../../contexts/SemesterContext';
import { getCurrentSemester } from '../../../../utils/semesterUtils';
import { supabase } from '../../../../services/supabase';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';
import { clearModulAjarPrefill, peekModulAjarPrefill } from '../utils/protaPrefill';

/** Text fields that can be filled automatically (content bank, a generated document, AI per field). */
export const CONTENT_FIELDS = [
  'manualTujuanPembelajaran',
  'manualPemahamanBermakna',
  'manualPertanyaanPemantik',
  'manualMateriAjar',
  'manualLkpdTugas',
  'manualSoalEvaluasi',
  'manualPengayaan',
  'manualRemedial',
  'manualGlosarium',
  'manualDaftarPustaka',
  'kompetensiAwal',
] as const;
export type ContentField = (typeof CONTENT_FIELDS)[number];
export type ContentValues = Partial<Record<ContentField, string>>;

/**
 * Where a content field's current value came from. A field without an origin,
 * or whose value no longer matches its origin, was written by the teacher.
 */
type FieldOrigin = { value: string; key: string; kind: 'bank' | 'generated' | 'ai-field' };

/** Content belongs to one subject, topic, phase and grade. */
const contentKeyOf = (f: Pick<FormState, 'mataPelajaran' | 'topik' | 'fase' | 'kelas'>) =>
  [f.mataPelajaran, f.topik, f.fase, f.kelas].map((v) => (v || '').trim().toLowerCase()).join('|');

const BANK_LOAD_DEBOUNCE_MS = 400;

const DEFAULT_SCHOOL_NAME = 'MI Al Irsyad';
const DEFAULT_TARGET = 'Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)';

/** One source of defaults for a fresh form, a reset, and fields missing in an old plan. */
export const createDefaultFormState = (opts: {
  guru: string;
  satuanPendidikan?: string;
  tahunAjaran: string;
  semester: string;
}): FormState => ({
  generationMethod: 'AI',
  documentType: 'Modul Ajar',
  curriculumApproach: 'Merdeka',
  satuanPendidikan: opts.satuanPendidikan || DEFAULT_SCHOOL_NAME,
  jenjang: 'SD/MI',
  kelas: '1',
  fase: 'A',
  mataPelajaran: '',
  topik: '',
  tahunAjaran: opts.tahunAjaran,
  semester: opts.semester,
  guru: opts.guru,
  targetPeserta: DEFAULT_TARGET,
  kompetensiAwal: '',
  saranaPrasarana: '',
  capaianPembelajaran: '',
  profilPelajar: [],
  jumlahPertemuan: 1,
  jpPerPertemuan: 2,
  durasiPerJp: 35,
  modelPembelajaran: 'Problem Based Learning',
  metodePembelajaran: [],
  manualTujuanPembelajaran: '',
  manualPemahamanBermakna: '',
  manualPertanyaanPemantik: '',
  manualMateriAjar: '',
  manualLkpdTugas: '',
  manualSoalEvaluasi: '',
  manualPengayaan: '',
  manualRemedial: '',
  manualGlosarium: '',
  manualDaftarPustaka: '',
  // 2 JP x 35 minutes = 70 minutes.
  alokasiPendahuluan: 10,
  alokasiInti: 50,
  alokasiPenutup: 10,
  rubrikAsesmen: [],
  isKbcIntegrated: false,
  temaKbc: [],
  materiInsersi: '',
  modelPembelajaranKbc: 'FIDS',
  asesmenSikap: '',
  pendekatanPembelajaran: 'Student Centered',
  selectedModelId: 'pbl',
  teknikPembelajaran: '',
  paperSize: 'A4',
});

export const useModulAjarForm = () => {
  const { user } = useAuth();
  const semesterContext = useOptionalSemester();
  const activeAcademicYear = semesterContext?.activeAcademicYear;
  const activeSemester = semesterContext?.activeSemester;
  const defaultTerm = getCurrentSemester();

  const getResolvedAcademicYear = useCallback(() => {
    return activeAcademicYear?.name || defaultTerm.academicYear;
  }, [activeAcademicYear?.name, defaultTerm.academicYear]);

  const getResolvedSemester = useCallback(() => {
    if (activeSemester?.name) {
      return activeSemester.name.toLowerCase().includes('genap') ||
        activeSemester.semester_number === 2
        ? 'Genap'
        : 'Ganjil';
    }
    return defaultTerm.semester === '1' ? 'Ganjil' : 'Genap';
  }, [activeSemester?.name, activeSemester?.semester_number, defaultTerm.semester]);

  const [formState, setFormState] = useState<FormState>(() => ({
    ...createDefaultFormState({
      guru: user?.name || '',
      satuanPendidikan: user?.school_name,
      tahunAjaran: getResolvedAcademicYear(),
      semester: getResolvedSemester(),
    }),
    // Opened from a Prota row: start from that materi instead of an empty form.
    ...peekModulAjarPrefill(),
  }));
  useEffect(() => {
    clearModulAjarPrefill();
  }, []);
  const formStateRef = useRef(formState);
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  const autoDistributeTime = useCallback(() => {
    setFormState((prev) => {
      const totalMinutes = (prev.jpPerPertemuan || 2) * (prev.durasiPerJp || 35);
      let pendahuluan = Math.max(5, Math.round((totalMinutes * 0.15) / 5) * 5);
      let penutup = Math.max(5, Math.round((totalMinutes * 0.15) / 5) * 5);
      let inti = totalMinutes - pendahuluan - penutup;

      if (inti < 10) {
        pendahuluan = 5;
        penutup = 5;
        inti = Math.max(10, totalMinutes - 10);
      }

      return {
        ...prev,
        alokasiPendahuluan: pendahuluan,
        alokasiInti: inti,
        alokasiPenutup: penutup,
      };
    });
  }, []);

  const [activeStep, setActiveStep] = useState(1);
  const [isGeneratingCP, setIsGeneratingCP] = useState(false);
  const [boilerplateMissingBanner, setBoilerplateMissingBanner] = useState<string | null>(null);

  const boilerplateLoadSeqRef = useRef<number>(0);
  const fieldOriginsRef = useRef<Partial<Record<ContentField, FieldOrigin>>>({});

  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setFormState((prev) => ({ ...prev, guru: user.name }));
    }
  }, [user?.name]);

  useEffect(() => {
    if (activeAcademicYear?.name) {
      setFormState((prev) => {
        if (!prev.tahunAjaran) {
          return { ...prev, tahunAjaran: activeAcademicYear.name };
        }
        return prev;
      });
    }
  }, [activeAcademicYear?.name]);

  useEffect(() => {
    if (activeSemester?.name) {
      const semName =
        activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2
          ? 'Genap'
          : 'Ganjil';
      setFormState((prev) => {
        if (!prev.semester) {
          return { ...prev, semester: semName };
        }
        return prev;
      });
    }
  }, [activeSemester?.name, activeSemester?.semester_number]);

  /** True when the field holds text the teacher wrote or explicitly asked AI to fill. */
  const isFieldOwnedByTeacher = useCallback(
    (field: ContentField, state: FormState = formStateRef.current) => {
      const value = String(state[field] ?? '');
      if (!value.trim()) return false;
      const origin = fieldOriginsRef.current[field];
      if (!origin || origin.value !== value) return true;
      return origin.kind === 'ai-field';
    },
    [],
  );

  /**
   * Writes automatic content into the form. Fields the teacher owns are left
   * alone; with `onlyEmpty`, any field that already has text is left alone.
   */
  const applyAutoContent = useCallback(
    (values: ContentValues, kind: FieldOrigin['kind'], onlyEmpty = false) => {
      setFormState((prev) => {
        const key = contentKeyOf(prev);
        const next = { ...prev };
        let changed = false;
        (Object.keys(values) as ContentField[]).forEach((field) => {
          const value = values[field] ?? '';
          const current = String(prev[field] ?? '');
          if (onlyEmpty && current.trim()) return;
          if (kind !== 'ai-field' && isFieldOwnedByTeacher(field, prev)) return;
          next[field] = value;
          fieldOriginsRef.current[field] = { value, key, kind };
          changed = true;
        });
        return changed ? next : prev;
      });
    },
    [isFieldOwnedByTeacher],
  );

  /** A field filled by its AI button: used for generation, dropped on topic change if untouched. */
  const setFieldFromAi = useCallback(
    (field: ContentField, value: string) => applyAutoContent({ [field]: value }, 'ai-field'),
    [applyAutoContent],
  );

  /** Content of a document just generated, written back so the teacher can refine it. */
  const applyGeneratedContent = useCallback(
    (values: ContentValues) => applyAutoContent(values, 'generated'),
    [applyAutoContent],
  );

  const contentKey = contentKeyOf(formState);

  useEffect(() => {
    // Automatic content written for another topic is stale. Drop it unless the
    // teacher has edited it since (then it is theirs).
    setFormState((prev) => {
      let next: FormState | null = null;
      CONTENT_FIELDS.forEach((field) => {
        const origin = fieldOriginsRef.current[field];
        if (!origin) return;
        if (String(prev[field] ?? '') !== origin.value) {
          delete fieldOriginsRef.current[field];
          return;
        }
        if (origin.key !== contentKey) {
          next = next ?? { ...prev };
          next[field] = '';
          delete fieldOriginsRef.current[field];
        }
      });
      return next ?? prev;
    });

    const { generationMethod, mataPelajaran, topik, fase } = formStateRef.current;
    if (generationMethod !== 'Manual' || !topik.trim() || !mataPelajaran.trim()) {
      boilerplateLoadSeqRef.current++;
      setBoilerplateMissingBanner(null);
      return;
    }

    // Manual mode: fill empty fields from the content bank. Debounced so typing
    // a topic does not query the bank on every keystroke.
    const loadSeq = ++boilerplateLoadSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const bp = await modulAjarContentService.getBoilerplate(mataPelajaran, topik, fase);
        if (loadSeq !== boilerplateLoadSeqRef.current) return;
        if (!bp) {
          setBoilerplateMissingBanner(
            'Bank konten untuk topik ini belum tersedia. Isi manual atau minta admin menambahkannya.',
          );
          return;
        }
        setBoilerplateMissingBanner(null);
        const join = (value: unknown, sep: string) => (Array.isArray(value) ? value.join(sep) : '');
        applyAutoContent(
          {
            manualTujuanPembelajaran: join(bp.tujuan_pembelajaran, '\n'),
            manualPemahamanBermakna: join(bp.pemahaman_bermakna, '\n'),
            manualPertanyaanPemantik: join(bp.pertanyaan_pemantik, '\n'),
            manualLkpdTugas: bp.lkpd_tugas || '',
            manualSoalEvaluasi: bp.soal_evaluasi || '',
            manualPengayaan: join(bp.pengayaan, '\n\n'),
            manualRemedial: join(bp.remedial, '\n\n'),
            manualDaftarPustaka: join(bp.daftar_pustaka, '\n'),
            manualMateriAjar: bp.konten_json?.materiAjar || bp.konten_json?.materi || '',
            manualGlosarium: join(bp.konten_json?.glosarium, '\n'),
          },
          'bank',
          true,
        );
      } catch (err: any) {
        if (loadSeq !== boilerplateLoadSeqRef.current) return;
        console.error('[Modul Ajar] Gagal memuat bank konten:', err);
        setBoilerplateMissingBanner(
          `Gagal memuat bank konten: ${err.message || 'kesalahan tidak diketahui'}. Isian Anda tidak diubah.`,
        );
      }
    }, BANK_LOAD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [contentKey, formState.generationMethod, applyAutoContent]);

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase.from('ref_model_pembelajaran').select('*');
      if (data && !error) {
        setModels(data);
        if (data.length > 0) {
          setFormState((prev) =>
            prev.modelPembelajaran ? prev : { ...prev, modelPembelajaran: data[0].nama_model },
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormState((prev) => {
      const newState = { ...prev, [field]: value };
      if (field === 'kelas') {
        const k = parseInt(value);
        if (k <= 2) newState.fase = 'A';
        else if (k <= 4) newState.fase = 'B';
        else if (k <= 6) newState.fase = 'C';
      }
      return newState;
    });
  };

  const handleProfilToggle = (profil: string) => {
    setFormState((prev) => {
      const exists = prev.profilPelajar.includes(profil);
      if (exists) {
        return { ...prev, profilPelajar: prev.profilPelajar.filter((p) => p !== profil) };
      }
      return { ...prev, profilPelajar: [...prev.profilPelajar, profil] };
    });
  };

  const handleMetodeToggle = (metode: string) => {
    setFormState((prev) => {
      const exists = prev.metodePembelajaran.includes(metode);
      if (exists) {
        return { ...prev, metodePembelajaran: prev.metodePembelajaran.filter((m) => m !== metode) };
      }
      return { ...prev, metodePembelajaran: [...prev.metodePembelajaran, metode] };
    });
  };

  const generateCP = async () => {
    if (!formState.mataPelajaran) return;
    setIsGeneratingCP(true);
    try {
      const { data, error } = await supabase
        .from('ref_capaian_pembelajaran')
        .select('deskripsi_cp')
        .eq('fase', formState.fase)
        .ilike('mata_pelajaran', `%${formState.mataPelajaran}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Gagal mengambil CP:', error);
        return;
      }

      if (data && data.deskripsi_cp) {
        handleInputChange('capaianPembelajaran', data.deskripsi_cp);
      }
    } catch (err) {
      console.error('Gagal mengambil CP:', err);
    } finally {
      setIsGeneratingCP(false);
    }
  };

  /** Loads a saved plan into the form (or a blank form). Returns the new state. */
  const resetFormToDraft = (plan?: any): FormState => {
    const d = createDefaultFormState({
      guru: user?.name || '',
      satuanPendidikan: user?.school_name,
      tahunAjaran: getResolvedAcademicYear(),
      semester: getResolvedSemester(),
    });
    const c = plan?.components || {};
    const id = plan?.identity || {};
    const lines = (value: unknown, sep: string) =>
      Array.isArray(value) ? value.join(sep) : typeof value === 'string' ? value : '';
    const next: FormState = !plan
      ? d
      : {
          ...d,
          generationMethod: plan.generation_method === 'Manual' ? 'Manual' : 'AI',
          documentType: plan.document_type || d.documentType,
          curriculumApproach: plan.curriculum_approach || d.curriculumApproach,
          satuanPendidikan: id.satuanPendidikan || d.satuanPendidikan,
          jenjang: id.jenjang || d.jenjang,
          kelas: id.kelas || d.kelas,
          fase: id.fase || d.fase,
          mataPelajaran: id.mapel || '',
          topik: id.topik || '',
          tahunAjaran: id.tahun || d.tahunAjaran,
          semester: id.semester || d.semester,
          guru: id.guru || d.guru,
          targetPeserta: c.target || d.targetPeserta,
          kompetensiAwal: c.kompetensiAwal || '',
          saranaPrasarana: c.saranaPrasarana || '',
          capaianPembelajaran: c.cp || '',
          profilPelajar: c.profil || d.profilPelajar,
          jumlahPertemuan: c.waktu?.pertemuan || d.jumlahPertemuan,
          jpPerPertemuan: c.waktu?.jp || d.jpPerPertemuan,
          durasiPerJp: c.waktu?.durasi || d.durasiPerJp,
          modelPembelajaran: c.model || d.modelPembelajaran,
          pendekatanPembelajaran: c.pendekatanPembelajaran || d.pendekatanPembelajaran,
          teknikPembelajaran: c.teknikPembelajaran || '',
          selectedModelId: c.selectedModelId || d.selectedModelId,
          metodePembelajaran: c.metode || d.metodePembelajaran,
          manualTujuanPembelajaran: lines(c.tujuanPembelajaran, '\n'),
          manualPemahamanBermakna: lines(c.pemahamanBermakna, '\n'),
          manualPertanyaanPemantik: lines(c.pertanyaanPemantik, '\n'),
          manualMateriAjar: c.materiAjar || '',
          manualLkpdTugas: c.lkpdTugas || '',
          manualSoalEvaluasi: c.soalEvaluasi || '',
          manualPengayaan: lines(c.pengayaan, '\n\n'),
          manualRemedial: lines(c.remedial, '\n\n'),
          manualGlosarium: lines(c.glosarium, '\n'),
          manualDaftarPustaka: lines(c.daftarPustaka, '\n'),
          alokasiPendahuluan: c.alokasi?.pendahuluan || d.alokasiPendahuluan,
          alokasiInti: c.alokasi?.inti || d.alokasiInti,
          alokasiPenutup: c.alokasi?.penutup || d.alokasiPenutup,
          rubrikAsesmen: c.rubrik || [],
          isKbcIntegrated: c.isKbcIntegrated || false,
          temaKbc: c.temaKbc || [],
          materiInsersi: c.materiInsersi || '',
          modelPembelajaranKbc: c.modelPembelajaranKbc || d.modelPembelajaranKbc,
          asesmenSikap: c.asesmenSikap || '',
          paperSize: c.paperSize || d.paperSize,
        };
    // Restored text is the teacher's document: never treat it as automatic.
    fieldOriginsRef.current = {};
    formStateRef.current = next;
    setFormState(next);
    return next;
  };

  return {
    formState,
    setFormState,
    activeStep,
    setActiveStep,
    isGeneratingCP,
    boilerplateMissingBanner,
    models,
    isLoadingModels,
    handleInputChange,
    handleProfilToggle,
    handleMetodeToggle,
    generateCP,
    resetFormToDraft,
    autoDistributeTime,
    isFieldOwnedByTeacher,
    applyGeneratedContent,
    setFieldFromAi,
  };
};
