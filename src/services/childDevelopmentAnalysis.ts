import { isAiEnabled, supabase } from './supabase';
import { generateOpenRouterJson } from './openRouterService';

export interface ChildDevelopmentData {
  student: {
    id: string;
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
  generatedBy?: 'AI' | 'Offline Fallback';
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating child development analysis:', error);
    console.error('Error details:', errorMessage);

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

export async function getLatestAnalysisFromDb(
  studentId: string
): Promise<ComprehensiveChildAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('student_development_analyses')
      .select('analysis_data, generated_by')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const analysis = data.analysis_data as unknown as ComprehensiveChildAnalysis;
    return {
      ...analysis,
      generatedBy: data.generated_by as 'AI' | 'Offline Fallback'
    };
  } catch (error) {
    console.error('Gagal mengambil analisis dari database:', error);
    return null;
  }
}

export async function saveAnalysisToDb(
  studentId: string,
  analysis: ComprehensiveChildAnalysis,
  generatedBy: 'AI' | 'Offline Fallback',
  academicYearId?: string | null,
  semesterId?: string | null
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna tidak terautentikasi');

    const analysisWithSource = {
      ...analysis,
      generatedBy
    };

    // Check if record exists
    const { data: existing } = await supabase
      .from('student_development_analyses')
      .select('id')
      .eq('student_id', studentId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      // Update
      const { error } = await supabase
        .from('student_development_analyses')
        .update({
          analysis_data: analysisWithSource as any,
          generated_by: generatedBy,
          academic_year_id: academicYearId || null,
          semester_id: semesterId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('student_development_analyses')
        .insert({
          student_id: studentId,
          user_id: user.id,
          academic_year_id: academicYearId || null,
          semester_id: semesterId || null,
          analysis_data: analysisWithSource as any,
          generated_by: generatedBy
        });
      if (error) throw error;
    }
  } catch (error) {
    console.error('Gagal menyimpan analisis ke database:', error);
    throw error;
  }
}

// === COMPARATIVE DEVELOPMENT ANALYSIS TYPES & FUNCTIONS ===

export interface ComparativeChildAnalysis {
  summary: {
    name: string;
    class: string;
    overallComparison: string;
  };
  cognitive: {
    semester1Strengths: string[];
    semester2Strengths: string[];
    comparisonNarrative: string;
  };
  affective: {
    semester1PositiveCharacters: string[];
    semester2PositiveCharacters: string[];
    comparisonNarrative: string;
  };
  psychomotor: {
    semester1Skills: string[];
    semester2Skills: string[];
    comparisonNarrative: string;
  };
  recommendations: {
    homeSupport: string[];
    stimulation: {
      cognitive: string[];
      affective: string[];
      psychomotor: string[];
    };
  };
  generatedBy?: 'AI' | 'Offline Fallback';
  isComparative: boolean;
}

export async function getAnalysisForSemesterFromDb(
  studentId: string,
  semesterId: string
): Promise<ComprehensiveChildAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('student_development_analyses')
      .select('analysis_data, generated_by')
      .eq('student_id', studentId)
      .eq('semester_id', semesterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const analysis = data.analysis_data as unknown as ComprehensiveChildAnalysis;
    return {
      ...analysis,
      generatedBy: data.generated_by as 'AI' | 'Offline Fallback'
    };
  } catch (error) {
    console.error('Gagal mengambil analisis semester dari database:', error);
    return null;
  }
}

export async function getComparativeAnalysisFromDb(
  studentId: string,
  academicYearId: string
): Promise<ComparativeChildAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('student_development_analyses')
      .select('analysis_data, generated_by')
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .is('semester_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const analysis = data.analysis_data as unknown as ComparativeChildAnalysis;
    return {
      ...analysis,
      generatedBy: data.generated_by as 'AI' | 'Offline Fallback'
    };
  } catch (error) {
    console.error('Gagal mengambil analisis komparatif dari database:', error);
    return null;
  }
}

