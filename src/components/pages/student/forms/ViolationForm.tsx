import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { violationRules, ViolationFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { ViolationRow } from '../types';
import { violationList, ViolationItem } from '../../../../services/violations.data';
import { SEVERITY_LEVELS, SeverityLevel } from '../ViolationsTab';
import { AlertTriangleIcon, CameraIcon, UploadIcon } from 'lucide-react';

interface ViolationFormProps {
    defaultValues: ViolationRow | null;
    onSubmit: (data: ViolationFormValues & { evidence_file?: File }) => void;
    onClose: () => void;
    isPending: boolean;
}

// Group violations by category for better UX
const violationsByCategory = {
    Ringan: violationList.filter(v => v.category === 'Ringan'),
    Sedang: violationList.filter(v => v.category === 'Sedang'),
    Berat: violationList.filter(v => v.category === 'Berat'),
};

export const ViolationForm: React.FC<ViolationFormProps> = ({ defaultValues, onSubmit, onClose, isPending }) => {
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(defaultValues?.evidence_url || null);

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ViolationFormValues>({
        resolver: validationResolver<ViolationFormValues>(violationRules),
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            description: defaultValues?.description || '',
            severity: defaultValues?.severity || null,
            follow_up_notes: defaultValues?.follow_up_notes || '',
        }
    });

    const selectedDescription = watch('description');

    // Auto-detect severity based on selected violation
    const detectedSeverity = useMemo(() => {
        if (!selectedDescription) return null;
        const violation = violationList.find(v => v.description === selectedDescription);
        if (!violation) return null;
        return violation.category.toLowerCase() as SeverityLevel;
    }, [selectedDescription]);

    // Update severity when violation is selected
    React.useEffect(() => {
        if (detectedSeverity && !defaultValues?.severity) {
            setValue('severity', detectedSeverity);
        }
    }, [detectedSeverity, setValue, defaultValues?.severity]);

    // Get violation points
    const selectedPoints = useMemo(() => {
        if (!selectedDescription) return null;
        const violation = violationList.find(v => v.description === selectedDescription);
        return violation?.points || null;
    }, [selectedDescription]);

    const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEvidenceFile(file);
            if (file.type.startsWith('image/')) {
                setEvidencePreview(URL.createObjectURL(file));
            } else {
                setEvidencePreview(null);
            }
        }
    };

    const handleRemoveEvidence = () => {
        setEvidenceFile(null);
        if (evidencePreview && !defaultValues?.evidence_url) {
            URL.revokeObjectURL(evidencePreview);
        }
        setEvidencePreview(null);
    };

    const handleFormSubmit = (data: ViolationFormValues) => {
        onSubmit({
            ...data,
            evidence_file: evidenceFile || undefined
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Severity Selection */}
            <div>
                <label className="block text-sm font-medium mb-2">Tingkat Pelanggaran</label>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(SEVERITY_LEVELS) as [SeverityLevel, typeof SEVERITY_LEVELS[SeverityLevel]][]).map(([key, level]) => (
                        <label
                            key={key}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${watch('severity') === key
                                    ? `${level.borderClass} ${level.bgClass}`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <input
                                type="radio"
                                value={key}
                                {...register('severity')}
                                className="sr-only"
                            />
                            <span className="text-xl">{level.icon}</span>
                            <div className="text-left">
                                <p className={`font-medium text-sm ${watch('severity') === key ? level.textClass : 'text-gray-700 dark:text-gray-300'}`}>
                                    {level.label}
                                </p>
                                <p className="text-xs text-gray-400">{level.points} poin</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal Kejadian</label>
                <Input type="date" {...register('date')} error={errors.date?.message} />
            </div>

            {/* Violation Type Selection */}
            <div>
                <label className="block text-sm font-medium mb-1">Jenis Pelanggaran</label>
                <Select {...register('description')} error={errors.description?.message}>
                    <option value="">-- Pilih Pelanggaran --</option>
                    {Object.entries(violationsByCategory).map(([category, violations]) => (
                        <optgroup key={category} label={`${category === 'Ringan' ? '⚠️' : category === 'Sedang' ? '🔶' : '🔴'} ${category}`}>
                            {violations.map(v => (
                                <option key={v.code} value={v.description}>
                                    {v.description} ({v.points} poin)
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </Select>

                {/* Points Preview */}
                {selectedPoints && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
                        <AlertTriangleIcon className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-400">
                            Pelanggaran ini akan menambah <strong>{selectedPoints} poin</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Evidence Upload */}
            <div>
                <label className="block text-sm font-medium mb-1">Bukti Foto (Opsional)</label>
                {!evidencePreview && !evidenceFile ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadIcon className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Klik untuk upload bukti foto</p>
                            <p className="text-xs text-gray-400">PNG, JPG (maks. 5MB)</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleEvidenceChange}
                        />
                    </label>
                ) : (
                    <div className="relative">
                        {evidencePreview && (
                            <img
                                src={evidencePreview}
                                alt="Evidence preview"
                                className="w-full h-32 object-cover rounded-lg"
                            />
                        )}
                        {evidenceFile && !evidencePreview && (
                            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <CameraIcon className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{evidenceFile.name}</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemoveEvidence}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Follow-up Notes */}
            <div>
                <label className="block text-sm font-medium mb-1">Catatan Tindak Lanjut (Opsional)</label>
                <textarea
                    {...register('follow_up_notes')}
                    placeholder="Catatan tambahan atau rencana tindak lanjut..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
                    {isPending ? 'Menyimpan...' : 'Simpan Pelanggaran'}
                </Button>
            </div>
        </form>
    );
};
