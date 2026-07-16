export interface BoilerplateContent {
  tujuanPembelajaran: string[];
  pemahamanBermakna: string[];
  pertanyaanPemantik: string[];
  kegiatanPendahuluan: string[];
  kegiatanInti: { fase: string; kegiatanGuru: string; kegiatanSiswa: string }[];
  kegiatanPenutup: string[];
  asesmenSikap: string[];
  asesmenKeterampilan: string[];
  asesmenPengetahuan: string;
  pengayaan: string[];
  remedial: string[];
  lkpdTugas: string;
  soalEvaluasi: string;
  daftarPustaka: string[];
}

export const TOPIC_RECOMMENDATIONS: Record<string, string[]> = {
  'Matematika': ['Penjumlahan', 'Pengurangan', 'Perkalian', 'Pembagian', 'Pecahan', 'Bangun Datar'],
  'IPAS': ['Fotosintesis', 'Siklus Air', 'Bagian Tubuh Tumbuhan', 'Wujud Zat & Perubahannya', 'Gaya & Gerak'],
  'Pancasila': ['Simbol & Sila Pancasila', 'Hak & Kewajiban', 'Gotong Royong', 'Keragaman Budaya'],
  'Bahasa Indonesia': ['Membaca & Menulis Kata', 'Menyimak Cerita', 'Menulis Karangan', 'Apresiasi Puisi'],
};

const DATABASE: Record<string, Record<string, Partial<BoilerplateContent>>> = {
  'matematika': {
    'penjumlahan': {
      tujuanPembelajaran: [
        'Peserta didik dapat memahami konsep penjumlahan bilangan cacah hingga 100 menggunakan alat peraga.',
        'Peserta didik mampu menyelesaikan masalah konkrit sehari-hari yang berkaitan dengan penjumlahan.'
      ],
      pemahamanBermakna: [
        'Kemampuan menjumlahkan membantu kita menghitung total barang belanjaan, mengumpulkan benda, dan mengelola waktu.'
      ],
      pertanyaanPemantik: [
        'Jika kamu memiliki 5 pensil dan temanmu memberikan 3 pensil lagi, berapa banyak pensilmu sekarang?',
        'Bagaimana cara menjumlahkan angka dengan cepat tanpa menulis di kertas?'
      ],
      lkpdTugas: 'Petunjuk Kerja kelompok:\n1. Ambil 10 buah stik es krim yang ada di meja.\n2. Gabungkan 4 stik merah dengan 6 stik hijau.\n3. Hitunglah total stik gabungan tersebut!\n4. Tuliskan kalimat matematikanya di lembar kertas!',
      soalEvaluasi: '1. Hitunglah hasil dari 34 + 25 = ...!\n2. Ibu membeli 12 jeruk, ayah membeli 15 jeruk. Berapakah jumlah seluruh jeruk yang dibeli?\n3. Jelaskan cara bersusun pendek untuk menghitung 47 + 28!',
      daftarPustaka: ['Buku Panduan Guru Matematika SD/MI Kelas 1 Kemendikbudristek.', 'Sumber belajar digital platform Guru Belajar Matematika.']
    },
    'perkalian': {
      tujuanPembelajaran: [
        'Peserta didik dapat memahami perkalian sebagai penjumlahan berulang melalui demonstrasi konkrit.',
        'Peserta didik mampu menghafal tabel perkalian dasar 1 sampai 10.'
      ],
      pemahamanBermakna: [
        'Perkalian mempermudah kita menghitung benda dalam jumlah kelompok yang sama secara cepat.'
      ],
      pertanyaanPemantik: [
        'Ada 3 kotak pensil, masing-masing berisi 5 pensil. Bagaimana cara menghitung total pensil dengan cepat?',
        'Mengapa perkalian disebut sebagai penjumlahan yang berulang?'
      ],
      lkpdTugas: 'Aktivitas Diskusi:\n1. Siapkan wadah plastik kecil sebanyak 4 buah.\n2. Masukkan 3 kelereng ke dalam setiap wadah.\n3. Gambarkan posisi kelereng dan tuliskan bentuk penjumlahan berulangnya!\n4. Ubah bentuk penjumlahan berulang tersebut ke dalam operasi perkalian!',
      soalEvaluasi: '1. Ubahlah penjumlahan berikut ke perkalian: 4 + 4 + 4 + 4 + 4 = ... x ... = ...\n2. Sebuah meja memiliki 4 kaki. Berapakah jumlah total kaki dari 6 buah meja?\n3. Hitunglah hasil dari 8 x 7 = ...!',
      daftarPustaka: ['Buku Siswa Matematika SD/MI Kelas 3 Kemendikbudristek.', 'Alat peraga matematika dekak-dekak perkalian.']
    }
  },
  'ipas': {
    'fotosintesis': {
      tujuanPembelajaran: [
        'Peserta didik dapat mengidentifikasi bahan-bahan yang diperlukan tumbuhan untuk melakukan proses fotosintesis.',
        'Peserta didik dapat menjelaskan proses fotosintesis dan pentingnya oksigen bagi kehidupan.'
      ],
      pemahamanBermakna: [
        'Tumbuhan adalah produsen makanan di bumi yang menghasilkan oksigen bagi manusia dan hewan untuk bernapas.'
      ],
      pertanyaanPemantik: [
        'Bagaimana tumbuhan bisa makan padahal mereka tidak punya mulut dan tidak bisa berjalan?',
        'Mengapa kita merasa segar saat berada di bawah pohon rindang pada siang hari?'
      ],
      lkpdTugas: 'Eksperimen Sederhana:\n1. Siapkan dua pot tanaman kecil yang sejenis.\n2. Letakkan Pot A di area terbuka terkena sinar matahari, dan Pot B di dalam kardus gelap.\n3. Siram keduanya secara teratur selama 3 hari.\n4. Amati perbedaan kesegaran daun pada kedua tanaman tersebut dan diskusikan hasilnya!',
      soalEvaluasi: '1. Sebutkan 4 bahan utama yang dibutuhkan tumbuhan untuk melakukan fotosintesis!\n2. Gas apakah yang diserap dan gas apa yang dilepaskan selama proses fotosintesis?\n3. Mengapa cahaya matahari sangat penting bagi kelangsungan hidup tumbuhan?',
      daftarPustaka: ['Buku Panduan Guru IPAS SD Kelas 4 Kemendikbudristek.', 'Modul Pembelajaran Proses Kehidupan Tumbuhan Direktorat SD.']
    }
  }
};

