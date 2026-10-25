import React from 'react';
import type { CurriculumType } from '../../../../../types/perangkatAjar';
import { getAcademicYearOptions } from '../../../../../utils/kaldikEngine';
import { COMMON_SUBJECTS, GRADE_LEVELS } from './types';

interface WizardStepIdentityProps {
  gradeLevel: string;
  onGradeLevelChange: (grade: string) => void;
  subject: string;
  onSubjectChange: (sub: string) => void;
  customSubject: string;
  onCustomSubjectChange: (custom: string) => void;
  curriculum: CurriculumType;
  onCurriculumChange: (curriculum: CurriculumType) => void;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  initialAcademicYear: string;
}

export const WizardStepIdentity: React.FC<WizardStepIdentityProps> = ({
  gradeLevel,
  onGradeLevelChange,
  subject,
  onSubjectChange,
  customSubject,
  onCustomSubjectChange,
  curriculum,
  onCurriculumChange,
  academicYear,
  onAcademicYearChange,
  initialAcademicYear,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          1. Pilih Kelas
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {GRADE_LEVELS.map((g) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => onGradeLevelChange(g.grade)}
              className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                gradeLevel === g.grade
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400'
              }`}
            >
              <div>{g.grade}</div>
              <div
                className={`text-[10px] font-normal ${
                  gradeLevel === g.grade ? 'text-brand-100' : 'text-slate-400'
                }`}
              >
                Fase {g.phase}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          2. Pilih Mata Pelajaran
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {COMMON_SUBJECTS.map((sub) => {
            const isSelected = subject === sub && !customSubject.trim();
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  onSubjectChange(sub);
                  onCustomSubjectChange('');
                }}
                className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
            Atau ketik nama mata pelajaran lain:
          </span>
          <input
            type="text"
            value={customSubject}
            onChange={(e) => onCustomSubjectChange(e.target.value)}
            placeholder="Contoh: Bahasa Jawa / Seni Musik / Koding & Robotik"
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kurikulum Pembelajaran
          </label>
          <select
            value={curriculum}
            onChange={(e) => onCurriculumChange(e.target.value as CurriculumType)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="MERDEKA">Kurikulum Merdeka</option>
            <option value="K13">Kurikulum 2013 (K-13)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={academicYear}
            onChange={(e) => onAcademicYearChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
          >
            {getAcademicYearOptions(new Date(), initialAcademicYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
