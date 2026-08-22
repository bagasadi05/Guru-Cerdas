import { generateGeminiJson } from './geminiService';
import { supabase } from './supabase';

const FASE_DESC: Record<string, string> = {
  'A': 'Kelas 1-2 SD/MI (usia 6-8 tahun, pembelajaran konkret, visual, dan ramah anak)',
  'B': 'Kelas 3-4 SD/MI (usia 8-10 tahun, eksplorasi kontekstual, kolaboratif, dan semi-abstrak)',
  'C': 'Kelas 5-6 SD/MI (usia 10-12 tahun, penalaran kritis HOTS, pemecahan masalah nyata)',
};

const SYSTEM_INSTRUCTION = `Kamu adalah pakar pendidikan Kurikulum Merdeka Indonesia khusus untuk jenjang SD/MI (Madrasah Ibtidaiyah).
Tugasmu: menyusun konten pedagogis yang spesifik, aplikatif, dan kontekstual berdasarkan Mata Pelajaran, Topik, Fase, dan Nilai Karakter Islami (Kemenag/KBC) yang diberikan.
Gunakan bahasa Indonesia baku yang jelas, ramah anak, dan sesuai tahap perkembangan kognitif peserta didik.
Setiap konten harus SPESIFIK untuk topik materi yang diminta, bukan kalimat umum/generik.
Output HANYA teks bersih dalam format JSON terstruktur yang diminta. Jangan gunakan karakter tabel markdown (| --- |). Gunakan penomoran dan poin-poin sederhana yang rapi.`;

