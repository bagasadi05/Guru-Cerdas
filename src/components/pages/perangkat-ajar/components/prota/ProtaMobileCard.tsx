import React from 'react';
import { ChevronUp, ChevronDown, ArrowLeftRight, FileText, Edit2, Trash2 } from 'lucide-react';
import type { ProtaItem } from '../../../../../types/perangkatAjar';

interface ProtaMobileCardProps {
  item: ProtaItem;
  index: number;
  isFirstInSemester: boolean;
  isLastInSemester: boolean;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onSwapSemester?: (id: string) => void;
  onCreateModulAjar?: (item: ProtaItem) => void;
  onStartEdit: (item: ProtaItem) => void;
  onDeleteItem: (id: string) => void;
}

export const ProtaMobileCard: React.FC<ProtaMobileCardProps> = ({
  item,
  index,
  isFirstInSemester,
  isLastInSemester,
  onMoveItem,
  onSwapSemester,
  onCreateModulAjar,
  onStartEdit,
  onDeleteItem,
}) => {
  return (
    <div className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 font-bold">#{index + 1}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              item.semesterNumber === 1
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            }`}
          >
            Sem. {item.semesterNumber}
          </span>
          {item.elementOrDomain && (
            <span className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
              {item.elementOrDomain}
            </span>
          )}
        </div>
        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {item.targetJp} JP
        </span>
      </div>

      <div className="space-y-1">
        {item.learningObjectiveCode && (
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
            {item.learningObjectiveCode}
          </span>
        )}
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
          {item.learningObjectiveText}
        </p>
        {item.coreTopic && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <strong className="text-slate-600 dark:text-slate-300">Materi:</strong> {item.coreTopic}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onMoveItem && (
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
              <button
                type="button"
                disabled={isFirstInSemester}
                onClick={() => onMoveItem(item.id, 'up')}
                className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Pindah urutan ke atas"
                aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke atas`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                disabled={isLastInSemester}
                onClick={() => onMoveItem(item.id, 'down')}
                className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Pindah urutan ke bawah"
                aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke bawah`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
          {onSwapSemester && (
            <button
              type="button"
              onClick={() => onSwapSemester(item.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
              title={`Pindah ke Semester ${item.semesterNumber === 1 ? 2 : 1}`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-brand-500" />
              <span>Ke Sem {item.semesterNumber === 1 ? '2' : '1'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onCreateModulAjar && (
            <button
              type="button"
              onClick={() => onCreateModulAjar(item)}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/40 active:scale-95 transition-all cursor-pointer"
              aria-label={`Buat Modul Ajar untuk ${item.learningObjectiveCode || 'materi ini'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Modul Ajar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onStartEdit(item)}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
            aria-label={`Edit ${item.learningObjectiveCode || 'materi'}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 active:scale-95 transition-all cursor-pointer"
            aria-label={`Hapus ${item.learningObjectiveCode || 'materi'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
};
