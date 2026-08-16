import { useState, useCallback, useEffect, useRef } from 'react';
import { FormState } from '../types';
import { useAuth } from '../../../../hooks/useAuth';
import { useOptionalSemester } from '../../../../contexts/SemesterContext';
import { getCurrentSemester } from '../../../../utils/semesterUtils';
import { supabase } from '../../../../services/supabase';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';

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
      return activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2
        ? 'Genap'
        : 'Ganjil';
    }
    return defaultTerm.semester === '1' ? 'Ganjil' : 'Genap';
  }, [activeSemester?.name, activeSemester?.semester_number, defaultTerm.semester]);

  const [formState, setFormState] = useState<FormState>(() => {
    const initialYear = activeAcademicYear?.name || defaultTerm.academicYear;
    const initialSem = activeSemester?.name
      ? (activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2 ? 'Genap' : 'Ganjil')
      : (defaultTerm.semester === '1' ? 'Ganjil' : 'Genap');

    return {
      generationMethod: 'AI',
      documentType: 'Modul Ajar',
      curriculumApproach: 'Merdeka',
      satuanPendidikan: 'MI Al Irsyad',
      jenjang: 'SD/MI',
      kelas: '1',
      fase: 'A',
      mataPelajaran: '',
      topik: '',
      tahunAjaran: initialYear,
      semester: initialSem,
      guru: user?.name || '',
      targetPeserta: 'Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)',
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
      manualPertanyaanPemantik: '',
      manualLkpdTugas: '',
      manualSoalEvaluasi: '',
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
    };
  });

  const autoDistributeTime = useCallback(() => {
    setFormState(prev => {
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
  const lastLoadedTopicRef = useRef<string>('');
  const boilerplateLoadSeqRef = useRef(0);
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setFormState(prev => ({ ...prev, guru: user.name }));
    }
  }, [user?.name]);

  // Sync with active academic year & semester when context updates
  useEffect(() => {
    if (activeAcademicYear?.name) {
      setFormState(prev => {
        // Automatically sync if tahunAjaran was unset or still on previous default
        if (!prev.tahunAjaran || prev.tahunAjaran === '2023/2024') {
          return { ...prev, tahunAjaran: activeAcademicYear.name };
        }
        return prev;
      });
    }
  }, [activeAcademicYear?.name]);

  useEffect(() => {
    if (activeSemester?.name) {
      const semName = activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2
        ? 'Genap'
        : 'Ganjil';
      setFormState(prev => {
        if (!prev.semester) {
          return { ...prev, semester: semName };
        }
        return prev;
      });
    }
  }, [activeSemester?.name, activeSemester?.semester_number]);

  useEffect(() => {
    if (formState.generationMethod === 'Manual' && formState.topik && formState.mataPelajaran) {
      if (formState.topik !== lastLoadedTopicRef.current) {
        lastLoadedTopicRef.current = formState.topik;
        const loadSeq = ++boilerplateLoadSeqRef.current;
        
        const loadBoilerplate = async () => {
          try {
            const bp = await modulAjarContentService.getBoilerplate(formState.mataPelajaran, formState.topik, formState.fase);
            if (loadSeq !== boilerplateLoadSeqRef.current) return;
            if (bp) {
              setBoilerplateMissingBanner(null);
              setFormState(prev => ({
                ...prev,
                manualTujuanPembelajaran: Array.isArray(bp.tujuan_pembelajaran) ? bp.tujuan_pembelajaran.join('\n') : '',
                manualPertanyaanPemantik: Array.isArray(bp.pertanyaan_pemantik) ? bp.pertanyaan_pemantik.join('\n') : '',
                manualLkpdTugas: bp.lkpd_tugas || '',
                manualSoalEvaluasi: bp.soal_evaluasi || ''
              }));
            } else {
              setBoilerplateMissingBanner('Bank konten untuk topik ini belum tersedia — isi manual atau minta admin menambahkan');
              setFormState(prev => ({
                ...prev,
                manualTujuanPembelajaran: '',
                manualPertanyaanPemantik: '',
                manualLkpdTugas: '',
                manualSoalEvaluasi: ''
              }));
            }
          } catch (err: any) {
            if (loadSeq !== boilerplateLoadSeqRef.current) return;
            console.error('[Modul Ajar] Gagal memuat bank konten:', err);
            setBoilerplateMissingBanner(`⚠️ Gagal memuat bank konten: ${err.message || 'kesalahan tidak diketahui'}`);
          }
        };
        loadBoilerplate();
      }
    } else {
      boilerplateLoadSeqRef.current++; 
      setBoilerplateMissingBanner(null);
    }
  }, [formState.generationMethod, formState.topik, formState.mataPelajaran, formState.kelas, formState.fase]);

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase.from('ref_model_pembelajaran').select('*');
      if (data && !error) {
        setModels(data);
        if (data.length > 0) {
          setFormState(prev => ({ ...prev, modelPembelajaran: data[0].nama_model }));
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
    setFormState(prev => {
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
    setFormState(prev => {
      const exists = prev.profilPelajar.includes(profil);
      if (exists) {
        return { ...prev, profilPelajar: prev.profilPelajar.filter(p => p !== profil) };
      }
      return { ...prev, profilPelajar: [...prev.profilPelajar, profil] };
    });
  };

  const handleMetodeToggle = (metode: string) => {
    setFormState(prev => {
      const exists = prev.metodePembelajaran.includes(metode);
      if (exists) {
        return { ...prev, metodePembelajaran: prev.metodePembelajaran.filter(m => m !== metode) };
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

  const resetFormToDraft = (plan?: any) => {
    setFormState({
      generationMethod: plan?.generation_method || 'Manual',
      documentType: plan?.document_type || 'Modul Ajar',
      curriculumApproach: plan?.curriculum_approach || 'Merdeka',
      satuanPendidikan: plan?.identity?.satuanPendidikan || 'SD Negeri Cerdas Cendikia',
      jenjang: plan?.identity?.jenjang || 'SD',
      kelas: plan?.identity?.kelas || '1',
      fase: plan?.identity?.fase || 'A',
      mataPelajaran: plan?.identity?.mapel || '',
      topik: plan?.identity?.topik || '',
      tahunAjaran: plan?.identity?.tahun || getResolvedAcademicYear(),
      semester: plan?.identity?.semester || getResolvedSemester(),
      guru: plan?.identity?.guru || user?.name || '',
      targetPeserta: plan?.components?.target || 'Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)',
      kompetensiAwal: plan?.components?.kompetensiAwal || '',
      saranaPrasarana: plan?.components?.saranaPrasarana || '',
      capaianPembelajaran: plan?.components?.cp || '',
      profilPelajar: plan?.components?.profil || ['Bernalar Kritis', 'Gotong Royong'],
      jumlahPertemuan: plan?.components?.waktu?.pertemuan || 1,
      jpPerPertemuan: plan?.components?.waktu?.jp || 2,
      durasiPerJp: plan?.components?.waktu?.durasi || 35,
      modelPembelajaran: plan?.components?.model || 'Problem Based Learning',
      pendekatanPembelajaran: plan?.components?.pendekatanPembelajaran || 'Student Centered',
      teknikPembelajaran: plan?.components?.teknikPembelajaran || '',
      selectedModelId: plan?.components?.selectedModelId || undefined,
      metodePembelajaran: plan?.components?.metode || ['Diskusi', 'Tanya Jawab', 'Demonstrasi'],
      manualTujuanPembelajaran: Array.isArray(plan?.components?.tujuanPembelajaran)
        ? plan.components.tujuanPembelajaran.join('\n')
        : (plan?.components?.tujuanPembelajaran || ''),
      manualPertanyaanPemantik: Array.isArray(plan?.components?.pertanyaanPemantik)
        ? plan.components.pertanyaanPemantik.join('\n')
        : (plan?.components?.pertanyaanPemantik || ''),
      manualLkpdTugas: plan?.components?.lkpdTugas || '',
      manualSoalEvaluasi: plan?.components?.soalEvaluasi || '',
      alokasiPendahuluan: plan?.components?.alokasi?.pendahuluan || 15,
      alokasiInti: plan?.components?.alokasi?.inti || 70,
      alokasiPenutup: plan?.components?.alokasi?.penutup || 15,
      rubrikAsesmen: plan?.components?.rubrik || [],
      isKbcIntegrated: plan?.components?.isKbcIntegrated || false,
      temaKbc: plan?.components?.temaKbc || [],
      materiInsersi: plan?.components?.materiInsersi || '',
      modelPembelajaranKbc: plan?.components?.modelPembelajaranKbc || 'FIDS',
      asesmenSikap: '',
      paperSize: plan?.components?.paperSize || 'A4',
    });
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
  };
};
