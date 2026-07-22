import { describe, it, expect, vi } from 'vitest';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';
import { buildHtmlTemplate } from '../utils/template';

vi.mock('../../../../services/supabase', () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'ref_boilerplate_topik') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  or: () => Promise.resolve({
                    data: [{
                      id: '1',
                      mata_pelajaran: 'matematika',
                      topik: 'penjumlahan',
                      fase: 'A',
                      tujuan_pembelajaran: ['Peserta didik dapat memahami konsep penjumlahan.'],
                      pemahaman_bermakna: ['Kemampuan penjumlahan membantu menghitung sisa barang.'],
                      pertanyaan_pemantik: ['Bagaimana cara menjumlahkan angka?'],
                      lkpd_tugas: 'Kerjakan soal 1-5',
                      soal_evaluasi: 'Hitunglah 5 + 3',
                      pengayaan: ['Soal tantangan'],
                      remedial: ['Latihan dasar'],
                      daftar_pustaka: ['Buku Matematika SD']
                    }],
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'ref_sintaks_kegiatan') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: [
                    { id: 's1', model_id: 'pbl-uuid', urutan: 1, nama_langkah: 'Langkah 1: Orientasi Masalah', kegiatan_guru: 'Guru menyajikan masalah {topik}.', kegiatan_siswa: 'Siswa mengamati dan mengidentifikasi masalah {topik}.', estimasi_menit_persen: 20 },
                    { id: 's2', model_id: 'pbl-uuid', urutan: 2, nama_langkah: 'Langkah 2: Mengorganisasi Belajar', kegiatan_guru: 'Guru memfasilitasi kelompok.', kegiatan_siswa: 'Siswa membentuk kelompok diskusi.', estimasi_menit_persen: 20 },
                    { id: 's3', model_id: 'pbl-uuid', urutan: 3, nama_langkah: 'Langkah 3: Membimbing Penyelidikan', kegiatan_guru: 'Guru membimbing analisis.', kegiatan_siswa: 'Siswa mengumpulkan data {topik}.', estimasi_menit_persen: 25 },
                    { id: 's4', model_id: 'pbl-uuid', urutan: 4, nama_langkah: 'Langkah 4: Mengembangkan Karya', kegiatan_guru: 'Guru memfasilitasi karya.', kegiatan_siswa: 'Siswa mempresentasikan hasil.', estimasi_menit_persen: 20 },
                    { id: 's5', model_id: 'pbl-uuid', urutan: 5, nama_langkah: 'Langkah 5: Evaluasi Proses', kegiatan_guru: 'Guru membimbing refleksi.', kegiatan_siswa: 'Siswa melakukan refleksi.', estimasi_menit_persen: 15 }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
    }
  };
});

describe('E2E Happy Path: Matematika - Penjumlahan - Fase A - PBL', () => {
  it('generates a complete document from DB without generic fallback or grammatical flaws', async () => {
    // 1. Fetch Boilerplate
    const bp = await modulAjarContentService.getBoilerplate('Matematika', 'Penjumlahan', 'A');
    expect(bp).not.toBeNull();
    expect(bp?.tujuan_pembelajaran).toContain('Peserta didik dapat memahami konsep penjumlahan.');

    // 2. Fetch Sintaks
    const sintaks = await modulAjarContentService.getSintaksKegiatan('pbl-uuid', {
      topik: 'Penjumlahan',
      mapel: 'Matematika',
      kelas: '1'
    });
    expect(sintaks.length).toBe(5);

    // Verify no grammatical flaws like "Siswa siswa" or "Siswa guru"
    sintaks.forEach(step => {
      expect(step.kegiatan_siswa).not.toMatch(/siswa\s+siswa/i);
      expect(step.kegiatan_siswa).not.toMatch(/siswa\s+guru/i);
      expect(step.kegiatan_guru).not.toMatch(/^siswa\s+/i);
    });

    // 3. Build HTML Template
    const sintaksIntiHtml = sintaks.map(s => `<b>${s.nama_langkah} (${s.estimasi_menit_persen}%)</b><br/>- <b>Guru:</b> ${s.kegiatan_guru}<br/>- <b>Siswa:</b> ${s.kegiatan_siswa}`).join('<br/><br/>');

    const formState: any = {
      documentType: 'Modul Ajar',
      curriculumApproach: 'Merdeka',
      satuanPendidikan: 'MI Al Irsyad',
      jenjang: 'SD/MI',
      kelas: '1',
      fase: 'A',
      mataPelajaran: 'Matematika',
      topik: 'Penjumlahan',
      tahunAjaran: '2023/2024',
      semester: 'Ganjil',
      guru: 'Bagas Riyadi',
      targetPeserta: 'Reguler',
      capaianPembelajaran: 'Peserta didik dapat menjumlahkan bilangan.',
      profilPelajar: ['Bernalar Kritis', 'Bergotong Royong'],
      jumlahPertemuan: 1,
      jpPerPertemuan: 2,
      durasiPerJp: 35,
      modelPembelajaran: 'Problem-Based Learning (PBL)',
      metodePembelajaran: ['Diskusi', 'Demonstrasi'],
      alokasiPendahuluan: 10,
      alokasiInti: 50,
      alokasiPenutup: 10,
    };

    const manualData = {
      ...bp,
      tujuanPembelajaran: bp?.tujuan_pembelajaran || [],
      pemahamanBermakna: bp?.pemahaman_bermakna || [],
      pertanyaanPemantik: bp?.pertanyaan_pemantik || [],
      lkpdTugas: bp?.lkpd_tugas || '',
      soalEvaluasi: bp?.soal_evaluasi || '',
      kegiatanPendahuluan: 'Guru membuka kelas dengan salam.',
      kegiatanInti: sintaksIntiHtml,
      kegiatanPenutup: 'Guru menutup dengan doa.',
      asesmenSikap: 'Observasi sikap',
      asesmenKeterampilan: 'Unjuk kerja',
      asesmenPengetahuan: 'Tes tertulis',
      pengayaan: bp?.pengayaan || [],
      remedial: bp?.remedial || [],
      daftarPustaka: bp?.daftar_pustaka || [],
    };

    const html = buildHtmlTemplate(formState, manualData, 70, '');

    expect(html).toContain('MODUL AJAR');
    expect(html).toContain('Matematika');
    expect(html).toContain('Penjumlahan');
    expect(html).toContain('Langkah 1: Orientasi Masalah');
    expect(html).toContain('Langkah 5: Evaluasi Proses');
    expect(html).not.toContain('Aktivitas inti sesuai model');
    expect(html).not.toContain('Siswa siswa');
  });
});
