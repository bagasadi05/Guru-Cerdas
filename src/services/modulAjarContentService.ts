import { supabase } from './supabase';
import { normalizeSoalEvaluasi } from './modulAjarAiGenerator';

export interface RefBoilerplateTopik {
  id: string;
  mata_pelajaran: string;
  topik: string;
  fase: string | null;
  tujuan_pembelajaran: string[];
  pemahaman_bermakna: string[];
  pertanyaan_pemantik: string[];
  lkpd_tugas: string;
  soal_evaluasi: string;
  pengayaan: string[];
  remedial: string[];
  daftar_pustaka: string[];
  is_verified: boolean;
  sumber_regulasi: string | null;
  konten_json?: any;
}

export interface RefSintaksKegiatan {
  id: string;
  model_id: string;
  urutan: number;
  nama_langkah: string;
  kegiatan_guru: string;
  kegiatan_siswa: string;
  estimasi_menit_persen: number;
}

export interface RefRubrikTemplate {
  id: string;
  kategori: string;
  kriteria: string;
  sangat_baik: string;
  baik: string;
  cukup: string;
  perlu_bimbingan: string;
  urutan: number;
}

export interface RefTemaKbc {
  id: string;
  nama_tema: string;
  deskripsi: string;
  tujuan: string;
  urutan: number;
}

export interface RefMateriInsersi {
  id: string;
  tema_id: string;
  konten: string;
  konteks_penggunaan: string;
  frasa_tp: string;
}

export interface RefBankTpIktp {
  id: string;
  cp_id: string;
  tujuan_pembelajaran: string;
  iktp: string[];
  is_verified: boolean;
}

export interface RefModelPembelajaran {
  id: string;
  nama_model: string;
  sintaks_inti: string[];
  kategori: string;
  sumber: string;
  kelebihan: string[];
  kekurangan: string[];
  cocok_untuk: string[];
  ref_sintaks_kegiatan?: RefSintaksKegiatan[];
}

function unpackBoilerplate(item: any): RefBoilerplateTopik | null {
  if (!item) return null;
  const result = { ...item };
  if (item.konten_json && typeof item.konten_json === 'object') {
    const ai = item.konten_json;
    if (!result.tujuan_pembelajaran || (Array.isArray(result.tujuan_pembelajaran) && result.tujuan_pembelajaran.length === 0)) {
      result.tujuan_pembelajaran = ai.tujuanPembelajaran || [];
    }
    if (!result.pemahaman_bermakna || (Array.isArray(result.pemahaman_bermakna) && result.pemahaman_bermakna.length === 0)) {
      result.pemahaman_bermakna = ai.pemahamanBermakna || [];
    }
    if (!result.pertanyaan_pemantik || (Array.isArray(result.pertanyaan_pemantik) && result.pertanyaan_pemantik.length === 0)) {
      result.pertanyaan_pemantik = ai.pertanyaanPemantik || [];
    }
    if (!result.lkpd_tugas || result.lkpd_tugas.trim() === '') {
      result.lkpd_tugas = ai.lkpdTugas || '';
    }
    if (!result.soal_evaluasi || result.soal_evaluasi.trim() === '') {
      result.soal_evaluasi = normalizeSoalEvaluasi(ai.soalEvaluasi);
    }
    if (!result.pengayaan || (Array.isArray(result.pengayaan) && result.pengayaan.length === 0)) {
      result.pengayaan = ai.pengayaan || [];
    }
    if (!result.remedial || (Array.isArray(result.remedial) && result.remedial.length === 0)) {
      result.remedial = ai.remedial || [];
    }
    if (!result.daftar_pustaka || (Array.isArray(result.daftar_pustaka) && result.daftar_pustaka.length === 0)) {
      result.daftar_pustaka = ai.daftarPustaka || [];
    }
  }
  return result as RefBoilerplateTopik;
}

