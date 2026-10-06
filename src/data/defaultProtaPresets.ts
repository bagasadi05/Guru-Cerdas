/**
 * Official Curriculum Preset Bank for Program Tahunan (Prota)
 * Standard Kurikulum Merdeka (BSKAP No. 032/H/KR/2024 / Permendikbudristek)
 */

import type { ProtaItem, PhaseType } from '../types/perangkatAjar';

export interface PresetTopicDefinition {
  element: string;
  code: string;
  tp: string;
  topic: string;
  relativeWeight: number; // weight used for proportional JP scaling
}

export interface SubjectCurriculumPreset {
  subject: string;
  gradeLevels: string[];
  phase: PhaseType;
  defaultWeeklyJp: number;
  semester1: PresetTopicDefinition[];
  semester2: PresetTopicDefinition[];
}

export const CURATED_PROTA_PRESETS: SubjectCurriculumPreset[] = [
  // 1. BAHASA INDONESIA KELAS 4 (FASE B)
  {
    subject: 'Bahasa Indonesia',
    gradeLevels: ['Kelas 4'],
    phase: 'B',
    defaultWeeklyJp: 4,
    semester1: [
      {
        element: 'Menyimak',
        code: 'TP 4.1',
        tp: 'Memahami ide pokok dan ide pendukung pada teks informatif lisan dengan kritis',
        topic: 'Bab 1: Sudah Besar (Mengenal Diri Sendiri)',
        relativeWeight: 1,
      },
      {
        element: 'Membaca dan Memirsa',
        code: 'TP 4.2',
        tp: 'Membaca nyaring teks narasi dengan intonasi yang tepat dan memahami kosakata baru',
        topic: 'Bab 2: Di Bawah Atap (Tugas di Rumah dan Keluarga)',
        relativeWeight: 1,
      },
      {
        element: 'Berbicara',
        code: 'TP 4.3',
        tp: 'Mempresentasikan gagasan dengan volume dan pelafalan jelas menggunakan kata sopan',
        topic: 'Bab 3: Lihat Sekitar (Lalu Lintas dan Keselamatan)',
        relativeWeight: 1,
      },
      {
        element: 'Menulis',
        code: 'TP 4.4',
        tp: 'Menulis teks narasi sederhana dengan urutan runtut menggunakan kalimat efektif',
        topic: 'Bab 4: Meliuk dan Menerjang (Aktivitas Fisik dan Kesehatan)',
        relativeWeight: 1,
      },
    ],
    semester2: [
      {
        element: 'Menyimak',
        code: 'TP 4.5',
        tp: 'Mengidentifikasi informasi penting dari teks instruksional dan prosedur praktis',
        topic: 'Bab 5: Bertukar dan Membayar (Literasi Keuangan)',
        relativeWeight: 1,
      },
      {
        element: 'Membaca dan Memirsa',
        code: 'TP 4.6',
        tp: 'Membandingkan informasi dari dua sumber bacaan berbeda tentang keindahan alam',
        topic: 'Bab 6: Satu Titik (Bentang Alam dan Keindahan Nusantara)',
        relativeWeight: 1,
      },
      {
        element: 'Berbicara',
        code: 'TP 4.7',
        tp: 'Melakukan wawancara sederhana dan melaporkan hasilnya secara lisan dengan percaya diri',
        topic: 'Bab 7: Asal-Usul (Kearifan Lokal dan Silsilah)',
        relativeWeight: 1,
      },
      {
        element: 'Menulis',
        code: 'TP 4.8',
        tp: 'Menulis laporan pengamatan singkat dengan ejaan dan tanda baca yang benar',
        topic: 'Bab 8: Sehatlah Ragaku (Pola Hidup Sehat)',
        relativeWeight: 1,
      },
    ],
  },

  // 2. MATEMATIKA KELAS 4 (FASE B)
  {
    subject: 'Matematika',
    gradeLevels: ['Kelas 4'],
    phase: 'B',
    defaultWeeklyJp: 4,
    semester1: [
      {
        element: 'Bilangan',
        code: 'TP 4.1',
        tp: 'Membaca, menulis, dan menentukan nilai tempat bilangan cacah sampai 10.000',
        topic: 'Bab 1: Bilangan Cacah sampai 10.000',
        relativeWeight: 1.2,
      },
      {
        element: 'Bilangan',
        code: 'TP 4.2',
        tp: 'Menyelesaikan operasi hitung penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah',
        topic: 'Bab 2: Operasi Hitung Bilangan Cacah',
        relativeWeight: 1.2,
      },
      {
        element: 'Bilangan',
        code: 'TP 4.3',
        tp: 'Memahami konsep pecahan senilai dan mengurutkan pecahan dengan penyebut sama',
        topic: 'Bab 3: Pecahan Senilai dan Operasi Sederhana',
        relativeWeight: 1.0,
      },
      {
        element: 'Pengukuran',
        code: 'TP 4.4',
        tp: 'Mengukur dan mengestimasi luas dan volume menggunakan satuan tidak baku dan satuan baku',
        topic: 'Bab 4: Pengukuran Luas dan Volume',
        relativeWeight: 1.0,
      },
    ],
    semester2: [
      {
        element: 'Geometri',
        code: 'TP 4.5',
        tp: 'Mendeskripsikan ciri-ciri berbagai bangun datar segibanyak dan mengukur besar sudut',
        topic: 'Bab 5: Bangun Datar dan Pengukuran Sudut',
        relativeWeight: 1.0,
      },
      {
        element: 'Aljabar',
        code: 'TP 4.6',
        tp: 'Mengidentifikasi dan melanjutkan pola bilangan dan pola gambar yang membesar dan mengecil',
        topic: 'Bab 6: Pola Gambar dan Pola Bilangan',
        relativeWeight: 1.0,
      },
      {
        element: 'Analisis Data',
        code: 'TP 4.7',
        tp: 'Mengumpulkan, mengurutkan, dan menyajikan data dalam bentuk piktogram dan diagram batang',
        topic: 'Bab 7: Piktogram dan Diagram Batang',
        relativeWeight: 1.0,
      },
    ],
  },

  // 3. IPAS KELAS 4 (FASE B)
  {
    subject: 'IPAS',
    gradeLevels: ['Kelas 4'],
    phase: 'B',
    defaultWeeklyJp: 4,
    semester1: [
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.1',
        tp: 'Mengidentifikasi bagian tubuh tumbuhan dan mendeskripsikan proses fotosintesis',
        topic: 'Bab 1: Tumbuhan, Sumber Kehidupan di Bumi',
        relativeWeight: 1,
      },
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.2',
        tp: 'Menyelidiki wujud zat, sifat materi, dan perubahan wujud benda dalam kehidupan sehari-hari',
        topic: 'Bab 2: Wujud Zat dan Perubahannya',
        relativeWeight: 1,
      },
      {
        element: 'Keterampilan Proses',
        code: 'TP 4.3',
        tp: 'Memanfaatkan berbagai jenis gaya untuk membantu aktivitas manusia',
        topic: 'Bab 3: Gaya di Sekitar Kita (Otot, Gesek, Magnet, Gravitasi)',
        relativeWeight: 1,
      },
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.4',
        tp: 'Mengidentifikasi ragam transformasi energi dan pemanfaatannya dalam kehidupan',
        topic: 'Bab 4: Mengubah Bentuk Energi',
        relativeWeight: 1,
      },
    ],
    semester2: [
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.5',
        tp: 'Menceritakan perkembangan sejarah dan bentang alam tempat tinggal daerah asal',
        topic: 'Bab 5: Cerita Tentang Daerahku',
        relativeWeight: 1,
      },
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.6',
        tp: 'Menghargai keragaman kearifan lokal, budaya, dan tradisi di Indonesia',
        topic: 'Bab 6: Indonesiaku Kaya Budaya',
        relativeWeight: 1,
      },
      {
        element: 'Pemahaman IPAS',
        code: 'TP 4.7',
        tp: 'Memahami konsep kebutuhan manusia dan kegiatan ekonomi jual beli',
        topic: 'Bab 7: Bagaimana Mendapatkan Semua Keperluan Kita?',
        relativeWeight: 1,
      },
      {
        element: 'Keterampilan Proses',
        code: 'TP 4.8',
        tp: 'Menjelaskan peran norma, hak, dan kewajiban dalam membangun masyarakat rukun',
        topic: 'Bab 8: Membangun Masyarakat yang Beradab',
        relativeWeight: 1,
      },
    ],
  },

  // 4. PENDIDIKAN PANCASILA KELAS 4 (FASE B)
  {
    subject: 'Pendidikan Pancasila',
    gradeLevels: ['Kelas 4'],
    phase: 'B',
    defaultWeeklyJp: 2,
    semester1: [
      {
        element: 'Pancasila',
        code: 'TP 4.1',
        tp: 'Menjelaskan makna sila-sila Pancasila dan menerapkannya dalam kehidupan sehari-hari',
        topic: 'Unit 1: Aku Anak Indonesia dan Pengamalan Pancasila',
        relativeWeight: 1,
      },
      {
        element: 'Undang-Undang Dasar 1945',
        code: 'TP 4.2',
        tp: 'Mengidentifikasi aturan, hak, dan kewajiban di rumah, sekolah, serta lingkungan sekitar',
        topic: 'Unit 2: Aku Patuh Aturan di Rumah dan Sekolah',
        relativeWeight: 1,
      },
    ],
    semester2: [
      {
        element: 'Bhinneka Tunggal Ika',
        code: 'TP 4.3',
        tp: 'Menghargai keberagaman suku, agama, dan budaya di lingkungan tempat tinggal',
        topic: 'Unit 3: Membangun Jati Diri dalam Kebhinekaan',
        relativeWeight: 1,
      },
      {
        element: 'Negara Kesatuan Republik Indonesia',
        code: 'TP 4.4',
        tp: 'Mengenal susunan wilayah desa, kelurahan, dan kecamatan dalam bingkai NKRI',
        topic: 'Unit 4: Negaraku Indonesia dan Keutuhan Wilayah',
        relativeWeight: 1,
      },
    ],
  },

  // 5. PAI & BUDI PEKERTI KELAS 4 (FASE B / KEMENAG)
  {
    subject: 'Pendidikan Agama Islam',
    gradeLevels: ['Kelas 4'],
    phase: 'B',
    defaultWeeklyJp: 3,
    semester1: [
      {
        element: "Al-Qur'an dan Hadis",
        code: 'TP 4.1',
        tp: 'Membaca, menghafal, dan memahami pesan pokok Q.S. Al-Hujurat/49:13 tentang keragaman',
        topic: "Bab 1: Mari Mengaji Surah Al-Hujurat",
        relativeWeight: 1,
      },
      {
        element: 'Akidah',
        code: 'TP 4.2',
        tp: 'Mengenal Allah melalui Asmaulhusna (Al-Malik, Al-Aziz, Al-Quddus, As-Salam, Al-Mu’min)',
        topic: 'Bab 2: Teladan Asmaul Husna',
        relativeWeight: 1,
      },
      {
        element: 'Akhlak',
        code: 'TP 4.3',
        tp: 'Membiasakan sikap saling menghargai dan toleransi dalam kehidupan sehari-hari',
        topic: 'Bab 3: Indahnya Saling Menghargai dalam Keragaman',
        relativeWeight: 1,
      },
      {
        element: 'Fikih',
        code: 'TP 4.4',
        tp: 'Mengetahui tanda-tanda usia baligh dan kewajiban syariat setelah baligh',
        topic: 'Bab 4: Menyambut Usia Baligh',
        relativeWeight: 1,
      },
    ],
    semester2: [
      {
        element: "Al-Qur'an dan Hadis",
        code: 'TP 4.5',
        tp: 'Membaca, menghafal, dan menjelaskan kandungan pesan pokok Q.S. At-Tin',
        topic: "Bab 5: Mari Mengaji Surah At-Tin",
        relativeWeight: 1,
      },
      {
        element: 'Akidah',
        code: 'TP 4.6',
        tp: 'Meyakini keberadaan Rasul Allah dan mengenal 25 nabi serta sifat wajibnya',
        topic: 'Bab 6: Beriman kepada Rasul-Rasul Allah',
        relativeWeight: 1,
      },
      {
        element: 'Akhlak',
        code: 'TP 4.7',
        tp: 'Meneladani adab bertetangga, berteman, dan memuliakan orang tua serta guru',
        topic: 'Bab 7: Aku Anak Saleh dan Berbakti',
        relativeWeight: 1,
      },
      {
        element: 'Sejarah Peradaban Islam',
        code: 'TP 4.8',
        tp: 'Menceritakan kisah hijrah Nabi Muhammad SAW ke Madinah dengan penuh hikmah',
        topic: 'Bab 8: Kisah Hijrah Nabi Muhammad SAW',
        relativeWeight: 1,
      },
    ],
  },
];

