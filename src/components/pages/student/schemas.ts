import { z } from 'zod';
import { ValidationService } from '../../../services/ValidationService';
import { ValidationRules } from '../../../types';

export const editStudentSchema = z.object({
    name: z.string().min(1, "Nama lengkap harus diisi"),
    gender: z.enum(["Laki-laki", "Perempuan"]),
    class_id: z.string().min(1, "Kelas harus dipilih"),
});

export const editStudentRules: ValidationRules = {
    name: [ValidationService.validators.required("Nama lengkap harus diisi")],
    gender: [ValidationService.validators.required()],
    class_id: [ValidationService.validators.required("Kelas harus dipilih")],
};

export const reportSchema = z.object({
    date: z.string().min(1, "Tanggal harus diisi"),
    title: z.string().min(1, "Judul harus diisi"),
    notes: z.string().min(1, "Catatan harus diisi"),
    category: z.enum(['akademik', 'perilaku', 'kesehatan', 'prestasi', 'lainnya']).optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
});

export const reportRules: ValidationRules = {
    date: [ValidationService.validators.required("Tanggal harus diisi")],
    title: [ValidationService.validators.required("Judul harus diisi")],
    notes: [ValidationService.validators.required("Catatan harus diisi")],
    // category and tags are optional
};

export const academicSchema = z.object({
    subject: z.string().min(1, "Mata pelajaran harus diisi"),
    assessment_name: z.string().min(1, "Nama penilaian harus diisi"),
    score: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
    notes: z.string().optional(),
});

export const academicRules: ValidationRules = {
    subject: [ValidationService.validators.required("Mata pelajaran harus diisi")],
    assessment_name: [ValidationService.validators.required("Nama penilaian harus diisi")],
    score: [
        ValidationService.validators.required("Nilai harus diisi"),
        ValidationService.validators.number("Nilai harus berupa angka")
    ],
    // notes is optional
};

export const quizSchema = z.object({
    quiz_date: z.string().min(1, "Tanggal harus diisi"),
    subject: z.string().min(1, "Mata pelajaran harus diisi"),
    quiz_name: z.string().min(1, "Aktivitas harus diisi"),
    category: z.enum(['bertanya', 'presentasi', 'tugas_tambahan', 'menjawab', 'diskusi', 'lainnya']).optional().nullable(),
});

export const quizRules: ValidationRules = {
    quiz_date: [ValidationService.validators.required("Tanggal harus diisi")],
    subject: [ValidationService.validators.required("Mata pelajaran harus diisi")],
    quiz_name: [ValidationService.validators.required("Aktivitas harus diisi")],
    // category is optional
};

export const violationSchema = z.object({
    date: z.string().min(1, "Tanggal harus diisi"),
    description: z.string().min(1, "Jenis pelanggaran harus dipilih"),
    severity: z.enum(['ringan', 'sedang', 'berat']).optional().nullable(),
    follow_up_notes: z.string().optional().nullable(),
});

export const violationRules: ValidationRules = {
    date: [ValidationService.validators.required("Tanggal harus diisi")],
    description: [ValidationService.validators.required("Jenis pelanggaran harus dipilih")],
    // severity and follow_up_notes are optional
};

export const communicationSchema = z.object({
    message: z.string().min(1, "Pesan tidak boleh kosong"),
});

export const communicationRules: ValidationRules = {
    message: [ValidationService.validators.required("Pesan tidak boleh kosong")],
};

export type EditStudentFormValues = z.infer<typeof editStudentSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
export type AcademicFormValues = z.infer<typeof academicSchema>;
export type QuizFormValues = z.infer<typeof quizSchema>;
export type ViolationFormValues = z.infer<typeof violationSchema>;
export type CommunicationFormValues = z.infer<typeof communicationSchema>;

