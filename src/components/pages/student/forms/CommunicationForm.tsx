import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { communicationRules, CommunicationFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { CommunicationRow } from '../types';

interface CommunicationFormProps {
    defaultValues: CommunicationRow;
    onSubmit: (data: CommunicationFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const CommunicationForm: React.FC<CommunicationFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<CommunicationFormValues>({
        resolver: validationResolver<CommunicationFormValues>(communicationRules),
        defaultValues: {
            message: defaultValues.message,
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Pesan</label>
                <textarea
                    {...register('message')}
                    rows={5}
                    className={`w-full mt-1 block rounded-md shadow-sm sm:text-sm dark:bg-gray-800 dark:border-gray-600 ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                ></textarea>
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
