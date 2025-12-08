import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Upload, Download, Check, X, Clock, RefreshCw, AlertTriangle, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

/**
 * Performance & Status Indicators
 * Features: Sync status, upload progress, network quality, offline banner
 */

// ============================================
// TYPES
// ============================================

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

export interface UploadItem {
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

export interface QueuedOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    timestamp: number;
    data?: any;
}

// ============================================
// NETWORK STATUS HOOK
// ============================================

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [quality, setQuality] = useState<NetworkQuality>('good');
    const [effectiveType, setEffectiveType] = useState<string>('4g');
    const [downlink, setDownlink] = useState<number>(10);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => {
            setIsOnline(false);
            setQuality('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Network Information API
        const connection = (navigator as any).connection;
        if (connection) {
            const updateNetworkInfo = () => {
                setEffectiveType(connection.effectiveType);
                setDownlink(connection.downlink);

                // Determine quality
                if (!navigator.onLine) {
                    setQuality('offline');
                } else if (connection.effectiveType === '4g' && connection.downlink > 5) {
                    setQuality('excellent');
                } else if (connection.effectiveType === '4g' || connection.effectiveType === '3g') {
                    setQuality('good');
                } else {
                    setQuality('poor');
                }
            };

            updateNetworkInfo();
            connection.addEventListener('change', updateNetworkInfo);
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                connection.removeEventListener('change', updateNetworkInfo);
            };
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, quality, effectiveType, downlink };
}

// ============================================
// SYNC STATUS CONTEXT
// ============================================

interface SyncContextValue {
    status: SyncStatus;
    lastSynced: Date | null;
    pendingCount: number;
    queuedOperations: QueuedOperation[];
    sync: () => Promise<void>;
    addToQueue: (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => void;
    clearQueue: () => void;
    setStatus: (status: SyncStatus) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export const useSyncStatus = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncStatus must be used within SyncProvider');
    }
    return context;
};

