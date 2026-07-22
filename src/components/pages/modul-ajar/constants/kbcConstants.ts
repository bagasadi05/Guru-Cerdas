export interface ModelKbc {
  name: string;
  code: string;
  description: string;
  syntax: string[];
}

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

export const KBC_VALIDATION_CHECKLIST = [
  'Tema Panca Cinta dipilih (1-2) dan relevan dengan materi pokok',
  'Materi insersi tercantum dan muncul di langkah pembelajaran',
  'Tujuan Pembelajaran (TP) memuat frasa nilai cinta',
  'Ada IKTP yang bermuatan sikap/nilai karakter',
  'Kegiatan dibuka doa & apersepsi nilai, ditutup doa syukur & refleksi',
  'Model pembelajaran eksplisit sesuai sintaks KBC',
  'Ada Asesmen Sikap di samping Formatif & Sumatif'
];
