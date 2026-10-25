import React from 'react';
import { createPortal } from 'react-dom';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { Checkbox } from '../../../ui/Checkbox';
import { Extracurricular, CATEGORIES, DAYS } from '../types';

export interface ExtracurricularFormData {
    name: string;
    category: string;
    description: string;
    schedule_day: string;
    schedule_time: string;
    coach_name: string;
    max_participants: number;
    is_active: boolean;
}

interface ExtracurricularFormModalProps {
    isOpen: boolean;
    editingExtracurricular: Extracurricular | null;
    formData: ExtracurricularFormData;
    onChangeFormData: (data: ExtracurricularFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    isSubmitting?: boolean;
}

export const ExtracurricularFormModal: React.FC<ExtracurricularFormModalProps> = ({
    isOpen,
    editingExtracurricular,
    formData,
    onChangeFormData,
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
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-6 py-4 border-b border-slate-200 dark:border-slate-700 z-10">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {editingExtracurricular
                            ? 'Edit Ekstrakurikuler'
                            : 'Tambah Ekstrakurikuler Baru'}
                    </h2>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div>
                        <label
                            htmlFor="extra-name"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                            Nama Ekstrakurikuler *
                        </label>
                        <Input
                            id="extra-name"
                            required
                            type="text"
                            placeholder="Contoh: Pramuka, Futsal, Tahfidz..."
                            aria-label="Nama Ekstrakurikuler"
                            value={formData.name}
                            onChange={(e) =>
                                onChangeFormData({ ...formData, name: e.target.value })
                            }
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="extra-category"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Kategori
                            </label>
                            <Select
                                id="extra-category"
                                aria-label="Kategori"
                                value={formData.category}
                                onChange={(e) =>
                                    onChangeFormData({
                                        ...formData,
                                        category: e.target.value,
                                    })
                                }
                            >
                                <option value="">Pilih Kategori</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label
                                htmlFor="extra-max-participants"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Maks Peserta
                            </label>
                            <Input
                                id="extra-max-participants"
                                type="number"
                                min="1"
                                aria-label="Maksimal Peserta"
                                value={formData.max_participants}
                                onChange={(e) =>
                                    onChangeFormData({
                                        ...formData,
                                        max_participants:
                                            parseInt(e.target.value) || 30,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Hari Jadwal Ekstrakurikuler *{' '}
                                <span className="text-xs text-slate-400 font-normal">
                                    (Pilih satu atau beberapa hari)
                                </span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((d) => {
                                    const currentDays = (formData.schedule_day || '')
                                        .toLowerCase()
                                        .split(/[,/&+\s]+/)
                                        .map((s) => s.trim())
                                        .filter(Boolean);
                                    const isSelected = currentDays.includes(
                                        d.toLowerCase()
                                    );
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => {
                                                let newDays: string[];
                                                if (isSelected) {
                                                    newDays = currentDays.filter(
                                                        (day) => day !== d.toLowerCase()
                                                    );
                                                } else {
                                                    newDays = [
                                                        ...currentDays,
                                                        d.toLowerCase(),
                                                    ];
                                                }
                                                const formatted = DAYS.map((day) =>
                                                    day.toLowerCase()
                                                )
                                                    .filter((day) =>
                                                        newDays.includes(day)
                                                    )
                                                    .map(
                                                        (day) =>
                                                            day
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                            day.slice(1)
                                                    )
                                                    .join(', ');
                                                onChangeFormData({
                                                    ...formData,
                                                    schedule_day: formatted,
                                                });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                isSelected
                                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                            {formData.schedule_day && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                                    Jadwal terpilih:{' '}
                                    <span className="font-bold">
                                        {formData.schedule_day}
                                    </span>
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Jam Jadwal
                            </label>
                            <Input
                                type="text"
                                placeholder="Contoh: 14:00 - 15:30 atau 09.30-10.40"
                                value={formData.schedule_time}
                                onChange={(e) =>
                                    onChangeFormData({
                                        ...formData,
                                        schedule_time: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            htmlFor="extra-coach-name"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                            Nama Pembina
                        </label>
                        <Input
                            id="extra-coach-name"
                            aria-label="Nama Pembina"
                            type="text"
                            placeholder="Nama guru atau pelatih pembina"
                            value={formData.coach_name}
                            onChange={(e) =>
                                onChangeFormData({
                                    ...formData,
                                    coach_name: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="extra-description"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                            Deskripsi
                        </label>
                        <Textarea
                            id="extra-description"
                            aria-label="Deskripsi"
                            rows={3}
                            placeholder="Keterangan singkat tujuan atau kegiatan ekstrakurikuler..."
                            value={formData.description}
                            onChange={(e) =>
                                onChangeFormData({
                                    ...formData,
                                    description: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                        <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) =>
                                onChangeFormData({
                                    ...formData,
                                    is_active: e.target.checked,
                                })
                            }
                        />
                        <label
                            htmlFor="is_active"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            Ekstrakurikuler Aktif
                        </label>
                    </div>
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-700 to-orange-800 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
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
