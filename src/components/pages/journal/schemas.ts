import { z } from 'zod';

export const journalSchema = z.object({
  class_id: z.string().uuid('Pilih kelas yang valid'),
  subject: z.string().min(1, 'Mata pelajaran wajib diisi'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi dengan format YYYY-MM-DD'),
  meeting_number: z.number().optional().nullable(),
  topic: z.string().min(1, 'Topik wajib diisi').max(200, 'Topik maksimal 200 karakter'),
  objectives: z.string().optional().nullable(),
  activities: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachment_url: z.string().url('Format URL tidak valid').optional().nullable().or(z.literal('')),
});

export type JournalFormValues = z.infer<typeof journalSchema>;