export const modulAjarContentService = {
  // 0. Get Learning Models from DB
  async getLearningModels(): Promise<RefModelPembelajaran[]> {
    const { data, error } = await supabase
      .from('ref_model_pembelajaran')
      .select('*, ref_sintaks_kegiatan(*)')
      .order('nama_model', { ascending: true });
      
    if (error || !data) return [];
    return data as unknown as RefModelPembelajaran[];
  },
  // 1a. Get Topik Recommendations
  async getTopikRecommendations(mapel: string): Promise<string[]> {
    const normMapel = mapel.toLowerCase().trim();
    if (!normMapel) return [];
    
    const { data, error } = await supabase
      .from('ref_boilerplate_topik')
      .select('topik')
      .ilike('mata_pelajaran', `%${normMapel}%`)
      .eq('is_verified', true);
      
    if (!error && data && data.length > 0) {
      return Array.from(new Set(data.map(d => d.topik)));
    }

    // Fallback topic recommendations if DB is unmigrated or loading
    const FALLBACK_RECOMMENDATIONS: Record<string, string[]> = {
      'matematika': ['penjumlahan', 'pengurangan', 'perkalian', 'pembagian', 'pecahan'],
      'bahasa indonesia': ['kosa kata baru', 'kalimat efektif', 'karangan narasi', 'puisi anak'],
      'ipas': ['fotosintesis', 'wujud zat', 'panca indra', 'ekosistem', 'gaya dan gerak'],
      'pendidikan pancasila': ['simbol pancasila', 'hak dan kewajiban', 'musyawarah', 'bhinneka tunggal ika'],
      'bahasa inggris': ['greetings', 'family and friends', 'numbers', 'daily activities'],
      'bahasa jawa': ['unggah ungguh basa', 'tembang dolanan', 'aksara jawa'],
      'akidah akhlak': ['asmaul husna', 'adab orang tua dan guru', 'akhlak terpuji'],
      'al-qur\'an hadis': ['surah pendek', 'hadis kebersihan', 'tajwid dasar'],
      'fikih': ['wudhu dan tayamum', 'shalat fardhu', 'puasa ramadhan'],
      'sejarah kebudayaan islam': ['kisah nabi muhammad saw', 'walisongo'],
      'bahasa arab': ['perkenalan', 'peralatan sekolah'],
      'tik': ['pengenalan komputer', 'etika berinternet']
    };

    for (const [key, topics] of Object.entries(FALLBACK_RECOMMENDATIONS)) {
      if (key.includes(normMapel) || normMapel.includes(key)) {
        return topics;
      }
    }
    return [];
  },

  // 1b. Get Boilerplate Topik (Exact match first, then partial)
  async getBoilerplate(mapel: string, topik: string, fase?: string): Promise<RefBoilerplateTopik | null> {
    const normMapel = mapel.toLowerCase().trim();
    const normTopik = topik.toLowerCase().trim();

    let query = supabase.from('ref_boilerplate_topik').select('*').eq('mata_pelajaran', normMapel).eq('topik', normTopik);
    if (fase) {
      query = query.or(`fase.eq.${fase},fase.is.null`);
    }

    const { data: exactMatches } = await query;
    if (exactMatches && exactMatches.length > 0) {
      const specificMatch = exactMatches.find((item: any) => item.fase === fase);
      return unpackBoilerplate(specificMatch || exactMatches[0]);
    }

    // Fallback ilike
    let fallbackQuery = supabase.from('ref_boilerplate_topik').select('*').ilike('mata_pelajaran', `%${normMapel}%`).ilike('topik', `%${normTopik}%`);
    if (fase) {
      fallbackQuery = fallbackQuery.or(`fase.eq.${fase},fase.is.null`);
    }

    const { data: partialMatches } = await fallbackQuery;
    if (partialMatches && partialMatches.length > 0) {
      const specificPartialMatch = partialMatches.find((item: any) => item.fase === fase);
      return unpackBoilerplate(specificPartialMatch || partialMatches[0]);
    }

    return null;
  },

  // 2. Get Sintaks Kegiatan with Interpolation
  async getSintaksKegiatan(modelId: string, placeholders: { topik: string; mapel: string; kelas: string }): Promise<RefSintaksKegiatan[]> {
    const { data, error } = await supabase.from('ref_sintaks_kegiatan').select('*').eq('model_id', modelId).order('urutan', { ascending: true });
    
    if (error || !data) return [];

    return data.map((item) => {
      let kegiatanGuru = item.kegiatan_guru;
      let kegiatanSiswa = item.kegiatan_siswa;
      
      // Interpolate {topik}, {mapel}, {kelas}
      for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`{${key}}`, 'gi');
        kegiatanGuru = kegiatanGuru.replace(regex, value);
        kegiatanSiswa = kegiatanSiswa.replace(regex, value);
      }
      return { ...item, kegiatan_guru: kegiatanGuru, kegiatan_siswa: kegiatanSiswa } as RefSintaksKegiatan;
    });
  },

  // 3. Get Rubrik Templates
  async getRubrikTemplates(kategori: string): Promise<RefRubrikTemplate[]> {
    const { data, error } = await supabase.from('ref_rubrik_template').select('*').eq('kategori', kategori).order('urutan', { ascending: true });
    if (error || !data) return [];
    return data as RefRubrikTemplate[];
  },

  // 4. Get Tema KBC
  async getTemaKbc(): Promise<RefTemaKbc[]> {
    const { data, error } = await supabase.from('ref_tema_kbc').select('*').order('urutan', { ascending: true });
    if (error || !data) return [];
    return data as RefTemaKbc[];
  },

  // 5. Get Materi Insersi by Tema
  async getMateriInsersi(temaId: string): Promise<RefMateriInsersi[]> {
    const { data, error } = await supabase.from('ref_materi_insersi').select('*').eq('tema_id', temaId);
    if (error || !data) return [];
    return data as RefMateriInsersi[];
  },

  // 6. Get Bank TP & IKTP
  async getBankTp(cpId: string): Promise<RefBankTpIktp[]> {
    const { data, error } = await supabase.from('ref_bank_tp_iktp').select('*').eq('cp_id', cpId);
    if (error || !data) return [];
    return data as RefBankTpIktp[];
  }
};
