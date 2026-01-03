/**
 * Enhanced Offline & Sync Indicators
 * 
 * Visual indicators for:
 * - Data source (cache vs live)
 * - Sync status with progress
 * - Conflict resolution UI
 */

import React, { useState } from 'react';
import { Database, Cloud, CloudOff, RefreshCw, AlertTriangle, Check, X, Clock, ChevronDown, ChevronUp, Loader2, GitMerge } from 'lucide-react';
import { Button } from './Button';

// ============================================
// DATA SOURCE INDICATOR
// ============================================

interface DataSourceIndicatorProps {
    isFromCache: boolean;
    lastUpdated?: Date;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    className?: string;
}

/**
 * Shows whether data is from cache or live server
 */
export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
    isFromCache,
    lastUpdated,
    onRefresh,
    isRefreshing = false,
    className = '',
}) => {
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    if (!isFromCache && !lastUpdated) return null;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isFromCache
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            } ${className}`}>
            {isFromCache ? (
                <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Data dari cache</span>
                </>
            ) : (
                <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Data terbaru</span>
                </>
            )}

            {lastUpdated && (
                <span className="opacity-70">• {formatTime(lastUpdated)}</span>
            )}

            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                    title="Refresh data"
                >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    );
};

// ============================================
// ENHANCED SYNC STATUS BAR
// ============================================

interface SyncStatusBarProps {
    status: 'synced' | 'syncing' | 'pending' | 'error' | 'offline';
    pendingCount: number;
    failedCount?: number;
    lastSynced?: Date;
    onSync?: () => void;
    onRetryFailed?: () => void;
    onClearFailed?: () => void;
    className?: string;
}

/**
 * Detailed sync status bar with actions
 */
export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
    status,
    pendingCount,
    failedCount = 0,
    lastSynced,
    onSync,
    onRetryFailed,
    onClearFailed,
    className = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const statusConfig = {
        synced: {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            text: 'text-emerald-700 dark:text-emerald-300',
            icon: <Check className="w-4 h-4" />,
            label: 'Semua data tersinkronisasi',
        },
        syncing: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-700 dark:text-blue-300',
            icon: <Loader2 className="w-4 h-4 animate-spin" />,
            label: 'Sinkronisasi...',
        },
        pending: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-300',
            icon: <Clock className="w-4 h-4" />,
            label: `${pendingCount} perubahan menunggu`,
        },
        error: {
            bg: 'bg-rose-50 dark:bg-rose-900/20',
            text: 'text-rose-700 dark:text-rose-300',
            icon: <AlertTriangle className="w-4 h-4" />,
            label: `${failedCount} gagal disinkronkan`,
        },
        offline: {
            bg: 'bg-slate-100 dark:bg-slate-800',
            text: 'text-slate-600 dark:text-slate-400',
            icon: <CloudOff className="w-4 h-4" />,
            label: 'Mode offline',
        },
    };

    const config = statusConfig[status];

    // Don't show if synced and no pending/failed
    if (status === 'synced' && pendingCount === 0 && failedCount === 0) {
        return null;
    }

    return (
        <div className={`rounded-xl border ${config.bg} ${config.text} ${className}`}>
            {/* Main bar */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3"
            >
                <div className="flex items-center gap-3">
                    {config.icon}
                    <span className="text-sm font-medium">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {(status === 'pending' || status === 'error') && (
                        <span className="px-2 py-0.5 bg-current/10 rounded-full text-xs">
                            {pendingCount + failedCount}
                        </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-current/10">
                    <div className="pt-3 space-y-3">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {pendingCount > 0 && (
                                <div className="flex justify-between p-2 bg-current/5 rounded-lg">
                                    <span>Menunggu</span>
                                    <span className="font-medium">{pendingCount}</span>
                                </div>
                            )}
                            {failedCount > 0 && (
                                <div className="flex justify-between p-2 bg-current/5 rounded-lg">
                                    <span>Gagal</span>
                                    <span className="font-medium">{failedCount}</span>
                                </div>
                            )}
                            {lastSynced && (
                                <div className="col-span-2 flex justify-between p-2 bg-current/5 rounded-lg">
                                    <span>Terakhir sinkron</span>
                                    <span className="font-medium">{formatTime(lastSynced)}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            {status === 'pending' && onSync && (
                                <Button size="sm" onClick={onSync} className="flex-1">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                    Sinkronkan Sekarang
                                </Button>
                            )}
                            {failedCount > 0 && onRetryFailed && (
                                <Button size="sm" variant="outline" onClick={onRetryFailed}>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                    Coba Ulang Gagal
                                </Button>
                            )}
                            {failedCount > 0 && onClearFailed && (
                                <Button size="sm" variant="ghost" onClick={onClearFailed}>
                                    <X className="w-3.5 h-3.5 mr-1.5" />
                                    Hapus Gagal
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// CONFLICT RESOLUTION MODAL
// ============================================

interface ConflictData {
    id: string;
    field: string;
    localValue: unknown;
    serverValue: unknown;
    localTimestamp: string;
    serverTimestamp: string;
}

interface ConflictResolutionProps {
    conflicts: ConflictData[];
    entityName: string;
    onResolve: (resolutions: Record<string, 'local' | 'server'>) => void;
    onCancel: () => void;
}

/**
 * Modal for resolving data conflicts
 */
export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
    conflicts,
    entityName,
    onResolve,
    onCancel,
}) => {
    const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server'>>({});

    const handleSelect = (id: string, choice: 'local' | 'server') => {
        setResolutions(prev => ({ ...prev, [id]: choice }));
    };

    const handleResolveAll = (choice: 'local' | 'server') => {
        const all: Record<string, 'local' | 'server'> = {};
        conflicts.forEach(c => { all[c.id] = choice; });
        setResolutions(all);
    };

    const allResolved = conflicts.every(c => resolutions[c.id]);

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <GitMerge className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        Konflik Data Terdeteksi
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {entityName} telah diubah di tempat lain. Pilih versi yang ingin disimpan.
                    </p>
                </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => handleResolveAll('local')}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                    Gunakan Semua Lokal
                </button>
                <button
                    onClick={() => handleResolveAll('server')}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                    Gunakan Semua Server
                </button>
            </div>

            {/* Conflict list */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {conflicts.map((conflict) => (
                    <div
                        key={conflict.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            {conflict.field}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Local option */}
                            <button
                                onClick={() => handleSelect(conflict.id, 'local')}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${resolutions[conflict.id] === 'local'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        Lokal (Anda)
                                    </span>
                                    {resolutions[conflict.id] === 'local' && (
                                        <Check className="w-4 h-4 text-blue-500" />
                                    )}
                                </div>
                                <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                                    {formatValue(conflict.localValue)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {formatDate(conflict.localTimestamp)}
                                </div>
                            </button>

                            {/* Server option */}
                            <button
                                onClick={() => handleSelect(conflict.id, 'server')}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${resolutions[conflict.id] === 'server'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        Server
                                    </span>
                                    {resolutions[conflict.id] === 'server' && (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                    )}
                                </div>
                                <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                                    {formatValue(conflict.serverValue)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {formatDate(conflict.serverTimestamp)}
                                </div>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={onCancel}>
                    Batal
                </Button>
                <Button
                    onClick={() => onResolve(resolutions)}
                    disabled={!allResolved}
                >
                    Terapkan ({Object.keys(resolutions).length}/{conflicts.length})
                </Button>
            </div>
        </div>
    );
};

// ============================================
// STALE DATA WARNING
// ============================================

interface StaleDataWarningProps {
    lastUpdated: Date;
    staleThresholdMinutes?: number;
    onRefresh?: () => void;
    className?: string;
}

/**
 * Warning banner when data might be stale
 */
export const StaleDataWarning: React.FC<StaleDataWarningProps> = ({
    lastUpdated,
    staleThresholdMinutes = 30,
    onRefresh,
    className = '',
}) => {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / 60000;

    if (diffMinutes < staleThresholdMinutes) return null;

    const formatAge = () => {
        if (diffMinutes < 60) return `${Math.floor(diffMinutes)} menit`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} jam`;
        return `${Math.floor(diffMinutes / 1440)} hari`;
    };

    return (
        <div className={`flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl ${className}`}>
            <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Data mungkin sudah tidak terbaru
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        Terakhir diperbarui {formatAge()} yang lalu
                    </p>
                </div>
            </div>
            {onRefresh && (
                <Button size="sm" variant="ghost" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Perbarui
                </Button>
            )}
        </div>
    );
};

export default {
    DataSourceIndicator,
    SyncStatusBar,
    ConflictResolution,
    StaleDataWarning,
};
