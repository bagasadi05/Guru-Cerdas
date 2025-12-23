import { isAiEnabled } from './supabase';
import { generateOpenRouterJson } from './openRouterService';

export interface ChildDevelopmentData {
  student: {
    name: string;
    age?: number;
    class?: string;
  };
  academicRecords: Array<{
    subject: string;
    score: number;
    assessment_name?: string;
    notes?: string;
  }>;
  attendanceRecords: Array<{
    status: string;
    date: string;
  }>;
  violations: Array<{
    description: string;
    points: number;
    date: string;
  }>;
  quizPoints: Array<{
    activity: string;
    points: number;
    date: string;
  }>;
}

export interface CognitiveDevelopmentAnalysis {
  strengths: string[];
  areasForDevelopment: string[];
  learningStyle: string;
  criticalThinking: string;
  academicComparison: string;
}

export interface AffectiveDevelopmentAnalysis {
  positiveCharacters: string[];
  socialSkills: string;
  characterDevelopmentAreas: string[];
  emotionalIntelligence: string;
  discipline: string;
}

export interface PsychomotorDevelopmentAnalysis {
  motorSkills: string;
  outstandingSkills: string[];
  areasNeedingStimulation: string[];
  coordination: string;
}

export interface ParentRecommendations {
  homeSupport: string[];
  neededStimulation: {
    cognitive: string[];
    affective: string[];
    psychomotor: string[];
  };
  developmentPlan: {
    threeMonths: string[];
    sixMonths: string[];
  };
  warningsSigns: string[];
}

export interface ComprehensiveChildAnalysis {
  summary: {
    name: string;
    age: number;
    class: string;
    overallAssessment: string;
  };
  cognitive: CognitiveDevelopmentAnalysis;
  affective: AffectiveDevelopmentAnalysis;
  psychomotor: PsychomotorDevelopmentAnalysis;
  recommendations: ParentRecommendations;
}

