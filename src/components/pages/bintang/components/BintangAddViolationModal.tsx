import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { Input } from '../../../ui/Input';
import { ViolationForm } from '../../student/forms/ViolationForm';
import { ViolationFormValues } from '../../student/schemas';

interface BintangAddViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputMode: 'single' | 'bulk';
  onInputModeChange: (mode: 'single' | 'bulk') => void;
  studentId: string;
  onStudentIdChange: (id: string) => void;
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  studentSearch: string;
  onStudentSearchChange: (val: string) => void;
  students: Array<{ id: string; name: string }>;
  filteredStudents: Array<{ id: string; name: string }>;
  onSubmit: (values: ViolationFormValues, photoFile?: File | null) => Promise<void>;
  isSaving: boolean;
}

export const BintangAddViolationModal: React.FC<BintangAddViolationModalProps> = ({
  isOpen,
  onClose,
  inputMode,
  onInputModeChange,
  studentId,
  onStudentIdChange,
  selectedStudentIds,
  onToggleStudent,
  onSelectAll,
  onDeselectAll,
  studentSearch,
  onStudentSearchChange,
  students,
  filteredStudents,
  onSubmit,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Pelanggaran"
      maxWidth="max-w-xl"
    >
      <div className="pt-2 space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <ShieldAlert size={18} className="text-rose-500 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-700 dark:text-rose-300">
            Pelanggaran yang dicatat akan menambah poin aspek BINTANG siswa (Adab / Disiplin / Rapi) dan menyesuaikan grade otomatis.
          </p>
        </div>

        {/* ─── Input Mode Toggle ─── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onInputModeChange('single')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              inputMode === 'single'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Per Siswa
          </button>
          <button
            type="button"
            onClick={() => onInputModeChange('bulk')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              inputMode === 'bulk'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Pilih Banyak Siswa ({students.length} siswa)
          </button>
        </div>

        {/* ─── Student Selection ─── */}
        {inputMode === 'single' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Siswa <span className="text-rose-500">*</span>
            </label>
            <CustomDropdown
              value={studentId}
              onChange={onStudentIdChange}
              placeholder="Pilih siswa..."
              options={students.map(s => ({ value: s.id, label: s.name }))}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pilih Siswa ({selectedStudentIds.length} dipilih) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors font-medium"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={onDeselectAll}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Hapus Semua
              </button>
            </div>
            <Input
              placeholder="Cari nama siswa..."
              value={studentSearch}
              onChange={(e) => onStudentSearchChange(e.target.value)}
              className="mb-2 text-sm"
            />
            <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-800/50 space-y-0.5">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-slate-500 p-2 text-center">Tidak ada siswa ditemukan</p>
              ) : (
                filteredStudents.map(student => (
                  <label
                    key={student.id}
                    className={`flex items-center gap-3 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      selectedStudentIds.includes(student.id)
                        ? 'bg-rose-100 dark:bg-rose-900/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => onToggleStudent(student.id)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{student.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <ViolationForm
          defaultValues={null}
          onSubmit={onSubmit}
          onClose={onClose}
          isPending={isSaving}
        />
      </div>
    </Modal>
  );
};
