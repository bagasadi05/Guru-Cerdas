import React from 'react';
import { Search } from 'lucide-react';
import { useGlobalSearch } from './GlobalSearchContext';

export const SearchTrigger: React.FC<{ className?: string; iconOnly?: boolean }> = ({ className = '', iconOnly = false }) => {
    const { open } = useGlobalSearch();

    if (iconOnly) {
        return (
            <button
                onClick={open}
                className={`flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors border border-slate-200/10 dark:border-slate-700/20 flex-shrink-0 ${className}`}
                aria-label="Cari"
            >
                <Search className="w-4.5 h-4.5" />
            </button>
        );
    }

    return (
        <button
            onClick={open}
            className={`flex items-center justify-center sm:justify-between gap-2 w-10 h-10 sm:w-[340px] sm:h-10 px-0 sm:px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors border border-slate-200/10 dark:border-slate-700/20 flex-shrink-0 ${className}`}
        >
            <div className="flex items-center justify-center sm:justify-start gap-2 overflow-hidden flex-1 text-left">
                <Search className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs truncate flex-1 max-w-[240px]">
                    Cari siswa, kelas, tugas, atau nilai...
                </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xxs font-bold shadow-sm flex-shrink-0">
                ⌘K
            </kbd>
        </button>
    );
};
