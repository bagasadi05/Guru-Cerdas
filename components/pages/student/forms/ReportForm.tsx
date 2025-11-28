import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema, ReportFormValues } from '../schemas';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { ReportRow } from '../types';

interface ReportFormProps {
    defaultValues: ReportRow | null;
    onSubmit: (data: ReportFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<ReportFormValues>({
        resolver: zodResolver(reportSchema),
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            title: defaultValues?.title || '',
            notes: defaultValues?.notes || '',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <Input type="date" {...register('date')} error={errors.date?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Judul</label>
                <Input {...register('title')} placeholder="cth. Insiden di kelas" error={errors.title?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea
                    {...register('notes')}
                    rows={4}
                    className={`w-full mt-1 block rounded-md shadow-sm sm:text-sm dark:bg-gray-800 dark:border-gray-600 ${errors.notes ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                ></textarea>
                {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
