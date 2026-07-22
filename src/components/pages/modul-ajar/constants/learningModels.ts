export type ModelCategory = 'hots' | 'retensi' | 'sosial' | 'kbc';

export interface ModelSyntaxStep {
  langkah: string;
  deskripsi: string;
}

export interface LearningModelItem {
  id: string;
  nama: string;
  sumber: string;
  kategori: ModelCategory;
  fokus: string; // e.g. "HOTS & Pemecahan Masalah", "Retensi Konsep", "Keterampilan Sosial"
  sintaks: ModelSyntaxStep[];
  kelebihan: string[];
  kekurangan: string[];
  cocokUntukJenjang?: string[];
}

export const LEARNING_MODELS: LearningModelItem[] = [
  // --- HAKIKAT & MASALAH (HOTS) ---
  {
    id: 'pbl',
    nama: 'Problem-Based Learning (PBL)',
    sumber: 'Arends (2012)',
    kategori: 'hots',
    fokus: 'HOTS & Pemecahan Masalah Autentik',
    sintaks: [
      { langkah: 'Langkah 1: Orientasi Siswa pada Masalah', deskripsi: 'Guru menyajikan masalah autentik & berperspektif ganda.' },
      { langkah: 'Langkah 2: Mengorganisasi Siswa untuk Belajar', deskripsi: 'Siswa membagi peran & merumuskan hipotesis.' },
      { langkah: 'Langkah 3: Membimbing Penyelidikan Mandiri/Kelompok', deskripsi: 'Siswa mengumpulkan data & fakta.' },
      { langkah: 'Langkah 4: Mengembangkan & Menyajikan Hasil Karya', deskripsi: 'Siswa menyusun laporan/solusi & mempresentasikannya.' },
      { langkah: 'Langkah 5: Menganalisis & Mengevaluasi Proses', deskripsi: 'Refleksi terhadap proses pemecahan masalah.' }
    ],
    kelebihan: [
      'Konsep tertanam lewat penemuan mandiri',
      'Motivasi belajar meningkat karena masalah dunia nyata',
      'Mengasah kemampuan berpikir kritis'
    ],
    kekurangan: [
      'Membutuhkan waktu persiapan lebih lama',
      'Bisa gagal jika masalah tidak autentik bagi siswa'
    ]
  },
  {
    id: 'case_method',
    nama: 'Case Method (Studi Kasus)',
    sumber: 'Harvard Case Method',
    kategori: 'hots',
    fokus: 'Analisis Situasi Nyata & Pengambilan Keputusan',
    sintaks: [
      { langkah: 'Langkah 1: Identifikasi Tujuan Pembelajaran', deskripsi: 'Penyampaian kasus & tujuan analisis.' },
      { langkah: 'Langkah 2: Pemilihan & Analisis Situasi Kasus', deskripsi: 'Membaca narasi kasus yang kompleks.' },
      { langkah: 'Langkah 3: Pengelompokan Diskusi', deskripsi: 'Diskusi kelompok kecil memetakan akar masalah.' },
      { langkah: 'Langkah 4: Rangkuman Solusi Alternatif', deskripsi: 'Merumuskan beberapa opsi tindakan.' },
      { langkah: 'Langkah 5: Presentasi & Debat Keputusan', deskripsi: 'Adu argumen antar-kelompok.' },
      { langkah: 'Langkah 6: Evaluasi & Penarikan Kesimpulan', deskripsi: 'Rangkuman akhir dan prinsip umum.' }
    ],
    kelebihan: [
      'Meningkatkan rasa percaya diri lewat analisis situasi nyata',
      'Mengasah argumentasi lisan & tertulis'
    ],
    kekurangan: [
      'Bisa menimbulkan frustrasi jika informasi kasus kurang lengkap'
    ]
  },
  {
    id: 'pjbl',
    nama: 'Project-Based Learning (PjBL Standar)',
    sumber: 'Lucas (2005)',
    kategori: 'hots',
    fokus: 'Pembuatan Produk Autentik & Proyek Berdurasi',
    sintaks: [
      { langkah: 'Langkah 1: Pertanyaan Mendasar', deskripsi: 'Menentukan topik utama lewat esensi masalah.' },
      { langkah: 'Langkah 2: Desain Perencanaan Proyek', deskripsi: 'Merancang langkah pembuatan & aturan main.' },
      { langkah: 'Langkah 3: Menyusun Jadwal Pembuatan', deskripsi: 'Membuat timeline & deadline tahapan.' },
      { langkah: 'Langkah 4: Monitoring Proyek & Kemajuan', deskripsi: 'Guru mendampingi & memantau progress.' },
      { langkah: 'Langkah 5: Menguji Hasil & Penilaian', deskripsi: 'Pengujian produk/karya di depan umum.' },
      { langkah: 'Langkah 6: Evaluasi Pengalaman Belajar', deskripsi: 'Refleksi kendala & pencapaian proyek.' }
    ],
    kelebihan: [
      'Menghasilkan produk nyata yang bermanfaat',
      'Melatih manajemen waktu dan kerja kolaboratif'
    ],
    kekurangan: [
      'Memerlukan alokasi waktu dan biaya sarana'
    ]
  },

  // --- RETENSI & PENEMUAN ---
  {
    id: 'discovery',
    nama: 'Discovery Learning (5/6 Langkah)',
    sumber: 'Bruner (Trianto, 2014)',
    kategori: 'retensi',
    fokus: 'Penemuan Konsep & Pemahaman Mendalam',
    sintaks: [
      { langkah: 'Langkah 1: Pemberian Rangsangan (Stimulation)', deskripsi: 'Menampilkan keunikan/fenomena tanpa penjelasan.' },
      { langkah: 'Langkah 2: Pernyataan/Identifikasi Masalah (Problem Statement)', deskripsi: 'Siswa merumuskan pertanyaan/hipotesis.' },
      { langkah: 'Langkah 3: Pengumpulan Data (Data Collection)', deskripsi: 'Siswa membaca, mengamati, dan bereksperimen.' },
      { langkah: 'Langkah 4: Pengolahan Data (Data Processing)', deskripsi: 'Mengolah data menjadi klasifikasi atau pola.' },
      { langkah: 'Langkah 5: Pembuktian (Verification)', deskripsi: 'Mencocokkan hasil pengolahan dengan hipotesis.' },
      { langkah: 'Langkah 6: Menarik Kesimpulan (Generalization)', deskripsi: 'Merumuskan prinsip umum atau hukum.' }
    ],
    kelebihan: [
      'Retensi ingatan siswa jauh lebih lama',
      'Melatih keterampilan berpikir induktif'
    ],
    kekurangan: [
      'Kurang cocok untuk materi yang sangat abstrak'
    ]
  },
  {
    id: 'inquiry_terbimbing',
    nama: 'Inquiry Terbimbing (Guided Inquiry)',
    sumber: 'Suchman (2010)',
    kategori: 'retensi',
    fokus: 'Penyelidikan Sains Terstruktur',
    sintaks: [
      { langkah: 'Langkah 1: Orientasi Masalah & Pertanyaan', deskripsi: 'Mengajukan pertanyaan penyelidikan.' },
      { langkah: 'Langkah 2: Verifikasi Data & Eksperimen', deskripsi: 'Melakukan uji coba dengan panduan LKPD.' },
      { langkah: 'Langkah 3: Formulasi Eksplanasi', deskripsi: 'Menyusun penjelasan ilmiah berdasarkan hasil data.' },
      { langkah: 'Langkah 4: Analisis Proses Inkuiri', deskripsi: 'Mengevaluasi keakuratan prosedur eksperimen.' }
    ],
    kelebihan: [
      'Sangat cocok untuk mata pelajaran IPA / IPAS',
      'Membangun sikap ilmiah siswa'
    ],
    kekurangan: [
      'Memerlukan kesiapan alat & bahan eksperimen'
    ]
  },

  // --- KOOPERATIF & SOSIAL ---
  {
    id: 'jigsaw',
    nama: 'Jigsaw (Model Tim Ahli)',
    sumber: 'Aronson (1978)',
    kategori: 'sosial',
    fokus: 'Tutorial Sebaya & Kolaborasi Heterogen',
    sintaks: [
      { langkah: 'Langkah 1: Pembentukan Kelompok Asal', deskripsi: 'Siswa dibagi ke kelompok heterogen 4-5 orang.' },
      { langkah: 'Langkah 2: Diskusi Kelompok Ahli', deskripsi: 'Anggota kelompok dengan sub-topik sama berkumpul.' },
      { langkah: 'Langkah 3: Kembali ke Kelompok Asal', deskripsi: 'Tiap ahli mengajari sub-topik ke teman sekelompok.' },
      { langkah: 'Langkah 4: Evaluasi & Kuis Individual', deskripsi: 'Kuis mandiri untuk mengukur pemahaman utuh.' }
    ],
    kelebihan: [
      'Mencegah dominasi siswa cerdas',
      'Tiap siswa punya peran penting (interdependensi positif)'
    ],
    kekurangan: [
      'Kondisi kelas bisa sangat ramai saat pergerakan kelompok'
    ]
  },
  {
    id: 'stad',
    nama: 'STAD (Student Teams Achievement Divisions)',
    sumber: 'Slavin (2010)',
    kategori: 'sosial',
    fokus: 'Akuntabilitas Tim & Skor Perkembangan',
    sintaks: [
      { langkah: 'Langkah 1: Pengarahan Materi Klasikal', deskripsi: 'Guru menyampaikan pengantar materi singkat.' },
      { langkah: 'Langkah 2: Kerja Kelompok Heterogen', deskripsi: 'Siswa mendiskusikan lembar kerja bersama tim.' },
      { langkah: 'Langkah 3: Kuis Individual (Tanpa Bantuan)', deskripsi: 'Kuis mandiri untuk menghitung skor perkembangan.' },
      { langkah: 'Langkah 4: Penghargaan Prestasi Tim', deskripsi: 'Pemberian penghargaan berdasarkan skor kenaikan tim.' }
    ],
    kelebihan: [
      'Memotivasi siswa saling membantu agar skor tim naik',
      'Adil karena mengukur peningkatan nilai individu'
    ],
    kekurangan: [
      'Memerlukan waktu menghitung skor perkembangan'
    ]
  },
  {
    id: 'tps',
    nama: 'TPS (Think-Pair-Share)',
    sumber: 'Lyman (1981)',
    kategori: 'sosial',
    fokus: 'Interaksi Cepat & Berpikir Berpasangan',
    sintaks: [
      { langkah: 'Langkah 1: Think (Berpikir Mandiri)', deskripsi: 'Siswa memikirkan jawaban secara individu (1-2 menit).' },
      { langkah: 'Langkah 2: Pair (Berpasangan)', deskripsi: 'Siswa berdiskusi dengan teman sebangku.' },
      { langkah: 'Langkah 3: Share (Berbagi ke Kelas)', deskripsi: 'Guru memanggil pasangan untuk berbagi di depan kelas.' }
    ],
    kelebihan: [
      'Sangat praktis dan tidak menyita banyak waktu',
      'Meningkatkan partisipasi aktif siswa pemalu'
    ],
    kekurangan: [
      'Memerlukan kontrol agar diskusi pasangan tetap fokus'
    ]
  },

  // --- KBC & KARAKTER ---
  {
    id: 'pjbl_fids',
    nama: 'PjBL - FIDS (Feel-Imagine-Do-Share)',
    sumber: 'Panduan KBC Kemenag (2025)',
    kategori: 'kbc',
    fokus: 'Proyek Karakter KBC & Pengabdian Emosional',
    sintaks: [
      { langkah: 'Langkah 1: Feel (Merasakan & Empati Isu)', deskripsi: 'Merasakan kepedulian lingkungan/sesama.' },
      { langkah: 'Langkah 2: Imagine (Membayangkan Solusi Cinta)', deskripsi: 'Merancang aksi kebaikan kreatif.' },
      { langkah: 'Langkah 3: Do (Melakukan & Aksi Nyata)', deskripsi: 'Praktik membuat proyek kebaikan.' },
      { langkah: 'Langkah 4: Share (Membagikan & Menginspirasi)', deskripsi: 'Berbagi pengalaman reflektif ke publik.' }
    ],
    kelebihan: [
      'Sangat selaras dengan indikator karakter KBC',
      'Mengembangkan kecerdasan emosional & spiritual'
    ],
    kekurangan: [
      'Membutuhkan kepekaan emosional guru saat fasilitasi'
    ]
  },
  {
    id: 'arka',
    nama: 'Experiential Learning (ARKA)',
    sumber: 'Panduan KBC Kemenag (2025)',
    kategori: 'kbc',
    fokus: 'Pembelajaran Pengalaman & Mindfulness 54321',
    sintaks: [
      { langkah: 'Langkah 1: Aktivitas (Pengalaman Langsung)', deskripsi: 'Mengalami simulasi atau praktik nyata.' },
      { langkah: 'Langkah 2: Refleksi (Jurnal Emosi & Nilai)', deskripsi: 'Merenungkan perasaan dan makna.' },
      { langkah: 'Langkah 3: Konsep (Pembentukan Makna Abstrak)', deskripsi: 'Menghubungkan dengan konsep sains/agama.' },
      { langkah: 'Langkah 4: Aplikasi (Penerapan Kebaikan Keseharian)', deskripsi: 'Komitmen tindakan di kehidupan nyata.' }
    ],
    kelebihan: [
      'Dilengkapi teknik mindfulness 54321',
      'Mendorong kedamaian batin dan kesadaran utuh'
    ],
    kekurangan: [
      'Memerlukan waktu refleksi yang tidak terburu-buru'
    ]
  },
  {
    id: 'deep_learning_mmj',
    nama: 'Deep Learning (Mindful-Meaningful-Joyful)',
    sumber: 'Panduan KBC Kemenag (2025)',
    kategori: 'kbc',
    fokus: 'Kesadaran Utuh & Kebahagiaan Belajar',
    sintaks: [
      { langkah: 'Langkah 1: Mindful (Kehadiran Utuh & Doa Khusyuk)', deskripsi: 'Penyadaran emosi & fokus belajar.' },
      { langkah: 'Langkah 2: Meaningful (Penemuan Makna & Nilai)', deskripsi: 'Memahami alasan mendalam materi dipelajari.' },
      { langkah: 'Langkah 3: Joyful (Pembelajaran Menggembirakan)', deskripsi: 'Aktivitas eksplorasi yang menyenangkan.' }
    ],
    kelebihan: [
      'Menjadikan suasana kelas hangat dan bebas dari rasa takut',
      'Menguatkan hubungan batin guru dan murid'
    ],
    kekurangan: [
      'Memerlukan energi positif yang konsisten dari guru'
    ]
  }
];

