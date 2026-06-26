import React from 'react';
import { DashboardPanel, DashboardPanelHeader, DashboardPanelContent } from './DashboardPanel';
import { CalendarIcon, UserCheckIcon, UsersIcon } from '../Icons';
import { useGlobalAnalytics } from '../../hooks/useGlobalAnalytics';

export const SchoolAttendanceWidget: React.FC = () => {
    const { data, loading } = useGlobalAnalytics();

    if (loading) {
        return (
            <DashboardPanel className="animate-pulse">
                <DashboardPanelHeader>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 w-1/3 rounded"></div>
                </DashboardPanelHeader>
                <DashboardPanelContent className="p-6">
                    <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                </DashboardPanelContent>
            </DashboardPanel>
        );
    }

    if (!data) return null;

    const { present, sick, permission, absent, total } = data.todayAttendance;
    const presentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return (
        <DashboardPanel>
            <DashboardPanelHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Rekap Absensi Hari Ini</h2>
                </div>
            </DashboardPanelHeader>
            <DashboardPanelContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tingkat Kehadiran Sekolah</p>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-slate-800 dark:text-white">{presentPercentage}%</span>
                            <span className="text-sm text-emerald-500 mb-1 font-medium">Bagus</span>
                        </div>
                    </div>
                    <div className="w-20 h-20 rounded-full border-8 border-slate-100 dark:border-slate-800 relative flex items-center justify-center overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle 
                                cx="40" 
                                cy="40" 
                                r="36" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                className="text-emerald-500" 
                                strokeDasharray="226.2" 
                                strokeDashoffset={226.2 - (226.2 * presentPercentage) / 100} 
                            />
                        </svg>
                        <UserCheckIcon className="w-6 h-6 text-emerald-500 z-10" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Hadir</span>
                        <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{present}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Sakit</span>
                        <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{sick}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Izin</span>
                        <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{permission}</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Alpha</span>
                        <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{absent}</p>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Siswa Terdata Absen</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{total}</span>
                </div>
            </DashboardPanelContent>
        </DashboardPanel>
    );
};
