/**
 * Recent Activity Timeline Component - ENHANCED
 * 
 * Shows recent user activities in a polished timeline format
 */

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Clock,
    CheckCircle,
    TrendingUp,
    MessageSquare,
    FileText,
    Award,
    AlertCircle,
    Activity,
    ChevronRight
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { DashboardPanel, DashboardPanelContent } from './DashboardPanel';

export interface ActivityItem {
    id: string;
    type: 'attendance' | 'grade' | 'communication' | 'task' | 'achievement' | 'alert';
    title: string;
    description: string;
    timestamp: Date;
    icon?: React.ReactNode;
    link?: string;
}

interface RecentActivityTimelineProps {
    activities: ActivityItem[];
    maxItems?: number;
}

const getActivityIcon = (type: ActivityItem['type']): React.ReactNode => {
    switch (type) {
        case 'attendance':
            return <CheckCircle className="w-4 h-4" />;
        case 'grade':
            return <TrendingUp className="w-4 h-4" />;
        case 'communication':
            return <MessageSquare className="w-4 h-4" />;
        case 'task':
            return <FileText className="w-4 h-4" />;
        case 'achievement':
            return <Award className="w-4 h-4" />;
        case 'alert':
            return <AlertCircle className="w-4 h-4" />;
        default:
            return <Clock className="w-4 h-4" />;
    }
};

const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
        case 'attendance':
            return {
                icon: 'bg-emerald-500 text-white',
                border: 'border-emerald-200 dark:border-emerald-700/50',
                bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
                text: 'text-emerald-700 dark:text-emerald-400',
            };
        case 'grade':
            return {
                icon: 'bg-blue-500 text-white',
                border: 'border-blue-200 dark:border-blue-700/50',
                bg: 'bg-blue-50/50 dark:bg-blue-900/10',
                text: 'text-blue-700 dark:text-blue-400',
            };
        case 'communication':
            return {
                icon: 'bg-purple-500 text-white',
                border: 'border-purple-200 dark:border-purple-700/50',
                bg: 'bg-purple-50/50 dark:bg-purple-900/10',
                text: 'text-purple-700 dark:text-purple-400',
            };
        case 'task':
            return {
                icon: 'bg-orange-500 text-white',
                border: 'border-orange-200 dark:border-orange-700/50',
                bg: 'bg-orange-50/50 dark:bg-orange-900/10',
                text: 'text-orange-700 dark:text-orange-400',
            };
        case 'achievement':
            return {
                icon: 'bg-yellow-500 text-white',
                border: 'border-yellow-200 dark:border-yellow-700/50',
                bg: 'bg-yellow-50/50 dark:bg-yellow-900/10',
                text: 'text-yellow-700 dark:text-yellow-400',
            };
        case 'alert':
            return {
                icon: 'bg-red-500 text-white',
                border: 'border-red-200 dark:border-red-700/50',
                bg: 'bg-red-50/50 dark:bg-red-900/10',
                text: 'text-red-700 dark:text-red-400',
            };
        default:
            return {
                icon: 'bg-gray-500 text-white',
                border: 'border-gray-200 dark:border-gray-700',
                bg: 'bg-gray-50/50 dark:bg-gray-900/10',
                text: 'text-gray-700 dark:text-gray-400',
            };
    }
};

const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;

    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

export const RecentActivityTimeline: React.FC<RecentActivityTimelineProps> = ({
    activities,
    maxItems = 5,
}) => {
    const [filter, setFilter] = useState<'all' | 'grade' | 'task' | 'attendance'>('all');
    const navigate = useNavigate();

    const filteredActivities = useMemo(() => {
        if (filter === 'all') return activities;
        return activities.filter(act => act.type === filter);
    }, [activities, filter]);

    const displayActivities = filteredActivities.slice(0, maxItems);

    if (activities.length === 0) {
        return (
            <DashboardPanel>
                <DashboardPanelContent>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Aktivitas Terbaru
                    </h2>
                </div>
                <EmptyState
                    icon={<Clock />}
                    title="Belum ada aktivitas"
                    description="Aktivitas Anda akan muncul di sini."
                />
                </DashboardPanelContent>
            </DashboardPanel>
        );
    }

    return (
        <DashboardPanel>
            <DashboardPanelContent>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Aktivitas Terbaru
                    </h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 dark:border-emerald-700/50 dark:bg-emerald-900/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xxs font-bold text-emerald-700 dark:text-emerald-400">Live</span>
                </div>
            </div>

            {/* Micro Filter Bar */}
            <div className="flex items-center gap-1.5 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 overflow-x-auto no-scrollbar whitespace-nowrap -mx-1 px-1">
                {[
                    { id: 'all', label: 'Semua' },
                    { id: 'grade', label: 'Nilai' },
                    { id: 'task', label: 'Tugas' },
                    { id: 'attendance', label: 'Absensi' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-all flex-shrink-0 ${
                            filter === tab.id
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:text-slate-400'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Timeline or Empty State */}
            {filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500">
                    <Clock className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada aktivitas</p>
                    <p className="text-xxs mt-0.5 opacity-70">Untuk kategori filter ini</p>
                </div>
            ) : (
                <div className="space-y-0 relative">
                    {displayActivities.map((activity, index) => {
                        const colors = getActivityColor(activity.type);
                        const isLast = index === displayActivities.length - 1;

                        const card = (
                            <div className={`group p-3 rounded-xl border ${colors.border} ${colors.bg} transition-all ${activity.link ? 'hover:shadow-md cursor-pointer' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-xs ${colors.text} mb-1`}>
                                            {activity.title}
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {activity.description}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                {formatTimeAgo(activity.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow indicator */}
                                    {activity.link && (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        );

                        return (
                            <div
                                key={activity.id}
                                className="relative pl-7 pb-5 last:pb-0"
                            >
                                {/* Timeline Line */}
                                {!isLast && (
                                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-800 dark:to-transparent" />
                                )}

                                {/* Icon */}
                                <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${colors.icon} flex items-center justify-center shadow-sm z-10`}>
                                    {activity.icon || React.cloneElement(getActivityIcon(activity.type) as React.ReactElement, { className: 'w-3 h-3' })}
                                </div>

                                {/* Content Card */}
                                {activity.link ? (
                                    <Link to={activity.link} className="ml-1.5 block">
                                        {card}
                                    </Link>
                                ) : (
                                    <div className="ml-1.5">
                                        {card}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* View All Button */}
            {filteredActivities.length > maxItems && (
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-850">
                    <button 
                        onClick={() => navigate('/riwayat')}
                        className="w-full px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-2 border border-emerald-200/50 dark:border-emerald-900/30 active:scale-[0.98]"
                    >
                        <span>Lihat Semua Aktivitas</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-800 rounded-full text-xxs">
                            {filteredActivities.length}
                        </span>
                    </button>
                </div>
            )}
            </DashboardPanelContent>
        </DashboardPanel>
    );
};

