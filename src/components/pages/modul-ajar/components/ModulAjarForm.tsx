import React from 'react';
import { MotionDiv, AnimatePresence } from '../../../ui/MotionComponents';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Compass,
  BookOpen,
  Target,
  FileEdit,
  Clock,
  RotateCcw,
  Plus,
  Info,
  Check,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from '../../../../utils/i18n';
import { FormState, RubrikRow } from '../types';
import { useOptionalSemester } from '../../../../contexts/SemesterContext';
import { getCurrentSemester } from '../../../../utils/semesterUtils';
import { useTopikRecommendations, useRubrikTemplates, useTemaKbc, useMateriInsersiMulti, useLearningModels } from '../hooks/useModulAjarQueries';
import { PANCA_CINTA_TOPICS_FALLBACK, MATERI_INSERSI_FALLBACK } from '../constants/kbcConstants';
import { LEARNING_MODELS, ENNIS_IKTP_BANK, ModelCategory } from '../constants/learningModels';

interface AiButtonProps {
  field: string;
  label?: string;
  onAiFillField?: (field: string) => void;
  fieldLoading: Record<string, boolean>;
}

const AiButton: React.FC<AiButtonProps> = ({ field, label, onAiFillField, fieldLoading }) => {
  if (!onAiFillField) return null;
  const loading = fieldLoading[field];
  return (
    <button
      type="button"
      onClick={() => onAiFillField(field)}
      disabled={loading}
      className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {label || (loading ? 'Memproses...' : 'AI')}
    </button>
  );
};

interface ModulAjarFormProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onProfilToggle: (profil: string) => void;
  onMetodeToggle: (metode: string) => void;
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  isGeneratingCP: boolean;
  onGenerateCP: () => void;
  models: any[];
  isLoadingModels: boolean;
  queueStatus: string;
  onGenerate: () => void;
  boilerplateMissingBanner?: string | null;
  onAiFillField?: (field: string) => void;
  fieldLoading?: Record<string, boolean>;
  isAiGenerating?: boolean;
  onResetForm?: () => void;
  onApplyPreset?: (presetData: Partial<FormState>) => void;
  autoDistributeTime?: () => void;
}

