import React from 'react';
import type { CurriculumType } from '../../../../../types/perangkatAjar';
import type { ProtaFormData } from './types';

interface ProtaItemFormDrawerProps {
  isAdding: boolean;
  editingId: string | null;
  curriculum: CurriculumType;
  formData: ProtaFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProtaFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ProtaItemFormDrawer: React.FC<ProtaItemFormDrawerProps> = ({
  isAdding,
  editingId,
  curriculum,
  formData,
  setFormData,
  onSubmit,
  onCancel,
}) => {
  if (!isAdding) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="p-5 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {editingId ? 'Edit Materi Pelajaran' : 'Tambah Materi Pelajaran Baru'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
        >
          Batal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Pilihan Semester
          </label>
          <select
            value={formData.semesterNumber}
            onChange={(e) =>
              setFormData({ ...formData, semesterNumber: Number(e.target.value) as 1 | 2 })
            }
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value={1}>Semester 1 (Ganjil)</option>
            <option value={2}>Semester 2 (Genap)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {curriculum === 'K13' ? 'Kompetensi Inti (KI)' : 'Elemen / Domain Pembelajaran'}
          </label>
          <input
            type="text"
            placeholder={curriculum === 'K13' ? 'Contoh: KI-3 & KI-4' : 'Contoh: Menyimak / Bilangan'}
            value={formData.elementOrDomain}
            onChange={(e) => setFormData({ ...formData, elementOrDomain: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {curriculum === 'K13' ? 'Kode KD' : 'Kode TP'}
          </label>
          <input
            type="text"
            placeholder={curriculum === 'K13' ? 'Contoh: KD 3.1 / 4.1' : 'Contoh: TP 1.1'}
            value={formData.learningObjectiveCode}
            onChange={(e) => setFormData({ ...formData, learningObjectiveCode: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Alokasi Waktu (JP)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={formData.targetJp}
            onChange={(e) =>
              setFormData({ ...formData, targetJp: Math.max(1, parseInt(e.target.value, 10) || 1) })
            }
            className="w-full px-3 py-2 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {curriculum === 'K13' ? 'Uraian Kompetensi Dasar (KD)' : 'Uraian Tujuan Pembelajaran (TP)'}
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Peserta didik mampu memahami..."
            value={formData.learningObjectiveText}
            onChange={(e) => setFormData({ ...formData, learningObjectiveText: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Lingkup Materi / Topik Bahasan
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Operasi Hitung Bilangan Bulat..."
            value={formData.coreTopic}
            onChange={(e) => setFormData({ ...formData, coreTopic: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm cursor-pointer"
        >
          {editingId ? 'Simpan Perubahan Materi' : 'Simpan ke Program Tahunan'}
        </button>
      </div>
    </form>
  );
};
