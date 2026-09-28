import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import type {
  KaldikWeek,
  WeekType,
  RmeSummary,
} from '../../../types/perangkatAjar';
import {
  WEEK_TYPES,
  WEEK_TYPE_LABELS,
  WEEK_TYPE_STYLES,
  WEEK_TYPE_SHORT_LABELS,
  ACADEMIC_MONTHS,
} from '../../../types/perangkatAjar';

interface KaldikTabProps {
  weeks: KaldikWeek[];
  onUpdateWeek: (month: number, weekNumber: number, type: WeekType) => void;
  onResetToPreset: () => void;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
  weeklyJpQuota: number;
  onChangeWeeklyJpQuota: (quota: number) => void;
  reserveJpSem1: number;
  onChangeReserveJpSem1: (val: number) => void;
  reserveJpSem2: number;
  onChangeReserveJpSem2: (val: number) => void;
}

export const KaldikTab: React.FC<KaldikTabProps> = ({
  weeks,
  onUpdateWeek,
  onResetToPreset,
  rmeSem1,
  rmeSem2,
  weeklyJpQuota,
  onChangeWeeklyJpQuota,
  reserveJpSem1,
  onChangeReserveJpSem1,
  reserveJpSem2,
  onChangeReserveJpSem2,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{ month: number; weekNumber: number } | null>(null);

  const getWeekData = (month: number, weekNumber: number): KaldikWeek => {
    return (
      weeks.find((w) => w.month === month && w.weekNumber === weekNumber) || {
        month,
        weekNumber,
        type: 'KBM',
      }
    );
  };

  const handleSelectWeekType = (type: WeekType) => {
    if (!selectedSlot) return;
    onUpdateWeek(selectedSlot.month, selectedSlot.weekNumber, type);
    setSelectedSlot(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Global Settings & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/50 rounded-xl text-brand-600 dark:text-brand-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Kalender Pendidikan & Rincian Minggu Efektif (RME)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tentukan jenis kegiatan pada setiap pekan untuk menghitung jumlah minggu efektif dan total jam tatap muka secara otomatis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 sm:flex-none justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Jam Mengajar / Minggu:</span>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={weeklyJpQuota}
              aria-label="Jumlah Jam Pelajaran per Minggu"
              onChange={(e) => onChangeWeeklyJpQuota(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 min-h-[38px] px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <button
            onClick={onResetToPreset}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm flex-1 sm:flex-none cursor-pointer"
            title="Kembalikan pengaturan pekan ke kalender standar nasional"
            aria-label="Kembalikan pengaturan pekan ke kalender standar nasional"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Preset Nasional</span>
          </button>
        </div>
      </div>

      {/* RME Summary Cards (Semester 1 & Semester 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Semester 1 Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Semester 1 (Ganjil) — Juli s.d. Desember
              </h4>
            </div>
            <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
              {rmeSem1.effectiveWeeks} Minggu Efektif
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Pekan</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{rmeSem1.totalWeeks}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Pekan Non-KBM</span>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{rmeSem1.nonEffectiveWeeks}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Jam Tersedia</span>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{rmeSem1.totalAvailableJp} JP</p>
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Jam Tatap Muka</span>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{rmeSem1.netTeachingJp} JP</p>
            </div>
          </div>

          {/* Jam Cadangan Input */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Jam Pelajaran Cadangan (Remedial & Pengayaan)</span>
                <p className="text-[10px] text-slate-500">Disiapkan untuk kegiatan remedial, pengayaan materi, atau jeda waktu ujian.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <input
                type="number"
                min={0}
                max={20}
                value={reserveJpSem1}
                aria-label="Jam Cadangan Semester 1"
                onChange={(e) => onChangeReserveJpSem1(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 min-h-[38px] px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">JP</span>
            </div>
          </div>
        </div>

        {/* Semester 2 Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Semester 2 (Genap) — Januari s.d. Juni
              </h4>
            </div>
            <span className="text-xs px-2.5 py-0.5 font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-full">
              {rmeSem2.effectiveWeeks} Minggu Efektif
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Pekan</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{rmeSem2.totalWeeks}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Pekan Non-KBM</span>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{rmeSem2.nonEffectiveWeeks}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Jam Tersedia</span>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{rmeSem2.totalAvailableJp} JP</p>
            </div>
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">Jam Tatap Muka</span>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{rmeSem2.netTeachingJp} JP</p>
            </div>
          </div>

          {/* Jam Cadangan Input */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Jam Pelajaran Cadangan (Remedial & Pengayaan)</span>
                <p className="text-[10px] text-slate-500">Disiapkan untuk ujian sekolah, remedial, atau pengayaan.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <input
                type="number"
                min={0}
                max={20}
                value={reserveJpSem2}
                aria-label="Jam Cadangan Semester 2"
                onChange={(e) => onChangeReserveJpSem2(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 min-h-[38px] px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">JP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Interactive Kaldik Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Jadwal Pekan Kalender Pendidikan (12 Bulan)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik pada salah satu pekan untuk mengubah statusnya (KBM, Ujian, MPLS, atau Libur).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ACADEMIC_MONTHS.map((month) => (
            <div
              key={month.monthNumber}
              className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {month.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Sem. {month.semesterNumber}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((weekNum) => {
                  const week = getWeekData(month.monthNumber, weekNum);
                  const style = WEEK_TYPE_STYLES[week.type];
                  const shortLabel = WEEK_TYPE_SHORT_LABELS[week.type];
                  const isSelected =
                    selectedSlot?.month === month.monthNumber &&
                    selectedSlot?.weekNumber === weekNum;

                  return (
                    <button
                      key={weekNum}
                      type="button"
                      onClick={() =>
                        setSelectedSlot(
                          isSelected ? null : { month: month.monthNumber, weekNumber: weekNum }
                        )
                      }
                      className={`relative flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 sm:p-1.5 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-95 ${
                        style.bg
                      } ${style.border} ${style.text} ${
                        isSelected
                          ? 'ring-2 ring-brand-500 shadow-md scale-105 z-10'
                          : 'hover:scale-[1.02]'
                      }`}
                      title={`Minggu ${weekNum}: ${WEEK_TYPE_LABELS[week.type]}`}
                      aria-label={`Bulan ${month.name} Minggu ${weekNum}: ${WEEK_TYPE_LABELS[week.type]}`}
                    >
                      <span className="text-[10px] font-bold opacity-80">M{weekNum}</span>
                      <span className="text-[9px] font-extrabold truncate max-w-full px-0.5">
                        {shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Week Type Selector Popover / Drawer */}
        {selectedSlot && (
          <div
            role="region"
            aria-live="polite"
            className="p-4 bg-brand-50/70 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 rounded-2xl shadow-sm animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Ubah Jenis Kegiatan: Bulan {ACADEMIC_MONTHS.find((m) => m.monthNumber === selectedSlot.month)?.name} Pekan ke-{selectedSlot.weekNumber}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                aria-label="Tutup pemilih jenis kegiatan"
              >
                Tutup Pilihan
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {WEEK_TYPES.map((type) => {
                const style = WEEK_TYPE_STYLES[type];
                const currentWeek = getWeekData(selectedSlot.month, selectedSlot.weekNumber);
                const isActive = currentWeek.type === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectWeekType(type)}
                    className={`flex items-center gap-2 min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                      style.bg
                    } ${style.border} ${style.text} ${
                      isActive ? 'ring-2 ring-brand-600 font-bold shadow-xs' : 'hover:opacity-90'
                    }`}
                    aria-label={`Pilih kategori ${WEEK_TYPE_LABELS[type]}`}
                  >
                    {isActive ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-current shrink-0 opacity-60" />
                    )}
                    <span className="text-xs font-medium truncate">{WEEK_TYPE_LABELS[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-slate-500" />
          <span>Keterangan Klasifikasi Kalender Pendidikan</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {WEEK_TYPES.map((type) => {
            const style = WEEK_TYPE_STYLES[type];
            return (
              <div key={type} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: style.hex }}
                />
                <span className="truncate">{WEEK_TYPE_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
