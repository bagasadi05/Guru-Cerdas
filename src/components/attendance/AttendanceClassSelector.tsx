import React, { useMemo, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';

interface AttendanceClassSelectorProps {
  classes: Array<{ id: string; name: string }>;
  selectedClass: string;
  onSelectClass: (classId: string) => void;
}

export const AttendanceClassSelector: React.FC<AttendanceClassSelectorProps> = ({
  classes,
  selectedClass,
  onSelectClass,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort classes naturally (1A, 1B, 1C, 2A, 2B, 2C, 3A, etc.)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [classes]);

  // Scroll selected class pill into view automatically
  useEffect(() => {
    if (!containerRef.current || !selectedClass) return;
    const selectedEl = containerRef.current.querySelector<HTMLElement>(`[data-class-id="${selectedClass}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedClass]);

  if (classes.length === 0) return null;

  const currentClassName = classes.find(c => c.id === selectedClass)?.name || 'Pilih Kelas';

  return (
    <div className="mb-5 sm:mb-6" data-tutorial="class-selector">
      {/* Header Indicator */}
      <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
          Pilihan Kelas <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">({sortedClasses.length})</span>
        </span>
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
          Aktif: {currentClassName}
        </span>
      </div>

      {/* Class Pills - Horizontal Scroll on Mobile, Wrapped Grid on Larger Screens */}
      <div 
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 px-0.5 -mx-1 scrollbar-none snap-x sm:flex-wrap sm:overflow-visible"
      >
        {sortedClasses.map((classItem) => {
          const isSelected = selectedClass === classItem.id;
          return (
            <button
              type="button"
              key={classItem.id}
              data-class-id={classItem.id}
              onClick={() => onSelectClass(classItem.id)}
              data-tutorial="class-pill"
              className={`h-9 sm:h-10 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 snap-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {classItem.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
