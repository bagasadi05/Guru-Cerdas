import React from 'react';
import { Check } from 'lucide-react';
import { FormState } from '../../types';
import { AiButton } from '../AiButton';

interface Step3TargetProfilProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onProfilToggle: (profil: string) => void;
  PROFIL_OPTIONS: string[];
  t: any;
  aiProps: {
    onAiFillField?: (field: string, refresh?: boolean) => void;
    fieldValues?: Record<string, string>;
    fieldLoading?: Record<string, boolean>;
  };
}

export const Step3TargetProfil: React.FC<Step3TargetProfilProps> = ({
  formState,
  onChange,
  onProfilToggle,
  PROFIL_OPTIONS,
  t,
  aiProps,
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
          Langkah 3: Target Siswa, Profil Pelajar & Sarana Belajar
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.lessonPlan?.profilPancasila || 'Profil Pelajar Pancasila'}
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                formState.profilPelajar.length > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {formState.profilPelajar.length > 0
                ? `${formState.profilPelajar.length} dimensi dipilih`
                : 'Wajib pilih min. 1'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROFIL_OPTIONS.map((profil) => {
              const isSelected = formState.profilPelajar.includes(profil);
              return (
                <button
                  key={profil}
                  type="button"
                  onClick={() => onProfilToggle(profil)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/60 dark:text-amber-200 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>{profil}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.lessonPlan?.targetPeserta || 'Target Peserta Didik'}
          </label>
          <input
            type="text"
            value={formState.targetPeserta}
            onChange={(e) => onChange('targetPeserta', e.target.value)}
            placeholder="Contoh: Peserta didik reguler / tipikal (umum, tidak ada kesulitan belajar)"
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div>
          <div className="flex flex-wrap justify-between items-end gap-2 mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.lessonPlan?.kompetensiAwal || 'Kompetensi Awal'}
            </label>
            <AiButton field="kompetensiAwal" label="Bantu Tulis AI" {...aiProps} />
          </div>
          <textarea
            value={formState.kompetensiAwal}
            onChange={(e) => onChange('kompetensiAwal', e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="Tuliskan pengetahuan atau keterampilan dasar yang perlu dikuasai siswa sebelum mempelajari materi ini."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.lessonPlan?.saranaPrasarana || 'Sarana dan Prasarana'}
          </label>
          <textarea
            value={formState.saranaPrasarana}
            onChange={(e) => onChange('saranaPrasarana', e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="Sebutkan alat, bahan, dan media yang digunakan (misal: proyektor, papan tulis, LKPD, kartu angka, benda konkret di sekitar kelas)."
          />
        </div>
      </div>
    </div>
  );
};
