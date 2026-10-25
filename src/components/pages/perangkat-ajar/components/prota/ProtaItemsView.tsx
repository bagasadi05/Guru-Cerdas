import React from 'react';
import { Sparkles } from 'lucide-react';
import type { CurriculumType, ProtaItem } from '../../../../../types/perangkatAjar';
import { ProtaMobileCard } from './ProtaMobileCard';
import { ProtaDesktopRow } from './ProtaDesktopRow';

interface ProtaItemsViewProps {
  items: ProtaItem[];
  filteredItems: ProtaItem[];
  activeSemFilter: 'ALL' | 1 | 2;
  setActiveSemFilter: (filter: 'ALL' | 1 | 2) => void;
  curriculum: CurriculumType;
  onOpenWizard?: () => void;
  isFirstInSemester: (item: ProtaItem) => boolean;
  isLastInSemester: (item: ProtaItem) => boolean;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onSwapSemester?: (id: string) => void;
  onCreateModulAjar?: (item: ProtaItem) => void;
  onStartEdit: (item: ProtaItem) => void;
  onDeleteItem: (id: string) => void;
}

export const ProtaItemsView: React.FC<ProtaItemsViewProps> = ({
  items,
  filteredItems,
  activeSemFilter,
  setActiveSemFilter,
  curriculum,
  onOpenWizard,
  isFirstInSemester,
  isLastInSemester,
  onMoveItem,
  onSwapSemester,
  onCreateModulAjar,
  onStartEdit,
  onDeleteItem,
}) => {
  const sem1Count = items.filter((i) => i.semesterNumber === 1).length;
  const sem2Count = items.filter((i) => i.semesterNumber === 2).length;
  const totalAllocatedJp = filteredItems.reduce((acc, i) => acc + (i.targetJp || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Table Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="grid grid-cols-3 sm:flex gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSemFilter('ALL')}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
              activeSemFilter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSemFilter(1)}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
              activeSemFilter === 1
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Sem 1 ({sem1Count})</span>
            <span className="hidden sm:inline">Semester 1 ({sem1Count})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSemFilter(2)}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
              activeSemFilter === 2
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Sem 2 ({sem2Count})</span>
            <span className="hidden sm:inline">Semester 2 ({sem2Count})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Total Jam Alokasi:{' '}
          <strong className="text-slate-800 dark:text-slate-200">{totalAllocatedJp} JP</strong>
        </span>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredItems.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-500 text-xs space-y-3">
            <p>
              Belum ada data materi Program Tahunan. Ketuk{' '}
              <strong>Tambah Materi ({curriculum === 'K13' ? 'KD' : 'TP'})</strong> atau gunakan{' '}
              <strong>Panduan Cepat</strong>.
            </p>
            {onOpenWizard && (
              <div>
                <button
                  type="button"
                  onClick={onOpenWizard}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Mulai dengan Panduan Cepat</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <ProtaMobileCard
              key={item.id}
              item={item}
              index={index}
              isFirstInSemester={isFirstInSemester(item)}
              isLastInSemester={isLastInSemester(item)}
              onMoveItem={onMoveItem}
              onSwapSemester={onSwapSemester}
              onCreateModulAjar={onCreateModulAjar}
              onStartEdit={onStartEdit}
              onDeleteItem={onDeleteItem}
            />
          ))
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3 w-12 text-center">No</th>
              <th className="py-3 px-3 w-24 text-center">Semester</th>
              <th className="py-3 px-3 w-36">
                {curriculum === 'K13' ? 'Kompetensi Inti' : 'Elemen Pembelajaran'}
              </th>
              <th className="py-3 px-3 min-w-[240px]">
                {curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Tujuan Pembelajaran (TP)'}
              </th>
              <th className="py-3 px-3 w-48">Lingkup Materi</th>
              <th className="py-3 px-3 w-24 text-center">Alokasi JP</th>
              <th className="py-3 px-3 w-28 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="space-y-3 max-w-md mx-auto">
                    <p className="text-xs">
                      Belum ada materi. Tambahkan manual, atau pakai Panduan Cepat untuk membuat daftar materi beserta jamnya.
                    </p>
                    {onOpenWizard && (
                      <div>
                        <button
                          type="button"
                          onClick={onOpenWizard}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                          <span>Mulai dengan Panduan Cepat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <ProtaDesktopRow
                  key={item.id}
                  item={item}
                  index={index}
                  isFirstInSemester={isFirstInSemester(item)}
                  isLastInSemester={isLastInSemester(item)}
                  onMoveItem={onMoveItem}
                  onSwapSemester={onSwapSemester}
                  onCreateModulAjar={onCreateModulAjar}
                  onStartEdit={onStartEdit}
                  onDeleteItem={onDeleteItem}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
