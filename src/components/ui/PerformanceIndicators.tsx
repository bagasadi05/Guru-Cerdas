import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
    Wifi,
    WifiOff,
    Cloud,
    CloudOff,
    CloudUpload,
    Check,
    AlertCircle,
    RefreshCw,
    Clock,
    ChevronDown,
    ChevronUp,
    X,
    Trash2,
    RotateCcw,
    Signal,
    SignalLow,
    SignalMedium,
    SignalHigh,
    Loader2,
    FileIcon,
    CheckCircle2
} from 'lucide-react';

/**
 * Performance Indicators System
 * 
 * Features:
 * - Prominent sync status indicator
 * - Upload progress bars
 * - Network quality indicator
 * - Offline queue viewer
 */

// ============================================
// NETWORK STATUS HOOK
// ============================================

interface NetworkStatus {
    online: boolean;
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
    downlink: number;
    rtt: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export const useNetworkStatus = (): NetworkStatus => {
    const [status, setStatus] = useState<NetworkStatus>({
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: 'unknown',
        downlink: 10,
        rtt: 50,
        quality: 'good',
    });

    useEffect(() => {
        const updateNetworkStatus = () => {
            const connection = (navigator as any).connection ||
                (navigator as any).mozConnection ||
                (navigator as any).webkitConnection;

            let effectiveType: NetworkStatus['effectiveType'] = 'unknown';
            let downlink = 10;
            let rtt = 50;

            if (connection) {
                effectiveType = connection.effectiveType || 'unknown';
                downlink = connection.downlink || 10;
                rtt = connection.rtt || 50;
            }

            // Calculate quality
            let quality: NetworkStatus['quality'] = 'good';
            if (!navigator.onLine) {
                quality = 'poor';
            } else if (effectiveType === 'slow-2g' || effectiveType === '2g' || rtt > 500) {
                quality = 'poor';
            } else if (effectiveType === '3g' || rtt > 200) {
                quality = 'fair';
            } else if (downlink >= 10 && rtt < 100) {
                quality = 'excellent';
            }

            setStatus({
                online: navigator.onLine,
                effectiveType,
                downlink,
                rtt,
                quality,
            });
        };

        updateNetworkStatus();

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        const connection = (navigator as any).connection;
        if (connection) {
            connection.addEventListener('change', updateNetworkStatus);
        }

        // Periodic check
        const interval = setInterval(updateNetworkStatus, 30000);

        return () => {
            window.removeEventListener('online', updateNetworkStatus);
            window.removeEventListener('offline', updateNetworkStatus);
            if (connection) {
                connection.removeEventListener('change', updateNetworkStatus);
            }
            clearInterval(interval);
        };
    }, []);

    return status;
};

// ============================================
// NETWORK QUALITY INDICATOR
// ============================================

interface NetworkQualityIndicatorProps {
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const NetworkQualityIndicator: React.FC<NetworkQualityIndicatorProps> = ({
    className = '',
    showLabel = true,
    size = 'md',
}) => {
    const network = useNetworkStatus();

    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    const iconSizes = {
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const getQualityConfig = () => {
        if (!network.online) {
            return {
                icon: WifiOff,
                color: 'text-red-500',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                label: 'Offline',
                description: 'Tidak ada koneksi',
            };
        }

        switch (network.quality) {
            case 'poor':
                return {
                    icon: SignalLow,
                    color: 'text-red-500',
                    bgColor: 'bg-red-100 dark:bg-red-900/30',
                    label: 'Lambat',
                    description: 'Koneksi lambat',
                };
            case 'fair':
                return {
                    icon: SignalMedium,
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
                    label: 'Cukup',
                    description: 'Koneksi cukup',
                };
            case 'good':
                return {
                    icon: SignalHigh,
                    color: 'text-green-500',
                    bgColor: 'bg-green-100 dark:bg-green-900/30',
                    label: 'Baik',
                    description: 'Koneksi baik',
                };
            case 'excellent':
                return {
                    icon: Signal,
                    color: 'text-green-500',
                    bgColor: 'bg-green-100 dark:bg-green-900/30',
                    label: 'Sangat Baik',
                    description: 'Koneksi sangat baik',
                };
        }
    };

    const config = getQualityConfig();
    const Icon = config.icon;

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bgColor} ${className}`}
            title={config.description}
        >
            <Icon className={`${iconSizes[size]} ${config.color}`} />
            {showLabel && (
                <span className={`${sizeClasses[size]} font-medium ${config.color}`}>
                    {config.label}
                </span>
            )}
        </div>
    );
};

// ============================================
// SYNC STATUS CONTEXT
// ============================================

interface SyncItem {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
    createdAt: Date;
    retryCount: number;
    status: 'pending' | 'syncing' | 'failed';
    error?: string;
}

interface SyncContextValue {
    items: SyncItem[];
    addItem: (item: Omit<SyncItem, 'id' | 'createdAt' | 'retryCount' | 'status'>) => void;
    removeItem: (id: string) => void;
    retryItem: (id: string) => void;
    retryAll: () => void;
    clearFailed: () => void;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export const useSyncStatus = () => {
    const context = useContext(SyncContext);
    if (!context) {
        // Return a default value for when used outside provider
        return {
            items: [],
            addItem: () => { },
            removeItem: () => { },
            retryItem: () => { },
            retryAll: () => { },
            clearFailed: () => { },
            isSyncing: false,
            pendingCount: 0,
            failedCount: 0,
        };
    }
    return context;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<SyncItem[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const addItem = useCallback((item: Omit<SyncItem, 'id' | 'createdAt' | 'retryCount' | 'status'>) => {
        const newItem: SyncItem = {
            ...item,
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            retryCount: 0,
            status: 'pending',
        };
        setItems(prev => [...prev, newItem]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const retryItem = useCallback((id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: 'pending' as const, retryCount: item.retryCount + 1, error: undefined }
                : item
        ));
    }, []);

    const retryAll = useCallback(() => {
        setItems(prev => prev.map(item =>
            item.status === 'failed'
                ? { ...item, status: 'pending' as const, retryCount: item.retryCount + 1, error: undefined }
                : item
        ));
    }, []);

    const clearFailed = useCallback(() => {
        setItems(prev => prev.filter(item => item.status !== 'failed'));
    }, []);

    const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'syncing').length;
    const failedCount = items.filter(i => i.status === 'failed').length;

    return (
        <SyncContext.Provider value={{
            items,
            addItem,
            removeItem,
            retryItem,
            retryAll,
            clearFailed,
            isSyncing,
            pendingCount,
            failedCount,
        }}>
            {children}
        </SyncContext.Provider>
    );
};

// ============================================
// ENHANCED SYNC STATUS INDICATOR
// ============================================

interface EnhancedSyncStatusProps {
    className?: string;
    showDetails?: boolean;
}

export const EnhancedSyncStatus: React.FC<EnhancedSyncStatusProps> = ({
    className = '',
    showDetails = true,
}) => {
    const { items, pendingCount, failedCount, retryAll, clearFailed } = useSyncStatus();
    const network = useNetworkStatus();
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusConfig = () => {
        if (!network.online) {
            return {
                icon: CloudOff,
                color: 'text-orange-500',
                bgColor: 'bg-orange-100 dark:bg-orange-900/30',
                borderColor: 'border-orange-200 dark:border-orange-800',
                label: 'Offline',
                description: 'Data akan disinkronkan saat online',
                animate: false,
            };
        }

        if (failedCount > 0) {
            return {
                icon: AlertCircle,
                color: 'text-red-500',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                borderColor: 'border-red-200 dark:border-red-800',
                label: `${failedCount} Gagal`,
                description: `${failedCount} item gagal disinkronkan`,
                animate: false,
            };
        }

        if (pendingCount > 0) {
            return {
                icon: CloudUpload,
                color: 'text-blue-500',
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                borderColor: 'border-blue-200 dark:border-blue-800',
                label: `${pendingCount} Pending`,
                description: `Menyinkronkan ${pendingCount} item...`,
                animate: true,
            };
        }

        return {
            icon: Check,
            color: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
            borderColor: 'border-green-200 dark:border-green-800',
            label: 'Sinkron',
            description: 'Semua data tersinkronisasi',
            animate: false,
        };
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`relative ${className}`}>
            {/* Main Status Button - Icon Only with Tooltip */}
            <button
                onClick={() => showDetails && setIsExpanded(!isExpanded)}
                className={`
                    flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                    ${config.bgColor} ${config.borderColor}
                    ${showDetails ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
                    group relative
                `}
                title={config.label}
                aria-label={config.label}
            >
                <div className="relative">
                    <Icon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-pulse' : ''}`} />
                    {pendingCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    )}
                    {failedCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                            {failedCount}
                        </div>
                    )}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {config.label}
                </div>
            </button>

