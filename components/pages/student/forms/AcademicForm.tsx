import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { academicSchema, AcademicFormValues } from '../schemas';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { AcademicRecordRow } from '../types';

interface AcademicFormProps {
    defaultValues: AcademicRecordRow | null;
    onSubmit: (data: AcademicFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const AcademicForm: React.FC<AcademicFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<AcademicFormValues>({
        resolver: zodResolver(academicSchema),
        defaultValues: {
            subject: defaultValues?.subject || '',
            assessment_name: defaultValues?.assessment_name || '',
            score: defaultValues?.score || 0,
            notes: defaultValues?.notes || '',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                    <Input {...register('subject')} placeholder="cth. Matematika" error={errors.subject?.message} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Nama Penilaian</label>
                    <Input {...register('assessment_name')} placeholder="cth. PH 1, UTS" error={errors.assessment_name?.message} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Nilai (0-100)</label>
                <Input type="number" {...register('score', { valueAsNumber: true })} min="0" max="100" error={errors.score?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Catatan (Opsional)</label>
                <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="cth. Sangat baik dalam materi aljabar."
                    className="w-full mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                ></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
