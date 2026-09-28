import React from 'react';
import { FormState } from '../../types';

interface Step2IdentitasProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  recommendations: string[];
  t: any;
}

export const Step2Identitas: React.FC<Step2IdentitasProps> = ({
  formState,
  onChange,
  recommendations,
  t,
}) => {
  return (
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenjang Pendidikan</label>
            <input 
              type="text" 
              value={formState.jenjang}
              onChange={(e) => onChange('jenjang', e.target.value)}
              placeholder="Contoh: SD / Madrasah Ibtidaiyah"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tingkat Kelas</label>
            <select 
              value={formState.kelas}
              onChange={(e) => onChange('kelas', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              {[1, 2, 3, 4, 5, 6].map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fase Kurikulum Merdeka (Terisi Otomatis)</label>
          <input 
            type="text" 
            value={formState.fase} 
            readOnly
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-600 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.lessonPlan.mataPelajaran} <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={formState.mataPelajaran}
            onChange={(e) => onChange('mataPelajaran', e.target.value)}
            placeholder="Contoh: Matematika"
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Materi Pokok / Topik Pembahasan <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={formState.topik}
            onChange={(e) => onChange('topik', e.target.value)}
            placeholder="Contoh: Penjumlahan Bilangan Cacah sampai 100"
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />

          {/* Recommendation chips */}
          {recommendations && recommendations.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Contoh Topik Siap Pakai (Klik untuk memilih):</span>
              <div className="flex flex-wrap gap-1.5">
                {recommendations.map((recTopic: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange('topik', recTopic)}
                    className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 hover:border-brand-500 rounded-lg text-xs text-brand-700 dark:text-brand-300 text-left transition-colors cursor-pointer"
                  >
                    + {recTopic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Guru Penyusun</label>
          <input 
            type="text" 
            value={formState.guru}
            onChange={(e) => onChange('guru', e.target.value)}
            placeholder="Contoh: Bagas Riyadi, S.Pd"
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};
