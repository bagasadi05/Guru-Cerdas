import React from 'react';
import { ActionType, ActionHistoryItem } from '../../services/UndoManager';
import { SoftDeleteEntity } from '../../services/SoftDeleteService';

export interface ActionHistoryStats {
    total: number;
    undoable: number;
    create: number;
    update: number;
    delete: number;
}

export interface ActionTypeUIConfig {
    label: string;
    labelPast: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}

export interface EntityUIConfig {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

export interface ActionHistoryDateRange {
    start?: string;
    end?: string;
}

export type { ActionType, ActionHistoryItem, SoftDeleteEntity };
