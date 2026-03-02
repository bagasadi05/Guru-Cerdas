/**
 * Quick Template Icons for Attendance
 * 
 * Displays template options as inline icons in the quick actions bar
 */

import React from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    CalendarOff,
    Zap
} from 'lucide-react';
import { AttendanceStatus } from '../../types/enums';

export interface Template {
    id: string;
    name: string;
    shortName: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    iconBg: string;
    hoverColor: string;
    defaultStatus: AttendanceStatus;
    applyToAll: boolean;
}

interface QuickTemplateIconsProps {
    onApplyTemplate: (template: Template) => void;
}

const templates: Template[] = [
    {
        id: 'all-present',
        name: 'Semua Hadir',
        shortName: 'Hadir',
        description: 'Tandai semua siswa hadir',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-emerald-500',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-900/30',
        hoverColor: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: true,
    },
    {
        id: 'all-absent',
        name: 'Semua Alpha',
        shortName: 'Alpha',
        description: 'Tandai semua siswa alpha',
        icon: <XCircle className="w-5 h-5" />,
        color: 'text-red-500',
        iconBg: 'bg-red-500/10 dark:bg-red-900/30',
        hoverColor: 'hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600',
        defaultStatus: AttendanceStatus.Alpha,
        applyToAll: true,
    },
    {
        id: 'weekend',
        name: 'Libur',
        shortName: 'Libur',
        description: 'Tandai semua siswa sebagai hari libur',
        icon: <CalendarOff className="w-5 h-5" />,
        color: 'text-purple-500',
        iconBg: 'bg-purple-500/10 dark:bg-purple-900/30',
        hoverColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600',
        defaultStatus: AttendanceStatus.Libur,
        applyToAll: true,
    },
    {
        id: 'morning-rush',
        name: 'Hadir Pagi',
        shortName: 'Sisa',
        description: 'Tandai sisa siswa hadir',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-500',
        iconBg: 'bg-orange-500/10 dark:bg-orange-900/30',
        hoverColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
    {
        id: 'quick-check',
        name: 'Cek Cepat',
        shortName: 'Cek',
        description: 'Tandai yang belum diisi sebagai hadir',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-emerald-500',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-900/30',
        hoverColor: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
];

export const QuickTemplateIcons: React.FC<QuickTemplateIconsProps> = ({
    onApplyTemplate,
}) => {
    return (
        <div className="flex-1 flex flex-wrap items-center justify-start sm:justify-between gap-2 px-1 sm:px-4">
            {templates.map((template) => (
                <button
                    key={template.id}
                    onClick={() => onApplyTemplate(template)}
                    className={`
                        group flex flex-col items-center justify-center gap-1
                        w-16 sm:w-20 min-h-[64px] px-2 py-2 rounded-xl
                        transition-all duration-200 active:scale-95
                        hover:bg-slate-100/70 dark:hover:bg-slate-800/60
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
                    `}
                    title={template.description}
                    aria-label={template.name}
                >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${template.iconBg} ${template.color}`}>
                        {template.icon}
                    </span>
                    <span className="sm:hidden text-[11px] leading-tight font-medium text-slate-600 dark:text-slate-300">
                        {template.shortName}
                    </span>
                    <span className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-300">
                        {template.name}
                    </span>
                </button>
            ))}
        </div>
    );
};
