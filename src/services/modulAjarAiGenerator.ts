import { generateOpenRouterJson } from './openRouterService';
import { supabase } from './supabase';
import { logger } from './logger';

export interface SkenarioStep {
  name: string;
  guru: string;
  siswa: string;
}

export interface AiModulAjarContent {
  tujuanPembelajaran: string[];
  pemahamanBermakna: string[];
  pertanyaanPemantik: string[];
  lkpdTugas: string;
  soalEvaluasi: string;
  kunciJawaban: string[];
  capaianPembelajaran: string;
  kompetensiAwal: string;
  pengayaan: string[];
  remedial: string[];
  daftarPustaka: string[];
  skenarioPembelajaran: SkenarioStep[];
}

const SYSTEM_INSTRUCTION = `Kamu adalah pakar pendidikan Kurikulum Merdeka Indonesia khusus untuk jenjang SD/MI.
Tugasmu: menyusun konten pedagogis terstruktur untuk Modul Ajar berdasarkan Mata Pelajaran, Topik, dan Fase yang diberikan.
Setiap konten harus sangat spesifik untuk topik, bukan generik. Gunakan contoh konkret dan kontekstual.
Gunakan gaya bahasa naratif buku panduan guru: deskriptif, konkret, dan langsung bisa dipraktikkan.
Output hanya teks biasa tanpa format tabel Markdown. Jangan gunakan karakter | atau --- untuk membuat tabel. Gunakan poin-poin sederhana (angka atau strip) tanpa penomoran berurutan secara global.`;

const FASE_DESC: Record<string, string> = {
  'A': 'Kelas 1-2 SD/MI (usia 6-8 tahun)',
  'B': 'Kelas 3-4 SD/MI (usia 8-10 tahun)',
  'C': 'Kelas 5-6 SD/MI (usia 10-12 tahun)',
};

function buildPrompt(mapel: string, topik: string, fase: string, modelPembelajaran?: string): string {
  const faseInfo = FASE_DESC[fase] || `Fase ${fase}`;
  const modelInfo = modelPembelajaran ? `\nModel Pembelajaran: ${modelPembelajaran}` : '';
  return `Buatkan konten Modul Ajar Kurikulum Merdeka dengan detail berikut:

Mata Pelajaran: ${mapel}
Topik/Materi: ${topik}
Fase: ${fase} (${faseInfo})${modelInfo}

Hasilkan JSON dengan struktur berikut:
{
  "tujuanPembelajaran": ["maksimal 3 tujuan pembelajaran SPESIFIK untuk topik ${topik}, dirumuskan dari Capaian Pembelajaran menggunakan kata kerja operasional (KKO) Taksonomi Bloom yang sesuai, terukur, dan dapat diamati"],
  "pemahamanBermakna": ["minimal 2 pemahaman bermakna yang mengaitkan topik ${topik} dengan kehidupan nyata"],
  "pertanyaanPemantik": ["minimal 3 pertanyaan pemantik terbuka yang relevan dengan topik ${topik}"],
  "lkpdTugas": "LKPD lengkap dengan instruksi langkah demi langkah untuk topik ${topik}, bukan generic instructions",
  "soalEvaluasi": "5 soal variatif (PG + uraian) tentang ${topik}, soal DAN kunci jawaban DIPISAH (soal di kolom soalEvaluasi, kunci di kolom kunciJawaban)",
  "capaianPembelajaran": "2-3 paragaf CP spesifik topik ${topik} sesuai Fase ${fase} Kurikulum Merdeka",
  "kompetensiAwal": "2-3 butir kompetensi awal/prasyarat yang harus dimiliki peserta didik sebelum belajar topik ${topik}",
  "pengayaan": ["1-2 kegiatan pengayaan terkait ${topik}"],
  "remedial": ["1-2 kegiatan remedial terkait ${topik}"],
  "daftarPustaka": ["2-3 sumber rujukan relevan"],
  "skenarioPembelajaran": [{"name": "nama langkah", "guru": "aktivitas guru SPESIFIK untuk topik ${topik} — berisi contoh konkret yang bisa langsung dipraktikkan", "siswa": "aktivitas siswa SPESIFIK untuk topik ${topik} — berisi contoh konkret"}]
}

PENTING:
- Semua konten harus SPESIFIK untuk topik "${topik}" dalam mapel "${mapel}", BUKAN template generik.
- Skenario pembelajaran: setiap langkah HARUS menyebutkan contoh konkret topik ${topik}.
  ❌ SALAH: "Guru menjelaskan materi", "Siswa mengamati penjelasan"
  ✅ BENAR: "Guru menunjukkan 5 gambar bangun datar (segitiga, persegi, lingkaran, persegi panjang, trapesium) lalu meminta siswa menyebutkan ciri-cirinya", "Siswa menyusun puzzle tangram dan mengidentifikasi bentuk bangun datar yang digunakan"
- Tulis aktivitas Guru dan Siswa secara NARATIF sebagai deskripsi kegiatan fisik dan verbal yang nyata.
  ❌ SALAH: "Guru melakukan tahap orientasi masalah", "Siswa mengikuti orientasi"
  ✅ BENAR: "Guru memperlihatkan video petualangan di hutan berisi berbagai bentuk bangun datar, lalu mengajukan pertanyaan 'Bangun datar apa saja yang kalian lihat?'", "Siswa mengamati video, menunjuk layar, dan menyebutkan nama bangun datar yang mereka kenali"
- JANGAN mengulang nama fase/sintaks sebagai satu-satunya aktivitas. Setiap langkah harus berisi contoh konkret kegiatan.
- LKPD harus aktivitas konkret bukan instruksi umum.
- Gunakan bahasa sesuai ${faseInfo}.`;
}

