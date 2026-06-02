import React from 'react';
import { type AttendanceStatus } from '../../types';

interface AttendanceSummaryWidgetProps {
    summary: Record<AttendanceStatus, number>;
    total: number;
    unmarked: number;
}

export const AttendanceSummaryWidget: React.FC<AttendanceSummaryWidgetProps> = ({ summary, total, unmarked }) => {
    // Keep all 5 categories in the list to maintain a perfectly balanced 5-column grid.
    const categories = [
        { label: 'Hadir', count: summary['Hadir'] || 0, color: 'text-emerald-500 dark:text-emerald-400', strokeColor: '#10b981', bg: 'bg-emerald-500/10' },
        { label: 'Sakit', count: summary['Sakit'] || 0, color: 'text-sky-500 dark:text-sky-400', strokeColor: '#0ea5e9', bg: 'bg-sky-500/10' },
        { label: 'Izin', count: summary['Izin'] || 0, color: 'text-amber-500 dark:text-amber-400', strokeColor: '#f59e0b', bg: 'bg-amber-500/10' },
        { label: 'Alpha', count: summary['Alpha'] || 0, color: 'text-rose-500 dark:text-rose-400', strokeColor: '#f43f5e', bg: 'bg-rose-500/10' },
        { label: 'Belum', count: unmarked, color: 'text-slate-400 dark:text-slate-500', strokeColor: '#64748b', bg: 'bg-slate-500/10' }
    ];

    const r = 50;
    const circ = 2 * Math.PI * r;
    
    let accumulatedPercent = 0;
    
    const segments = categories.map(cat => {
        const percent = total > 0 ? (cat.count / total) : 0;
        const dashArray = `${circ * percent} ${circ}`;
        const dashOffset = circ - (circ * accumulatedPercent);
        accumulatedPercent += percent;
        return {
            ...cat,
            dashArray,
            dashOffset,
            percent: Math.round(percent * 100)
        };
    });

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl flex flex-col md:flex-row items-center gap-6 mb-6 animate-fade-in-down">
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={r} fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
                    {/* Only render positive value segments in SVG to prevent overlapping 0-value dot caps */}
                    {total > 0 && segments.filter(seg => seg.count > 0).map((seg, i) => (
                        <circle
                            key={i}
                            cx="60"
                            cy="60"
                            r={r}
                            fill="transparent"
                            stroke={seg.strokeColor}
                            strokeWidth="12"
                            strokeDasharray={seg.dashArray}
                            strokeDashoffset={seg.dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{total}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Siswa</span>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3 w-full">
                {segments.map((seg, i) => (
                    <div key={i} className="p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]">
                        <span className={`text-xl font-black ${seg.color}`}>{seg.count}</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{seg.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{seg.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
