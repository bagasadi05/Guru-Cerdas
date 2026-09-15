import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { FormState } from '../../types';
import { ENNIS_IKTP_BANK } from '../../constants/learningModels';
import { AiButton } from '../AiButton';

interface Step4KomponenIntiProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onProfilToggle: (profil: string) => void;
  isGeneratingCP: boolean;
  onGenerateCP: () => void;
  PROFIL_OPTIONS: string[];
  t: any;
  aiProps: {
    onAiFillField?: (field: string) => void;
    fieldLoading?: Record<string, boolean>;
  };
  appendToField: (field: 'manualLkpdTugas' | 'manualSoalEvaluasi', snippet: string) => void;
}

export const Step4KomponenInti: React.FC<Step4KomponenIntiProps> = ({
  formState,
  onChange,
  onProfilToggle,
  isGeneratingCP,
  onGenerateCP,
  PROFIL_OPTIONS,
  t,
  aiProps,
  appendToField,
}) => {
  return (
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
                <label className="block text-xs text-slate-500 dark:text-slate-400">Pemahaman Bermakna (Big Ideas)</label>
                <AiButton field="manualPemahamanBermakna" label="Isi AI" {...aiProps} />
              </div>
              <textarea
                value={formState.manualPemahamanBermakna || ''}
                onChange={(e) => onChange('manualPemahamanBermakna', e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Contoh:&#10;1. Siswa memahami peran penting materi dalam kehidupan nyata.&#10;2. Menumbuhkan rasa syukur dan kepedulian terhadap lingkungan sekitar."
              />
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

            {/* Ringkasan Bahan Bacaan / Materi Ajar */}
            <div>
              <div className="flex flex-wrap justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ringkasan Bahan Bacaan / Materi Ajar Siswa
                </label>
                <AiButton field="manualMateriAjar" label="Buat AI" {...aiProps} />
              </div>
              <textarea
                value={formState.manualMateriAjar || ''}
                onChange={(e) => onChange('manualMateriAjar', e.target.value)}
                rows={4}
                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Ringkasan materi pelajaran yang ramah anak, padat, dan terstruktur..."
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

            {/* Asesmen Diferensiasi: Pengayaan & Remedial */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Asesmen Diferensiasi Pembelajaran
                </h4>
                <span className="text-[10px] bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full">
                  Kurikulum Merdeka
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex flex-wrap justify-between items-end mb-1">
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      🌟 Aktivitas Pengayaan
                    </label>
                    <AiButton field="manualPengayaan" label="Buat AI" {...aiProps} />
                  </div>
                  <textarea
                    value={formState.manualPengayaan || ''}
                    onChange={(e) => onChange('manualPengayaan', e.target.value)}
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs dark:bg-slate-800 dark:text-white resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Tantangan / eksplorasi mendalam bagi siswa cepat paham..."
                  />
                </div>

                <div>
                  <div className="flex flex-wrap justify-between items-end mb-1">
                    <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300">
                      🛡️ Aktivitas Remedial
                    </label>
                    <AiButton field="manualRemedial" label="Buat AI" {...aiProps} />
                  </div>
                  <textarea
                    value={formState.manualRemedial || ''}
                    onChange={(e) => onChange('manualRemedial', e.target.value)}
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs dark:bg-slate-800 dark:text-white resize-none focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Panduan bimbingan bertahap bagi siswa yang butuh pendampingan..."
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