function generateFallbackAnalysis(
  data: ChildDevelopmentData,
  averageScore: number,
  attendanceRate: number,
  totalViolations: number
): ComprehensiveChildAnalysis {
  const performanceLevel = averageScore >= 85 ? 'sangat baik' : averageScore >= 75 ? 'baik' : averageScore >= 65 ? 'cukup' : 'perlu peningkatan';
  const attendanceLevel = attendanceRate >= 95 ? 'sangat baik' : attendanceRate >= 85 ? 'baik' : attendanceRate >= 75 ? 'cukup' : 'perlu peningkatan';

  return {
    summary: {
      name: data.student.name,
      age: data.student.age || 7,
      class: data.student.class || 'SD',
      overallAssessment: `${data.student.name} menunjukkan perkembangan yang ${performanceLevel} dengan rata-rata nilai ${averageScore} dan tingkat kehadiran ${attendanceRate}%. ${totalViolations === 0 ? 'Tidak ada catatan pelanggaran yang menunjukkan kedisiplinan yang baik.' : 'Perlu perhatian pada aspek kedisiplinan.'} Terus dukung semangat belajar dan perkembangannya.`
    },
    cognitive: {
      strengths: [
        `🌟 Wow! Rata-rata nilainya ${averageScore}, membanggakan sekali ya Bun!`,
        averageScore >= 75 ? '📚 Ananda mengikuti pelajaran dengan sangat antusias' : '📖 Ananda sudah menunjukkan usaha hebat di kelas',
        '🙋‍♂️ Aktif bertanya dan berdiskusi seru dengan teman',
        data.academicRecords.length > 5 ? '📈 Hasil belajarnya stabil terus lho' : '📝 Rajin banget ikut ujian dan tugas'
      ].slice(0, 4),
      areasForDevelopment: [
        averageScore < 75 ? '💡 Bisa kita temani belajar lagi di rumah sambil santai' : '🚀 Semangat belajarnya perlu dijaga terus ya',
        '✍️ Perbanyak latihan soal biar makin jago',
        averageScore < 70 ? '🤝 Boleh banget ngobrol santai sama guru wali kelas' : '📚 Coba eksplor buku-buku seru lainnya'
      ].slice(0, 3),
      learningStyle: '🌈 Campuran (Unik banget!)',
      criticalThinking: averageScore >= 75 ? '🧠 Pintar banget menangkap inti masalah' : '🌱 Sedang belajar memahami masalah, yuk sering diajak ngobrol!',
      academicComparison: averageScore >= 75 ? '🏆 Perkembangannya juara untuk usianya' : '👣 Sedang asyik melangkah sesuai tahapannya'
    },
    affective: {
      positiveCharacters: [
        `🏫 Rajin banget sekolahnya (${attendanceRate}%)`,
        '⭐ Anak yang bertanggung jawab, keren!',
        totalViolations === 0 ? '😇 Anak baik, perilakunya sopan sekali' : '🌱 Sedang belajar jadi lebih tertib lagi',
        attendanceRate >= 90 ? '🔥 Semangat sekolahnya patut diacungi jempol' : '🎒 Cukup rajin berangkat sekolah'
      ].slice(0, 4),
      socialSkills: '🤝 Senang berteman dan main bareng sahabatnya',
      characterDevelopmentAreas: [
        totalViolations > 0 ? '🗓️ Perlu diingatkan lagi soal aturan sekolah pelan-pelan ya' : '💖 Terus diajarkan untuk sayang teman',
        '🎤 Bisa didorong jadi pemimpin barisan biar makin berani',
        attendanceRate < 85 ? '⏰ Semangati lagi biar bangun pagi lebih happy' : '🦸‍♂️ Dorong untuk lebih mandiri saat belajar'
      ].slice(0, 3),
      emotionalIntelligence: '🥰 Bisa mengerti perasaan teman, anak yang peka',
      discipline: attendanceRate >= 95 ? '🏅 Sangat Rajin (Teladan!)' : attendanceRate >= 85 ? '👍 Rajin' : attendanceRate >= 75 ? '👌 Cukup Rajin' : '💪 Perlu Semangat Lagi'
    },
    psychomotor: {
      motorSkills: '🏃‍♂️ Gerak tubuhnya lincah, aktif, dan sehat',
      outstandingSkills: [
        '🛠️ Suka praktek dan bikin karya seru',
        '✍️ Tangannya terampil (tulisan/gambarnya rapi)',
        '⚽ Jago mengikuti gerakan olahraga'
      ],
      areasNeedingStimulation: [
        '🌳 Sering ajak main di taman biar makin kuat fisiknya',
        '✂️ Ajak main origami atau lego untuk melatih jari'
      ],
      coordination: '🕺 Gerakannya luwes banget, tidak kaku'
    },
    recommendations: {
      homeSupport: [
        'Dampingi anak belajar 30-45 menit setiap hari setelah pulang sekolah dengan suasana yang kondusif',
        'Baca buku cerita atau artikel bersama 15-20 menit sebelum tidur untuk meningkatkan literasi',
        'Diskusikan kegiatan sekolah hari ini dan apresiasi usaha serta pencapaiannya',
        'Buat jadwal belajar yang konsisten dan pastikan waktu istirahat yang cukup'
      ],
      neededStimulation: {
        cognitive: [
          'Berikan puzzle, permainan strategi, dan permainan edukatif sesuai usia',
          'Ajak anak berdiskusi tentang hal-hal di sekitar dan dorong rasa ingin tahunya',
          'Latihan soal matematika dan membaca 15-30 menit setiap hari',
          averageScore < 75 ? 'Fokus pada mata pelajaran yang masih perlu peningkatan dengan pendekatan yang menyenangkan' : 'Berikan tantangan baru untuk meningkatkan kemampuan berpikir kritis'
        ],
        affective: [
          'Ajarkan anak berbagi dan berempati melalui kegiatan bersama saudara/teman',
          'Libatkan dalam kegiatan sosial keluarga dan komunitas',
          'Berikan tanggung jawab kecil di rumah seperti merapikan mainan atau membantu pekerjaan ringan',
          'Diskusikan nilai-nilai moral melalui cerita dan pengalaman sehari-hari'
        ],
        psychomotor: [
          'Olahraga atau aktivitas fisik minimal 3-4 kali seminggu (bersepeda, berenang, bermain bola)',
          'Aktivitas seni seperti menggambar, mewarnai, atau membuat kerajinan tangan',
          'Bermain di luar rumah untuk melatih motorik kasar dan eksplorasi lingkungan',
          'Latihan keterampilan sehari-hari seperti mengikat tali sepatu, mengancingkan baju'
        ]
      },
      developmentPlan: {
        threeMonths: [
          averageScore < 75 ? 'Target peningkatan nilai rata-rata menjadi minimal 75' : 'Target mempertahankan nilai di atas 75 dan meningkatkan 5 poin',
          attendanceRate < 90 ? 'Konsistensi kehadiran minimal 90%' : 'Pertahankan kehadiran di atas 90%',
          'Rutinitas belajar teratur 30 menit setiap hari dengan pendampingan',
          'Mengurangi atau menghilangkan pelanggaran kedisiplinan'
        ],
        sixMonths: [
          'Pencapaian nilai minimal 75 di semua mata pelajaran dengan konsistensi',
          'Kemampuan belajar mandiri meningkat dengan pengawasan minimal',
          'Partisipasi aktif dalam minimal 1 kegiatan ekstrakurikuler',
          'Perkembangan sosial dan karakter yang positif terlihat dari interaksi sehari-hari'
        ]
      },
      warningsSigns: [
        'Penurunan motivasi belajar yang drastis atau menunjukkan keengganan pergi sekolah',
        'Perubahan perilaku atau mood yang signifikan dalam waktu singkat',
        'Kesulitan berkonsentrasi dalam waktu lama atau mudah terdistraksi',
        'Keluhan fisik berulang tanpa sebab medis jelas (sakit kepala, sakit perut)',
        'Masalah tidur atau perubahan pola makan yang signifikan',
        'Penurunan nilai akademik yang konsisten dalam beberapa minggu berturut-turut',
        'Konflik berulang dengan teman atau guru di sekolah'
      ]
    }
  };
}

