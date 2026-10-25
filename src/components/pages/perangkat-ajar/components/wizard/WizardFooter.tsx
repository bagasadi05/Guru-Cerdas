import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { WizardStep } from './types';

interface WizardFooterProps {
  step: WizardStep;
  onPrevStep: () => void;
  onNextStep: () => void;
  onApply: () => void;
  waitingForAi: boolean;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({
  step,
  onPrevStep,
  onNextStep,
  onApply,
  waitingForAi,
}) => {
  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
      {step > 1 ? (
        <button
          type="button"
          onClick={onPrevStep}
          className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>
      ) : (
        <div />
      )}

      <div className="text-[11px] text-slate-400 hidden sm:block">
        Langkah {step} dari 4
      </div>

      {step < 4 ? (
        <button
          type="button"
          onClick={onNextStep}
          className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <span>Lanjut ke Langkah {step + 1}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onApply}
          disabled={waitingForAi}
          title={waitingForAi ? 'Buat draf materi dengan AI di langkah 3 terlebih dahulu' : undefined}
          className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          <span>Terapkan</span>
        </button>
      )}
    </div>
  );
};
