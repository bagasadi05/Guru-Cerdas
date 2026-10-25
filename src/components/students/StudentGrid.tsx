import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, KeyRoundIcon, MoreVerticalIcon } from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { StudentViewProps } from './types';
import { formatStudentDisplayName } from './studentsActionHelpers';

export const StudentGrid: React.FC<StudentViewProps> = ({
  students,
  isSelected,
  toggleItem,
  onAction,
}) => {
  const windowSize = 24;
  const [visibleCount, setVisibleCount] = useState(() => Math.min(windowSize, students.length));
  const clampedCount = Math.min(visibleCount, students.length);
  const visibleStudents = useMemo(() => students.slice(0, clampedCount), [students, clampedCount]);
  const hasMore = clampedCount < students.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + windowSize, students.length));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
        {visibleStudents.map((student) => (
          <div
            key={student.id}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/75 md:backdrop-blur-xl shadow-xs sm:hover:shadow-xl sm:hover:border-emerald-500/40 dark:sm:hover:border-emerald-500/40 sm:hover:-translate-y-1 transition-colors sm:transition-all sm:duration-300 motion-reduce:transform-none motion-reduce:transition-none flex flex-col justify-between group"
          >
            {/* Header Gradient Banner */}
            <div className="h-14 sm:h-16 w-full relative overflow-hidden bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-cyan-500/15 dark:from-emerald-950/40 dark:via-teal-900/30 dark:to-cyan-950/30 border-b border-slate-100 dark:border-white/5">
              {/* Subtle ambient blur glow - hidden on mobile to avoid GPU compositing lag */}
              <div className="hidden sm:block absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="hidden sm:block absolute -bottom-8 -left-8 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

              {/* Checkbox */}
              <label className="absolute top-2 left-2 z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-900 sm:bg-white/80 sm:dark:bg-slate-900/80 sm:backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-2xs hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected(student.id)}
                  aria-label={`Pilih siswa ${student.name}`}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleItem(student.id);
                  }}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                />
              </label>

              {/* More options button */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() => onAction(student, 'menu')}
                  aria-label={`Menu aksi siswa ${student.name}`}
                  title={`Menu aksi siswa ${student.name}`}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white dark:bg-slate-900 sm:bg-white/80 sm:dark:bg-slate-900/80 sm:backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-2xs hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <MoreVerticalIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Profile Avatar & Info */}
            <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0 flex flex-col items-center -mt-9 sm:-mt-10 flex-1 justify-between">
              <div className="flex flex-col items-center w-full">
                {/* Fixed Size Circular Avatar (w-16 h-16 on mobile, w-20 h-20 on desktop) */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                  <img
                    src={getStudentAvatar(
                      student.avatar_url,
                      student.gender,
                      student.id,
                      student.name,
                      'md',
                    )}
                    alt={student.name}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-3 sm:ring-4 ring-white dark:ring-slate-900 shadow-md sm:group-hover:scale-105 sm:group-hover:shadow-lg transition-none sm:transition-transform sm:duration-300 motion-reduce:transform-none bg-slate-100 dark:bg-slate-800 aspect-square"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md flex items-center justify-center text-white text-[10px] sm:text-xs font-bold ${
                      student.gender === 'Laki-laki'
                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25'
                        : 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25'
                    }`}
                    title={student.gender ?? undefined}
                  >
                    {student.gender === 'Laki-laki' ? 'L' : 'P'}
                  </div>
                </div>

                {/* 2-line title container so names like "Adhyastha Danendra" or "Adzkiyah Haura Azzahra" are never cut off */}
                <h4
                  className="mt-2.5 sm:mt-3 w-full text-xs sm:text-sm font-bold text-slate-900 dark:text-white text-center leading-snug line-clamp-2 h-8 sm:h-10 flex items-center justify-center sm:group-hover:text-emerald-600 dark:sm:group-hover:text-emerald-400 transition-colors"
                  title={student.name}
                >
                  <span className="line-clamp-2">{formatStudentDisplayName(student.name)}</span>
                </h4>

                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
                  {student.nis ? `NIS: ${student.nis}` : 'Siswa Aktif'}
                </p>

                {/* Access Code badge */}
                <div className="mt-2">
                  {student.access_code ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-medium font-mono tracking-wider shadow-2xs sm:group-hover:bg-slate-200/70 dark:sm:group-hover:bg-white/10 transition-colors">
                      <KeyRoundIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>{student.access_code}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-semibold shadow-2xs">
                      <KeyRoundIcon className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
                      <span>Butuh Kode</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Detail CTA Button */}
              <div className="mt-3.5 sm:mt-4 w-full">
                <Link
                  to={`/siswa/${student.id}`}
                  aria-label={`Lihat detail siswa ${student.name}`}
                  className="flex w-full items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold rounded-xl bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 sm:group-hover:bg-gradient-to-r sm:group-hover:from-emerald-600 sm:group-hover:to-teal-600 sm:group-hover:text-white sm:group-hover:border-transparent sm:group-hover:shadow-md sm:group-hover:shadow-emerald-600/25 transition-colors sm:transition-all sm:duration-300 motion-reduce:transition-none cursor-pointer min-h-[38px] sm:min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <EyeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-none sm:transition-transform sm:group-hover:scale-110 motion-reduce:transform-none" aria-hidden="true" />
                  <span>Lihat Detail</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-3">
          <button
            type="button"
            onClick={handleLoadMore}
            className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 sm:bg-white/80 sm:dark:bg-slate-900/60 sm:backdrop-blur-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl cursor-pointer active:scale-95 transition-colors sm:transition-all motion-reduce:transform-none shadow-xs"
          >
            Tampilkan Lebih Banyak ({students.length - clampedCount} tersisa)
          </button>
        </div>
      )}
    </div>
  );
};
