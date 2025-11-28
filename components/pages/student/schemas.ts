import { z } from 'zod';

export const editStudentSchema = z.object({
    name: z.string().min(1, "Nama lengkap harus diisi"),
    gender: z.enum(["Laki-laki", "Perempuan"]),
    class_id: z.string().min(1, "Kelas harus dipilih"),
});

export const reportSchema = z.object({
    date: z.string().min(1, "Tanggal harus diisi"),
    title: z.string().min(1, "Judul harus diisi"),
    notes: z.string().min(1, "Catatan harus diisi"),
});

export const academicSchema = z.object({
    subject: z.string().min(1, "Mata pelajaran harus diisi"),
    assessment_name: z.string().min(1, "Nama penilaian harus diisi"),
    score: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
    notes: z.string().optional(),
});

export const quizSchema = z.object({
    quiz_date: z.string().min(1, "Tanggal harus diisi"),
    subject: z.string().min(1, "Mata pelajaran harus diisi"),
    quiz_name: z.string().min(1, "Aktivitas harus diisi"),
});

export const violationSchema = z.object({
    date: z.string().min(1, "Tanggal harus diisi"),
    description: z.string().min(1, "Jenis pelanggaran harus dipilih"),
});

export const communicationSchema = z.object({
    message: z.string().min(1, "Pesan tidak boleh kosong"),
});

export type EditStudentFormValues = z.infer<typeof editStudentSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
export type AcademicFormValues = z.infer<typeof academicSchema>;
export type QuizFormValues = z.infer<typeof quizSchema>;
export type ViolationFormValues = z.infer<typeof violationSchema>;
export type CommunicationFormValues = z.infer<typeof communicationSchema>;
