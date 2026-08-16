import { generateGeminiJson } from './geminiService';
import { supabase } from './supabase';

const FASE_DESC: Record<string, string> = {
  'A': 'Kelas 1-2 SD/MI (usia 6-8 tahun)',
  'B': 'Kelas 3-4 SD/MI (usia 8-10 tahun)',
  'C': 'Kelas 5-6 SD/MI (usia 10-12 tahun)',
};

const SYSTEM_INSTRUCTION = `Kamu adalah pakar pendidikan Kurikulum Merdeka Indonesia khusus untuk jenjang SD/MI.
Tugasmu: menyusun konten pedagogis spesifik berdasarkan Mata Pelajaran, Topik, dan Fase yang diberikan.
Gunakan bahasa Indonesia baku yang jelas, kontekstual, dan sesuai perkembangan peserta didik.
Setiap konten harus spesifik untuk topik, bukan generik. Output hanya teks biasa tanpa format tabel Markdown. Jangan gunakan karakter | atau --- untuk membuat tabel. Gunakan poin-poin sederhana tanpa penomoran berurutan secara global.`;

export type FieldContext = {
  mapel: string;
  topik: string;
  fase: string;
  modelPembelajaran?: string;
};

const KNOWN_BOILERPLATE_COLUMNS = new Set([
  'tujuan_pembelajaran',
  'pertanyaan_pemantik',
  'pemahaman_bermakna',
  'lkpd_tugas',
  'soal_evaluasi',
  'pengayaan',
  'remedial',
  'daftar_pustaka',
  'content_status',
  'generated_by_provider',
  'generated_by_model',
  'is_verified',
  'prompt_version',
  'quality_score',
  'request_fingerprint',
]);

/** Simpan hasil AI ke ref_boilerplate_topik agar bisa dipakai guru lain. */
async function cacheToBank(ctx: FieldContext, partial: Record<string, any>): Promise<void> {
  try {
    const normMapel = ctx.mapel.toLowerCase().trim();
    const normTopik = ctx.topik.toLowerCase().trim();

    // Cek error select — Supabase mengembalikan {error}, bukan throw.
    const { data: existing, error: selectError } = await supabase
      .from('ref_boilerplate_topik')
      .select('id, content_status, konten_json')
      .eq('mata_pelajaran', normMapel)
      .eq('topik', normTopik)
      .eq('fase', ctx.fase)
      .maybeSingle();

    if (selectError) {
      console.error('[AI Cache] Gagal memeriksa bank:', selectError);
      return;
    }

    // Jangan menurunkan konten yang sudah verified menjadi draft.
    if (existing && existing.content_status === 'verified') {
      return;
    }

    const existingJson = existing?.konten_json ? (typeof existing.konten_json === 'object' ? existing.konten_json : {}) : {};

    // Filter only valid top-level columns to avoid 400 Bad Request on PostgreSQL schema mismatch
    const topLevelFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (KNOWN_BOILERPLATE_COLUMNS.has(key)) {
        topLevelFields[key] = value;
      }
    }

    if (existing) {
      const updatePayload = {
        ...topLevelFields,
        konten_json: { ...existingJson, ...partial },
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('ref_boilerplate_topik').update(updatePayload).eq('id', existing.id);
      if (error) console.error('[AI Cache] Gagal update bank:', error);
    } else {
      const insertPayload = {
        mata_pelajaran: normMapel,
        topik: normTopik,
        fase: ctx.fase,
        content_status: 'draft_ai',
        generated_by_provider: 'gemini',
        tujuan_pembelajaran: [],
        pertanyaan_pemantik: [],
        pemahaman_bermakna: [],
        lkpd_tugas: '',
        soal_evaluasi: '',
        pengayaan: [],
        remedial: [],
        daftar_pustaka: [],
        ...topLevelFields,
        konten_json: { ...existingJson, ...partial },
      };
      const { error } = await supabase.from('ref_boilerplate_topik').insert(insertPayload as any);
      if (error) console.error('[AI Cache] Gagal insert bank:', error);
    }
  } catch (e) {
    // Non-blocking — jangan gagalkan UI kalau cache gagal, tapi tetap log
    console.error('[AI Cache] Gagal simpan ke bank:', e);
  }
}

/**
 * ✨ Generate Tujuan Pembelajaran (return multi-line string, one per line)
 */
