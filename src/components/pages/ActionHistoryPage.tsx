import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
    XCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Activity,
    Info,
    Users,
    BookOpen,
    ClipboardCheck,
    Eye,
    TrendingUp,
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
    labelPast: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    create: {
        label: 'Buat',
        labelPast: 'Dibuat',
        icon: <PlusCircle className="w-4 h-4" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    update: {
        label: 'Perbarui',
        labelPast: 'Diperbarui',
        icon: <Edit3 className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    delete: {
        label: 'Hapus',
        labelPast: 'Dihapus',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
    bulk_delete: {
        label: 'Hapus Massal',
        labelPast: 'Dihapus Massal',
        icon: <Trash2 className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
};

// Entity configuration
const entityConfig: Record<SoftDeleteEntity, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}> = {
    students: {
        label: 'Siswa',
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    classes: {
        label: 'Kelas',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    attendance: {
        label: 'Absensi',
        icon: <ClipboardCheck className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
};

// Entity labels (for backward compatibility)
const entityLabels: Record<SoftDeleteEntity, string> = {
    students: 'Siswa',
    classes: 'Kelas',
    attendance: 'Absensi',
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
    const [showInfo, setShowInfo] = useState(false);
    const [viewDetailItem, setViewDetailItem] = useState<ActionHistoryItem | null>(null);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);
    const pageSize = 20;

    // Fetch action history
    const { data, isLoading } = useQuery({
        queryKey: ['action-history', user?.id, page, pageSize, filterType, filterEntity, dateRange, searchQuery],
        queryFn: () => getActionHistory(user!.id, pageSize, page * pageSize, {
            type: filterType,
            entity: filterEntity,
            startDate: dateRange.start,
            endDate: dateRange.end,
            search: searchQuery
        }),
        enabled: !!user,
    });

    const actions = useMemo(() => data?.items || [], [data?.items]);
    const totalCount = data?.total || 0;

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
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            toast.success('Aksi berhasil dibatalkan');
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
            setConfirmClearHistory(false);
            toast.success('Riwayat berhasil dihapus');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus riwayat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Statistics
    const stats = useMemo(() => {
        return {
            total: totalCount,
            undoable: actions.filter(a => a.canUndo).length
        };
    }, [actions, totalCount]);

    // Group by date
    const groupedActions = useMemo(() => {
        const groups: { [key: string]: ActionHistoryItem[] } = {};
        const today = new Date().toDateString();
        // Use new Date(Date.now()) to keep it pure(ish) inside Memo or just accept simple impurity for "yesterday"
        const yesterday = new Date(new Date().getTime() - 86400000).toDateString();

        actions.forEach(action => {
            const actionDate = new Date(action.createdAt);
            const dateString = actionDate.toDateString();

            let dateKey: string;
            if (dateString === today) {
                dateKey = 'Hari Ini';
            } else if (dateString === yesterday) {
                dateKey = 'Kemarin';
            } else {
                dateKey = actionDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                });
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(action);
        });

        return groups;
    }, [actions]);

    // Format time
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format relative time
    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        return formatTime(date);
    };

    // Render Previous State Item Details
    const renderDetailState = (state: Record<string, unknown>) => {
        const excludedKeys = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'school_id'];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {Object.entries(state)
                    .filter(([key]) => !excludedKeys.includes(key) && !key.endsWith('_id'))
                    .map(([key, value]) => (
                        <div key={key} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                                {value === null || value === undefined ? '-' : String(value)}
                            </div>
                        </div>
                    ))}
            </div>
        );
    };

    // Clear filters
    const clearFilters = () => {
        setFilterType('all');
        setFilterEntity('all');
        setDateRange({});
        setSearchQuery('');
        setPage(0);
    };

    const hasActiveFilters = filterType !== 'all' || filterEntity !== 'all' || dateRange.start || dateRange.end || searchQuery;
    const activeFilterCount = [
        filterType !== 'all',
        filterEntity !== 'all',
        !!dateRange.start,
        !!dateRange.end,
        !!searchQuery
    ].filter(Boolean).length;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Memuat riwayat aksi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full pb-24 lg:pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <History className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Aksi</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {totalCount} aksi ditemukan
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInfo(true)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shadow-sm"
                            title="Informasi"
                        >
                            <Info className="w-5 h-5" />
                        </button>

                        {data?.items && data.items.length > 0 && (
                            <Button
                                onClick={() => setConfirmClearHistory(true)}
                                disabled={clearHistoryMutation.isPending}
                                variant="outline"
                                className="bg-white dark:bg-slate-800/50 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Riwayat
                            </Button>
                        )}
                    </div>
                </div>

                {/* Simplified Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Total Aksi</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <RotateCcw className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 text-right">
                                {stats.undoable > 0 ? `${stats.undoable} di halaman ini` : 'N/A'}
                            </div>
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Dapat Dibatalkan</div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                placeholder="Cari riwayat aksi..."
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${hasActiveFilters
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm'
                                }`}
                        >
                            <Filter className="w-5 h-5" />
                            Filter
                            {hasActiveFilters && (
                                <span className="w-6 h-6 rounded-full bg-white/20 text-sm flex items-center justify-center font-semibold">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-5 shadow-sm animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Tipe Aksi
                                    </label>
                                    <select
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value as ActionType | 'all');
                                            setPage(0);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="all">Semua Tipe</option>
                                        {Object.entries(actionTypeConfig).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Tipe Data
                                    </label>
                                    <select
                                        value={filterEntity}
                                        onChange={(e) => {
                                            setFilterEntity(e.target.value as SoftDeleteEntity | 'all');
                                            setPage(0);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="all">Semua Data</option>
                                        {Object.entries(entityLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.start || ''}
                                        onChange={(e) => {
                                            setDateRange(prev => ({ ...prev, start: e.target.value }));
                                            setPage(0);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.end || ''}
                                        onChange={(e) => {
                                            setDateRange(prev => ({ ...prev, end: e.target.value }));
                                            setPage(0);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {totalCount} hasil ditemukan
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                    >
                                        Reset Semua Filter
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions List */}
                {actions.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-6">
                            <History className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tidak Ada Riwayat</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {hasActiveFilters
                                ? 'Tidak ada riwayat yang cocok dengan filter Anda. Coba ubah kriteria pencarian.'
                                : 'Belum ada aksi yang tercatat.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedActions).map(([date, groupActions]) => (
                            <div key={date} className="animate-fade-in">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{date}</h3>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                        {groupActions.length} aksi
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {groupActions.map(action => {
                                        const config = actionTypeConfig[action.actionType];
                                        const entity = entityConfig[action.entity];

                                        return (
                                            <div
                                                key={action.id}
                                                className={`group flex items-center gap-4 p-4 bg-white dark:bg-slate-800/40 border rounded-2xl hover:shadow-md transition-all ${action.canUndo
                                                    ? 'border-emerald-200 dark:border-emerald-500/20'
                                                    : 'border-slate-200 dark:border-slate-700/50'
                                                    }`}
                                            >
                                                {/* Icon */}
                                                <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} flex-shrink-0`}>
                                                    {config.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {action.description}
                                                    </p>
                                                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                                                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${config.bgColor} ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${entity?.bgColor || 'bg-slate-100 dark:bg-slate-800'} ${entity?.color || 'text-slate-500'}`}>
                                                            {entityLabels[action.entity] || action.entity}
                                                        </span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatRelativeTime(action.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => setViewDetailItem(action)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>

                                                    {action.canUndo ? (
                                                        <button
                                                            onClick={() => undoMutation.mutate(action.id)}
                                                            disabled={undoMutation.isPending}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                                                        >
                                                            <RotateCcw className={`w-4 h-4 ${undoMutation.isPending ? 'animate-spin' : ''}`} />
                                                            Undo
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                                                            <XCircle className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Tidak dapat dibatalkan</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Sebelumnya
                            </button>

                            <div className="flex items-center gap-1 px-4">
                                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center">
                                    {page + 1}
                                </span>
                                <span className="text-slate-400 mx-2">/</span>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                    {Math.ceil(totalCount / pageSize)}
                                </span>
                            </div>

                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * pageSize >= totalCount}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                Selanjutnya
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Modal */}
                <Modal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    title="Tentang Riwayat Aksi"
                >
                    <div className="space-y-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Apa itu Riwayat Aksi?</p>
                                <p className="text-sm">Riwayat Aksi mencatat semua perubahan data yang Anda lakukan, termasuk menambah, mengedit, dan menghapus data.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900 dark:text-white">Fitur Utama:</h4>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <RotateCcw className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span><strong>Undo</strong> - Batalkan aksi terakhir dalam waktu terbatas</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Filter className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span><strong>Filter</strong> - Cari berdasarkan tipe aksi, data, atau tanggal</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <span><strong>Statistik</strong> - Lihat ringkasan aktivitas Anda</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Aksi hanya dapat dibatalkan dalam waktu singkat setelah dilakukan.
                            </p>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Clear History Modal */}
                <Modal
                    isOpen={confirmClearHistory}
                    onClose={() => setConfirmClearHistory(false)}
                    title="Hapus Semua Riwayat"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">semua riwayat aksi</strong>?
                        </p>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Tindakan ini tidak dapat dibatalkan. Catatan riwayat akan hilang selamanya, namun pemulihan data (undo) mungkin masih bisa dilakukan jika dalam batas waktu.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmClearHistory(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => clearHistoryMutation.mutate()}
                                disabled={clearHistoryMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {clearHistoryMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Hapus Semua
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Detail Modal */}
                <Modal
                    isOpen={!!viewDetailItem}
                    onClose={() => setViewDetailItem(null)}
                    title="Detail Aksi"
                    maxWidth="max-w-2xl"
                >
                    {viewDetailItem && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${actionTypeConfig[viewDetailItem.actionType].bgColor} ${actionTypeConfig[viewDetailItem.actionType].color}`}>
                                    {React.cloneElement(actionTypeConfig[viewDetailItem.actionType].icon as React.ReactElement, { className: 'w-7 h-7' })}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {viewDetailItem.description}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        {formatRelativeTime(viewDetailItem.createdAt)} • {entityLabels[viewDetailItem.entity]}
                                    </p>
                                </div>
                            </div>

                            {viewDetailItem.previousState && viewDetailItem.previousState.length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                        {viewDetailItem.actionType === 'update' ? 'Data Sebelum Perubahan' : 'Data Terkait'}
                                    </h4>
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {viewDetailItem.previousState.map((state, idx) => (
                                            <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-1">
                                                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                                    Item #{idx + 1} ({String(state.id)})
                                                </div>
                                                {renderDetailState(state)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-500 italic">
                                    Tidak ada detail data yang tersimpan untuk aksi ini.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Button variant="ghost" onClick={() => setViewDetailItem(null)}>
                                    Tutup
                                </Button>
                                {viewDetailItem.canUndo && (
                                    <Button
                                        onClick={() => {
                                            if (viewDetailItem) {
                                                undoMutation.mutate(viewDetailItem.id);
                                                setViewDetailItem(null);
                                            }
                                        }}
                                        disabled={undoMutation.isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Undo Aksi Ini
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            </div >
        </div >
    );
};

export default ActionHistoryPage;
