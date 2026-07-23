export type ResolvedSyntax = {
  source:
    | 'ref_sintaks_kegiatan'
    | 'model_sintaks_inti'
    | 'local_model_fallback'
    | 'generic_fallback';
  isCanonical: boolean;
  steps: Array<{
    order: number;
    name: string;
    teacherActivity: string;
    studentActivity: string;
  }>;
  warning?: string;
};

export const LOCAL_MODEL_FALLBACKS: Record<string, Array<{ order: number; name: string; teacherActivity: string; studentActivity: string }>> = {
  'problem based learning': [
    { order: 1, name: 'Orientasi Masalah', teacherActivity: 'Guru menyajikan masalah nyata.', studentActivity: 'Siswa mengamati dan mengidentifikasi masalah.' },
    { order: 2, name: 'Organisasi Belajar', teacherActivity: 'Guru membagi kelompok dan tugas.', studentActivity: 'Siswa berdiskusi dalam kelompok.' },
    { order: 3, name: 'Penyelidikan', teacherActivity: 'Guru membimbing penyelidikan.', studentActivity: 'Siswa mengumpulkan informasi dan solusi.' },
    { order: 4, name: 'Pengembangan Karya', teacherActivity: 'Guru membimbing penyiapan laporan.', studentActivity: 'Siswa menyusun hasil karya/solusi.' },
    { order: 5, name: 'Analisis & Evaluasi', teacherActivity: 'Guru memfasilitasi presentasi.', studentActivity: 'Siswa mempresentasikan dan mengevaluasi hasil.' }
  ],
  'project based learning': [
    { order: 1, name: 'Pertanyaan Mendasar', teacherActivity: 'Guru memberikan pertanyaan utama.', studentActivity: 'Siswa merespons pertanyaan awal.' },
    { order: 2, name: 'Mendesain Proyek', teacherActivity: 'Guru membimbing perencanaan proyek.', studentActivity: 'Siswa merancang langkah proyek.' },
    { order: 3, name: 'Menyusun Jadwal', teacherActivity: 'Guru menyepakati timeline.', studentActivity: 'Siswa menyusun alokasi waktu.' },
    { order: 4, name: 'Memonitor Proyek', teacherActivity: 'Guru memantau kemajuan proyek.', studentActivity: 'Siswa mengerjakan proyek.' },
    { order: 5, name: 'Menguji Hasil', teacherActivity: 'Guru menilai hasil proyek.', studentActivity: 'Siswa memamerkan/mempresentasikan proyek.' },
    { order: 6, name: 'Evaluasi Pengalaman', teacherActivity: 'Guru memimpin refleksi.', studentActivity: 'Siswa berefleksi.' }
  ],
  'discovery learning': [
    { order: 1, name: 'Stimulasi', teacherActivity: 'Guru memberikan stimulasi bacaan/gambar.', studentActivity: 'Siswa mengamati stimulasi.' },
    { order: 2, name: 'Identifikasi Masalah', teacherActivity: 'Guru memberi kesempatan mengajukan hipotesis.', studentActivity: 'Siswa merumuskan masalah.' },
    { order: 3, name: 'Pengumpulan Data', teacherActivity: 'Guru membimbing pengumpulan informasi.', studentActivity: 'Siswa mengumpulkan data.' },
    { order: 4, name: 'Pengolahan Data', teacherActivity: 'Guru memandu pengolahan data.', studentActivity: 'Siswa mengolah data.' },
    { order: 5, name: 'Pembuktian', teacherActivity: 'Guru memandu pemeriksaan hipotesis.', studentActivity: 'Siswa membuktikan hipotesis.' },
    { order: 6, name: 'Generalisasi', teacherActivity: 'Guru membimbing penarikan kesimpulan.', studentActivity: 'Siswa menarik kesimpulan.' }
  ]
};

export const GENERIC_LEARNING_STEPS = [
  { order: 1, name: 'Pendahuluan & Apersepsi', teacherActivity: 'Guru membuka pembelajaran dan mengondisikan siswa.', studentActivity: 'Siswa berdoa dan merespons pemantik.' },
  { order: 2, name: 'Eksplorasi Konsep', teacherActivity: 'Guru menyampaikan konsep dasar dan materi utama.', studentActivity: 'Siswa mendengarkan dan mengamati materi.' },
  { order: 3, name: 'Praktik & Kolaborasi', teacherActivity: 'Guru memberikan lembar kerja dan membimbing pendampingan.', studentActivity: 'Siswa melakukan latihan/praktik kelompok.' },
  { order: 4, name: 'Refleksi Pembelajaran', teacherActivity: 'Guru mengajak siswa merefleksikan proses belajar.', studentActivity: 'Siswa menyampaikan pemahaman dan perasaan.' },
  { order: 5, name: 'Penutup & Tindak Lanjut', teacherActivity: 'Guru memberikan umpan balik dan tugas pengayaan/remedial.', studentActivity: 'Siswa mencatat tindak lanjut dan menutup sesi.' }
];

export function resolveLearningSyntax(
  dbSintaksKegiatan: any[] | null | undefined,
  dbSintaksInti: string[] | null | undefined,
  modelName: string | null | undefined
): ResolvedSyntax {
  // 1. Check ref_sintaks_kegiatan
  if (dbSintaksKegiatan && dbSintaksKegiatan.length > 0) {
    return {
      source: 'ref_sintaks_kegiatan',
      isCanonical: true,
      steps: dbSintaksKegiatan.map(s => ({
        order: s.urutan,
        name: s.nama_langkah,
        teacherActivity: s.kegiatan_guru,
        studentActivity: s.kegiatan_siswa
      }))
    };
  }

  // 2. Check model sintaks_inti array from ref_model_pembelajaran
  if (dbSintaksInti && dbSintaksInti.length > 0) {
    return {
      source: 'model_sintaks_inti',
      isCanonical: true,
      steps: dbSintaksInti.map((stepName, idx) => ({
        order: idx + 1,
        name: stepName,
        teacherActivity: `Guru memandu langkah ${stepName}.`,
        studentActivity: `Siswa mengikuti instruksi ${stepName}.`
      }))
    };
  }

  // 3. Check local model fallback
  const normModel = (modelName || '').toLowerCase().trim();
  for (const [key, steps] of Object.entries(LOCAL_MODEL_FALLBACKS)) {
    if (normModel.includes(key)) {
      return {
        source: 'local_model_fallback',
        isCanonical: false,
        steps,
        warning: `Sintaks rinci untuk "${modelName}" belum tersedia di database. Menggunakan model fallback deterministik.`
      };
    }
  }

  // 4. Generic fallback
  return {
    source: 'generic_fallback',
    isCanonical: false,
    steps: GENERIC_LEARNING_STEPS,
    warning: 'Sintaks rinci belum tersedia. Sistem menggunakan struktur pembelajaran umum agar Modul Ajar tetap dapat dibuat.'
  };
}
