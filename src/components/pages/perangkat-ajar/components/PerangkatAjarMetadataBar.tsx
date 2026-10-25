import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CurriculumType, PhaseType } from '../../../../types/perangkatAjar';
import type { ProtaSummary } from '../../../../services/perangkatAjarService';
import { getAcademicYearOptions } from '../../../../utils/kaldikEngine';
import { formatDocumentLabel } from '../types/perangkatAjarPageTypes';

interface PerangkatAjarMetadataBarProps {
  protaId: string;
  documentOptions: ProtaSummary[];
  isKnownDocument: boolean;
  hasItems: boolean;
  academicYear: string;
  subject: string;
  gradeLevel: string;
  phase: PhaseType | undefined;
  curriculum: CurriculumType;
  onSwitchDocument: (id: string) => void;
  onNewProta: () => void;
  onDeleteDocument: () => void;
  onChangeAcademicYear: (year: string) => void;
  onChangeSubject: (subject: string) => void;
  onChangeGradeLevel: (grade: string) => void;
  onChangePhase: (phase: PhaseType | undefined) => void;
  onChangeCurriculum: (curriculum: CurriculumType) => void;
}

export const PerangkatAjarMetadataBar: React.FC<PerangkatAjarMetadataBarProps> = ({
  protaId,
  documentOptions,
  isKnownDocument,
  hasItems,
  academicYear,
  subject,
  gradeLevel,
  phase,
  curriculum,
  onSwitchDocument,
  onNewProta,
  onDeleteDocument,
  onChangeAcademicYear,
  onChangeSubject,
  onChangeGradeLevel,
  onChangePhase,
  onChangeCurriculum,
}) => {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="prota-document-picker"
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Dokumen Prota
          </label>
          <select
            id="prota-document-picker"
            value={protaId}
            onChange={(e) => onSwitchDocument(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            {documentOptions.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.id === protaId && !isKnownDocument
                  ? `${formatDocumentLabel(doc)} (belum tersimpan)`
                  : formatDocumentLabel(doc)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onNewProta}
          className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Prota baru</span>
        </button>
        {(isKnownDocument || hasItems) && (
          <button
            type="button"
            onClick={onDeleteDocument}
            aria-label="Hapus dokumen Prota ini"
            title="Hapus dokumen ini beserta Promes-nya (bisa dibatalkan sesaat)"
            className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={academicYear}
            aria-label="Pilih Tahun Ajaran"
            onChange={(e) => onChangeAcademicYear(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            {getAcademicYearOptions(new Date(), academicYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            aria-label="Mata Pelajaran"
            placeholder="Mata Pelajaran"
            onChange={(e) => onChangeSubject(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Kelas
          </label>
          <input
            type="text"
            value={gradeLevel}
            aria-label="Tingkat Kelas"
            placeholder="Kelas 4"
            onChange={(e) => onChangeGradeLevel(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Fase Belajar
          </label>
          <select
            value={phase || 'B'}
            aria-label="Fase Kurikulum Merdeka"
            onChange={(e) => onChangePhase((e.target.value as PhaseType) || undefined)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="A">Fase A (Kelas 1-2 SD)</option>
            <option value="B">Fase B (Kelas 3-4 SD)</option>
            <option value="C">Fase C (Kelas 5-6 SD)</option>
            <option value="D">Fase D (Kelas 7-9 SMP)</option>
            <option value="E">Fase E (Kelas 10 SMA)</option>
            <option value="F">Fase F (Kelas 11-12 SMA)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Kurikulum
          </label>
          <select
            value={curriculum}
            aria-label="Format Kurikulum"
            onChange={(e) => onChangeCurriculum(e.target.value as CurriculumType)}
            className="w-full min-h-[40px] px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="MERDEKA">Kurikulum Merdeka</option>
            <option value="K13">Kurikulum 2013 (K-13)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
