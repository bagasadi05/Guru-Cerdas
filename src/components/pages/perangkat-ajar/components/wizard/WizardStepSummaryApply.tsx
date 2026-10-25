import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { ProtaItem, RmeSummary } from '../../../../../types/perangkatAjar';
import type { WizardApplyTarget } from './types';

interface WizardStepSummaryApplyProps {
  isBalanced: boolean;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  sem1Items: ProtaItem[];
  sem2Items: ProtaItem[];
  totalAllocatedSem1: number;
  totalAllocatedSem2: number;
  reserveJpSem1: number;
  reserveJpSem2: number;
  diffSem1: number;
  diffSem2: number;
  hasExistingData: boolean;
  preferNewDocument?: boolean;
  target: WizardApplyTarget;
  onTargetChange: (target: WizardApplyTarget) => void;
}

export const WizardStepSummaryApply: React.FC<WizardStepSummaryApplyProps> = ({
  isBalanced,
  rmeSem1,
  rmeSem2,
  sem1Items,
  sem2Items,
  totalAllocatedSem1,
  totalAllocatedSem2,
  reserveJpSem1,
  reserveJpSem2,
  diffSem1,
  diffSem2,
  hasExistingData,
  preferNewDocument = false,
  target,
  onTargetChange,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Ringkasan
            </h4>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              {isBalanced
                ? 'Jam materi sama dengan jam efektif di kedua semester.'
                : 'Jam materi belum sama dengan jam efektif. Seimbangkan di tab Prota setelah diterapkan.'}
            </p>
          </div>
        </div>

        {/* Summary Table */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">SEMESTER 1 (GANJIL)</span>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Pekan Efektif KBM:</span>
              <strong>{rmeSem1.effectiveWeeks} Pekan</strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Materi Pokok ({sem1Items.length} Bab):</span>
              <strong>{totalAllocatedSem1} JP</strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Jam Cadangan:</span>
              <strong>{reserveJpSem1} JP</strong>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
              <span>Total Alokasi:</span>
              <span>
                {totalAllocatedSem1 + reserveJpSem1} JP{diffSem1 === 0 ? '' : ` (${diffSem1 > 0 ? '+' : ''}${diffSem1})`}
              </span>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">SEMESTER 2 (GENAP)</span>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Pekan Efektif KBM:</span>
              <strong>{rmeSem2.effectiveWeeks} Pekan</strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Materi Pokok ({sem2Items.length} Bab):</span>
              <strong>{totalAllocatedSem2} JP</strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Jam Cadangan:</span>
              <strong>{reserveJpSem2} JP</strong>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
              <span>Total Alokasi:</span>
              <span>
                {totalAllocatedSem2 + reserveJpSem2} JP{diffSem2 === 0 ? '' : ` (${diffSem2 > 0 ? '+' : ''}${diffSem2})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Promes Note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Matriks Program Semester (Promes) Otomatis Terisi</span>
          <span className="text-[11px] leading-snug">
            Jam materi diisi berurutan ke minggu KBM; minggu libur dan asesmen dilewati. Jam bisa digeser di tab Promes.
          </span>
        </div>
      </div>

      {hasExistingData && !preferNewDocument && (
        <fieldset className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
          <legend className="px-1 font-bold text-slate-700 dark:text-slate-300">Simpan hasilnya ke</legend>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="wizard-target"
              checked={target === 'new'}
              onChange={() => onTargetChange('new')}
              className="mt-0.5"
            />
            <span>
              <strong>Dokumen baru</strong>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Prota yang sedang dibuka tetap utuh. Pindah dokumen lewat pilihan di atas halaman.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="wizard-target"
              checked={target === 'replace'}
              onChange={() => onTargetChange('replace')}
              className="mt-0.5"
            />
            <span>
              <strong>Ganti isi dokumen ini</strong>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Materi dan Promes yang ada diganti. Bisa dibatalkan sesaat setelah diterapkan.
              </span>
            </span>
          </label>
        </fieldset>
      )}
    </div>
  );
};
