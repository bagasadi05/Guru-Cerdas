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
    {
      order: 1,
      name: 'Orientasi Siswa pada Masalah Kontekstual',
      teacherActivity: '• Guru menayangkan video / gambar cerita atau menyajikan benda konkret yang memuat masalah nyata terkait materi.\n• Guru mengajukan pertanyaan pemantik kontekstual untuk memusatkan perhatian dan rasa ingin tahu siswa.\n• Guru memastikan setiap siswa memahami inti permasalahan yang akan dipecahkan.',
      studentActivity: '• Siswa mengamati tayangan/media peraga dengan seksama.\n• Siswa mengidentifikasi pokok permasalahan dan mengajukan pertanyaan awal.\n• Siswa mengemukakan dugaan sementara terhadap masalah yang disajikan.'
    },
    {
      order: 2,
      name: 'Mengorganisasikan Siswa untuk Belajar',
      teacherActivity: '• Guru membagi siswa ke dalam kelompok heterogen beranggotakan 4-5 orang.\n• Guru membagikan LKPD dan bahan ajar pendukung materi kepada setiap kelompok.\n• Guru menjelaskan peran tiap anggota kelompok dan aturan diskusi yang demokratis.',
      studentActivity: '• Siswa berkumpul bersama anggota kelompoknya dengan tertib.\n• Siswa membaca petunjuk kerja pada LKPD dan membagi peran kerja.\n• Siswa menyiapkan alat tulis dan bahan eksplorasi materi yang diperlukan.'
    },
    {
      order: 3,
      name: 'Membimbing Penyelidikan Individu maupun Kelompok',
      teacherActivity: '• Guru berkeliling memantau proses interaksi dan penalaran kelompok terkait konsep materi.\n• Guru memberikan bimbingan diferensiasi (scaffolding) kepada kelompok yang membutuhkan bantuan.\n• Guru mengajukan pertanyaan pelacak untuk mendorong analisis kritis siswa.',
      studentActivity: '• Siswa melakukan eksplorasi data/informasi menggunakan bahan ajar atau alat peraga materi.\n• Siswa berdiskusi aktif menemukan alternatif penyelesaian masalah.\n• Siswa mencatat hasil olah data dan solusi kelompok pada lembar LKPD.'
    },
    {
      order: 4,
      name: 'Mengembangkan dan Menyajikan Hasil Karya',
      teacherActivity: '• Guru membimbing tiap kelompok memfinalisasi laporan kerja di LKPD.\n• Guru mengatur giliran dan memfasilitasi sesi presentasi kelompok secara kondusif.\n• Guru mendorong apresiasi positif dan etika menyimak antarpeserta didik.',
      studentActivity: '• Perwakilan kelompok mempresentasikan hasil pemecahan masalah materi di depan kelas.\n• Anggota kelompok lainnya membantu menjelaskan dan memperagakan hasil karya.\n• Kelompok lain menyimak dengan saksama dan memberikan tanggapan santun.'
    },
    {
      order: 5,
      name: 'Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
      teacherActivity: '• Guru memberikan apresiasi atas kerja keras seluruh kelompok.\n• Guru mengklarifikasi konsep kunci materi dan meluruskan miskonsepsi yang muncul.\n• Guru membimbing siswa menyimpulkan prinsip pembelajaran secara utuh.',
      studentActivity: '• Siswa menyimak penjelasan dan penguatan materi dari guru.\n• Siswa memperbaiki catatan di LKPD jika ada masukan yang membangun.\n• Siswa merefleksikan proses berpikir dan strategi pemecahan masalah yang telah dilakukan.'
    }
  ],
  'project based learning': [
    {
      order: 1,
      name: 'Penentuan Pertanyaan Mendasar (Essential Question)',
      teacherActivity: '• Guru menyajikan topik nyata yang menantang terkait materi dan memandu siswa merumuskan pertanyaan mendasar.\n• Guru mengaitkan proyek dengan kebermanfaatan nyata di lingkungan sekitar.',
      studentActivity: '• Siswa menyimak tayangan stimulasi dan merespons pertanyaan guru.\n• Siswa mendiskusikan gagasan utama dan menyepakati topik proyek materi yang akan dibuat.'
    },
    {
      order: 2,
      name: 'Mendesain Perencanaan Proyek (Design a Plan)',
      teacherActivity: '• Guru memfasilitasi pembagian kelompok kerja dan pembagian tugas proyek.\n• Guru membimbing penyusunan aturan main, pemilihan alat bahan materi, dan kriteria penilaian produk.',
      studentActivity: '• Siswa berdiskusi merancang sketsa/desain produk proyek bersama kelompok.\n• Siswa menyusun daftar alat dan bahan serta membagi peran masing-masing anggota.'
    },
    {
      order: 3,
      name: 'Menyusun Jadwal Pembuatan (Create Schedule)',
      teacherActivity: '• Guru membimbing siswa menentukan batas waktu (timeline) tiap tahapan pembuatan proyek.\n• Guru memvalidasi kelayakan jadwal yang disusun oleh setiap kelompok.',
      studentActivity: '• Siswa merinci alokasi waktu mulai dari persiapan, pengerjaan, hingga uji coba produk.\n• Siswa menyepakati target capaian kerja kelompok.'
    },
    {
      order: 4,
      name: 'Memonitor Keaktifan dan Perkembangan Proyek',
      teacherActivity: '• Guru memantau keterlibatan aktif siswa selama proses pembuatan proyek materi.\n• Guru memberikan bimbingan teknis saat siswa mengalami hambatan dalam berkarya.',
      studentActivity: '• Siswa bekerja sama membuat karya/produk sesuai rancangan di kelompok.\n• Siswa mencatat progres kemajuan proyek dan berkonsultasi kepada guru bila ada kendala.'
    },
    {
      order: 5,
      name: 'Menguji Hasil & Gelar Karya (Assess the Outcome)',
      teacherActivity: '• Guru memfasilitasi sesi pameran atau presentasi karya di hadapan kelas.\n• Guru melakukan penilaian unjuk kerja berdasarkan rubrik asesmen produk materi.',
      studentActivity: '• Siswa memamerkan dan memperagakan cara kerja produk hasil proyeknya.\n• Siswa menjawab pertanyaan dan menerima masukan dari guru dan rekan kelas.'
    },
    {
      order: 6,
      name: 'Evaluasi Pengalaman Belajar (Evaluate Experience)',
      teacherActivity: '• Guru memandu refleksi menyeluruh atas seluruh rangkaian aktivitas proyek.\n• Guru memberikan apresiasi atas dedikasi dan kerja keras seluruh siswa.',
      studentActivity: '• Siswa menyampaikan perasaan, kebanggaan, dan pengalaman belajar berharga selama proyek.\n• Siswa menyimpulkan hikmah dan penguasaan konsep materi yang didapat.'
    }
  ],
  'discovery learning': [
    {
      order: 1,
      name: 'Pemberian Rangsangan (Stimulation)',
      teacherActivity: '• Guru menyajikan fenomena visual, benda konkret, atau teks bacaan terkait materi yang menimbulkan rasa penasaran.\n• Guru melarang pemberian jawaban langsung agar siswa terdorong menemukan sendiri.',
      studentActivity: '• Siswa mengamati demonstrasi atau bahan peraga materi dengan antusias.\n• Siswa menemukan keunikan atau keganjilan yang ingin diselidiki lebih lanjut.'
    },
    {
      order: 2,
      name: 'Pernyataan / Identifikasi Masalah (Problem Statement)',
      teacherActivity: '• Guru memberi kesempatan kepada siswa untuk mengidentifikasi pertanyaan penyelidikan terkait materi.\n• Guru membimbing siswa merumuskan hipotesis (jawaban dugaan sementara).',
      studentActivity: '• Siswa memilih pertanyaan esensial dan merumuskan hipotesis kelompok.\n• Siswa menuliskan hipotesis pada lembar kerja.'
    },
    {
      order: 3,
      name: 'Pengumpulan Data (Data Collection)',
      teacherActivity: '• Guru membagikan LKPD panduan eksplorasi materi dan alat/bahan yang dibutuhkan.\n• Guru mengarahkan siswa mengumpulkan bukti secara objektif.',
      studentActivity: '• Siswa melakukan manipulasi alat peraga materi, percobaan, atau membaca teks sumber belajar.\n• Siswa mencatat setiap data dan fakta temuan pada lembar kerja.'
    },
    {
      order: 4,
      name: 'Pengolahan Data (Data Processing)',
      teacherActivity: '• Guru membimbing siswa mengelompokkan, mengurutkan, dan menganalisis data temuan konsep materi.\n• Guru memastikan pemikiran siswa terarah pada pembuktian konsep.',
      studentActivity: '• Siswa berdiskusi dalam kelompok menafsirkan data yang diperoleh.\n• Siswa menjawab butir-butir pertanyaan analisis pada LKPD.'
    },
    {
      order: 5,
      name: 'Pembuktian (Verification)',
      teacherActivity: '• Guru memandu siswa membandingkan hasil olah data dengan hipotesis awal secara cermat.',
      studentActivity: '• Siswa memeriksa kembali apakah hipotesis terbukti benar atau tidak berdasarkan fakta data materi.\n• Siswa menyusun argumentasi ilmiah yang logis.'
    },
    {
      order: 6,
      name: 'Menarik Kesimpulan (Generalization)',
      teacherActivity: '• Guru memfasilitasi perumusan simpulan umum dan memberikan penguatan konsep materi bermakna.',
      studentActivity: '• Siswa merumuskan kesimpulan prinsip konsep materi secara mandiri dan membagikannya ke kelas.'
    }
  ],
  'inquiry': [
    {
      order: 1,
      name: 'Orientasi Masalah & Observasi',
      teacherActivity: '• Guru menghadirkan konteks masalah atau gejala ilmiah materi yang memancing investigasi.\n• Guru membatasi ruang lingkup penyelidikan agar fokus dan terarah.',
      studentActivity: '• Siswa mengamati gejala atau fenomena materi yang disajikan guru.\n• Siswa merespons dengan pertanyaan eksploratif.'
    },
    {
      order: 2,
      name: 'Merumuskan Masalah & Hipotesis',
      teacherActivity: '• Guru membimbing siswa menyusun rumusan masalah materi yang dapat diuji.\n• Guru melatih siswa merumuskan dugaan jawaban ilmiah.',
      studentActivity: '• Siswa berdiskusi merumuskan pertanyaan penyelidikan spesifik.\n• Siswa membuat hipotesis kerja bersama kelompok.'
    },
    {
      order: 3,
      name: 'Mengumpulkan Informasi / Percobaan',
      teacherActivity: '• Guru memfasilitasi prosedur pengumpulan data materi melalui LKPD investigasi.\n• Guru mengawasi keselamatan kerja dan kelancaran kegiatan.',
      studentActivity: '• Siswa melaksanakan tahapan investigasi secara cermat.\n• Siswa mengukur, mencatat gejala, dan menghimpun bukti kuantitatif/kualitatif materi.'
    },
    {
      order: 4,
      name: 'Menguji Hipotesis & Mengorganisasi Data',
      teacherActivity: '• Guru memandu analisis keterkaitan antardata materi yang telah diperoleh.',
      studentActivity: '• Siswa menghubungkan data hasil percobaan dengan teori pembanding.\n• Siswa memutuskan apakah hipotesis awal diterima atau ditolak.'
    },
    {
      order: 5,
      name: 'Merumuskan Kesimpulan & Refleksi',
      teacherActivity: '• Guru memfasilitasi sesi presentasi temuan dan memberikan klarifikasi konsep materi.',
      studentActivity: '• Siswa memaparkan simpulan investigasi dan merefleksikan proses belajar ilmiah.'
    }
  ],
  'think-pair-share': [
    {
      order: 1,
      name: 'Thinking (Berpikir Mandiri)',
      teacherActivity: '• Guru mengajukan pertanyaan pemantik yang membutuhkan penalaran mendalam terkait materi.\n• Guru memberikan waktu hening (think time 2-3 menit) bagi seluruh siswa untuk berpikir mandiri.',
      studentActivity: '• Siswa memikirkan jawaban secara mandiri tanpa berbicara dengan teman.\n• Siswa mencatat ide atau gagasan pemikirannya di lembar kerja.'
    },
    {
      order: 2,
      name: 'Pairing (Berpasangan)',
      teacherActivity: '• Guru menginstruksikan siswa berpasangan dengan teman sebangku.\n• Guru berkeliling memantau jalannya pertukaran ide materi antarpasangan.',
      studentActivity: '• Siswa saling menceritakan hasil pemikirannya kepada pasangannya.\n• Siswa membandingkan, menyatukan ide, dan menyepakati jawaban terbaik.'
    },
    {
      order: 3,
      name: 'Sharing (Berbagi ke Seluruh Kelas)',
      teacherActivity: '• Guru memanggil beberapa pasangan siswa secara acak untuk membagikan intisari diskusinya.\n• Guru merangkum seluruh gagasan siswa menjadi simpulan konsep materi bersama.',
      studentActivity: '• Perwakilan pasangan mempresentasikan hasil kesepakatannya ke seluruh kelas.\n• Siswa lain menyimak dan memberikan tanggapan yang konstruktif.'
    }
  ],
  'jigsaw': [
    {
      order: 1,
      name: 'Pembentukan Kelompok Asal (Home Group)',
      teacherActivity: '• Guru membagi siswa ke dalam kelompok asal heterogen (4-5 orang).\n• Guru membagikan subtopik materi yang berbeda kepada tiap anggota kelompok.',
      studentActivity: '• Siswa berkumpul di kelompok asal dan menerima subtopik tugas masing-masing.'
    },
    {
      order: 2,
      name: 'Diskusi Kelompok Ahli (Expert Group)',
      teacherActivity: '• Guru mengarahkan siswa yang memegang subtopik sama untuk berkumpul di kelompok ahli.\n• Guru membimbing proses pendalaman materi di kelompok ahli.',
      studentActivity: '• Siswa berdiskusi intensif di kelompok ahli, mengkaji materi, dan menyusun cara mengajar ke kelompok asal.'
    },
    {
      order: 3,
      name: 'Kembali ke Kelompok Asal & Transfer Pengetahuan',
      teacherActivity: '• Guru memantau setiap kelompok asal dan memastikan semua anggota mendapat giliran menjelaskan.',
      studentActivity: '• Tiap anggota secara bergantian mengajarkan subtopik ahlinya kepada teman sekelompok asal.'
    },
    {
      order: 4,
      name: 'Evaluasi & Konfirmasi Konsep',
      teacherActivity: '• Guru memberikan kuis evaluasi individual untuk mengukur penguasaan materi menyeluruh.',
      studentActivity: '• Siswa mengerjakan soal evaluasi secara mandiri dan menyimak pembahasan dari guru.'
    }
  ],
  'fids': [
    {
      order: 1,
      name: 'Feel (Merasakan & Menumbuhkan Empati)',
      teacherActivity: '• Guru mengajak siswa mengamati permasalahan sosial/lingkungan di sekitar terkait materi.\n• Guru membimbing siswa merasakan perasaan orang lain atau kondisi alam yang membutuhkan kepedulian.',
      studentActivity: '• Siswa mengamati dengan kepekaan hati, mengungkapkan apa yang dirasakan, dan menumbuhkan rasa kasih sayang.'
    },
    {
      order: 2,
      name: 'Imagine (Mengimajinasikan Solusi Penuh Cinta)',
      teacherActivity: '• Guru memandu siswa memikirkan ide-ide kreatif terkait materi yang dapat membawa perubahan positif dan kebaikan nyata.',
      studentActivity: '• Siswa berdiskusi dalam kelompok merancang ide solusi kebaikan yang dapat dipraktikkan secara nyata.'
    },
    {
      order: 3,
      name: 'Do (Melakukan Tindakan Nyata)',
      teacherActivity: '• Guru mendampingi siswa mewujudkan rancangan solusi ke dalam tindakan atau karya nyata yang bermanfaat.',
      studentActivity: '• Siswa bekerja sama melaksanakan rencana aksi/membuat karya bantuan dengan penuh keikhlasan.'
    },
    {
      order: 4,
      name: 'Share (Membagikan Inspirasi & Refleksi Kebaikan)',
      teacherActivity: '• Guru memfasilitasi sesi berbagi cerita inspiratif dan mengapresiasi setiap keteladanan yang ditunjukkan siswa.',
      studentActivity: '• Siswa menceritakan pengalaman melakukan kebaikan, merefleksikan perasaan bahagia saat berbagi, dan mengajak teman berbuat serupa.'
    }
  ],
  'mindful-meaningful-joyful': [
    {
      order: 1,
      name: 'Mindful Learning (Kesadaran Penuh & Kehadiran Hati)',
      teacherActivity: '• Guru mengajak siswa hening sejenak (mindful breathing / doa penghayatan).\n• Guru mengondisikan niat belajar materi karena cinta kepada Allah dan sesama manusia.\n• Guru memusatkan perhatian siswa agar siap menyerap ilmu dengan hati terbuka.',
      studentActivity: '• Siswa menarik napas dalam, merasakan ketenangan, dan menata niat belajar dengan ikhlas.\n• Siswa fokus menyimak arahan awal pembelajaran tanpa rasa tertekan.'
    },
    {
      order: 2,
      name: 'Meaningful Learning (Konstruksi Makna & Nilai Kasih Sayang)',
      teacherActivity: '• Guru mengaitkan materi secara mendalam dengan nilai-nilai kasih sayang, kebermanfaatan hidup, dan teladan mulia.\n• Guru mendampingi diskusi kelompok dengan suasana hangat dan penuh motivasi.',
      studentActivity: '• Siswa bereksplorasi dalam kelompok yang saling mendukung dan menghargai.\n• Siswa mendiskusikan makna materi bagi kebaikan diri dan lingkungan sekitar.'
    },
    {
      order: 3,
      name: 'Joyful Learning (Kegembiraan Belajar & Apresiasi Positif)',
      teacherActivity: '• Guru memfasilitasi aktivitas bermain peran / kuis edukatif / presentasi karya materi yang menyenangkan.\n• Guru memberikan apresiasi kasih sayang kepada seluruh siswa tanpa membeda-bedakan.',
      studentActivity: '• Siswa menampilkan hasil karya belajarnya dengan ceria dan penuh percaya diri.\n• Siswa saling memberikan pujian tulus dan merayakan keberhasilan belajar bersama.'
    }
  ],
  'explicit instruction': [
    {
      order: 1,
      name: 'Menyampaikan Tujuan dan Mempersiapkan Siswa',
      teacherActivity: '• Guru menyampaikan tujuan pembelajaran, materi yang akan dipelajari, dan mendemonstrasikan hasil akhir yang diharapkan.\n• Guru memeriksa pemahaman awal siswa terkait materi prasyarat.',
      studentActivity: '• Siswa menyimak penjelasan tujuan dengan seksama dan menjawab pertanyaan pembuka dari guru.'
    },
    {
      order: 2,
      name: 'Mendemonstrasikan Pengetahuan atau Keterampilan (I Do)',
      teacherActivity: '• Guru mendemonstrasikan langkah-langkah kerja atau konsep materi secara bertahap dan jelas.\n• Guru memberikan contoh benar dan contoh salah (non-contoh) untuk memperjelas konsep.',
      studentActivity: '• Siswa memperhatikan peragaan guru, mencatat poin kunci, dan menanyakan hal yang belum jelas.'
    },
    {
      order: 3,
      name: 'Membimbing Pelatihan (We Do)',
      teacherActivity: '• Guru memberikan latihan soal/tugas terbimbing di mana guru dan siswa menyelesaikan tugas bersama-sama.\n• Guru memberikan umpan balik langsung (corrective feedback) saat terjadi kesalahan.',
      studentActivity: '• Siswa mencoba menyelesaikan langkah tugas secara bersama-sama dengan bimbingan langsung guru.'
    },
    {
      order: 4,
      name: 'Mengecek Pemahaman dan Memberikan Umpan Balik',
      teacherActivity: '• Guru mengajukan pertanyaan cek pemahaman kepada beberapa siswa secara acak untuk mengukur kesiapan praktik mandiri.',
      studentActivity: '• Siswa merespons pertanyaan dan mengonfirmasi pemahaman konsep materi yang telah dipelajari.'
    },
    {
      order: 5,
      name: 'Memberikan Kesempatan Pelatihan Mandiri (You Do)',
      teacherActivity: '• Guru memberikan lembar tugas mandiri dan memantau siswa bekerja secara independen.',
      studentActivity: '• Siswa menyelesaikan tugas secara mandiri dengan penuh tanggung jawab dan percaya diri.'
    }
  ]
};

