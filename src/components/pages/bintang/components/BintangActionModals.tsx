import React from 'react';
import { Info } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { ViolationForm } from '../../student/forms/ViolationForm';
import { QuizForm } from '../../student/forms/QuizForm';
import { ViolationRow, QuizPointRow } from '../../student/types';
import { ViolationFormValues, QuizFormValues } from '../../student/schemas';

// ─── 1. Edit Violation Modal ─────────────────────────────────────────────────
interface EditViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingViolation: ViolationRow | null;
  studentName?: string;
  onSubmit: (values: ViolationFormValues, photoFile?: File | null) => Promise<void>;
  isSaving: boolean;
}

export const BintangEditViolationModal: React.FC<EditViolationModalProps> = ({
  isOpen,
  onClose,
  editingViolation,
  studentName = 'Siswa',
  onSubmit,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Pelanggaran: ${studentName}`}
      maxWidth="max-w-xl"
    >
      <div className="pt-4">
        {editingViolation && (
          <ViolationForm
            defaultValues={editingViolation}
            onSubmit={onSubmit}
            onClose={onClose}
            isPending={isSaving}
          />
        )}
      </div>
    </Modal>
  );
};

// ─── 2. Edit Quiz Modal ──────────────────────────────────────────────────────
interface EditQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuizPoint: QuizPointRow | null;
  studentName?: string;
  onSubmit: (values: QuizFormValues) => Promise<void>;
  isSaving: boolean;
}

export const BintangEditQuizModal: React.FC<EditQuizModalProps> = ({
  isOpen,
  onClose,
  editingQuizPoint,
  studentName = 'Siswa',
  onSubmit,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Poin Keaktifan: ${studentName}`}
      maxWidth="max-w-lg"
    >
      <div className="pt-4">
        {editingQuizPoint && (
          <QuizForm
            defaultValues={editingQuizPoint}
            onSubmit={onSubmit}
            onClose={onClose}
            isPending={isSaving}
          />
        )}
      </div>
    </Modal>
  );
};

