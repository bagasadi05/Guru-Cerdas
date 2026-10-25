import React from 'react';

interface SegmentedModeControlProps {
  activeTabMode: 'single' | 'comparative';
  onTabChange: (mode: 'single' | 'comparative') => void;
}

export const SegmentedModeControl: React.FC<SegmentedModeControlProps> = ({
  activeTabMode,
  onTabChange,
}) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
        <button
          type="button"
          onClick={() => onTabChange('single')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'single'
              ? 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl text-brand-600 dark:text-brand-400 shadow-sm transform scale-102 font-bold'
              : 'text-slate-605 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
          }`}
        >
          <span>🎯</span> Analisis Semester Aktif
        </button>
        <button
          type="button"
          onClick={() => onTabChange('comparative')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTabMode === 'comparative'
              ? 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl text-brand-600 dark:text-brand-400 shadow-sm transform scale-102 font-bold'
              : 'text-slate-605 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
          }`}
        >
          <span>📊</span> Perbandingan Semester 1 & 2
        </button>
      </div>
    </div>
  );
};
