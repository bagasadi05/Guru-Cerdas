import React from 'react';
import { ChevronUp, ChevronDown, ArrowLeftRight, FileText, Edit2, Trash2 } from 'lucide-react';
import type { ProtaItem } from '../../../../../types/perangkatAjar';

interface ProtaDesktopRowProps {
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

export const ProtaDesktopRow: React.FC<ProtaDesktopRowProps> = ({
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
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      <td className="py-3 px-3 text-center text-slate-400 font-mono">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-4 text-center">{index + 1}</span>
          {onMoveItem && (
            <div className="flex flex-col -space-y-1">
              <button
                type="button"
                disabled={isFirstInSemester}
                onClick={() => onMoveItem(item.id, 'up')}
                className="p-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Pindah ke atas"
                aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke atas`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isLastInSemester}
                onClick={() => onMoveItem(item.id, 'down')}
                className="p-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Pindah ke bawah"
                aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke bawah`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              item.semesterNumber === 1
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            }`}
          >
            Sem. {item.semesterNumber}
          </span>
          {onSwapSemester && (
            <button
              type="button"
              onClick={() => onSwapSemester(item.id)}
              className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title={`Pindahkan ke Semester ${item.semesterNumber === 1 ? 2 : 1}`}
              aria-label={`Pindahkan ${item.learningObjectiveCode || 'materi'} ke Semester ${
                item.semesterNumber === 1 ? 2 : 1
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
        {item.elementOrDomain || '-'}
      </td>
      <td className="py-3 px-3">
        <div className="space-y-0.5">
          {item.learningObjectiveCode && (
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block font-mono">
              {item.learningObjectiveCode}
            </span>
          )}
          <p className="text-xs leading-relaxed">{item.learningObjectiveText}</p>
        </div>
      </td>
      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{item.coreTopic || '-'}</td>
      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
        {item.targetJp} JP
      </td>
      <td className="py-3 px-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {onCreateModulAjar && (
            <button
              type="button"
              onClick={() => onCreateModulAjar(item)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
              title="Buat Modul Ajar dari materi ini"
              aria-label={`Buat Modul Ajar untuk ${item.learningObjectiveCode || 'materi ini'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onStartEdit(item)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Edit baris"
            aria-label={`Edit ${item.learningObjectiveCode || 'materi'}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="Hapus baris"
            aria-label={`Hapus ${item.learningObjectiveCode || 'materi'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
