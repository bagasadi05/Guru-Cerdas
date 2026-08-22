import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fieldGen from '../../src/services/modulAjarAiFieldGenerator';
import * as geminiService from '../../src/services/geminiService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          }))
        }))
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}));

describe('Modul Ajar AI Field Generator Suite', () => {
  const baseCtx: fieldGen.FieldContext = {
    mapel: 'IPAS',
    topik: 'Fotosintesis Tumbuhan',
    fase: 'B',
    kelas: '4',
    modelPembelajaran: 'Problem Based Learning',
    alokasiWaktu: '2 JP × 35 menit',
    profilPelajarPancasila: ['Bernalar Kritis', 'Gotong Royong'],
    temaKbc: ['Cinta Lingkungan', 'Cinta Allah Swt.'],
    materiInsersi: 'Mengagumi kebesaran Allah melalui proses fotosintesis',
    isKbcIntegrated: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. generateTujuanPembelajaran returns multi-line TP string', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      tujuan: [
        '1. Peserta didik dapat mengidentifikasi kebutuhan fotosintesis.',
        '2. Peserta didik dapat menjelaskan proses fotosintesis dengan benar.'
      ]
    });

    const result = await fieldGen.generateTujuanPembelajaran(baseCtx);
    expect(result).toContain('1. Peserta didik dapat mengidentifikasi kebutuhan fotosintesis.');
    expect(result).toContain('2. Peserta didik dapat menjelaskan proses fotosintesis dengan benar.');
  });

  it('2. generatePemahamanBermakna returns formatted big ideas', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      pemahamanBermakna: [
        'Tumbuhan berperan sebagai produsen utama yang menghasilkan oksigen bagi seluruh makhluk hidup.',
        'Menjaga kelestarian tumbuhan adalah wujud syukur kepada Tuhan yang Maha Esa.'
      ]
    });

    const result = await fieldGen.generatePemahamanBermakna(baseCtx);
    expect(result).toContain('Tumbuhan berperan sebagai produsen utama');
    expect(result).toContain('Menjaga kelestarian tumbuhan');
  });

  it('3. generatePertanyaanPemantik returns curiosity questions', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      pertanyaan: [
        'Bagaimana cara tumbuhan makan padahal tidak memiliki mulut?',
        'Apa yang terjadi jika di bumi ini tidak ada tumbuhan hijau sama sekali?'
      ]
    });

    const result = await fieldGen.generatePertanyaanPemantik(baseCtx);
    expect(result).toContain('Bagaimana cara tumbuhan makan');
    expect(result).toContain('Apa yang terjadi jika di bumi ini');
  });

  it('4. generateMateriAjar returns structured student reading summary', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      materi: '### Konsep Fotosintesis\nFotosintesis adalah proses memasak makanan pada tumbuhan hijau dengan bantuan cahaya matahari.'
    });

    const result = await fieldGen.generateMateriAjar(baseCtx);
    expect(result).toContain('### Konsep Fotosintesis');
    expect(result).toContain('proses memasak makanan pada tumbuhan');
  });

  it('5. generateLkpdTugas returns complete structured LKPD', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      lkpd: '### LKPD: Menyelidiki Fotosintesis\n**Alat dan Bahan:** Daun, Air, Wadah kaca\n[Kotak untuk Menuliskan Jawaban]'
    });

    const result = await fieldGen.generateLkpdTugas(baseCtx);
    expect(result).toContain('### LKPD: Menyelidiki Fotosintesis');
    expect(result).toContain('[Kotak untuk Menuliskan Jawaban]');
  });

  it('6. generateSoalEvaluasi returns clean questions and extracts scoring guide', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      soal: '1. Gas yang dihasilkan dari proses fotosintesis adalah...\nA. Oksigen\nB. Karbon dioksida\nC. Nitrogen\nD. Helium\n\n4. Jelaskan peran klorofil pada fotosintesis!',
      kunci: ['1. A. Oksigen', '4. Klorofil menyerap cahaya matahari (Skor 50)']
    });

    const result = await fieldGen.generateSoalEvaluasi(baseCtx);
    expect(result).toContain('1. Gas yang dihasilkan');
    expect(result).toContain('4. Jelaskan peran klorofil');
  });

  it('7. generatePengayaan returns enrichment activities', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      pengayaan: [
        'Lakukan penyelidikan mandiri pengaruh intensitas cahaya matahari terhadap laju pembentukan gelembung oksigen pada tanaman air Hydrilla.',
        'Buatlah infografis sederhana mengenai siklus oksigen di alam.'
      ]
    });

    const result = await fieldGen.generatePengayaan(baseCtx);
    expect(result).toContain('tanaman air Hydrilla');
    expect(result).toContain('infografis sederhana');
  });

  it('8. generateRemedial returns scaffolding guidance for struggling learners', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      remedial: [
        'Bimbingan konsep dengan bantuan kartu bergambar faktor fotosintesis (Matahari, Air, CO2, Oksigen).',
        'Pendampingan tutor sebaya dalam menyelesaikan lembar isian sederhana.'
      ]
    });

    const result = await fieldGen.generateRemedial(baseCtx);
    expect(result).toContain('kartu bergambar');
    expect(result).toContain('tutor sebaya');
  });

  it('9. generateGlosarium returns entries with terms and definitions', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      glosarium: [
        'Fotosintesis: Proses pembuatan makanan oleh tumbuhan menggunakan energi cahaya.',
        'Klorofil: Zat hijau daun yang berfungsi menangkap sinar matahari.',
        'Stomata: Mulut daun tempat pertukaran udara.'
      ]
    });

    const result = await fieldGen.generateGlosarium(baseCtx);
    expect(result).toContain('Fotosintesis:');
    expect(result).toContain('Klorofil:');
    expect(result).toContain('Stomata:');
  });

  it('10. generateDaftarPustaka returns official reference bibliography', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      daftarPustaka: [
        'Kemendikbudristek. (2022). Buku Panduan Guru IPAS Kelas IV. Jakarta: Puskurbuk.',
        'Kemenag RI. (2025). Panduan Kurikulum Berbasis Cinta pada Madrasah Ibtidaiyah.'
      ]
    });

    const result = await fieldGen.generateDaftarPustaka(baseCtx);
    expect(result).toContain('Buku Panduan Guru IPAS Kelas IV');
    expect(result).toContain('Panduan Kurikulum Berbasis Cinta');
  });

  it('11. generateKompetensiAwal returns prerequisite knowledge', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      kompetensiAwal: 'Peserta didik telah mengenal bagian-bagian utama tumbuhan (akar, batang, daun, bunga).'
    });

    const result = await fieldGen.generateKompetensiAwal(baseCtx);
    expect(result).toContain('bagian-bagian utama tumbuhan');
  });

  it('12. generateCapaianPembelajaran returns topic-specific CP fallback', async () => {
    vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce({
      cp: 'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh tumbuhan dan proses fotosintesis.'
    });

    const result = await fieldGen.generateCapaianPembelajaran(baseCtx);
    expect(result).toContain('proses fotosintesis');
  });
});
