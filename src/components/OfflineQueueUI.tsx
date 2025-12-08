import React, { useState, useEffect } from 'react';
import {
    offlineQueue,
    QueueItem,
    SyncStatus
} from '../services/offlineQueueEnhanced';

/**
 * Offline Queue UI Component
 * Shows pending operations, failed items, and allows manual sync/retry
 */

interface OfflineQueueUIProps {
    className?: string;
    compact?: boolean;
}

const statusColors: Record<SyncStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    syncing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

const statusLabels: Record<SyncStatus, string> = {
    pending: 'Menunggu',
    syncing: 'Sinkronisasi...',
    failed: 'Gagal',
    success: 'Berhasil'
};

const operationLabels: Record<string, string> = {
    CREATE: 'Buat',
    UPDATE: 'Ubah',
    DELETE: 'Hapus'
};

const tableLabels: Record<string, string> = {
    students: 'Siswa',
    attendance: 'Absensi',
    tasks: 'Tugas',
    classes: 'Kelas',
    schedules: 'Jadwal',
    grades: 'Nilai'
};

export const OfflineQueueUI: React.FC<OfflineQueueUIProps> = ({
    className = '',
    compact = false
}) => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const unsubscribe = offlineQueue.subscribe(setQueue);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const pendingCount = queue.filter(i => i.status === 'pending').length;
    const failedCount = queue.filter(i => i.status === 'failed').length;
    const syncingCount = queue.filter(i => i.status === 'syncing').length;

    const handleSync = () => {
        offlineQueue.processQueue();
    };

    const handleRetryFailed = () => {
        offlineQueue.retryFailed();
    };

    const handleClearFailed = () => {
        offlineQueue.clearFailed();
    };

    const handleRemoveItem = (id: string) => {
        offlineQueue.remove(id);
    };

    // Don't show if queue is empty
    if (queue.length === 0 && isOnline) {
        return null;
    }

    if (compact) {
        return (
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative inline-flex items-center gap-2 px-3 py-2 rounded-lg
                    ${!isOnline
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }
                    ${className}
                `}
            >
                {!isOnline ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                        />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                )}

                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                        {pendingCount}
                    </span>
                )}

                {failedCount > 0 && (
                    <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {failedCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            {isOnline ? 'Antrian Sinkronisasi' : 'Mode Offline'}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {syncingCount > 0 && (
                            <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                                Sinkronisasi...
                            </span>
                        )}

                        {isOnline && pendingCount > 0 && (
                            <button
                                onClick={handleSync}
                                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Sinkronkan
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-600 dark:text-slate-400">
                            Menunggu: {pendingCount}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-slate-600 dark:text-slate-400">
                            Gagal: {failedCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Queue Items */}
            <div className="max-h-80 overflow-y-auto">
                {queue.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p>Semua data tersinkronisasi</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {queue.map(item => (
                            <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[item.status]}`}>
                                                {statusLabels[item.status]}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {operationLabels[item.type]} {tableLabels[item.table] || item.table}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                            {item.data?.name || item.data?.title || item.data?.id || 'Item'}
                                        </p>

                                        {item.error && (
                                            <p className="text-xs text-red-500 mt-1">{item.error}</p>
                                        )}

                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(item.timestamp).toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {item.status === 'failed' && (
                                            <button
                                                onClick={() => {
                                                    item.status = 'pending';
                                                    item.retryCount = 0;
                                                    offlineQueue.processQueue();
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="Coba lagi"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                            title="Hapus"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            {failedCount > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {failedCount} item gagal disinkronisasi
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearFailed}
                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                                Hapus Gagal
                            </button>
                            <button
                                onClick={handleRetryFailed}
                                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Coba Semua
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Offline Queue Badge - Shows count in navbar
 */
export const OfflineQueueBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
    const [count, setCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const unsubscribe = offlineQueue.subscribe(queue => {
            setCount(queue.filter(i => i.status !== 'success').length);
        });

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (count === 0 && isOnline) return null;

    return (
        <button
            onClick={onClick}
            className={`
                relative p-2 rounded-lg transition-colors
                ${!isOnline
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
            `}
            title={isOnline ? `${count} item menunggu sinkronisasi` : 'Anda sedang offline'}
        >
            {!isOnline ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                    />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            )}

            {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
};

/**
 * Sync Status Indicator
 */
export const SyncStatusIndicator: React.FC = () => {
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const unsubscribe = offlineQueue.subscribe(queue => {
            const hasSyncing = queue.some(i => i.status === 'syncing');
            const hasFailed = queue.some(i => i.status === 'failed');

            if (hasSyncing) setSyncStatus('syncing');
            else if (hasFailed) setSyncStatus('error');
            else setSyncStatus('idle');
        });

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="flex items-center gap-2 text-sm">
            <div
                className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-amber-500' :
                        syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                            syncStatus === 'error' ? 'bg-red-500' :
                                'bg-green-500'
                    }`}
            />
            <span className="text-slate-600 dark:text-slate-400">
                {!isOnline ? 'Offline' :
                    syncStatus === 'syncing' ? 'Menyinkronkan...' :
                        syncStatus === 'error' ? 'Ada kesalahan' :
                            'Tersinkronisasi'}
            </span>
        </div>
    );
};

export default OfflineQueueUI;
