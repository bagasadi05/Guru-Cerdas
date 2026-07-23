import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, History, Copy, Printer, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { FormState } from './types';
import { useModulAjarAiJob } from './hooks/useModulAjarAiJob';
import { buildHtmlTemplate, extractStudentHtml } from './utils/template';
import { modulAjarContentService } from '../../../services/modulAjarContentService';
import { ModulAjarForm } from './components/ModulAjarForm';
import { ModulAjarHistory } from './components/ModulAjarHistory';
import { ModulAjarPreview } from './components/ModulAjarPreview';

const ModulAjarCreatorPage: React.FC = () => {
  const { user } = useAuth();
  const [formState, setFormState] = useState<FormState>({
    generationMethod: 'Manual',
    documentType: 'Modul Ajar',
    curriculumApproach: 'Merdeka',
    satuanPendidikan: 'MI Al Irsyad',
    jenjang: 'SD/MI',
    kelas: '1',
    fase: 'A',
    mataPelajaran: '',
    topik: '',
    tahunAjaran: '2023/2024',
    semester: 'Ganjil',
    guru: user?.name || '',
    targetPeserta: 'Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)',
    kompetensiAwal: '',
    saranaPrasarana: '',
    capaianPembelajaran: '',
    profilPelajar: [],
    jumlahPertemuan: 1,
    jpPerPertemuan: 2,
    durasiPerJp: 35,
    modelPembelajaran: 'Tatap Muka',
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
  });

  const [activeStep, setActiveStep] = useState(1);
  const [isGeneratingCP, setIsGeneratingCP] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [previewMode, setPreviewMode] = useState<'guru' | 'siswa'>('guru');
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const lastLoadedTopicRef = useRef<string>('');

  // Sync teacher name from profile whenever user.name changes
  useEffect(() => {
    if (user?.name) {
      setFormState(prev => ({ ...prev, guru: user.name }));
    }
  }, [user?.name]);

  const [boilerplateMissingBanner, setBoilerplateMissingBanner] = useState<string | null>(null);

  useEffect(() => {
    if (formState.generationMethod === 'Manual' && formState.topik && formState.mataPelajaran) {
      if (formState.topik !== lastLoadedTopicRef.current) {
        lastLoadedTopicRef.current = formState.topik;
        
        const loadBoilerplate = async () => {
          const bp = await modulAjarContentService.getBoilerplate(formState.mataPelajaran, formState.topik, formState.fase);
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
        };
        loadBoilerplate();
      }
    } else {
      setBoilerplateMissingBanner(null);
    }
  }, [formState.generationMethod, formState.topik, formState.mataPelajaran, formState.kelas, formState.fase]);

  const [logoBase64, setLogoBase64] = useState<string>('');

  useEffect(() => {
    // Convert school logo to base64 for reliable rendering/Word compatibility
    fetch('/logo_sekolah.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error('Failed to load logo_sekolah.png:', err));
  }, []);

  // Initialize queue hook only if AI feature flag is ON
  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';
  const queueHookResult = useModulAjarAiJob(
    formState,
    async (successMsg) => {
      // Re-trigger manual generation to read from cache and construct HTML locally
      await generateManualModulAjar();
      fetchHistory();
      alert(successMsg);
    },
    (errMsg) => {
      alert(`AI Error: ${errMsg}`);
    }
  );

  const queueStatus = isAiEnabled ? queueHookResult.jobStatus : 'idle';
  const queuePosition = 0; // Backend handles positioning, UI just shows processing
  const activeQueueUser = null; // Backend handles active users privately
  const startQueueAndGenerate = isAiEnabled ? queueHookResult.startJob : () => {};

  const generateManualModulAjar = async () => {
    if (!formState.mataPelajaran || !formState.topik) {
      alert('Mata Pelajaran dan Topik/Materi wajib diisi.');
      return;
    }

    try {
      const bp = await modulAjarContentService.getBoilerplate(formState.mataPelajaran, formState.topik, formState.fase);

      let modelIdToUse = formState.selectedModelId;
      const selectedModelObj = models.find(m => m.id === modelIdToUse || m.nama_model === formState.modelPembelajaran);
      if (selectedModelObj) {
        modelIdToUse = selectedModelObj.id;
      }

      const sintaksList = modelIdToUse
        ? await modulAjarContentService.getSintaksKegiatan(modelIdToUse, {
            topik: formState.topik,
            mapel: formState.mataPelajaran,
            kelas: formState.kelas
          })
        : [];

      if (!sintaksList || sintaksList.length === 0) {
        alert('Sintaks kegiatan untuk model pembelajaran terpilih belum tersedia di database — silakan pilih model lain atau minta admin menambahkan.');
        return;
      }

      const sintaksIntiHtml = sintaksList.map(s => `<b>${s.nama_langkah}</b><br/>- <b>Guru:</b> ${s.kegiatan_guru}<br/>- <b>Siswa:</b> ${s.kegiatan_siswa}`).join('<br/><br/>');

      let tujuanPembelajaranList: string[] = formState.manualTujuanPembelajaran
        ? formState.manualTujuanPembelajaran.split('\n').filter(line => line.trim() !== '')
        : (bp?.tujuan_pembelajaran && Array.isArray(bp.tujuan_pembelajaran) ? bp.tujuan_pembelajaran : []);

      if (formState.isKbcIntegrated && formState.materiInsersi) {
        const frasa = formState.materiInsersi.trim();
        tujuanPembelajaranList = tujuanPembelajaranList.map(tp => {
          const cleaned = tp.replace(/\.$/, '');
          return `${cleaned} (${frasa}).`;
        });
      }

      let pendahuluanText = `Guru membuka kelas dengan salam, memeriksa kehadiran, menyampaikan apersepsi, dan tujuan pembelajaran terkait ${formState.topik || formState.mataPelajaran}.`;
      let penutupText = `Guru membimbing refleksi pembelajaran, menyimpulkan materi, dan menutup dengan doa.`;
      let sikapText = 'Observasi sikap peserta didik selama pembelajaran';

      if (formState.isKbcIntegrated) {
        pendahuluanText = `Guru membuka kelas dengan salam ramah, meminta salah seorang peserta didik memimpin doa pembuka (Basmalah & doa menuntut ilmu), memeriksa kehadiran, menyampaikan apersepsi, serta tujuan pembelajaran bernilai cinta.`;
        penutupText = `Guru bersama peserta didik melakukan refleksi atas pembelajaran dan nilai-nilai cinta yang dipelajari, menyimpulkan materi, kemudian menutup kelas dengan doa Hamdalah, doa kaffaratul majelis, dan salam penutup.`;
        sikapText = 'Observasi sikap spiritual (rasa syukur, kecintaan pada ilmu & ciptaan Allah Swt.) dan sikap sosial (kasih sayang, toleransi, empati) selama pembelajaran.';
      }

      const manualData = {
        ...bp,
        tujuanPembelajaran: tujuanPembelajaranList,
        pemahamanBermakna: bp?.pemahaman_bermakna && Array.isArray(bp.pemahaman_bermakna) ? bp.pemahaman_bermakna : [],
        pertanyaanPemantik: formState.manualPertanyaanPemantik
          ? formState.manualPertanyaanPemantik.split('\n').filter(line => line.trim() !== '')
          : (bp?.pertanyaan_pemantik && Array.isArray(bp.pertanyaan_pemantik) ? bp.pertanyaan_pemantik : []),
        lkpdTugas: formState.manualLkpdTugas || bp?.lkpd_tugas || '',
        soalEvaluasi: formState.manualSoalEvaluasi || bp?.soal_evaluasi || '',
        kegiatanPendahuluan: pendahuluanText,
        kegiatanInti: sintaksIntiHtml,
        kegiatanPenutup: penutupText,
        asesmenSikap: sikapText,
        asesmenKeterampilan: 'Penilaian unjuk kerja/proyek presentasi',
        asesmenPengetahuan: 'Tes tertulis/lisan di akhir materi',
        pengayaan: bp?.pengayaan && Array.isArray(bp.pengayaan) ? bp.pengayaan : [],
        remedial: bp?.remedial && Array.isArray(bp.remedial) ? bp.remedial : [],
        daftarPustaka: bp?.daftar_pustaka && Array.isArray(bp.daftar_pustaka) ? bp.daftar_pustaka : [],
      };

      const totalJP = formState.jumlahPertemuan * formState.jpPerPertemuan;
      const htmlTemplate = buildHtmlTemplate(formState, manualData, totalJP, logoBase64);

      await supabase.from('lesson_plans').insert({
        user_id: user?.id,
        document_type: formState.documentType,
        curriculum_approach: formState.curriculumApproach,
        generation_method: formState.generationMethod || 'Manual',
        identity: {
          kelas: formState.kelas,
          fase: formState.fase,
          mapel: formState.mataPelajaran,
          topik: formState.topik,
          tahun: formState.tahunAjaran,
          semester: formState.semester,
          guru: formState.guru
        },
        components: {
          target: formState.targetPeserta,
          cp: formState.capaianPembelajaran,
          profil: formState.profilPelajar,
          waktu: { pertemuan: formState.jumlahPertemuan, jp: formState.jpPerPertemuan, durasi: formState.durasiPerJp },
          model: formState.modelPembelajaran,
          metode: formState.metodePembelajaran,
          alokasi: { pendahuluan: formState.alokasiPendahuluan, inti: formState.alokasiInti, penutup: formState.alokasiPenutup },
          rubrik: formState.rubrikAsesmen as any,
          temaKbc: formState.temaKbc,
          materiInsersi: formState.materiInsersi
        },
        generated_content: htmlTemplate
      } as any);

      setGeneratedDocument(htmlTemplate);
      fetchHistory();
      alert('Draf Modul Ajar berhasil disusun secara manual! Anda dapat mengedit isinya secara bebas pada panel pratinjau.');

    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyusun modul ajar secara manual: ${err.message}`);
    }
  };

  const handleGenerate = () => {
    if (formState.generationMethod === 'Manual') {
      generateManualModulAjar();
    } else {
      startQueueAndGenerate();
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Load models & history on mount
  useEffect(() => {
    const fetchModels = async () => {
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
    };
    fetchModels();
    fetchHistory();
  }, [user, fetchHistory]);

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
    if (!formState.mataPelajaran) {
      alert('Mohon isi Mata Pelajaran terlebih dahulu.');
      return;
    }
    
    setIsGeneratingCP(true);
    try {
      const { data } = await supabase
        .from('ref_capaian_pembelajaran')
        .select('deskripsi_cp')
        .eq('fase', formState.fase)
        .ilike('mata_pelajaran', `%${formState.mataPelajaran}%`)
        .limit(1)
        .maybeSingle();

      if (data && data.deskripsi_cp) {
        handleInputChange('capaianPembelajaran', data.deskripsi_cp);
      } else {
        handleInputChange('capaianPembelajaran', '');
        alert('Capaian Pembelajaran (CP) untuk mata pelajaran dan fase ini belum tersedia di database — silakan isi manual atau minta admin menambahkan.');
      }
    } catch (err) {
      console.error('Gagal mengambil CP:', err);
    } finally {
      setIsGeneratingCP(false);
    }
  };

  const handleCopy = () => {
    if (!previewRef.current) return;
    navigator.clipboard.writeText(previewRef.current.innerText);
    alert('Teks berhasil disalin!');
  };

  const handlePrint = () => {
    const printContent = previewRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Cetak Modul Ajar</title>');
    printWindow.document.write(`
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          padding: 20px;
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        th, td {
          border: 1px solid #000000;
          padding: 8px;
          text-align: left;
        }
        @media print {
          body {
            font-family: 'Times New Roman', Times, serif;
            background-color: #ffffff;
            color: #000000;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td[style*="background-color: #00b050"] {
            background-color: #00b050 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td[style*="background-color: #ffff00"] {
            background-color: #ffff00 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExportWord = () => {
    const printContent = previewRef.current?.innerHTML;
    if (!printContent) return;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + printContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formState.documentType}_${formState.mataPelajaran}_Kelas${formState.kelas}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini dari riwayat?')) return;
    try {
      const { error } = await supabase.from('lesson_plans').delete().eq('id', id);
      if (!error) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (generatedDocument && history.find(item => item.id === id)?.generated_content === generatedDocument) {
          setGeneratedDocument('');
        }
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const restoreParameters = (plan: any) => {
    setFormState({
      generationMethod: plan.generation_method || 'Manual',
      documentType: plan.document_type || 'Modul Ajar',
      curriculumApproach: plan.curriculum_approach || 'Merdeka',
      satuanPendidikan: plan.identity?.satuanPendidikan || 'MI Al Irsyad',
      jenjang: plan.identity?.jenjang || 'SD/MI',
      kelas: plan.identity?.kelas || '1',
      fase: plan.identity?.fase || 'A',
      mataPelajaran: plan.identity?.mapel || '',
      topik: plan.identity?.topik || '',
      tahunAjaran: plan.identity?.tahun || '2023/2024',
      semester: plan.identity?.semester || 'Ganjil',
      guru: plan.identity?.guru || user?.name || '',
      targetPeserta: plan.components?.target || 'Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)',
      kompetensiAwal: plan.components?.kompetensiAwal || '',
      saranaPrasarana: plan.components?.saranaPrasarana || '',
      capaianPembelajaran: plan.components?.cp || '',
      profilPelajar: plan.components?.profil || [],
      jumlahPertemuan: plan.components?.waktu?.pertemuan || 1,
      jpPerPertemuan: plan.components?.waktu?.jp || 2,
      durasiPerJp: plan.components?.waktu?.durasi || 35,
      modelPembelajaran: plan.components?.model || 'Tatap Muka',
      metodePembelajaran: plan.components?.metode || [],
      manualTujuanPembelajaran: '',
      manualPertanyaanPemantik: '',
      manualLkpdTugas: '',
      manualSoalEvaluasi: '',
      alokasiPendahuluan: plan.components?.alokasi?.pendahuluan || 10,
      alokasiInti: plan.components?.alokasi?.inti || 50,
      alokasiPenutup: plan.components?.alokasi?.penutup || 10,
      rubrikAsesmen: plan.components?.rubrik || [],
      isKbcIntegrated: plan.components?.isKbcIntegrated || false,
      temaKbc: plan.components?.temaKbc || [],
      materiInsersi: plan.components?.materiInsersi || '',
      modelPembelajaranKbc: plan.components?.modelPembelajaranKbc || 'FIDS',
    });
    setGeneratedDocument(plan.generated_content);
    setActiveTab('preview');
    alert('Parameter modul ajar berhasil dipulihkan ke formulir!');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 pb-20 lg:pb-0">
      
      {/* Form Wizard column */}
      <ModulAjarForm
        formState={formState}
        onChange={handleInputChange}
        onProfilToggle={handleProfilToggle}
        onMetodeToggle={handleMetodeToggle}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        isGeneratingCP={isGeneratingCP}
        onGenerateCP={generateCP}
        models={models}
        isLoadingModels={isLoadingModels}
        queueStatus={queueStatus}
        onGenerate={handleGenerate}
        boilerplateMissingBanner={boilerplateMissingBanner}
      />

      {/* Preview / History Column */}
      <div className="flex-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)]">
        
        {/* Tab Header */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview' 
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pratinjau
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'history' 
                ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Riwayat Saya
            </button>
          </div>

          {activeTab === 'preview' && generatedDocument && (
            <div className="flex bg-indigo-50/80 dark:bg-indigo-950/30 p-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              <button
                onClick={() => setPreviewMode('guru')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  previewMode === 'guru'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50'
                }`}
              >
                Perangkat Guru
              </button>
              <button
                onClick={() => setPreviewMode('siswa')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  previewMode === 'siswa'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50'
                }`}
              >
                Lembar Siswa Saja
              </button>
            </div>
          )}
          
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1">
              <button onClick={handleCopy} disabled={!generatedDocument} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50" title="Salin Teks">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handlePrint} disabled={!generatedDocument} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" title="Cetak / Simpan sebagai PDF">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button onClick={handleExportWord} disabled={!generatedDocument} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" title="Download Format Ms. Word (.doc)">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Word</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/50">
          
          {activeTab === 'preview' ? (
            <>
              {/* Realtime Queue Overlay */}
              {(queueStatus === 'pending' || queueStatus === 'processing') && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-6 text-center">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4"
                  >
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                      <Clock className="w-6 h-6 text-indigo-500 animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-800 dark:text-white">Antrian Pemrosesan AI</h3>
                      {queueStatus === 'pending' || queueStatus === 'retry_wait' ? (
                        <>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Permintaan dikirim ke server. Harap tunggu...</p>
                        </>
                      ) : (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">Menghubungi AI... Sedang menulis perangkat ajar Anda.</p>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}

              {
                (() => {
                  const documentToShow = previewMode === 'siswa'
                    ? extractStudentHtml(generatedDocument, formState, logoBase64)
                    : generatedDocument;
                  return (
                    <ModulAjarPreview
                      generatedDocument={documentToShow}
                      previewRef={previewRef}
                      documentType={formState.documentType}
                    />
                  );
                })()
              }
            </>
          ) : (
            <ModulAjarHistory
              history={history}
              isLoading={isLoadingHistory}
              onRestore={restoreParameters}
              onDelete={deleteHistoryItem}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default ModulAjarCreatorPage;
