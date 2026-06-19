import React, { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { achievementRules, AchievementFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { StudentAchievement } from '../../../../types/studentAchievement';
import {
    ACHIEVEMENT_CATEGORY_META,
    ACHIEVEMENT_LEVEL_META,
    ACHIEVEMENT_RANK_META,
} from '../../../../lib/achievementMeta';
import { FileTextIcon, UploadIcon } from 'lucide-react';

interface AchievementFormProps {
    defaultValues: StudentAchievement | null;
    onSubmit: (data: AchievementFormValues & { evidence_file?: File | null }) => void;
    onClose: () => void;
    isPending: boolean;
}

export const AchievementForm: React.FC<AchievementFormProps> = ({
    defaultValues,
    onSubmit,
    onClose,
    isPending,
}) => {
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(
        defaultValues?.certificate_url || null
    );
    const [fileName, setFileName] = useState<string | null>(
        defaultValues?.certificate_name || null
    );

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AchievementFormValues>({
        resolver: validationResolver<AchievementFormValues>(achievementRules),
        defaultValues: {
            title: defaultValues?.title || '',
            category: defaultValues?.category || 'lainnya',
            level: defaultValues?.level || 'sekolah',
            rank: defaultValues?.rank || null,
            organizer: defaultValues?.organizer || '',
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            description: defaultValues?.description || '',
            points: defaultValues?.points || 0,
        },
    });

    const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEvidenceFile(file);
            setFileName(file.name);
            if (file.type.startsWith('image/')) {
                setEvidencePreview(URL.createObjectURL(file));
            } else {
                setEvidencePreview(null);
            }
        }
    };

    const handleRemoveEvidence = () => {
        setEvidenceFile(null);
        setFileName(null);
        if (evidencePreview && !defaultValues?.certificate_url) {
            URL.revokeObjectURL(evidencePreview);
        }
        setEvidencePreview(null);
    };

    const handleFormSubmit: SubmitHandler<AchievementFormValues> = data => {
        onSubmit({
            ...data,
            evidence_file: evidenceFile,
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Nama/Judul Prestasi <span className="text-red-500">*</span>
                </label>
                <Input
                    type="text"
                    placeholder="Contoh: Juara 1 Lomba Matematika Nasional"
                    {...register('title')}
                    error={errors.title?.message}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Bidang Prestasi <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('category')} error={errors.category?.message}>
                        {Object.entries(ACHIEVEMENT_CATEGORY_META).map(([key, meta]) => (
                            <option key={key} value={key}>
                                {meta.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Level */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Tingkat Kompetisi <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('level')} error={errors.level?.message}>
                        {Object.entries(ACHIEVEMENT_LEVEL_META).map(([key, meta]) => (
                            <option key={key} value={key}>
                                {meta.label}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rank */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Peringkat/Juara (Opsional)
                    </label>
                    <Select {...register('rank')} error={errors.rank?.message}>
                        <option value="">-- Pilih Juara/Peringkat --</option>
                        {Object.entries(ACHIEVEMENT_RANK_META).map(([key, meta]) => (
                            <option key={key} value={key}>
                                {meta.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Tanggal Prestasi <span className="text-red-500">*</span>
                    </label>
                    <Input type="date" {...register('date')} error={errors.date?.message} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Organizer */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Penyelenggara (Opsional)
                    </label>
                    <Input
                        type="text"
                        placeholder="Contoh: Kemenristekdikti"
                        {...register('organizer')}
                        error={errors.organizer?.message}
                    />
                </div>

                {/* Points */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Poin Prestasi (Opsional)
                    </label>
                    <Input
                        type="number"
                        placeholder="Contoh: 10"
                        {...register('points', { valueAsNumber: true })}
                        error={errors.points?.message}
                    />
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Keterangan/Deskripsi (Opsional)
                </label>
                <Textarea
                    {...register('description')}
                    placeholder="Tulis detail prestasi, deskripsi lomba, atau informasi tambahan lainnya..."
                    rows={3}
                />
            </div>

            {/* Certificate File Upload */}
            <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    File Sertifikat/Piagam (Opsional)
                </label>
                {!evidencePreview && !fileName ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadIcon className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Klik untuk upload file sertifikat
                            </p>
                            <p className="text-xs text-slate-400">PDF, PNG, JPG (maks. 5MB)</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleEvidenceChange}
                        />
                    </label>
                ) : (
                    <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/50">
                        {evidencePreview ? (
                            <img
                                src={evidencePreview}
                                alt="Pratinjau sertifikat"
                                className="w-full h-32 object-contain rounded-lg"
                            />
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                                <FileTextIcon className="w-8 h-8 text-emerald-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {fileName}
                                    </p>
                                    <p className="text-xs text-slate-400">Dokumen PDF/Sertifikat</p>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemoveEvidence}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors w-6 h-6 flex items-center justify-center font-bold text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                    Batal
                </Button>
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                    {isPending ? 'Menyimpan...' : 'Simpan Prestasi'}
                </Button>
            </div>
        </form>
    );
};
