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
}) => {
  if (!student) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={student.name || 'Aksi Siswa'}>
      <div className="flex flex-col gap-2">
        <Link
          to={`/siswa/${student.id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <EyeIcon className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Lihat Detail</p>
            <p className="text-xs text-gray-500">Lihat profil, nilai, dan absensi</p>
          </div>
        </Link>

        {canManageActiveClass ? (
          <button
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            onClick={() => {
              onEdit(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PencilIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-gray-900 dark:text-gray-100">Edit Data</p>
              <p className="text-xs text-gray-500">Ubah nama, kelas, atau foto</p>
            </div>
          </button>
        ) : null}

        {canManageActiveClass && !student.access_code && (
          <button
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            onClick={() => {
              onGenerateCodeInfo();
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRoundIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-gray-900 dark:text-gray-100">Buat Kode Akses</p>
              <p className="text-xs text-gray-500">Generate kode login siswa</p>
            </div>
          </button>
        )}

        {canManageActiveClass && student.access_code && (
          <button
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            onClick={() => {
              onCopyCode(student.access_code || '');
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
              <ClipboardIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-gray-900 dark:text-gray-100">Salin Kode</p>
              <p className="text-xs text-gray-500">{student.access_code}</p>
            </div>
          </button>
        )}

        {canManageActiveClass ? <div className="h-px bg-gray-200 dark:bg-gray-800 my-1"></div> : null}

        {canManageActiveClass ? (
          <button
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left group"
            onClick={() => {
              onDelete(student);
              onClose();
            }}
          >
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <TrashIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-red-600 dark:text-red-400">Hapus Siswa</p>
              <p className="text-xs text-red-400/70">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </button>
        ) : null}
      </div>
    </BottomSheet>
  );
};
