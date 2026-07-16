import React from 'react';
import { Trash2, Clock, RefreshCw } from 'lucide-react';

interface ModulAjarHistoryProps {
  history: any[];
  isLoading: boolean;
  onRestore: (plan: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const ModulAjarHistory: React.FC<ModulAjarHistoryProps> = ({
  history,
  isLoading,
  onRestore,
  onDelete
}) => {
  return (
    <div className="w-full max-w-4xl space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          Memuat riwayat pembuatan...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 p-8">
          <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm">Anda belum memiliki riwayat pembuatan modul ajar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map(item => (
            <div 
              key={item.id}
              onClick={() => onRestore(item)}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md text-[10px] font-bold">
                    {item.document_type}
                  </span>
                  <button 
                    onClick={(e) => onDelete(item.id, e)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{item.identity?.mapel}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Topik: {item.identity?.topik}</p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                <span>Kelas {item.identity?.kelas} ({item.identity?.fase})</span>
                <span>{new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
