import React from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ClassRow, StudentRow } from './types';

interface StudentsStudentFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  currentStudent: StudentRow | null;
  activeClassId: string;
  classes: ClassRow[];
  genderSelection: 'Laki-laki' | 'Perempuan';
  onGenderChange: (gender: 'Laki-laki' | 'Perempuan') => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}

export const StudentsStudentFormModal: React.FC<StudentsStudentFormModalProps> = ({
  isOpen,
  mode,
  currentStudent,
  activeClassId,
  classes,
  genderSelection,
  onGenderChange,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Tambah Siswa Baru' : 'Edit Siswa'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="student-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <Input
            id="student-name"
            name="name"
            defaultValue={currentStudent?.name || ''}
            placeholder="Masukkan nama lengkap siswa..."
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="student-class" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Kelas <span className="text-rose-500">*</span>
          </label>
          <Select
            id="student-class"
            name="class_id"
            defaultValue={currentStudent?.class_id || activeClassId}
            required
          >
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Jenis Kelamin <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3.5">
            <label
              className={`flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                genderSelection === 'Laki-laki'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value="Laki-laki"
                checked={genderSelection === 'Laki-laki'}
                onChange={() => onGenderChange('Laki-laki')}
                className="sr-only"
              />
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  genderSelection === 'Laki-laki'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                L
              </span>
              <span className="text-sm font-medium whitespace-nowrap">Laki-laki</span>
            </label>

            <label
              className={`flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                genderSelection === 'Perempuan'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value="Perempuan"
                checked={genderSelection === 'Perempuan'}
                onChange={() => onGenderChange('Perempuan')}
                className="sr-only"
              />
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  genderSelection === 'Perempuan'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                P
              </span>
              <span className="text-sm font-medium whitespace-nowrap">Perempuan</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[90px]">
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
