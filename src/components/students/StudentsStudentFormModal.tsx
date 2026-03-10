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
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="student-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nama Lengkap
          </label>
          <Input id="student-name" name="name" defaultValue={currentStudent?.name || ''} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="student-class" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Kelas
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
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <label
                className={`flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  genderSelection === 'Laki-laki'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    genderSelection === 'Laki-laki'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  L
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Laki-laki</span>
              </label>
              <label
                className={`flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  genderSelection === 'Perempuan'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    genderSelection === 'Perempuan'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  P
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Perempuan</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
