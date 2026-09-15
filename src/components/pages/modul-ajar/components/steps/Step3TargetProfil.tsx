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
  );
};
