import React from 'react';
import { Database } from '../../../services/database.types';

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskStatusUI {
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    textColor: string;
}

export interface TaskStats {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
}
