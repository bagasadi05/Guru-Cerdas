import React from 'react';
import { AttendanceStatus } from '../../types';
import { statusOptions } from '../../constants';

interface AttendanceStatsProps {
    summary: Record<AttendanceStatus, number>;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ summary }) => {
    return (
        <div className="grid grid-cols-4 gap-2 mb-6">
            {statusOptions.map((opt) => (
                <div
                    key={opt.value}
                    className={`glass-card p-3 rounded-xl border border-white/40 dark:border-white/5 shadow-sm flex flex-col items-center justify-center min-h-[100px] relative overflow-hidden group hover:shadow-md transition-all duration-300 card-interactive`}
                >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${opt.gradient}`}></div>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${opt.gradient} flex items-center justify-center mb-2 shadow-lg`}>
                        <opt.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[28px] font-extrabold leading-none text-slate-800 dark:text-white">{summary[opt.value]}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{opt.label}</span>
                </div>
            ))}
        </div>
    );
};
