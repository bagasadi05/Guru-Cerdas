/**
 * Action History Page
 * 
 * Displays action history with filtering and undo capabilities.
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import {
    History,
    RotateCcw,
    Trash2,
    Edit3,
    PlusCircle,
    Filter,
    Calendar,
    Search,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    ChevronDown,
} from 'lucide-react';
import {
    getActionHistory,
    undo,
    clearHistory,
    ActionHistoryItem,
    ActionType,
} from '../../services/UndoManager';
import { SoftDeleteEntity } from '../../services/SoftDeleteService';

// Action type configuration
const actionTypeConfig: Record<ActionType, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}> = {
    create: {
        label: 'Buat',
        icon: <PlusCircle className="w-4 h-4" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
    },
    update: {
        label: 'Perbarui',
        icon: <Edit3 className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    delete: {
        label: 'Hapus',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
    },
    bulk_delete: {
        label: 'Hapus Massal',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
    },
};

// Entity labels
const entityLabels: Record<SoftDeleteEntity, string> = {
    students: 'Siswa',
    classes: 'Kelas',
    attendance: 'Absensi',
    tasks: 'Tugas',
};

const ActionHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ActionType | 'all'>('all');
    const [filterEntity, setFilterEntity] = useState<SoftDeleteEntity | 'all'>('all');
    const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const pageSize = 20;

    // Fetch action history
    const { data: actions = [], isLoading, refetch } = useQuery({
        queryKey: ['action-history', user?.id, page, pageSize],
        queryFn: () => getActionHistory(user!.id, pageSize, page * pageSize),
        enabled: !!user,
    });

    // Undo mutation
    const undoMutation = useMutation({
        mutationFn: async (actionId: string) => {
            const result = await undo(actionId);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-history'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            toast.success('Aksi dibatalkan');
        },
        onError: (error) => {
            toast.error(`Gagal membatalkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Clear history mutation
    const clearHistoryMutation = useMutation({
        mutationFn: async () => {
            const result = await clearHistory(user!.id);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-history'] });
            toast.success('Riwayat dihapus');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus riwayat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Filter actions
    const filteredActions = useMemo(() => {
        return actions.filter(action => {
            // Filter by type
            if (filterType !== 'all' && action.actionType !== filterType) {
                return false;
            }

            // Filter by entity
            if (filterEntity !== 'all' && action.entity !== filterEntity) {
                return false;
            }

            // Filter by date range
            if (dateRange.start && new Date(action.createdAt) < new Date(dateRange.start)) {
                return false;
            }
            if (dateRange.end && new Date(action.createdAt) > new Date(dateRange.end)) {
                return false;
            }

            // Search
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                if (!action.description.toLowerCase().includes(searchLower) &&
                    !entityLabels[action.entity].toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            return true;
        });
    }, [actions, filterType, filterEntity, dateRange, searchQuery]);

    // Group by date
    const groupedActions = useMemo(() => {
        const groups: { [key: string]: ActionHistoryItem[] } = {};

        filteredActions.forEach(action => {
            const dateKey = new Date(action.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(action);
        });

        return groups;
    }, [filteredActions]);

    // Format time
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Clear filters
    const clearFilters = () => {
        setFilterType('all');
        setFilterEntity('all');
        setDateRange({});
        setSearchQuery('');
    };

    const hasActiveFilters = filterType !== 'all' || filterEntity !== 'all' || dateRange.start || dateRange.end || searchQuery;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full pb-24 lg:pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <History className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Riwayat Aksi</h1>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Lihat dan batalkan aksi yang baru dilakukan
                        </p>
                    </div>

                    {actions.length > 0 && (
                        <Button
                            onClick={() => clearHistoryMutation.mutate()}
                            disabled={clearHistoryMutation.isPending}
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus Riwayat
                        </Button>
                    )}
                </div>

                {/* Search and Filters */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari riwayat..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${hasActiveFilters
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            Filter
                            {hasActiveFilters && (
                                <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
                                    !
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Action Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Tipe Aksi
                                    </label>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as ActionType | 'all')}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="all">Semua</option>
                                        {Object.entries(actionTypeConfig).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Entity Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Tipe Data
                                    </label>
                                    <select
                                        value={filterEntity}
                                        onChange={(e) => setFilterEntity(e.target.value as SoftDeleteEntity | 'all')}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="all">Semua</option>
                                        {Object.entries(entityLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.start || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.end || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-slate-400 hover:text-white"
                                    >
                                        Reset Filter
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions List */}
                {filteredActions.length === 0 ? (
                    <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                            <History className="w-10 h-10 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Tidak Ada Riwayat</h3>
                        <p className="text-slate-400">
                            {hasActiveFilters
                                ? 'Tidak ada riwayat yang cocok dengan filter'
                                : 'Belum ada aksi yang tercatat'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedActions).map(([date, groupActions]) => (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <h3 className="font-semibold text-white">{date}</h3>
                                    <span className="text-sm text-slate-400">({groupActions.length} aksi)</span>
                                </div>

                                <div className="space-y-2">
                                    {groupActions.map(action => {
                                        const config = actionTypeConfig[action.actionType];

                                        return (
                                            <div
                                                key={action.id}
                                                className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-all"
                                            >
                                                {/* Icon */}
                                                <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color}`}>
                                                    {config.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white">
                                                        {action.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {entityLabels[action.entity]}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {formatTime(action.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Status & Actions */}
                                                <div className="flex items-center gap-3">
                                                    {action.canUndo ? (
                                                        <button
                                                            onClick={() => undoMutation.mutate(action.id)}
                                                            disabled={undoMutation.isPending}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                                                        >
                                                            <RotateCcw className={`w-3.5 h-3.5 ${undoMutation.isPending ? 'animate-spin' : ''}`} />
                                                            Undo
                                                        </button>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Tidak dapat di-undo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-sm text-slate-400">
                                Halaman {page + 1}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={actions.length < pageSize}
                                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionHistoryPage;
