import React from 'react';
import { scheduleViewModeOptions, type ScheduleViewMode } from './scheduleMenuConfig';
import { CustomDropdown } from '../ui/CustomDropdown';

interface ScheduleViewToolbarProps {
  viewMode: ScheduleViewMode;
  selectedDay: string;
  currentDaySessions: number;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  selectedClassId?: string;
  onClassChange?: (classId: string) => void;
  classes?: { id: string; name: string }[];
}

export const ScheduleViewToolbar: React.FC<ScheduleViewToolbarProps> = ({
  viewMode,
  selectedDay,
  currentDaySessions,
  onViewModeChange,
  selectedClassId = '',
  onClassChange,
  classes = [],
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-lg">
            {viewMode === 'daily' ? `${currentDaySessions} Sesi` : 'Mingguan'}
          </span>
          <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <span className="text-lg font-semibold text-slate-800 dark:text-white">
            {viewMode === 'daily' ? selectedDay : 'Ringkasan Minggu Ini'}
          </span>
        </h2>

        {onClassChange && classes.length > 0 && (
          <div className="w-44 sm:w-52 min-w-[160px]">
            <CustomDropdown
              value={selectedClassId}
              onChange={onClassChange}
              options={[
                { value: '', label: 'Semua Kelas' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder="Semua Kelas"
            />
          </div>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
        {scheduleViewModeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = viewMode === option.mode;
          return (
            <button type="button"
              key={option.mode}
              onClick={() => onViewModeChange(option.mode)}
              className={`p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 shadow text-green-600 dark:text-green-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={option.title}
              aria-pressed={isActive}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
