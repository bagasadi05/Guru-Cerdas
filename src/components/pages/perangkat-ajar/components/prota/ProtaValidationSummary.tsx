import React from 'react';
import { AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import type { ProtaValidationResult, RmeSummary } from '../../../../../types/perangkatAjar';
import type { getProtaBalanceBadgeProps } from '../../../../../utils/protaEngine';

interface ProtaValidationSummaryProps {
  validation: ProtaValidationResult;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  sem1Badge: ReturnType<typeof getProtaBalanceBadgeProps>;
  sem2Badge: ReturnType<typeof getProtaBalanceBadgeProps>;
  annualBadge: ReturnType<typeof getProtaBalanceBadgeProps>;
  hasDiscrepancy: boolean;
  isDeficit: boolean;
  discrepancyTitle: string;
  discrepancyDesc: string;
  onAutoBalance?: () => void;
}

export const ProtaValidationSummary: React.FC<ProtaValidationSummaryProps> = ({
  validation,
  rmeSem1,
  rmeSem2,
  sem1Badge,
  sem2Badge,
  annualBadge,
  hasDiscrepancy,
  isDeficit,
  discrepancyTitle,
  discrepancyDesc,
  onAutoBalance,
}) => {
  return (
    <div className="space-y-6">
      {/* Real-Time Balance Validation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Semester 1 Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester 1 (Ganjil)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sem1Badge.badgeClass}`}>
              {sem1Badge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedSemester1Jp}{' '}
                <span className="text-xs font-normal text-slate-500">/ {rmeSem1.netTeachingJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {sem1Badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Semester 2 Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester 2 (Genap)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sem2Badge.badgeClass}`}>
              {sem2Badge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedSemester2Jp}{' '}
                <span className="text-xs font-normal text-slate-500">/ {rmeSem2.netTeachingJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {sem2Badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Total Annual Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Tahunan (Prota)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${annualBadge.badgeClass}`}>
              {annualBadge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedAnnualJp}{' '}
                <span className="text-xs font-normal text-slate-500">/ {validation.totalTargetJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {annualBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {hasDiscrepancy && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${
            isDeficit
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {isDeficit ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">{discrepancyTitle}</p>
              <p className="opacity-90 leading-relaxed">{discrepancyDesc}</p>
            </div>
          </div>
          {onAutoBalance && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onAutoBalance}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 dark:from-amber-500 dark:to-indigo-500 shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Seimbangkan Jam</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
