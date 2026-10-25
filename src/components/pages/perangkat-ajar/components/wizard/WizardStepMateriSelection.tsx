import React from 'react';
import { Sparkles, Layers, Bot, Loader2 } from 'lucide-react';
import type { CurriculumType, ProtaItem } from '../../../../../types/perangkatAjar';
import type { AiProtaTopics } from '../../../../../services/protaAiGenerator';

interface WizardStepMateriSelectionProps {
  curriculum: CurriculumType;
  effectiveSubject: string;
  gradeLevel: string;
  presetAvailable: boolean;
  materiMethod: 'preset' | 'divide' | 'ai';
  onMateriMethodChange: (method: 'preset' | 'divide' | 'ai') => void;
  aiStatus: 'idle' | 'loading' | 'error';
  aiError: string;
  aiTopics: AiProtaTopics | null;
  onGenerateWithAi: () => Promise<void>;
  numChaptersSem1: number;
  onNumChaptersSem1Change: (n: number) => void;
  numChaptersSem2: number;
  onNumChaptersSem2Change: (n: number) => void;
  generatedProtaItems: ProtaItem[];
  totalAllocatedSem1: number;
  totalAllocatedSem2: number;
}

export const WizardStepMateriSelection: React.FC<WizardStepMateriSelectionProps> = ({
  curriculum,
  effectiveSubject,
  gradeLevel,
  presetAvailable,
  materiMethod,
  onMateriMethodChange,
  aiStatus,
  aiError,
  aiTopics,
  onGenerateWithAi,
  numChaptersSem1,
  onNumChaptersSem1Change,
  numChaptersSem2,
  onNumChaptersSem2Change,
  generatedProtaItems,
  totalAllocatedSem1,
  totalAllocatedSem2,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Pilih Cara Menentukan Materi & Tujuan Pembelajaran (TP):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onMateriMethodChange('preset')}
            disabled={!presetAvailable}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
              materiMethod === 'preset'
                ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Daftar Bab Bawaan
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {presetAvailable
                ? `Bab, elemen, dan TP contoh dari buku Kurikulum Merdeka ${effectiveSubject} ${gradeLevel}. Periksa dan sesuaikan dengan TP sekolah.`
                : `Belum tersedia untuk ${effectiveSubject} ${gradeLevel}${curriculum === 'K13' ? ' (K-13)' : ''}. Pakai AI atau pembagian per bab.`}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onMateriMethodChange('divide')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              materiMethod === 'divide'
                ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              Bagi Rata Berdasarkan Jumlah Bab
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Cukup tentukan berapa bab per semester. Sistem membagi rata seluruh jam tanpa perlu hitung rumus.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onMateriMethodChange('ai')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer sm:col-span-2 ${
              materiMethod === 'ai'
                ? 'bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-950/40 dark:border-brand-500 dark:text-brand-200 font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-brand-600" />
              Susun dengan AI
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              AI membuat draf elemen, TP, dan bab untuk {effectiveSubject} {gradeLevel}. Jamnya tetap dihitung dari Kaldik.
              Periksa kesesuaiannya dengan CP terbaru sebelum dipakai.
            </p>
          </button>
        </div>
      </div>

      {materiMethod === 'ai' && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
          <button
            type="button"
            onClick={() => void onGenerateWithAi()}
            disabled={aiStatus === 'loading'}
            className="flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-60"
          >
            {aiStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            <span>
              {aiStatus === 'loading' ? 'AI sedang menyusun...' : aiTopics ? 'Buat ulang dengan AI' : 'Buat dengan AI'}
            </span>
          </button>
          {aiStatus === 'error' && <p className="text-rose-600 dark:text-rose-400">{aiError}</p>}
          {aiTopics && aiStatus !== 'loading' && (
            <p className="text-slate-500 dark:text-slate-400">Draf dari AI. Periksa dan sunting di tab Prota setelah diterapkan.</p>
          )}
        </div>
      )}

      {materiMethod === 'divide' && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Berapa bab / lingkup materi yang diajarkan?
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Jumlah Bab Semester 1:
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={numChaptersSem1}
                onChange={(e) => onNumChaptersSem1Change(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Jumlah Bab Semester 2:
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={numChaptersSem2}
                onChange={(e) => onNumChaptersSem2Change(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview of chapters generated */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Pratinjau Materi yang Akan Dibuat ({generatedProtaItems.length} Materi):
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Total {totalAllocatedSem1 + totalAllocatedSem2} JP materi
          </span>
        </div>
        <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 text-xs">
          {generatedProtaItems.map((item, idx) => (
            <div
              key={idx}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-2"
            >
              <div className="truncate flex-1">
                <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                  {item.semesterNumber === 1 ? '[Sem 1]' : '[Sem 2]'} {item.learningObjectiveCode}:
                </span>
                <span className="text-slate-600 dark:text-slate-300">{item.coreTopic}</span>
              </div>
              <span className="font-bold text-brand-600 dark:text-brand-400 text-xs shrink-0">
                {item.targetJp} JP
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
