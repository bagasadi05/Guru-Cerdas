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
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditStudentFormValues>({
        resolver: validationResolver<EditStudentFormValues>(editStudentRules),
        defaultValues: {
            name: defaultValues.name,
            gender: defaultValues.gender as "Laki-laki" | "Perempuan",
            class_id: defaultValues.class_id || '',
            birth_date: defaultValues.birth_date ? defaultValues.birth_date.substring(0, 10) : '',
            nis: defaultValues.nis || '',
            nisn: defaultValues.nisn || '',
            parent_name: defaultValues.parent_name || '',
            parent_phone: defaultValues.parent_phone || '',
        }
    });

    const selectedGender = watch('gender');

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
            {/* Nama Lengkap */}
            <div>
                <label htmlFor="edit-student-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <Input id="edit-student-name" aria-label="Nama Lengkap" {...register('name')} error={errors.name?.message} placeholder="Masukkan nama lengkap siswa..." />
            </div>

            {/* Kelas & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                    <label htmlFor="edit-student-class" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Kelas <span className="text-rose-500">*</span>
                    </label>
                    <Select id="edit-student-class" aria-label="Pilih Kelas" {...register('class_id')} error={errors.class_id?.message}>
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <label htmlFor="edit-student-birthdate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Tanggal Lahir
                    </label>
                    <Input
                        id="edit-student-birthdate"
                        aria-label="Tanggal Lahir"
                        type="date"
                        {...register('birth_date')}
                        error={errors.birth_date?.message}
                    />
                </div>
            </div>

            {/* NIS & NISN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                    <label htmlFor="edit-student-nis" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        NIS (Nomor Induk Siswa)
                    </label>
                    <Input
                        id="edit-student-nis"
                        aria-label="NIS (Nomor Induk Siswa)"
                        {...register('nis')}
                        error={errors.nis?.message}
                        placeholder="Contoh: 2024001"
                    />
                </div>

                <div>
                    <label htmlFor="edit-student-nisn" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        NISN (Nasional)
                    </label>
                    <Input
                        id="edit-student-nisn"
                        aria-label="NISN (Nasional)"
                        {...register('nisn')}
                        error={errors.nisn?.message}
                        placeholder="Contoh: 0081234567"
                    />
                </div>
            </div>

            {/* Jenis Kelamin */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                    <label
                        className={`flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                            selectedGender === 'Laki-laki'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <input
                            type="radio"
                            value="Laki-laki"
                            {...register('gender')}
                            onChange={() => setValue('gender', 'Laki-laki', { shouldValidate: true })}
                            className="sr-only"
                        />
                        <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                selectedGender === 'Laki-laki'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            L
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap">Laki-laki</span>
                    </label>

                    <label
                        className={`flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                            selectedGender === 'Perempuan'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <input
                            type="radio"
                            value="Perempuan"
                            {...register('gender')}
                            onChange={() => setValue('gender', 'Perempuan', { shouldValidate: true })}
                            className="sr-only"
                        />
                        <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                selectedGender === 'Perempuan'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            P
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap">Perempuan</span>
                    </label>
                </div>
                {errors.gender && <p className="text-rose-500 text-xs mt-1">{errors.gender.message}</p>}
            </div>

            {/* Identitas Orang Tua / Wali */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Informasi Orang Tua / Wali
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Untuk Notifikasi WA & Portal
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Nama Orang Tua / Wali
                        </label>
                        <Input
                            {...register('parent_name')}
                            error={errors.parent_name?.message}
                            placeholder="Contoh: Bapak Ahmad"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            No. WhatsApp Orang Tua
                        </label>
                        <Input
                            type="tel"
                            {...register('parent_phone')}
                            error={errors.parent_phone?.message}
                            placeholder="Contoh: 081234567890"
                        />
                    </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nomor WhatsApp digunakan untuk mengirim notifikasi pelanggaran, laporan bulanan BINTANG, dan tautan akses ke Portal Orang Tua.
                </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending} className="min-w-[90px]">{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
        </form>
    );
};
