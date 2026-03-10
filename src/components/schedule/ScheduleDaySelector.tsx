import React from 'react';

interface ScheduleDaySelectorProps {
  days: string[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  getDayNumber: (dayName: string) => string | number;
}

export const ScheduleDaySelector: React.FC<ScheduleDaySelectorProps> = ({
  days,
  selectedDay,
  onSelectDay,
  getDayNumber,
}) => {
  const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-6 sm:gap-3 lg:gap-4 sm:overflow-visible sm:pb-0">
      {days.map((day) => {
        const isToday = day === todayName;
        const isSelected = selectedDay === day;

        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className={`
              relative flex flex-col items-center justify-center gap-1.5
              min-w-[52px] h-16 flex-shrink-0 snap-center rounded-2xl transition-all duration-300
              sm:min-w-0 sm:w-full sm:h-[72px] lg:h-[80px]
              ${
                isSelected
                  ? 'bg-[#10B981] text-white shadow-lg shadow-green-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50'
              }
            `}
          >
            <span
              className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-green-100' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {day.substring(0, 3)}
            </span>
            <span className="text-xl sm:text-2xl font-bold">{getDayNumber(day)}</span>
            {isToday && (
              <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
