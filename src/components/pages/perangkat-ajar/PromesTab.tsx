import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  RotateCcw,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  ProtaItem,
  KaldikWeek,
  MatrixCell,
} from '../../../types/perangkatAjar';
import {
  evaluateMatrixRowStatuses,
  evaluateColumnWeeklySums,
  getRowStatusBadgeProps,
  getLockedWeekSlots,
} from '../../../utils/promesEngine';
import { WEEK_TYPE_SHORT_LABELS } from '../../../types/perangkatAjar';

const MONTH_NAMES_SEM_1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_NAMES_SEM_2 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

interface PromesTabProps {
  protaItems: ProtaItem[];
  semesterWeeks: KaldikWeek[];
  semesterNumber: 1 | 2;
  onChangeSemester: (sem: 1 | 2) => void;
  weeklyJpLimit: number;
  onChangeWeeklyJpLimit: (limit: number) => void;
  cells: MatrixCell[];
  onUpdateCell: (rowId: string, monthIndex: number, weekNumber: number, jp: number) => void;
  onAutoDistribute: () => void;
  onResetMatrix: () => void;
  /** Returns a teacher-set week to automatic distribution. */
  onReleaseCell?: (rowId: string, monthIndex: number, weekNumber: number) => void;
}

export const PromesTab: React.FC<PromesTabProps> = ({
  protaItems,
  semesterWeeks,
  semesterNumber,
  onChangeSemester,
  weeklyJpLimit,
  onChangeWeeklyJpLimit,
  cells,
  onUpdateCell,
  onAutoDistribute,
  onResetMatrix,
  onReleaseCell,
}) => {
  const monthNames = semesterNumber === 1 ? MONTH_NAMES_SEM_1 : MONTH_NAMES_SEM_2;

  // Month Focus Filter & Quick Tap Cell Picker States
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<'ALL' | number>('ALL');
  const [activeCellPicker, setActiveCellPicker] = useState<{
    rowId: string;
    monthIndex: number;
    weekNumber: number;
  } | null>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!activeCellPicker) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.promes-cell-picker-container')) {
        setActiveCellPicker(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [activeCellPicker]);

  const displayedMonthIndices = useMemo(() => {
    if (selectedMonthFilter === 'ALL') {
      return [0, 1, 2, 3, 4, 5];
    }
    return [selectedMonthFilter];
  }, [selectedMonthFilter]);

  const handlePrevMonth = () => {
    if (selectedMonthFilter === 'ALL') {
      setSelectedMonthFilter(0);
    } else if (selectedMonthFilter > 0) {
      setSelectedMonthFilter(selectedMonthFilter - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthFilter === 'ALL') {
      setSelectedMonthFilter(0);
    } else if (selectedMonthFilter < 5) {
      setSelectedMonthFilter(selectedMonthFilter + 1);
    }
  };

  // Filter items for this semester
  const currentSemesterItems = useMemo(
    () =>
      protaItems
        .filter((it) => it.semesterNumber === semesterNumber)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [protaItems, semesterNumber]
  );

  // Row matching statuses
  const rowStatuses = useMemo(
    () => evaluateMatrixRowStatuses(currentSemesterItems, cells),
    [currentSemesterItems, cells]
  );

  // Column weekly sums
  const columnSums = useMemo(
    () => evaluateColumnWeeklySums(cells, semesterWeeks, weeklyJpLimit),
    [cells, semesterWeeks, weeklyJpLimit]
  );

  // Stats
  const totalTargetJp = useMemo(
    () => currentSemesterItems.reduce((acc, it) => acc + (it.targetJp || 0), 0),
    [currentSemesterItems]
  );

  const totalDistributedJp = useMemo(() => {
    return Object.values(rowStatuses).reduce((acc, st) => acc + st.distributedJp, 0);
  }, [rowStatuses]);

  const matchedRowCount = useMemo(() => {
    return Object.values(rowStatuses).filter((st) => st.status === 'SESUAI').length;
  }, [rowStatuses]);

  const lockedSlots = useMemo(
    () => getLockedWeekSlots(semesterWeeks, semesterNumber),
    [semesterWeeks, semesterNumber]
  );

  const getCellData = (rowId: string, monthIndex: number, weekNumber: number): MatrixCell => {
    const existing = cells.find(
      (c) => c.rowId === rowId && c.monthIndex === monthIndex && c.weekNumber === weekNumber
    );
    if (existing) return existing;
    const lockReason = lockedSlots.get(`${monthIndex}-${weekNumber}`);
    return {
      rowId,
      monthIndex,
      weekNumber,
      allocatedJp: 0,
      isLocked: Boolean(lockReason),
      lockReason,
    };
  };

  const getColumnData = (monthIndex: number, weekNumber: number) => {
    return columnSums.find((c) => c.monthIndex === monthIndex && c.weekNumber === weekNumber);
  };

  return (
    <div className="space-y-6">
      {/* 1. Control Toolbar & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Semester Selector */}
          <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onChangeSemester(1)}
              className={`px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                semesterNumber === 1
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Semester 1 (Ganjil)
            </button>
            <button
              type="button"
              onClick={() => onChangeSemester(2)}
              className={`px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                semesterNumber === 2
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Semester 2 (Genap)
            </button>
          </div>

          {/* Weekly JP Limit Input */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium" title="Sama dengan JP per pekan di Kaldik dan Prota">JP / Pekan:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={12}
                value={weeklyJpLimit}
                aria-label="Jam pelajaran per pekan (berlaku juga untuk Prota)"
                onChange={(e) =>
                  onChangeWeeklyJpLimit(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-12 min-h-[32px] px-1.5 py-0.5 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-500">JP</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={onResetMatrix}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
            title="Kosongkan alokasi pembagian jam pada matriks semester ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kosongkan Matriks</span>
          </button>

          <button
            type="button"
            onClick={onAutoDistribute}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
            title="Bagikan jam pelajaran secara otomatis dan berurutan ke pekan aktif KBM"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Bagi Jam Otomatis</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Progress Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Status Pembagian Jam: {matchedRowCount} dari {currentSemesterItems.length} Materi Sudah Pas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Jam Terbagi: <strong className="text-slate-800 dark:text-slate-200">{totalDistributedJp} JP</strong> dari target{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalTargetJp} JP</strong>
            </p>
            {currentSemesterItems.length > 0 && matchedRowCount < currentSemesterItems.length && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {currentSemesterItems.length - matchedRowCount} materi jamnya belum sesuai Prota.{' '}
                <button
                  type="button"
                  onClick={onAutoDistribute}
                  className="font-bold underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300"
                >
                  Bagi ulang
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="w-full md:w-64">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
            <span>Persentase Jam Terbagi</span>
            <span>
              {totalTargetJp > 0
                ? Math.min(100, Math.round((totalDistributedJp / totalTargetJp) * 100))
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                totalDistributedJp === totalTargetJp
                  ? 'bg-emerald-500'
                  : totalDistributedJp > totalTargetJp
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{
                width: `${
                  totalTargetJp > 0
                    ? Math.min(100, (totalDistributedJp / totalTargetJp) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Month Focus Filter & Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-slate-50/90 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" />
            <span>Fokus Bulan:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonthFilter('ALL')}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedMonthFilter === 'ALL'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Semua Bulan (30 Pekan)
          </button>
          {monthNames.map((mName, mIdx) => (
            <button
              key={mIdx}
              type="button"
              onClick={() => setSelectedMonthFilter(mIdx)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedMonthFilter === mIdx
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {mName}
            </button>
          ))}
        </div>

        {selectedMonthFilter !== 'ALL' && (
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">
              Bulan {monthNames[selectedMonthFilter]} (5 Pekan)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={selectedMonthFilter <= 0}
                onClick={handlePrevMonth}
                className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shadow-xs"
                title="Bulan Sebelumnya"
                aria-label="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={selectedMonthFilter >= 5}
                onClick={handleNextMonth}
                className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shadow-xs"
                title="Bulan Berikutnya"
                aria-label="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Interactive 2D Distribution Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Mobile Horizontal Swipe Hint (shown only in All Months view) */}
        {selectedMonthFilter === 'ALL' && (
          <div className="md:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span>👉</span>
              <span>Geser ke samping untuk mengisi 30 pekan. Atau pilih filter bulan di atas agar lebih ringkas.</span>
            </span>
          </div>
        )}

        <div className="overflow-auto relative max-h-[72vh]">
          <table className="w-full border-collapse text-xs text-left">
            <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 shadow-xs">
              {/* Tier 1 Header: Fixed Cols + Month Groups */}
              <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <th
                  rowSpan={2}
                  className="sticky left-0 top-0 z-50 bg-slate-100 dark:bg-slate-800 py-2.5 px-2 w-10 text-center border-r border-slate-200 dark:border-slate-700"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-10 top-0 z-50 bg-slate-100 dark:bg-slate-800 py-2.5 px-3 min-w-[170px] max-w-[210px] sm:min-w-[220px] sm:max-w-none border-r-2 border-slate-300 dark:border-slate-700 shadow-[2px_0_6px_rgba(0,0,0,0.06)]"
                >
                  Tujuan Pembelajaran (TP) / KD & Materi
                </th>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 py-2.5 px-2 w-16 text-center border-r border-slate-200 dark:border-slate-700"
                >
                  Target JP
                </th>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 py-2.5 px-2 w-28 text-center border-r border-slate-200 dark:border-slate-700"
                >
                  Status Jam
                </th>

                {/* Displayed Month Group Headers */}
                {displayedMonthIndices.map((mIdx) => (
                  <th
                    key={mIdx}
                    colSpan={5}
                    className="sticky top-0 z-30 py-1.5 px-2 text-center text-xs font-bold border-r border-slate-200 dark:border-slate-700 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  >
                    {monthNames[mIdx]}
                  </th>
                ))}
              </tr>

              {/* Tier 2 Header: Weeks 1-5 for displayed months */}
              <tr className="sticky top-[33px] z-30 bg-slate-50 dark:bg-slate-800/90 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700 backdrop-blur-xs">
                {displayedMonthIndices.map((mIdx) =>
                  [1, 2, 3, 4, 5].map((w) => {
                    const matchedWeek = semesterWeeks.find(
                      (kw) =>
                        (semesterNumber === 1 ? kw.month - 7 : kw.month - 1) === mIdx &&
                        kw.weekNumber === w
                    );
                    const isLocked = matchedWeek && matchedWeek.type !== 'KBM';
                    const shortReason = isLocked ? WEEK_TYPE_SHORT_LABELS[matchedWeek.type] : null;
                    const colData = getColumnData(mIdx, w);
                    const isOverload = colData?.exceedsLimit;

                    return (
                      <th
                        key={`${mIdx}-${w}`}
                        className={`py-1 px-1 w-10 text-center font-mono text-[10px] border-r border-slate-200 dark:border-slate-700 transition-colors ${
                          isOverload
                            ? 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold'
                            : isLocked
                            ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                        title={
                          isOverload
                            ? `Peringatan: Alokasi pada Pekan ${w} (${colData?.totalJp || 0} JP) melebihi batas ${weeklyJpLimit} JP!`
                            : isLocked && matchedWeek
                            ? `Pekan Non-Efektif: ${matchedWeek.type}`
                            : `Pekan ${w} ${monthNames[mIdx]}`
                        }
                      >
                        <div>M{w}</div>
                        {shortReason && (
                          <div className="text-[8px] font-bold text-rose-500 dark:text-rose-400 truncate max-w-[34px] scale-90">
                            {shortReason}
                          </div>
                        )}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentSemesterItems.length === 0 ? (
                <tr>
                  <td colSpan={4 + displayedMonthIndices.length * 5} className="py-12 text-center text-slate-400">
                    Belum ada materi pelajaran untuk semester ini di Program Tahunan. Silakan tambahkan materi di tab <strong>2. Program Tahunan (Prota)</strong> terlebih dahulu.
                  </td>
                </tr>
              ) : (
                currentSemesterItems.map((item, index) => {
                  const rowStatus = rowStatuses[item.id] || {
                    targetJp: item.targetJp,
                    distributedJp: 0,
                    difference: -item.targetJp,
                    status: 'KURANG',
                  };
                  const badge = getRowStatusBadgeProps(rowStatus.status, rowStatus.difference);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 py-2.5 px-2 text-center text-slate-400 font-mono border-r border-slate-100 dark:border-slate-800">
                        {index + 1}
                      </td>
                      <td className="sticky left-10 z-20 bg-white dark:bg-slate-900 py-2.5 px-3 border-r-2 border-slate-200 dark:border-slate-700 shadow-[2px_0_6px_rgba(0,0,0,0.06)] min-w-[170px] max-w-[210px] sm:min-w-[220px] sm:max-w-none">
                        <div className="space-y-0.5">
                          {item.learningObjectiveCode && (
                            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block font-mono">
                              {item.learningObjectiveCode}
                            </span>
                          )}
                          <p className="text-xs line-clamp-2" title={item.learningObjectiveText}>
                            {item.learningObjectiveText}
                          </p>
                          {item.coreTopic && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.coreTopic}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                        {item.targetJp} JP
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${badge.badgeClass}`}
                        >
                          {badge.diffText}
                        </span>
                      </td>

                      {/* Displayed Week Input Cells */}
                      {displayedMonthIndices.map((mIdx) =>
                        [1, 2, 3, 4, 5].map((w) => {
                          const cell = getCellData(item.id, mIdx, w);
                          const isPickerActive =
                            activeCellPicker?.rowId === item.id &&
                            activeCellPicker?.monthIndex === mIdx &&
                            activeCellPicker?.weekNumber === w;

                          if (cell.isLocked) {
                            return (
                              <td
                                key={`${mIdx}-${w}`}
                                className="py-2 px-1 text-center bg-slate-100/80 dark:bg-slate-800/60 border-r border-slate-100 dark:border-slate-800 cursor-not-allowed select-none"
                                title={`Pekan Terkunci (${cell.lockReason || 'Non-Efektif'})`}
                              >
                                <Lock className="w-2.5 h-2.5 mx-auto text-slate-300 dark:text-slate-600" />
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`${mIdx}-${w}`}
                              className="relative py-1 px-1 text-center border-r border-slate-100 dark:border-slate-800"
                            >
                              <div className="relative inline-flex items-center justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={weeklyJpLimit}
                                  value={cell.allocatedJp || ''}
                                  placeholder="·"
                                  aria-label={`Pekan ${w} ${monthNames[mIdx]} - ${item.learningObjectiveCode || 'materi'}`}
                                  onClick={() =>
                                    setActiveCellPicker({ rowId: item.id, monthIndex: mIdx, weekNumber: w })
                                  }
                                  onFocus={() =>
                                    setActiveCellPicker({ rowId: item.id, monthIndex: mIdx, weekNumber: w })
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    onUpdateCell(item.id, mIdx, w, Math.max(0, val || 0));
                                  }}
                                  title={cell.isManual ? 'Diatur manual; tetap saat Bagi ulang' : undefined}
                                  className={`w-9 h-8 py-0.5 text-xs font-bold text-center rounded-lg outline-none transition-all cursor-pointer ${
                                    cell.isManual ? 'ring-2 ring-amber-400 dark:ring-amber-500 ' : ''
                                  }${
                                    cell.allocatedJp > 0
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-700'
                                      : 'bg-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200'
                                  }`}
                                />

                                {/* Touch-Friendly Quick Picker Popover */}
                                {isPickerActive && (
                                  <div
                                    className="promes-cell-picker-container absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap min-w-[130px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-700">
                                      <span>
                                        {monthNames[mIdx]} M{w}
                                      </span>
                                      <span className="text-brand-600 dark:text-brand-400">
                                        Maks {weeklyJpLimit} JP
                                      </span>
                                    </div>

                                    {/* Stepper */}
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateCell(
                                            item.id,
                                            mIdx,
                                            w,
                                            Math.max(0, (cell.allocatedJp || 0) - 1)
                                          )
                                        }
                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-extrabold text-sm flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer"
                                        title="Kurangi 1 JP"
                                        aria-label="Kurangi 1 JP"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                        {cell.allocatedJp || 0}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateCell(
                                            item.id,
                                            mIdx,
                                            w,
                                            Math.min(weeklyJpLimit, (cell.allocatedJp || 0) + 1)
                                          )
                                        }
                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-extrabold text-sm flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer"
                                        title="Tambah 1 JP"
                                        aria-label="Tambah 1 JP"
                                      >
                                        +
                                      </button>
                                    </div>

                                    {cell.isManual && onReleaseCell && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onReleaseCell(item.id, mIdx, w);
                                          setActiveCellPicker(null);
                                        }}
                                        className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                                      >
                                        Kembalikan ke otomatis
                                      </button>
                                    )}

                                    {/* Quick Chips */}
                                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                                      {[...new Set([0, 1, 2, 4].map((v) => Math.min(v, weeklyJpLimit)))].map((presetVal) => (
                                        <button
                                          key={presetVal}
                                          type="button"
                                          onClick={() => {
                                            onUpdateCell(item.id, mIdx, w, presetVal);
                                            setActiveCellPicker(null);
                                          }}
                                          className={`py-1 text-[11px] font-bold rounded-lg border transition-all active:scale-95 cursor-pointer ${
                                            cell.allocatedJp === presetVal
                                              ? 'bg-emerald-600 text-white border-emerald-600'
                                              : 'bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          {presetVal === 0 ? '0' : `${presetVal}`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Bottom Summary Row: Column Weekly Sums */}
            <tfoot className="sticky bottom-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-[0_-2px_6px_rgba(0,0,0,0.06)]">
              <tr>
                <td
                  colSpan={2}
                  className="sticky left-0 bottom-0 z-40 bg-slate-100 dark:bg-slate-800 py-2.5 px-3 text-right border-r-2 border-slate-300 dark:border-slate-700 shadow-[2px_0_6px_rgba(0,0,0,0.06)] text-xs"
                >
                  JUMLAH ALOKASI JAM MENGAJAR PER PEKAN
                </td>
                <td className="py-2.5 px-2 text-center text-xs border-r border-slate-200 dark:border-slate-700">
                  {totalTargetJp} JP
                </td>
                <td className="py-2.5 px-2 text-center text-xs border-r border-slate-200 dark:border-slate-700">
                  {totalDistributedJp} JP
                </td>

                {/* Displayed Week Column Sums */}
                {displayedMonthIndices.map((mIdx) =>
                  [1, 2, 3, 4, 5].map((w) => {
                    const col = getColumnData(mIdx, w);
                    const totalJp = col?.totalJp || 0;
                    const exceeds = col?.exceedsLimit;

                    return (
                      <td
                        key={`sum-${mIdx}-${w}`}
                        className={`py-2 px-1 text-center font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 transition-colors ${
                          exceeds
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-extrabold animate-pulse'
                            : totalJp > 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                        title={
                          exceeds
                            ? `Peringatan: Alokasi pada pekan ini (${totalJp} JP) melebihi batas jam mingguan (${weeklyJpLimit} JP)!`
                            : undefined
                        }
                      >
                        {totalJp > 0 ? totalJp : '—'}
                      </td>
                    );
                  })
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
