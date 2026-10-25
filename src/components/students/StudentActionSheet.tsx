import React from 'react';
import { Link } from 'react-router-dom';
import BottomSheet from '../ui/BottomSheet';
import { ClipboardIcon, EyeIcon, KeyRoundIcon, MessageSquareIcon, PencilIcon, TrashIcon } from '../Icons';
import { StudentRow } from './types';
import { createWhatsAppLink, generateAccessCodeMessage } from '../../utils/whatsappUtils';
import { formatStudentDisplayName } from './studentsActionHelpers';
import { getStudentAvatar } from '../../utils/avatarUtils';

interface StudentActionSheetProps {
  student: StudentRow | null;
  isOpen: boolean;
  onClose: () => void;
  canManageActiveClass: boolean;
  onEdit: (student: StudentRow) => void;
  onDelete: (student: StudentRow) => void;
  onCopyCode: (code: string) => void;
  onGenerateCode: (student: StudentRow) => void;
  isAdmin?: boolean;
}

export const StudentActionSheet: React.FC<StudentActionSheetProps> = ({
  student,
  isOpen,
  onClose,
  canManageActiveClass,
  onEdit,
  onDelete,
  onCopyCode,
  onGenerateCode,
  isAdmin = false,
}) => {
  if (!student) return null;

  const displayName = formatStudentDisplayName(student.name);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={displayName || 'Aksi Siswa'}>
      <div className="flex flex-col gap-2 p-1">
        {/* Student Mini Profile Header */}
        <div className="flex items-center gap-3 p-3 mb-1 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <img
            src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name, 'sm')}
            alt={student.name}
            className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-white/10 shrink-0 bg-slate-100 dark:bg-slate-800"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {displayName}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{student.gender || 'Siswa'}</span>
              <span>•</span>
              <span>{student.nis ? `NIS: ${student.nis}` : 'Siswa Aktif'}</span>
            </div>
          </div>
        </div>

        <Link
          to={`/siswa/${student.id}`}
          className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors sm:transition-all cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 motion-reduce:transform-none motion-reduce:transition-none"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-500/20 shadow-2xs">
            <EyeIcon className="w-5 h-5" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Lihat Detail</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Lihat profil, nilai, dan absensi</p>
          </div>
        </Link>

        {(canManageActiveClass || isAdmin) ? (
          <button
            type="button"
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors sm:transition-all text-left w-full cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => {
              onEdit(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20 shadow-2xs">
              <PencilIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Edit Data</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Ubah nama, kelas, atau foto</p>
            </div>
          </button>
        ) : null}

        {(canManageActiveClass || isAdmin) && !student.access_code && (
          <button
            type="button"
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors sm:transition-all text-left w-full cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => {
              onGenerateCode(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20 shadow-2xs">
              <KeyRoundIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Buat Kode Akses</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Generate kode login siswa</p>
            </div>
          </button>
        )}

        {(canManageActiveClass || isAdmin) && student.access_code && (
          <button
            type="button"
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors sm:transition-all text-left w-full cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => {
              onCopyCode(student.access_code || '');
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 dark:bg-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 border border-slate-500/20 shadow-2xs">
              <ClipboardIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Salin Kode</p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{student.access_code}</p>
            </div>
          </button>
        )}

        {student.access_code && student.parent_phone && (
          <a
            href={createWhatsAppLink(
              student.parent_phone,
              generateAccessCodeMessage(
                student.name,
                student.access_code,
                student.parent_name
              )
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors sm:transition-all text-left w-full cursor-pointer active:bg-emerald-50 dark:active:bg-emerald-950/40 motion-reduce:transform-none motion-reduce:transition-none border border-emerald-200/80 dark:border-emerald-800/40"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20 shadow-2xs">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                Kirim Kode via WhatsApp
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                Ke {student.parent_name || 'Orang Tua'} ({student.parent_phone})
              </p>
            </div>
          </a>
        )}

        {student.parent_phone && !student.access_code && (
          <a
            href={createWhatsAppLink(
              student.parent_phone,
              `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu ${student.parent_name || 'wali murid'}, terkait siswa ananda ${student.name}...`
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors sm:transition-all text-left w-full cursor-pointer active:bg-emerald-50 dark:active:bg-emerald-950/40 motion-reduce:transform-none motion-reduce:transition-none border border-emerald-200/80 dark:border-emerald-800/40"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20 shadow-2xs">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                Hubungi Orang Tua (WhatsApp)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.parent_phone}</p>
            </div>
          </a>
        )}

        {(isAdmin || canManageActiveClass) ? <div className="h-px bg-slate-200/80 dark:bg-white/10 my-1"></div> : null}

        {(isAdmin || canManageActiveClass) ? (
          <button
            type="button"
            className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors sm:transition-all text-left w-full group cursor-pointer active:bg-rose-50 dark:active:bg-rose-950/30 motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => {
              onDelete(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/25 transition-colors shrink-0 border border-rose-500/20 shadow-2xs">
              <TrashIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">Hapus Siswa</p>
              <p className="text-xs text-rose-400/80 truncate">Pindahkan ke sampah (dapat dipulihkan)</p>
            </div>
          </button>
        ) : null}
      </div>
    </BottomSheet>
  );
};