interface SyncProviderProps {
    children: React.ReactNode;
    onSync?: (operations: QueuedOperation[]) => Promise<void>;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children, onSync }) => {
    const [status, setStatus] = useState<SyncStatus>('synced');
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [queuedOperations, setQueuedOperations] = useState<QueuedOperation[]>([]);
    const { isOnline } = useNetworkStatus();

    useEffect(() => {
        if (!isOnline) {
            setStatus('offline');
        } else if (queuedOperations.length > 0) {
            setStatus('pending');
        }
    }, [isOnline, queuedOperations.length]);

    const addToQueue = useCallback((operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => {
        const newOp: QueuedOperation = {
            ...operation,
            id: `op_${Date.now()}`,
            timestamp: Date.now()
        };
        setQueuedOperations(prev => [...prev, newOp]);
        setStatus('pending');
    }, []);

    const clearQueue = useCallback(() => {
        setQueuedOperations([]);
    }, []);

    const sync = useCallback(async () => {
        if (!isOnline || queuedOperations.length === 0) return;

        setStatus('syncing');
        try {
            if (onSync) {
                await onSync(queuedOperations);
            }
            setQueuedOperations([]);
            setLastSynced(new Date());
            setStatus('synced');
        } catch (error) {
            setStatus('error');
        }
    }, [isOnline, queuedOperations, onSync]);

    // Auto-sync when back online
    useEffect(() => {
        if (isOnline && queuedOperations.length > 0) {
            sync();
        }
    }, [isOnline]);

    return (
        <SyncContext.Provider value={{
            status,
            lastSynced,
            pendingCount: queuedOperations.length,
            queuedOperations,
            sync,
            addToQueue,
            clearQueue,
            setStatus
        }}>
            {children}
        </SyncContext.Provider>
    );
};

// ============================================
// SYNC STATUS INDICATOR
// ============================================

interface SyncStatusIndicatorProps {
    className?: string;
    showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
    className = '',
    showDetails = false
}) => {
    const { status, lastSynced, pendingCount, sync } = useSyncStatus();
    const [isExpanded, setIsExpanded] = useState(false);

    const statusConfig = {
        synced: {
            icon: <Check className="w-4 h-4" />,
            label: 'Tersinkronisasi',
            color: 'text-emerald-500',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30'
        },
        syncing: {
            icon: <RefreshCw className="w-4 h-4 animate-spin" />,
            label: 'Menyinkronkan...',
            color: 'text-blue-500',
            bg: 'bg-blue-100 dark:bg-blue-900/30'
        },
        pending: {
            icon: <Clock className="w-4 h-4" />,
            label: `${pendingCount} menunggu`,
            color: 'text-amber-500',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
        },
        error: {
            icon: <AlertTriangle className="w-4 h-4" />,
            label: 'Gagal sinkron',
            color: 'text-red-500',
            bg: 'bg-red-100 dark:bg-red-900/30'
        },
        offline: {
            icon: <CloudOff className="w-4 h-4" />,
            label: 'Offline',
            color: 'text-slate-500',
            bg: 'bg-slate-100 dark:bg-slate-800'
        }
    };

    const config = statusConfig[status];
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} ${config.color} transition-colors`}
            >
                {config.icon}
                <span className="text-sm font-medium">{config.label}</span>
                {showDetails && (
                    isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                )}
            </button>

            {showDetails && isExpanded && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 z-50">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Status</span>
                            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                        </div>
                        {lastSynced && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Terakhir sinkron</span>
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {formatTime(lastSynced)}
                                </span>
                            </div>
                        )}
                        {pendingCount > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Dalam antrian</span>
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {pendingCount} operasi
                                </span>
                            </div>
                        )}
                        {(status === 'pending' || status === 'error') && (
                            <button
                                onClick={sync}
                                className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium"
                            >
                                Sinkronkan Sekarang
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// NETWORK QUALITY INDICATOR
// ============================================

interface NetworkIndicatorProps {
    className?: string;
    showLabel?: boolean;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
    className = '',
    showLabel = false
}) => {
    const { quality, effectiveType, downlink } = useNetworkStatus();

    const qualityConfig = {
        excellent: {
            bars: 4,
            color: 'text-emerald-500',
            label: 'Sangat Baik'
        },
        good: {
            bars: 3,
            color: 'text-blue-500',
            label: 'Baik'
        },
        poor: {
            bars: 1,
            color: 'text-amber-500',
            label: 'Lemah'
        },
        offline: {
            bars: 0,
            color: 'text-red-500',
            label: 'Offline'
        }
    };

    const config = qualityConfig[quality];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {quality === 'offline' ? (
                <WifiOff className={`w-5 h-5 ${config.color}`} />
            ) : (
                <div className="flex items-end gap-0.5 h-4">
                    {[1, 2, 3, 4].map(bar => (
                        <div
                            key={bar}
                            className={`w-1 rounded-sm transition-colors ${bar <= config.bars ? config.color.replace('text-', 'bg-') : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            style={{ height: `${bar * 4}px` }}
                        />
                    ))}
                </div>
            )}
            {showLabel && (
                <span className={`text-sm ${config.color}`}>
                    {config.label}
                </span>
            )}
        </div>
    );
};

// ============================================
// OFFLINE BANNER
// ============================================

