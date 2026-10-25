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
  MessageSquareIcon,
} from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { useToast } from '../../hooks/useToast';
import { StudentTableProps } from './types';
import { Button } from '../ui/Button';
import { createWhatsAppLink } from '../../utils/whatsappUtils';
import { formatStudentDisplayName } from './studentsActionHelpers';

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
      className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider"
    >
      <button
        type="button"
        onClick={() => onSort(key)}
        aria-label={`Urutkan berdasarkan ${accessibleLabel}`}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 transition-colors"
      >
        {label} {renderSortIcon(key)}
      </button>
    </th>
  );

  return (
    <div className="bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/80 md:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block table-responsive">
        <table className="w-full text-left text-sm" aria-label="Daftar Siswa">
          <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 w-12" scope="col">
                <label className="flex h-11 w-11 items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    aria-label="Pilih semua siswa"
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                  />
                </label>
              </th>
              {renderSortHeader('name', 'Siswa', 'nama siswa')}
              {renderSortHeader('nis', 'NIS', 'nomor induk siswa')}
              {renderSortHeader('gender', 'Jenis Kelamin', 'jenis kelamin')}
              <th scope="col" className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Orang Tua / Kontak
              </th>
              {renderSortHeader('access_code', 'Kode Akses', 'kode akses')}
              <th
                scope="col"
                className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider text-right"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {visibleStudents.map((student) => (
              <tr
                key={student.id}
                className={`hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 transition-colors group ${
                  isSelected(student.id) ? 'bg-emerald-50/80 dark:bg-emerald-950/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <label className="flex h-11 w-11 items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected(student.id)}
                      onChange={() => toggleItem(student.id)}
                      aria-label={`Pilih siswa ${student.name}`}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                    />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getStudentAvatar(
                        student.avatar_url,
                        student.gender,
                        student.id,
                        student.name,
                        'sm',
                      )}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 shrink-0 rounded-xl object-cover ring-2 ring-slate-200/60 dark:ring-white/10 bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/siswa/${student.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors break-words block"
                      >
                        {formatStudentDisplayName(student.name)}
                      </Link>
                      {student.nisn && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          NISN: {student.nisn}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {student.nis || '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      student.gender === 'Laki-laki'
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
                    }`}
                  >
                    {student.gender}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {student.parent_phone ? (
                    <a
                      href={createWhatsAppLink(
                        student.parent_phone,
                        `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu ${student.parent_name || 'wali murid'}, terkait siswa ananda ${student.name}...`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50 transition-colors shadow-2xs"
                      title={`Chat WhatsApp ke ${student.parent_phone}`}
                    >
                      <MessageSquareIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[130px]">
                        {student.parent_name || student.parent_phone}
                      </span>
                    </a>
                  ) : student.parent_name ? (
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[130px] block font-medium">
                      {student.parent_name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.access_code ? (
                    <div className="flex items-center gap-2">
                      <code className="px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200/80 dark:border-white/10 font-medium">
                        {student.access_code}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(student.access_code || '');
                          toast.success('Kode berhasil disalin');
                        }}
                        aria-label={`Salin kode akses ${student.name}`}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Salin Kode Akses"
                      >
                        <ClipboardIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                      <KeyRoundIcon className="w-3 h-3 text-amber-500" />
                      Butuh Kode
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/siswa/${student.id}`}
                      aria-label={`Lihat detail siswa ${student.name}`}
                      title="Lihat Detail Siswa"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <EyeIcon className="w-4 h-4" aria-hidden="true" />
                    </Link>

                    {(canManageActiveClass || isAdmin) && (
                      <>
                        <button
                          type="button"
                          onClick={() => onAction(student, 'edit')}
                          aria-label={`Edit siswa ${student.name}`}
                          title="Edit Siswa"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        >
                          <PencilIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(student, 'delete')}
                          aria-label={`Hapus siswa ${student.name}`}
                          title="Hapus Siswa"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
      <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/5">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200">
          <label className="flex min-h-[44px] items-center gap-2 px-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              aria-label="Pilih semua siswa"
              className="h-4 w-4 rounded accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
            />
            Pilih semua
          </label>
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Urutkan siswa"
              value={sortConfig.key}
              onChange={(event) => onSort(event.target.value)}
              className="h-10 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 text-slate-800 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <option value="name">Nama siswa</option>
              <option value="nis">Nomor Induk (NIS)</option>
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
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors cursor-pointer"
            >
              {sortConfig.direction === 'asc' ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {visibleStudents.map((student) => (
          <div
            key={student.id}
            className="p-3 sm:p-4 flex items-center gap-3 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 transition-colors"
          >
            <label className="flex h-11 w-11 shrink-0 items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected(student.id)}
                onChange={() => toggleItem(student.id)}
                aria-label={`Pilih siswa ${student.name}`}
                className="h-4 w-4 rounded accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
              />
            </label>

            <img
              src={getStudentAvatar(
                student.avatar_url,
                student.gender,
                student.id,
                student.name,
                'sm',
              )}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-10 h-10 shrink-0 rounded-xl object-cover ring-2 ring-slate-200/60 dark:ring-white/10 bg-slate-100 dark:bg-slate-800"
            />

            <Link
              to={`/siswa/${student.id}`}
              aria-label={`Lihat detail siswa ${student.name}`}
              className="flex-1 min-w-0 min-h-[44px] rounded text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <h4 className="font-bold break-words text-sm text-slate-900 dark:text-white" title={student.name}>
                {formatStudentDisplayName(student.name)}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">
                NIS: {student.nis || '-'} / NISN: {student.nisn || '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {student.access_code ? (
                  <span className="text-xs font-mono bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-white/5">
                    {student.access_code}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    <KeyRoundIcon className="w-3 h-3" />
                    Butuh Kode
                  </span>
                )}
                {student.parent_phone && (
                  <a
                    href={createWhatsAppLink(
                      student.parent_phone,
                      `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu ${student.parent_name || 'wali murid'}, terkait siswa ananda ${student.name}...`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    <MessageSquareIcon className="w-3 h-3" />
                    WA
                  </a>
                )}
              </div>
            </Link>

            <button
              type="button"
              onClick={() => onAction(student, 'menu')}
              aria-label={`Menu aksi siswa ${student.name}`}
              title="Aksi Siswa"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVerticalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center p-4 border-t border-slate-100 dark:border-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            className="min-h-[44px] px-6 py-2 rounded-xl border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs sm:text-sm"
          >
            Tampilkan Lebih Banyak ({students.length - clampedCount} tersisa)
          </Button>
        </div>
      )}
    </div>
  );
};
