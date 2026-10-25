import { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../hooks/useToast';
import {
    getActionHistory,
    undo,
    clearHistory,
    ActionHistoryItem,
    ActionType,
} from '../../../services/UndoManager';
import { SoftDeleteEntity } from '../../../services/SoftDeleteService';
import { ActionHistoryDateRange, ActionHistoryStats } from '../types';
import { actionTypeConfig, entityLabels } from '../config';

export const useActionHistoryState = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ActionType | 'all'>('all');
    const [filterEntity, setFilterEntity] = useState<SoftDeleteEntity | 'all'>('all');
    const [dateRange, setDateRange] = useState<ActionHistoryDateRange>({});
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const [showInfo, setShowInfo] = useState(false);
    const [viewDetailItem, setViewDetailItem] = useState<ActionHistoryItem | null>(null);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
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
            const result = await undo(actionId, user?.id);
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

    // Statistics with action type breakdown
    const stats: ActionHistoryStats = useMemo(() => {
        const createCount = actions.filter(a => a.actionType === 'create').length;
        const updateCount = actions.filter(a => a.actionType === 'update').length;
        const deleteCount = actions.filter(a => a.actionType === 'delete' || a.actionType === 'bulk_delete').length;

        return {
            total: totalCount,
            undoable: actions.filter(a => a.canUndo).length,
            create: createCount,
            update: updateCount,
            delete: deleteCount,
        };
    }, [actions, totalCount]);

    // Group by date
    const groupedActions = useMemo(() => {
        const groups: { [key: string]: ActionHistoryItem[] } = {};
        const today = new Date().toDateString();
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

    // Format relative time helper
    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
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
        setPage(0);
    };

    // Export to CSV / JSON
    const handleExport = async (format: 'csv' | 'json') => {
        setIsExporting(true);
        try {
            const exportData = actions.map(action => ({
                tanggal: new Date(action.createdAt).toLocaleDateString('id-ID'),
                waktu: new Date(action.createdAt).toLocaleTimeString('id-ID'),
                tipe: actionTypeConfig[action.actionType]?.labelPast || action.actionType,
                entitas: entityLabels[action.entity] || action.entity,
                deskripsi: action.description,
                dapat_dibatalkan: action.canUndo ? 'Ya' : 'Tidak',
            }));

            if (format === 'csv') {
                const headers = ['Tanggal', 'Waktu', 'Tipe Aksi', 'Entitas', 'Deskripsi', 'Dapat Dibatalkan'];
                const csv = [
                    headers.join(','),
                    ...exportData.map(row =>
                        [row.tanggal, row.waktu, row.tipe, row.entitas, `"${row.deskripsi}"`, row.dapat_dibatalkan].join(',')
                    )
                ].join('\n');

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `riwayat-aksi-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
            } else {
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `riwayat-aksi-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
            }

            toast.success(`Berhasil export ${actions.length} riwayat aksi`);
            setShowExport(false);
        } catch (error) {
            toast.error('Gagal export data');
            console.error('Export error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = Boolean(
        filterType !== 'all' ||
        filterEntity !== 'all' ||
        dateRange.start ||
        dateRange.end ||
        searchQuery
    );

    const activeFilterCount = [
        filterType !== 'all',
        filterEntity !== 'all',
        !!dateRange.start,
        !!dateRange.end,
        !!searchQuery
    ].filter(Boolean).length;

    return {
        user,
        actions,
        totalCount,
        isLoading,
        stats,
        groupedActions,
        pageSize,
        page,
        setPage,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        filterEntity,
        setFilterEntity,
        dateRange,
        setDateRange,
        showFilters,
        setShowFilters,
        hasActiveFilters,
        activeFilterCount,
        clearFilters,
        showInfo,
        setShowInfo,
        viewDetailItem,
        setViewDetailItem,
        confirmClearHistory,
        setConfirmClearHistory,
        showExport,
        setShowExport,
        isExporting,
        handleExport,
        undoMutation,
        clearHistoryMutation,
        formatRelativeTime,
    };
};
