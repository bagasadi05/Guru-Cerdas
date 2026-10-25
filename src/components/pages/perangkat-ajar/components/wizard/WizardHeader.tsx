import React from 'react';
import { Wand2, X } from 'lucide-react';
import { WizardStep } from './types';

interface WizardHeaderProps {
  step: WizardStep;
  onSetStep: (step: WizardStep) => void;
  onClose: () => void;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  step,
  onSetStep,
  onClose,
}) => {
  return (
    <>
      {/* Modal Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-50/70 via-emerald-50/40 to-white dark:from-slate-800/80 dark:to-slate-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-600 text-white shadow-xs">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Panduan Cepat Prota & Promes</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Empat langkah. Jam per materi dan matriks Promes dihitung dari minggu efektif Kaldik.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup Panduan"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Step Progress Pills */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold shrink-0">
        {[
          { num: 1 as WizardStep, label: 'Identitas & Mapel' },
          { num: 2 as WizardStep, label: 'Jam & Kaldik' },
          { num: 3 as WizardStep, label: 'Materi (TP)' },
          { num: 4 as WizardStep, label: 'Ringkasan & Terapkan' },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => onSetStep(s.num)}
            className={`py-1.5 px-1 sm:px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              step === s.num
                ? 'bg-brand-600 text-white font-bold shadow-xs'
                : step > s.num
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num
                  ? 'bg-white text-brand-600 font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