export async function generateTujuanPembelajaran(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan maksimal 3 Tujuan Pembelajaran yang SPESIFIK untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

Rumuskan dari Capaian Pembelajaran yang relevan. Gunakan kata kerja operasional (KKO) Taksonomi Bloom sesuai perkembangan kognitif peserta didik. Setiap tujuan harus terukur dan dapat diamati.
Setiap tujuan harus SPESIFIK untuk topik "${ctx.topik}", bukan generik.

Output JSON: {"tujuan": ["string", ...]}`;

  const result = await generateGeminiJson<{ tujuan?: string[]; tujuanPembelajaran?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.tujuan || result?.tujuanPembelajaran || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { tujuan_pembelajaran: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * ✨ Generate Pertanyaan Pemantik (return multi-line string, one per line)
 */
export async function generatePertanyaanPemantik(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan 3-4 Pertanyaan Pemantik yang memicu rasa ingin tahu untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

Pertanyaan harus kontekstual, relevan dengan kehidupan sehari-hari, dan sesuai usia peserta didik.
Hindari pertanyaan ya/tidak — gunakan pertanyaan terbuka (apa, mengapa, bagaimana).

Output JSON: {"pertanyaan": ["string", ...]}`;

  const result = await generateGeminiJson<{ pertanyaan?: string[]; pertanyaanPemantik?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.pertanyaan || result?.pertanyaanPemantik || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { pertanyaan_pemantik: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * ✨ Generate LKPD / Tugas (return multi-line string)
 */
export async function generateLkpdTugas(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const modelInfo = ctx.modelPembelajaran ? `\nModel Pembelajaran: ${ctx.modelPembelajaran}` : '';
  const prompt = `Buatkan Lembar Kerja Peserta Didik (LKPD) yang LENGKAP, MENARIK, dan RAMAH ANAK untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})${modelInfo}

Struktur LKPD yang harus dibuat:
1. Judul Aktivitas yang seru dan memotivasi (misal: "### LKPD: Petualangan Menemukan ...")
2. Petunjuk Belajar
3. Alat dan Bahan yang Dibutuhkan
4. Langkah Kegiatan Eksplorasi Bernomor Jelas (Langkah 1: ..., Langkah 2: ...)
5. Tempat Isian/Kotak Jawaban Siswa menggunakan tag penanda [Kotak untuk Gambar/Jawaban]
6. Refleksi Singkat Siswa

Gunakan format Markdown bersih (##, ###, bullet -, nomor 1.). Jangan gunakan format tabel markdown (| --- |).

Output JSON: {"lkpd": "string — konten LKPD lengkap dan terstruktur"}`;

  const result = await generateGeminiJson<{ lkpd?: string; lkpdTugas?: string; konten?: string }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const content = result?.lkpd || result?.lkpdTugas || result?.konten || (typeof result === 'string' ? result : '');
  cacheToBank(ctx, { lkpd_tugas: content });
  return content;
}

/**
 * ✨ Generate Soal Evaluasi (return multi-line string)
 */
export async function generateSoalEvaluasi(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan soal evaluasi yang komprehensif dan kontekstual untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

Buat 5 butir soal:
- Soal 1-3: Pilihan Ganda (dengan opsi A, B, C, D) berbasis stimulus cerita/gambar kontekstual.
- Soal 4-5: Soal Uraian / Pemecahan Masalah aplikatif tingkat penalaran sesuai usia.

PISAHKAN soal dan kunci jawaban ke field terpisah.

Output JSON: {"soal": "string — nomor 1-5 soal saja dengan opsi pilihan dan pertanyaan uraian, tanpa kunci jawaban", "kunci": ["1. Jawaban...", "2. Jawaban...", "3. Jawaban...", "4. Pembahasan...", "5. Pembahasan..."]}

Format soal harus rapi menggunakan penomoran 1., 2., 3., 4., 5. Jangan gunakan tabel markdown.`;

  const result = await generateGeminiJson<{ soal?: string | string[]; soalEvaluasi?: string | string[]; kunci?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  let content = '';
  if (typeof result?.soal === 'string') {
    content = result.soal;
  } else if (Array.isArray(result?.soal)) {
    content = result.soal.join('\n\n');
  } else if (typeof result?.soalEvaluasi === 'string') {
    content = result.soalEvaluasi;
  } else if (Array.isArray(result?.soalEvaluasi)) {
    content = result.soalEvaluasi.join('\n\n');
  } else if (typeof result === 'string') {
    content = result;
  }

  cacheToBank(ctx, { soal_evaluasi: content, kunci_jawaban: result?.kunci || [] });
  return content;
}

/**
 * ✨ Generate Kompetensi Awal (Prasyarat)
 */
export async function generateKompetensiAwal(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan deskripsi Kompetensi Awal (prasyarat) untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

Kompetensi awal adalah pengetahuan dan/atau keterampilan yang harus sudah dimiliki peserta didik SEBELUM mempelajari topik ini.
Buat 2-3 butir kompetensi awal yang spesifik dan terukur.

Output JSON: {"kompetensiAwal": "string — deskripsi kompetensi awal"}`;

  const result = await generateGeminiJson<{ kompetensiAwal?: string | string[]; kompetensi_awal?: string | string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const raw = result?.kompetensiAwal || result?.kompetensi_awal || (typeof result === 'string' ? result : '');
  const content = Array.isArray(raw) ? raw.join('\n') : String(raw || '');
  cacheToBank(ctx, { kompetensi_awal: content });
  return content;
}

/**
 * ✨ Generate Capaian Pembelajaran (CP) spesifik topik — fallback jika tidak ditemukan di DB.
 */
export async function generateCapaianPembelajaran(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan Capaian Pembelajaran (CP) Kurikulum Merdeka yang SPESIFIK untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

CP adalah deskripsi kompetensi dan lingkup materi yang dicapai peserta didik pada akhir fase.
Buat 2-3 paragraf CP yang mencakup:
- Pemahaman konseptual spesifik topik "${ctx.topik}"
- Keterampilan proses yang relevan
- Sikap yang dikembangkan

Output JSON: {"cp": "string — deskripsi CP lengkap 2-3 paragraf, spesifik topik"}`;

  const result = await generateGeminiJson<{ cp?: string | string[]; capaianPembelajaran?: string | string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const raw = result?.cp || result?.capaianPembelajaran || (typeof result === 'string' ? result : '');
  const content = Array.isArray(raw) ? raw.join('\n\n') : String(raw || '');
  cacheToBank(ctx, { capaian_pembelajaran: content });
  return content;
}
