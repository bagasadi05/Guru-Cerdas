import React from 'react';
import { CircleIcon, PlayCircleIcon, CheckCircle2Icon } from '../../Icons';
import { supabase } from '../../../services/supabase';
import { ValidationService } from '../../../services/ValidationService';
import { ValidationRules } from '../../../types';
import { TaskRow, TaskStatus, TaskStatusUI } from './types';

// Native date helpers
export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// Parse YYYY-MM-DD as a local date to avoid timezone shifts.
export const parseDateOnly = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const formatDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const normalizeDueDateForInput = (dueDate: string | null) => {
    if (!dueDate) return '';
    if (isDateOnly(dueDate)) return dueDate;
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateInputValue(parsed);
};

export const formatDateDisplay = (dueDate: string) => {
    const date = isDateOnly(dueDate) ? parseDateOnly(dueDate) : new Date(dueDate);
    if (Number.isNaN(date.getTime())) return '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
};

export const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const now = new Date();
    if (isDateOnly(dueDate)) {
        const date = parseDateOnly(dueDate);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return endOfDay < now;
    }
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed < now;
};

export const renderDescription = (text: string | null) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
        if (urlRegex.test(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline font-medium break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

export const fetchTasks = async (userId: string): Promise<TaskRow[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const statusConfig: Record<TaskStatus, TaskStatusUI> = {
    todo: {
        title: 'Belum Mulai',
        icon: <CircleIcon className="w-4 h-4" />,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        textColor: 'text-slate-600 dark:text-slate-400'
    },
    in_progress: {
        title: 'Sedang Dikerjakan',
        icon: <PlayCircleIcon className="w-4 h-4" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-600 dark:text-blue-400'
    },
    done: {
        title: 'Selesai',
        icon: <CheckCircle2Icon className="w-4 h-4" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        textColor: 'text-emerald-600 dark:text-emerald-400'
    },
};

export const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const taskRules: ValidationRules = {
    title: [ValidationService.validators.required("Judul tugas harus diisi")]
};