export const getManualBoilerplate = (
  subject: string,
  topic: string,
  classNum: string,
  phase: string,
  syntaxSteps: string[] = ['Pendahuluan', 'Kegiatan Inti', 'Penutup']
): BoilerplateContent => {
  const normSubject = subject.trim().toLowerCase();
  const normTopic = topic.trim().toLowerCase();

  // 1. Check database for match
  const subjectDb = DATABASE[normSubject] || DATABASE[normSubject.replace('ipas', 'ipa')];
  const matchedContent = subjectDb ? subjectDb[normTopic] : undefined;

  // 2. Default boilerplates (Smart Interpolation for Custom Topics)
  const defaultTP = [
    `Peserta didik dapat menganalisis dan memahami konsep utama dari materi ${topic} secara terstruktur.`,
    `Peserta didik mampu mendemonstrasikan keterampilan atau menyelesaikan persoalan praktis terkait ${topic} di kelas.`
  ];
  
  const defaultPB = [
    `Mempelajari ${topic} membekali peserta didik dengan kecakapan berpikir kritis dan pemecahan masalah yang berguna dalam kehidupan sehari-hari.`
  ];

  const defaultPP = [
    `Apa yang kalian pikirkan saat mendengar kata "${topic}"?`,
    `Bagaimana penerapan materi ${topic} ini membantu mempermudah kehidupan kita di sekitar?`
  ];

  const defaultPendahuluan = [
    'Guru membuka kegiatan pembelajaran dengan mengucapkan salam hangat dan mengajak siswa berdoa bersama dipimpin oleh salah satu siswa.',
    'Guru mengecek kehadiran siswa serta menanyakan kesiapan fisik dan mental mereka untuk belajar.',
    'Guru melakukan apersepsi dengan mengaitkan materi prasyarat dengan topik baru yaitu ' + topic + '.',
    'Guru menyampaikan tujuan pembelajaran hari ini dan memberikan motivasi belajar.'
  ];

  const defaultKegiatanInti = syntaxSteps.map((s, idx) => ({
    fase: `Langkah ${idx + 1}: ${s}`,
    kegiatanGuru: `Guru mengarahkan dan membimbing aktivitas siswa pada tahap ${s.toLowerCase()} terkait konsep ${topic}.`,
    kegiatanSiswa: `Siswa secara aktif berpartisipasi, berdiskusi, dan melaksanakan arahan guru pada tahap ${s.toLowerCase()}.`
  }));

  const defaultPenutup = [
    'Guru memandu siswa melakukan refleksi bersama mengenai apa saja yang telah dipahami dari materi ' + topic + '.',
    'Guru bersama siswa menarik kesimpulan bersama terkait pembelajaran hari ini.',
    'Guru memberikan apresiasi atas performa aktif siswa selama pembelajaran.',
    'Guru memberikan tindak lanjut berupa tugas bacaan dan menutup pembelajaran dengan doa bersama.'
  ];

  const defaultSikap = [
    'Penilaian sikap spiritual: berdo\'a sebelum/sesudah belajar.',
    'Penilaian sikap sosial: kerjasama, keaktifan berdiskusi, sopan santun, dan kemandirian.'
  ];

  const defaultKeterampilan = [
    'Penilaian unjuk kerja saat mempresentasikan hasil diskusi/pekerjaan terkait ' + topic + '.',
    'Kerapian dan ketepatan pengisian lembar aktivitas.'
  ];

  const defaultLKPD = `LEMBAR KERJA PESERTA DIDIK (LKPD)\n\nMata Pelajaran: ${subject}\nKelas: ${classNum} (Fase ${phase})\nMateri Pokok: ${topic}\n\nPetunjuk Belajar:\n1. Tuliskan nama anggota kelompok Anda pada kolom yang disediakan.\n2. Diskusikan bersama rekan kelompok konsep dasar dari ${topic}.\n3. Cari contoh penerapan ${topic} di lingkungan sekitar sekolah.\n4. Tuliskan kesimpulan hasil diskusi kelompok Anda di bawah ini!`;
  
  const defaultEvaluasi = `1. Jelaskan pemahamanmu mengenai konsep dasar dari ${topic}!\n2. Tuliskan 2 contoh nyata penggunaan ${topic} di lingkungan rumahmu!\n3. Tuliskan hambatan yang kamu temui saat mempelajari ${topic} hari ini!`;

  const defaultPustaka = [
    `Buku Panduan Guru dan Buku Siswa Kurikulum Merdeka ${subject} Kelas ${classNum} Kemendikbudristek.`,
    `Sumber online dan media lingkungan sekitar sekolah yang relevan dengan ${topic}.`
  ];

  return {
    tujuanPembelajaran: matchedContent?.tujuanPembelajaran || defaultTP,
    pemahamanBermakna: matchedContent?.pemahamanBermakna || defaultPB,
    pertanyaanPemantik: matchedContent?.pertanyaanPemantik || defaultPP,
    kegiatanPendahuluan: matchedContent?.kegiatanPendahuluan || defaultPendahuluan,
    kegiatanInti: matchedContent?.kegiatanInti || defaultKegiatanInti,
    kegiatanPenutup: matchedContent?.kegiatanPenutup || defaultPenutup,
    asesmenSikap: matchedContent?.asesmenSikap || defaultSikap,
    asesmenKeterampilan: matchedContent?.asesmenKeterampilan || defaultKeterampilan,
    asesmenPengetahuan: matchedContent?.asesmenPengetahuan || 'Tes tertulis di akhir pembelajaran menggunakan lembar evaluasi.',
    pengayaan: matchedContent?.pengayaan || [`Diberikan materi bacaan yang lebih mendalam dan tugas analisis kasus nyata tentang ${topic}.`],
    remedial: matchedContent?.remedial || [`Diberikan bimbingan terfokus atau pengerjaan ulang latihan soal dasar terkait ${topic}.`],
    lkpdTugas: matchedContent?.lkpdTugas || defaultLKPD,
    soalEvaluasi: matchedContent?.soalEvaluasi || defaultEvaluasi,
    daftarPustaka: matchedContent?.daftarPustaka || defaultPustaka,
  };
};

