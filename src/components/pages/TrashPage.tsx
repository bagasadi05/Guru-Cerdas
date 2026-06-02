/**
 * Trash Page (Recycle Bin)
 * 
 * Displays soft-deleted items with restore and permanent delete options.
 * Items are automatically deleted after 30 days.
 */

import React from 'react';
import { Button } from '../ui/Button';
import { Trash2, Info, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useTrashData } from './trash/hooks/useTrashData';
import { useTrashMutations } from './trash/hooks/useTrashMutations';
import { TrashStats } from './trash/components/TrashStats';
import { TrashToolbar } from './trash/components/TrashToolbar';
import { TrashList } from './trash/components/TrashList';
import { TrashModals } from './trash/components/TrashModals';

const TrashPage: React.FC = () => {
    // 1. Data and UI States Hook
    const trashData = useTrashData();

    // 2. Mutations Hook
    const trashMutations = useTrashMutations({
        setSelectedItems: trashData.setSelectedItems,
        setConfirmDeleteId: trashData.setConfirmDeleteId,
        setConfirmBulkDelete: trashData.setConfirmBulkDelete,
        setConfirmEmptyTrash: trashData.setConfirmEmptyTrash,
        setConfirmRestoreAll: trashData.setConfirmRestoreAll,
    });

    if (trashData.isLoading) {
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
                                    {trashData.stats.total} item • Otomatis dihapus setelah 30 hari
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => trashData.setShowInfo(true)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shadow-sm"
                            title="Informasi"
                        >
                            <Info className="w-5 h-5" />
                        </button>

                        {trashData.stats.total > 0 && (
                            <>
                                <Button
                                    onClick={() => trashData.setConfirmRestoreAll(true)}
                                    disabled={trashMutations.restoreBulkMutation.isPending}
                                    variant="outline"
                                    className="bg-white dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Pulihkan Semua
                                </Button>
                                <Button
                                    onClick={() => trashData.setConfirmEmptyTrash(true)}
                                    disabled={trashMutations.bulkPermanentDeleteMutation.isPending}
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
                {trashData.stats.expiringToday > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-red-600 dark:text-red-400">
                                {trashData.stats.expiringToday} item akan dihapus permanen hari ini!
                            </p>
                            <p className="text-sm text-red-500/80 dark:text-red-400/70">
                                Pulihkan sekarang jika masih diperlukan.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <TrashStats
                    stats={trashData.stats}
                    filterEntity={trashData.filterEntity}
                    setFilterEntity={trashData.setFilterEntity}
                />

                {/* Search, Sort, and Actions Toolbar */}
                <TrashToolbar
                    searchQuery={trashData.searchQuery}
                    setSearchQuery={trashData.setSearchQuery}
                    filterEntity={trashData.filterEntity}
                    setFilterEntity={trashData.setFilterEntity}
                    sortBy={trashData.sortBy}
                    setSortBy={trashData.setSortBy}
                    showExpiringOnly={trashData.showExpiringOnly}
                    setShowExpiringOnly={trashData.setShowExpiringOnly}
                    selectedItems={trashData.selectedItems}
                    selectedItemsArray={trashData.selectedItemsArray}
                    restoreBulkMutation={trashMutations.restoreBulkMutation}
                    setConfirmBulkDelete={trashData.setConfirmBulkDelete}
                    hasActiveFilters={trashData.hasActiveFilters}
                    stats={trashData.stats}
                />

                {/* Items List */}
                <TrashList
                    filteredItems={trashData.filteredItems}
                    groupedItems={trashData.groupedItems}
                    selectedItems={trashData.selectedItems}
                    toggleSelect={trashData.toggleSelect}
                    selectAll={trashData.selectAll}
                    searchQuery={trashData.searchQuery}
                    filterEntity={trashData.filterEntity}
                    setConfirmRestoreEntity={trashData.setConfirmRestoreEntity}
                    setViewDetailItem={trashData.setViewDetailItem}
                    setConfirmDeleteId={trashData.setConfirmDeleteId}
                    restoreMutation={trashMutations.restoreMutation}
                />

                {/* Interactive Modals Dialog Switcher */}
                <TrashModals
                    showInfo={trashData.showInfo}
                    setShowInfo={trashData.setShowInfo}
                    viewDetailItem={trashData.viewDetailItem}
                    setViewDetailItem={trashData.setViewDetailItem}
                    confirmDeleteId={trashData.confirmDeleteId}
                    setConfirmDeleteId={trashData.setConfirmDeleteId}
                    itemToDelete={trashData.itemToDelete}
                    confirmBulkDelete={trashData.confirmBulkDelete}
                    setConfirmBulkDelete={trashData.setConfirmBulkDelete}
                    selectedItemsCount={trashData.selectedItems.size}
                    selectedItemsArray={trashData.selectedItemsArray}
                    confirmEmptyTrash={trashData.confirmEmptyTrash}
                    setConfirmEmptyTrash={trashData.setConfirmEmptyTrash}
                    totalCount={trashData.stats.total}
                    allDeletedItems={trashData.allDeletedItems}
                    confirmRestoreAll={trashData.confirmRestoreAll}
                    setConfirmRestoreAll={trashData.setConfirmRestoreAll}
                    confirmRestoreEntity={trashData.confirmRestoreEntity}
                    setConfirmRestoreEntity={trashData.setConfirmRestoreEntity}
                    restoreEntityItems={trashData.restoreEntityItems}
                    restoreMutation={trashMutations.restoreMutation}
                    restoreBulkMutation={trashMutations.restoreBulkMutation}
                    permanentDeleteMutation={trashMutations.permanentDeleteMutation}
                    bulkPermanentDeleteMutation={trashMutations.bulkPermanentDeleteMutation}
                />
            </div>
        </div>
    );
};

export default TrashPage;
