import type { ModulAjarGeneration } from '../../src/services/modulAjarAiContract';
export const validLesson: ModulAjarGeneration = {
  modelPembelajaran: 'Discovery Learning', tujuanPembelajaran: ['Siswa menjelaskan siklus air.'],
  pemahamanBermakna: ['Air bergerak dalam suatu siklus.'], pertanyaanPemantik: ['Ke mana air hujan pergi?'],
  materiAjar: 'Air menguap karena panas, lalu mengembun dan turun sebagai hujan.', glosarium: ['Evaporasi: penguapan air.'],
  kompetensiAwal: 'Siswa mengenal air.', kegiatanPendahuluan: ['Amati air.'], kegiatanPenutup: ['Refleksikan siklus air.'],
  skenarioPembelajaran: ['Amati', 'Simpulkan'].map(name => ({ pertemuan: 1, name, guru: 'Tunjukkan contoh penguapan.', siswa: 'Jelaskan contoh.', durasiMenit: 10, tujuanIds: [1] })),
  lkpd: { judul: 'Siklus air', petunjuk: 'Baca materi.', alatBahan: ['Buku'], aktivitas: [{ instruksi: 'Jelaskan penguapan.', tujuanIds: [1], ruangJawaban: 'tulis' }] },
  evaluasi: Array.from({ length: 5 }, (_, i) => i < 3
    ? { nomor: i + 1, jenis: 'pilihan_ganda' as const, pertanyaan: 'Apa nama perubahan air menjadi uap?', pilihan: ['Penguapan', 'Pembekuan', 'Pencairan', 'Pengendapan'].map((teks, j) => ({ label: ['A', 'B', 'C', 'D'][j] as 'A' | 'B' | 'C' | 'D', teks })), jawaban: 'A' as const, pembahasan: 'Air berubah menjadi uap melalui penguapan.', tujuanIds: [1] }
    : { nomor: i + 1, jenis: 'uraian' as const, pertanyaan: 'Jelaskan penguapan.', jawaban: 'Air berubah menjadi uap.', pembahasan: 'Panas membantu penguapan.', rubrik: ['Konsep benar: 2 poin', 'Skor maksimum: 2'], tujuanIds: [1] }),
  pengayaan: ['Amati penguapan.'], remedial: ['Baca ulang contoh.'],
};
export const validReview = { selaras: true, materiBenar: true, sesuaiUsia: true, soal: Array.from({ length: 5 }, (_, i) => ({ nomor: i + 1, benar: true, alasan: 'Jawaban sesuai konsep.' })), masalah: [] };
export const lessonContext = { kelas: '3', capaianPembelajaran: 'CP sekolah', sintaks: ['Amati', 'Simpulkan'], jumlahPertemuan: 1, menitPerPertemuan: 30, alokasi: { pendahuluan: 5, inti: 20, penutup: 5 }, daftarPustaka: ['Sumber guru'] };
