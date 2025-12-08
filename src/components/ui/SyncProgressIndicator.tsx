import React, { useEffect, useState } from 'react';
import { subscribeSyncProgress, SyncProgress, processQueue, getFailedMutations, retryMutation, discardAllFailed } from '../../services/offlineQueue';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { CloudIcon, CloudOffIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, XCircleIcon, Loader2Icon } from 'lucide-react';
import { Button } from './Button';

interface SyncProgressIndicatorProps {
    className?: string;
}

export const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({ className = '' }) => {
    const isOnline = useOfflineStatus();
    const [progress, setProgress] = useState<SyncProgress>({
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        status: 'idle'
    });
    const [failedCount, setFailedCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeSyncProgress(setProgress);
        return unsubscribe;
    }, []);

    useEffect(() => {
        const checkFailed = async () => {
            const failed = await getFailedMutations();
            setFailedCount(failed.length);
        };
        checkFailed();

        // Check periodically
        const interval = setInterval(checkFailed, 5000);
        return () => clearInterval(interval);
    }, [progress]);

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && progress.status === 'idle') {
            processQueue();
        }
    }, [isOnline]);

    const handleRetry = async () => {
        setIsRetrying(true);
        await processQueue();
        setIsRetrying(false);
    };

    const handleDiscardAll = async () => {
        if (window.confirm('Apakah Anda yakin ingin menghapus semua data yang gagal disinkronkan?')) {
            await discardAllFailed();
            setFailedCount(0);
        }
    };

    // Don't show if nothing to display
    if (progress.total === 0 && failedCount === 0 && progress.status === 'idle') {
        return null;
    }

    const getStatusIcon = () => {
        if (!isOnline) return <CloudOffIcon className="w-4 h-4 text-amber-500" />;
        if (progress.status === 'syncing') return <Loader2Icon className="w-4 h-4 text-blue-500 animate-spin" />;
        if (progress.status === 'completed' && failedCount === 0) return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
        if (failedCount > 0) return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
        return <CloudIcon className="w-4 h-4 text-slate-400" />;
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';
        if (progress.status === 'syncing') return `Sinkronisasi ${progress.processed}/${progress.total}`;
        if (progress.status === 'completed' && failedCount === 0) return 'Tersinkron';
        if (failedCount > 0) return `${failedCount} gagal`;
        return 'Online';
    };

    const progressPercent = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

    return (
        <div className={`relative ${className}`}>
            {/* Main Indicator */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-full transition-all
                    ${!isOnline
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : failedCount > 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : progress.status === 'syncing'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }
                `}
            >
                {getStatusIcon()}
                <span className="text-xs font-medium">{getStatusText()}</span>
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-fade-in">
                    <div className="space-y-4">
                        {/* Status Header */}
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 dark:text-white">Status Sinkronisasi</h4>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Connection Status */}
                        <div className="flex items-center gap-2 text-sm">
                            {isOnline ? (
                                <>
                                    <CloudIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-green-600 dark:text-green-400">Terhubung ke internet</span>
                                </>
                            ) : (
                                <>
                                    <CloudOffIcon className="w-4 h-4 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">Tidak terhubung - data disimpan lokal</span>
                                </>
                            )}
                        </div>

                        {/* Progress Bar (when syncing) */}
                        {progress.status === 'syncing' && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Menyinkronkan data...</span>
                                    <span>{progress.processed}/{progress.total}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Summary Stats */}
                        {progress.total > 0 && progress.status !== 'idle' && (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{progress.total}</div>
                                    <div className="text-[10px] text-slate-500">Total</div>
                                </div>
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{progress.succeeded}</div>
                                    <div className="text-[10px] text-green-600 dark:text-green-400">Berhasil</div>
                                </div>
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{progress.failed}</div>
                                    <div className="text-[10px] text-red-600 dark:text-red-400">Gagal</div>
                                </div>
                            </div>
                        )}

                        {/* Failed Actions */}
                        {failedCount > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {failedCount} item gagal disinkronkan
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleRetry}
                                        size="sm"
                                        disabled={isRetrying || !isOnline}
                                        className="flex-1"
                                    >
                                        {isRetrying ? (
                                            <Loader2Icon className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                            <RefreshCwIcon className="w-3 h-3 mr-1" />
                                        )}
                                        Coba Lagi
                                    </Button>
                                    <Button
                                        onClick={handleDiscardAll}
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyncProgressIndicator;