/**
 * Distribute target JP proportionally across a list of topics so the sum exactly matches targetJpTotal.
 */
export function scaleTopicsToTargetJp(
  topics: PresetTopicDefinition[],
  semesterNumber: 1 | 2,
  targetJpTotal: number,
  startingOrderIndex: number = 0
): ProtaItem[] {
  if (topics.length === 0 || targetJpTotal <= 0) return [];

  const totalWeight = topics.reduce((acc, t) => acc + (t.relativeWeight || 1), 0);

  // Initial floor allocation
  const rawAllocations = topics.map((t) => {
    const proportional = ((t.relativeWeight || 1) / totalWeight) * targetJpTotal;
    return Math.max(1, Math.floor(proportional));
  });

  const currentSum = rawAllocations.reduce((a, b) => a + b, 0);
  let remainder = targetJpTotal - currentSum;

  // Distribute positive or negative remainder
  let idx = 0;
  while (remainder !== 0) {
    if (remainder > 0) {
      rawAllocations[idx % rawAllocations.length]++;
      remainder--;
    } else {
      if (rawAllocations[idx % rawAllocations.length] > 1) {
        rawAllocations[idx % rawAllocations.length]--;
        remainder++;
      }
    }
    idx++;
    if (idx > 1000) break; // guard
  }

  return topics.map((topic, i) => ({
    id: crypto.randomUUID(),
    semesterNumber,
    orderIndex: startingOrderIndex + i,
    elementOrDomain: topic.element,
    learningObjectiveCode: topic.code,
    learningObjectiveText: topic.tp,
    coreTopic: topic.topic,
    targetJp: rawAllocations[i],
  }));
}

