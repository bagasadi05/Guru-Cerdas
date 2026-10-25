import React from 'react';
import { BookOpen, FileText } from 'lucide-react';

interface ModulAjarMobileSwitcherProps {
  mobileActiveView: 'form' | 'preview';
  onViewChange: (view: 'form' | 'preview') => void;
  hasDocument: boolean;
}

export const ModulAjarMobileSwitcher: React.FC<ModulAjarMobileSwitcherProps> = ({
  mobileActiveView,
  onViewChange,
  hasDocument,
}) => {
  return (
    <div className="lg:hidden flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
      <button
        type="button"
        onClick={() => onViewChange('form')}
        className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          mobileActiveView === 'form'
            ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>1. Formulir Modul</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('preview')}
        className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          mobileActiveView === 'preview'
            ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>2. Pratinjau & Riwayat</span>
        {hasDocument && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
      </button>
    </div>
  );
};
