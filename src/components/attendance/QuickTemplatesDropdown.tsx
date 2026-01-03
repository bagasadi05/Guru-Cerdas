/**
 * Quick Templates Dropdown for Attendance
 * 
 * Provides pre-defined attendance templates as a dropdown menu in quick actions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    CalendarOff,
    Zap,
    Sparkles,
    ChevronDown
} from 'lucide-react';
import { AttendanceStatus } from '../../types/enums';

export interface Template {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    defaultStatus: AttendanceStatus;
    applyToAll: boolean;
}

interface QuickTemplatesDropdownProps {
    onApplyTemplate: (template: Template) => void;
    studentCount: number;
}

const templates: Template[] = [
    {
        id: 'all-present',
        name: 'Semua Hadir',
        description: 'Tandai semua siswa hadir',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-700/50',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: true,
    },
    {
        id: 'all-absent',
        name: 'Semua Alpha',
        description: 'Tandai semua siswa alpha',
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-700/50',
        defaultStatus: AttendanceStatus.Alpha,
        applyToAll: true,
    },
    {
        id: 'weekend',
        name: 'Libur Weekend',
        description: 'Kosongkan untuk hari libur',
        icon: <CalendarOff className="w-4 h-4" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-700/50',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
    {
        id: 'morning-rush',
        name: 'Hadir Pagi',
        description: 'Tandai sisa siswa hadir',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-700/50',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
    {
        id: 'quick-check',
        name: 'Cek Cepat',
        description: 'Tandai yang belum diisi sebagai hadir',
        icon: <Zap className="w-4 h-4" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        borderColor: 'border-indigo-200 dark:border-indigo-700/50',
        defaultStatus: AttendanceStatus.Hadir,
        applyToAll: false,
    },
];

export const QuickTemplatesDropdown: React.FC<QuickTemplatesDropdownProps> = ({
    onApplyTemplate,
    studentCount,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleApply = (template: Template) => {
        onApplyTemplate(template);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                    text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20
                    font-medium text-sm transition-all duration-200
                    ${isOpen ? 'bg-green-50 dark:bg-green-900/20' : ''}
                `}
                aria-label="Template Cepat"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Template</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 sm:left-0 top-full mt-2 z-50 w-72 sm:w-80
                        bg-white dark:bg-slate-800 rounded-2xl shadow-xl
                        border border-slate-200 dark:border-slate-700
                        animate-fade-in-up overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Template Cepat</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{studentCount} siswa</p>
                            </div>
                        </div>
                    </div>

                    {/* Template Options */}
                    <div className="p-2 max-h-80 overflow-y-auto">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleApply(template)}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl
                                    text-left transition-all duration-200
                                    hover:${template.bgColor} hover:scale-[1.02] active:scale-[0.98]
                                    group
                                `}
                            >
                                <div className={`
                                    w-9 h-9 rounded-xl ${template.bgColor} ${template.color}
                                    flex items-center justify-center flex-shrink-0
                                    border ${template.borderColor}
                                    group-hover:shadow-md transition-shadow
                                `}>
                                    {template.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className={`text-sm font-bold ${template.color}`}>
                                        {template.name}
                                    </h5>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {template.description}
                                    </p>
                                </div>
                                <span className={`
                                    text-[10px] px-2 py-0.5 rounded-full
                                    bg-slate-100 dark:bg-slate-700
                                    text-slate-500 dark:text-slate-400
                                    whitespace-nowrap
                                `}>
                                    {template.applyToAll ? 'Semua' : 'Kosong'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
