import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quizSchema, QuizFormValues } from '../schemas';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { QuizPointRow } from '../types';

interface QuizFormProps {
    defaultValues: QuizPointRow | null;
    onSubmit: (data: QuizFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const QuizForm: React.FC<QuizFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<QuizFormValues>({
        resolver: zodResolver(quizSchema),
        defaultValues: {
            quiz_date: defaultValues?.quiz_date || new Date().toISOString().slice(0, 10),
            subject: defaultValues?.subject || '',
            quiz_name: defaultValues?.quiz_name || '',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <Input type="date" {...register('quiz_date')} error={errors.quiz_date?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                <Input {...register('subject')} placeholder="cth. IPA" error={errors.subject?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Aktivitas</label>
                <Input {...register('quiz_name')} placeholder="cth. Aktif bertanya di kelas" error={errors.quiz_name?.message} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
