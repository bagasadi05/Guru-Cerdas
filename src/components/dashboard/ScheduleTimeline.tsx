/**
 * @fileoverview Schedule Timeline Component
 *
 * Renders today's schedule as a vertical timeline with live progress
 * indicators for currently-running classes.
 *
 * @module components/dashboard/ScheduleTimeline
 */

import React from 'react';
import { UsersIcon, ClockIcon, CalendarIcon } from '../Icons';
import { useI18n } from '../../utils/i18n';

interface ScheduleItem {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  class_id?: string | null;
  className: string | null;
}

interface ScheduleTimelineProps {
  schedule: ScheduleItem[];
  currentTime: Date;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ schedule, currentTime }) => {
  const { t } = useI18n();

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[160px] py-10 text-center text-slate-400 dark:text-slate-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <CalendarIcon className="w-7 h-7 opacity-30" />
        </div>
        <p className="font-medium">{t.dashboard.noScheduleToday}</p>
        <p className="text-xs mt-1 opacity-70">{t.dashboard.enjoyFreeTime}</p>
      </div>
    );
  }

  return (
    <div className="relative p-4 h-full">
      <div className="space-y-0 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3 pb-2">
        {schedule.map((item) => {
          const now = currentTime;
          const [startH, startM] = item.start_time.split(':').map(Number);
          const [endH, endM] = item.end_time.split(':').map(Number);
          const startTime = new Date(now);
          startTime.setHours(startH, startM, 0, 0);
          const endTime = new Date(now);
          endTime.setHours(endH, endM, 0, 0);
          const isPast = now > endTime;
          const isCurrent = now >= startTime && now <= endTime;

          let progressPercent = 0;
          let minutesRemaining = 0;
          if (isCurrent) {
            const totalDuration = endTime.getTime() - startTime.getTime();
            const elapsed = now.getTime() - startTime.getTime();
            progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
            minutesRemaining = Math.round((endTime.getTime() - now.getTime()) / 60000);
          }

          return (
            <div key={item.id} className="relative pl-8 pb-4 last:pb-0 group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-2.5 top-0 w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                  isCurrent
                    ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-900 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] scale-110'
                    : 'bg-slate-200 dark:bg-slate-800 border-white dark:border-slate-900'
                }`}
              ></div>

              {/* Schedule Card */}
              <div
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 shadow-md shadow-emerald-500/10 transform scale-[1.02]'
                    : 'bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10'
                } ${isPast ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <span
                      className={`text-xxs font-bold px-2 py-0.5 rounded-lg mb-1.5 inline-block tracking-wide ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.subject}
                    </h4>
                  </div>
                  {isCurrent && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                  {item.className}
                </p>
                {isCurrent && (
                  <div className="mt-2 mb-2">
                    <div className="flex justify-between text-xxs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      <span>{t.dashboard.inProgress} ({progressPercent}%)</span>
                      <span>{minutesRemaining} {t.dashboard.minutesRemaining}</span>
                    </div>
                    <div
                      className="w-full bg-emerald-100 dark:bg-emerald-950/40 rounded-full h-1 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Kemajuan: ${progressPercent}%`}
                    >
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{Math.round((endTime.getTime() - startTime.getTime()) / 60000)} {t.dashboard.minutesUnit}</span>
                  </div>
                  {(isCurrent || isPast) && item.class_id && (
                    <a
                      href={`/jurnal?classId=${item.class_id}&subject=${encodeURIComponent(item.subject)}&scheduleId=${item.id}&action=add`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                    >
                      Isi Jurnal
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleTimeline;
