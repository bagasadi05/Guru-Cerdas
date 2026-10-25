import React from 'react';
import {
    CheckSquareIcon,
    AlertTriangleIcon,
    Loader2Icon,
} from '../../../Icons';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { TaskRow, TaskStatus } from '../types';

export interface TasksModalsProps {
    isModalOpen: boolean;
    onCloseModal: () => void;
    editingTask: TaskRow | null;
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    dueDate: string;
    onDueDateChange: (value: string) => void;
    status: TaskStatus;
    onStatusChange: (status: TaskStatus) => void;
    errors: Record<string, string>;
    isPastDate: boolean;
    isSavePending: boolean;
    onSubmitForm: (e: React.FormEvent) => void;
    taskToDeleteId: string | null;
    onCloseDeleteModal: () => void;
    onConfirmDelete: (id: string) => void;
    isConfirmingClearAll: boolean;
    onCloseClearAllModal: () => void;
    onConfirmClearAll: () => void;
    isClearAllPending: boolean;
}

export const TasksModals: React.FC<TasksModalsProps> = ({
    isModalOpen,
    onCloseModal,
    editingTask,
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    dueDate,
    onDueDateChange,
    status,
    onStatusChange,
    errors,
    isPastDate,
    isSavePending,
    onSubmitForm,
    taskToDeleteId,
    onCloseDeleteModal,
    onConfirmDelete,
    isConfirmingClearAll,
    onCloseClearAllModal,
    onConfirmClearAll,
    isClearAllPending,
}) => {
    return (
        <>
            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={onCloseModal}
                title={editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
                icon={<CheckSquareIcon className="w-5 h-5" />}
            >
                <form onSubmit={onSubmitForm} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Judul Tugas
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="Masukkan judul tugas..."
                            error={errors.title}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Deskripsi (opsional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                            placeholder="Tambahkan deskripsi..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Tenggat Waktu
                            </label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => onDueDateChange(e.target.value)}
                            />
                            {isPastDate && (
                                <div className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                                    Tenggat waktu berada di masa lalu.
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Status
                            </label>
                            <CustomDropdown
                                value={status}
                                onChange={(val) => onStatusChange(val as TaskStatus)}
                                options={[
                                    { value: 'todo', label: 'Belum Mulai' },
                                    { value: 'in_progress', label: 'Sedang Dikerjakan' },
                                    { value: 'done', label: 'Selesai' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCloseModal}
                            className="rounded-xl cursor-pointer active:scale-95 duration-150"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSavePending}
                            className="bg-brand-600 hover:bg-brand-700 rounded-xl cursor-pointer active:scale-95 duration-150 text-white shadow-sm"
                        >
                            {isSavePending && (
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {editingTask ? 'Simpan Perubahan' : 'Tambah Tugas'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!taskToDeleteId}
                onClose={onCloseDeleteModal}
                title="Konfirmasi Hapus Tugas"
                icon={<AlertTriangleIcon className="w-5 h-5 text-red-500" />}
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini akan memindahkan tugas ke tempat sampah dan tidak dapat diurungkan secara instan dari papan ini.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="ghost"
                            onClick={onCloseDeleteModal}
                            className="rounded-xl cursor-pointer active:scale-95 duration-150"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                if (taskToDeleteId) {
                                    onConfirmDelete(taskToDeleteId);
                                    onCloseDeleteModal();
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer active:scale-95 duration-150"
                        >
                            Ya, Hapus
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Clear Completed Tasks Confirmation Modal */}
            <Modal
                isOpen={isConfirmingClearAll}
                onClose={onCloseClearAllModal}
                title="Bersihkan Tugas Selesai"
                icon={<AlertTriangleIcon className="w-5 h-5 text-red-500" />}
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Apakah Anda yakin ingin membersihkan semua tugas yang telah selesai? Tindakan ini akan menghapus secara massal seluruh tugas di kolom "Selesai".
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="ghost"
                            onClick={onCloseClearAllModal}
                            className="rounded-xl cursor-pointer active:scale-95 duration-150"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                onConfirmClearAll();
                                onCloseClearAllModal();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer active:scale-95 duration-150"
                            disabled={isClearAllPending}
                        >
                            {isClearAllPending && (
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Ya, Bersihkan
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
