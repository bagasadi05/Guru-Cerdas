import React from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  Zap
} from 'lucide-react';
import { FormState, RubrikRow } from '../../types';
import { LEARNING_MODELS, ModelCategory } from '../../constants/learningModels';
import { AiButton } from '../AiButton';
import { RefRubrikTemplate } from '../../../../../services/modulAjarContentService';

interface Step5ModelWaktuProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onMetodeToggle: (metode: string) => void;
  METODE_OPTIONS: string[];
  t: any;
  aiProps: {
    onAiFillField?: (field: string) => void;
    fieldLoading?: Record<string, boolean>;
  };
  autoDistributeTime?: () => void;
  rubrikDiskusi: RefRubrikTemplate[];
  rubrikPresentasi: RefRubrikTemplate[];
  rubrikSikap: RefRubrikTemplate[];
  adjustPendahuluan: (newVal: number) => void;
  adjustInti: (newVal: number) => void;
  adjustPenutup: (newVal: number) => void;
}

export const Step5ModelWaktu: React.FC<Step5ModelWaktuProps> = ({
  formState,
  onChange,
  onMetodeToggle,
  METODE_OPTIONS,
  t,
  aiProps,
  autoDistributeTime,
  rubrikDiskusi,
  rubrikPresentasi,
  rubrikSikap,
  adjustPendahuluan,
  adjustInti,
  adjustPenutup,
}) => {
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<ModelCategory>('hots');

  const totalMeetingMinutes = (formState.jpPerPertemuan || 2) * (formState.durasiPerJp || 35);
  const currentAllocatedSum = (formState.alokasiPendahuluan || 0) + (formState.alokasiInti || 0) + (formState.alokasiPenutup || 0);
  const isTimeBalanced = currentAllocatedSum === totalMeetingMinutes;

  const pctPendahuluan = Math.round(((formState.alokasiPendahuluan || 0) / (totalMeetingMinutes || 1)) * 100);
  const pctInti = Math.round(((formState.alokasiInti || 0) / (totalMeetingMinutes || 1)) * 100);
  const pctPenutup = Math.round(((formState.alokasiPenutup || 0) / (totalMeetingMinutes || 1)) * 100);

  const selectedModelObj = LEARNING_MODELS.find(
    m => m.id === formState.selectedModelId || m.nama === formState.modelPembelajaran
  );

  const handleSelectRubrik = (templates: RefRubrikTemplate[]) => {
    const mapped: RubrikRow[] = templates.map(tmpl => ({
      kriteria: tmpl.kriteria,
      sangatBaik: (tmpl as any).sangatBaik || tmpl.sangat_baik || '',
      baik: tmpl.baik || '',
      cukup: tmpl.cukup || '',
      perluBimbingan: (tmpl as any).perluBimbingan || tmpl.perlu_bimbingan || '',
    }));
    onChange('rubrikAsesmen', mapped);
  };

  return (
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
          {selectedModelObj && (
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
          )}
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

        {/* Rubrik Asesmen Interaktif */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.lessonPlan.rubricAsesmen}</h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleSelectRubrik(rubrikDiskusi)}
                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
              >
                {t.lessonPlan.rubricDiskusi}
              </button>
              <button
                type="button"
                onClick={() => handleSelectRubrik(rubrikPresentasi)}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
              >
                {t.lessonPlan.rubricPresentasi}
              </button>
              <button
                type="button"
                onClick={() => handleSelectRubrik(rubrikSikap)}
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

        {/* Lampiran & Referensi Belajar: Glosarium & Daftar Pustaka */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Lampiran & Sumber Referensi
            </h4>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full">
              Standar Kemendikbud & Kemenag
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex flex-wrap justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  📖 Glosarium (Istilah Kunci)
                </label>
                <AiButton field="manualGlosarium" label="Isi AI" {...aiProps} />
              </div>
              <textarea
                value={formState.manualGlosarium || ''}
                onChange={(e) => onChange('manualGlosarium', e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-800 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Istilah 1: Penjelasan istilah...&#10;Istilah 2: Penjelasan istilah..."
              />
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  📚 Daftar Pustaka Resmi
                </label>
                <AiButton field="manualDaftarPustaka" label="Isi AI" {...aiProps} />
              </div>
              <textarea
                value={formState.manualDaftarPustaka || ''}
                onChange={(e) => onChange('manualDaftarPustaka', e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-800 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Buku Guru & Buku Siswa Kemendikbudristek & Kemenag..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