// --- BANK SARAN IKTP BERPIKIR KRITIS ENNIS ---
export interface EnnisIndicator {
  kategori: string;
  deskripsi: string;
  contohIktp: string[];
}

export const ENNIS_IKTP_BANK: EnnisIndicator[] = [
  {
    kategori: 'Penjelasan Sederhana (Elementary Clarification)',
    deskripsi: 'Fokus pada merumuskan pertanyaan, menganalisis argumen, dan mengklarifikasi isu.',
    contohIktp: [
      'Peserta didik mampu merumuskan pertanyaan inti berdasarkan fenomena yang diamati.',
      'Peserta didik dapat mengidentifikasi fakta utama dari narasi masalah.'
    ]
  },
  {
    kategori: 'Dukungan Dasar (Basic Support)',
    deskripsi: 'Fokus pada menilai kredibilitas sumber data dan mengamati fenomena secara akurat.',
    contohIktp: [
      'Peserta didik dapat menilai kredibilitas dan keakuratan sumber data yang digunakan.',
      'Peserta didik mampu membedakan fakta ilmiah dari asumsi yang belum terbukti.'
    ]
  },
  {
    kategori: 'Inferensi (Inference)',
    deskripsi: 'Fokus pada menarik kesimpulan berdasar bukti dan membuat generalisasi wajar.',
    contohIktp: [
      'Peserta didik mampu menarik kesimpulan logis berdasarkan hasil penyelidikan data.',
      'Peserta didik dapat memprediksi dampak yang terjadi jika variabel masalah diubah.'
    ]
  },
  {
    kategori: 'Penjelasan Lanjut (Advanced Clarification)',
    deskripsi: 'Fokus pada mengidentifikasi asumsi tersirat dan mengartikan istilah ilmiah.',
    contohIktp: [
      'Peserta didik mampu mengidentifikasi asumsi tersirat di balik suatu pernyataan.',
      'Peserta didik dapat menguraikan argumen kompleks menjadi bagian-bagian yang jelas.'
    ]
  },
  {
    kategori: 'Strategi & Taktik (Strategy and Tactics)',
    deskripsi: 'Fokus pada memutuskan tindakan nyata dan berinteraksi secara efektif dalam tim.',
    contohIktp: [
      'Peserta didik mampu menentukan langkah solusi terbaik dari beberapa opsi tindakan.',
      'Peserta didik dapat memberikan umpan balik konstruktif saat berdiskusi dalam kelompok.'
    ]
  }
];