/**
 * Generate generic evenly divided chapters if subject is not in curated presets or user chooses "Bagi Rata Cepat".
 */
export function generateQuickDistributedProta(
  subject: string,
  gradeLevel: string,
  numChaptersSem1: number,
  numChaptersSem2: number,
  targetJpSem1: number,
  targetJpSem2: number
): ProtaItem[] {
  const sem1Topics: PresetTopicDefinition[] = Array.from({ length: Math.max(1, numChaptersSem1) }, (_, i) => ({
    element: `Elemen ${i + 1}`,
    code: `TP ${i + 1}`,
    tp: `Memahami konsep pokok dan kompetensi dasar pada Bab ${i + 1}`,
    topic: `Bab ${i + 1}: Materi Pembelajaran ${i + 1}`,
    relativeWeight: 1,
  }));

  const sem2Topics: PresetTopicDefinition[] = Array.from({ length: Math.max(1, numChaptersSem2) }, (_, i) => {
    const chapterNum = numChaptersSem1 + i + 1;
    return {
      element: `Elemen ${i + 1}`,
      code: `TP ${chapterNum}`,
      tp: `Memahami konsep pokok dan kompetensi dasar pada Bab ${chapterNum}`,
      topic: `Bab ${chapterNum}: Materi Pembelajaran ${chapterNum}`,
      relativeWeight: 1,
    };
  });

  const sem1Items = scaleTopicsToTargetJp(sem1Topics, 1, targetJpSem1, 0);
  const sem2Items = scaleTopicsToTargetJp(sem2Topics, 2, targetJpSem2, sem1Items.length);

  return [...sem1Items, ...sem2Items];
}

