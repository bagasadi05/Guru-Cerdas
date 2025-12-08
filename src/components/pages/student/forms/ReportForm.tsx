import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { reportRules, ReportFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { ReportRow } from '../types';
import { REPORT_CATEGORIES, COMMON_TAGS, ReportCategory } from '../ReportsTab';
import { UploadIcon, XIcon, ImageIcon, FileTextIcon } from 'lucide-react';

interface ReportFormProps {
    defaultValues: ReportRow | null;
    onSubmit: (data: ReportFormValues & { attachment_file?: File }) => void;
    onClose: () => void;
    isPending: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(defaultValues?.attachment_url || null);
    const [selectedTags, setSelectedTags] = useState<string[]>(defaultValues?.tags || []);
    const [customTag, setCustomTag] = useState('');

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReportFormValues>({
        resolver: validationResolver<ReportFormValues>(reportRules),
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            title: defaultValues?.title || '',
            notes: defaultValues?.notes || '',
            category: defaultValues?.category || null,
            tags: defaultValues?.tags || [],
        }
    });

    const selectedCategory = watch('category');

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachmentFile(file);
            if (file.type.startsWith('image/')) {
                setAttachmentPreview(URL.createObjectURL(file));
            } else {
                setAttachmentPreview(null);
            }
        }
    };

    const handleRemoveAttachment = () => {
        setAttachmentFile(null);
        if (attachmentPreview && !defaultValues?.attachment_url) {
            URL.revokeObjectURL(attachmentPreview);
        }
        setAttachmentPreview(null);
    };

    const handleToggleTag = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
        setSelectedTags(newTags);
        setValue('tags', newTags);
    };

    const handleAddCustomTag = () => {
        if (customTag && !selectedTags.includes(customTag)) {
            const newTags = [...selectedTags, customTag.toLowerCase().replace(/\s+/g, '-')];
            setSelectedTags(newTags);
            setValue('tags', newTags);
            setCustomTag('');
        }
    };

    const handleFormSubmit = (data: ReportFormValues) => {
        onSubmit({
            ...data,
            tags: selectedTags,
            attachment_file: attachmentFile || undefined
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Category Selection */}
            <div>
                <label className="block text-sm font-medium mb-2">Kategori Catatan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.entries(REPORT_CATEGORIES) as [ReportCategory, typeof REPORT_CATEGORIES[ReportCategory]][]).map(([key, cat]) => (
                        <label
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCategory === key
                                    ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/30`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <input
                                type="radio"
                                value={key}
                                {...register('category')}
                                className="sr-only"
                            />
                            <span className="text-xl">{cat.icon}</span>
                            <div>
                                <p className="font-medium text-sm text-gray-700 dark:text-gray-300">{cat.label}</p>
                                <p className="text-xs text-gray-400">{cat.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Date & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tanggal</label>
                    <Input type="date" {...register('date')} error={errors.date?.message} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Judul</label>
                    <Input {...register('title')} placeholder="cth. Insiden di kelas" error={errors.title?.message} />
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium mb-1">Catatan Detail</label>
                <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Tuliskan catatan lengkap..."
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 ${errors.notes
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                />
                {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium mb-2">Tag (untuk pencarian)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_TAGS.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTags.includes(tag)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>

                {/* Custom tag input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder="Tag kustom..."
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCustomTag}>
                        Tambah
                    </Button>
                </div>

                {/* Selected tags */}
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {selectedTags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                            >
                                #{tag}
                                <button type="button" onClick={() => handleToggleTag(tag)} className="hover:text-red-500">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Attachment Upload */}
            <div>
                <label className="block text-sm font-medium mb-1">Lampiran (Opsional)</label>
                {!attachmentPreview && !attachmentFile ? (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-6 h-6 mb-1 text-gray-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Klik untuk upload foto/dokumen</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleAttachmentChange}
                        />
                    </label>
                ) : (
                    <div className="relative">
                        {attachmentPreview && (
                            <img
                                src={attachmentPreview}
                                alt="Attachment preview"
                                className="w-full h-24 object-cover rounded-lg"
                            />
                        )}
                        {attachmentFile && !attachmentPreview && (
                            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <FileTextIcon className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{attachmentFile.name}</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemoveAttachment}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            <XIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan Catatan'}</Button>
            </div>
        </form>
    );
};
