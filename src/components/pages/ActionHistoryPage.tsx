import React from 'react';
import { Loader2 } from 'lucide-react';
import {
    useActionHistoryState,
    ActionHistoryHeader,
    ActionHistoryStatsCards,
    ActionHistoryFilters,
    ActionHistoryTimeline,
    ActionHistoryModals,
} from '../history';

const ActionHistoryPage: React.FC = () => {
    const {
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
    } = useActionHistoryState();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Memuat riwayat aksi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full pb-24 lg:pb-6">
                {/* Header */}
                <ActionHistoryHeader
                    totalCount={totalCount}
                    hasItems={actions.length > 0}
                    isClearPending={clearHistoryMutation.isPending}
                    onExportClick={() => setShowExport(true)}
                    onInfoClick={() => setShowInfo(true)}
                    onClearHistoryClick={() => setConfirmClearHistory(true)}
                />

                {/* Enhanced Stats Cards */}
                <ActionHistoryStatsCards stats={stats} />

                {/* Filter and Search Bar */}
                <ActionHistoryFilters
                    searchQuery={searchQuery}
                    onSearchChange={(query) => {
                        setSearchQuery(query);
                        setPage(0);
                    }}
                    showFilters={showFilters}
                    onToggleShowFilters={() => setShowFilters(!showFilters)}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    filterType={filterType}
                    onFilterTypeChange={(type) => {
                        setFilterType(type);
                        setPage(0);
                    }}
                    filterEntity={filterEntity}
                    onFilterEntityChange={(entity) => {
                        setFilterEntity(entity);
                        setPage(0);
                    }}
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                        setDateRange(range);
                        setPage(0);
                    }}
                    totalCount={totalCount}
                    onClearFilters={clearFilters}
                />

                {/* Actions List & Timeline */}
                <ActionHistoryTimeline
                    actions={actions}
                    groupedActions={groupedActions}
                    hasActiveFilters={hasActiveFilters}
                    page={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onViewDetail={setViewDetailItem}
                    onUndo={(actionId) => undoMutation.mutate(actionId)}
                    isUndoPending={undoMutation.isPending}
                    formatRelativeTime={formatRelativeTime}
                />

                {/* All Dialogs & Modals */}
                <ActionHistoryModals
                    showInfo={showInfo}
                    onCloseInfo={() => setShowInfo(false)}
                    confirmClearHistory={confirmClearHistory}
                    onCloseConfirmClear={() => setConfirmClearHistory(false)}
                    onConfirmClear={() => clearHistoryMutation.mutate()}
                    isClearPending={clearHistoryMutation.isPending}
                    viewDetailItem={viewDetailItem}
                    onCloseDetail={() => setViewDetailItem(null)}
                    onUndoDetail={(actionId) => {
                        undoMutation.mutate(actionId);
                        setViewDetailItem(null);
                    }}
                    isUndoPending={undoMutation.isPending}
                    formatRelativeTime={formatRelativeTime}
                    showExport={showExport}
                    onCloseExport={() => setShowExport(false)}
                    onExport={handleExport}
                    isExporting={isExporting}
                    actionsCount={actions.length}
                    totalCount={totalCount}
                />
            </div>
        </div>
    );
};

export default ActionHistoryPage;
