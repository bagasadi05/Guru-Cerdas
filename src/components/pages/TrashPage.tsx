/**
 * Trash Page (Recycle Bin)
 * 
 * Displays soft-deleted items with restore and permanent delete options.
 * Items are automatically deleted after 30 days.
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
    Trash2,
    RotateCcw,
    AlertTriangle,
    Users,
    BookOpen,
    ClipboardCheck,
    Clock,
    Search,
    Loader2,
    ArrowUpDown,
    Info,
    RefreshCw,
    Sparkles,
    Eye,
} from 'lucide-react';
import {
    getAllDeletedItems,
    restore,
    restoreBulk,
    permanentDelete,
    cleanupExpired,
    SoftDeleteEntity,
    DeletedItem,
} from '../../services/SoftDeleteService';

// Entity configuration
const entityConfig: Record<SoftDeleteEntity, {
    label: string;
    labelPlural: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    students: {
        label: 'Siswa',
        labelPlural: 'Siswa',
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    classes: {
        label: 'Kelas',
        labelPlural: 'Kelas',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
    },
    attendance: {
        label: 'Absensi',
        labelPlural: 'Absensi',
        icon: <ClipboardCheck className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
    },
};

// Sorting options
type SortOption = 'newest' | 'oldest' | 'expiring';
const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Terbaru Dihapus' },
    { value: 'oldest', label: 'Terlama Dihapus' },
    { value: 'expiring', label: 'Segera Dihapus' },
];

// Get display name for an item
function getItemDisplayName(item: DeletedItem): string {
    const data = item.data;
    switch (item.entity) {
        case 'students':
            return data.name || data.nama || 'Siswa';
        case 'classes':
            return data.name || data.nama || 'Kelas';
        case 'attendance':
            return `Absensi ${data.date || data.tanggal || ''}`;
        default:
            return 'Item';
    }
}

// Get additional info for an item
function getItemSubtitle(item: DeletedItem): string {
    const data = item.data;
    switch (item.entity) {
        case 'students':
            return data.class_name || data.nis || '';
        case 'classes':
            return `${data.student_count || 0} siswa`;
        case 'attendance':
            return data.status || '';
        default:
            return '';
    }
}

const TrashPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterEntity, setFilterEntity] = useState<SoftDeleteEntity | 'all'>('all');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [viewDetailItem, setViewDetailItem] = useState<DeletedItem | null>(null);

    const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
    const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showInfo, setShowInfo] = useState(false);

    // Fetch deleted items
    const { data: deletedItems = [], isLoading } = useQuery({
        queryKey: ['deleted-items', user?.id],
        queryFn: () => getAllDeletedItems(user!.id),
        enabled: !!user,
    });

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: async (item: DeletedItem) => {
            const result = await restore(item.entity, item.id);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            toast.success('Item berhasil dipulihkan');
        },
        onError: (error) => {
            toast.error(`Gagal memulihkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Restore bulk mutation
    const restoreBulkMutation = useMutation({
        mutationFn: async (items: DeletedItem[]) => {
            const grouped = items.reduce((acc, item) => {
                if (!acc[item.entity]) acc[item.entity] = [];
                acc[item.entity].push(item.id);
                return acc;
            }, {} as Record<SoftDeleteEntity, string[]>);

            for (const [entity, ids] of Object.entries(grouped)) {
                const result = await restoreBulk(entity as SoftDeleteEntity, ids);
                if (!result.success) throw new Error(result.error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setSelectedItems(new Set());
            setConfirmRestoreAll(false);
            toast.success(`${variables.length} item berhasil dipulihkan`);
        },
        onError: (error) => {
            toast.error(`Gagal memulihkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Permanent delete mutation
    const permanentDeleteMutation = useMutation({
        mutationFn: async (item: DeletedItem) => {
            const result = await permanentDelete(item.entity, item.id);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            setConfirmDeleteId(null);
            toast.success('Item dihapus permanen');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Bulk permanent delete
    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (items: DeletedItem[]) => {
            for (const item of items) {
                const result = await permanentDelete(item.entity, item.id);
                if (!result.success) throw new Error(result.error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            setSelectedItems(new Set());
            setConfirmBulkDelete(false);
            setConfirmEmptyTrash(false);
            toast.success(`${variables.length} item dihapus permanen`);
        },
        onError: (error) => {
            toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Filter, search, and sort
    const filteredItems = useMemo(() => {
        const items = deletedItems.filter(item => {
            if (filterEntity !== 'all' && item.entity !== filterEntity) {
                return false;
            }
            if (searchQuery) {
                const displayName = getItemDisplayName(item).toLowerCase();
                if (!displayName.includes(searchQuery.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });

        // Apply sorting
        items.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
                case 'oldest':
                    return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
                case 'expiring':
                    return a.daysRemaining - b.daysRemaining;
                default:
                    return 0;
            }
        });

        return items;
    }, [deletedItems, filterEntity, searchQuery, sortBy]);

    // Group by entity
    const groupedItems = useMemo(() => {
        const groups: Record<SoftDeleteEntity, DeletedItem[]> = {
            students: [],
            classes: [],
            attendance: [],
        };

        filteredItems.forEach(item => {
            groups[item.entity].push(item);
        });

        return groups;
    }, [filteredItems]);

    // Stats
    const stats = useMemo(() => {
        return {
            total: deletedItems.length,
            students: deletedItems.filter(i => i.entity === 'students').length,
            classes: deletedItems.filter(i => i.entity === 'classes').length,
            attendance: deletedItems.filter(i => i.entity === 'attendance').length,
            expiringToday: deletedItems.filter(i => i.daysRemaining <= 1).length,
            expiringThisWeek: deletedItems.filter(i => i.daysRemaining <= 7).length,
        };
    }, [deletedItems]);

    // Toggle item selection
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // Select all visible
    const selectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.id)));
        }
    };

    // Get selected items as array
    const selectedItemsArray = useMemo(() => {
        return filteredItems.filter(i => selectedItems.has(i.id));
    }, [filteredItems, selectedItems]);

    const itemToDelete = confirmDeleteId
        ? deletedItems.find(i => i.id === confirmDeleteId)
        : null;

    // Format relative time
    const formatDeletedTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hari ini';
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari lalu`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
        return date.toLocaleDateString('id-ID');
    };

    // Cleanup expired items on mount
    React.useEffect(() => {
        const performCleanup = async () => {
            const result = await cleanupExpired();
            if (result.success && Object.values(result.deletedCounts).some(c => c > 0)) {
                const total = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
                toast.info(`${total} item kadaluarsa (>30 hari) telah dibersihkan otomatis.`);
                queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            }
        };
        performCleanup();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Render item details
    const renderItemDetails = (item: DeletedItem) => {
        const excludedKeys = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'school_id'];
        const formatValue = (key: string, value: unknown) => {
            if (value === null || value === undefined) return '-';
            if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
            if (key.includes('percentage') || key.includes('score')) return `${value}`;
            return value.toString();
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(item.data)
                    .filter(([key]) => !excludedKeys.includes(key) && !key.endsWith('_id'))
                    .map(([key, value]) => (
                        <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                                {formatValue(key, value)}
                            </div>
                        </div>
                    ))}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Memuat item yang dihapus...</p>
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
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                                <Trash2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sampah</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {stats.total} item • Otomatis dihapus setelah 30 hari
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

                        {stats.total > 0 && (
                            <>
                                <Button
                                    onClick={() => setConfirmRestoreAll(true)}
                                    disabled={restoreBulkMutation.isPending}
                                    variant="outline"
                                    className="bg-white dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Pulihkan Semua
                                </Button>
                                <Button
                                    onClick={() => setConfirmEmptyTrash(true)}
                                    disabled={bulkPermanentDeleteMutation.isPending}
                                    variant="outline"
                                    className="bg-white dark:bg-slate-800/50 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Kosongkan
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Warning Banner for Expiring Items */}
                {stats.expiringToday > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-red-600 dark:text-red-400">
                                {stats.expiringToday} item akan dihapus permanen hari ini!
                            </p>
                            <p className="text-sm text-red-500/80 dark:text-red-400/70">
                                Pulihkan sekarang jika masih diperlukan.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        onClick={() => setFilterEntity('all')}
                        className={`bg-white dark:bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${filterEntity === 'all' ? 'ring-2 ring-indigo-500 border-indigo-500/50' : 'border-slate-200 dark:border-slate-700/50'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Total Item</div>
                    </div>

                    {Object.entries(entityConfig).map(([key, config]) => (
                        <div
                            key={key}
                            onClick={() => setFilterEntity(filterEntity === key ? 'all' : key as SoftDeleteEntity)}
                            className={`bg-white dark:bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${filterEntity === key ? `ring-2 ring-indigo-500 ${config.borderColor}` : 'border-slate-200 dark:border-slate-700/50'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
                                    {config.icon}
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats[key as keyof typeof stats]}
                                </div>
                            </div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">
                                {config.labelPlural}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search, Sort, and Actions */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari item yang dihapus..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow"
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="appearance-none pl-10 pr-10 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>

                    {selectedItems.size > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                {selectedItems.size} dipilih
                            </span>
                            <Button
                                onClick={() => restoreBulkMutation.mutate(selectedItemsArray)}
                                disabled={restoreBulkMutation.isPending}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                Pulihkan
                            </Button>
                            <Button
                                onClick={() => setConfirmBulkDelete(true)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Hapus
                            </Button>
                        </div>
                    )}
                </div>

                {/* Items List */}
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-6">
                            <Trash2 className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sampah Kosong</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {searchQuery || filterEntity !== 'all'
                                ? 'Tidak ada item yang cocok dengan filter Anda'
                                : 'Tidak ada item yang dihapus. Item yang dihapus akan muncul di sini.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Select All */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                    onChange={selectAll}
                                    className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    Pilih Semua ({filteredItems.length})
                                </span>
                            </label>
                        </div>

                        {/* Grouped Items */}
                        {Object.entries(groupedItems).map(([entity, items]) => {
                            if (items.length === 0) return null;

                            const config = entityConfig[entity as SoftDeleteEntity];

                            return (
                                <div key={entity} className="animate-fade-in">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-8 h-8 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color}`}>
                                            {config.icon}
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{config.labelPlural}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                            {items.length}
                                        </span>
                                    </div>

                                    <div className="grid gap-3">
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                className={`group flex items-center gap-4 p-4 bg-white dark:bg-slate-800/40 border rounded-2xl hover:shadow-md transition-all ${selectedItems.has(item.id)
                                                    ? 'ring-2 ring-indigo-500 border-indigo-500/50'
                                                    : 'border-slate-200 dark:border-slate-700/50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800 cursor-pointer"
                                                />

                                                <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} flex-shrink-0`}>
                                                    {config.icon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {getItemDisplayName(item)}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {getItemSubtitle(item) && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                {getItemSubtitle(item)}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                                            Dihapus {formatDeletedTime(item.deletedAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${item.daysRemaining <= 3
                                                    ? 'bg-red-500/15 text-red-500 dark:text-red-400'
                                                    : item.daysRemaining <= 7
                                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {item.daysRemaining} hari
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setViewDetailItem(item)}
                                                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => restoreMutation.mutate(item)}
                                                        disabled={restoreMutation.isPending}
                                                        className="p-2.5 rounded-xl hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-500 transition-colors"
                                                        title="Pulihkan"
                                                    >
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                        className="p-2.5 rounded-xl hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Hapus Permanen"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info Modal */}
                <Modal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    title="Tentang Sampah"
                >
                    <div className="space-y-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Penyimpanan Sementara</p>
                                <p className="text-sm">Item yang dihapus akan disimpan di sini selama 30 hari sebelum dihapus permanen.</p>
                            </div>
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-emerald-500" />
                                <span><strong>Pulihkan</strong> - Mengembalikan item ke tempat semula</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span><strong>Hapus Permanen</strong> - Menghapus item selamanya (tidak dapat dikembalikan)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span><strong>Lihat Detail</strong> - Memeriksa data lengkap sebelum memulihkan</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span><strong>Sisa Waktu</strong> - Menunjukkan berapa hari sebelum item dihapus otomatis</span>
                            </li>
                        </ul>
                        <p className="text-xs text-slate-500 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                            Catatan: Data Siswa, Kelas, dan Absensi mendukung fitur Sampah. Tugas dihapus langsung secara permanen.
                        </p>
                    </div>
                </Modal>

                {/* Item Detail Modal */}
                <Modal
                    isOpen={!!viewDetailItem}
                    onClose={() => setViewDetailItem(null)}
                    title="Detail Item"
                    icon={<Eye className="w-5 h-5 text-indigo-500" />}
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${viewDetailItem ? entityConfig[viewDetailItem.entity].bgColor : ''} ${viewDetailItem ? entityConfig[viewDetailItem.entity].color : ''}`}>
                                {viewDetailItem && entityConfig[viewDetailItem.entity].icon}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    {viewDetailItem && getItemDisplayName(viewDetailItem)}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {viewDetailItem && getItemSubtitle(viewDetailItem)}
                                </p>
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {viewDetailItem && renderItemDetails(viewDetailItem)}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="ghost" onClick={() => setViewDetailItem(null)}>
                                Tutup
                            </Button>
                            <Button
                                onClick={() => {
                                    if (viewDetailItem) {
                                        restoreMutation.mutate(viewDetailItem);
                                        setViewDetailItem(null);
                                    }
                                }}
                                disabled={restoreMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Pulihkan Item Ini
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Delete Modal */}
                <Modal
                    isOpen={!!confirmDeleteId}
                    onClose={() => setConfirmDeleteId(null)}
                    title="Hapus Permanen"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">{itemToDelete && getItemDisplayName(itemToDelete)}</strong> secara permanen?
                        </p>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => itemToDelete && permanentDeleteMutation.mutate(itemToDelete)}
                                disabled={permanentDeleteMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {permanentDeleteMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Hapus Permanen
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Bulk Delete Modal */}
                <Modal
                    isOpen={confirmBulkDelete}
                    onClose={() => setConfirmBulkDelete(false)}
                    title="Hapus Item Terpilih"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">{selectedItems.size} item</strong> secara permanen?
                        </p>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmBulkDelete(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => bulkPermanentDeleteMutation.mutate(selectedItemsArray)}
                                disabled={bulkPermanentDeleteMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {bulkPermanentDeleteMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Hapus {selectedItems.size} Item
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Empty Trash Modal */}
                <Modal
                    isOpen={confirmEmptyTrash}
                    onClose={() => setConfirmEmptyTrash(false)}
                    title="Kosongkan Sampah"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin mengosongkan sampah? Ini akan menghapus <strong className="text-slate-900 dark:text-white">{stats.total} item</strong> secara permanen.
                        </p>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Semua item akan dihapus selamanya dan tidak dapat dikembalikan.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmEmptyTrash(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => bulkPermanentDeleteMutation.mutate(deletedItems)}
                                disabled={bulkPermanentDeleteMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {bulkPermanentDeleteMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Kosongkan Sampah
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Restore All Modal */}
                <Modal
                    isOpen={confirmRestoreAll}
                    onClose={() => setConfirmRestoreAll(false)}
                    title="Pulihkan Semua Item"
                    icon={<RefreshCw className="w-5 h-5 text-emerald-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin memulihkan <strong className="text-slate-900 dark:text-white">{stats.total} item</strong> dari sampah?
                        </p>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4" />
                                Semua item akan dikembalikan ke tempat semula.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmRestoreAll(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => restoreBulkMutation.mutate(deletedItems)}
                                disabled={restoreBulkMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {restoreBulkMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Pulihkan Semua
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default TrashPage;
