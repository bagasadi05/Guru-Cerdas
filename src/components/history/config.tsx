import React from 'react';
import {
    PlusCircle,
    Edit3,
    Trash2,
    Users,
    BookOpen,
    ClipboardCheck,
    FileText,
    AlertTriangle,
    Award,
    GraduationCap,
} from 'lucide-react';
import { ActionTypeUIConfig, EntityUIConfig, ActionType, SoftDeleteEntity } from './types';

// Action type configuration
export const actionTypeConfig: Record<ActionType, ActionTypeUIConfig> = {
    create: {
        label: 'Buat',
        labelPast: 'Dibuat',
        icon: <PlusCircle className="w-4 h-4" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    update: {
        label: 'Perbarui',
        labelPast: 'Diperbarui',
        icon: <Edit3 className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    delete: {
        label: 'Hapus',
        labelPast: 'Dihapus',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
    bulk_delete: {
        label: 'Hapus Massal',
        labelPast: 'Dihapus Massal',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
};

// Entity configuration
export const entityConfig: Partial<Record<SoftDeleteEntity, EntityUIConfig>> = {
    students: {
        label: 'Siswa',
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    classes: {
        label: 'Kelas',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    attendance: {
        label: 'Absensi',
        icon: <ClipboardCheck className="w-4 h-4" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
    },
    tasks: {
        label: 'Tugas',
        icon: <FileText className="w-4 h-4" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
    },
    violations: {
        label: 'Pelanggaran',
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
    },
    quiz_points: {
        label: 'Poin Kuis',
        icon: <Award className="w-4 h-4" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
    },
    academic_records: {
        label: 'Nilai Akademik',
        icon: <GraduationCap className="w-4 h-4" />,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
    },
};

// Entity labels (for backward compatibility)
export const entityLabels: Partial<Record<SoftDeleteEntity, string>> = {
    students: 'Siswa',
    classes: 'Kelas',
    attendance: 'Absensi',
    tasks: 'Tugas',
    violations: 'Pelanggaran',
    quiz_points: 'Poin Kuis',
    academic_records: 'Nilai Akademik',
};
