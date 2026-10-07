import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardIcon,
  MoreVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  KeyRoundIcon,
} from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { useToast } from '../../hooks/useToast';
import { StudentTableProps } from './types';
import { Button } from '../ui/Button';

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isSelected,
  toggleItem,
  isAllSelected,
  toggleAll,
  onAction,
  sortConfig,
  onSort,
  canManageActiveClass = false,
  isAdmin = false,
}) => {
  const toast = useToast();
  const windowSize = 40;
  const [visibleCount, setVisibleCount] = useState(() => Math.min(windowSize, students.length));
  const clampedCount = Math.min(visibleCount, students.length);
  const visibleStudents = useMemo(() => students.slice(0, clampedCount), [students, clampedCount]);
  const hasMore = clampedCount < students.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + windowSize, students.length));
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    const iconClass = 'w-4 h-4 inline ml-1 text-emerald-600 dark:text-emerald-400';
    return sortConfig.direction === 'asc' ? (
      <ChevronUpIcon className={iconClass} />
    ) : (
      <ChevronDownIcon className={iconClass} />
    );
  };

  const renderSortHeader = (key: string, label: string, accessibleLabel: string) => (
    <th
      scope="col"
      aria-label={label}
      aria-sort={
        sortConfig.key === key
          ? sortConfig.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className="px-3 py-2 font-semibold text-gray-900 dark:text-white"
    >
      <button
        type="button"
        onClick={() => onSort(key)}
        aria-label={`Urutkan berdasarkan ${accessibleLabel}`}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
      >
        {label} {renderSortIcon(key)}
      </button>
    </th>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block table-responsive">
        <table className="w-full text-left text-sm" aria-label="Daftar Siswa">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 w-12" scope="col">
                <label className="flex h-11 w-11 items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    aria-label="Pilih semua siswa"
                    className="w-5 h-5 rounded border-slate-500 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  />
                </label>
              </th>
              {renderSortHeader('name', 'Siswa', 'nama siswa')}
              {renderSortHeader('gender', 'Jenis Kelamin', 'jenis kelamin')}
              {renderSortHeader('access_code', 'Kode Akses', 'kode akses')}
              <th
                scope="col"
                className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-right"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleStudents.map((student) => (
              <tr
                key={student.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${isSelected(student.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
              >
                <td className="px-3 py-2">
                  <label className="flex h-11 w-11 items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected(student.id)}
                      aria-label={`Pilih siswa ${student.name}`}
                      onChange={() => toggleItem(student.id)}
                      className="w-5 h-5 rounded border-slate-500 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    />
                  </label>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={getStudentAvatar(
                        student.avatar_url,
                        student.gender,
                        student.id,
                        undefined,
                        'sm',
                      )}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-8 h-8 shrink-0 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                    />
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white break-words">
                        {student.name}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        NIS: {student.nis || '-'} / NISN: {student.nisn || '-'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.gender === 'Laki-laki'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                    }`}
                  >
                    {student.gender}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {student.access_code ? (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs border border-gray-200 dark:border-gray-600">
                        {student.access_code}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(student.access_code || '');
                            toast.success('Kode akses disalin.');
                          } catch {
                            toast.error('Kode akses gagal disalin.');
                          }
                        }}
                        aria-label={`Salin kode akses ${student.name}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
                        title="Salin kode akses"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-900/30">
                      <KeyRoundIcon className="w-3 h-3" />
                      Butuh Kode
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/siswa/${student.id}`}
                      aria-label={`Lihat detail siswa ${student.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
                      title="Lihat Detail"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                    {(isAdmin || canManageActiveClass) && (
                      <>
                        <button
                          type="button"
                          onClick={() => onAction(student, 'edit')}
                          aria-label={`Edit siswa ${student.name}`}
                          title="Edit Siswa"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
                        >
                          <PencilIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(student, 'delete')}
                          aria-label={`Hapus siswa ${student.name}`}
                          title="Hapus Siswa"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 dark:focus-visible:ring-red-400"
                        >
                          <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
        <div className="flex flex-wrap items-center gap-2 p-2 text-sm text-slate-700 dark:text-slate-200">
          <label className="flex min-h-[44px] items-center gap-2 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              aria-label="Pilih semua siswa"
              className="h-5 w-5 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            />
            Pilih semua
          </label>
          <select
            aria-label="Urutkan siswa"
            value={sortConfig.key}
            onChange={(event) => onSort(event.target.value)}
            className="min-h-[44px] min-w-0 rounded-lg border border-slate-400 bg-white px-2 dark:bg-slate-800 dark:border-slate-500 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <option value="name">Nama siswa</option>
            <option value="gender">Jenis kelamin</option>
            <option value="access_code">Kode akses</option>
          </select>
          <button
            type="button"
            onClick={() => onSort(sortConfig.key)}
            aria-label={
              sortConfig.direction === 'asc' ? 'Ubah ke urutan menurun' : 'Ubah ke urutan menaik'
            }
            title={sortConfig.direction === 'asc' ? 'Urutan menaik' : 'Urutan menurun'}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-400 dark:border-slate-500 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            {sortConfig.direction === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {visibleStudents.map((student) => (
          <div
            key={student.id}
            className="p-2 sm:p-3 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <label className="flex h-11 w-11 shrink-0 items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected(student.id)}
                onChange={() => toggleItem(student.id)}
                aria-label={`Pilih siswa ${student.name}`}
                className="h-5 w-5 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              />
            </label>
            <Link
              to={`/siswa/${student.id}`}
              aria-label={`Lihat detail siswa ${student.name}`}
              className="flex-1 min-w-0 min-h-[44px] rounded text-slate-900 dark:text-white focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              <h4 className="font-semibold break-words text-sm" title={student.name}>
                {student.name}
              </h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 break-words">
                NIS: {student.nis || '-'} / NISN: {student.nisn || '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {student.access_code ? (
                  <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-semibold">
                    {student.access_code}
                  </span>
                ) : (
                  <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    Butuh Kode
                  </span>
                )}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAction(student, 'menu')}
              title={`Menu aksi ${student.name}`}
              className="text-slate-600 dark:text-slate-300 shrink-0 !h-11 !w-11 !min-h-[44px] !min-w-[44px] rounded-lg"
              aria-label={`Menu aksi ${student.name}`}
            >
              <MoreVerticalIcon className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleLoadMore}
            className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            Tampilkan Lebih Banyak ({students.length - clampedCount} tersisa)
          </button>
        </div>
      )}
    </div>
  );
};
