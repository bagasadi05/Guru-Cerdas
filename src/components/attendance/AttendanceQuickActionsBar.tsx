import React from 'react';
import { QrCodeIcon, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { QuickTemplateIcons } from './QuickTemplateIcons';
import { attendanceViewModeOptions, type AttendanceViewMode } from './attendanceMenuConfig';

interface AttendanceQuickActionsBarProps {
  hasAttendanceRecords: boolean;
  viewMode: AttendanceViewMode;
  onApplyTemplate: (templateId: string) => void;
  onReset: () => void;
  onOpenQr: () => void;
  onViewModeChange: (mode: AttendanceViewMode) => void;
}

export const AttendanceQuickActionsBar: React.FC<AttendanceQuickActionsBarProps> = ({
  hasAttendanceRecords,
  viewMode,
  onApplyTemplate,
  onReset,
  onOpenQr,
  onViewModeChange,
}) => {
  return (
    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Aksi Cepat:
          </span>
          <QuickTemplateIcons onApplyTemplate={onApplyTemplate} />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            onClick={onReset}
            size="default"
            variant="ghost"
            className="text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 px-3 text-sm"
            aria-label="Reset absensi"
            disabled={!hasAttendanceRecords}
          >
            <RotateCcw className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <Button
            onClick={onOpenQr}
            size="default"
            variant="ghost"
            className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 px-3 text-sm"
            aria-label="Generate QR Code"
          >
            <QrCodeIcon className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">QR Code</span>
          </Button>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 ml-0 sm:ml-1">
            {attendanceViewModeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = viewMode === option.mode;
              return (
                <button
                  key={option.mode}
                  onClick={() => onViewModeChange(option.mode)}
                  className={`w-10 h-10 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
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
    </div>
  );
};
