import { generateGeminiJson } from './geminiService';
import { supabase } from './supabase';
import { logger } from './logger';

export interface SkenarioStep {
  name: string;
  fase?: string;
  guru: string;
  siswa: string;
  alokasiWaktu?: string;
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
  kegiatanPendahuluan?: string[] | string;
  skenarioPembelajaran: SkenarioStep[];
  kegiatanPenutup?: string[] | string;
}

const SYSTEM_INSTRUCTION = `Kamu adalah pakar pendidikan Kurikulum Merdeka Indonesia khusus untuk jenjang SD/MI.
Tugasmu: menyusun dokumen Modul Ajar yang SANGAT LENGKAP, MENDALAM, dan SIAP PAKAI secara praktis di kelas oleh guru.
Setiap komponen harus kontekstual, rinci, kaya contoh nyata, dan bebas dari kalimat template generik.
Gunakan gaya bahasa buku panduan guru Kurikulum Merdeka: deskriptif, naratif, operasional, dan humanis.
Format teks output: gunakan format Markdown yang rapi (heading ##, bullet point -, list angka 1., penanda kotak [Kotak untuk ...]). JANGAN gunakan tabel markdown (| --- |).`;

const FASE_DESC: Record<string, string> = {
  'A': 'Kelas 1-2 SD/MI (usia 6-8 tahun, operasional konkret awal, pembelajaran visual & kinestetik)',
  'B': 'Kelas 3-4 SD/MI (usia 8-10 tahun, operasional konkret lanjutan, eksplorasi & kolaborasi)',
  'C': 'Kelas 5-6 SD/MI (usia 10-12 tahun, transisi operasional formal, penalaran kritis & proyek)',
};

