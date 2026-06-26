import React from 'react';
import { DashboardPanel, DashboardPanelHeader, DashboardPanelContent } from './DashboardPanel';
import { AlertTriangleIcon, TrendingDownIcon, UsersIcon } from '../Icons';
import { useGlobalAnalytics } from '../../hooks/useGlobalAnalytics';

export const SchoolViolationsWidget: React.FC = () => {
    const { data, loading } = useGlobalAnalytics();

    if (loading) {
        return (
            <DashboardPanel className="animate-pulse">
                <DashboardPanelHeader>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 w-1/3 rounded"></div>
                </DashboardPanelHeader>
                <DashboardPanelContent className="p-6">
                    <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4"></div>
                    <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                </DashboardPanelContent>
            </DashboardPanel>
        );
    }

    if (!data) return null;

    return (
        <DashboardPanel>
            <DashboardPanelHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <TrendingDownIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Analitik Pelanggaran Sekolah</h2>
                </div>
            </DashboardPanelHeader>
            <DashboardPanelContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Siswa Bermasalah</span>
                            <UsersIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-white">{data.totalStudentsWithViolations}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Siswa Kritis (&gt;50 Poin)</span>
                            <AlertTriangleIcon className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">{data.criticalStudentsCount}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Distribusi Poin per Kelas (Top 5)</h3>
                        <div className="space-y-3">
                            {data.violationsByClass.slice(0, 5).map((vc, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{vc.className}</span>
                                    <div className="flex items-center gap-3 w-1/2">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-red-400 rounded-full"
                                                style={{ width: `${Math.min(100, (vc.totalPoints / Math.max(1, data.violationsByClass[0].totalPoints)) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-10 text-right">{vc.totalPoints}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pelanggaran Terbaru</h3>
                        <div className="space-y-2">
                            {data.recentViolations.slice(0, 3).map((v, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{v.studentName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{v.className} • {new Date(v.date).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                                        +{v.points} Poin
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DashboardPanelContent>
        </DashboardPanel>
    );
};
