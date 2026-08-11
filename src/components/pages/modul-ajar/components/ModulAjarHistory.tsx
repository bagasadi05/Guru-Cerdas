import React from 'react';
import { Trash2, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../../../utils/i18n';

interface ModulAjarHistoryProps {
  history: any[];
  isLoading: boolean;
  error?: string | null;
  onRestore: (plan: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const ModulAjarHistory: React.FC<ModulAjarHistoryProps> = ({
  history,
  isLoading,
  error,
  onRestore,
  onDelete
}) => {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-4xl space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          {t.lessonPlan.historyLoading}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 p-8">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
          <p className="text-sm">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 p-8">
          <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm">{t.lessonPlan.historyEmpty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map(item => (
            <div
              key={item.id}
              onClick={() => onRestore(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRestore(item); } }}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-md text-[10px] font-bold">
                    {item.document_type}
                  </span>
                  <button
                    onClick={(e) => onDelete(item.id, e)}
                    aria-label={t.lessonPlan.rubricHapus}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{item.identity?.mapel}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{t.lessonPlan.historyTopik} {item.identity?.topik}</p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                <span>{t.lessonPlan.historyKelas} {item.identity?.kelas} ({item.identity?.fase})</span>
                <span>{new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