export const GENERIC_LEARNING_STEPS = [
  {
    order: 1,
    name: 'Orientasi & Eksplorasi Konsep Awal',
    teacherActivity: '• Guru membuka pembelajaran dengan media konkret/visual yang menarik.\n• Guru menggali pemahaman awal siswa melalui tanya jawab interaktif.\n• Guru menyampaikan konsep dasar materi secara komunikatif dan ramah anak.',
    studentActivity: '• Siswa mengamati penjelasan guru dan bahan peraga visual.\n• Siswa aktif merespons pertanyaan pemantik dan mengemukakan ide awalnya.'
  },
  {
    order: 2,
    name: 'Praktik Terbimbing & Eksplorasi Kelompok',
    teacherActivity: '• Guru membagikan LKPD dan membagi siswa ke dalam kelompok kerja heterogen.\n• Guru berkeliling memberikan bimbingan diferensiasi sesuai kebutuhan belajar tiap siswa.',
    studentActivity: '• Siswa berkolaborasi dalam kelompok menyelesaikan langkah-langkah tugas di LKPD.\n• Siswa memanipulasi alat peraga dan mendiskusikan pemecahan masalah materi.'
  },
  {
    order: 3,
    name: 'Berbagi Hasil & Diskusi Kelas',
    teacherActivity: '• Guru memfasilitasi sesi presentasi karya antarkelompok.\n• Guru memandu diskusi kelas yang demokratis, apresiatif, dan saling menghargai.',
    studentActivity: '• Perwakilan kelompok mempresentasikan hasil karyanya di depan kelas.\n• Siswa lain menyimak dengan tertib dan memberikan tanggapan positif.'
  },
  {
    order: 4,
    name: 'Penguatan Konsep & Refleksi Belajar',
    teacherActivity: '• Guru memberikan penguatan atas konsep-konsep esensial yang dipelajari.\n• Guru meluruskan miskonsepsi dan membimbing siswa menyimpulkan materi secara utuh.',
    studentActivity: '• Siswa mencatat intisari penguatan dari guru.\n• Siswa mengungkapkan refleksi perasaannya selama mengikuti proses pembelajaran.'
  }
];

