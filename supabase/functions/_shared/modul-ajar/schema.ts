import { z } from 'npm:zod';

// Validator deterministik: Tolak jika mengandung placeholder atau teks generik
const noPlaceholderString = z.string().superRefine((val, ctx) => {
  if (val.includes('{') || val.includes('}')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'String contains placeholder braces',
    });
  }
  if (val.toLowerCase().includes('siswa siswa')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'String contains duplicate words like "siswa siswa"',
    });
  }
});

export const ModulAjarPaketASchema = z.object({
  tujuanPembelajaran: z.array(noPlaceholderString).min(2).max(4),
  pemahamanBermakna: z.array(noPlaceholderString).min(1).max(3),
  pertanyaanPemantik: z.array(noPlaceholderString).min(2).max(4),
  konteksSintaks: z.array(
    z.object({
      urutan: z.number().int().min(1),
      kegiatanGuru: noPlaceholderString,
      kegiatanSiswa: noPlaceholderString,
    })
  ),
  pengayaan: z.array(noPlaceholderString).max(3).optional().default([]),
  remedial: z.array(noPlaceholderString).max(3).optional().default([]),
});

export const ModulAjarPaketBSchema = z.object({
  lkpdTugas: noPlaceholderString,
  asesmenPengetahuan: noPlaceholderString,
  asesmenKeterampilan: noPlaceholderString,
  soalEvaluasi: noPlaceholderString,
  pedomanJawaban: noPlaceholderString,
});

export const ModulAjarFullSchema = ModulAjarPaketASchema.merge(ModulAjarPaketBSchema);

export type ModulAjarPaketA = z.infer<typeof ModulAjarPaketASchema>;
export type ModulAjarPaketB = z.infer<typeof ModulAjarPaketBSchema>;
export type ModulAjarFull = z.infer<typeof ModulAjarFullSchema>;
