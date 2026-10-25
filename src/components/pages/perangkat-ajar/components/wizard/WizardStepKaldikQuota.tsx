import React from 'react';
import { Calendar } from 'lucide-react';
import type { RmeSummary } from '../../../../../types/perangkatAjar';

interface WizardStepKaldikQuotaProps {
  weeklyJpQuota: number;
  onWeeklyJpQuotaChange: (quota: number) => void;
  usesOwnKaldik: boolean;
  academicYear: string;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  reserveJpSem1: number;
  onReserveJpSem1Change: (jp: number) => void;
  reserveJpSem2: number;
  onReserveJpSem2Change: (jp: number) => void;
}

export const WizardStepKaldikQuota: React.FC<WizardStepKaldikQuotaProps> = ({
  weeklyJpQuota,
  onWeeklyJpQuotaChange,
  usesOwnKaldik,
  academicYear,
  rmeSem1,
  rmeSem2,
  reserveJpSem1,
  onReserveJpSem1Change,
  reserveJpSem2,
  onReserveJpSem2Change,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          1. Beban Mengajar / Jam Pelajaran (JP) per Pekan
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {[2, 3, 4, 5, 6].map((jp) => (
            <button
              key={jp}
              type="button"
              onClick={() => onWeeklyJpQuotaChange(jp)}
              className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                weeklyJpQuota === jp
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400'
              }`}
            >
              {jp} JP / Minggu
            </button>
          ))}
          <div className="flex items-center">
            <input
              type="number"
              min={1}
              max={12}
              value={weeklyJpQuota}
              onChange={(e) => onWeeklyJpQuotaChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full py-2 px-2 text-center text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold"
              title="Kustom JP"
            />
          </div>
        </div>
      </div>

      {/* Automatic National Kaldik Card */}
      <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {usesOwnKaldik ? 'Kalender Pendidikan Anda' : `Kalender ${academicYear}`}
          </span>
        </div>
        <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-snug">
          {usesOwnKaldik
            ? `Minggu efektif dihitung dari Kaldik ${academicYear} yang sudah Anda atur di tab Kaldik.`
            : `Belum ada Kaldik tersimpan untuk ${academicYear}. Dipakai kalender dari tanggal tahun itu dan libur nasional SKB 3 Menteri. Sesuaikan di tab Kaldik bila kalender sekolah berbeda.`}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Semester 1 (Ganjil)</span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {rmeSem1.effectiveWeeks} Pekan Efektif KBM
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              = {rmeSem1.totalAvailableJp} JP Tersedia
            </span>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Semester 2 (Genap)</span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {rmeSem2.effectiveWeeks} Pekan Efektif KBM
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              = {rmeSem2.totalAvailableJp} JP Tersedia
            </span>
          </div>
        </div>
      </div>

      {/* Reserve JP Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          2. Jam Pelajaran Cadangan (Remedial & Pengayaan)
        </label>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          Disisihkan untuk pendalaman materi, remedial, atau antisipasi jam KBM yang terpotong kegiatan sekolah.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Cadangan Semester 1:
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 2, 4].map((cad) => (
                <button
                  key={cad}
                  type="button"
                  onClick={() => onReserveJpSem1Change(cad)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    reserveJpSem1 === cad
                      ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  {cad} JP
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Cadangan Semester 2:
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 2, 4].map((cad) => (
                <button
                  key={cad}
                  type="button"
                  onClick={() => onReserveJpSem2Change(cad)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    reserveJpSem2 === cad
                      ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  {cad} JP
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
