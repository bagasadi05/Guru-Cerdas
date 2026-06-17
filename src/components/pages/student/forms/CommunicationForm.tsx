import React from 'react';
import { useForm } from 'react-hook-form';
import { communicationRules, CommunicationFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { ValidatedTextarea } from '../../../ui/ValidatedInput';
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
            <ValidatedTextarea
                label="Pesan"
                {...register('message')}
                rows={5}
                error={errors.message?.message}
                required
            />
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
