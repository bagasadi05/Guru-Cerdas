/**
 * Quick Action Cards Component
 * 
 * Provides quick access shortcuts to common teacher tasks
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    ClipboardCheck,
    TrendingUp,
    Clock,
    CheckSquare
} from 'lucide-react';

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    link: string;
    color: string;
    bgColor: string;
    count?: number;
    urgent?: boolean;
}

interface QuickActionCardsProps {
    pendingGrades?: number;
    incompleteTasks?: number;
}

export const QuickActionCards: React.FC<QuickActionCardsProps> = ({
    pendingGrades = 0,
    incompleteTasks = 0,
}) => {
    const quickActions: QuickAction[] = [
        {
            id: 'attendance',
            title: 'Isi Absensi',
            description: 'Catat kehadiran siswa hari ini',
            icon: <ClipboardCheck className="w-5 h-5" />,
            link: '/absensi',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            urgent: false,
        },
        {
            id: 'input-nilai',
            title: 'Input Nilai',
            description: 'Masukkan nilai siswa dengan cepat',
            icon: <TrendingUp className="w-5 h-5" />,
            link: '/input-massal', // Updated to point to mass input which is more useful
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            count: pendingGrades,
            urgent: pendingGrades > 10,
        },
        {
            id: 'tasks',
            title: 'Tugas & To-Do',
            description: 'Pantau tugas siswa dan reminder',
            icon: <CheckSquare className="w-5 h-5" />,
            link: '/tugas',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            count: incompleteTasks,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Aksi Cepat
                </h2>
                <Clock className="w-5 h-5 text-gray-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {quickActions.map((action) => (
                    <Link
                        key={action.id}
                        to={action.link}
                        className={`group relative p-4 rounded-xl ${action.bgColor} border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98] flex flex-col items-start h-full min-h-[120px]`}
                    >
                        <div className={`w-full ${action.color}`}>
                            {/* Icon */}
                            <div className="mb-4 p-3 bg-white/50 dark:bg-black/10 rounded-lg inline-block backdrop-blur-sm">
                                {React.cloneElement(action.icon as React.ReactElement, { className: "w-6 h-6" })}
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-base mb-2 line-clamp-1">
                                {action.title}
                            </h3>

                            {/* Description */}
                            <p className="text-sm opacity-90 line-clamp-2 leading-relaxed">
                                {action.description}
                            </p>

                            {/* Count Badge */}
                            {action.count !== undefined && action.count > 0 && (
                                <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold ${action.urgent
                                    ? 'bg-red-500 text-white'
                                    : 'bg-blue-500 text-white'
                                    } shadow-sm`}>
                                    {action.count}
                                </div>
                            )}

                            {/* Urgent Indicator */}
                            {action.urgent && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
