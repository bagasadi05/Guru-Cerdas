import React from 'react';

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
  if (classes.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {classes.map((classItem) => (
          <button
            key={classItem.id}
            onClick={() => onSelectClass(classItem.id)}
            className={`h-9 sm:h-10 px-4 rounded-full font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
              selectedClass === classItem.id
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {classItem.name}
          </button>
        ))}
      </div>
    </div>
  );
};
