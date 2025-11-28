import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { violationSchema, ViolationFormValues } from '../schemas';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { ViolationRow } from '../types';
import { violationList } from '../../../../services/violations.data';

interface ViolationFormProps {
    defaultValues: ViolationRow | null;
    onSubmit: (data: ViolationFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const ViolationForm: React.FC<ViolationFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<ViolationFormValues>({
        resolver: zodResolver(violationSchema),
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            description: defaultValues?.description || '',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <Input type="date" {...register('date')} error={errors.date?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Jenis Pelanggaran</label>
                <Select {...register('description')} error={errors.description?.message}>
                    <option value="">-- Pilih Pelanggaran --</option>
                    {violationList.map(v => (
                        <option key={v.code} value={v.description}>{v.description} ({v.points} poin)</option>
                    ))}
                </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