const normalizeGrade = (grade: string) => grade.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Finds the curated preset for a subject and grade. Presets are written for one grade,
 * so a subject match alone is not enough: Kelas 1 must not receive Kelas 4 chapters.
 */
export function findCurriculumPreset(
  subject: string,
  gradeLevel: string
): SubjectCurriculumPreset | null {
  const normSubject = subject.toLowerCase().trim();
  const normGrade = normalizeGrade(gradeLevel);
  if (!normSubject || !normGrade) return null;

  return (
    CURATED_PROTA_PRESETS.find((p) => {
      const pSubNorm = p.subject.toLowerCase();
      const matchSub =
        normSubject.includes(pSubNorm) ||
        pSubNorm.includes(normSubject) ||
        (normSubject.includes('agama') && pSubNorm.includes('agama')) ||
        (normSubject.includes('matematika') && pSubNorm.includes('matematika')) ||
        (normSubject.includes('indonesia') && pSubNorm.includes('indonesia')) ||
        (normSubject.includes('ipas') && pSubNorm.includes('ipas')) ||
        (normSubject.includes('pancasila') && pSubNorm.includes('pancasila'));

      return matchSub && p.gradeLevels.some((g) => normalizeGrade(g) === normGrade);
    }) ?? null
  );
}

/**
 * Find matching curated preset for subject and grade level, scaling its chapters to target JP.
 */
export function getCurriculumPreset(
  subject: string,
  gradeLevel: string,
  targetJpSem1: number,
  targetJpSem2: number
): ProtaItem[] | null {
  const matched = findCurriculumPreset(subject, gradeLevel);
  if (!matched) return null;

  const sem1Items = scaleTopicsToTargetJp(matched.semester1, 1, targetJpSem1, 0);
  const sem2Items = scaleTopicsToTargetJp(matched.semester2, 2, targetJpSem2, sem1Items.length);

  return [...sem1Items, ...sem2Items];
}
