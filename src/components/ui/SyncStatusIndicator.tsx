import React, { useState, useEffect } from 'react';
import { RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, ClockIcon } from '../Icons';
import { Signal, SignalZero } from 'lucide-react';

interface SyncItem {
    id: string;
    type: 'create' | 'update' | 'delete';
    table: string;
    timestamp: number;
    status: 'pending' | 'syncing' | 'success' | 'error';
    error?: string;
}

interface SyncStatusIndicatorProps {
    isOnline: boolean;
    pendingCount?: number;
    lastSyncTime?: Date | null;
    onManualSync?: () => void;
    className?: string;
}

// Queue management helpers
const QUEUE_KEY = 'offline_sync_queue';

const getQueueItems = (): SyncItem[] => {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
    isOnline,
    pendingCount: externalPendingCount,
    lastSyncTime,
    onManualSync,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [queueItems, setQueueItems] = useState<SyncItem[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Refresh queue items periodically
    useEffect(() => {
        const updateQueue = () => {
            setQueueItems(getQueueItems());
        };
        updateQueue();
        const interval = setInterval(updateQueue, 2000);
        return () => clearInterval(interval);
    }, []);

    const pendingCount = externalPendingCount !== undefined ? externalPendingCount : queueItems.filter(i => i.status === 'pending').length;
    const errorCount = queueItems.filter(i => i.status === 'error').length;
    const syncingCount = queueItems.filter(i => i.status === 'syncing').length;

    const handleSync = async () => {
        if (onManualSync && isOnline) {
            setIsSyncing(true);
            try {
                await onManualSync();
            } finally {
                setIsSyncing(false);
            }
        }
    };

    // Determine status
    const getStatus = () => {
        if (!isOnline) return 'offline';
        if (isSyncing || syncingCount > 0) return 'syncing';
        if (errorCount > 0) return 'error';
        if (pendingCount > 0) return 'pending';
        return 'synced';
    };

    const status = getStatus();

    const statusConfig = {
        offline: {
            icon: SignalZero,
            color: 'text-gray-500',
            bg: 'bg-gray-100 dark:bg-gray-800',
            label: 'Offline',
            description: 'Perubahan akan disimpan secara lokal'
        },
        syncing: {
            icon: RefreshCwIcon,
            color: 'text-blue-500',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            label: 'Menyinkronkan...',
            description: 'Mengirim perubahan ke server'
        },
        error: {
            icon: AlertCircleIcon,
            color: 'text-red-500',
            bg: 'bg-red-100 dark:bg-red-900/30',
            label: 'Error Sinkronisasi',
            description: `${errorCount} item gagal disinkronkan`
        },
        pending: {
            icon: ClockIcon,
            color: 'text-amber-500',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            label: `${pendingCount} Tertunda`,
            description: 'Menunggu koneksi untuk sinkronisasi'
        },
        synced: {
            icon: CheckCircleIcon,
            color: 'text-green-500',
            bg: 'bg-green-100 dark:bg-green-900/30',
            label: 'Sinkron',
            description: 'Semua data sudah tersinkronisasi'
        }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={`relative ${className}`}>
            {/* Status Badge */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full ${config.bg} transition-all hover:scale-105`}
                title={config.label}
            >
                <Icon className={`w-4 h-4 ${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`} />
                <span className={`text-sm font-medium ${config.color} hidden lg:inline`}>
                    {config.label}
                </span>
                {pendingCount > 0 && status !== 'synced' && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                        {pendingCount}
                    </span>
                )}
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Status Sinkronisasi</h3>
                            <div className={`flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                {isOnline ? <Signal className="w-4 h-4" /> : <SignalZero className="w-4 h-4" />}
                                <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                    </div>

                    {/* Stats */}
                    <div className="p-4 grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
                            <p className="text-xs text-amber-500">Tertunda</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{syncingCount}</p>
                            <p className="text-xs text-blue-500">Proses</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{errorCount}</p>
                            <p className="text-xs text-red-500">Error</p>
                        </div>
                    </div>

                    {/* Queue Items (if any pending/error) */}
                    {queueItems.length > 0 && (
                        <div className="px-4 pb-2 max-h-40 overflow-y-auto">
                            <p className="text-xs font-medium text-gray-500 mb-2">Antrian:</p>
                            <div className="space-y-1">
                                {queueItems.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-2 rounded-lg text-xs ${item.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                                            item.status === 'syncing' ? 'bg-blue-50 dark:bg-blue-900/20' :
                                                'bg-gray-50 dark:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {item.type} • {item.table}
                                        </span>
                                        <span className={`
                                            ${item.status === 'pending' ? 'text-amber-500' : ''}
                                            ${item.status === 'syncing' ? 'text-blue-500' : ''}
                                            ${item.status === 'error' ? 'text-red-500' : ''}
                                            ${item.status === 'success' ? 'text-green-500' : ''}
                                        `}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                                {queueItems.length > 5 && (
                                    <p className="text-xs text-gray-400 text-center">
                                        +{queueItems.length - 5} item lainnya
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Last Sync Time */}
                    {lastSyncTime && (
                        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
                            Terakhir sinkron: {lastSyncTime.toLocaleString('id-ID')}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSync}
                            disabled={!isOnline || isSyncing}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isOnline && !isSyncing
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <RefreshCwIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                        </button>
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </div>
    );
};

export default SyncStatusIndicator;
