import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, Heart, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';
import { FormState, RubrikRow } from '../types';
import { useTopikRecommendations, useRubrikTemplates, useTemaKbc, useMateriInsersiMulti, useLearningModels } from '../hooks/useModulAjarQueries';
import { PANCA_CINTA_TOPICS_FALLBACK, MATERI_INSERSI_FALLBACK } from '../constants/kbcConstants';
import { LEARNING_MODELS, ENNIS_IKTP_BANK, ModelCategory } from '../constants/learningModels';

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
}

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
  isAiGenerating
}) => {
  const isAiEnabled = import.meta.env.VITE_ENABLE_AI_MODUL_AJAR === 'true';

  const AiButton = ({ field, label }: { field: string; label?: string }) => {
    if (!onAiFillField) return null;
    const loading = fieldLoading[field];
    return (
      <button
        type="button"
        onClick={() => onAiFillField(field)}
        disabled={loading}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {label || (loading ? 'Memproses...' : 'AI')}
      </button>
    );
  };

  const [activeCategoryTab, setActiveCategoryTab] = React.useState<ModelCategory>('hots');
  const PROFIL_OPTIONS = ['Beriman & Bertakwa', 'Berkebinekaan Global', 'Bergotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
  const METODE_OPTIONS = ['Ceramah', 'Diskusi', 'Tanya Jawab', 'Demonstrasi', 'Eksperimen', 'Proyek', 'Role Playing', 'Penugasan'];

  const { data: recommendations = [] } = useTopikRecommendations(formState.mataPelajaran);
  const { data: rubrikDiskusi = [] } = useRubrikTemplates('diskusi');
  const { data: rubrikPresentasi = [] } = useRubrikTemplates('presentasi');
  const { data: rubrikSikap = [] } = useRubrikTemplates('sikap');
  
  const { data: dbModels = [] } = useLearningModels();
  const { data: temaKbcData = [] } = useTemaKbc();
  const { data: materiInsersiData = [] } = useMateriInsersiMulti(formState.temaKbc);

  const topicsToDisplay = temaKbcData.length > 0 ? temaKbcData : PANCA_CINTA_TOPICS_FALLBACK;
  const materiToDisplay = materiInsersiData.length > 0 
    ? materiInsersiData.map(m => m.konten)
    : formState.temaKbc.flatMap(id => MATERI_INSERSI_FALLBACK[id] || []);

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

  return (
    <div className="w-full lg:w-[45%] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] overflow-hidden">
      <div className="p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Modul Ajar Creator
        </h1>
        <p className="text-sm text-slate-500 mt-1">Langkah {activeStep} dari 5: Lengkapi form untuk menyusun dokumen.</p>
        
        {/* Progress Bar / Step Pills */}
        <div className="flex gap-1.5 mt-4">
          {[1,2,3,4,5].map(step => (
            <div 
              key={step} 
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                step <= activeStep ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
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
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-wide border-b pb-2 border-slate-100 dark:border-slate-800">
                  1. JENIS DOKUMEN & KURIKULUM
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Metode Penyusunan</label>
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
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500 font-semibold shadow-sm'
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
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jenis Dokumen</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Modul Ajar', 'RPP'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onChange('documentType', type)}
                          className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                            formState.documentType === type
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pendekatan Kurikulum</label>
                    <div className="grid grid-cols-3 gap-2.5">
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
                                    if (newTopics.length >= 2) newTopics.shift(); // Max 2 topics
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
                        
                        {/* Preset Suggestions */}
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
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Tahun Ajaran</label>
                      <input 
                        type="text" 
                        value={formState.tahunAjaran}
                        onChange={(e) => onChange('tahunAjaran', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Semester</label>
                      <select 
                        value={formState.semester}
                        onChange={(e) => onChange('semester', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
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
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">2. Identitas Pelajaran</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Jenjang</label>
                      <input 
                        type="text" 
                        value={formState.jenjang}
                        onChange={(e) => onChange('jenjang', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kelas</label>
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
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Fase</label>
                    <input 
                      type="text" 
                      value={formState.fase} 
                      readOnly
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formState.mataPelajaran}
                      onChange={(e) => onChange('mataPelajaran', e.target.value)}
                      placeholder="Contoh: Matematika"
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Topik / Materi Pokok <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formState.topik}
                      onChange={(e) => onChange('topik', e.target.value)}
                      placeholder="Contoh: Penjumlahan Bilangan Cacah"
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {recommendations.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block w-full font-medium">Saran Topik:</span>
                        {recommendations.map(rec => (
                          <button
                            key={rec}
                            type="button"
                            onClick={() => onChange('topik', rec)}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    )}

                    {boilerplateMissingBanner && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>{boilerplateMissingBanner}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Informasi Umum & Sarpras */}
            {activeStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">3. Informasi Umum & Sarana</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Target Peserta Didik</label>
                    <select 
                      value={formState.targetPeserta}
                      onChange={(e) => onChange('targetPeserta', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)">Reguler/Tipikal</option>
                      <option value="Peserta Didik dengan Kesulitan Belajar (Memiliki gaya belajar terbatas, misal: visual/audio)">Siswa Kesulitan Belajar</option>
                      <option value="Peserta Didik Cerdas Istimewa/Bakat Istimewa (CIBI) (Dapat mencerna materi dengan cepat)">Cerdas Istimewa (CIBI)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">Kompetensi Awal (Prasyarat)</label>
                      <AiButton field="kompetensiAwal" label="Isi AI" />
                    </div>
                    <textarea
                      value={formState.kompetensiAwal}
                      onChange={(e) => onChange('kompetensiAwal', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Pengetahuan/keterampilan yang wajib dimiliki siswa sebelum mempelajari materi ini."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Sarana, Prasarana & Media</label>
                    <textarea
                      value={formState.saranaPrasarana}
                      onChange={(e) => onChange('saranaPrasarana', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Alat, bahan, media pembelajaran (Proyektor, LKPD, alat peraga, dll)."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Komponen Inti */}
            {activeStep === 4 && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">4. Capaian & Profil Pancasila</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">Capaian Pembelajaran (CP)</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={onGenerateCP}
                          disabled={isGeneratingCP || !formState.mataPelajaran}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isGeneratingCP ? 'Mencari...' : 'Ambil CP Database'}
                        </button>
                        <AiButton field="capaianPembelajaran" label="Generate AI" />
                      </div>
                    </div>
                    <textarea 
                      value={formState.capaianPembelajaran}
                      onChange={(e) => onChange('capaianPembelajaran', e.target.value)}
                      rows={5}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Capaian Pembelajaran dari Kurikulum."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Profil Pelajar Pancasila</label>
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
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-xs text-slate-500 dark:text-slate-400">Tujuan Pembelajaran (Satu per baris)</label>
                          <AiButton field="manualTujuanPembelajaran" label="Isi AI" />
                        </div>
                        <textarea
                          value={formState.manualTujuanPembelajaran}
                          onChange={(e) => onChange('manualTujuanPembelajaran', e.target.value)}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Contoh:&#10;1. Siswa dapat memahami perkalian dasar.&#10;2. Siswa dapat menjawab soal cerita perkalian."
                        />

                        {/* Ennis Critical Thinking IKTP Bank */}
                        <div className="mt-2.5 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              💡 Bank Rekomendasi Indikator Berpikir Kritis (Klik + untuk isi otomatis)
                            </span>
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                              HOTS
                            </span>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                            {ENNIS_IKTP_BANK.map((cat, catIdx) => (
                              <div key={catIdx} className="space-y-1.5">
                                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">
                                  • {cat.kategori}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.contohIktp.map((iktp, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const current = formState.manualTujuanPembelajaran ? formState.manualTujuanPembelajaran + '\n' : '';
                                        onChange('manualTujuanPembelajaran', current + iktp);
                                      }}
                                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 rounded-lg text-xs text-indigo-900 dark:text-indigo-200 text-left transition-colors font-medium shadow-2xs"
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
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-xs text-slate-500 dark:text-slate-400">Pertanyaan Pemantik (Satu per baris)</label>
                          <AiButton field="manualPertanyaanPemantik" label="Isi AI" />
                        </div>
                        <textarea
                          value={formState.manualPertanyaanPemantik}
                          onChange={(e) => onChange('manualPertanyaanPemantik', e.target.value)}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Contoh:&#10;Mengapa kita perlu mempelajari perkalian?&#10;Bagaimana perkalian mempermudah hitungan kita?"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Alokasi & Model */}
            {activeStep === 5 && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">5. Alokasi Waktu & Model</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Pertemuan</label>
                      <input 
                        type="number" 
                        value={formState.jumlahPertemuan}
                        onChange={(e) => onChange('jumlahPertemuan', parseInt(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">JP / Pertemuan</label>
                      <input 
                        type="number" 
                        value={formState.jpPerPertemuan}
                        onChange={(e) => onChange('jpPerPertemuan', parseInt(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Durasi (Menit)</label>
                      <input 
                        type="number" 
                        value={formState.durasiPerJp}
                        onChange={(e) => onChange('durasiPerJp', parseInt(e.target.value) || 35)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
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
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-300'
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
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
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
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
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
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs">{model.nama}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                            </div>
                            <div className={`text-[10px] font-medium mb-2 ${isSelected ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {model.fokus}
                            </div>
                            <div className={`text-[9px] line-clamp-2 ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
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
                        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/40 pb-2">
                            <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              Sintaksis Wajib: {selectedModelObj.nama} ({selectedModelObj.sumber})
                            </span>
                          </div>
                          
                          <div className="space-y-1 pl-1">
                            {selectedModelObj.sintaks.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[11px]">
                                <span className="font-bold text-indigo-700 dark:text-indigo-300 shrink-0">{idx + 1}.</span>
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{step.langkah}</span>
                                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{step.deskripsi}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-[10px]">
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
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Metode Pembelajaran (Pelengkap)</label>
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

                  {/* Visual Time Allocator Slider */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Visual Alokasi Waktu (${formState.jpPerPertemuan * formState.durasiPerJp} Menit)</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Balancing Aktif</span>
                    </div>
                    
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>1. Pendahuluan</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{formState.alokasiPendahuluan} Menit</span>
                        </div>
                        <input 
                          type="range"
                          min={5}
                          max={Math.max(5, formState.jpPerPertemuan * formState.durasiPerJp - 20)}
                          value={formState.alokasiPendahuluan}
                          onChange={(e) => adjustPendahuluan(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>2. Kegiatan Inti</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{formState.alokasiInti} Menit</span>
                        </div>
                        <input 
                          type="range"
                          min={10}
                          max={Math.max(10, formState.jpPerPertemuan * formState.durasiPerJp - 10)}
                          value={formState.alokasiInti}
                          onChange={(e) => adjustInti(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>3. Penutup</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{formState.alokasiPenutup} Menit</span>
                        </div>
                        <input 
                          type="range"
                          min={5}
                          max={Math.max(5, formState.jpPerPertemuan * formState.durasiPerJp - 20)}
                          value={formState.alokasiPenutup}
                          onChange={(e) => adjustPenutup(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rubrik Asesmen Interaktif */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Rubrik Asesmen Interaktif</h4>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikDiskusi)}
                          className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-[9px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors animate-pulse"
                        >
                          + Diskusi
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikPresentasi)}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded text-[9px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                        >
                          + Presentasi
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange('rubrikAsesmen', rubrikSikap)}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                        >
                          + Sikap
                        </button>
                      </div>
                    </div>

                    {formState.rubrikAsesmen && formState.rubrikAsesmen.length > 0 ? (
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {formState.rubrikAsesmen.map((row: RubrikRow, idx: number) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 relative space-y-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formState.rubrikAsesmen];
                                updated.splice(idx, 1);
                                onChange('rubrikAsesmen', updated);
                              }}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-[10px] font-bold"
                            >
                              Hapus
                            </button>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Kriteria Penilaian</label>
                              <input
                                type="text"
                                value={row.kriteria}
                                onChange={(e) => {
                                  const updated = [...formState.rubrikAsesmen];
                                  updated[idx] = { ...updated[idx], kriteria: e.target.value };
                                  onChange('rubrikAsesmen', updated);
                                }}
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                                placeholder="Misal: Keaktifan Diskusi"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] text-slate-400 block font-semibold">Sangat Baik (4)</label>
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
                                <label className="text-[8px] text-slate-400 block font-semibold">Baik (3)</label>
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
                                <label className="text-[8px] text-slate-400 block font-semibold">Cukup (2)</label>
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
                                <label className="text-[8px] text-slate-400 block font-semibold">Perlu Bimbingan (1)</label>
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
                        Belum ada rubrik penilaian. Klik salah satu templat di atas untuk menambahkan.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const newRow: RubrikRow = { kriteria: '', sangatBaik: '', baik: '', cukup: '', perluBimbingan: '' };
                        onChange('rubrikAsesmen', [...(formState.rubrikAsesmen || []), newRow]);
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      + Tambah Kriteria Kustom
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">Tugas LKPD (Lembar Kerja Peserta Didik)</label>
                      <AiButton field="manualLkpdTugas" label="Buat AI" />
                    </div>
                    <textarea
                      value={formState.manualLkpdTugas}
                      onChange={(e) => onChange('manualLkpdTugas', e.target.value)}
                      rows={4}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Masukkan tugas/kegiatan kelompok atau mandiri..."
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400">Soal Evaluasi Pengetahuan</label>
                      <AiButton field="manualSoalEvaluasi" label="Buat AI" />
                    </div>
                    <textarea
                      value={formState.manualSoalEvaluasi}
                      onChange={(e) => onChange('manualSoalEvaluasi', e.target.value)}
                      rows={4}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Masukkan butir-butir pertanyaan evaluasi..."
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Wizard Footer Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between gap-3 shrink-0">
        {activeStep > 1 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev - 1)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>
        ) : (
          <div />
        )}

        {activeStep < 5 ? (
          <button
            type="button"
            onClick={() => setActiveStep(prev => prev + 1)}
            className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 flex items-center gap-1.5"
          >
            Selanjutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={queueStatus === 'pending' || queueStatus === 'processing' || isAiGenerating || !formState.mataPelajaran || !formState.topik}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            ✨ Buat {formState.documentType}
          </button>
        )}
      </div>
    </div>
  );
};
