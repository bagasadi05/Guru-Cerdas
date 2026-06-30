import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { BarChart3Icon, PieChartIcon } from 'lucide-react';
import { DailyAttendance, AttendanceStats } from './types';

interface AttendanceTabProps {
    dailyAttendance: DailyAttendance[];
    attendanceStats: AttendanceStats;
    titleContext?: string;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ dailyAttendance, attendanceStats, titleContext }) => {
    
    const SimpleBarChart = ({ data, subtitle }: { data: DailyAttendance[]; subtitle?: string }) => {
        const maxTotal = Math.max(...data.map(d => d.total), 1);
        const chartHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 160 : 220;
        const barWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12;
        const barGap = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 6;

        const yAxisSteps = 4;
        const stepValue = Math.ceil(maxTotal / yAxisSteps);
        const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => stepValue * (yAxisSteps - i));

        const labelInterval = data.length > 20 ? 5 : data.length > 10 ? 3 : 2;
        const [animated, setAnimated] = useState(false);
        useEffect(() => {
            const timer = setTimeout(() => setAnimated(true), 100);
            return () => clearTimeout(timer);
        }, []);

        return (
            <div className="relative" id="tour-charts">
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>}
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:absolute sm:top-0 sm:right-0 mb-2 sm:mb-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                        <span className="text-slate-500 dark:text-slate-400">Hadir</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-rose-400" />
                        <span className="text-slate-500 dark:text-slate-400">Tidak Hadir</span>
                    </div>
                </div>

                <div className="flex mt-4 sm:mt-8 overflow-hidden">
                    <div className="flex-shrink-0 flex flex-col justify-between pr-2 sm:pr-3 text-right" style={{ height: `${chartHeight}px` }}>
                        {yAxisLabels.map((val, i) => (
                            <span key={i} className="text-xxs text-slate-500 dark:text-slate-400 leading-none">{val}</span>
                        ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden min-w-0">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: `${chartHeight}px` }}>
                            {yAxisLabels.map((_, i) => (
                                <div key={i} className="w-full border-t border-slate-700/30 dark:border-slate-600/20" style={{ opacity: i === yAxisLabels.length - 1 ? 1 : 0.5 }} />
                            ))}
                        </div>

                        <div className="flex items-end relative z-10 overflow-x-auto pb-1 scrollbar-hide" style={{ height: `${chartHeight}px`, gap: `${barGap}px` }}>
                            {data.map((day, i) => {
                                const totalHeight = maxTotal > 0 ? (day.total / maxTotal) * chartHeight : 0;
                                const hadirHeight = day.total > 0 ? (day.hadir / day.total) * totalHeight : 0;
                                const tidakHadirHeight = totalHeight - hadirHeight;

                                return (
                                    <div key={i} className="flex flex-col items-center group relative" style={{ minWidth: `${barWidth}px` }}>
                                        <div className="relative flex flex-col-reverse overflow-hidden transition-all duration-700 ease-out"
                                            style={{ width: `${barWidth}px`, height: animated ? `${totalHeight}px` : '0px', borderRadius: '6px 6px 2px 2px' }}>
                                            <div className="w-full bg-emerald-500 transition-all duration-300" style={{ height: `${hadirHeight}px` }} />
                                            {tidakHadirHeight > 0 && (
                                                <div className="w-full bg-gradient-to-t from-orange-500 to-rose-400 transition-all duration-300" style={{ height: `${tidakHadirHeight}px` }} />
                                            )}
                                        </div>
                                        <div className="absolute bottom-full mb-3 hidden group-hover:block z-30 pointer-events-none animate-fade-in">
                                            <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/50 min-w-[180px]">
                                                <p className="font-bold text-sm text-white mb-2">{day.date}</p>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between"><span className="text-green-400">Hadir</span><span>{day.hadir}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-blue-400">Izin</span><span>{day.izin}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-amber-400">Sakit</span><span>{day.sakit}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-rose-400">Alpha</span><span>{day.alpha}</span></div>
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between"><span className="text-slate-400">Total</span><span>{day.total}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-3" style={{ paddingRight: `${barGap}px` }}>
                            {data.map((day, i) => {
                                const showLabel = i % labelInterval === 0 || i === data.length - 1;
                                return (
                                    <div key={i} className="flex-1 text-center" style={{ minWidth: `${barWidth}px` }}>
                                        {showLabel && (
                                            <span className="text-xxs text-slate-500 whitespace-nowrap inline-block transform -rotate-30" style={{ transform: 'rotate(-30deg)' }}>
                                                {day.date.substring(5)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Summary stats below chart */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="text-center p-2 rounded-lg bg-green-500/10">
                        <p className="text-base sm:text-lg font-bold text-green-500">{data.reduce((sum, d) => sum + d.hadir, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Hadir</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-500/10">
                        <p className="text-base sm:text-lg font-bold text-blue-500">{data.reduce((sum, d) => sum + d.izin, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Izin</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10">
                        <p className="text-base sm:text-lg font-bold text-amber-500">{data.reduce((sum, d) => sum + d.sakit, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Sakit</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-rose-500/10">
                        <p className="text-base sm:text-lg font-bold text-rose-500">{data.reduce((sum, d) => sum + d.alpha, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Alpha</p>
                    </div>
                </div>
            </div>
        );
    };

    const SimplePieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const gradientParts: string[] = [];
        let currentPercent = 0;

        data.forEach((item) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            if (percent > 0) {
                gradientParts.push(`${item.color} ${currentPercent}% ${currentPercent + percent}%`);
                currentPercent += percent;
            }
        });

        const conicGradient = gradientParts.length > 0 ? `conic-gradient(from 0deg, ${gradientParts.join(', ')})` : 'conic-gradient(from 0deg, #e2e8f0 0% 100%)';

        return (
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center" style={{ background: conicGradient }}>
                    <div className="w-28 h-28 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col items-center justify-center shadow-inner">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
                        <span className="text-xxs text-slate-500">Total Absen</span>
                    </div>
                </div>
                <div className="flex-1 space-y-3 min-w-[200px]">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3Icon className="w-5 h-5 text-indigo-600" />
                        Tren Kehadiran
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {dailyAttendance.length > 0 ? (
                        <SimpleBarChart data={dailyAttendance} subtitle={titleContext} />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            Tidak ada data kehadiran
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-indigo-600" />
                        Proporsi Status Kehadiran
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {attendanceStats.total > 0 ? (
                        <SimplePieChart
                            data={[
                                { label: 'Hadir', value: attendanceStats.hadir, color: '#22c55e' },
                                { label: 'Izin', value: attendanceStats.izin, color: '#3b82f6' },
                                { label: 'Sakit', value: attendanceStats.sakit, color: '#f59e0b' },
                                { label: 'Alpha', value: attendanceStats.alpha, color: '#ef4444' },
                            ]}
                        />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            Belum ada rekap data
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
