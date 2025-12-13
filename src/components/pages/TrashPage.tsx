/**
 * Trash Page (Recycle Bin)
 * 
 * Displays soft-deleted items with restore and permanent delete options.
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
    CheckSquare,
    Clock,
    Search,
    Filter,
    MoreVertical,
    Loader2,
} from 'lucide-react';
import {
    getAllDeletedItems,
    restore,
    restoreBulk,
    permanentDelete,
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
}> = {
    students: {
        label: 'Siswa',
        labelPlural: 'Siswa',
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    classes: {
        label: 'Kelas',
        labelPlural: 'Kelas',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    attendance: {
        label: 'Absensi',
        labelPlural: 'Absensi',
        icon: <ClipboardCheck className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    tasks: {
        label: 'Tugas',
        labelPlural: 'Tugas',
        icon: <CheckSquare className="w-4 h-4" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
    },
};

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
        case 'tasks':
            return data.title || data.judul || 'Tugas';
        default:
            return 'Item';
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

    // Fetch deleted items
    const { data: deletedItems = [], isLoading, refetch } = useQuery({
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
            // Also invalidate the entity queries
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Item berhasil dipulihkan');
        },
        onError: (error) => {
            toast.error(`Gagal memulihkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Restore bulk mutation
    const restoreBulkMutation = useMutation({
        mutationFn: async (items: DeletedItem[]) => {
            // Group by entity
            const grouped = items.reduce((acc, item) => {
                if (!acc[item.entity]) acc[item.entity] = [];
                acc[item.entity].push(item.id);
                return acc;
            }, {} as Record<SoftDeleteEntity, string[]>);

            // Restore each group
            for (const [entity, ids] of Object.entries(grouped)) {
                const result = await restoreBulk(entity as SoftDeleteEntity, ids);
                if (!result.success) throw new Error(result.error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedItems(new Set());
            toast.success('Item berhasil dipulihkan');
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            setSelectedItems(new Set());
            setConfirmBulkDelete(false);
            toast.success('Item dihapus permanen');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        },
    });

    // Filter and search
    const filteredItems = useMemo(() => {
        return deletedItems.filter(item => {
            // Filter by entity
            if (filterEntity !== 'all' && item.entity !== filterEntity) {
                return false;
            }

            // Search
            if (searchQuery) {
                const displayName = getItemDisplayName(item).toLowerCase();
                if (!displayName.includes(searchQuery.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }, [deletedItems, filterEntity, searchQuery]);

    // Group by entity
    const groupedItems = useMemo(() => {
        const groups: Record<SoftDeleteEntity, DeletedItem[]> = {
            students: [],
            classes: [],
            attendance: [],
            tasks: [],
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
            tasks: deletedItems.filter(i => i.entity === 'tasks').length,
            expiringToday: deletedItems.filter(i => i.daysRemaining <= 1).length,
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sampah</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Item yang dihapus akan disimpan selama 30 hari sebelum dihapus permanen
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Total</div>
                    </div>
                    {Object.entries(entityConfig).map(([key, config]) => (
                        <div
                            key={key}
                            className={`bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md ${filterEntity === key ? 'ring-2 ring-indigo-500' : ''
                                }`}
                            onClick={() => setFilterEntity(filterEntity === key ? 'all' : key as SoftDeleteEntity)}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`${config.color}`}>{config.icon}</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats[key as keyof typeof stats]}
                                </div>
                            </div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                                {config.labelPlural}
                            </div>
                        </div>
                    ))}
                    {stats.expiringToday > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <div className="text-2xl font-bold text-red-400">{stats.expiringToday}</div>
                            </div>
                            <div className="text-xs font-medium text-red-400/70 uppercase tracking-wider mt-1">
                                Segera Hapus
                            </div>
                        </div>
                    )}
                </div>

                {/* Search and Actions */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari item yang dihapus..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                    </div>

                    {selectedItems.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">
                                {selectedItems.size} dipilih
                            </span>
                            <Button
                                onClick={() => restoreBulkMutation.mutate(selectedItemsArray)}
                                disabled={restoreBulkMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Pulihkan
                            </Button>
                            <Button
                                onClick={() => setConfirmBulkDelete(true)}
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Permanen
                            </Button>
                        </div>
                    )}
                </div>

                {/* Items List */}
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Trash2 className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Sampah Kosong</h3>
                        <p className="text-slate-500 dark:text-slate-400">Tidak ada item yang dihapus</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Select All */}
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                    onChange={selectAll}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Pilih Semua</span>
                            </label>
                        </div>

                        {/* Grouped Items */}
                        {Object.entries(groupedItems).map(([entity, items]) => {
                            if (items.length === 0) return null;

                            const config = entityConfig[entity as SoftDeleteEntity];

                            return (
                                <div key={entity}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`w-6 h-6 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
                                            {config.icon}
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{config.labelPlural}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">({items.length})</span>
                                    </div>

                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-sm ${selectedItems.has(item.id) ? 'ring-2 ring-indigo-500' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                                                />

                                                <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color}`}>
                                                    {config.icon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                                        {getItemDisplayName(item)}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        Dihapus {new Date(item.deletedAt).toLocaleDateString('id-ID')}
                                                    </p>
                                                </div>

                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${item.daysRemaining <= 3
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : item.daysRemaining <= 7
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-slate-700/50 text-slate-400'
                                                    }`}>
                                                    <Clock className="w-3 h-3" />
                                                    {item.daysRemaining} hari lagi
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => restoreMutation.mutate(item)}
                                                        disabled={restoreMutation.isPending}
                                                        className="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                                                        title="Pulihkan"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                                        title="Hapus Permanen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

                {/* Confirm Delete Modal */}
                <Modal
                    isOpen={!!confirmDeleteId}
                    onClose={() => setConfirmDeleteId(null)}
                    title="Hapus Permanen"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus <strong>{itemToDelete && getItemDisplayName(itemToDelete)}</strong> secara permanen?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-3">
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
                    title="Hapus Permanen"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus <strong>{selectedItems.size} item</strong> secara permanen?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-3">
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
            </div>
        </div>
    );
};

export default TrashPage;
