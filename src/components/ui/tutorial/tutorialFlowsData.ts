import type { TutorialFlow } from './types';

export const tutorialFlows: TutorialFlow[] = [
  {
    id: 'dashboard-tour',
    title: 'Jelajahi Dashboard',
    description: 'Kenali ringkasan data dan widget di halaman utama',
    icon: '🏠',
    category: 'dasar',
    steps: [
      {
        id: 'nav-dashboard',
        route: '/dashboard',
        title: 'Menuju Dashboard',
        instruction: 'Membuka halaman utama...',
        action: 'navigate',
      },
      {
        id: 'dashboard-stats',
        target: '[data-tutorial="dashboard-stats"], .grid.grid-cols-2, section:first-of-type .grid',
        title: 'Kartu Statistik',
        instruction:
          'Ini kartu ringkasan kelas Anda: jumlah siswa, kehadiran, tugas aktif, dan nilai rata-rata. Klik salah satu untuk langsung ke halaman terkait.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 6000,
        fallbackInstruction:
          'Perhatikan kartu-kartu statistik di bagian atas halaman Dashboard.',
      },
      {
        id: 'dashboard-ai',
        target:
          '[data-tutorial="ai-insight"], [class*="AIInsight"], [class*="ai-insight"]',
        title: 'Analisis AI Harian',
        instruction:
          'AI menganalisis data kelas Anda dan memberikan rekomendasi: siswa yang perlu perhatian, tren kehadiran, dan saran tindakan.',
        action: 'observe',
        position: 'top',
        autoAdvanceMs: 6000,
        fallbackInstruction:
          'Scroll ke bawah untuk melihat widget Analisis Cerdas Harian.',
      },
      {
        id: 'dashboard-attendance-chart',
        target:
          '[class*="AttendanceStats"], [class*="recharts-wrapper"], .recharts-responsive-container',
        title: 'Grafik Kehadiran',
        instruction:
          'Grafik ini menunjukkan tren kehadiran mingguan. Hijau = hadir, merah = alpha. Arahkan kursor untuk detail angka.',
        action: 'observe',
        position: 'top',
        autoAdvanceMs: 5000,
      },
    ],
  },
  {
    id: 'absensi-practice',
    title: 'Praktik Isi Absensi',
    description: 'Langsung coba catat kehadiran siswa di halaman asli',
    icon: '📋',
    category: 'dasar',
    steps: [
      {
        id: 'go-absensi',
        target: '[href="/absensi"]',
        route: '/absensi',
        title: 'Buka Halaman Absensi',
        instruction:
          'Klik menu "Absensi" di sidebar kiri untuk membuka halaman rekap kehadiran.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'select-class-absensi',
        target: '[data-tutorial="class-selector"], [data-tutorial="class-pill"]',
        title: 'Pilih Kelas',
        instruction:
          'Klik salah satu tombol kelas (misal 3A, 3B) untuk memilih kelas yang ingin diabsen. Tanggal otomatis terisi hari ini.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'bottom',
        waitFor: '[data-tutorial="class-selector"]',
        fallbackInstruction:
          'Cari tombol-tombol nama kelas (3A, 3B, 3C) di bagian atas halaman, lalu klik salah satu.',
      },
      {
        id: 'mark-hadir',
        target:
          '[data-tutorial="attendance-status-group"], button[aria-label="Hadir"]',
        title: 'Tandai Kehadiran',
        instruction:
          'Klik tombol bulat H (Hadir), S (Sakit), I (Izin), atau A (Alpha) di samping nama siswa. Coba klik salah satu sekarang!',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'left',
        waitFor: '[data-tutorial="attendance-status-group"]',
        fallbackInstruction:
          'Pilih kelas terlebih dahulu agar daftar siswa muncul, lalu klik tombol status kehadiran (H/S/I/A) di samping nama siswa.',
      },
      {
        id: 'save-absensi',
        target: '[data-tutorial="attendance-save"]',
        title: 'Simpan Data',
        instruction:
          'Setelah menandai siswa, tombol "Simpan" muncul di bawah layar. Klik untuk menyimpan absensi. Data langsung tersinkronisasi.',
        action: 'observe',
        position: 'top',
        autoAdvanceMs: 6000,
        waitFor: '[data-tutorial="attendance-save"]',
        fallbackInstruction:
          'Setelah menandai kehadiran minimal satu siswa, tombol Simpan akan muncul di bagian bawah halaman.',
      },
    ],
  },
  {
    id: 'siswa-practice',
    title: 'Kelola Data Siswa',
    description: 'Cari siswa, lihat profil, dan kelola data lengkap',
    icon: '👨‍🎓',
    category: 'dasar',
    steps: [
      {
        id: 'go-siswa',
        target: '[href="/siswa"]',
        route: '/siswa',
        title: 'Buka Data Siswa',
        instruction:
          'Klik menu "Data Siswa" di sidebar untuk melihat daftar semua siswa.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'search-siswa',
        target:
          'input[type="search"], input[placeholder*="Cari" i], input[placeholder*="cari" i], input[aria-label*="Cari" i]',
        title: 'Cari Nama Siswa',
        instruction:
          'Ketik nama siswa di kotak pencarian ini. Coba ketik 2-3 huruf pertama nama salah satu siswa Anda.',
        action: 'interact',
        position: 'bottom',
        autoAdvanceMs: 7000,
        fallbackInstruction:
          'Gunakan kotak pencarian di bagian atas untuk mencari siswa berdasarkan nama atau NIS.',
      },
      {
        id: 'click-siswa',
        target:
          'table tbody tr, [class*="student"] a, [class*="card"] a, [class*="list-item"]',
        title: 'Buka Profil Siswa',
        instruction:
          'Klik nama salah satu siswa untuk membuka halaman detail: profil lengkap, nilai, kehadiran, dan catatan.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'bottom',
        fallbackInstruction:
          'Klik salah satu nama siswa dari daftar untuk melihat detail profilnya.',
      },
    ],
  },
  {
    id: 'jadwal-practice',
    title: 'Atur Jadwal Mengajar',
    description: 'Lihat jadwal mingguan dan tambah jadwal baru',
    icon: '📅',
    category: 'dasar',
    steps: [
      {
        id: 'go-jadwal',
        target: '[href="/jadwal"]',
        route: '/jadwal',
        title: 'Buka Jadwal',
        instruction:
          'Klik menu "Jadwal" di sidebar untuk melihat jadwal mengajar mingguan.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'view-jadwal',
        target: 'table, [class*="schedule"], [class*="jadwal"], [class*="grid"]',
        title: 'Jadwal Mingguan',
        instruction:
          'Ini jadwal mengajar Anda per hari. Setiap baris menunjukkan jam, mata pelajaran, dan kelas. Perhatikan jadwal hari ini.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
      {
        id: 'add-jadwal',
        target:
          'button[class*="add"], button[class*="tambah"], button[class*="create"], button:has(svg[class*="Plus"])',
        title: 'Tambah Jadwal Baru',
        instruction:
          'Klik tombol "Tambah" untuk membuat jadwal baru. Isi hari, jam mulai-selesai, mata pelajaran, dan kelas.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
        fallbackInstruction:
          'Cari tombol "+" atau "Tambah Jadwal" untuk menambahkan jadwal baru.',
      },
    ],
  },
  {
    id: 'tugas-practice',
    title: 'Buat & Kelola Tugas',
    description: 'Praktik membuat tugas/PR dan pantau pengumpulan',
    icon: '✅',
    category: 'dasar',
    steps: [
      {
        id: 'go-tugas',
        target: '[href="/tugas"]',
        route: '/tugas',
        title: 'Buka Manajemen Tugas',
        instruction:
          'Klik menu "Tugas" di sidebar untuk membuka halaman manajemen tugas.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'view-tugas',
        target: '[class*="task"], [class*="tugas"], main > div',
        title: 'Daftar Tugas',
        instruction:
          'Di sini semua tugas yang pernah dibuat. Perhatikan status (Aktif/Selesai) dan deadline masing-masing tugas.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
      {
        id: 'create-tugas',
        target:
          'button[class*="add"], button[class*="tambah"], button[class*="create"], button[class*="buat"]',
        title: 'Buat Tugas Baru',
        instruction:
          'Klik tombol "Buat Tugas" untuk membuat tugas baru. Isi judul, deskripsi, pilih kelas, dan tentukan deadline.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
        fallbackInstruction: 'Cari tombol "Buat Tugas Baru" atau "+" di halaman ini.',
      },
    ],
  },
  {
    id: 'input-nilai-practice',
    title: 'Manajemen Siswa',
    description: 'Input nilai banyak siswa sekaligus dalam satu halaman',
    icon: '📝',
    category: 'dasar',
    steps: [
      {
        id: 'go-input',
        target: '[href="/input-massal"]',
        route: '/input-massal',
        title: 'Buka Manajemen Siswa',
        instruction:
          'Klik menu "Manajemen Siswa" di sidebar untuk membuka halaman input nilai massal.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'select-mapel',
        target: 'select, [role="combobox"], [class*="select"]',
        title: 'Pilih Kelas & Mapel',
        instruction:
          'Pilih kelas dan mata pelajaran dari dropdown. Setelah dipilih, tabel siswa akan muncul.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'bottom',
      },
      {
        id: 'input-nilai',
        target:
          'input[type="number"], input[inputmode="numeric"], table input, [class*="grade"] input',
        title: 'Ketik Nilai Siswa',
        instruction:
          'Ketik nilai (0-100) di kolom masing-masing siswa. Tekan Tab untuk pindah ke siswa berikutnya dengan cepat.',
        action: 'interact',
        position: 'right',
        autoAdvanceMs: 7000,
        fallbackInstruction:
          'Isi nilai di kolom input yang tersedia untuk setiap siswa.',
      },
    ],
  },
  {
    id: 'brankas-practice',
    title: 'Gunakan Brankas Kelas',
    description: 'Upload dan kelola dokumen penting kelas',
    icon: '📁',
    category: 'lanjutan',
    steps: [
      {
        id: 'go-brankas',
        target: '[href="/brankas"]',
        route: '/brankas',
        title: 'Buka Brankas',
        instruction:
          'Klik menu "Brankas Kelas" di sidebar untuk membuka penyimpanan dokumen.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'view-files',
        target:
          '[class*="file"], [class*="folder"], [class*="document"], main > div',
        title: 'Lihat Dokumen',
        instruction:
          'Di sini semua file dan folder Anda tersimpan. Klik folder untuk membukanya, klik file untuk preview.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
      {
        id: 'upload-file',
        target:
          'button[class*="upload"], button[class*="tambah"], input[type="file"], [class*="dropzone"]',
        title: 'Upload File',
        instruction:
          'Klik tombol "Upload" atau drag & drop file ke area ini. Mendukung PDF, Word, Excel, dan gambar.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
        fallbackInstruction:
          'Cari tombol Upload atau area drag & drop untuk mengunggah file baru.',
      },
    ],
  },
  {
    id: 'analytics-practice',
    title: 'Baca Analytics & Grafik',
    description: 'Pahami statistik performa kelas dari grafik',
    icon: '📊',
    category: 'lanjutan',
    steps: [
      {
        id: 'go-analytics',
        target: '[href="/analytics"]',
        route: '/analytics',
        title: 'Buka Analytics',
        instruction:
          'Klik menu "Perkembangan Siswa" di sidebar untuk melihat statistik dan grafik performa.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'analytics-tabs',
        target: '#tour-tabs, [class*="tab"], [role="tablist"]',
        title: 'Pilih Kategori',
        instruction:
          'Gunakan tab di atas untuk beralih antara kategori analisis: Kehadiran, Nilai, Performa, dll. Coba klik salah satu.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'bottom',
      },
      {
        id: 'analytics-chart',
        target:
          '.recharts-responsive-container, [class*="chart"], svg[class*="recharts"]',
        title: 'Baca Grafik',
        instruction:
          'Arahkan kursor ke grafik untuk melihat detail angka. Hijau = baik, kuning = perlu perhatian, merah = kritis.',
        action: 'observe',
        position: 'top',
        autoAdvanceMs: 6000,
        fallbackInstruction:
          'Perhatikan grafik-grafik yang menampilkan tren data kelas Anda.',
      },
    ],
  },
  {
    id: 'ekskul-practice',
    title: 'Kelola Ekstrakurikuler',
    description: 'Daftarkan siswa dan catat kegiatan ekskul',
    icon: '🏆',
    category: 'lanjutan',
    steps: [
      {
        id: 'go-ekskul',
        target: '[href="/ekstrakurikuler"]',
        route: '/ekstrakurikuler',
        title: 'Buka Ekstrakurikuler',
        instruction:
          'Klik menu "Ekstrakurikuler" di sidebar untuk mengelola kegiatan ekskul.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'view-ekskul',
        target:
          '[class*="card"], [class*="ekskul"], [class*="extracurricular"], main > div > div',
        title: 'Daftar Kegiatan',
        instruction:
          'Semua kegiatan ekskul ditampilkan sebagai kartu. Klik salah satu untuk melihat detail anggota dan jadwal.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
      {
        id: 'add-ekskul',
        target:
          'button[class*="add"], button[class*="tambah"], button[class*="create"]',
        title: 'Tambah Kegiatan',
        instruction:
          'Klik tombol "Tambah" untuk membuat kegiatan ekskul baru. Isi nama, jadwal, dan pembina kegiatan.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
    ],
  },
  {
    id: 'pengaturan-practice',
    title: 'Atur Profil & Tampilan',
    description: 'Ubah profil, password, dan tema aplikasi',
    icon: '⚙️',
    category: 'lanjutan',
    steps: [
      {
        id: 'go-settings',
        target: '[href="/pengaturan"]',
        route: '/pengaturan',
        title: 'Buka Pengaturan',
        instruction:
          'Klik menu "Pengaturan" di sidebar untuk mengatur profil dan preferensi.',
        action: 'click',
        advanceOnTargetClick: true,
        position: 'right',
      },
      {
        id: 'view-settings',
        target: 'form, [class*="profile"], [class*="setting"], [class*="tab"]',
        title: 'Pengaturan Profil',
        instruction:
          'Di sini Anda bisa mengubah nama, foto, email, dan password. Jelajahi tab-tab yang tersedia.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
      },
      {
        id: 'theme-toggle',
        target:
          'button[aria-label*="theme" i], button[aria-label*="tema" i], [class*="theme-toggle"], [class*="dark-mode"]',
        title: 'Ganti Tema',
        instruction:
          'Coba klik toggle tema di header (ikon matahari/bulan) untuk beralih antara mode Terang dan Gelap.',
        action: 'observe',
        position: 'bottom',
        autoAdvanceMs: 5000,
        fallbackInstruction:
          'Cari ikon matahari/bulan di header untuk mengganti tema tampilan.',
      },
    ],
  },
];
