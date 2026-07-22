export interface ModelKbc {
  name: string;
  code: string;
  description: string;
  syntax: string[];
}

/**
 * @deprecated Digunakan hanya sebagai fallback offline jika database belum terhubung.
 * Sumber utama model KBC membaca dari tabel `ref_model_pembelajaran` via `useLearningModels()`.
 */
export const MODEL_PEMBELAJARAN_KBC: ModelKbc[] = [
  {
    name: 'Project Based Learning (PjBL - FIDS)',
    code: 'FIDS',
    description: 'Pembelajaran berbasis proyek dengan alur Feel, Imagine, Do, Share',
    syntax: [
      'Langkah 1: Feel (Merasakan & Mengidentifikasi Isu)',
      'Langkah 2: Imagine (Membayangkan Solusi Berbasis Cinta)',
      'Langkah 3: Do (Melakukan & Membuat Proyek)',
      'Langkah 4: Share (Membagikan & Menginspirasi Sesama)'
    ]
  },
  {
    name: 'Experiential Learning (ARKA)',
    code: 'ARKA',
    description: 'Pembelajaran berbasis pengalaman dengan alur Aktivitas, Refleksi, Konsep, Aplikasi',
    syntax: [
      'Langkah 1: Aktivitas (Pengalaman Langsung)',
      'Langkah 2: Refleksi (Refleksi Emosional & Nilai)',
      'Langkah 3: Konsep (Pembentukan Makna & Konsep)',
      'Langkah 4: Aplikasi (Penerapan Kebaikan Keseharian)'
    ]
  },
  {
    name: 'Deep Learning (Mindful-Meaningful-Joyful)',
    code: 'MMJ',
    description: 'Pembelajaran mendalam yang mengintegrasikan kesadaran, kebermaknaan, dan kegembiraan',
    syntax: [
      'Langkah 1: Mindful (Kehadiran Utuh & Kesadaran Diri)',
      'Langkah 2: Meaningful (Penemuan Makna & Nilai Cinta)',
      'Langkah 3: Joyful (Pembelajaran Bermakna & Menggembirakan)'
    ]
  },
  {
    name: 'LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi)',
    code: 'LOK-R',
    description: 'Model pembelajaran bermuatan literasi dan refleksi sosial',
    syntax: [
      'Langkah 1: Literasi (Eksplorasi Informasi & Nilai)',
      'Langkah 2: Orientasi (Penetapan Tujuan & Adab)',
      'Langkah 3: Kolaborasi (Kerja Sama & Ukhuwah)',
      'Langkah 4: Refleksi (Evaluasi Karakter & Penutupan)'
    ]
  },
  {
    name: 'Discovery Learning KBC',
    code: 'DISCOVERY_KBC',
    description: 'Penemuan terbimbing bernuansa nilai cinta',
    syntax: [
      'Langkah 1: Stimulasi (Penyajian Fenomena & Kasih Sayang Allah)',
      'Langkah 2: Identifikasi Masalah & Pengumpulan Data',
      'Langkah 3: Pengolahan Data & Pembuktian',
      'Langkah 4: Penarikan Kesimpulan & Inovasi Kebaikan'
    ]
  }
];

export const PANCA_CINTA_TOPICS_FALLBACK = [
  {
    id: 'cinta_allah_rasul',
    nama_tema: 'Cinta Allah Swt. dan Rasul-Nya',
    deskripsi: 'Mengenal sifat jamaliyah Allah & ibadah atas dasar cinta, bukan paksaan.'
  },
  {
    id: 'cinta_ilmu',
    nama_tema: 'Cinta Ilmu',
    deskripsi: 'Ilmu sebagai jalan membuka keagungan penciptaan & sarana kebermanfaatan.'
  },
  {
    id: 'cinta_lingkungan',
    nama_tema: 'Cinta Lingkungan',
    deskripsi: 'Alam sebagai manifestasi cinta Allah & Rahmatan lil \'alamin.'
  },
  {
    id: 'cinta_diri_sesama',
    nama_tema: 'Cinta Diri dan Sesama',
    deskripsi: 'Self-compassion, Social Emotional Learning (SEL), & kesetaraan manusia.'
  },
  {
    id: 'cinta_tanah_air',
    nama_tema: 'Cinta Tanah Air',
    deskripsi: 'Cinta tanah air sebagai bagian dari iman (Hubbul Wathan minal Iman).'
  }
];

export const MATERI_INSERSI_FALLBACK: Record<string, string[]> = {
  cinta_allah_rasul: [
    'Internalisasi Asmaul Husna (Ar-Rahman, Ar-Rahim, Al-Latif) dalam pembelajaran',
    'Ibadah sebagai wujud rasa syukur dan cinta kepada Allah Swt.',
    'Meneladani sifat kasih sayang dan akhlak Sirah Nabawiyah Rasulullah'
  ],
  cinta_ilmu: [
    'Adab menuntut ilmu (tawakal, tekun, yakin, dan syukur)',
    'Penalaran kritis dan literasi sebagai wujud adab intelektual',
    'Hormat dan tawadhu kepada guru serta sumber ilmu'
  ],
  cinta_lingkungan: [
    'Prinsip Rahmatan lil \'alamin dan kepedulian terhadap ekosistem',
    'Larangan berbuat fasad (merusak alam) - QS. Ar-Rum: 41',
    'Hemat energi dan sumber daya air (larangan ishraf)'
  ],
  cinta_diri_sesama: [
    'Self-compassion, kesadaran emosional, dan resiliensi diri',
    'Ukhuwah Islamiyah, Ukhuwah Insaniyah, dan empati sosial',
    'Budaya tasamuh (toleransi) dan syura (musyawarah)'
  ],
  cinta_tanah_air: [
    'Prinsip Hubbul Wathan minal Iman (Cinta Tanah Air bagian dari Iman)',
    'Ukhuwah Wathaniyah dan persatuan dalam keberagaman (QS. Al-Hujurat: 13)',
    'Menghormati simbol negara dan budaya luhur bangsa'
  ]
};

export const KBC_VALIDATION_CHECKLIST = [
  'Tema Panca Cinta dipilih (1-2) dan relevan dengan materi pokok',
  'Materi insersi tercantum dan muncul di langkah pembelajaran',
  'Tujuan Pembelajaran (TP) memuat frasa nilai cinta',
  'Ada IKTP yang bermuatan sikap/nilai karakter',
  'Kegiatan dibuka doa & apersepsi nilai, ditutup doa syukur & refleksi',
  'Model pembelajaran eksplisit sesuai sintaks KBC',
  'Ada Asesmen Sikap di samping Formatif & Sumatif'
];
