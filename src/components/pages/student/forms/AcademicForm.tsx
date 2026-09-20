import React from 'react';
import { useForm } from 'react-hook-form';
import { academicRules, AcademicFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { AcademicRecordRow } from '../types';

interface AcademicFormProps {
    defaultValues: AcademicRecordRow | null;
    onSubmit: (data: AcademicFormValues) => void;
    onClose: () => void;
    isPending: boolean;
}

export const AcademicForm: React.FC<AcademicFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<AcademicFormValues>({
        resolver: validationResolver<AcademicFormValues>(academicRules),
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
                    <label htmlFor="academic-subject" className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                    <Input id="academic-subject" aria-label="Mata Pelajaran" {...register('subject')} placeholder="cth. Matematika" error={errors.subject?.message} />
                </div>
                <div>
                    <label htmlFor="academic-assessment-name" className="block text-sm font-medium mb-1">Nama Penilaian</label>
                    <Input id="academic-assessment-name" aria-label="Nama Penilaian" {...register('assessment_name')} placeholder="cth. PH 1, UTS" error={errors.assessment_name?.message} />
                </div>
            </div>
            <div>
                <label htmlFor="academic-score" className="block text-sm font-medium mb-1">Nilai (0-100)</label>
                <Input id="academic-score" aria-label="Nilai" type="number" {...register('score', { valueAsNumber: true })} min="0" max="100" error={errors.score?.message} />
            </div>
            <div>
                <label htmlFor="academic-notes" className="block text-sm font-medium mb-1">Catatan (Opsional)</label>
                <Textarea
                    id="academic-notes"
                    aria-label="Catatan"
                    {...register('notes')}
                    rows={3}
                    placeholder="cth. Sangat baik dalam materi aljabar."
                />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
