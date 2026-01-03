/**
 * Quick Templates Modal for Attendance
 * 
 * Provides pre-defined attendance templates for quick marking
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import {
    CheckCircle,
    XCircle,
    Sparkles,
    Clock,
    Users,
    CalendarOff,
    Zap
} from 'lucide-react';
import { AttendanceStatus } from '../../types';

interface Template {
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

interface QuickTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyTemplate: (template: Template) => void;
    studentCount: number;
}

const templates: Template[] = [
    {
        id: 'all-present',
        name: 'Semua Hadir',
        description: 'Tandai semua siswa hadir',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-700/50',
        defaultStatus: 'Hadir',
        applyToAll: true,
    },
    {
        id: 'all-absent',
        name: 'Semua Alpha',
        description: 'Tandai semua siswa alpha',
        icon: <XCircle className="w-5 h-5" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-700/50',
        defaultStatus: 'Alpha',
        applyToAll: true,
    },
    {
        id: 'weekend',
        name: 'Libur Weekend',
        description: 'Kosongkan untuk hari libur',
        icon: <CalendarOff className="w-5 h-5" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-700/50',
        defaultStatus: 'Hadir', // Won't be used, just clear
        applyToAll: false,
    },
    {
        id: 'morning-rush',
        name: 'Hadir Pagi',
        description: 'Tandai sisa siswa hadir',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-700/50',
        defaultStatus: 'Hadir',
        applyToAll: false, // Only unmarked students
    },
    {
        id: 'quick-check',
        name: 'Cek Cepat',
        description: 'Tandai yang belum diisi sebagai hadir',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        borderColor: 'border-indigo-200 dark:border-indigo-700/50',
        defaultStatus: 'Hadir',
        applyToAll: false,
    },
];

export const QuickTemplatesModal: React.FC<QuickTemplatesModalProps> = ({
    isOpen,
    onClose,
    onApplyTemplate,
    studentCount,
}) => {
    const handleApply = (template: Template) => {
        onApplyTemplate(template);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Template Absensi Cepat"
            icon={<Sparkles className="w-5 h-5 text-purple-500" />}
        >
            <div className="space-y-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Users className="w-4 h-4" />
                        <p className="text-sm font-semibold">
                            {studentCount} siswa akan diproses
                        </p>
                    </div>
                    <p className="text-xs text-purple-500/80 dark:text-purple-400/70 mt-1">
                        Pilih template di bawah untuk mengisi absensi dengan cepat
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleApply(template)}
                            className={`group text-left p-4 rounded-2xl border-2 ${template.borderColor} ${template.bgColor} hover:shadow-lg transition-all hover:scale-105 active:scale-95`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl ${template.color} ${template.bgColor} flex items-center justify-center flex-shrink-0`}>
                                    {template.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold text-sm ${template.color} mb-1`}>
                                        {template.name}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {template.description}
                                    </p>
                                    <div className="mt-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                            {template.applyToAll ? 'Semua Siswa' : 'Siswa Belum Diisi'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </Modal>
    );
};
