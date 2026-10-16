import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { QuickTemplateIcons, type Template } from './QuickTemplateIcons';
import { attendanceViewModeOptions, type AttendanceViewMode } from './attendanceMenuConfig';
import { attendanceCopy } from '../../locales/attendance';
import { useI18n } from '../../utils/i18n';

interface AttendanceQuickActionsBarProps {
  hasAttendanceRecords: boolean;
  viewMode: AttendanceViewMode;
  onApplyTemplate: (template: Template) => void;
  onReset: () => void;
  onViewModeChange: (mode: AttendanceViewMode) => void;
}

export const AttendanceQuickActionsBar: React.FC<AttendanceQuickActionsBarProps> = ({
  hasAttendanceRecords,
  viewMode,
  onApplyTemplate,
  onReset,
  onViewModeChange,
}) => {
  const { language } = useI18n();
  const copy = attendanceCopy[language];
  return (
    <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
      <div className="flex flex-wrap gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <QuickTemplateIcons onApplyTemplate={onApplyTemplate} />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            onClick={onReset}
            size="default"
            variant="ghost"
            className="text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 !px-2 text-xs rounded-xl !min-h-11 !h-11"
            aria-label="Reset absensi"
            disabled={!hasAttendanceRecords}
          >
            <RotateCcw className="w-4 h-4 sm:mr-1.5" />
            <span>{copy.reset}</span>
          </Button>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 ml-0 sm:ml-1">
            {attendanceViewModeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = viewMode === option.mode;
              return (
                <button type="button"
                  key={option.mode}
                  onClick={() => onViewModeChange(option.mode)}
                  className={`w-11 h-11 rounded-lg cursor-pointer active:scale-95 transition-all duration-150 flex items-center justify-center ${
                    isActive
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  aria-label={option.ariaLabel}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.quickHint}</p>
    </div>
  );
};
