import { describe, it, expect } from 'vitest';
import { buildHtmlTemplate, buildStudentHtmlTemplate } from '../../src/components/pages/modul-ajar/utils/template';
import { resolveLearningSyntax, LOCAL_MODEL_FALLBACKS, GENERIC_LEARNING_STEPS } from '../../src/components/pages/modul-ajar/utils/syntaxResolver';
import { FormState } from '../../src/components/pages/modul-ajar/types';

describe('Modul Ajar Layout & Scenario Enhancement Tests', () => {
  const baseFormState: FormState = {
    generationMethod: 'Manual',
    documentType: 'Modul Ajar',
    curriculumApproach: 'Merdeka',
    satuanPendidikan: 'SD Negeri Cerdas Cendikia',
    jenjang: 'SD',
    kelas: '1',
    fase: 'A',
    mataPelajaran: 'Matematika',
    topik: 'Penjumlahan Bilangan Cacah sampai 20',
    tahunAjaran: '2026/2027',
    semester: '1 (Ganjil)',
    guru: 'Bagas Riyadi, S.Pd.',
    targetPeserta: 'Peserta didik reguler (28 siswa)',
    kompetensiAwal: 'Peserta didik telah mengenal bilangan cacah 1-20 dan konsep membilang benda.',
    saranaPrasarana: 'Kartu angka, kelereng/balok, LKPD, proyektor.',
    capaianPembelajaran: 'Peserta didik dapat melakukan operasi penjumlahan bilangan cacah sampai 20 menggunakan benda konkret.',
    profilPelajar: ['Bernalar Kritis', 'Gotong Royong', 'Mandiri'],
    jumlahPertemuan: 2,
    jpPerPertemuan: 2,
    durasiPerJp: 35,
    modelPembelajaran: 'Problem Based Learning',
    metodePembelajaran: ['Eksplorasi', 'Diskusi Kelompok', 'Demonstrasi'],
    manualTujuanPembelajaran: '',
    manualPertanyaanPemantik: '',
    manualLkpdTugas: '',
    manualSoalEvaluasi: '',
    alokasiPendahuluan: 15,
    alokasiInti: 45,
    alokasiPenutup: 10,
    rubrikAsesmen: [
      {
        kriteria: 'Keterampilan Berhitung',
        sangatBaik: 'Mampu menjumlahkan dengan tepat tanpa bantuan alat peraga.',
        baik: 'Mampu menjumlahkan dengan bantuan minimal alat peraga.',
        cukup: 'Mampu menjumlahkan dengan bimbingan penuh.',
        perluBimbingan: 'Belum mampu menjumlahkan.'
      }
    ],
    isKbcIntegrated: false,
    temaKbc: [],
    materiInsersi: '',
  };

  const sampleData = {
    tujuanPembelajaran: [
      'Peserta didik mampu menjumlahkan dua bilangan cacah sampai 20 dengan alat peraga.',
      'Peserta didik dapat menyelesaikan soal cerita sederhana terkait penjumlahan.'
    ],
    pemahamanBermakna: [
      'Penjumlahan membantu kita menghitung total barang belanjaan dan benda di sekitar kita.'
    ],
    pertanyaanPemantik: [
      'Jika kamu memiliki 3 apel lalu ibu memberi 2 apel lagi, berapa total apelmu?'
    ],
    kegiatanPendahuluan: [
      'Orientasi: Guru membuka kelas dengan salam dan doa bersama dipimpin oleh ketua kelas.',
      'Apersepsi: Guru menunjukkan 3 pensil di tangan kanan dan 2 pensil di tangan kiri.',
      'Motivasi: Guru menyampaikan tujuan belajar menjumlahkan benda.',
      'Pemberian Acuan: Guru mengajukan pertanyaan pemantik.'
    ],
    kegiatanInti: [
      {
        name: 'Langkah 1: Orientasi Siswa pada Masalah',
        kegiatanGuru: 'Guru menampilkan cerita bergambar 4 kupu-kupu di taman dan datang lagi 2 kupu-kupu.',
        kegiatanSiswa: 'Siswa mengamati gambar dan menghitung jumlah kupu-kupu bersama kelompok.'
      },
      {
        name: 'Langkah 2: Organisasi Belajar',
        kegiatanGuru: 'Guru membagikan LKPD dan kelereng untuk setiap kelompok.',
        kegiatanSiswa: 'Siswa duduk bersama kelompok dan menyiapkan kelereng serta alat tulis.'
      }
    ],
    kegiatanPenutup: [
      'Refleksi: Guru bersama siswa merangkum cara menjumlahkan dengan benda konkret.',
      'Asesmen: Siswa mengerjakan 2 soal kuis kilat.',
      'Doa: Kelas ditutup dengan doa bersama.'
    ],
    lkpdTugas: `### LKPD: Petualangan Menghitung Kupu-kupu!
**Petunjuk Belajar:**
1. Bacalah cerita bersama kelompokmu.
2. Gunakan kelereng sebagai alat bantu.

**Alat dan Bahan:**
* 10 Butir kelereng
* Pensil warna

**Aktivitas 1: Eksplorasi Cerita**
Di taman ada 4 kupu-kupu. Datang lagi 2 kupu-kupu.
Berapa jumlah kupu-kupu sekarang?

[Kotak untuk Menggambar Kupu-kupu dan Menuliskan Hasil]`,
    soalEvaluasi: `1. 4 + 3 = ...
A. 6
B. 7
C. 8
D. 9

2. Rina memiliki 5 pensil. Ayah membelikan 4 pensil lagi. Berapa jumlah pensil Rina sekarang?`,
    kunciJawaban: [
      '1. B (7)',
      '2. 5 + 4 = 9 pensil'
    ],
    pengayaan: ['Tantangan penjumlahan 3 bilangan berturut-turut.'],
    remedial: ['Bimbingan menjumlahkan menggunakan jari dan kelereng.'],
    daftarPustaka: ['Buku Siswa Matematika Kelas 1, Kemendikbudristek.']
  };

  it('renders rich structured HTML without giant outer table and without sequential numbering bug (1..58) in LKPD', () => {
    const html = buildHtmlTemplate(baseFormState, sampleData, 4, '');

    // 1. Check title & headers
    expect(html).toContain('PERANGKAT PEMBELAJARAN');
    expect(html).toContain('KURIKULUM MERDEKA');
    expect(html).toContain('Penjumlahan Bilangan Cacah sampai 20');

    // 2. Check Skenario Kegiatan Pembelajaran
    expect(html).toContain('1. Kegiatan Pendahuluan (15 Menit)');
    expect(html).toContain('Orientasi:');
    expect(html).toContain('2. Kegiatan Inti (45 Menit)');
    expect(html).toContain('Langkah 1: Orientasi Siswa pada Masalah');
    expect(html).toContain('Kegiatan Guru:');
    expect(html).toContain('Kegiatan Peserta Didik:');
    expect(html).toContain('3. Kegiatan Penutup (10 Menit)');

    // 3. Check LKPD Smart Markdown parsing
    expect(html).toContain('LKPD: Petualangan Menghitung Kupu-kupu!');
    expect(html).toContain('Kotak untuk Menggambar Kupu-kupu dan Menuliskan Hasil');
    expect(html).toContain('10 Butir kelereng');

    // Crucial check: LKPD does NOT turn into global sequential numbering 1..58
    expect(html).not.toMatch(/<ol[^>]*>[\s\S]*?<li>LKPD:/i);
    expect(html).not.toMatch(/<li>Alat dan Bahan:<\/li>/i);

    // 4. Check Evaluasi Knowledge Sheet
    expect(html).toContain('LEMBAR EVALUASI PENGETAHUAN');
    expect(html).toContain('4 + 3 = ...');
    expect(html).toContain('B. 7');

    // 5. Check Teacher-only Answer Key
    expect(html).toContain('KUNCI JAWABAN & PEDOMAN PENSKORAN');
    expect(html).toContain('B (7)');

    // 6. Check Signature Block
    expect(html).toContain('Kepala SD Negeri Cerdas Cendikia');
    expect(html).toContain('Bagas Riyadi, S.Pd.');
  });

  it('renders student worksheet template cleanly without teacher answer key', () => {
    const studentHtml = buildStudentHtmlTemplate(baseFormState, sampleData, '');

    expect(studentHtml).toContain('LEMBAR AKTIVITAS & EVALUASI SISWA');
    expect(studentHtml).toContain('LEMBAR KERJA PESERTA DIDIK (LKPD)');
    expect(studentHtml).toContain('LEMBAR EVALUASI PENGETAHUAN');
    // Student document must NOT leak teacher answer key
    expect(studentHtml).not.toContain('KUNCI JAWABAN & PEDOMAN PENSKORAN');
  });

  it('provides rich, detailed fallback steps for learning models in syntaxResolver with topic and method integration', () => {
    const pblResult = resolveLearningSyntax(
      [],
      [],
      'Problem Based Learning',
      ['Eksperimen', 'Diskusi'],
      'Penjumlahan Bilangan Cacah',
      'Matematika'
    );
    expect(pblResult.steps.length).toBe(5);
    expect(pblResult.steps[0].name).toContain('Orientasi');
    expect(pblResult.steps[0].teacherActivity).toContain('Penjumlahan Bilangan Cacah');
    expect(pblResult.steps[1].studentActivity).toContain('Penjumlahan Bilangan Cacah');
    // Check method integration
    const allActivities = pblResult.steps.map(s => s.teacherActivity + ' ' + s.studentActivity).join(' ');
    expect(allActivities).toContain('eksperimen');
    expect(allActivities).toContain('berdiskusi');

    const pjblResult = resolveLearningSyntax([], [], 'Project Based Learning', ['Proyek'], 'Gaya dan Gerak', 'IPAS');
    expect(pjblResult.steps.length).toBe(6);
    expect(pjblResult.steps[0].name).toContain('Pertanyaan Mendasar');
    expect(pjblResult.steps[0].teacherActivity).toContain('Gaya dan Gerak');

    const genericResult = resolveLearningSyntax([], [], 'Model Lainnya');
    expect(genericResult.steps.length).toBe(4);
    expect(genericResult.steps[0].name).toContain('Orientasi & Eksplorasi');
  });

  it('renders Rencana Pembelajaran Berdiferensiasi and Rubrik Penilaian in HTML template', () => {
    const html = buildHtmlTemplate(baseFormState, sampleData, 4, '');

    // Check Differentiated Learning Section
    expect(html).toContain('G. RENCANA PEMBELAJARAN BERDIFERENSIASI');
    expect(html).toContain('1. Diferensiasi Konten:');
    expect(html).toContain('2. Diferensiasi Proses:');
    expect(html).toContain('3. Diferensiasi Produk:');

    // Check Assessment Rubric Table
    expect(html).toContain('4. Rubrik Penilaian Aktivitas Pembelajaran:');
    expect(html).toContain('Keterampilan Berhitung');
    expect(html).toContain('Sangat Baik (4)');
    expect(html).toContain('Perlu Bimbingan (1)');
  });

  it('supports paperSize configuration and dynamic time calculation in template output', () => {
    const f4FormState: FormState = {
      ...baseFormState,
      paperSize: 'F4',
      jpPerPertemuan: 3,
      durasiPerJp: 40,
      alokasiPendahuluan: 20,
      alokasiInti: 80,
      alokasiPenutup: 20,
    };

    const html = buildHtmlTemplate(f4FormState, sampleData, 6, '');
    expect(html).toContain('6 JP (2 Pertemuan x 3 JP x 40 menit)');
    expect(html).toContain('1. Kegiatan Pendahuluan (20 Menit)');
    expect(html).toContain('2. Kegiatan Inti (80 Menit)');
    expect(html).toContain('3. Kegiatan Penutup (20 Menit)');
  });

  it('calculates proportional time allocation accurately (15% - 70% - 15%)', () => {
    const calculateDistribution = (jp: number, durasi: number) => {
      const totalMinutes = jp * durasi;
      let pendahuluan = Math.max(5, Math.round((totalMinutes * 0.15) / 5) * 5);
      let penutup = Math.max(5, Math.round((totalMinutes * 0.15) / 5) * 5);
      let inti = totalMinutes - pendahuluan - penutup;
      return { pendahuluan, inti, penutup, total: totalMinutes, sum: pendahuluan + inti + penutup };
    };

    // 2 JP x 35m = 70m
    const res70 = calculateDistribution(2, 35);
    expect(res70.total).toBe(70);
    expect(res70.sum).toBe(70);
    expect(res70.pendahuluan).toBe(10);
    expect(res70.penutup).toBe(10);
    expect(res70.inti).toBe(50);

    // 3 JP x 40m = 120m
    const res120 = calculateDistribution(3, 40);
    expect(res120.total).toBe(120);
    expect(res120.sum).toBe(120);
    expect(res120.pendahuluan).toBe(20);
    expect(res120.penutup).toBe(20);
    expect(res120.inti).toBe(80);

    // 4 JP x 45m = 180m
    const res180 = calculateDistribution(4, 45);
    expect(res180.total).toBe(180);
    expect(res180.sum).toBe(180);
    expect(res180.pendahuluan).toBe(25);
    expect(res180.penutup).toBe(25);
    expect(res180.inti).toBe(130);
  });
});