function buildPrompt(mapel: string, topik: string, fase: string, modelPembelajaran?: string, metodePembelajaran?: string[]): string {
  const faseInfo = FASE_DESC[fase] || `Fase ${fase}`;
  const modelInfo = modelPembelajaran ? `\nModel Pembelajaran yang Digunakan: ${modelPembelajaran}` : '';
  const metodeInfo = (metodePembelajaran && metodePembelajaran.length > 0)
    ? `\nMetode Pembelajaran yang Dipilih: ${metodePembelajaran.join(', ')}`
    : '';

  return `Susunlah konten Modul Ajar Kurikulum Merdeka yang LENGKAP, KOMPREHENSIF, dan SANGAT MENDALAM untuk:

Mata Pelajaran: ${mapel}
Topik/Materi Pokok: ${topik}
Fase / Sasaran: Fase ${fase} (${faseInfo})${modelInfo}${metodeInfo}

Hasilkan JSON dengan struktur persis berikut:
{
  "tujuanPembelajaran": [
    "Tujuan 1 yang operasional (KKO Bloom), terukur, dan spesifik topik ${topik}",
    "Tujuan 2 yang operasional...",
    "Tujuan 3..."
  ],
  "pemahamanBermakna": [
    "Pemahaman bermakna 1 yang mengaitkan esensi topik ${topik} dengan kehidupan nyata sehari-hari siswa",
    "Pemahaman bermakna 2..."
  ],
  "pertanyaanPemantik": [
    "Pertanyaan pemantik 1 (terbuka, memicu rasa penasaran siswa terhadap ${topik})",
    "Pertanyaan pemantik 2...",
    "Pertanyaan pemantik 3..."
  ],
  "kegiatanPendahuluan": [
    "Orientasi & Penyiapan Kondisi Belajar: Guru membuka pelajaran dengan salam hangat, menyapa kabar peserta didik, meminta salah satu siswa memimpin doa bersama secara khidmat, memeriksa kehadiran dan kerapian kelas, serta mengajak siswa melakukan ice breaking penyemangat agar fokus dan ceria.",
    "Apersepsi & Pengaitan Konsep: Guru mengaitkan materi sebelumnya dengan topik ${topik} melalui tanya jawab interaktif dan menghubungkannya dengan fenomena kontekstual sehari-hari siswa di rumah atau sekolah.",
    "Motivasi & Manfaat Nyata: Guru menyampaikan manfaat penting dan aplikasi nyata mempelajari ${topik} dalam kehidupan nyata agar menumbuhkan antusiasme dan rasa ingin tahu mendalam.",
    "Pemberian Acuan, Tujuan Pembelajaran & Mekanisme Asesmen: Guru menyampaikan Tujuan Pembelajaran yang ingin dicapai dengan bahasa yang mudah dipahami, menjelaskan alur kegiatan belajar (diskusi kelompok, eksperimen/LKPD, dan presentasi), serta kriteria penilaian.",
    "Penyampaian Pertanyaan Pemantik: Guru melontarkan pertanyaan pemantik terbuka tentang ${topik} untuk memusatkan nalar kritis dan mengarahkan perhatian peserta didik ke topik inti."
  ],
  "skenarioPembelajaran": [
    {
      "name": "Langkah 1: Orientasi Siswa pada Masalah Kontekstual",
      "guru": "Deskripsi rinci kegiatan guru secara naratif terpadu dengan metode yang dipilih: media konkret/gambar/cerita apa yang ditampilkan terkait ${topik}, bagaimana guru mendemonstrasikan/memantik siswa, pertanyaan pemandu apa yang diajukan.",
      "siswa": "Deskripsi rinci kegiatan siswa: apa yang diamati, apa yang ditanyakan siswa, bagaimana respon mereka terhadap masalah ${topik} yang diajukan."
    },
    {
      "name": "Langkah 2: Pengorganisasian Belajar & Kolaborasi",
      "guru": "Deskripsi kegiatan guru: bagaimana guru membagi siswa ke dalam kelompok heterogen, membagikan LKPD, serta memberikan arahan peran tiap anggota kelompok.",
      "siswa": "Deskripsi kegiatan siswa: berkumpul bersama kelompok, membaca petunjuk LKPD, membagi tugas, dan menyiapkan alat/bahan."
    },
    {
      "name": "Langkah 3: Penyelidikan Mandiri & Kelompok",
      "guru": "Deskripsi kegiatan guru: berkeliling memfasilitasi diskusi dan eksperimen/uji coba siswa, memberikan bimbingan diferensiasi (scaffolding bagi kelompok yang butuh bantuan), serta mengajukan pertanyaan penuntun.",
      "siswa": "Deskripsi kegiatan siswa: melakukan manipulasi benda konkret/eksperimen/analisis/perhitungan terkait ${topik}, berdiskusi aktif menemukan solusi, dan mencatat temuan pada LKPD."
    },
    {
      "name": "Langkah 4: Pengembangan & Penyajian Hasil Karya",
      "guru": "Deskripsi kegiatan guru: membimbing kelompok menyusun hasil kerja LKPD dan memfasilitasi jalannya presentasi kelas yang suportif.",
      "siswa": "Deskripsi kegiatan siswa: perwakilan kelompok mempresentasikan hasil diskusi di depan kelas, kelompok lain menyimak dengan aktif dan memberikan tanggapan/apresiasi."
    },
    {
      "name": "Langkah 5: Analisis & Evaluasi Proses Pemecahan Masalah",
      "guru": "Deskripsi kegiatan guru: memberikan klarifikasi, penguatan konsep penting terkait ${topik}, dan meluruskan miskonsepsi yang mungkin muncul.",
      "siswa": "Deskripsi kegiatan siswa: menyimpulkan konsep bersama guru, mengoreksi hasil kerja kelompok jika ada kekeliruan, dan mencatat poin-poin penting."
    }
  ],
  "kegiatanPenutup": [
    "Refleksi & Simpulan: Guru memandu siswa menyimpulkan poin-poin utama materi ${topik}. Siswa menyampaikan refleksi perasaannya (bagian mana yang paling disukai dan dipahami).",
    "Asesmen Formatif & Umpan Balik: Guru memberikan umpan balik apresiatif atas keaktifan siswa dan melakukan cek pemahaman kilat.",
    "Tindak Lanjut: Guru menyampaikan tindak lanjut (tugas pengayaan/remedial) dan menginformasikan topik yang akan dipelajari pada pertemuan berikutnya.",
    "Penutup & Doa: Kelas ditutup dengan doa bersama dipimpin oleh salah satu siswa dan salam penutup yang hangat."
  ],
  "lkpdTugas": "Konten Lembar Kerja Peserta Didik (LKPD) lengkap, terstruktur, ramah anak, dan kontekstual untuk ${topik}. Format: Judul LKPD, Petunjuk Belajar, Alat dan Bahan, Langkah Kerja Bernomor (Langkah 1: ..., Langkah 2: ...), Pertanyaan Diskusi, serta instruksi kotak gambar/tulis seperti [Kotak untuk Menggambar Solusi] atau [Tuliskan Jawaban Kelompok].",
  "soalEvaluasi": "5 soal evaluasi terstruktur (3 pilihan ganda dengan opsi A, B, C, D dan 2 soal uraian pemecahan masalah kontekstual). HANYA soal tanpa kunci jawaban.",
  "kunciJawaban": [
    "1. Kunci dan pembahasan soal 1",
    "2. Kunci dan pembahasan soal 2",
    "3. Kunci dan pembahasan soal 3",
    "4. Kunci dan rubrik jawaban uraian soal 4",
    "5. Kunci dan rubrik jawaban uraian soal 5"
  ],
  "capaianPembelajaran": "2-3 paragraf Capaian Pembelajaran (CP) Kurikulum Merdeka yang relevan dan spesifik untuk materi ${topik} di Fase ${fase}.",
  "kompetensiAwal": "2-3 butir kompetensi prasyarat yang harus dikuasai siswa sebelum mempelajari ${topik}.",
  "pengayaan": [
    "Aktivitas pengayaan 1 (tantangan level lebih tinggi untuk siswa yang telah tuntas)",
    "Aktivitas pengayaan 2..."
  ],
  "remedial": [
    "Aktivitas remedial 1 (pendampingan konsep dasar dengan alat peraga konkret untuk siswa yang butuh bimbingan)",
    "Aktivitas remedial 2..."
  ],
  "daftarPustaka": [
    "Buku Panduan Guru & Siswa ${mapel} Kelas Terkait, Kemendikbudristek",
    "Sumber referensi pendukung lainnya"
  ]
}

PEDOMAN KUALITAS KONTEN:
1. SEMUA kegiatan pembelajaran dan LKPD HARUS sangat spesifik untuk topik "${topik}". DILARANG membuat langkah generik seperti "Guru menjelaskan materi" atau "Siswa mendengarkan penjelasan".
2. INTEGRASI MODEL & METODE: Skenario Kegiatan Inti WAJIB secara eksplisit mengintegrasikan sintaks model pembelajaran (${modelPembelajaran || 'Model Terpilih'}) dan metode pembelajaran (${metodePembelajaran?.join(', ') || 'Metode Terpilih'}) ke dalam tindakan konkret guru dan siswa.
3. Tuliskan dialog guru, pertanyaan pemandu, media nyata, dan tindakan aktif siswa secara gamblang.
4. Sesuaikan tingkat kesulitan dan bahasa dengan ${faseInfo}.`;
}

