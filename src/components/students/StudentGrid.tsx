import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { EyeIcon, KeyRoundIcon, MoreVerticalIcon } from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { StudentViewProps } from './types';

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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ">
        {visibleStudents.map((student) => (
          <Card key={student.id} className="relative !p-0 overflow-hidden">
            <div className="h-14 sm:h-16 w-full bg-emerald-50 dark:bg-emerald-500/10">
              <label className="absolute top-1 left-1 z-10 flex h-11 w-11 items-center justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected(student.id)}
                  aria-label={`Pilih siswa ${student.name}`}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleItem(student.id);
                  }}
                  className="w-5 h-5 rounded border-slate-400 dark:border-slate-500 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 cursor-pointer"
                />
              </label>
              <div className="absolute top-1 right-1">
                <button
                  type="button"
                  onClick={() => onAction(student, 'menu')}
                  aria-label={`Menu aksi siswa ${student.name}`}
                  title={`Menu aksi siswa ${student.name}`}
                  className="w-11 h-11 p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 cursor-pointer flex items-center justify-center"
                >
                  <MoreVerticalIcon className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="px-3 pb-3 flex flex-col items-center -mt-9 sm:-mt-11">
              <div className="relative">
                <img
                  src={getStudentAvatar(
                    student.avatar_url,
                    student.gender,
                    student.id,
                    undefined,
                    'md',
                  )}
                  alt={student.name}
                  loading="lazy"
                  decoding="async"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 bg-slate-100 dark:bg-slate-700"
                />
                <div
                  className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-800 flex items-center justify-center ${student.gender === 'Laki-laki' ? 'bg-sky-700' : 'bg-rose-600'}`}
                  title={student.gender ?? undefined}
                >
                  <span className="text-white text-xs font-bold">
                    {student.gender === 'Laki-laki' ? 'L' : 'P'}
                  </span>
                </div>
              </div>

              <h4
                className="mt-3 h-10 w-full text-sm font-semibold text-slate-900 dark:text-white text-center leading-5"
                title={student.name}
              >
                <span className="line-clamp-2 break-words">{student.name}</span>
              </h4>

              <div className="mt-2 h-7 flex items-center gap-2">
                {student.access_code ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium font-mono tracking-wide">
                    <KeyRoundIcon className="w-3 h-3" aria-hidden="true" />
                    {student.access_code}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                    <KeyRoundIcon className="w-3 h-3" aria-hidden="true" />
                    Butuh Kode
                  </span>
                )}
              </div>

              <div className="mt-3 w-full">
                <Link
                  to={`/siswa/${student.id}`}
                  aria-label={`Lihat detail siswa ${student.name}`}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/25 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
                >
                  <EyeIcon className="w-4 h-4" aria-hidden="true" />
                  Lihat Detail
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={handleLoadMore}
            className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            Tampilkan Lebih Banyak ({students.length - clampedCount} tersisa)
          </button>
        </div>
      )}
    </div>
  );
};
