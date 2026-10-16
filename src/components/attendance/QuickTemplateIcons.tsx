/**
 * Quick Template Icons for Attendance
 * 
 * Displays template options as inline icons in the quick actions bar
 */

import React from 'react';
import {
    CheckCircle,
    CalendarOff,
} from 'lucide-react';
import { AttendanceStatus } from '../../types/enums';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';

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
];

export const QuickTemplateIcons: React.FC<QuickTemplateIconsProps> = ({
    onApplyTemplate,
}) => {
    const { language } = useI18n();
    const copy = attendanceCopy[language];
    return (
        <div className="flex flex-wrap items-center gap-2">
            {templates.map((template) => (
                <button
                    key={template.id}
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onApplyTemplate(template);
                    }}
                    className={`
                        group flex items-center justify-center gap-1.5
                        min-h-11 px-2.5 py-2 rounded-xl
                        transition-all duration-200 active:scale-95 cursor-pointer
                        hover:bg-slate-100/70 dark:hover:bg-slate-800/60
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
                    `}
                    title={template.description}
                    aria-label={template.id === 'all-present' ? copy.allPresent : copy.allHoliday}
                >
                    <span className={`shrink-0 ${template.color}`}>
                        {template.icon}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {template.id === 'all-present' ? copy.allPresent : copy.allHoliday}
                    </span>
                </button>
            ))}
        </div>
    );
};
