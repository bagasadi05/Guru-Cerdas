import React from 'react';
import { Button } from '../../../ui/Button';
import { Trash2, RotateCcw, Clock, Eye, FileText } from 'lucide-react';
import {
    entityConfig,
    getItemDisplayName,
    getItemSubtitle,
    getViolationRiskBadge,
    formatDeletedTime,
    useTrashData,
} from '../hooks/useTrashData';
import { useTrashMutations } from '../hooks/useTrashMutations';
import { DeletedItem, SoftDeleteEntity } from '../../../../services/SoftDeleteService';

interface TrashListProps {
    filteredItems: DeletedItem[];
    groupedItems: Record<SoftDeleteEntity, DeletedItem[]>;
    selectedItems: Set<string>;
    toggleSelect: (id: string) => void;
    selectAll: () => void;
    searchQuery: string;
    filterEntity: ReturnType<typeof useTrashData>['filterEntity'];
    setConfirmRestoreEntity: (entity: SoftDeleteEntity | null) => void;
    setViewDetailItem: (item: DeletedItem | null) => void;
    setConfirmDeleteId: (id: string | null) => void;
    restoreMutation: ReturnType<typeof useTrashMutations>['restoreMutation'];
}

export const TrashList: React.FC<TrashListProps> = ({
    filteredItems,
    groupedItems,
    selectedItems,
    toggleSelect,
    selectAll,
    searchQuery,
    filterEntity,
    setConfirmRestoreEntity,
    setViewDetailItem,
    setConfirmDeleteId,
    restoreMutation,
}) => {
    if (filteredItems.length === 0) {
        return (
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
        );
    }

    return (
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

                const rawConfig = entityConfig[entity as SoftDeleteEntity];
                const config = rawConfig || {
                    label: entity,
                    labelPlural: entity,
                    icon: <FileText className="w-4 h-4" />,
                    color: 'text-slate-500',
                    bgColor: 'bg-slate-500/10',
                    borderColor: 'border-slate-500/20',
                };

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
                            {items.length > 0 && (
                                <Button
                                    onClick={() => setConfirmRestoreEntity(entity as SoftDeleteEntity)}
                                    size="sm"
                                    variant="ghost"
                                    className="ml-auto text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1.5" />
                                    Pulihkan Semua {config.labelPlural}
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-3">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className={`group flex items-center gap-4 p-4 bg-white dark:bg-slate-800/40 border rounded-2xl hover:shadow-md transition-all ${
                                        selectedItems.has(item.id)
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
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                {getItemDisplayName(item)}
                                            </p>
                                            {getViolationRiskBadge(item) && (
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                                                    {getViolationRiskBadge(item)}
                                                </span>
                                            )}
                                        </div>
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

                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                                        item.daysRemaining <= 3
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
    );
};
