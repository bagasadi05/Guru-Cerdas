import React from 'react';
import { FormState } from '../../types';
import { AiButton } from '../AiButton';

interface Step3TargetProfilProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  t: any;
  aiProps: {
    onAiFillField?: (field: string) => void;
    fieldLoading?: Record<string, boolean>;
  };
}

export const Step3TargetProfil: React.FC<Step3TargetProfilProps> = ({
  formState,
  onChange,
  t,
  aiProps,
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
          Langkah 3: Target Siswa, Prasyarat & Sarana Belajar
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.lessonPlan.targetPeserta}
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
          <div className="flex justify-between items-end mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.lessonPlan.kompetensiAwal}
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
            {t.lessonPlan.saranaPrasarana}
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