// ─── 3. Observation Modal ────────────────────────────────────────────────────
interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Array<{ id: string; name: string }>;
  studentId: string;
  onStudentIdChange: (id: string) => void;
  aspect: string;
  onAspectChange: (aspect: string) => void;
  isPositive: boolean;
  onIsPositiveChange: (val: boolean) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export const BintangObservationModal: React.FC<ObservationModalProps> = ({
  isOpen,
  onClose,
  students,
  studentId,
  onStudentIdChange,
  aspect,
  onAspectChange,
  isPositive,
  onIsPositiveChange,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Input Observasi Harian"
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
          <Info size={18} className="text-brand-500 mt-0.5 shrink-0" />
          <p className="text-xs text-brand-700 dark:text-brand-300">
            Observasi adalah catatan harian guru. Tidak mempengaruhi skor otomatis — hanya sebagai referensi wali kelas saat evaluasi.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Siswa <span className="text-rose-500">*</span>
          </label>
          <CustomDropdown
            value={studentId}
            onChange={onStudentIdChange}
            placeholder="Pilih Siswa"
            options={students.map(s => ({ value: s.id, label: s.name }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Aspek BINTANG
          </label>
          <CustomDropdown
            value={aspect}
            onChange={onAspectChange}
            options={[
              { value: 'ADAB', label: 'Adab' },
              { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
              { value: 'KERAPIAN', label: 'Kerapian' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Tipe Observasi
          </label>
          <div className="flex gap-4 mt-2 mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="obsIsPositive"
                checked={isPositive === true}
                onChange={() => onIsPositiveChange(true)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-emerald-600 font-medium">Positif (Pujian)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="obsIsPositive"
                checked={isPositive === false}
                onChange={() => onIsPositiveChange(false)}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span className="text-rose-600 font-medium">Netral / Negatif</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Catatan Observasi <span className="text-rose-500">*</span>
          </label>
          <textarea
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Tuliskan catatan observasi harian..."
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={isSubmitting || !studentId || !notes}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── 4. Mentoring Modal ──────────────────────────────────────────────────────
interface MentoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onDateChange: (date: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
  mentoringClass: string;
  onMentoringClassChange: (classId: string) => void;
  classes: Array<{ id: string; name: string }>;
  targetType: 'all' | 'specific';
  onTargetTypeChange: (type: 'all' | 'specific') => void;
  studentsInClass: Array<{ id: string; name: string }>;
  selectedStudents: string[];
  onSelectedStudentsChange: (ids: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export const BintangMentoringModal: React.FC<MentoringModalProps> = ({
  isOpen,
  onClose,
  date,
  onDateChange,
  role,
  onRoleChange,
  mentoringClass,
  onMentoringClassChange,
  classes,
  targetType,
  onTargetTypeChange,
  studentsInClass,
  selectedStudents,
  onSelectedStudentsChange,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Pembinaan"
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
          <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peran Mentor</label>
          <CustomDropdown
            value={role}
            onChange={onRoleChange}
            options={[
              { value: 'WALAS', label: 'Wali Kelas' },
              { value: 'KESISWAAN', label: 'Kesiswaan' },
              { value: 'KEPSEK', label: 'Kepala Sekolah' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
          <CustomDropdown
            value={mentoringClass}
            onChange={onMentoringClassChange}
            placeholder="Pilih Kelas"
            options={classes.map(c => ({ value: c.id, label: c.name }))}
          />
        </div>

        {mentoringClass && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sasaran</label>
            <div className="flex gap-4 mt-2 mb-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="mentoringTargetType"
                  value="all"
                  checked={targetType === 'all'}
                  onChange={() => onTargetTypeChange('all')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Seluruh Siswa
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="mentoringTargetType"
                  value="specific"
                  checked={targetType === 'specific'}
                  onChange={() => onTargetTypeChange('specific')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Siswa Tertentu
              </label>
            </div>

            {targetType === 'all' && (
              <p className="text-xs text-slate-500">Pembinaan akan dicatat untuk seluruh {studentsInClass.length} siswa.</p>
            )}

            {targetType === 'specific' && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/50">
                {studentsInClass.length === 0 ? (
                  <p className="text-sm text-slate-500 p-2">Tidak ada siswa.</p>
                ) : (
                  <div className="space-y-1">
                    {studentsInClass.map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectedStudentsChange([...selectedStudents, student.id]);
                            } else {
                              onSelectedStudentsChange(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                          className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{student.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Materi / Catatan Pembinaan</label>
          <textarea
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Tuliskan catatan atau materi pembinaan..."
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={isSubmitting || !mentoringClass || !notes}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── 5. Mentoring Edit Modal ─────────────────────────────────────────────────
interface MentoringEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onDateChange: (date: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export const BintangMentoringEditModal: React.FC<MentoringEditModalProps> = ({
  isOpen,
  onClose,
  date,
  onDateChange,
  role,
  onRoleChange,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Catatan Pembinaan"
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
          <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peran Mentor</label>
          <CustomDropdown
            value={role}
            onChange={onRoleChange}
            options={[
              { value: 'WALAS', label: 'Wali Kelas' },
              { value: 'KESISWAAN', label: 'Kesiswaan' },
              { value: 'KEPSEK', label: 'Kepala Sekolah' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
          <textarea
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── 6. Download Progress Overlay Modal ──────────────────────────────────────
interface DownloadProgressModalProps {
  progress: { current: number; total: number } | null;
}

export const BintangDownloadProgressModal: React.FC<DownloadProgressModalProps> = ({ progress }) => {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="animate-spin h-7 w-7 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Mengunduh Rapor BINTANG
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Memproses {progress.total} siswa {progress.current > 0 ? '...' : ''}
          </p>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>
                Memproses siswa{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress.current}</span>
                {' / '}
                <span className="font-semibold">{progress.total}</span>
              </span>
              <span className="font-semibold">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`
                }}
              />
            </div>
          </div>

          {progress.current > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Menambahkan halaman rapor siswa ke-{progress.current}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
