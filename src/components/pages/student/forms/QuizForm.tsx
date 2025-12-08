import React from 'react';
import { useForm } from 'react-hook-form';
import { quizRules, QuizFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { QuizPointRow } from '../types';
import { POINT_CATEGORIES, PointCategory } from '../ActivityTab';

interface QuizFormProps {
    defaultValues: QuizPointRow | null;
    onSubmit: (data: QuizFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

// Category options for dropdown
const CATEGORY_OPTIONS: { value: PointCategory; label: string; icon: string }[] = [
    { value: 'bertanya', label: 'Bertanya', icon: '❓' },
    { value: 'menjawab', label: 'Menjawab', icon: '💡' },
    { value: 'presentasi', label: 'Presentasi', icon: '🎤' },
    { value: 'diskusi', label: 'Diskusi', icon: '💬' },
    { value: 'tugas_tambahan', label: 'Tugas Tambahan', icon: '📝' },
    { value: 'lainnya', label: 'Lainnya', icon: '⭐' },
];

// Quick activity suggestions based on category
const ACTIVITY_SUGGESTIONS: Record<PointCategory, string[]> = {
    bertanya: [
        'Aktif bertanya di kelas',
        'Bertanya saat diskusi',
        'Mengajukan pertanyaan kritis',
        'Bertanya untuk klarifikasi'
    ],
    menjawab: [
        'Menjawab pertanyaan guru',
        'Menjawab dengan benar',
        'Berani menjawab di depan kelas',
        'Membantu teman menjawab'
    ],
    presentasi: [
        'Presentasi tugas kelompok',
        'Presentasi individu',
        'Mempresentasikan hasil diskusi',
        'Demo proyek'
    ],
    diskusi: [
        'Aktif dalam diskusi kelompok',
        'Memimpin diskusi',
        'Memberikan pendapat',
        'Menyimpulkan diskusi'
    ],
    tugas_tambahan: [
        'Mengerjakan soal tambahan',
        'Membantu teman belajar',
        'Membuat catatan lengkap',
        'Proyek tambahan'
    ],
    lainnya: [
        'Partisipasi aktif',
        'Membantu guru',
        'Kontribusi positif',
        'Inisiatif baik'
    ]
};

export const QuizForm: React.FC<QuizFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuizFormValues>({
        resolver: validationResolver<QuizFormValues>(quizRules),
        defaultValues: {
            quiz_date: defaultValues?.quiz_date || new Date().toISOString().slice(0, 10),
            subject: defaultValues?.subject || '',
            quiz_name: defaultValues?.quiz_name || '',
            category: defaultValues?.category || null,
        }
    });

    const selectedCategory = watch('category');
    const suggestions = selectedCategory ? ACTIVITY_SUGGESTIONS[selectedCategory] : [];

    const handleSuggestionClick = (suggestion: string) => {
        setValue('quiz_name', suggestion);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Selection */}
            <div>
                <label className="block text-sm font-medium mb-2">Kategori Aktivitas</label>
                <div className="grid grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                        <label
                            key={cat.value}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCategory === cat.value
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <input
                                type="radio"
                                value={cat.value}
                                {...register('category')}
                                className="sr-only"
                            />
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Quick Suggestions */}
            {suggestions.length > 0 && (
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-500">Pilih Cepat:</label>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tanggal</label>
                    <Input type="date" {...register('quiz_date')} error={errors.quiz_date?.message} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                    <Input {...register('subject')} placeholder="cth. IPA" error={errors.subject?.message} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Deskripsi Aktivitas</label>
                <Input
                    {...register('quiz_name')}
                    placeholder="cth. Aktif bertanya di kelas"
                    error={errors.quiz_name?.message}
                />
                <p className="text-xs text-gray-400 mt-1">Deskripsi singkat tentang aktivitas siswa</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
