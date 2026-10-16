import { z } from 'zod';

const text = z
  .string()
  .trim()
  .min(1)
  .max(16000)
  .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), 'Gunakan teks pelajaran tanpa HTML.');
const strings = z.array(text).min(1).max(20);
const objectives = z.array(z.number().int().positive()).min(1).max(20);
const option = z.object({ label: z.enum(['A', 'B', 'C', 'D']), teks: text });
const question = z.discriminatedUnion('jenis', [
  z.object({
    nomor: z.number().int().positive(),
    jenis: z.literal('pilihan_ganda'),
    pertanyaan: text,
    pilihan: z.array(option).length(4),
    jawaban: z.enum(['A', 'B', 'C', 'D']),
    pembahasan: text,
    tujuanIds: objectives,
  }),
  z.object({
    nomor: z.number().int().positive(),
    jenis: z.literal('uraian'),
    pertanyaan: text,
    jawaban: text,
    pembahasan: text,
    rubrik: strings,
    tujuanIds: objectives,
  }),
]);
export const ModulAjarAssessmentSchema = z.array(question).length(5);

/** Fresh AI responses must satisfy this contract before reaching a document or content bank. */
export const ModulAjarGenerationSchema = z.object({
  modelPembelajaran: text,
  tujuanPembelajaran: z.array(text).min(1).max(20),
  pemahamanBermakna: strings,
  pertanyaanPemantik: strings,
  materiAjar: text,
  glosarium: strings,
  kompetensiAwal: text,
  kegiatanPendahuluan: strings,
  kegiatanPenutup: strings,
  skenarioPembelajaran: z
    .array(
      z.object({
        pertemuan: z.number().int().positive().default(1),
        name: text,
        guru: text,
        siswa: text,
        durasiMenit: z.number().int().positive(),
        tujuanIds: objectives,
      }),
    )
    .min(1)
    .max(200),
  lkpd: z.object({
    judul: text,
    petunjuk: text,
    alatBahan: strings,
    aktivitas: z
      .array(
        z.object({
          instruksi: text,
          tujuanIds: objectives,
          ruangJawaban: z.enum(['tulis', 'gambar', 'tabel']),
        }),
      )
      .min(1)
      .max(10),
  }),
  evaluasi: ModulAjarAssessmentSchema,
  pengayaan: strings,
  remedial: strings,
});

export type ModulAjarGeneration = z.infer<typeof ModulAjarGenerationSchema>;

export interface AiLessonConstraints {
  modelPembelajaran: string;
  sintaks: string[];
  menitInti: number;
  jumlahPertemuan?: number;
  tujuanPembelajaran?: string;
  soalGuru?: string;
}