export async function saveComparativeAnalysisToDb(
  studentId: string,
  academicYearId: string,
  analysis: ComparativeChildAnalysis,
  generatedBy: 'AI' | 'Offline Fallback'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna tidak terautentikasi');

    const analysisWithSource = {
      ...analysis,
      generatedBy,
      isComparative: true
    };

    // Check if record exists
    const { data: existing } = await supabase
      .from('student_development_analyses')
      .select('id')
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .is('semester_id', null)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      // Update
      const { error } = await supabase
        .from('student_development_analyses')
        .update({
          analysis_data: analysisWithSource as any,
          generated_by: generatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('student_development_analyses')
        .insert({
          student_id: studentId,
          user_id: user.id,
          academic_year_id: academicYearId,
          semester_id: null,
          analysis_data: analysisWithSource as any,
          generated_by: generatedBy
        });
      if (error) throw error;
    }
  } catch (error) {
    console.error('Gagal menyimpan analisis komparatif ke database:', error);
    throw error;
  }
}

export function generateComparativeFallbackAnalysis(
  data1: ChildDevelopmentData,
  data2: ChildDevelopmentData,
  avgScore1: number,
  avgScore2: number,
  attRate1: number,
  attRate2: number,
  violations1: number,
  violations2: number
): ComparativeChildAnalysis {
  const name = data1.student.name;
  const studentClass = data1.student.class || 'SD';
  const progressPercent = avgScore2 - avgScore1;
  const progressText = progressPercent > 0
    ? `mengalami peningkatan manis sebesar ${progressPercent} poin`
    : progressPercent === 0
    ? `mempertahankan kestabilan belajarnya dengan sangat baik`
    : `sedang berproses dan beradaptasi dengan materi belajar yang lebih menantang`;

  const attendanceText = attRate2 >= attRate1
    ? `kehadirannya pun semakin mantap di angka ${attRate2}%`
    : `tingkat kehadiran ananda berada di angka ${attRate2}%`;

  return {
    summary: {
      name,
      class: studentClass,
      overallComparison: `✨ Halo Ayah & Bunda! Perjalanan belajar Ananda ${name} dari Semester 1 ke Semester 2 sungguh merupakan petualangan yang luar biasa. Secara akademik, Ananda ${progressText}, di mana rata-rata nilainya adalah ${avgScore1} di Semester 1 dan menjadi ${avgScore2} di Semester 2. Didukung dengan kedisiplinan yang baik, di mana ${attendanceText}, kami yakin Ananda menyimpan potensi yang luar biasa besar untuk terus mekar di masa depan. Terima kasih Ayah dan Bunda yang tiada henti mendampingi ananda dengan penuh cinta kasih! ❤️`
    },
    cognitive: {
      semester1Strengths: [
        `⭐ Menunjukkan minat belajar yang baik di Semester 1`,
        `📚 Rata-rata pencapaian akademik awal yang solid (${avgScore1})`,
        `✍️ Aktif menyelesaikan tugas-tugas dasar kelas`
      ],
      semester2Strengths: [
        `🚀 Menunjukkan perkembangan pemahaman materi baru di Semester 2`,
        `🧠 Lebih mandiri dalam memecahkan masalah pelajaran`,
        `📈 Rata-rata pencapaian akademik akhir adalah ${avgScore2}`
      ],
      comparisonNarrative: `🌟 Pertumbuhan kognitif Ananda ${name} menunjukkan grafik yang sangat positif. Dari peletakan fondasi di Semester 1, ananda melangkah mantap ke Semester 2 dengan rasa percaya diri yang lebih tinggi. Tantangan materi pelajaran yang semakin kompleks justru memicu keingintahuan ananda untuk belajar lebih giat lagi.`
    },
    affective: {
      semester1PositiveCharacters: [
        `🤗 Anak yang ramah dan disukai oleh teman-teman sekelas`,
        `🌸 Menunjukkan sikap hormat kepada guru sejak awal tahun`,
        violations1 === 0 ? `😇 Berperilaku sangat tertib tanpa pelanggaran` : `🌱 Belajar mematuhi peraturan sekolah`
      ],
      semester2PositiveCharacters: [
        `🤝 Memiliki kepekaan sosial dan toleransi yang semakin matang`,
        `💪 Lebih berani mengemukakan pendapat di forum kelas`,
        violations2 === 0 ? `🏅 Menjadi teladan kedisiplinan bagi teman lainnya` : `👍 Menunjukkan komitmen untuk lebih tertib`
      ],
      comparisonNarrative: `💖 Dari segi afektif, kedewasaan emosi dan kepedulian sosial Ananda ${name} berkembang dengan sangat manis. Jika di Semester 1 ananda lebih banyak mengamati, di Semester 2 ananda mulai berani tampil memimpin, menunjukkan empati yang tinggi pada teman-temannya, serta semakin mandiri.`
    },
    psychomotor: {
      semester1Skills: [
        `🏃‍♂️ Aktif bergerak dan bersemangat saat pelajaran PJOK`,
        `🎨 Terampil dalam kegiatan mewarnai dan menggambar dasar`
      ],
      semester2Skills: [
        `🕺 Koordinasi gerak fisik yang semakin matang dan lincah`,
        `🛠️ Menghasilkan karya keterampilan tangan yang kreatif`
      ],
      comparisonNarrative: `👟 Aspek psikomotorik ananda tumbuh selaras dengan keaktifan fisiknya yang luar biasa. Di Semester 2 ini, koordinasi motorik halus (seperti menulis, memotong, menempel) dan motorik kasar ananda tampak jauh lebih terkoordinasi dan ekspresif dibanding awal semester lalu.`
    },
    recommendations: {
      homeSupport: [
        `Sediakan waktu minimal 15-30 menit setiap sore untuk mengobrol santai tentang hari ananda di sekolah.`,
        `Berikan apresiasi atas setiap proses usahanya, bukan hanya hasil nilai ujian semata.`,
        `Diskusikan bersama ananda rencana belajarnya dengan suasana yang menyenangkan.`
      ],
      stimulation: {
        cognitive: [
          `Ajak anak bermain permainan logika/strategi seperti catur sederhana, monopoli, atau tebak kata.`,
          `Sediakan buku bacaan menarik di rumah untuk merangsang minat literasinya.`
        ],
        affective: [
          `Berikan tanggung jawab kecil di rumah, misalnya menyiram tanaman atau merapikan tempat tidur sendiri.`,
          `Ajari anak meregulasi emosi dengan teknik pernapasan saat sedang merasa kesal.`
        ],
        psychomotor: [
          `Semangati anak untuk berolahraga bersama keluarga di akhir pekan (bersepeda, jalan pagi, dsb).`,
          `Fasilitasi hobi seni atau eksperimen ilmiah sederhana yang memadukan aktivitas motorik halus.`
        ]
      }
    },
    isComparative: true
  };
}