interface OfflineBannerProps {
    className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
    const { isOnline, quality } = useNetworkStatus();
    const { pendingCount, sync } = useSyncStatus();
    const [showReconnected, setShowReconnected] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
        } else if (wasOffline && isOnline) {
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
            setWasOffline(false);
        }
    }, [isOnline, wasOffline]);

    if (isOnline && !showReconnected) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 animate-slide-down ${className}`}
        >
            {!isOnline ? (
                <div className="bg-red-500 text-white px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <WifiOff className="w-5 h-5" />
                            <div>
                                <p className="font-medium">Tidak ada koneksi internet</p>
                                {pendingCount > 0 && (
                                    <p className="text-sm text-red-100">
                                        {pendingCount} perubahan akan disinkronkan saat online
                                    </p>
                                )}
                            </div>
                        </div>
                        {pendingCount > 0 && (
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {pendingCount} dalam antrian
                            </span>
                        )}
                    </div>
                </div>
            ) : showReconnected ? (
                <div className="bg-emerald-500 text-white px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                        <Wifi className="w-5 h-5" />
                        <span className="font-medium">Kembali online!</span>
                        {pendingCount > 0 && (
                            <button
                                onClick={sync}
                                className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30"
                            >
                                Sinkronkan {pendingCount} perubahan
                            </button>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

// ============================================
// UPLOAD PROGRESS MANAGER
// ============================================

interface UploadManagerContextValue {
    uploads: UploadItem[];
    addUpload: (file: File) => string;
    updateProgress: (id: string, progress: number) => void;
    completeUpload: (id: string) => void;
    failUpload: (id: string, error: string) => void;
    cancelUpload: (id: string) => void;
    removeUpload: (id: string) => void;
}

const UploadManagerContext = createContext<UploadManagerContextValue | null>(null);

export const useUploadManager = () => {
    const context = useContext(UploadManagerContext);
    if (!context) {
        throw new Error('useUploadManager must be used within UploadManagerProvider');
    }
    return context;
};

export const UploadManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [uploads, setUploads] = useState<UploadItem[]>([]);

    const addUpload = useCallback((file: File) => {
        const id = `upload_${Date.now()}`;
        setUploads(prev => [...prev, {
            id,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'pending'
        }]);
        return id;
    }, []);

    const updateProgress = useCallback((id: string, progress: number) => {
        setUploads(prev => prev.map(u =>
            u.id === id ? { ...u, progress, status: 'uploading' as const } : u
        ));
    }, []);

    const completeUpload = useCallback((id: string) => {
        setUploads(prev => prev.map(u =>
            u.id === id ? { ...u, progress: 100, status: 'completed' as const } : u
        ));
    }, []);

    const failUpload = useCallback((id: string, error: string) => {
        setUploads(prev => prev.map(u =>
            u.id === id ? { ...u, status: 'error' as const, error } : u
        ));
    }, []);

    const cancelUpload = useCallback((id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    }, []);

    const removeUpload = useCallback((id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    }, []);

    return (
        <UploadManagerContext.Provider value={{
            uploads,
            addUpload,
            updateProgress,
            completeUpload,
            failUpload,
            cancelUpload,
            removeUpload
        }}>
            {children}
        </UploadManagerContext.Provider>
    );
};

// ============================================
// UPLOAD PROGRESS PANEL
// ============================================

export const UploadProgressPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { uploads, cancelUpload, removeUpload } = useUploadManager();
    const [isExpanded, setIsExpanded] = useState(true);

    const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
    const completedUploads = uploads.filter(u => u.status === 'completed');
    const failedUploads = uploads.filter(u => u.status === 'error');

    if (uploads.length === 0) return null;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className={`fixed bottom-20 right-4 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-40 ${className}`}>
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-slate-900 dark:text-white">
                        Upload ({uploads.length})
                    </span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="max-h-80 overflow-y-auto">
                    {/* Active uploads */}
                    {activeUploads.map(upload => (
                        <div key={upload.id} className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {upload.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatSize(upload.size)} • {upload.progress}%
                                    </p>
                                </div>
                                <button
                                    onClick={() => cancelUpload(upload.id)}
                                    className="p-1 text-slate-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${upload.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Completed uploads */}
                    {completedUploads.map(upload => (
                        <div key={upload.id} className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{upload.name}</p>
                            </div>
                            <button
                                onClick={() => removeUpload(upload.id)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}

                    {/* Failed uploads */}
                    {failedUploads.map(upload => (
                        <div key={upload.id} className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{upload.name}</p>
                                    <p className="text-xs text-red-500">{upload.error}</p>
                                </div>
                                <button
                                    onClick={() => removeUpload(upload.id)}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================
// LOADING STATE WITH STATUS
// ============================================

interface LoadingWithStatusProps {
    isLoading: boolean;
    message?: string;
    progress?: number;
    children: React.ReactNode;
}

export const LoadingWithStatus: React.FC<LoadingWithStatusProps> = ({
    isLoading,
    message = 'Memuat...',
    progress,
    children
}) => {
    if (!isLoading) return <>{children}</>;

    return (
        <div className="relative">
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">{message}</p>
                {progress !== undefined && (
                    <div className="w-48 mt-3">
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-center">{progress}%</p>
                    </div>
                )}
            </div>
            <div className="opacity-50 pointer-events-none">
                {children}
            </div>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    useNetworkStatus,
    SyncProvider,
    useSyncStatus,
    SyncStatusIndicator,
    NetworkIndicator,
    OfflineBanner,
    UploadManagerProvider,
    useUploadManager,
    UploadProgressPanel,
    LoadingWithStatus
};