            {/* Expanded Details */}
            {showDetails && isExpanded && (failedCount > 0 || pendingCount > 0) && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                Antrian Sinkronisasi
                            </h3>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{config.description}</p>
                    </div>

                    {/* Queue Items */}
                    <div className="max-h-60 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                Tidak ada item dalam antrian
                            </div>
                        ) : (
                            items.slice(0, 5).map(item => (
                                <div
                                    key={item.id}
                                    className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.status === 'failed'
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : item.status === 'syncing'
                                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                                : 'bg-slate-100 dark:bg-slate-800'
                                            }`}>
                                            {item.status === 'syncing' ? (
                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                            ) : item.status === 'failed' ? (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                {item.type} {item.entity}
                                            </p>
                                            {item.error && (
                                                <p className="text-xs text-red-500 truncate">{item.error}</p>
                                            )}
                                        </div>
                                        {item.status === 'failed' && (
                                            <button
                                                onClick={() => { }}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                title="Coba lagi"
                                            >
                                                <RotateCcw className="w-4 h-4 text-slate-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Actions */}
                    {(failedCount > 0 || items.length > 5) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                            {failedCount > 0 && (
                                <button
                                    onClick={retryAll}
                                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Coba Semua Lagi
                                </button>
                            )}
                            {failedCount > 0 && (
                                <button
                                    onClick={clearFailed}
                                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                                >
                                    Hapus Gagal
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================
// UPLOAD PROGRESS CONTEXT
// ============================================

export interface UploadItem {
    id: string;
    fileName: string;
    fileSize: number;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
}

interface UploadContextValue {
    uploads: UploadItem[];
    addUpload: (fileName: string, fileSize: number) => string;
    updateProgress: (id: string, progress: number) => void;
    completeUpload: (id: string) => void;
    failUpload: (id: string, error: string) => void;
    removeUpload: (id: string) => void;
    clearCompleted: () => void;
    activeCount: number;
    totalProgress: number;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export const useUploadProgress = () => {
    const context = useContext(UploadContext);
    if (!context) {
        return {
            uploads: [],
            addUpload: () => '',
            updateProgress: () => { },
            completeUpload: () => { },
            failUpload: () => { },
            removeUpload: () => { },
            clearCompleted: () => { },
            activeCount: 0,
            totalProgress: 0,
        };
    }
    return context;
};

export const UploadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [uploads, setUploads] = useState<UploadItem[]>([]);

    const addUpload = useCallback((fileName: string, fileSize: number): string => {
        const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newUpload: UploadItem = {
            id,
            fileName,
            fileSize,
            progress: 0,
            status: 'pending',
        };
        setUploads(prev => [...prev, newUpload]);
        return id;
    }, []);

    const updateProgress = useCallback((id: string, progress: number) => {
        setUploads(prev => prev.map(upload =>
            upload.id === id
                ? { ...upload, progress, status: 'uploading' as const, startedAt: upload.startedAt || new Date() }
                : upload
        ));
    }, []);

    const completeUpload = useCallback((id: string) => {
        setUploads(prev => prev.map(upload =>
            upload.id === id
                ? { ...upload, progress: 100, status: 'completed' as const, completedAt: new Date() }
                : upload
        ));
    }, []);

    const failUpload = useCallback((id: string, error: string) => {
        setUploads(prev => prev.map(upload =>
            upload.id === id
                ? { ...upload, status: 'failed' as const, error }
                : upload
        ));
    }, []);

    const removeUpload = useCallback((id: string) => {
        setUploads(prev => prev.filter(upload => upload.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setUploads(prev => prev.filter(upload => upload.status !== 'completed'));
    }, []);

    const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
    const activeCount = activeUploads.length;
    const totalProgress = activeCount > 0
        ? activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeCount
        : 0;

    return (
        <UploadContext.Provider value={{
            uploads,
            addUpload,
            updateProgress,
            completeUpload,
            failUpload,
            removeUpload,
            clearCompleted,
            activeCount,
            totalProgress,
        }}>
            {children}
        </UploadContext.Provider>
    );
};

// ============================================
// UPLOAD PROGRESS INDICATOR
// ============================================

interface UploadProgressIndicatorProps {
    className?: string;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
    className = '',
}) => {
    const { uploads, activeCount, totalProgress, clearCompleted, removeUpload } = useUploadProgress();
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when new uploads start
    useEffect(() => {
        if (activeCount > 0) {
            setIsExpanded(true);
        }
    }, [activeCount]);

    const completedCount = uploads.filter(u => u.status === 'completed').length;
    const failedCount = uploads.filter(u => u.status === 'failed').length;

    if (uploads.length === 0) return null;

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    return (
        <div className={`fixed bottom-24 lg:bottom-6 right-6 z-40 ${className}`}>
            {/* Collapsed View */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
                >
                    <div className="relative">
                        {activeCount > 0 ? (
                            <CloudUpload className="w-5 h-5 text-blue-500 animate-pulse" />
                        ) : completedCount > 0 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {activeCount > 0
                                ? `Mengupload ${activeCount} file...`
                                : completedCount > 0
                                    ? `${completedCount} file selesai`
                                    : `${failedCount} file gagal`
                            }
                        </p>
                        {activeCount > 0 && (
                            <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${totalProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </button>
            )}

            {/* Expanded View */}
            {isExpanded && (
                <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CloudUpload className="w-5 h-5 text-blue-500" />
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                Upload Files
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {completedCount > 0 && (
                                <button
                                    onClick={clearCompleted}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Hapus Selesai
                                </button>
                            )}
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Upload List */}
                    <div className="max-h-60 overflow-y-auto">
                        {uploads.map(upload => (
                            <div
                                key={upload.id}
                                className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${upload.status === 'completed'
                                        ? 'bg-green-100 dark:bg-green-900/30'
                                        : upload.status === 'failed'
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : 'bg-blue-100 dark:bg-blue-900/30'
                                        }`}>
                                        {upload.status === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : upload.status === 'failed' ? (
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        ) : upload.status === 'uploading' ? (
                                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                        ) : (
                                            <FileIcon className="w-5 h-5 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {upload.fileName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400">
                                                {formatFileSize(upload.fileSize)}
                                            </span>
                                            {upload.status === 'uploading' && (
                                                <span className="text-xs text-blue-500">
                                                    {upload.progress.toFixed(0)}%
                                                </span>
                                            )}
                                            {upload.error && (
                                                <span className="text-xs text-red-500 truncate">
                                                    {upload.error}
                                                </span>
                                            )}
                                        </div>
                                        {upload.status === 'uploading' && (
                                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${upload.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeUpload(upload.id)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// COMBINED PERFORMANCE DASHBOARD
// ============================================

interface PerformanceDashboardProps {
    className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
    className = '',
}) => {
    const network = useNetworkStatus();
    const sync = useSyncStatus();
    const uploads = useUploadProgress();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <NetworkQualityIndicator size="sm" showLabel={false} />
            <EnhancedSyncStatus showDetails={true} />
            {uploads.activeCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <CloudUpload className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {uploads.activeCount} uploading
                    </span>
                </div>
            )}
        </div>
    );
};

export default {
    useNetworkStatus,
    NetworkQualityIndicator,
    useSyncStatus,
    SyncProvider,
    EnhancedSyncStatus,
    useUploadProgress,
    UploadProgressProvider,
    UploadProgressIndicator,
    PerformanceDashboard,
};