function contextualizeSteps(
  steps: Array<{ order: number; name: string; teacherActivity: string; studentActivity: string }>,
  topik?: string,
  mapel?: string
): Array<{ order: number; name: string; teacherActivity: string; studentActivity: string }> {
  if (!topik && !mapel) return steps;
  const topicLabel = topik || mapel || 'pembelajaran';

  return steps.map(step => {
    const tAct = step.teacherActivity
      .replace(/terkait materi\b/gi, `terkait materi ${topicLabel}`)
      .replace(/konsep materi\b/gi, `konsep materi ${topicLabel}`)
      .replace(/materi pendukung\b/gi, `materi ${topicLabel}`)
      .replace(/bahan ajar pendukung materi\b/gi, `bahan ajar pendukung materi ${topicLabel}`)
      .replace(/alat peraga materi\b/gi, `alat peraga materi ${topicLabel}`);

    const sAct = step.studentActivity
      .replace(/terkait materi\b/gi, `terkait materi ${topicLabel}`)
      .replace(/materi yang disajikan\b/gi, `materi ${topicLabel} yang disajikan`)
      .replace(/pemecahan masalah materi\b/gi, `pemecahan masalah materi ${topicLabel}`);

    return {
      ...step,
      teacherActivity: tAct,
      studentActivity: sAct,
    };
  });
}

