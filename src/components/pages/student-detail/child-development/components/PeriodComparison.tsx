import React from 'react';

export const PeriodComparison: React.FC<{
  currentAvg: number;
  previousAvg: number;
  label: string;
}> = ({ currentAvg, previousAvg, label }) => {
  const diff = currentAvg - previousAvg;
  const percentChange = previousAvg > 0 ? ((diff / previousAvg) * 100).toFixed(1) : 0;
  const isImproved = diff > 0;
  const isDeclined = diff < 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{currentAvg}</span>
        {previousAvg > 0 && (
          <span className={`text-sm font-medium flex items-center gap-1 ${isImproved ? 'text-green-500' : isDeclined ? 'text-red-500' : 'text-gray-400'
            }`}>
            {isImproved ? '↑' : isDeclined ? '↓' : '→'} {Math.abs(Number(percentChange))}%
          </span>
        )}
      </div>
      {previousAvg > 0 && (
        <p className="text-xs text-gray-400 mt-1">Sebelumnya: {previousAvg}</p>
      )}
    </div>
  );
};