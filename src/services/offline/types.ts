import type { Database } from '../database.types';

export type MutationStatus = 'pending' | 'processing' | 'failed' | 'success';

export type QueuedMutation = {
    id: string;
    table: keyof Database['public']['Tables'] | 'rpc';
    operation: 'upsert' | 'insert' | 'update' | 'delete';
    payload: Record<string, unknown> | Record<string, unknown>[];
    onConflict?: string;
    status: MutationStatus;
    retryCount: number;
    maxRetries: number;
    createdAt: number;
    lastAttempt?: number;
    error?: string;
    userId?: string | null;
    request?: {
        url: string;
        method: string;
        body: string | null;
        headers: Record<string, string>;
    };
};

export type SyncProgress = {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    status: 'idle' | 'syncing' | 'completed' | 'error';
};

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'success';
export type ConflictResolution = 'local_wins' | 'server_wins' | 'merge' | 'manual';

export interface QueueItem<T = Record<string, unknown>> {
    id: string;
    type: OperationType;
    table: string;
    data: T;
    timestamp: string;
    retryCount: number;
    maxRetries: number;
    status: SyncStatus;
    error?: string;
    conflictWith?: T;
    priority: number;
    userId?: string | null;
}

export interface SyncResult<T = Record<string, unknown>> {
    success: boolean;
    item: QueueItem<T>;
    serverData?: T;
    conflict?: boolean;
    error?: string;
}

export interface ConflictInfo<T = Record<string, unknown>> {
    itemId: string;
    localData: T;
    serverData: T;
    localTimestamp: string;
    serverTimestamp: string;
}