export async function generateComparativeChildAnalysis(
  data1: ChildDevelopmentData,
  data2: ChildDevelopmentData
): Promise<ComparativeChildAnalysis> {
  try {
    // Validate data
    if (!data1 || !data1.student?.name || !data2) {
      throw new Error('Data siswa untuk perbandingan tidak lengkap');
    }

    // Sanitize data
    const validAcademicRecords1 = (data1.academicRecords || []).filter(r => r && typeof r.score === 'number');
    const validAcademicRecords2 = (data2.academicRecords || []).filter(r => r && typeof r.score === 'number');

    const avgScore1 = validAcademicRecords1.length > 0
      ? Math.round(validAcademicRecords1.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords1.length)
      : 0;
    const avgScore2 = validAcademicRecords2.length > 0
      ? Math.round(validAcademicRecords2.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords2.length)
      : 0;

    const attend1 = (data1.attendanceRecords || []).filter(r => r && r.status);
    const attend2 = (data2.attendanceRecords || []).filter(r => r && r.status);

    const attSummary1 = {
      total: attend1.length,
      hadir: attend1.filter(r => r.status === 'Hadir').length,
      sakit: attend1.filter(r => r.status === 'Sakit').length,
      izin: attend1.filter(r => r.status === 'Izin').length,
      alpha: attend1.filter(r => r.status === 'Alpha').length
    };
    const attSummary2 = {
      total: attend2.length,
      hadir: attend2.filter(r => r.status === 'Hadir').length,
      sakit: attend2.filter(r => r.status === 'Sakit').length,
      izin: attend2.filter(r => r.status === 'Izin').length,
      alpha: attend2.filter(r => r.status === 'Alpha').length
    };

    const attRate1 = attSummary1.total > 0 ? Math.round((attSummary1.hadir / attSummary1.total) * 100) : 100;
    const attRate2 = attSummary2.total > 0 ? Math.round((attSummary2.hadir / attSummary2.total) * 100) : 100;

    const violationsCount1 = (data1.violations || []).length;
    const violationsCount2 = (data2.violations || []).length;

    // Check if AI is available
    if (!isAiEnabled) {
      console.warn('AI service not available, using comparative fallback analysis');
      return generateComparativeFallbackAnalysis(data1, data2, avgScore1, avgScore2, attRate1, attRate2, violationsCount1, violationsCount2);
    }

    const systemInstruction = `Anda adalah seorang psikolog anak dan mitra setia orang tua yang hangat, bijaksana, dan penuh empati.
    Tugas Anda adalah membandingkan perkembangan anak antara Semester 1 (Ganjil) dan Semester 2 (Genap) dari tahun ajaran aktif, lalu memberikan analisis komparatif yang "sangat hangat dan menyentuh hati orang tua" (delightful and heartwarming to read for parents).
    
    PANDUAN GAYA BAHASA & NADA:
    1. **Nada Bicara**: Sangat personal, penuh kasih sayang, dan menenangkan. Sapalah dengan "Ayah/Bunda" dan panggil anak dengan panggilan sayang "Ananda" atau namanya langsung.
    2. **Fokus pada Pertumbuhan**: Tonjolkan setiap kemajuan sekecil apa pun dari Semester 1 ke Semester 2. JANGAN menggunakan kata-kata kaku atau negatif seperti "menurun", "buruk", atau "gagal". Gantilah dengan ungkapan optimis dan penuh semangat (misal: "sedang berproses", "menyimpan energi untuk melompat lebih tinggi", "perjalanan belajar yang menantang namun seru").
    3. **Pesan Emosional**: Buat tulisan yang menyentuh hati, mengapresiasi kerja keras ananda, dan memberikan motivasi yang manis kepada Ayah dan Bunda untuk terus membersamai ananda.
    4. **Gunakan Emoji**: Selipkan emoji-emoji hangat dan penuh warna 🌟💖🌱🤗🏆 di setiap bagian agar ramah dibaca.`;

    const prompt = `Lakukan analisis perbandingan perkembangan anak berikut antara Semester 1 (Ganjil) dan Semester 2 (Genap):
    
    SISWA: ${data1.student.name}, Usia: ${data1.student.age || 7} tahun, Kelas: ${data1.student.class || 'SD'}
    
    DATA SEMESTER 1 (GANJIL):
    - Rata-rata Nilai Akademik: ${avgScore1}
    - Rincian Nilai Mapel: ${validAcademicRecords1.map(s => `${s.subject} (${s.score})`).join(', ')}
    - Kehadiran: ${attRate1}% (${attSummary1.hadir}/${attSummary1.total} hari)
    - Pelanggaran: ${violationsCount1} catatan
    - Kuis/Partisipasi: ${(data1.quizPoints || []).length} kali
    
    DATA SEMESTER 2 (GENAP):
    - Rata-rata Nilai Akademik: ${avgScore2}
    - Rincian Nilai Mapel: ${validAcademicRecords2.map(s => `${s.subject} (${s.score})`).join(', ')}
    - Kehadiran: ${attRate2}% (${attSummary2.hadir}/${attSummary2.total} hari)
    - Pelanggaran: ${violationsCount2} catatan
    - Kuis/Partisipasi: ${(data2.quizPoints || []).length} kali
    
    Hasilkan respons dalam format JSON dengan struktur persis seperti ini:
    {
      "summary": {
        "name": "${data1.student.name}",
        "class": "${data1.student.class || 'SD'}",
        "overallComparison": "[Tulis ulasan naratif komparatif yang sangat hangat, menyentuh, dan mengalir tentang keseluruhan perkembangan anak dari Semester 1 ke Semester 2. Apresiasi usaha ananda dan kehadiran Ayah/Bunda]"
      },
      "cognitive": {
        "semester1Strengths": ["[Kekuatan kognitif/akademik utama semester 1]"],
        "semester2Strengths": ["[Kekuatan kognitif/akademik utama semester 2]"],
        "comparisonNarrative": "[Naratif hangat tentang bagaimana kognitif/akademik anak berkembang, berproses, atau menghadapi tantangan secara positif dari Semester 1 ke Semester 2]"
      },
      "affective": {
        "semester1PositiveCharacters": ["[Karakter/sikap positif utama semester 1]"],
        "semester2PositiveCharacters": ["[Karakter/sikap positif utama semester 2]"],
        "comparisonNarrative": "[Naratif hangat tentang perkembangan emosi, kemandirian, kedisiplinan, dan interaksi sosial anak dari Semester 1 ke Semester 2]"
      },
      "psychomotor": {
        "semester1Skills": ["[Keterampilan fisik/motorik utama semester 1]"],
        "semester2Skills": ["[Keterampilan fisik/motorik utama semester 2]"],
        "comparisonNarrative": "[Naratif hangat tentang perkembangan koordinasi fisik, karya tangan, olahraga, atau kreativitas psikomotorik anak dari Semester 1 ke Semester 2]"
      },
      "recommendations": {
        "homeSupport": [
          "[Rekomendasi pendampingan di rumah yang spesifik dan penuh kasih]"
        ],
        "stimulation": {
          "cognitive": ["[Stimulasi berpikir/akademik di rumah]"],
          "affective": ["[Stimulasi karakter/emosi di rumah]"],
          "psychomotor": ["[Stimulasi fisik/kreativitas di rumah]"]
        }
      }
    }`;

    const analysis = await generateOpenRouterJson<ComparativeChildAnalysis>(prompt, systemInstruction);
    return {
      ...analysis,
      isComparative: true
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating comparative child development analysis:', error);
    console.error('Error details:', errorMessage);

    const validAcademicRecords1 = (data1.academicRecords || []).filter(r => r && typeof r.score === 'number');
    const validAcademicRecords2 = (data2.academicRecords || []).filter(r => r && typeof r.score === 'number');

    const avgScore1 = validAcademicRecords1.length > 0
      ? Math.round(validAcademicRecords1.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords1.length)
      : 0;
    const avgScore2 = validAcademicRecords2.length > 0
      ? Math.round(validAcademicRecords2.reduce((sum, r) => sum + r.score, 0) / validAcademicRecords2.length)
      : 0;

    const attendRate1 = (data1.attendanceRecords || []).length > 0
      ? Math.round(((data1.attendanceRecords || []).filter(r => r.status === 'Hadir').length / (data1.attendanceRecords || []).length) * 100)
      : 100;
    const attendRate2 = (data2.attendanceRecords || []).length > 0
      ? Math.round(((data2.attendanceRecords || []).filter(r => r.status === 'Hadir').length / (data2.attendanceRecords || []).length) * 100)
      : 100;

    return generateComparativeFallbackAnalysis(
      data1,
      data2,
      avgScore1,
      avgScore2,
      attendRate1,
      attendRate2,
      (data1.violations || []).length,
      (data2.violations || []).length
    );
  }
}

