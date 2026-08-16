import React, { useState, useMemo } from 'react';
import { Trash2, Clock, RefreshCw, AlertTriangle, Search, Filter, BookOpen, FileText, Heart, Eye, Copy, Download } from 'lucide-react';
import { useTranslation } from '../../../../utils/i18n';

interface ModulAjarHistoryProps {
  history: any[];
  isLoading: boolean;
  error?: string | null;
  onRestore: (plan: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onExportWord?: (item: any, e: React.MouseEvent) => void;
  onDuplicate?: (item: any, e: React.MouseEvent) => void;
}

export const ModulAjarHistory: React.FC<ModulAjarHistoryProps> = ({
  history,
  isLoading,
  error,
  onRestore,
  onDelete,
  onExportWord,
  onDuplicate
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Modul Ajar' | 'RPP' | 'KBC'>('all');

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Type filter
      if (filterType === 'Modul Ajar' && item.document_type !== 'Modul Ajar') return false;
      if (filterType === 'RPP' && item.document_type !== 'RPP') return false;
      if (filterType === 'KBC' && !item.identity?.isKbcIntegrated && item.identity?.curriculumApproach !== 'Berbasis Cinta') return false;

      // Text search
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const mapel = (item.identity?.mapel || '').toLowerCase();
      const topik = (item.identity?.topik || '').toLowerCase();
      const kelas = String(item.identity?.kelas || '').toLowerCase();
      const docType = (item.document_type || '').toLowerCase();
      const model = (item.identity?.modelPembelajaran || '').toLowerCase();

      return mapel.includes(query) || topik.includes(query) || kelas.includes(query) || docType.includes(query) || model.includes(query);
    });
  }, [history, searchTerm, filterType]);

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Search and Filters Bar */}
      {history.length > 0 && !isLoading && !error && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari mapel, topik, kelas, atau model pembelajaran..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {(['all', 'Modul Ajar', 'RPP', 'KBC'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                  filterType === type
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'Semua' : type === 'KBC' ? '❤️ KBC' : type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main List Area */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          <p className="text-sm font-medium">{t.lessonPlan.historyLoading}</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-700 dark:text-amber-300 p-8">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 p-8 space-y-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-slate-400 dark:text-slate-600" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-slate-700 dark:text-slate-200">Belum Ada Riwayat Modul Ajar</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.lessonPlan.historyEmpty}</p>
          </div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 p-6 space-y-2">
          <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-500">Tidak ada riwayat modul ajar yang cocok dengan pencarian "{searchTerm}".</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setFilterType('all'); }}
            className="text-xs text-brand-600 font-semibold hover:underline"
          >
            Reset Filter Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map(item => {
            const isKbc = item.identity?.isKbcIntegrated || item.identity?.curriculumApproach === 'Berbasis Cinta';

            return (
              <div
                key={item.id}
                onClick={() => onRestore(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRestore(item); } }}
                className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between group space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-md text-[10px] font-bold">
                        {item.document_type || 'Modul Ajar'}
                      </span>
                      {isKbc && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" /> KBC
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px]">
                        Kelas {item.identity?.kelas || '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onDuplicate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(item, e);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"
                          title="Duplikasi / Salin Draf Baru"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onExportWord && item.generated_content && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportWord(item, e);
                          }}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Unduh Word (.doc) Langsung"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => onDelete(item.id, e)}
                        aria-label={t.lessonPlan.rubricHapus}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                        title="Hapus riwayat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {item.identity?.mapel || 'Mata Pelajaran'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Topik:</span> {item.identity?.topik || '-'}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-medium truncate max-w-[150px]">
                    {item.identity?.modelPembelajaran || 'Merdeka'}
                  </span>
                  <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold group-hover:underline">
                    <Eye className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