export const RUBRIK_TEMPLATES = {
  'diskusi': [
    {
      kriteria: 'Keaktifan Diskusi',
      sangatBaik: 'Siswa aktif memberikan ide secara konsisten dan memimpin jalannya diskusi.',
      baik: 'Siswa aktif memberikan ide beberapa kali selama diskusi.',
      cukup: 'Siswa sesekali memberikan pendapat jika ditanya.',
      perluBimbingan: 'Siswa pasif dan tidak memberikan pendapat sama sekali.'
    },
    {
      kriteria: 'Kerjasama Kelompok',
      sangatBaik: 'Sangat kooperatif, membantu teman kelompok, dan berbagi tugas dengan adil.',
      baik: 'Kooperatif dan melaksanakan tugas kelompok yang diberikan.',
      cukup: 'Hanya mau bekerjasama setelah mendapat dorongan guru.',
      perluBimbingan: 'Tidak mau bekerjasama dan mengganggu konsentrasi kelompok.'
    },
    {
      kriteria: 'Menghargai Pendapat',
      sangatBaik: 'Mendengarkan dengan penuh hormat dan menanggapi ide teman dengan bahasa yang sangat sopan.',
      baik: 'Mendengarkan pendapat teman dan tidak memotong pembicaraan.',
      cukup: 'Sesekali memotong pembicaraan atau kurang menghormati pendapat teman.',
      perluBimbingan: 'Sama sekali tidak menghargai pendapat orang lain.'
    }
  ],
  'presentasi': [
    {
      kriteria: 'Penguasaan Materi',
      sangatBaik: 'Menjelaskan konsep secara mendalam tanpa melihat catatan dan menjawab pertanyaan dengan tepat.',
      baik: 'Menjelaskan konsep dengan baik tetapi sesekali melihat catatan.',
      cukup: 'Membaca sebagian besar slide/catatan saat menjelaskan materi.',
      perluBimbingan: 'Tidak memahami materi dan hanya membaca slide tanpa penjelasan.'
    },
    {
      kriteria: 'Kemampuan Berbicara',
      sangatBaik: 'Suara terdengar jelas di seluruh kelas, intonasi menarik, dan sangat percaya diri.',
      baik: 'Suara jelas tetapi intonasi agak monoton.',
      cukup: 'Suara lirih dan kurang terdengar jelas di bagian belakang kelas.',
      perluBimbingan: 'Bergumam, tidak terdengar, dan terlihat sangat cemas.'
    },
    {
      kriteria: 'Sikap Kerja',
      sangatBaik: 'Kontak mata konsisten dengan audiens, gestur tubuh natural, dan sopan.',
      baik: 'Ada kontak mata sesekali, berdiri dengan tegak dan sopan.',
      cukup: 'Kurang kontak mata dan berdiri kurang tegap.',
      perluBimbingan: 'Membelakangi audiens sepanjang presentasi.'
    }
  ],
  'sikap': [
    {
      kriteria: 'Kemandirian Belajar',
      sangatBaik: 'Memulai tugas sendiri tanpa diperintah, fokus penuh, dan menyelesaikan tepat waktu.',
      baik: 'Mengerjakan tugas dengan tertib dan selesai tepat waktu.',
      cukup: 'Membutuhkan dorongan guru beberapa kali untuk menyelesaikan tugas.',
      perluBimbingan: 'Tidak menyelesaikan tugas meskipun sudah dibimbing guru.'
    },
    {
      kriteria: 'Bernalar Kritis',
      sangatBaik: 'Sering bertanya kritis, menganalisis masalah secara mandiri, dan memberi argumen logis.',
      baik: 'Menjawab pertanyaan guru dengan penjelasan logis.',
      cukup: 'Hanya menjawab secara singkat tanpa disertai alasan.',
      perluBimbingan: 'Belum mampu memberikan tanggapan atau alasan logis.'
    }
  ]
};
