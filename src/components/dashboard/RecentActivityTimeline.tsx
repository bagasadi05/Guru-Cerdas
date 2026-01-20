/**
 * Recent Activity Timeline Component - ENHANCED
 * 
 * Shows recent user activities in a polished timeline format
 */

import React from 'react';
import { Link } from 'react-router-dom';
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
    const displayActivities = activities.slice(0, maxItems);

    if (activities.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Aktivitas Terbaru
                    </h2>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                        Belum ada aktivitas
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        Aktivitas Anda akan muncul di sini
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Aktivitas Terbaru
                    </h2>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-700/50">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">Live</span>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-0 relative">
                {displayActivities.map((activity, index) => {
                    const colors = getActivityColor(activity.type);
                    const isLast = index === displayActivities.length - 1;

                    const card = (
                        <div className={`group p-3 rounded-xl border ${colors.border} ${colors.bg} transition-all ${activity.link ? 'hover:shadow-md cursor-pointer' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold text-sm ${colors.text} mb-1`}>
                                        {activity.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {activity.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            {formatTimeAgo(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>

                                {/* Arrow indicator */}
                                {activity.link && (
                                    <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                )}
                            </div>
                        </div>
                    );

                    return (
                        <div
                            key={activity.id}
                            className="relative pl-8 pb-6 last:pb-0"
                        >
                            {/* Timeline Line */}
                            {!isLast && (
                                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent dark:from-gray-700 dark:to-transparent" />
                            )}

                            {/* Icon */}
                            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center shadow-md z-10`}>
                                {activity.icon || getActivityIcon(activity.type)}
                            </div>

                            {/* Content Card */}
                            {activity.link ? (
                                <Link to={activity.link} className="ml-2 block">
                                    {card}
                                </Link>
                            ) : (
                                <div className="ml-2">
                                    {card}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* View All Button */}
            {activities.length > maxItems && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-700/50">
                        <span>Lihat Semua Aktivitas</span>
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 rounded-full text-xs">
                            {activities.length}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};