export async function generateComprehensiveChildAnalysis(
  data: ChildDevelopmentData
): Promise<ComprehensiveChildAnalysis> {
  try {
    // Validate data
    if (!data || !data.student?.name) {
      throw new Error('Data siswa tidak lengkap');
    }

    // Sanitize data
    const validAcademicRecords = (data.academicRecords || []).filter(r => r && typeof r.score === 'number');
    const validAttendanceRecords = (data.attendanceRecords || []).filter(r => r && r.status);
    const validViolations = (data.violations || []).filter(v => v && v.description);
    const validQuizPoints = (data.quizPoints || []).filter(q => q && q.activity);

    // Calculate statistics
    const averageScore = validAcademicRecords.length > 0
      ? Math.round(validAcademicRecords.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords.length)
      : 0;

    const subjectScores = validAcademicRecords.reduce((acc, record) => {
      const subject = record.subject || 'Lainnya';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(record.score);
      return acc;
    }, {} as Record<string, number[]>);

    const subjectAverages = Object.entries(subjectScores).map(([subject, scores]) => ({
      subject,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }));

    const attendanceSummary = {
      total: validAttendanceRecords.length,
      hadir: validAttendanceRecords.filter(r => r.status === 'Hadir').length,
      sakit: validAttendanceRecords.filter(r => r.status === 'Sakit').length,
      izin: validAttendanceRecords.filter(r => r.status === 'Izin').length,
      alpha: validAttendanceRecords.filter(r => r.status === 'Alpha').length
    };

    const attendanceRate = attendanceSummary.total > 0
      ? Math.round((attendanceSummary.hadir / attendanceSummary.total) * 100)
      : 100;

    const violationSummary = {
      total: validViolations.length,
      totalPoints: validViolations.reduce((sum, v) => sum + (v.points || 0), 0),
      recent: validViolations.slice(-3)
    };

    // Check if AI is available
    if (!isAiEnabled) {
      console.warn('AI service not available, using fallback analysis');
      return generateFallbackAnalysis(data, averageScore, attendanceRate, violationSummary.total);
    }

    const systemInstruction = `Anda adalah seorang psikolog anak dan sobat orang tua yang sangat hangat, bijaksana, dan penuh empati.
    Tugas Anda adalah memberikan analisis perkembangan anak yang "menyenangkan untuk dibaca" (delightful to read).
    
    PANDUAN GAYA BAHASA & FORMAT:
    1.  **Nada Bicara**: Sangat personal, hangat, dan menenangkan. Gunakan kata sapaan seperti "Bunda/Ayah", "Ananda", atau langsung sebut nama anak dengan panggilan sayang.
    2.  **Sederhana & Mengalir**: JANGAN gunakan bahasa kaku/akademis sama sekali. Tulis seperti sedang MENGAJAK NGOBROL santai sambil ngopi.
    3.  **Visualisasi Teks**:
        *   Gunakan **EMOJI** 🌟😊🚀 untuk membuat suasana hidup dan ceria di setiap poin.
        *   Gunakan **Huruf Tebal** untuk poin-poin penting agar mudah diskimming.
    4.  **Struktur Ulasan**:
        *   Mulai dengan apresiasi tulus.
        *   Fokus pada *Kekuatan Unik* anak.
        *   Sampaikan area perkembangan sebagai "Petualangan Baru" atau "Tantangan Seru".
    5.  **DILARANG**: Menggunakan kata "kurang", "lemah", "masalah". Ganti dengan "perlu sentuhan lebih", "bisa diasah lagi", "sedang berkembang".`;

    const prompt = `Analisis perkembangan anak dengan data berikut:

SISWA: ${data.student.name}, Usia: ${data.student.age || 7} tahun, Kelas: ${data.student.class || 'SD'}

AKADEMIK:
- Jumlah penilaian: ${validAcademicRecords.length}
- Rata-rata nilai: ${averageScore}
- Nilai per mapel: ${subjectAverages.length > 0 ? subjectAverages.map(s => `${s.subject} (${s.average})`).join(', ') : 'Belum ada data'}
- Tertinggi: ${validAcademicRecords.length > 0 ? Math.max(...validAcademicRecords.map(r => r.score)) : 0}
- Terendah: ${validAcademicRecords.length > 0 ? Math.min(...validAcademicRecords.map(r => r.score)) : 0}

KEHADIRAN: ${attendanceRate}% (${attendanceSummary.hadir}/${attendanceSummary.total} hari)

PERILAKU: ${violationSummary.total} pelanggaran (${violationSummary.totalPoints} poin)

PARTISIPASI: ${validQuizPoints.length} kegiatan

Berikan analisis dalam format JSON dengan struktur:
{"summary":{"name":"","age":0,"class":"","overallAssessment":""},"cognitive":{"strengths":[],"areasForDevelopment":[],"learningStyle":"","criticalThinking":"","academicComparison":""},"affective":{"positiveCharacters":[],"socialSkills":"","characterDevelopmentAreas":[],"emotionalIntelligence":"","discipline":""},"psychomotor":{"motorSkills":"","outstandingSkills":[],"areasNeedingStimulation":[],"coordination":""},"recommendations":{"homeSupport":[],"neededStimulation":{"cognitive":[],"affective":[],"psychomotor":[]},"developmentPlan":{"threeMonths":[],"sixMonths":[]},"warningsSigns":[]}}`;

    // Call AI via OpenRouter
    const analysis = await generateOpenRouterJson<ComprehensiveChildAnalysis>(prompt, systemInstruction);

    return analysis;

  } catch (error: any) {
    console.error('Error generating child development analysis:', error);
    console.error('Error details:', error.message);

    // Use fallback analysis
    const validAcademicRecords = (data.academicRecords || []).filter(r => r && typeof r.score === 'number');
    const validAttendanceRecords = (data.attendanceRecords || []).filter(r => r && r.status);
    const validViolations = (data.violations || []).filter(v => v && v.description);

    const averageScore = validAcademicRecords.length > 0
      ? Math.round(validAcademicRecords.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords.length)
      : 0;

    const attendanceRate = validAttendanceRecords.length > 0
      ? Math.round((validAttendanceRecords.filter(r => r.status === 'Hadir').length / validAttendanceRecords.length) * 100)
      : 100;

    return generateFallbackAnalysis(data, averageScore, attendanceRate, validViolations.length);
  }
}