export interface CacheToDatabaseResult {
  ok: boolean;
  saved?: boolean;
  skippedVerified?: boolean;
  error?: string;
}

export async function generateModulAjarAiContent(
  mapel: string,
  topik: string,
  fase: string,
  modelPembelajaran?: string,
  metodePembelajaran?: string[],
  onCacheError?: (message: string) => void
): Promise<AiModulAjarContent> {
  const prompt = buildPrompt(mapel, topik, fase, modelPembelajaran, metodePembelajaran);

  logger.info(`[AI Modul Ajar] Generating: ${mapel} / ${topik} / Fase ${fase}`, 'ModulAjarAI');

  const result = await generateGeminiJson<AiModulAjarContent>(prompt, SYSTEM_INSTRUCTION, 'modul-ajar');

  if (!result.tujuanPembelajaran || !Array.isArray(result.tujuanPembelajaran) || result.tujuanPembelajaran.length === 0) {
    throw new Error('AI menghasilkan konten tidak lengkap (tujuan pembelajaran kosong).');
  }

  const normalized: AiModulAjarContent = {
    tujuanPembelajaran: result.tujuanPembelajaran || [],
    pemahamanBermakna: result.pemahamanBermakna || [],
    pertanyaanPemantik: result.pertanyaanPemantik || [],
    kegiatanPendahuluan: result.kegiatanPendahuluan || [],
    skenarioPembelajaran: (result.skenarioPembelajaran && Array.isArray(result.skenarioPembelajaran) && result.skenarioPembelajaran.length > 0)
      ? result.skenarioPembelajaran.map((s: any) => ({
          name: s.name || s.fase || s.nama_langkah || 'Langkah Aktivitas',
          fase: s.name || s.fase || s.nama_langkah || 'Langkah Aktivitas',
          guru: s.guru || s.kegiatanGuru || s.kegiatan_guru || '',
          siswa: s.siswa || s.kegiatanSiswa || s.kegiatan_siswa || '',
          alokasiWaktu: s.alokasiWaktu || s.estimasi_menit || '',
        }))
      : [],
    kegiatanPenutup: result.kegiatanPenutup || [],
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
  };

  // Simpan draf ke Bank Bersama — non-blocking, tapi error dilaporkan ke UI
  // agar guru tahu draf-nya gagal masuk antrian review admin (bukan diam-diam).
  cacheToDatabase(mapel, topik, fase, normalized)
    .then((res) => {
      if (!res.ok) {
        const msg = `Draf AI gagal tersimpan ke Bank Bersama: ${res.error}`;
        logger.error('[AI Modul Ajar] ' + msg, 'ModulAjarAI');
        onCacheError?.(msg);
      } else if (res.skippedVerified) {
        logger.info('[AI Modul Ajar] Konten sudah verified di bank — draf dilewati.', 'ModulAjarAI');
      }
    })
    .catch((err) => {
      logger.error('[AI Modul Ajar] Cache failed:', 'ModulAjarAI', err);
      onCacheError?.('Draf AI gagal tersimpan ke Bank Bersama (kesalahan tidak terduga).');
    });

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
): Promise<CacheToDatabaseResult> {
  const normMapel = mapel.toLowerCase().trim();
  const normTopik = topik.toLowerCase().trim();

  // SELECT dicek error-nya — kalau gagal (RLS/network), berhenti dengan pesan jelas,
  // bukan lanjut diam-diam ke INSERT yang akan gagal juga.
  const { data: existing, error: selectError } = await supabase
    .from('ref_boilerplate_topik')
    .select('id, content_status')
    .eq('mata_pelajaran', normMapel)
    .eq('topik', normTopik)
    .eq('fase', fase)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: `gagal memeriksa bank konten: ${selectError.message}` };
  }

  const payload = {
    tujuan_pembelajaran: content.tujuanPembelajaran,
    pemahaman_bermakna: content.pemahamanBermakna,
    pertanyaan_pemantik: content.pertanyaanPemantik,
    lkpd_tugas: content.lkpdTugas,
    soal_evaluasi: content.soalEvaluasi,
    pengayaan: content.pengayaan,
    remedial: content.remedial,
    daftar_pustaka: content.daftarPustaka,
    // Hasil AI guru disimpan sebagai DRAFT yang menunggu review admin.
    // Jangan auto-verified agar konten yang belum ditinjau tidak menjadi
    // cache hit publik untuk guru lain (sesuai alur Bank Bersama).
    is_verified: false,
    content_status: 'draft_ai',
    generated_by_provider: 'gemini',
    konten_json: content as any,
  };

  if (existing) {
    // Jangan pernah menurunkan konten yang sudah verified menjadi draft.
    if (existing.content_status === 'verified') {
      return { ok: true, saved: false, skippedVerified: true };
    }
    const { error } = await supabase.from('ref_boilerplate_topik').update(payload).eq('id', existing.id);
    if (error) {
      return { ok: false, error: `gagal memperbarui draf: ${error.message}` };
    }
    return { ok: true, saved: true };
  }

  const insertPayload = {
    mata_pelajaran: normMapel,
    topik: normTopik,
    fase: fase,
    ...payload,
  };

  const { error: insertError } = await supabase.from('ref_boilerplate_topik').insert(insertPayload);
  if (insertError) {
    // 23505 = unique violation: dua guru generate topik yang sama bersamaan.
    // Alihkan ke UPDATE pada baris yang menang agar tidak gagal diam-diam.
    if (insertError.code === '23505') {
      const { data: raced, error: racedError } = await supabase
        .from('ref_boilerplate_topik')
        .select('id, content_status')
        .eq('mata_pelajaran', normMapel)
        .eq('topik', normTopik)
        .eq('fase', fase)
        .maybeSingle();
      if (!racedError && raced) {
        // Baris yang menang sudah verified (admin publish bersamaan) → draf
        // tidak perlu disimpan, jangan tampilkan warning palsu ke guru.
        if (raced.content_status === 'verified') {
          return { ok: true, saved: false, skippedVerified: true };
        }
        const { error: retryError } = await supabase.from('ref_boilerplate_topik').update(payload).eq('id', raced.id);
        if (!retryError) return { ok: true, saved: true };
      }
    }
    return { ok: false, error: `gagal menambah draf: ${insertError.message}` };
  }

  return { ok: true, saved: true };
}