export async function generateModulAjarAiContent(
  mapel: string,
  topik: string,
  fase: string,
  modelPembelajaran?: string
): Promise<AiModulAjarContent> {
  const prompt = buildPrompt(mapel, topik, fase, modelPembelajaran);

  logger.info(`[AI Modul Ajar] Generating: ${mapel} / ${topik} / Fase ${fase}`, 'ModulAjarAI');

  const result = await generateOpenRouterJson<AiModulAjarContent>(prompt, SYSTEM_INSTRUCTION);

  if (!result.tujuanPembelajaran || !Array.isArray(result.tujuanPembelajaran) || result.tujuanPembelajaran.length === 0) {
    throw new Error('AI menghasilkan konten tidak lengkap (tujuan pembelajaran kosong).');
  }

  const normalized: AiModulAjarContent = {
    tujuanPembelajaran: result.tujuanPembelajaran || [],
    pemahamanBermakna: result.pemahamanBermakna || [],
    pertanyaanPemantik: result.pertanyaanPemantik || [],
    lkpdTugas: result.lkpdTugas || '',
    soalEvaluasi: normalizeSoalEvaluasi(result.soalEvaluasi),
    kunciJawaban: Array.isArray(result.kunciJawaban)
      ? result.kunciJawaban.filter((k: unknown): k is string => typeof k === 'string')
      : typeof result.kunciJawaban === 'string'
        ? [result.kunciJawaban]
        : [],
    capaianPembelajaran: typeof result.capaianPembelajaran === 'string'
      ? result.capaianPembelajaran
      : Array.isArray(result.capaianPembelajaran)
        ? (result.capaianPembelajaran as string[]).join('\n')
        : '',
    kompetensiAwal: typeof result.kompetensiAwal === 'string'
      ? result.kompetensiAwal
      : Array.isArray(result.kompetensiAwal)
        ? (result.kompetensiAwal as string[]).join('\n')
        : '',
    pengayaan: result.pengayaan || [],
    remedial: result.remedial || [],
    daftarPustaka: result.daftarPustaka || [],
    skenarioPembelajaran: result.skenarioPembelajaran || [],
  };

  cacheToDatabase(mapel, topik, fase, normalized).catch(err =>
    logger.warn('[AI Modul Ajar] Cache failed:', 'ModulAjarAI', err)
  );

  logger.info(`[AI Modul Ajar] Success: ${mapel} / ${topik}`, 'ModulAjarAI');
  return normalized;
}

// ponytail: if more AI text fields also arrive as objects (lkpdTugas, etc.), generalize to normalizeTextField()
export function normalizeSoalEvaluasi(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return (
            (typeof obj.soal === 'string' ? obj.soal :
             typeof obj.pertanyaan === 'string' ? obj.pertanyaan :
             typeof obj.teks === 'string' ? obj.teks :
             typeof obj.konten === 'string' ? obj.konten :
             null) ?? JSON.stringify(item)
          );
        }
        return String(item);
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(value);
}

async function cacheToDatabase(
  mapel: string,
  topik: string,
  fase: string,
  content: AiModulAjarContent
): Promise<void> {
  const normMapel = mapel.toLowerCase().trim();
  const normTopik = topik.toLowerCase().trim();

  const { data: existing } = await supabase
    .from('ref_boilerplate_topik')
    .select('id')
    .eq('mata_pelajaran', normMapel)
    .eq('topik', normTopik)
    .eq('fase', fase)
    .maybeSingle();

  const payload = {
    tujuan_pembelajaran: content.tujuanPembelajaran,
    pemahaman_bermakna: content.pemahamanBermakna,
    pertanyaan_pemantik: content.pertanyaanPemantik,
    lkpd_tugas: content.lkpdTugas,
    soal_evaluasi: content.soalEvaluasi,
    pengayaan: content.pengayaan,
    remedial: content.remedial,
    daftar_pustaka: content.daftarPustaka,
    is_verified: true,
    content_status: 'verified',
    generated_by_provider: 'gemini',
    konten_json: content as any,
  };

  if (existing) {
    await supabase.from('ref_boilerplate_topik').update(payload).eq('id', existing.id);
  } else {
    const insertPayload = {
      mata_pelajaran: normMapel,
      topik: normTopik,
      fase: fase,
      ...payload,
    };
    await supabase.from('ref_boilerplate_topik').insert(insertPayload);
  }
}
