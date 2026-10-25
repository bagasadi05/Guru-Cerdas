import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Gender, ExtracurricularStudent } from '../types';

export interface NewStudentRow {
    name: string;
    gender: Gender;
    class_name: string;
}

interface AddExternalStudentModalProps {
    isOpen: boolean;
    extracurricularName?: string;
    newStudentRows: NewStudentRow[];
    setNewStudentRows: React.Dispatch<React.SetStateAction<NewStudentRow[]>>;
    bulkClassName: string;
    setBulkClassName: (name: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    isSubmitting?: boolean;
}

export const AddExternalStudentModal: React.FC<AddExternalStudentModalProps> = ({
    isOpen,
    extracurricularName,
    newStudentRows,
    setNewStudentRows,
    bulkClassName,
    setBulkClassName,
    onSubmit,
    onClose,
    isSubmitting = false,
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="presentation"
                aria-hidden="true"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                    Tambah Siswa Eksternal
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {extracurricularName
                        ? `Siswa yang ditambahkan akan langsung terdaftar sebagai anggota ${extracurricularName}.`
                        : 'Tambahkan profil siswa eksternal ke direktori. Anda dapat mendaftarkan mereka ke kegiatan ekskul kapan saja.'}
                </p>
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Default Class Name for Batch Input */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label
                            htmlFor="bulk-class-name"
                            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                        >
                            Kelas / Asal Default (Opsional — diterapkan ke baris yang kolom kelasnya kosong)
                        </label>
                        <Input
                            id="bulk-class-name"
                            type="text"
                            value={bulkClassName}
                            onChange={(e) => setBulkClassName(e.target.value)}
                            placeholder="Contoh: 5A, 6B, atau SD Al-Irsyad"
                        />
                    </div>

                    <div className="space-y-3">
                        {newStudentRows.map((row, index) => (
                            <div key={index} className="flex items-center gap-2 sm:gap-3">
                                <Input
                                    required
                                    type="text"
                                    aria-label={`Nama Siswa Baris ${index + 1}`}
                                    value={row.name}
                                    onChange={(e) => {
                                        const n = [...newStudentRows];
                                        n[index].name = e.target.value;
                                        setNewStudentRows(n);
                                    }}
                                    placeholder="Nama Siswa *"
                                    className="flex-[2]"
                                />
                                <Select
                                    aria-label={`Jenis Kelamin Baris ${index + 1}`}
                                    value={row.gender}
                                    onChange={(e) => {
                                        const n = [...newStudentRows];
                                        n[index].gender = e.target.value as Gender;
                                        setNewStudentRows(n);
                                    }}
                                    className="flex-1"
                                >
                                    <option value="Laki-laki">L</option>
                                    <option value="Perempuan">P</option>
                                </Select>
                                <Input
                                    type="text"
                                    aria-label={`Kelas Siswa Baris ${index + 1}`}
                                    value={row.class_name}
                                    onChange={(e) => {
                                        const n = [...newStudentRows];
                                        n[index].class_name = e.target.value;
                                        setNewStudentRows(n);
                                    }}
                                    placeholder={bulkClassName || 'Kelas (Opsional)'}
                                    className="flex-1"
                                />
                                {newStudentRows.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Hapus Baris ${index + 1}`}
                                        onClick={() =>
                                            setNewStudentRows(
                                                newStudentRows.filter(
                                                    (_, i) => i !== index
                                                )
                                            )
                                        }
                                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            setNewStudentRows([
                                ...newStudentRows,
                                { name: '', gender: 'Laki-laki', class_name: '' },
                            ])
                        }
                        className="w-full py-2 border border-dashed border-amber-300 text-amber-600 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" /> Tambah Baris
                    </button>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

interface EditExternalStudentModalProps {
    student: ExtracurricularStudent | null;
    onChangeStudent: (student: ExtracurricularStudent) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    isSubmitting?: boolean;
}

export const EditExternalStudentModal: React.FC<EditExternalStudentModalProps> = ({
    student,
    onChangeStudent,
    onSubmit,
    onClose,
    isSubmitting = false,
}) => {
    if (!student) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="presentation"
                aria-hidden="true"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                    Edit Siswa Eksternal
                </h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    <Input
                        required
                        type="text"
                        aria-label="Nama Siswa"
                        value={student.name}
                        onChange={(e) =>
                            onChangeStudent({
                                ...student,
                                name: e.target.value,
                            })
                        }
                        placeholder="Nama"
                    />
                    <Select
                        aria-label="Jenis Kelamin"
                        value={student.gender || 'Laki-laki'}
                        onChange={(e) =>
                            onChangeStudent({
                                ...student,
                                gender: e.target.value as Gender,
                            })
                        }
                    >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </Select>
                    <Input
                        type="text"
                        aria-label="Kelas Siswa"
                        value={student.class_name || ''}
                        onChange={(e) =>
                            onChangeStudent({
                                ...student,
                                class_name: e.target.value,
                            })
                        }
                        placeholder="Kelas"
                    />
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

interface DeleteExternalStudentDialogProps {
    student: ExtracurricularStudent | null;
    onConfirm: (id: string) => void;
    onClose: () => void;
    isDeleting?: boolean;
}

export const DeleteExternalStudentDialog: React.FC<DeleteExternalStudentDialogProps> = ({
    student,
    onConfirm,
    onClose,
    isDeleting = false,
}) => {
    if (!student) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="presentation"
                aria-hidden="true"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                    Hapus Siswa Eksternal?
                </h2>
                <p className="dark:text-slate-300 mb-4">
                    Hapus <strong>{student.name}</strong>?
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => onConfirm(student.id)}
                        className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Menghapus...' : 'Hapus'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