const normalizedName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Checks coverage, syntax order, durations and answer structure; semantic accuracy needs review too. */
export function validateAiLesson(
  content: ModulAjarGeneration,
  constraints: AiLessonConstraints,
): string[] {
  const issues: string[] = [];
  if (constraints.soalGuru?.trim()) {
    const comparable = (value: string) => value.replace(/[*#]/g, '').replace(/\s+/g, ' ').trim();
    if (comparable(formatAiAssessment(content.evaluasi).soal) !== comparable(constraints.soalGuru))
      issues.push('Soal yang ditulis guru harus dipertahankan persis agar kuncinya sesuai.');
  }
  if (normalizedName(content.modelPembelajaran) !== normalizedName(constraints.modelPembelajaran))
    issues.push('Model pembelajaran tidak sesuai pilihan guru.');
  const meetings = constraints.jumlahPertemuan ?? 1;
  if (content.skenarioPembelajaran.length !== constraints.sintaks.length * meetings)
    issues.push('Jumlah langkah harus lengkap untuk setiap pertemuan.');
  for (let meeting = 1; meeting <= meetings; meeting += 1) {
    const steps = content.skenarioPembelajaran.filter((step) => step.pertemuan === meeting);
    if (
      steps.length !== constraints.sintaks.length ||
      steps.some(
        (step, index) =>
          normalizedName(step.name) !== normalizedName(constraints.sintaks[index] ?? ''),
      )
    )
      issues.push(`Urutan dan nama langkah pertemuan ${meeting} harus mengikuti sintaks model.`);
    if (steps.reduce((sum, step) => sum + step.durasiMenit, 0) !== constraints.menitInti)
      issues.push(`Total menit kegiatan inti pertemuan ${meeting} tidak sesuai alokasi guru.`);
  }
  if (content.skenarioPembelajaran.some((step) => step.pertemuan > meetings))
    issues.push('Nomor pertemuan tidak sesuai pilihan guru.');
  const owned = (constraints.tujuanPembelajaran ?? '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean);
  if (
    owned.length &&
    (owned.length !== content.tujuanPembelajaran.length ||
      owned.some((tp, index) => tp !== content.tujuanPembelajaran[index]))
  )
    issues.push('Tujuan pembelajaran yang ditulis guru harus dipertahankan persis.');
  const groups = [content.skenarioPembelajaran, content.lkpd.aktivitas, content.evaluasi];
  const labels = ['kegiatan inti', 'aktivitas LKPD', 'soal evaluasi'];
  groups.forEach((group, index) => {
    if (
      group.some(
        (item) =>
          new Set(item.tujuanIds).size !== item.tujuanIds.length ||
          item.tujuanIds.some((id) => id > content.tujuanPembelajaran.length),
      )
    )
      issues.push(`ID tujuan pada ${labels[index]} tidak valid.`);
    content.tujuanPembelajaran.forEach((_, tp) => {
      if (!group.some((item) => item.tujuanIds.includes(tp + 1)))
        issues.push(`Tujuan ${tp + 1} belum terhubung dengan ${labels[index]}.`);
    });
  });
  issues.push(...validateAiAssessment(content.evaluasi, content.tujuanPembelajaran.length));
  return [...new Set(issues)];
}

/** Validates the same assessment rules for full-module and per-field generation. */
export function validateAiAssessment(
  evaluasi: ModulAjarGeneration['evaluasi'],
  objectiveCount: number,
): string[] {
  const issues: string[] = [];
  evaluasi.forEach((item, index) => {
    if (item.nomor !== index + 1) issues.push('Nomor evaluasi harus berurutan 1 sampai 5.');
    if (index < 3 !== (item.jenis === 'pilihan_ganda'))
      issues.push('Evaluasi harus berisi 3 pilihan ganda dan 2 uraian.');
    if (
      item.tujuanIds.some((id) => id > objectiveCount) ||
      new Set(item.tujuanIds).size !== item.tujuanIds.length
    )
      issues.push(`ID tujuan soal ${item.nomor} tidak valid.`);
    if (item.jenis === 'pilihan_ganda') {
      if (item.pilihan.map((p) => p.label).join('') !== 'ABCD')
        issues.push(`Pilihan soal ${item.nomor} harus A, B, C, D secara berurutan.`);
      if (new Set(item.pilihan.map((p) => p.teks.trim().toLowerCase())).size !== 4)
        issues.push(`Pilihan soal ${item.nomor} tidak boleh berulang.`);
    }
  });
  for (let id = 1; id <= objectiveCount; id += 1) {
    if (!evaluasi.some((item) => item.tujuanIds.includes(id)))
      issues.push(`Tujuan ${id} belum diukur evaluasi.`);
  }
  return [...new Set(issues)];
}

/** Formats a validated assessment for the existing editable document template. */
export function formatAiAssessment(evaluasi: ModulAjarGeneration['evaluasi']): {
  soal: string;
  kunci: string[];
} {
  return {
    soal: evaluasi
      .map(
        (item) =>
          `${item.nomor}. ${item.pertanyaan}${item.jenis === 'pilihan_ganda' ? '\n' + item.pilihan.map((p) => `${p.label}. ${p.teks}`).join('\n') : ''}`,
      )
      .join('\n\n'),
    kunci: evaluasi.map(
      (item) =>
        `${item.nomor}. ${item.jawaban}. ${item.pembahasan}${item.jenis === 'uraian' ? '\nPedoman penskoran: ' + item.rubrik.join('; ') : ''}`,
    ),
  };
}

export const ModulAjarReviewSchema = z.object({
  selaras: z.boolean(),
  materiBenar: z.boolean(),
  sesuaiUsia: z.boolean(),
  soal: z
    .array(z.object({ nomor: z.number().int().min(1).max(20), benar: z.boolean(), alasan: text }))
    .length(5),
  masalah: z.array(text).max(20),
  temuan: z
    .array(
      z
        .object({
          komponen: z.enum([
            'tujuanPembelajaran',
            'pemahamanBermakna',
            'pertanyaanPemantik',
            'materiAjar',
            'glosarium',
            'kompetensiAwal',
            'kegiatanPendahuluan',
            'kegiatanPenutup',
            'skenarioPembelajaran',
            'lkpd',
            'evaluasi',
            'pengayaan',
            'remedial',
          ]),
          nomor: z.number().int().min(1).max(5).optional(),
          pertemuan: z.number().int().min(1).max(20).optional(),
          alasan: text,
        })
        .strict(),
    )
    .max(30)
    .optional(),
});

/** Requires a complete reviewer verdict for every question rather than trusting a single success flag. */
export function validateAiReview(raw: unknown): string[] {
  const parsed = ModulAjarReviewSchema.safeParse(raw);
  if (!parsed.success) return ['Hasil pemeriksaan isi AI tidak lengkap.'];
  const review = parsed.data;
  const issues = [...review.masalah, ...(review.temuan ?? []).map((finding) => finding.alasan)];
  if (!review.selaras) issues.push('Tujuan, kegiatan, LKPD, dan evaluasi belum selaras.');
  if (!review.materiBenar) issues.push('Materi atau glosarium perlu dikoreksi.');
  if (!review.sesuaiUsia) issues.push('Bahasa atau tingkat kesulitan belum sesuai kelas.');
  if (
    new Set(review.soal.map((item) => item.nomor)).size !== 5 ||
    review.soal.some((item) => item.nomor > 5)
  )
    issues.push('Pemeriksaan belum mencakup semua nomor soal.');
  review.soal
    .filter((item) => !item.benar)
    .forEach((item) => issues.push(`Soal ${item.nomor}: ${item.alasan}`));
  return issues;
}

export type LessonComponent = keyof ModulAjarGeneration;
export interface LessonRepairTargets {
  components: LessonComponent[];
  questions: number[];
  meetings: number[];
}
const patchSchema = z
  .object({
    components: ModulAjarGenerationSchema.partial().strict().default({}),
    questions: z.array(question).max(5).default([]),
    meetings: z
      .array(
        z
          .object({
            pertemuan: z.number().int().positive(),
            steps: ModulAjarGenerationSchema.shape.skenarioPembelajaran,
          })
          .strict(),
      )
      .max(20)
      .default([]),
  })
  .strict();
export function applyLessonPatch(
  current: Record<string, unknown>,
  raw: unknown,
  targets: LessonRepairTargets,
  immutable: LessonComponent[],
): Record<string, unknown> {
  const patch = patchSchema.parse(raw);
  const keys = Object.keys(patch.components) as LessonComponent[];
  if (
    keys.some((key) => !targets.components.includes(key) || immutable.includes(key)) ||
    patch.questions.some((item) => !targets.questions.includes(item.nomor)) ||
    patch.meetings.some(
      (item) =>
        !targets.meetings.includes(item.pertemuan) ||
        item.steps.some((step) => step.pertemuan !== item.pertemuan),
    ) ||
    (patch.questions.length && (keys.includes('evaluasi') || immutable.includes('evaluasi'))) ||
    (patch.meetings.length && keys.includes('skenarioPembelajaran')) ||
    new Set(patch.questions.map((item) => item.nomor)).size !== patch.questions.length ||
    new Set(patch.meetings.map((item) => item.pertemuan)).size !== patch.meetings.length
  )
    throw new Error('Patch AI mengubah bagian di luar temuan atau konten guru.');
  const merged = { ...current, ...patch.components };
  if (patch.questions.length) {
    const questions = ModulAjarAssessmentSchema.parse(current.evaluasi);
    merged.evaluasi = questions.map(
      (item) => patch.questions.find((replacement) => replacement.nomor === item.nomor) ?? item,
    );
  }
  if (patch.meetings.length) {
    const steps = ModulAjarGenerationSchema.shape.skenarioPembelajaran.parse(
      current.skenarioPembelajaran,
    );
    merged.skenarioPembelajaran = Array.from(
      new Set([
        ...steps.map((step) => step.pertemuan),
        ...patch.meetings.map((item) => item.pertemuan),
      ]),
    )
      .sort((a, b) => a - b)
      .flatMap(
        (meeting) =>
          patch.meetings.find((item) => item.pertemuan === meeting)?.steps ??
          steps.filter((step) => step.pertemuan === meeting),
      );
  }
  return merged;
}

export function structuralRepairTargets(issues: string[]): LessonRepairTargets {
  const targets: LessonRepairTargets = { components: [], questions: [], meetings: [] };
  for (const issue of issues) {
    const questionNumber = issue.match(/(?:soal|Soal) (\d+)/)?.[1];
    const meeting = issue.match(/pertemuan (\d+)/)?.[1];
    if (questionNumber) targets.questions.push(Number(questionNumber));
    else if (meeting) targets.meetings.push(Number(meeting));
    else if (/model pembelajaran/i.test(issue)) targets.components.push('modelPembelajaran');
    else if (/Tujuan pembelajaran yang ditulis/.test(issue))
      targets.components.push('tujuanPembelajaran');
    else if (/LKPD/.test(issue)) targets.components.push('lkpd');
    else if (/evaluasi|Soal yang ditulis/.test(issue)) targets.components.push('evaluasi');
    else if (/langkah|kegiatan inti|Nomor pertemuan/.test(issue))
      targets.components.push('skenarioPembelajaran');
  }
  targets.components = [...new Set(targets.components)];
  targets.questions = [...new Set(targets.questions)];
  targets.meetings = [...new Set(targets.meetings)];
  if (targets.components.includes('evaluasi')) targets.questions = [];
  if (targets.components.includes('skenarioPembelajaran')) targets.meetings = [];
  return targets;
}
export function reviewerRepairTargets(raw: unknown): LessonRepairTargets {
  const review = ModulAjarReviewSchema.parse(raw);
  const targets: LessonRepairTargets = {
    components: [],
    questions: review.soal.filter((item) => !item.benar).map((item) => item.nomor),
    meetings: [],
  };
  for (const finding of review.temuan ?? []) {
    if (finding.komponen === 'evaluasi' && finding.nomor) targets.questions.push(finding.nomor);
    else if (finding.komponen === 'skenarioPembelajaran' && finding.pertemuan)
      targets.meetings.push(finding.pertemuan);
    else targets.components.push(finding.komponen);
  }
  targets.components = [...new Set(targets.components)];
  targets.questions = [...new Set(targets.questions)];
  targets.meetings = [...new Set(targets.meetings)];
  if (targets.components.includes('evaluasi')) targets.questions = [];
  if (targets.components.includes('skenarioPembelajaran')) targets.meetings = [];
  return targets;
}