function integrateMethodsIntoSteps(
  steps: Array<{ order: number; name: string; teacherActivity: string; studentActivity: string }>,
  metodeList?: string[],
  topik?: string
): Array<{ order: number; name: string; teacherActivity: string; studentActivity: string }> {
  if (!metodeList || metodeList.length === 0) return steps;

  return steps.map((step, idx) => {
    let tAct = step.teacherActivity;
    let sAct = step.studentActivity;

    if (idx === 0) {
      if (metodeList.includes('Demonstrasi') && !tAct.includes('mendemonstrasikan')) {
        tAct += `\n• Guru mendemonstrasikan peragaan awal atau contoh konkret terkait ${topik || 'materi'}.`;
        sAct += `\n• Siswa mengamati demonstrasi peragaan guru dan mencatat hal penting.`;
      }
      if (metodeList.includes('Ceramah') && !tAct.includes('penjelasan interaktif')) {
        tAct += `\n• Guru menyampaikan penjelasan konsep dasar secara interaktif dan komunikatif.`;
      }
    } else if (idx === 1 || idx === 2) {
      if (metodeList.includes('Eksperimen') && !sAct.includes('eksperimen')) {
        tAct += `\n• Guru memandu prosedur eksperimen / uji coba menggunakan alat peraga yang tertera pada LKPD.`;
        sAct += `\n• Siswa melakukan eksperimen/uji coba secara berkelompok untuk membuktikan konsep ${topik || 'materi'}.`;
      }
      if (metodeList.includes('Diskusi') && !sAct.includes('berdiskusi')) {
        tAct += `\n• Guru memfasilitasi jalannya diskusi kelompok dan mendorong partisipasi aktif setiap anggota.`;
        sAct += `\n• Siswa berdiskusi secara mendalam dalam kelompok untuk memecahkan persoalan ${topik || 'materi'} pada LKPD.`;
      }
      if (metodeList.includes('Tanya Jawab') && !tAct.includes('tanya jawab')) {
        tAct += `\n• Guru mengajukan pertanyaan pemandu dan merespons pertanyaan kelompok melalui sesi tanya jawab.`;
        sAct += `\n• Siswa aktif bertanya mengenai kendala yang dihadapi saat eksplorasi tugas.`;
      }
      if (metodeList.includes('Role Playing') && !sAct.includes('bermain peran')) {
        tAct += `\n• Guru mengarahkan skenario bermain peran (role playing) yang relevan dengan topik ${topik || 'materi'}.`;
        sAct += `\n• Siswa mempraktikkan simulasi bermain peran sesuai pembagian peran dalam kelompok.`;
      }
    } else {
      if (metodeList.includes('Penugasan') && !sAct.includes('penugasan')) {
        tAct += `\n• Guru mengarahkan penyelesaian penugasan mandiri / kelompok pada lembar aktivitas.`;
        sAct += `\n• Siswa menyelesaikan penugasan terkait ${topik || 'materi'} dengan teliti dan penuh tanggung jawab.`;
      }
      if (metodeList.includes('Proyek') && !sAct.includes('karya')) {
        tAct += `\n• Guru memfasilitasi penyusunan dan peninjauan akhir produk karya peserta didik.`;
        sAct += `\n• Siswa menyempurnakan hasil karya proyek kelompok sebelum dipresentasikan.`;
      }
    }

    return {
      ...step,
      teacherActivity: tAct,
      studentActivity: sAct,
    };
  });
}

