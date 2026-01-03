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
    description: string;
    icon: React.ReactNode;
    color: string;
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
        description: 'Tandai semua siswa hadir',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-emerald-500',
        hoverColor: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: true,
    },
    {
        id: 'all-absent',
        name: 'Semua Alpha',
        description: 'Tandai semua siswa alpha',
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-500',
        hoverColor: 'hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600',
        defaultStatus: AttendanceStatus.Alpha,
        applyToAll: true,
    },
    {
        id: 'weekend',
        name: 'Libur',
        description: 'Kosongkan untuk hari libur',
        icon: <CalendarOff className="w-4 h-4" />,
        color: 'text-purple-500',
        hoverColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
    {
        id: 'morning-rush',
        name: 'Hadir Pagi',
        description: 'Tandai sisa siswa hadir',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-orange-500',
        hoverColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
    {
        id: 'quick-check',
        name: 'Cek Cepat',
        description: 'Tandai yang belum diisi sebagai hadir',
        icon: <Zap className="w-4 h-4" />,
        color: 'text-indigo-500',
        hoverColor: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
];

export const QuickTemplateIcons: React.FC<QuickTemplateIconsProps> = ({
    onApplyTemplate,
}) => {
    return (
        <div className="flex-1 flex items-center justify-around gap-1 sm:gap-2 px-2 sm:px-4">
            {templates.map((template) => (
                <button
                    key={template.id}
                    onClick={() => onApplyTemplate(template)}
                    className={`
                        flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200
                        ${template.color} ${template.hoverColor}
                        active:scale-95 text-xs sm:text-sm font-medium
                    `}
                    title={template.description}
                    aria-label={template.name}
                >
                    {template.icon}
                    <span className="hidden lg:inline">{template.name}</span>
                </button>
            ))}
        </div>
    );
};
