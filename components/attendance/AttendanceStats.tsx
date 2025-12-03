import React from 'react';
import { AttendanceStatus } from '../../types';
import { statusOptions } from '../../constants';

interface AttendanceStatsProps {
    summary: Record<AttendanceStatus, number>;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ summary }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {statusOptions.map((opt) => (
                <div key={opt.value} className={`glass-card p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${opt.gradient}`}></div>
                    <div className={`w-10 h-10 rounded-full bg-${opt.color}-100 dark:bg-${opt.color}-900/30 flex items-center justify-center mb-2 text-${opt.color}-500 dark:text-${opt.color}-400`}>
                        <opt.icon className="w-5 h-5" />
                    </div>
                    <span className="text-3xl font-bold text-slate-800 dark:text-white">{summary[opt.value]}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{opt.label}</span>
                </div>
            ))}
        </div>
    );
};