export type FieldContext = {
  mapel: string;
  topik: string;
  fase: string;
  kelas?: string;
  modelPembelajaran?: string;
  alokasiWaktu?: string;
  profilPelajarPancasila?: string[];
  temaKbc?: string[];
  materiInsersi?: string;
  isKbcIntegrated?: boolean;
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

function buildPedagogyContext(ctx: FieldContext): string {
  const faseInfo = FASE_DESC[ctx.fase] || `Fase ${ctx.fase}`;
  const kelasInfo = ctx.kelas ? `\nKelas: ${ctx.kelas}` : '';
  const modelInfo = ctx.modelPembelajaran ? `\nModel Pembelajaran: ${ctx.modelPembelajaran}` : '';
  const waktuInfo = ctx.alokasiWaktu ? `\nAlokasi Waktu: ${ctx.alokasiWaktu}` : '';
  const profilInfo = ctx.profilPelajarPancasila && ctx.profilPelajarPancasila.length > 0
    ? `\nDimensi Profil Pelajar: ${ctx.profilPelajarPancasila.join(', ')}`
    : '';
  const kbcInfo = ctx.isKbcIntegrated && ctx.materiInsersi
    ? `\nIntegrasi Kurikulum Berbasis Cinta (KBC / Panca Cinta Kemenag): ${ctx.materiInsersi}`
    : (ctx.isKbcIntegrated && ctx.temaKbc && ctx.temaKbc.length > 0
      ? `\nTema Panca Cinta Kemenag: ${ctx.temaKbc.join(', ')}`
      : '');

  return `Mata Pelajaran: ${ctx.mapel}\nTopik/Materi: ${ctx.topik}\nFase: ${ctx.fase} (${faseInfo})${kelasInfo}${modelInfo}${waktuInfo}${profilInfo}${kbcInfo}`;
}

/** Simpan hasil AI ke ref_boilerplate_topik agar bisa dipakai guru lain secara instan. */
async function cacheToBank(ctx: FieldContext, partial: Record<string, any>): Promise<void> {
  try {
    const normMapel = ctx.mapel.toLowerCase().trim();
    const normTopik = ctx.topik.toLowerCase().trim();

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

    if (existing && existing.content_status === 'verified') {
      return;
    }

    const existingJson = existing?.konten_json && typeof existing.konten_json === 'object'
      ? existing.konten_json
      : {};

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
    console.error('[AI Cache] Gagal simpan ke bank:', e);
  }
}

/**
 * 1. ✨ Generate Tujuan Pembelajaran (TP)
 */
export async function generateTujuanPembelajaran(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan 2-3 Tujuan Pembelajaran yang SPESIFIK dan TERUKUR untuk:

${contextText}

Panduan:
- Gunakan Kata Kerja Operasional (KKO) Taksonomi Bloom yang sesuai dengan perkembangan kognitif peserta didik di Fase ${ctx.fase}.
- Format poin-poin bernomor (1., 2., 3.).
- Setiap tujuan harus spesifik untuk materi "${ctx.topik}".

Output JSON: {"tujuan": ["string", ...]}`;

  const result = await generateGeminiJson<{ tujuan?: string[]; tujuanPembelajaran?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.tujuan || result?.tujuanPembelajaran || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { tujuan_pembelajaran: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 2. ✨ Generate Pemahaman Bermakna (Big Ideas)
 */
export async function generatePemahamanBermakna(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan 2-3 butir Pemahaman Bermakna (Meaningful Understanding / Big Ideas) untuk:

${contextText}

Panduan:
- Pemahaman bermakna menjelaskan manfaat hakiki dan esensi materi yang akan terus diingat serta berguna dalam kehidupan sehari-hari siswa setelah pelajaran selesai.
- Hubungkan dengan rasa syukur, kepedulian lingkungan/sesama, atau aplikasi nyata.
- Gunakan bahasa yang inspiratif dan ramah anak.

Output JSON: {"pemahamanBermakna": ["string", ...]}`;

  const result = await generateGeminiJson<{ pemahamanBermakna?: string[]; pemahaman_bermakna?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.pemahamanBermakna || result?.pemahaman_bermakna || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { pemahaman_bermakna: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 3. ✨ Generate Pertanyaan Pemantik
 */
export async function generatePertanyaanPemantik(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan 3-4 Pertanyaan Pemantik yang memicu rasa ingin tahu (curiosity) untuk:

${contextText}

Panduan:
- Pertanyaan harus kontekstual, menarik, dan relevan dengan pengalaman sehari-hari siswa di Fase ${ctx.fase}.
- Gunakan pertanyaan terbuka (mengapa, bagaimana, apa yang terjadi jika) dan hindari pertanyaan ya/tidak.

Output JSON: {"pertanyaan": ["string", ...]}`;

  const result = await generateGeminiJson<{ pertanyaan?: string[]; pertanyaanPemantik?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.pertanyaan || result?.pertanyaanPemantik || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { pertanyaan_pemantik: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 4. ✨ Generate Ringkasan Materi Ajar Siswa
 */
export async function generateMateriAjar(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Ringkasan Bahan Bacaan / Materi Ajar yang MENARIK, PADAT, dan RAMAH ANAK untuk:

${contextText}

Panduan Struktur:
1. Konsep Utama / Pengantar Cerita Sederhana
2. Poin-Poin Penting Materi (dengan analogi yang mudah dipahami)
3. Contoh Nyata dalam Kehidupan Sehari-hari
4. Hikmah / Nilai Karakter yang Dipetik

Gunakan format Markdown bersih (##, ###, bullet -). Jangan gunakan tabel markdown.

Output JSON: {"materi": "string — isi materi bacaan lengkap dan terstruktur"}`;

  const result = await generateGeminiJson<{ materi?: string; materiAjar?: string; ringkasan?: string }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const content = result?.materi || result?.materiAjar || result?.ringkasan || (typeof result === 'string' ? result : '');
  cacheToBank(ctx, { materi_ajar: content });
  return content;
}

/**
 * 5. ✨ Generate LKPD / Lembar Kerja Peserta Didik
 */
export async function generateLkpdTugas(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Lembar Kerja Peserta Didik (LKPD) yang LENGKAP, MENARIK, dan RAMAH ANAK untuk:

${contextText}

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
 * 6. ✨ Generate Soal Evaluasi & Pedoman Penskoran
 */
export async function generateSoalEvaluasi(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Soal Evaluasi Pembelajaran yang komprehensif dan kontekstual untuk:

${contextText}

Komposisi 5 Butir Soal:
- Soal 1-3: Pilihan Ganda (opsi A, B, C, D) berbasis stimulus cerita/situasi nyata.
- Soal 4-5: Soal Uraian / Pemecahan Masalah aplikatif tingkat penalaran sesuai usia.

Format Soal harus rapi (1., 2., 3., 4., 5.).
Sertakan juga Kunci Jawaban dan Pedoman Penskoran untuk soal uraian.

Output JSON: {
  "soal": "string — nomor 1-5 butir soal lengkap dengan pilihan opsi dan pertanyaan uraian",
  "kunci": ["1. Jawaban...", "2. Jawaban...", "3. Jawaban...", "4. Pembahasan & Pedoman Skor: ...", "5. Pembahasan & Pedoman Skor: ..."]
}`;

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
 * 7. ✨ Generate Aktivitas Pengayaan (Enrichment)
 */
export async function generatePengayaan(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan 2 Aktivitas Pengayaan yang menantang dan eksploratif untuk peserta didik yang telah mencapai tujuan pembelajaran:

${contextText}

Panduan:
- Berikan tugas mandiri/kelompok mini berbasis penyelidikan, proyek kreatif sederhana, atau pemecahan masalah yang lebih mendalam.
- Pastikan kegiatan menyenangkan dan dapat dilakukan dengan bahan yang ada di sekitar siswa.

Output JSON: {"pengayaan": ["string — aktivitas 1", "string — aktivitas 2"]}`;

  const result = await generateGeminiJson<{ pengayaan?: string[]; aktivitasPengayaan?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.pengayaan || result?.aktivitasPengayaan || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n\n') : String(items || '');
  cacheToBank(ctx, { pengayaan: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 8. ✨ Generate Aktivitas Remedial
 */
export async function generateRemedial(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Strategi dan Panduan Aktivitas Remedial untuk peserta didik yang belum mencapai tujuan pembelajaran:

${contextText}

Panduan:
- Berikan pendekatan bimbingan bertahap (scaffolding), penyederhanaan konsep menggunakan media konkret, atau tutor sebaya.
- Buat 2 langkah remedial yang jelas dan mudah dipraktikkan oleh guru di kelas.

Output JSON: {"remedial": ["string — langkah 1", "string — langkah 2"]}`;

  const result = await generateGeminiJson<{ remedial?: string[]; aktivitasRemedial?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.remedial || result?.aktivitasRemedial || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n\n') : String(items || '');
  cacheToBank(ctx, { remedial: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 9. ✨ Generate Glosarium (Daftar Istilah Penting)
 */
export async function generateGlosarium(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan 4-6 entri Glosarium (istilah penting beserta definisinya yang ramah anak) untuk:

${contextText}

Format per entri: "Nama Istilah: Penjelasan sederhana dan mudah dipahami."

Output JSON: {"glosarium": ["string", ...]}`;

  const result = await generateGeminiJson<{ glosarium?: string[]; istilah?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.glosarium || result?.istilah || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { glosarium: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 10. ✨ Generate Daftar Pustaka Standar
 */
export async function generateDaftarPustaka(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Daftar Pustaka resmi dan relevan (Buku Guru, Buku Siswa Kemendikbudristek & Kemenag, serta sumber belajar digital) untuk:

${contextText}

Format referensi standar APA / Kurikulum Merdeka yang rapi.

Output JSON: {"daftarPustaka": ["string", ...]}`;

  const result = await generateGeminiJson<{ daftarPustaka?: string[]; referensi?: string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const items = result?.daftarPustaka || result?.referensi || (Array.isArray(result) ? result : []);
  const content = Array.isArray(items) ? items.join('\n') : String(items || '');
  cacheToBank(ctx, { daftar_pustaka: Array.isArray(items) ? items : [content] });
  return content;
}

/**
 * 11. ✨ Generate Kompetensi Awal (Prasyarat)
 */
export async function generateKompetensiAwal(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan deskripsi Kompetensi Awal (prasyarat) untuk:

${contextText}

Panduan:
- Kompetensi awal adalah pengetahuan atau keterampilan yang harus sudah dimiliki peserta didik SEBELUM mempelajari topik ini.
- Buat 2-3 butir kompetensi awal yang spesifik dan terukur.

Output JSON: {"kompetensiAwal": "string — deskripsi kompetensi awal"}`;

  const result = await generateGeminiJson<{ kompetensiAwal?: string | string[]; kompetensi_awal?: string | string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const raw = result?.kompetensiAwal || result?.kompetensi_awal || (typeof result === 'string' ? result : '');
  const content = Array.isArray(raw) ? raw.join('\n') : String(raw || '');
  cacheToBank(ctx, { kompetensi_awal: content });
  return content;
}

/**
 * 12. ✨ Generate Capaian Pembelajaran (CP) spesifik topik
 */
export async function generateCapaianPembelajaran(ctx: FieldContext): Promise<string> {
  const contextText = buildPedagogyContext(ctx);
  const prompt = `Buatkan Capaian Pembelajaran (CP) Kurikulum Merdeka yang SPESIFIK untuk:

${contextText}

Panduan:
- CP adalah deskripsi kompetensi dan lingkup materi yang dicapai peserta didik pada akhir fase.
- Buat 2-3 paragraf CP yang mencakup pemahaman konsep, keterampilan proses, dan sikap yang dikembangkan.

Output JSON: {"cp": "string — deskripsi CP lengkap 2-3 paragraf, spesifik topik"}`;

  const result = await generateGeminiJson<{ cp?: string | string[]; capaianPembelajaran?: string | string[] }>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');
  const raw = result?.cp || result?.capaianPembelajaran || (typeof result === 'string' ? result : '');
  const content = Array.isArray(raw) ? raw.join('\n\n') : String(raw || '');
  cacheToBank(ctx, { capaian_pembelajaran: content });
  return content;
}

