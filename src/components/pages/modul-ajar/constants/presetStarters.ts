import { FormState } from '../types';

export interface PresetStarter {
  id: string;
  title: string;
  data: Partial<FormState>;
}

export const PRESET_STARTERS: PresetStarter[] = [
  {
    id: 'matematika',
    title: '🔢 Matematika (Kls 1)',
    data: {
      mataPelajaran: 'Matematika',
      topik: 'Penjumlahan Bilangan Cacah sampai 20',
      jenjang: 'SD',
      kelas: '1',
      fase: 'A',
      documentType: 'Modul Ajar',
      curriculumApproach: 'Merdeka',
      modelPembelajaran: 'Problem Based Learning',
      capaianPembelajaran: 'Peserta didik dapat melakukan operasi penjumlahan bilangan cacah sampai 20 menggunakan benda konkret, gambar, dan simbol matematika.',
      profilPelajar: ['Bernalar Kritis', 'Gotong Royong', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menghitung penjumlahan 1-20 menggunakan benda konkret.\n2. Peserta didik dapat menyelesaikan soal cerita sederhana terkait penjumlahan.',
      manualPertanyaanPemantik: 'Jika kamu memiliki 4 buah pensil, lalu temanmu meminjamkan 3 pensil lagi, berapa total pensilmu sekarang?',
      manualLkpdTugas: '### Aktivitas 1: Berhitung Bersama Sahabat\n* Petunjuk:\n1. Hitung jumlah gambar bersama kelompokmu.\n2. Tuliskan angka pada kotak yang tersedia.\n\n[Kotak untuk Menuliskan Penjumlahan Gambar dan Jawaban]',
      manualSoalEvaluasi: '1. 8 + 5 = ...\nA. 12\nB. 13\nC. 14\nD. 15\n\n2. Budi memiliki 6 permen dan diberi 4 permen oleh kakak. Berapa jumlah permen Budi sekarang?'
    }
  },
  {
    id: 'bahasa-indonesia',
    title: '📖 B. Indonesia (Kls 4)',
    data: {
      mataPelajaran: 'Bahasa Indonesia',
      topik: 'Menemukan Ide Pokok dalam Teks Narasi',
      jenjang: 'SD',
      kelas: '4',
      fase: 'B',
      documentType: 'Modul Ajar',
      curriculumApproach: 'Merdeka',
      modelPembelajaran: 'Inquiry Learning',
      capaianPembelajaran: 'Peserta didik mampu memahami dan menganalisis ide pokok serta informasi penting dari teks narasi dan eksposisi.',
      profilPelajar: ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat mengidentifikasi ide pokok pada setiap paragraf teks narasi.\n2. Peserta didik dapat menceritakan kembali isi teks dengan kata-kata sendiri.',
      manualPertanyaanPemantik: 'Bagaimana cara kita mengetahui pesan utama yang ingin disampaikan oleh penulis dalam sebuah cerita?',
      manualLkpdTugas: '### Aktivitas: Detektif Ide Pokok\n* Petunjuk:\n1. Bacalah teks cerita pendek bersama teman sebangku.\n2. Tuliskan gagasan utama pada kolom di bawah.\n\n[Kotak untuk Menuliskan Ide Pokok Paragraf 1 dan Paragraf 2]',
      manualSoalEvaluasi: '1. Ide pokok paragraf biasanya terletak pada kalimat...\nA. Penjelas\nB. Utama\nC. Tanya\nD. Terakhir saja\n\n2. Tuliskan satu paragraf narasi singkat mengenai pengalamanmu belajar di sekolah!'
    }
  },
  {
    id: 'ipas',
    title: '🌿 IPAS (Kls 4)',
    data: {
      mataPelajaran: 'IPAS',
      topik: 'Proses Fotosintesis pada Tumbuhan Hijau',
      jenjang: 'SD',
      kelas: '4',
      fase: 'B',
      documentType: 'Modul Ajar',
      curriculumApproach: 'Merdeka',
      modelPembelajaran: 'Discovery Learning',
      capaianPembelajaran: 'Peserta didik mendeskripsikan proses fotosintesis dan mengaitkan pentingnya proses ini bagi makhluk hidup di bumi.',
      profilPelajar: ['Bernalar Kritis', 'Gotong Royong'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menjelaskan 4 kebutuhan utama fotosintesis (cahaya, klorofil, air, CO2).\n2. Peserta didik dapat menyimpulkan zat yang dihasilkan dari fotosintesis.',
      manualPertanyaanPemantik: 'Mengapa tumbuhan tetap bisa hidup dan berkembang padahal tidak memakan makanan seperti manusia?',
      manualLkpdTugas: '### Aktivitas: Eksperimen Dapur Tumbuhan Hijau\n* Petunjuk:\n1. Amati daun yang terkena sinar matahari di dalam air.\n2. Catat gelembung udara yang dihasilkan.\n\n[Kotak untuk Menggambar Gelembung Oksigen dan Menuliskan Kesimpulan]',
      manualSoalEvaluasi: '1. Gas yang dibutuhkan tumbuhan untuk melakukan fotosintesis adalah...\nA. Oksigen\nB. Karbon Dioksida\nC. Nitrogen\nD. Gas Mulia\n\n2. Jelaskan mengapa proses fotosintesis sangat penting bagi pernapasan makhluk hidup!'
    }
  },
  {
    id: 'kbc',
    title: '❤️ KBC Cinta (Kls 1)',
    data: {
      mataPelajaran: 'Pendidikan Agama Islam',
      topik: 'Meneladani Kasih Sayang Asmaul Husna Ar-Rahman',
      jenjang: 'SD/MI',
      kelas: '1',
      fase: 'A',
      documentType: 'Modul Ajar',
      curriculumApproach: 'Berbasis Cinta',
      isKbcIntegrated: true,
      temaKbc: ['cinta-sesama', 'cinta-allah'],
      materiInsersi: 'Meneladani Asmaul Husna Ar-Rahman dalam menyayangi teman dan keluarga',
      modelPembelajaran: 'MMJ (Membaca, Meniru, Menjiwai)',
      capaianPembelajaran: 'Peserta didik mengenal Asmaul Husna Ar-Rahman dan Ar-Rahim serta membiasakan sikap kasih sayang kepada keluarga, teman, dan lingkungan sekitar.',
      profilPelajar: ['Beriman & Bertakwa', 'Bergotong Royong', 'Mandiri'],
      manualTujuanPembelajaran: '1. Peserta didik dapat menyebutkan arti Ar-Rahman dan Ar-Rahim dengan benar.\n2. Peserta didik mampu mempraktikkan perilaku kasih sayang kepada teman dan sesama makhluk.',
      manualPertanyaanPemantik: 'Bagaimana cara kita menunjukkan rasa sayang kepada ibu, ayah, dan teman-teman kita setiap hari?',
      manualLkpdTugas: '### Aktivitas: Pohon Kebaikan dan Kasih Sayang\n* Petunjuk:\n1. Tuliskan perbuatan baik yang telah kamu lakukan hari ini.\n2. Warnai gambar hati dengan rapi.\n\n[Kotak untuk Menuliskan Perbuatan Kasih Sayang dan Menggambar]',
      manualSoalEvaluasi: '1. Ar-Rahman artinya Allah Maha...\nA. Pengasih\nB. Perkasa\nC. Mengetahui\nD. Melihat\n\n2. Sebutkan 2 contoh sikap kasih sayang kepada teman di sekolah!'
    }
  }
];
