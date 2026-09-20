import React from 'react';
import { Link } from 'react-router-dom';
import BottomSheet from '../ui/BottomSheet';
import { ClipboardIcon, EyeIcon, KeyRoundIcon, PencilIcon, TrashIcon } from '../Icons';
import { StudentRow } from './types';

interface StudentActionSheetProps {
  student: StudentRow | null;
  isOpen: boolean;
  onClose: () => void;
  canManageActiveClass: boolean;
  onEdit: (student: StudentRow) => void;
  onDelete: (student: StudentRow) => void;
  onCopyCode: (code: string) => void;
  onGenerateCodeInfo: () => void;
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
  onGenerateCodeInfo,
  isAdmin = false,
}) => {
  if (!student) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={student.name || 'Aksi Siswa'}>
      <div className="flex flex-col gap-2">
        <Link
          to={`/siswa/${student.id}`}
          className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer active:scale-[0.98]"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
            <EyeIcon className="w-5 h-5" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Lihat Detail</p>
            <p className="text-xs text-gray-500 truncate">Lihat profil, nilai, dan absensi</p>
          </div>
        </Link>

        {canManageActiveClass || isAdmin ? (
          <button type="button"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left w-full cursor-pointer active:scale-[0.98]"
            onClick={() => {
              onEdit(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <PencilIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Edit Data</p>
              <p className="text-xs text-gray-500 truncate">Ubah nama, kelas, atau foto</p>
            </div>
          </button>
        ) : null}

        {canManageActiveClass && !student.access_code && (
          <button type="button"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left w-full cursor-pointer active:scale-[0.98]"
            onClick={() => {
              onGenerateCodeInfo();
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <KeyRoundIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Buat Kode Akses</p>
              <p className="text-xs text-gray-500 truncate">Generate kode login siswa</p>
            </div>
          </button>
        )}

        {canManageActiveClass && student.access_code && (
          <button type="button"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left w-full cursor-pointer active:scale-[0.98]"
            onClick={() => {
              onCopyCode(student.access_code || '');
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 shrink-0">
              <ClipboardIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Salin Kode</p>
              <p className="text-xs font-mono text-gray-500 truncate">{student.access_code}</p>
            </div>
          </button>
        )}

        {(isAdmin || canManageActiveClass) ? <div className="h-px bg-gray-200 dark:bg-gray-800 my-1"></div> : null}

        {(isAdmin || canManageActiveClass) ? (
          <button type="button"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-left w-full group cursor-pointer active:scale-[0.98]"
            onClick={() => {
              onDelete(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors shrink-0">
              <TrashIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-red-600 dark:text-red-400 text-sm">Hapus Siswa</p>
              <p className="text-xs text-red-400/70 truncate">Pindahkan ke sampah (dapat dipulihkan)</p>
            </div>
          </button>
        ) : null}
      </div>
    </BottomSheet>
  );
};