export async function generateQuickInsights(
  data: ChildDevelopmentData
): Promise<{
  strengthSummary: string;
  concernSummary: string;
  quickTips: string[];
}> {
  try {
    const validAcademicRecords = (data.academicRecords || []).filter(r => r && typeof r.score === 'number');
    const validAttendanceRecords = (data.attendanceRecords || []).filter(r => r && r.status);
    const validViolations = (data.violations || []).filter(v => v && v.description);

    const averageScore = validAcademicRecords.length > 0
      ? Math.round(validAcademicRecords.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords.length)
      : 0;

    const attendanceRate = validAttendanceRecords.length > 0
      ? Math.round((validAttendanceRecords.filter(r => r.status === 'Hadir').length / validAttendanceRecords.length) * 100)
      : 100;

    return {
      strengthSummary: averageScore >= 75 ? 'Siswa menunjukkan prestasi akademik yang baik' : 'Siswa menunjukkan usaha dalam belajar',
      concernSummary: validViolations.length > 3 ? 'Perlu perhatian pada aspek kedisiplinan' : 'Tidak ada concern khusus',
      quickTips: [
        'Pertahankan komunikasi terbuka dengan anak setiap hari',
        'Dukung kegiatan belajar di rumah dengan jadwal teratur',
        'Apresiasi setiap usaha dan kemajuan yang dicapai'
      ]
    };
  } catch (error) {
    console.error('Error generating quick insights:', error);
    return {
      strengthSummary: 'Siswa menunjukkan potensi yang baik',
      concernSummary: 'Tidak ada concern khusus',
      quickTips: [
        'Pertahankan komunikasi terbuka dengan anak',
        'Dukung kegiatan belajar di rumah',
        'Apresiasi setiap kemajuan yang dicapai'
      ]
    };
  }
}
