import React from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import {
    Info,
    RotateCcw,
    Trash2,
    Eye,
    Clock,
    AlertTriangle,
    RefreshCw,
    Loader2,
    FileText,
} from 'lucide-react';
import {
    entityConfig,
    getItemDisplayName,
    getItemSubtitle,
    useTrashData,
} from '../hooks/useTrashData';
import { useTrashMutations } from '../hooks/useTrashMutations';
import { DeletedItem } from '../../../../services/SoftDeleteService';

interface TrashModalsProps {
    showInfo: boolean;
    setShowInfo: (show: boolean) => void;
    viewDetailItem: DeletedItem | null;
    setViewDetailItem: (item: DeletedItem | null) => void;
    confirmDeleteId: string | null;
    setConfirmDeleteId: (id: string | null) => void;
    itemToDelete: DeletedItem | null;
    confirmBulkDelete: boolean;
    setConfirmBulkDelete: (confirm: boolean) => void;
    selectedItemsCount: number;
    selectedItemsArray: DeletedItem[];
    confirmEmptyTrash: boolean;
    setConfirmEmptyTrash: (confirm: boolean) => void;
    totalCount: number;
    allDeletedItems: DeletedItem[];
    confirmRestoreAll: boolean;
    setConfirmRestoreAll: (confirm: boolean) => void;
    confirmRestoreEntity: ReturnType<typeof useTrashData>['confirmRestoreEntity'];
    setConfirmRestoreEntity: ReturnType<typeof useTrashData>['setConfirmRestoreEntity'];
    restoreEntityItems: DeletedItem[];
    
    // Mutations
    restoreMutation: ReturnType<typeof useTrashMutations>['restoreMutation'];
    restoreBulkMutation: ReturnType<typeof useTrashMutations>['restoreBulkMutation'];
    permanentDeleteMutation: ReturnType<typeof useTrashMutations>['permanentDeleteMutation'];
    bulkPermanentDeleteMutation: ReturnType<typeof useTrashMutations>['bulkPermanentDeleteMutation'];
}

export const TrashModals: React.FC<TrashModalsProps> = ({
    showInfo,
    setShowInfo,
    viewDetailItem,
    setViewDetailItem,
    confirmDeleteId,
    setConfirmDeleteId,
    itemToDelete,
    confirmBulkDelete,
    setConfirmBulkDelete,
    selectedItemsCount,
    selectedItemsArray,
    confirmEmptyTrash,
    setConfirmEmptyTrash,
    totalCount,
    allDeletedItems,
    confirmRestoreAll,
    setConfirmRestoreAll,
    confirmRestoreEntity,
    setConfirmRestoreEntity,
    restoreEntityItems,
    restoreMutation,
    restoreBulkMutation,
    permanentDeleteMutation,
    bulkPermanentDeleteMutation,
}) => {
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

    return (
        <>
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
                        Catatan: Sampah mendukung Siswa, Kelas, Absensi, Pelanggaran, Poin, dan Nilai. Tugas dihapus langsung secara permanen.
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${viewDetailItem ? (entityConfig[viewDetailItem.entity]?.bgColor || 'bg-slate-500/10') : ''} ${viewDetailItem ? (entityConfig[viewDetailItem.entity]?.color || 'text-slate-500') : ''}`}>
                            {viewDetailItem && (entityConfig[viewDetailItem.entity]?.icon || <FileText className="w-4 h-4" />)}
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
                        Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">{selectedItemsCount} item</strong> secara permanen?
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
                            Hapus {selectedItemsCount} Item
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
                        Apakah Anda yakin ingin mengosongkan sampah? Ini akan menghapus <strong className="text-slate-900 dark:text-white">{totalCount} item</strong> secara permanen.
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
                            onClick={() => bulkPermanentDeleteMutation.mutate(allDeletedItems)}
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
                        Apakah Anda yakin ingin memulihkan <strong className="text-slate-900 dark:text-white">{totalCount} item</strong> dari sampah?
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
                            onClick={() => restoreBulkMutation.mutate(allDeletedItems)}
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

            {/* Confirm Restore Entity Modal */}
            <Modal
                isOpen={!!confirmRestoreEntity}
                onClose={() => setConfirmRestoreEntity(null)}
                title="Pulihkan Kategori"
                icon={<RotateCcw className="w-5 h-5 text-emerald-500" />}
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400">
                        Apakah Anda yakin ingin memulihkan{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {restoreEntityItems.length} item
                        </strong>{' '}
                        dari kategori{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {confirmRestoreEntity ? (entityConfig[confirmRestoreEntity]?.labelPlural || confirmRestoreEntity) : ''}
                        </strong>
                        ?
                    </p>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" />
                            Item akan dikembalikan ke tempat semula.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setConfirmRestoreEntity(null)}>
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                if (restoreEntityItems.length > 0) {
                                    restoreBulkMutation.mutate(restoreEntityItems);
                                }
                                setConfirmRestoreEntity(null);
                            }}
                            disabled={restoreBulkMutation.isPending || restoreEntityItems.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {restoreBulkMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Pulihkan Kategori
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
export default TrashModals;
