import { generateOpenRouterJson } from './openRouterService';
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

/** Simpan hasil AI ke ref_boilerplate_topik agar bisa dipakai guru lain. */
async function cacheToBank(ctx: FieldContext, partial: Record<string, any>): Promise<void> {
  try {
    const normMapel = ctx.mapel.toLowerCase().trim();
    const normTopik = ctx.topik.toLowerCase().trim();

    const { data: existing } = await supabase
      .from('ref_boilerplate_topik')
      .select('id, konten_json')
      .eq('mata_pelajaran', normMapel)
      .eq('topik', normTopik)
      .eq('fase', ctx.fase)
      .maybeSingle();

    const existingJson = existing?.konten_json ? (typeof existing.konten_json === 'object' ? existing.konten_json : {}) : {};

    const merged = {
      mata_pelajaran: normMapel,
      topik: normTopik,
      fase: ctx.fase,
      content_status: 'draft_ai',
      generated_by_provider: 'gemini',
      konten_json: { ...existingJson, ...partial },
      ...partial,
    };

    if (existing) {
      await supabase.from('ref_boilerplate_topik').update(merged).eq('id', existing.id);
    } else {
      await supabase.from('ref_boilerplate_topik').insert(merged);
    }
  } catch (e) {
    // Non-blocking — jangan gagalkan UI kalau cache gagal
    console.warn('[AI Cache] Gagal simpan ke bank:', e);
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

  const result = await generateOpenRouterJson<{ tujuan: string[] }>(prompt, SYSTEM_INSTRUCTION);
  const content = (result.tujuan || []).join('\n');
  cacheToBank(ctx, { tujuan_pembelajaran: result.tujuan || [] });
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

  const result = await generateOpenRouterJson<{ pertanyaan: string[] }>(prompt, SYSTEM_INSTRUCTION);
  const content = (result.pertanyaan || []).join('\n');
  cacheToBank(ctx, { pertanyaan_pemantik: result.pertanyaan || [] });
  return content;
}

/**
 * ✨ Generate LKPD / Tugas (return multi-line string)
 */
export async function generateLkpdTugas(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const modelInfo = ctx.modelPembelajaran ? `\nModel Pembelajaran: ${ctx.modelPembelajaran}` : '';
  const prompt = `Buatkan Lembar Kerja Peserta Didik (LKPD) untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})${modelInfo}

LKPD harus:
- Berisi langkah-langkah kegiatan yang jelas dan bisa langsung dikerjakan
- Menggunakan bahasa sesuai usia peserta didik
- Mendukung pembelajaran aktif (bukan hanya mencatat)
- Bersifat individual atau kelompok kecil
- Spesifik untuk topik "${ctx.topik}"
- Jangan gunakan format tabel Markdown. Tulis petunjuk sebagai teks biasa dengan poin-poin sederhana.

Output JSON: {"lkpd": "string — konten LKPD lengkap dengan langkah-langkah"}`;

  const result = await generateOpenRouterJson<{ lkpd: string }>(prompt, SYSTEM_INSTRUCTION);
  cacheToBank(ctx, { lkpd_tugas: result.lkpd || '' });
  return result.lkpd || '';
}

/**
 * ✨ Generate Soal Evaluasi (return multi-line string)
 */
export async function generateSoalEvaluasi(ctx: FieldContext): Promise<string> {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const prompt = `Buatkan soal evaluasi untuk:

Mata Pelajaran: ${ctx.mapel}
Topik/Materi: ${ctx.topik}
Fase: ${ctx.fase} (${faseInfo})

Buat 5 soal variatif (campuran pilihan ganda dan uraian singkat) yang menguji pemahaman topik.
PISAHKAN soal dan kunci jawaban ke field terpisah.

Output JSON: {"soal": "string — nomor 1-5 hanya soal, tanpa kunci jawaban", "kunci": ["kunci jawaban 1", "kunci jawaban 2", ...]}

Output murni teks biasa. Jangan gunakan format tabel Markdown. Nomor soal hanya sebagai "1.", "2.", dst.`;

  const result = await generateOpenRouterJson<{ soal: string }>(prompt, SYSTEM_INSTRUCTION);
  cacheToBank(ctx, { soal_evaluasi: result.soal || '' });
  return result.soal || '';
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

  const result = await generateOpenRouterJson<{ kompetensiAwal: string }>(prompt, SYSTEM_INSTRUCTION);
  cacheToBank(ctx, { kompetensi_awal: result.kompetensiAwal || '' });
  return result.kompetensiAwal || '';
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

  const result = await generateOpenRouterJson<{ cp: string }>(prompt, SYSTEM_INSTRUCTION);
  const content = result.cp || '';
  cacheToBank(ctx, { capaian_pembelajaran: content });
  return content;
}
