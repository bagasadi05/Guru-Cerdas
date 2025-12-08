import React from 'react';
import { useForm } from 'react-hook-form';
import { editStudentRules, EditStudentFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { ClassRow, StudentWithClass } from '../types';

interface EditStudentFormProps {
    defaultValues: StudentWithClass;
    classes: ClassRow[];
    onSubmit: (data: EditStudentFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const EditStudentForm: React.FC<EditStudentFormProps> = ({ defaultValues, classes, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<EditStudentFormValues>({
        resolver: validationResolver<EditStudentFormValues>(editStudentRules),
        defaultValues: {
            name: defaultValues.name,
            gender: defaultValues.gender as "Laki-laki" | "Perempuan",
            class_id: defaultValues.class_id || '',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
                <Input {...register('name')} error={errors.name?.message} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Jenis Kelamin</label>
                <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                        <input type="radio" value="Laki-laki" {...register('gender')} className="form-radio" />
                        <span className="ml-2">Laki-laki</span>
                    </label>
                    <label className="flex items-center">
                        <input type="radio" value="Perempuan" {...register('gender')} className="form-radio" />
                        <span className="ml-2">Perempuan</span>
                    </label>
                </div>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Kelas</label>
                <Select {...register('class_id')} error={errors.class_id?.message}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
