import { supabase } from './supabase';

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

export const modulAjarContentService = {
  // 1a. Get Topik Recommendations
  async getTopikRecommendations(mapel: string): Promise<string[]> {
    const normMapel = mapel.toLowerCase().trim();
    if (!normMapel) return [];
    
    const { data, error } = await supabase
      .from('ref_boilerplate_topik')
      .select('topik')
      .eq('mata_pelajaran', normMapel)
      .eq('is_verified', true);
      
    if (error || !data) return [];
    return Array.from(new Set(data.map(d => d.topik)));
  },

  // 1b. Get Boilerplate Topik (Exact match first, then partial)
  async getBoilerplate(mapel: string, topik: string, fase?: string): Promise<RefBoilerplateTopik | null> {
    const normMapel = mapel.toLowerCase().trim();
    const normTopik = topik.toLowerCase().trim();

    let query = supabase.from('ref_boilerplate_topik').select('*').eq('mata_pelajaran', normMapel).eq('topik', normTopik);
    if (fase) query = query.eq('fase', fase);

    const { data: exactMatch } = await query.maybeSingle();
    if (exactMatch) return exactMatch as RefBoilerplateTopik;

    // Fallback ilike
    let fallbackQuery = supabase.from('ref_boilerplate_topik').select('*').ilike('mata_pelajaran', `%${normMapel}%`).ilike('topik', `%${normTopik}%`);
    if (fase) fallbackQuery = fallbackQuery.eq('fase', fase);

    const { data: partialMatch } = await fallbackQuery.limit(1).maybeSingle();
    return (partialMatch as RefBoilerplateTopik) || null;
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