// --- METODE & VERBALISM WARNING ---
export interface MetodeDetail {
  nama: string;
  kategori: 'interaktif' | 'pasif' | 'praktik';
  deskripsi: string;
  kelebihan: string;
  kekurangan: string;
}

export const METODE_DETAILS: Record<string, MetodeDetail> = {
  'Ceramah': {
    nama: 'Ceramah',
    kategori: 'pasif',
    deskripsi: 'Penyampaian materi lisan searah oleh guru.',
    kelebihan: 'Ekonomis, mencakup materi banyak dalam waktu singkat.',
    kekurangan: 'Risiko verbalisme tinggi (siswa menghafal kata tanpa paham makna).'
  },
  'Diskusi': {
    nama: 'Diskusi',
    kategori: 'interaktif',
    deskripsi: 'Tukar pikiran antar-siswa dalam kelompok.',
    kelebihan: 'Mengasah kemampuan komunikasi & empati.',
    kekurangan: 'Bisa didominasi oleh siswa tertentu jika tidak dikontrol.'
  },
  'Tanya Jawab': {
    nama: 'Tanya Jawab',
    kategori: 'interaktif',
    deskripsi: 'Pengajuan pertanyaan pemantik merangsang respon siswa.',
    kelebihan: 'Memeriksa pemahaman langsung & menjaga fokus.',
    kekurangan: 'Bisa membuat siswa penakut merasa tertekan.'
  },
  'Demonstrasi': {
    nama: 'Demonstrasi',
    kategori: 'praktik',
    deskripsi: 'Peragaan proses atau kerja suatu alat.',
    kelebihan: 'Memperjelas konsep yang sulit dibayangkan.',
    kekurangan: 'Siswa di bagian belakang kadang tidak terlihat jelas.'
  },
  'Eksperimen': {
    nama: 'Eksperimen',
    kategori: 'praktik',
    deskripsi: 'Praktik langsung mencoba & membuktikan data.',
    kelebihan: 'Pengalaman konkrit & retensi tinggi.',
    kekurangan: 'Membutuhkan alat, bahan, dan pengawasan ekstra.'
  },
  'Proyek': {
    nama: 'Proyek',
    kategori: 'praktik',
    deskripsi: 'Pembuatan karya berdurasi waktu.',
    kelebihan: 'Hasil karya konkrit & kemandirian.',
    kekurangan: 'Menyita waktu di luar jam pelajaran.'
  },
  'Role Playing': {
    nama: 'Role Playing',
    kategori: 'interaktif',
    deskripsi: 'Bermain peran meragakan karakter/situasi.',
    kelebihan: 'Menumbuhkan empati sosial secara mendalam.',
    kekurangan: 'Siswa malu bisa merasa canggung.'
  },
  'Penugasan': {
    nama: 'Penugasan',
    kategori: 'pasif',
    deskripsi: 'Pengerjaan latihan soal/makalah mandiri.',
    kelebihan: 'Melatih tanggung jawab mandiri.',
    kekurangan: 'Risiko kejenuhan jika tidak variatif.'
  }
};