export function resolveLearningSyntax(
  dbSintaksKegiatan: any[] | null | undefined,
  dbSintaksInti: string[] | null | undefined,
  modelName: string | null | undefined,
  metodeList?: string[],
  topik?: string,
  mapel?: string
): ResolvedSyntax {
  // 1. Check ref_sintaks_kegiatan from DB
  if (dbSintaksKegiatan && dbSintaksKegiatan.length > 0) {
    const rawSteps = dbSintaksKegiatan.map(s => ({
      order: s.urutan,
      name: s.nama_langkah,
      teacherActivity: s.kegiatan_guru,
      studentActivity: s.kegiatan_siswa
    }));
    const contextualized = contextualizeSteps(rawSteps, topik, mapel);
    return {
      source: 'ref_sintaks_kegiatan',
      isCanonical: true,
      steps: integrateMethodsIntoSteps(contextualized, metodeList, topik)
    };
  }

  // 2. Check local rich model fallback (Priority for rich pedagogical narratives)
  const normModel = (modelName || '').toLowerCase().trim();
  for (const [key, steps] of Object.entries(LOCAL_MODEL_FALLBACKS)) {
    if (normModel.includes(key) || key.includes(normModel)) {
      const contextualized = contextualizeSteps(steps, topik, mapel);
      return {
        source: 'local_model_fallback',
        isCanonical: false,
        steps: integrateMethodsIntoSteps(contextualized, metodeList, topik),
        warning: `Sintaks rinci untuk "${modelName}" belum tersedia di database. Menggunakan model fallback deterministik.`
      };
    }
  }

  // 3. If model sintaks_inti array is available from ref_model_pembelajaran, generate rich steps
  if (dbSintaksInti && dbSintaksInti.length > 0) {
    const rawSteps = dbSintaksInti.map((stepName, idx) => ({
      order: idx + 1,
      name: stepName,
      teacherActivity: `• Guru memfasilitasi pelaksanaan tahapan ${stepName} pada materi ${topik || mapel || 'pembelajaran'} dengan bimbingan kontekstual dan diferensiasi belajar.\n• Guru mengamati interaksi belajar peserta didik dan memberikan scaffolding bila diperlukan.`,
      studentActivity: `• Siswa melaksanakan kegiatan pada tahapan ${stepName} materi ${topik || mapel || 'pembelajaran'} secara aktif bersama kelompok.\n• Siswa mencatat temuan dan mendiskusikan solusi tugas pada LKPD.`
    }));
    return {
      source: 'model_sintaks_inti',
      isCanonical: true,
      steps: integrateMethodsIntoSteps(rawSteps, metodeList, topik)
    };
  }

  // 4. Generic fallback
  const contextualized = contextualizeSteps(GENERIC_LEARNING_STEPS, topik, mapel);
  return {
    source: 'generic_fallback',
    isCanonical: false,
    steps: integrateMethodsIntoSteps(contextualized, metodeList, topik),
    warning: 'Sintaks rinci belum tersedia. Sistem menggunakan struktur pembelajaran umum agar Modul Ajar tetap dapat dibuat.'
  };
}