const PRESET_STARTERS = [
  {
    id: 'matematika',
    title: '🔢 Matematika (Kls 1)',
    data: {
      mataPelajaran: 'Matematika',
      topik: 'Penjumlahan Bilangan Cacah sampai 20',
      jenjang: 'SD',
      kelas: '1',
      fase: 'A',
      documentType: 'Modul Ajar' as const,
      curriculumApproach: 'Merdeka' as const,
      modelPembelajaran: 'Problem Based Learning',
      capaianPembelajaran: 'Peserta didik dapat melakukan operasi penjumlahan bilangan cacah sampai 20 menggunakan benda konkret, gambar, dan simbol matematika.',
      profilPelajar: ['Bernalar Kritis', 'Gotong Royong', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menghitung penjumlahan 1-20 menggunakan benda konkret.\n2. Peserta didik dapat menyelesaikan soal cerita sederhana terkait penjumlahan.',
      manualPertanyaanPemantik: 'Jika kamu memiliki 4 buah pensil, lalu temanmu meminjamkan 3 pensil lagi, berapa total pensilmu sekarang?',
      manualLkpdTugas: '### Aktivitas 1: Berhitung Bersama Sahabat\n* Petunjuk:\n1. Hitung jumlah gambar bersama kelompokmu.\n2. Tuliskan angka pada kotak yang tersedia.\n\n[Kotak untuk Menuliskan Penjumlahan Gambar dan Jawaban]',
      manualSoalEvaluasi: '1. 8 + 5 = ...\nA. 12\nB. 13\nC. 14\nD. 15\n\n2. Budi memiliki 6 permen dan diberi 4 permen oleh kakak. Berapa jumlah permen Budi sekarang?'
    }
  },
  {
    id: 'bahasa-indonesia',
    title: '📖 B. Indonesia (Kls 4)',
    data: {
      mataPelajaran: 'Bahasa Indonesia',
      topik: 'Menemukan Ide Pokok dalam Teks Narasi',
      jenjang: 'SD',
      kelas: '4',
      fase: 'B',
      documentType: 'Modul Ajar' as const,
      curriculumApproach: 'Merdeka' as const,
      modelPembelajaran: 'Inquiry Learning',
      capaianPembelajaran: 'Peserta didik mampu memahami dan menganalisis ide pokok serta informasi penting dari teks narasi dan eksposisi.',
      profilPelajar: ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat mengidentifikasi ide pokok pada setiap paragraf teks narasi.\n2. Peserta didik dapat menceritakan kembali isi teks dengan kata-kata sendiri.',
      manualPertanyaanPemantik: 'Bagaimana cara kita mengetahui pesan utama yang ingin disampaikan oleh penulis dalam sebuah cerita?',
      manualLkpdTugas: '### Aktivitas: Detektif Ide Pokok\n* Petunjuk:\n1. Bacalah teks cerita pendek bersama teman sebangku.\n2. Tuliskan gagasan utama pada kolom di bawah.\n\n[Kotak untuk Menuliskan Ide Pokok Paragraf 1 dan Paragraf 2]',
      manualSoalEvaluasi: '1. Ide pokok paragraf biasanya terletak pada kalimat...\nA. Penjelas\nB. Utama\nC. Tanya\nD. Terakhir saja\n\n2. Tuliskan satu paragraf narasi singkat mengenai pengalamanmu belajar di sekolah!'
    }
  },
  {
    id: 'ipas',
    title: '🌿 IPAS (Kls 4)',
    data: {
      mataPelajaran: 'IPAS',
      topik: 'Proses Fotosintesis pada Tumbuhan Hijau',
      jenjang: 'SD',
      kelas: '4',
      fase: 'B',
      documentType: 'Modul Ajar' as const,
      curriculumApproach: 'Merdeka' as const,
      modelPembelajaran: 'Discovery Learning',
      capaianPembelajaran: 'Peserta didik mendeskripsikan proses fotosintesis dan mengaitkan pentingnya proses ini bagi makhluk hidup di bumi.',
      profilPelajar: ['Bernalar Kritis', 'Gotong Royong'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menjelaskan 4 kebutuhan utama fotosintesis (cahaya, klorofil, air, CO2).\n2. Peserta didik dapat menyimpulkan zat yang dihasilkan dari fotosintesis.',
      manualPertanyaanPemantik: 'Mengapa tumbuhan tetap bisa hidup dan berkembang padahal tidak memakan makanan seperti manusia?',
      manualLkpdTugas: '### Aktivitas: Eksperimen Dapur Tumbuhan Hijau\n* Petunjuk:\n1. Amati daun yang terkena sinar matahari di dalam air.\n2. Catat gelembung udara yang dihasilkan.\n\n[Kotak untuk Menggambar Gelembung Oksigen dan Menuliskan Kesimpulan]',
      manualSoalEvaluasi: '1. Gas yang dibutuhkan tumbuhan untuk melakukan fotosintesis adalah...\nA. Oksigen\nB. Karbon Dioksida\nC. Nitrogen\nD. Gas Mulia\n\n2. Jelaskan mengapa proses fotosintesis sangat penting bagi pernapasan makhluk hidup!'
    }
  },
  {
    id: 'kbc',
    title: '❤️ KBC Cinta (Kls 1)',
    data: {
      mataPelajaran: 'Pendidikan Agama Islam',
      topik: 'Meneladani Kasih Sayang Asmaul Husna Ar-Rahman',
      jenjang: 'SD/MI',
      kelas: '1',
      fase: 'A',
      documentType: 'Modul Ajar' as const,
      curriculumApproach: 'Berbasis Cinta' as const,
      isKbcIntegrated: true,
      temaKbc: ['cinta-sesama', 'cinta-allah'],
      materiInsersi: 'Meneladani Asmaul Husna Ar-Rahman dalam menyayangi teman dan keluarga',
      modelPembelajaran: 'MMJ (Membaca, Meniru, Menjiwai)',
      capaianPembelajaran: 'Peserta didik mengenal Asmaul Husna Ar-Rahman dan Ar-Rahim serta membiasakan sikap kasih sayang kepada keluarga, teman, dan lingkungan sekitar.',
      profilPelajar: ['Beriman & Bertakwa', 'Bergotong Royong', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menyebutkan arti Ar-Rahman dan Ar-Rahim dengan benar.\n2. Peserta didik mampu mempraktikkan perilaku kasih sayang kepada teman dan sesama makhluk.',
      manualPertanyaanPemantik: 'Bagaimana cara kita menunjukkan rasa sayang kepada ibu, ayah, dan teman-teman kita setiap hari?',
      manualLkpdTugas: '### Aktivitas: Pohon Kebaikan dan Kasih Sayang\n* Petunjuk:\n1. Tuliskan perbuatan baik yang telah kamu lakukan hari ini.\n2. Warnai gambar hati dengan rapi.\n\n[Kotak untuk Menuliskan Perbuatan Kasih Sayang dan Menggambar]',
      manualSoalEvaluasi: '1. Ar-Rahman artinya Allah Maha...\nA. Pengasih\nB. Perkasa\nC. Mengetahui\nD. Melihat\n\n2. Sebutkan 2 contoh sikap kasih sayang kepada teman di sekolah!'
    }
  }
];

export const ModulAjarForm: React.FC<ModulAjarFormProps> = ({
  formState,
  onChange,
  onProfilToggle,
  onMetodeToggle,
  activeStep,
  setActiveStep,
  isGeneratingCP,
  onGenerateCP,
  models: _models,
  isLoadingModels: _isLoadingModels,
  queueStatus,
  onGenerate,
  boilerplateMissingBanner,
  onAiFillField,
  fieldLoading = {},
  isAiGenerating,
  onResetForm,
  onApplyPreset,
  autoDistributeTime
}) => {
  const { t } = useTranslation();
  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';

  const semesterContext = useOptionalSemester();
  const activeAcademicYear = semesterContext?.activeAcademicYear;
  const activeSemester = semesterContext?.activeSemester;
  const defaultTerm = getCurrentSemester();
  const currentActiveYearName = activeAcademicYear?.name || defaultTerm.academicYear;
  const currentActiveSemName = activeSemester?.name
    ? (activeSemester.name.toLowerCase().includes('genap') || activeSemester.semester_number === 2 ? 'Genap' : 'Ganjil')
    : (defaultTerm.semester === '1' ? 'Ganjil' : 'Genap');

  const aiProps = { onAiFillField, fieldLoading };

  const [activeCategoryTab, setActiveCategoryTab] = React.useState<ModelCategory>('hots');
  const PROFIL_OPTIONS = ['Beriman & Bertakwa', 'Berkebinekaan Global', 'Bergotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
  const METODE_OPTIONS = ['Ceramah', 'Diskusi', 'Tanya Jawab', 'Demonstrasi', 'Eksperimen', 'Proyek', 'Role Playing', 'Penugasan'];

  const { data: recommendations = [] } = useTopikRecommendations(formState.mataPelajaran);
  const { data: rubrikDiskusi = [] } = useRubrikTemplates('diskusi');
  const { data: rubrikPresentasi = [] } = useRubrikTemplates('presentasi');
  const { data: rubrikSikap = [] } = useRubrikTemplates('sikap');
  
  useLearningModels();
  const { data: temaKbcData = [] } = useTemaKbc();
  const { data: materiInsersiData = [] } = useMateriInsersiMulti(formState.temaKbc);

  const topicsToDisplay = temaKbcData.length > 0 ? temaKbcData : PANCA_CINTA_TOPICS_FALLBACK;
  const materiToDisplay = materiInsersiData.length > 0 
    ? materiInsersiData.map(m => m.konten)
    : formState.temaKbc.flatMap(id => MATERI_INSERSI_FALLBACK[id] || []);

  const WIZARD_STEPS = [
    { id: 1, label: 'Kurikulum', short: '1. Kurikulum', icon: Sparkles },
    { id: 2, label: 'Identitas', short: '2. Identitas', icon: BookOpen },
    { id: 3, label: 'Target & Profil', short: '3. Profil', icon: Target },
    { id: 4, label: 'Komponen Inti', short: '4. Inti & LKPD', icon: FileEdit },
    { id: 5, label: 'Model & Waktu', short: '5. Model', icon: Clock },
  ];

  const isStepComplete = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return !!formState.generationMethod && !!formState.documentType;
      case 2:
        return !!formState.mataPelajaran && !!formState.topik && !!formState.kelas;
      case 3:
        return formState.profilPelajar.length > 0 && !!formState.kompetensiAwal;
      case 4:
        return !!formState.capaianPembelajaran || !!formState.manualTujuanPembelajaran;
      case 5:
        return !!formState.modelPembelajaran;
      default:
        return false;
    }
  };

  const adjustPendahuluan = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    let newInti = total - newVal - formState.alokasiPenutup;
    let newPenutup = formState.alokasiPenutup;
    if (newInti < 10) {
      newInti = 10;
      newPenutup = total - newVal - 10;
    }
    if (newPenutup < 5) {
      newPenutup = 5;
      newInti = total - newVal - 5;
    }
    onChange('alokasiPendahuluan', newVal);
    onChange('alokasiInti', newInti);
    onChange('alokasiPenutup', newPenutup);
  };

  const adjustPenutup = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    let newInti = total - formState.alokasiPendahuluan - newVal;
    let newPendahuluan = formState.alokasiPendahuluan;
    if (newInti < 10) {
      newInti = 10;
      newPendahuluan = total - newVal - 10;
    }
    if (newPendahuluan < 5) {
      newPendahuluan = 5;
      newInti = total - newVal - 5;
    }
    onChange('alokasiPenutup', newVal);
    onChange('alokasiInti', newInti);
    onChange('alokasiPendahuluan', newPendahuluan);
  };

  const adjustInti = (newVal: number) => {
    const total = formState.jpPerPertemuan * formState.durasiPerJp;
    const remaining = total - newVal;
    let newPendahuluan = Math.round(remaining * (formState.alokasiPendahuluan / (formState.alokasiPendahuluan + formState.alokasiPenutup || 1)));
    let newPenutup = remaining - newPendahuluan;
    if (newPendahuluan < 5) {
      newPendahuluan = 5;
      newPenutup = remaining - 5;
    }
    if (newPenutup < 5) {
      newPenutup = 5;
      newPendahuluan = remaining - 5;
    }
    onChange('alokasiInti', newVal);
    onChange('alokasiPendahuluan', newPendahuluan);
    onChange('alokasiPenutup', newPenutup);
  };

  const appendToField = (field: 'manualLkpdTugas' | 'manualSoalEvaluasi', snippet: string) => {
    const current = (formState[field] as string) || '';
    const updated = current ? current + '\n\n' + snippet : snippet;
    onChange(field, updated);
  };

  return (
    <div className="w-full lg:w-[46%] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] overflow-hidden">
      
      {/* Header with Title & Reset Action */}
      <div className="p-4 lg:px-5 lg:pt-4 lg:pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              {t.lessonPlan.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Langkah {activeStep} dari 5 &bull; {WIZARD_STEPS[activeStep - 1]?.label}
            </p>
          </div>

          {onResetForm && (
            <button
              type="button"
              onClick={onResetForm}
              className="p-1.5 lg:px-2.5 lg:py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Reset Form / Buat Draf Baru"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Interactive Clickable Step Wizard Pills */}
        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {WIZARD_STEPS.map(step => {
            const isActive = activeStep === step.id;
            const isCompleted = isStepComplete(step.id);
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`Pindah ke ${step.label}`}
              >
                <div className="flex items-center gap-1">
                  {isCompleted && !isActive ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <StepIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                  <span className="text-[11px] truncate hidden md:inline">
                    {step.label}
                  </span>
                  <span className="text-[10px] md:hidden">
                    {step.id}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content Body */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scrollbar-hide">
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Step 1: Jenis & Kurikulum */}
            {activeStep === 1 && (
              <div className="space-y-6">
                
                {/* Quick Presets Starter Bar */}
                {onApplyPreset && (
                  <div className="p-3.5 bg-gradient-to-br from-brand-50/80 to-emerald-50/80 dark:from-brand-950/40 dark:to-emerald-950/40 rounded-2xl border border-brand-200/80 dark:border-brand-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                        Preset Cepat (Muat Contoh Lengkap 1-Klik)
                      </span>
                      <span className="text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold">
                        Praktis
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {PRESET_STARTERS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onApplyPreset(preset.data)}
                          className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center transition-all hover:shadow-xs"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Langkah 1: Jenis & Pendekatan Kurikulum
                  </h3>
                  <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full">
                    Wajib
                  </span>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Metode Penyusunan</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'Manual', label: '⚡ Database (Non-AI)', desc: 'Penyusunan instan dari Bank Data & Template (Sangat Cepat & Ringan)' },
                        ...(isAiEnabled ? [{ id: 'AI', label: '✨ Generatif AI', desc: 'Disusun otomatis oleh AI (Perlu Koneksi)' }] : [])
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => onChange('generationMethod', method.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            formState.generationMethod === method.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/40 dark:border-brand-500 font-semibold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-sm">{method.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{method.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t.lessonPlan.documentType}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Modul Ajar', 'RPP'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onChange('documentType', type)}
                          className={`p-3 min-h-[44px] rounded-xl border text-sm font-bold transition-all ${
                            formState.documentType === type
                            ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/40 dark:border-brand-500'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {type === 'Modul Ajar' ? t.lessonPlan.documentTypeModulAjar : t.lessonPlan.documentTypeRpp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t.lessonPlan.curriculumApproach}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {['Merdeka', 'Berbasis Cinta', 'Hybrid'].map(approach => (
                        <button
                          key={approach}
                          type="button"
                          onClick={() => {
                            onChange('curriculumApproach', approach);
                            if (approach === 'Berbasis Cinta') {
                              onChange('isKbcIntegrated', true);
                            } else {
                              onChange('isKbcIntegrated', false);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                            formState.curriculumApproach === approach
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {approach === 'Berbasis Cinta' ? '❤️ KBC (Kemenag)' : approach}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* KBC Integrated Options */}
                  {formState.curriculumApproach === 'Berbasis Cinta' && (
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                          <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                            Integrasi Kurikulum Berbasis Cinta (KBC 2025)
                          </h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                          Panduan Kemenag
                        </span>
                      </div>

                      {/* Topik Panca Cinta Selection */}
                      <div>
                        <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
                          Topik Panca Cinta (Pilih 1-2 Topik Wajib)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topicsToDisplay.map(topic => {
                            const isSelected = formState.temaKbc.includes(topic.id);
                            return (
                              <button
                                key={topic.id}
                                type="button"
                                onClick={() => {
                                  let newTopics = [...formState.temaKbc];
                                  if (isSelected) {
                                    newTopics = newTopics.filter(id => id !== topic.id);
                                  } else {
                                    if (newTopics.length >= 2) newTopics.shift();
                                    newTopics.push(topic.id);
                                  }
                                  onChange('temaKbc', newTopics);
                                }}
                                className={`p-2.5 rounded-lg border text-left transition-all text-xs flex items-start gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-400'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  ) : (
                                    <Heart className="w-3.5 h-3.5 text-emerald-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-xs">{topic.nama_tema}</div>
                                  <div className={`text-[11px] mt-0.5 line-clamp-2 ${isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {topic.deskripsi}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Materi Insersi Preset & Custom */}
                      <div>
                        <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                          Materi Insersi Nilai Cinta (Butir Spesifik)
                        </label>
                        
                        {formState.temaKbc.length > 0 && (
                          <div className="mb-2 space-y-1">
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">
                              Preset Insersi dari Kemenag (Klik + untuk memilih otomatis):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {materiToDisplay.map((kontenText, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => onChange('materiInsersi', kontenText)}
                                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 font-medium text-left transition-colors shadow-2xs"
                                >
                                  + {kontenText}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <textarea
                          rows={2}
                          value={formState.materiInsersi}
                          onChange={(e) => onChange('materiInsersi', e.target.value)}
                          placeholder="Contoh: Meneladani Asmaul Husna Ar-Rahman dalam berinteraksi dengan sesama teman..."
                          className="w-full p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Satuan Pendidikan</label>
                    <input 
                      type="text" 
                      value={formState.satuanPendidikan}
                      onChange={(e) => onChange('satuanPendidikan', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Tahun Ajaran</label>
                        {formState.tahunAjaran === currentActiveYearName ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> TA Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onChange('tahunAjaran', currentActiveYearName)}
                            className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                            title={`Set ke Tahun Ajaran Aktif (${currentActiveYearName})`}
                          >
                            Set TA Aktif
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={formState.tahunAjaran}
                        onChange={(e) => onChange('tahunAjaran', e.target.value)}
                        placeholder={`Contoh: ${currentActiveYearName}`}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Semester</label>
                        {formState.semester === currentActiveSemName && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Aktif
                          </span>
                        )}
                      </div>
                      <select 
                        value={formState.semester}
                        onChange={(e) => onChange('semester', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Identitas Pelajaran */}
            {activeStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Langkah 2: Identitas Pembelajaran
                  </h3>
                  <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full">
                    Wajib
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.jenjang}</label>
                      <input 
                        type="text" 
                        value={formState.jenjang}
                        onChange={(e) => onChange('jenjang', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.kelas}</label>
                      <select 
                        value={formState.kelas}
                        onChange={(e) => onChange('kelas', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      >
                        {[1,2,3,4,5,6].map(k => <option key={k} value={k}>Kelas {k}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.fase}</label>
                    <input 
                      type="text" 
                      value={formState.fase} 
                      readOnly
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-600 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.mataPelajaran} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formState.mataPelajaran}
                      onChange={(e) => onChange('mataPelajaran', e.target.value)}
                      placeholder="Contoh: Matematika"
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Materi Pokok / Topik <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formState.topik}
                      onChange={(e) => onChange('topik', e.target.value)}
                      placeholder="Contoh: Operasi Penjumlahan Bilangan Cacah"
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />

                    {/* Recommendation chips */}
                    {recommendations && recommendations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-xs text-slate-400 block">Rekomendasi topik dari Bank Data:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {recommendations.map((recTopic: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onChange('topik', recTopic)}
                              className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 hover:border-brand-500 rounded-lg text-xs text-brand-700 dark:text-brand-300 text-left transition-colors"
                            >
                              + {recTopic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nama Guru / Penyusun</label>
                    <input 
                      type="text" 
                      value={formState.guru}
                      onChange={(e) => onChange('guru', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Target, Sarana & Prasyarat */}
            {activeStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Langkah 3: Target, Sarana & Prasyarat
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.targetPeserta}</label>
                    <input 
                      type="text" 
                      value={formState.targetPeserta}
                      onChange={(e) => onChange('targetPeserta', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">{t.lessonPlan.kompetensiAwal}</label>
                      <AiButton field="kompetensiAwal" label="Isi AI" {...aiProps} />
                    </div>
                    <textarea 
                      value={formState.kompetensiAwal}
                      onChange={(e) => onChange('kompetensiAwal', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="Pengetahuan/keterampilan prasyarat yang perlu dimiliki siswa."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.saranaPrasarana}</label>
                    <textarea
                      value={formState.saranaPrasarana}
                      onChange={(e) => onChange('saranaPrasarana', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="Alat, bahan, media pembelajaran (Proyektor, LKPD, alat peraga konkret, dll)."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Komponen Inti & LKPD */}
            {activeStep === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Langkah 4: Komponen Inti, LKPD & Evaluasi
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-wrap justify-between items-end mb-1.5 gap-1.5">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">{t.lessonPlan.cp}</label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={onGenerateCP}
                          disabled={isGeneratingCP || !formState.mataPelajaran}
                          className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isGeneratingCP ? t.lessonPlan.cpSearching : t.lessonPlan.cpLookup}
                        </button>
                        <AiButton field="capaianPembelajaran" label="Generate AI" {...aiProps} />
                      </div>
                    </div>
                    <textarea 
                      value={formState.capaianPembelajaran}
                      onChange={(e) => onChange('capaianPembelajaran', e.target.value)}
                      rows={4}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="Capaian Pembelajaran dari Kurikulum Merdeka..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">{t.lessonPlan.profilPancasila}</label>
                    <div className="flex flex-wrap gap-2">
                      {PROFIL_OPTIONS.map(profil => (
                        <button
                          key={profil}
                          type="button"
                          onClick={() => onProfilToggle(profil)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            formState.profilPelajar.includes(profil)
                            ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/60 dark:text-amber-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {profil}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formState.generationMethod === 'Manual' && (
                    <>
                      <div>
                        <div className="flex flex-wrap justify-between items-end mb-1">
                          <label className="block text-xs text-slate-500 dark:text-slate-400">{t.lessonPlan.tujuanPembelajaran}</label>
                          <AiButton field="manualTujuanPembelajaran" label="Isi AI" {...aiProps} />
                        </div>
                        <textarea
                          value={formState.manualTujuanPembelajaran}
                          onChange={(e) => onChange('manualTujuanPembelajaran', e.target.value)}
                          rows={3}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Contoh:&#10;1. Siswa dapat memahami perkalian dasar.&#10;2. Siswa dapat menjawab soal cerita perkalian."
                        />

                        {/* Ennis Critical Thinking IKTP Bank */}
                        <div className="mt-2.5 p-3 bg-brand-50/70 dark:bg-brand-950/30 rounded-xl border border-brand-200 dark:border-brand-800/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                              Bank Indikator Berpikir Kritis (Klik + untuk isi):
                            </span>
                            <span className="text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded font-bold">
                              HOTS Ennis
                            </span>
                          </div>
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                            {ENNIS_IKTP_BANK.map((cat, catIdx) => (
                              <div key={catIdx} className="space-y-1">
                                <span className="text-[11px] font-bold text-brand-800 dark:text-brand-300 block">
                                  &bull; {cat.kategori}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {cat.contohIktp.map((iktp, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const current = formState.manualTujuanPembelajaran ? formState.manualTujuanPembelajaran + '\n' : '';
                                        onChange('manualTujuanPembelajaran', current + iktp);
                                      }}
                                      className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 hover:border-brand-500 rounded text-[11px] text-brand-900 dark:text-brand-200 text-left transition-colors font-medium"
                                    >
                                      + {iktp}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap justify-between items-end mb-1">
                          <label className="block text-xs text-slate-500 dark:text-slate-400">{t.lessonPlan.pertanyaanPemantik}</label>
                          <AiButton field="manualPertanyaanPemantik" label="Isi AI" {...aiProps} />
                        </div>
                        <textarea
                          value={formState.manualPertanyaanPemantik}
                          onChange={(e) => onChange('manualPertanyaanPemantik', e.target.value)}
                          rows={3}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Contoh:&#10;Mengapa kita perlu mempelajari topik ini?&#10;Bagaimana penerapannya dalam kehidupan sehari-hari?"
                        />
                      </div>

                      {/* Manual LKPD & Tugas with Quick Insert Bar */}
                      <div>
                        <div className="flex flex-wrap justify-between items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Lembar Kerja Peserta Didik (LKPD)
                          </label>
                          <AiButton field="manualLkpdTugas" label="Buat AI" {...aiProps} />
                        </div>

                        {/* Quick Insert Formatting Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          <button
                            type="button"
                            onClick={() => appendToField('manualLkpdTugas', '[Kotak untuk Menuliskan Jawaban / Menggambar Hasil]')}
                            className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] font-medium hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> [Kotak Jawaban]
                          </button>
                          <button
                            type="button"
                            onClick={() => appendToField('manualLkpdTugas', '### Aktivitas 1: Eksplorasi Bersama\nLakukan pengamatan dan diskusikan bersama kelompokmu.')}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-medium hover:bg-slate-200 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Judul Aktivitas
                          </button>
                          <button
                            type="button"
                            onClick={() => appendToField('manualLkpdTugas', '* Petunjuk:\n1. Bacalah petunjuk pengerjaan.\n2. Selesaikan secara berkelompok.')}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-medium hover:bg-slate-200 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Petunjuk Belajar
                          </button>
                        </div>

                        <textarea
                          value={formState.manualLkpdTugas}
                          onChange={(e) => onChange('manualLkpdTugas', e.target.value)}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Tuliskan petunjuk dan aktivitas kerja siswa..."
                        />
                      </div>

                      {/* Manual Soal Evaluasi with Quick Insert Bar */}
                      <div>
                        <div className="flex flex-wrap justify-between items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Lembar Soal Evaluasi Pengetahuan
                          </label>
                          <AiButton field="manualSoalEvaluasi" label="Buat AI" {...aiProps} />
                        </div>

                        {/* Quick Insert Formatting Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          <button
                            type="button"
                            onClick={() => appendToField('manualSoalEvaluasi', '1. Pertanyaan pilihan ganda nomor 1...\nA. Pilihan A\nB. Pilihan B\nC. Pilihan C\nD. Pilihan D')}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded text-[11px] font-medium hover:bg-blue-100 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Format Pilihan Ganda (A-D)
                          </button>
                          <button
                            type="button"
                            onClick={() => appendToField('manualSoalEvaluasi', '2. Jelaskan dan tuliskan kesimpulan dari materi yang telah dipelajari!')}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-medium hover:bg-slate-200 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Format Uraian / Isian
                          </button>
                        </div>

                        <textarea
                          value={formState.manualSoalEvaluasi}
                          onChange={(e) => onChange('manualSoalEvaluasi', e.target.value)}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Tuliskan butir soal evaluasi pemahaman konsep..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Alokasi Waktu, Model & Rubrik */}
            {activeStep === 5 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Langkah 5: Model Pembelajaran, Waktu & Rubrik
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.pertemuan}</label>
                      <input 
                        type="number" 
                        value={formState.jumlahPertemuan}
                        onChange={(e) => onChange('jumlahPertemuan', parseInt(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.jpPerTemu}</label>
                      <input 
                        type="number" 
                        value={formState.jpPerPertemuan}
                        onChange={(e) => onChange('jpPerPertemuan', parseInt(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.lessonPlan.durasi}</label>
                      <input 
                        type="number" 
                        value={formState.durasiPerJp}
                        onChange={(e) => onChange('durasiPerJp', parseInt(e.target.value) || 35)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Pilihan Ukuran Kertas Cetak & Dokumen */}
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                      Ukuran Kertas Cetak & Dokumen Word
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'A4', label: '📄 A4 (210 × 297 mm)', desc: 'Standar Nasional & Printer Biasa' },
                        { id: 'F4', label: '📑 F4 / Folio (215 × 330 mm)', desc: 'Standar Arsip Sekolah Indonesia' }
                      ].map(paper => (
                        <button
                          key={paper.id}
                          type="button"
                          onClick={() => onChange('paperSize', paper.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            (formState.paperSize || 'A4') === paper.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-300 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{paper.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{paper.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pendekatan Pembelajaran */}
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Pendekatan Pembelajaran</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Student Centered', label: 'Student Centered', desc: 'Berpusat pada keaktifan siswa' },
                        { id: 'Teacher Centered', label: 'Teacher Centered', desc: 'Berpusat pada pengarahan guru' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onChange('pendekatanPembelajaran', p.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            (formState.pendekatanPembelajaran || 'Student Centered') === p.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-300'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{p.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categorized Model Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Model Pembelajaran & Sintaksis Wajib
                      </label>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded">
                        Katalog Modern
                      </span>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
                      {[
                        { id: 'hots', label: '🔥 HOTS', count: LEARNING_MODELS.filter(m => m.kategori === 'hots').length },
                        { id: 'retensi', label: '💡 Retensi', count: LEARNING_MODELS.filter(m => m.kategori === 'retensi').length },
                        { id: 'sosial', label: '👥 Kooperatif', count: LEARNING_MODELS.filter(m => m.kategori === 'sosial').length },
                        { id: 'kbc', label: '❤️ KBC/Karakter', count: LEARNING_MODELS.filter(m => m.kategori === 'kbc').length },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveCategoryTab(tab.id as ModelCategory)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                            activeCategoryTab === tab.id
                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Models Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {LEARNING_MODELS.filter(m => m.kategori === activeCategoryTab).map(model => {
                        const isSelected = formState.selectedModelId === model.id || formState.modelPembelajaran === model.nama;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              onChange('selectedModelId', model.id);
                              onChange('modelPembelajaran', model.nama);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                              isSelected
                              ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-400'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs">{model.nama}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                            </div>
                            <div className={`text-[10px] font-medium mb-2 ${isSelected ? 'text-brand-100' : 'text-brand-600 dark:text-brand-400'}`}>
                              {model.fokus}
                            </div>
                            <div className={`text-[10px] line-clamp-2 ${isSelected ? 'text-brand-200' : 'text-slate-400 dark:text-slate-500'}`}>
                              Sintaks: {model.sintaks.map(s => s.langkah.split(':')[0]).join(' → ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Selected Model Details Card */}
                    {(() => {
                      const selectedModelObj = LEARNING_MODELS.find(m => m.id === formState.selectedModelId || m.nama === formState.modelPembelajaran);
                      if (!selectedModelObj) return null;
                      return (
                        <div className="p-3.5 bg-brand-50/60 dark:bg-brand-950/30 rounded-xl border border-brand-200 dark:border-brand-800/50 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-brand-200/60 dark:border-brand-800/40 pb-2">
                            <span className="font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                              Sintaksis Wajib: {selectedModelObj.nama} ({selectedModelObj.sumber})
                            </span>
                          </div>
                          
                          <div className="space-y-1 pl-1">
                            {selectedModelObj.sintaks.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[11px]">
                                <span className="font-bold text-brand-700 dark:text-brand-300 shrink-0">{idx + 1}.</span>
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{step.langkah}</span>
                                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{step.deskripsi}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-200/60 dark:border-brand-800/40 text-[10px]">
                            <div>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">✓ Kelebihan:</span>
                              <ul className="list-disc pl-3 space-y-0.5 text-slate-600 dark:text-slate-400">
                                {selectedModelObj.kelebihan.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">⚠️ Risiko / Tantangan:</span>
                              <ul className="list-disc pl-3 space-y-0.5 text-slate-600 dark:text-slate-400">
                                {selectedModelObj.kekurangan.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Metode Pembelajaran */}
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{t.lessonPlan.metodePembelajaran}</label>
                    <div className="flex flex-wrap gap-2">
                      {METODE_OPTIONS.map(metode => (
                        <button
                          key={metode}
                          type="button"
                          onClick={() => onMetodeToggle(metode)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            formState.metodePembelajaran.includes(metode)
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700/60 dark:text-emerald-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {metode}
                        </button>
                      ))}
                    </div>

                    {/* Verbalism Warning Banner */}
                    {formState.metodePembelajaran.length === 1 && formState.metodePembelajaran[0] === 'Ceramah' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold mb-0.5">Saran Pedagogis: Risiko Verbalisme</div>
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                            Metode <strong>Ceramah</strong> secara tunggal berisiko tinggi membuat siswa menghafal tanpa memahami makna secara konkrit. Disarankan menambah metode pendamping seperti <strong>Diskusi</strong>, <strong>Tanya Jawab</strong>, atau <strong>Demonstrasi</strong>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Smart Time Calculator & Visual Time Allocator Card */}
                  {(() => {
                    const totalMeetingMinutes = (formState.jpPerPertemuan || 2) * (formState.durasiPerJp || 35);
                    const currentAllocatedSum = (formState.alokasiPendahuluan || 0) + (formState.alokasiInti || 0) + (formState.alokasiPenutup || 0);
                    const isTimeBalanced = currentAllocatedSum === totalMeetingMinutes;

                    const pctPendahuluan = Math.round(((formState.alokasiPendahuluan || 0) / (totalMeetingMinutes || 1)) * 100);
                    const pctInti = Math.round(((formState.alokasiInti || 0) / (totalMeetingMinutes || 1)) * 100);
                    const pctPenutup = Math.round(((formState.alokasiPenutup || 0) / (totalMeetingMinutes || 1)) * 100);

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-brand-600" />
                              Kalkulator Alokasi Waktu Pembelajaran
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formState.jpPerPertemuan} JP × {formState.durasiPerJp} Menit = <strong>{totalMeetingMinutes} Menit / Pertemuan</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isTimeBalanced ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Pas 100% ({totalMeetingMinutes}m)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Selisih {Math.abs(totalMeetingMinutes - currentAllocatedSum)}m ({currentAllocatedSum > totalMeetingMinutes ? 'Kelebihan' : 'Kekurangan'})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Segmented Visual Timeline Bar */}
                        <div className="space-y-1">
                          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${Math.min(100, pctPendahuluan)}%` }} 
                              className="bg-emerald-500 transition-all duration-300"
                              title={`Pendahuluan: ${formState.alokasiPendahuluan}m (${pctPendahuluan}%)`}
                            />
                            <div 
                              style={{ width: `${Math.min(100, pctInti)}%` }} 
                              className="bg-brand-500 transition-all duration-300"
                              title={`Inti: ${formState.alokasiInti}m (${pctInti}%)`}
                            />
                            <div 
                              style={{ width: `${Math.min(100, pctPenutup)}%` }} 
                              className="bg-amber-500 transition-all duration-300"
                              title={`Penutup: ${formState.alokasiPenutup}m (${pctPenutup}%)`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400">● Pendahuluan ({pctPendahuluan}%)</span>
                            <span className="text-brand-700 dark:text-brand-400">● Inti ({pctInti}%)</span>
                            <span className="text-amber-700 dark:text-amber-400">● Penutup ({pctPenutup}%)</span>
                          </div>
                        </div>

                        {/* Auto-Distribute Proporsional Button */}
                        {autoDistributeTime && (
                          <button
                            type="button"
                            onClick={autoDistributeTime}
                            className="w-full py-2 px-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800/80 rounded-lg text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5 text-brand-600" />
                            ⚡ Auto-Distribusi Proporsional Standar (15% - 70% - 15%)
                          </button>
                        )}
                        
                        {/* Sliders */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                              <span className="font-semibold">1. Kegiatan Pendahuluan</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">{formState.alokasiPendahuluan} Menit</span>
                            </div>
                            <input 
                              type="range"
                              min={5}
                              max={Math.max(5, totalMeetingMinutes - 20)}
                              step={5}
                              value={formState.alokasiPendahuluan}
                              onChange={(e) => adjustPendahuluan(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                              <span className="font-semibold">2. Kegiatan Inti</span>
                              <span className="font-bold text-brand-700 dark:text-brand-400">{formState.alokasiInti} Menit</span>
                            </div>
                            <input 
                              type="range"
                              min={10}
                              max={Math.max(10, totalMeetingMinutes - 10)}
                              step={5}
                              value={formState.alokasiInti}
                              onChange={(e) => adjustInti(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                              <span className="font-semibold">3. Kegiatan Penutup</span>
                              <span className="font-bold text-amber-700 dark:text-amber-400">{formState.alokasiPenutup} Menit</span>
                            </div>
                            <input 
                              type="range"
                              min={5}
                              max={Math.max(5, totalMeetingMinutes - 20)}
                              step={5}
                              value={formState.alokasiPenutup}
                              onChange={(e) => adjustPenutup(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Rubrik Asesmen Interaktif */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.lessonPlan.rubricAsesmen}</h4>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikDiskusi)}
                          className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                        >
                          {t.lessonPlan.rubricDiskusi}
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikPresentasi)}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                        >
                          {t.lessonPlan.rubricPresentasi}
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikSikap)}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                        >
                          {t.lessonPlan.rubricSikap}
                        </button>
                      </div>
                    </div>

                    {formState.rubrikAsesmen && formState.rubrikAsesmen.length > 0 ? (
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {formState.rubrikAsesmen.map((row: RubrikRow, idx: number) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 relative space-y-2.5">
                            <div className="flex justify-between items-center">
                              <input
                                type="text"
                                value={row.kriteria}
                                onChange={(e) => {
                                  const updated = [...formState.rubrikAsesmen];
                                  updated[idx] = { ...updated[idx], kriteria: e.target.value };
                                  onChange('rubrikAsesmen', updated);
                                }}
                                placeholder="Nama Kriteria..."
                                className="w-full mr-2 p-1 font-bold text-xs border-b border-slate-200 dark:border-slate-700 dark:bg-transparent dark:text-white outline-none focus:border-brand-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formState.rubrikAsesmen.filter((_, i) => i !== idx);
                                  onChange('rubrikAsesmen', updated);
                                }}
                                className="text-red-500 hover:text-red-700 text-xs px-1"
                              >
                                &times;
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block font-semibold">{t.lessonPlan.rubricSangatBaik}</label>
                                <textarea
                                  value={row.sangatBaik}
                                  onChange={(e) => {
                                    const updated = [...formState.rubrikAsesmen];
                                    updated[idx] = { ...updated[idx], sangatBaik: e.target.value };
                                    onChange('rubrikAsesmen', updated);
                                  }}
                                  className="w-full p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-[10px] text-slate-700 dark:text-slate-300"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block font-semibold">{t.lessonPlan.rubricBaik}</label>
                                <textarea
                                  value={row.baik}
                                  onChange={(e) => {
                                    const updated = [...formState.rubrikAsesmen];
                                    updated[idx] = { ...updated[idx], baik: e.target.value };
                                    onChange('rubrikAsesmen', updated);
                                  }}
                                  className="w-full p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-[10px] text-slate-700 dark:text-slate-300"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block font-semibold">{t.lessonPlan.rubricCukup}</label>
                                <textarea
                                  value={row.cukup}
                                  onChange={(e) => {
                                    const updated = [...formState.rubrikAsesmen];
                                    updated[idx] = { ...updated[idx], cukup: e.target.value };
                                    onChange('rubrikAsesmen', updated);
                                  }}
                                  className="w-full p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-[10px] text-slate-700 dark:text-slate-300"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block font-semibold">{t.lessonPlan.rubricPerluBimbingan}</label>
                                <textarea
                                  value={row.perluBimbingan}
                                  onChange={(e) => {
                                    const updated = [...formState.rubrikAsesmen];
                                    updated[idx] = { ...updated[idx], perluBimbingan: e.target.value };
                                    onChange('rubrikAsesmen', updated);
                                  }}
                                  className="w-full p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-[10px] text-slate-700 dark:text-slate-300"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-600 text-xs">
                        {t.lessonPlan.rubricEmpty}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const newRow: RubrikRow = { kriteria: '', sangatBaik: '', baik: '', cukup: '', perluBimbingan: '' };
                        onChange('rubrikAsesmen', [...(formState.rubrikAsesmen || []), newRow]);
                      }}
                      className="w-full py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-700 dark:text-brand-400 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      {t.lessonPlan.rubricAddCustom}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </MotionDiv>
        </AnimatePresence>
      </div>

      {/* Wizard Footer Controls */}
      <div className="p-3.5 lg:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3 shrink-0">
        {activeStep > 1 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev - 1)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">{t.lessonPlan.previous}</span>
            <span className="xs:hidden">Prev</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] text-slate-400 hidden sm:block">
          Langkah {activeStep} dari 5
        </div>

        {activeStep < 5 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev + 1)}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-brand-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{t.lessonPlan.next}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={queueStatus === 'pending' || queueStatus === 'processing' || isAiGenerating || !formState.mataPelajaran || !formState.topik}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md transition-all text-xs sm:text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.lessonPlan.create.replace('{type}', formState.documentType)}</span>
          </button>
        )}
      </div>
    </div>
  );
};
