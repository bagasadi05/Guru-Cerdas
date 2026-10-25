import React from 'react';
import {
    HelpCircle,
    CheckCircle,
    ClipboardCheck,
    Users,
    BookOpen,
    Calendar,
    Star,
    WifiOff,
    BarChart3,
    Award,
    MessageCircle,
    Settings,
    Activity,
} from 'lucide-react';
import type { FAQItem, SimpleGuide, CategoryTab } from '../types';

export const faqItems: FAQItem[] = [
    {
        id: 'faq-reset-password',
        question: 'Bagaimana cara reset password?',
        answer: 'Klik "Lupa Password" di halaman login, masukkan email Anda, lalu cek email untuk link reset password.',
        keywords: ['password', 'lupa', 'reset', 'ganti'],
    },
    {
        id: 'faq-offline',
        question: 'Apakah aplikasi bisa digunakan offline?',
        answer: 'Ya! Aplikasi ini mendukung mode offline. Data akan otomatis tersimpan dan disinkronkan saat koneksi kembali.',
        keywords: ['offline', 'internet', 'koneksi', 'sync'],
    },
    {
        id: 'faq-data-aman',
        question: 'Apakah data saya aman?',
        answer: 'Sangat aman! Semua data dienkripsi dan disimpan di server yang aman. Backup otomatis dilakukan setiap hari.',
        keywords: ['aman', 'keamanan', 'data', 'enkripsi', 'backup'],
    },
    {
        id: 'faq-hapus-siswa',
        question: 'Bagaimana cara menghapus data siswa?',
        answer: 'Buka detail siswa, klik tombol "Hapus". Data akan masuk ke Sampah dan bisa dipulihkan dalam 30 hari.',
        keywords: ['hapus', 'siswa', 'delete', 'sampah'],
    },
    {
        id: 'faq-install-hp',
        question: 'Bagaimana cara install di HP?',
        answer: 'Buka aplikasi di browser HP, lalu pilih "Tambahkan ke Layar Utama" dari menu browser. Aplikasi akan terinstall seperti app biasa.',
        keywords: ['install', 'hp', 'handphone', 'android', 'ios', 'mobile', 'pwa'],
    },
    {
        id: 'faq-export',
        question: 'Bagaimana cara export data ke Excel/PDF?',
        answer: 'Di setiap halaman (Absensi, Siswa, Nilai), cari tombol "Export" atau ikon download di pojok kanan atas. Pilih format PDF atau Excel.',
        keywords: ['export', 'excel', 'pdf', 'download', 'cetak'],
    },
];

export const simpleGuides: SimpleGuide[] = [
    {
        id: 'absensi',
        title: '📋 Cara Isi Absensi',
        icon: <ClipboardCheck className="w-8 h-8" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        category: 'dasar',
        keywords: ['absensi', 'hadir', 'kehadiran', 'alpha', 'izin', 'sakit'],
        steps: [
            {
                title: '1️⃣ Buka Menu Absensi',
                description: 'Klik tulisan "Rekap Absensi" di sebelah kiri layar. Ada gambar kalender di sebelahnya.',
                tip: 'Kalau pakai HP, tekan tombol menu (☰) dulu di pojok kiri atas.',
            },
            {
                title: '2️⃣ Pilih Kelas',
                description: 'Di bagian atas, ada kotak pilihan. Klik dan pilih kelas yang mau diabsen. Contoh: "Kelas 7A"',
                tip: 'Tanggal otomatis hari ini. Tidak perlu diubah.',
            },
            {
                title: '3️⃣ Tandai Kehadiran',
                description: 'Untuk setiap nama siswa, klik tombol:\n• H = Hadir (hijau)\n• I = Izin (biru)\n• S = Sakit (kuning)\n• A = Alpha/Tidak hadir (merah)',
                tip: 'Klik tombol "H" untuk siswa yang hadir.',
            },
            {
                title: '4️⃣ Selesai!',
                description: 'Klik tombol "Simpan" di bagian bawah. Data tersimpan otomatis.',
                tip: 'Salah pilih? Klik tombol lain untuk mengubahnya.',
            },
        ],
    },
    {
        id: 'siswa',
        title: '👨‍🎓 Cara Lihat Data Siswa',
        icon: <Users className="w-8 h-8" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        category: 'dasar',
        keywords: ['siswa', 'murid', 'data', 'profil', 'cari'],
        steps: [
            {
                title: '1️⃣ Buka Menu Siswa',
                description: 'Klik tulisan "Data Siswa" di sebelah kiri layar. Ada gambar orang-orang di sebelahnya.',
            },
            {
                title: '2️⃣ Cari Nama Siswa',
                description: 'Di bagian atas ada kotak pencarian. Ketik nama siswa yang dicari.',
                tip: 'Contoh: Ketik "Budi" untuk mencari siswa bernama Budi.',
            },
            {
                title: '3️⃣ Klik Nama Siswa',
                description: 'Klik nama siswa yang muncul untuk melihat data lengkapnya: nilai, kehadiran, dan informasi lainnya.',
            },
            {
                title: '4️⃣ Selesai!',
                description: 'Anda bisa lihat semua data siswa di halaman ini.',
            },
        ],
    },
    {
        id: 'nilai',
        title: '📝 Cara Input Nilai',
        icon: <BookOpen className="w-8 h-8" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        category: 'dasar',
        keywords: ['nilai', 'rapor', 'input', 'angka', 'skor'],
        steps: [
            {
                title: '1️⃣ Buka Input Nilai',
                description: 'Klik tulisan "Manajemen Siswa" di menu sebelah kiri.',
            },
            {
                title: '2️⃣ Pilih Kelas dan Mapel',
                description: 'Pilih kelas (contoh: 7A) dan mata pelajaran (contoh: Matematika).',
            },
            {
                title: '3️⃣ Isi Nilai',
                description: 'Ketik nilai di kotak sebelah nama siswa. Contoh: 85',
                tip: 'Nilai 0-100. Tekan tombol Tab untuk pindah ke siswa berikutnya.',
            },
            {
                title: '4️⃣ Simpan',
                description: 'Klik tombol "Simpan" di bagian bawah.',
                tip: 'Tunggu sampai muncul tulisan "Tersimpan".',
            },
        ],
    },
    {
        id: 'jadwal',
        title: '📅 Cara Lihat Jadwal',
        icon: <Calendar className="w-8 h-8" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        category: 'dasar',
        keywords: ['jadwal', 'mapel', 'pelajaran', 'waktu', 'hari'],
        steps: [
            {
                title: '1️⃣ Buka Menu Jadwal',
                description: 'Klik tulisan "Jadwal" di sebelah kiri layar.',
            },
            {
                title: '2️⃣ Lihat Jadwal Hari Ini',
                description: 'Di Dashboard (beranda), jadwal hari ini sudah terlihat di sebelah kanan.',
            },
            {
                title: '3️⃣ Tambah Jadwal Baru',
                description: 'Klik tombol "+ Tambah Jadwal" untuk menambah jadwal baru.',
                tip: 'Isi hari, jam mulai, jam selesai, mata pelajaran, dan kelas.',
            },
        ],
    },
    {
        id: 'tugas',
        title: '📚 Cara Buat Tugas',
        icon: <ClipboardCheck className="w-8 h-8" />,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        category: 'dasar',
        keywords: ['tugas', 'pr', 'homework', 'deadline'],
        steps: [
            {
                title: '1️⃣ Buka Menu Tugas',
                description: 'Klik menu "Tugas" atau "Tugas & PR" di sebelah kiri.',
            },
            {
                title: '2️⃣ Klik Tambah Tugas',
                description: 'Tekan tombol "+ Buat Tugas Baru" di pojok kanan atas.',
            },
            {
                title: '3️⃣ Isi Detail Tugas',
                description: 'Tulis Judul Tugas (misal: "PR Matematika Bab 1") dan deskripsinya. Jangan lupa pilih kelas dan tanggal pengumpulan.',
                tip: 'Anda bisa melampirkan file soal jika ada.',
            },
            {
                title: '4️⃣ Simpan',
                description: 'Klik tombol "Simpan Tugas" untuk mengirim ke siswa.',
            },
        ],
    },
    {
        id: 'laporan',
        title: '📊 Cara Cetak Rapot',
        icon: <CheckCircle className="w-8 h-8" />,
        color: 'text-brand-600',
        bgColor: 'bg-brand-50 dark:bg-brand-900/20',
        category: 'dasar',
        keywords: ['rapor', 'cetak', 'laporan', 'pdf', 'print'],
        steps: [
            {
                title: '1️⃣ Masuk ke Data Siswa',
                description: 'Pilih kelas yang ingin dicetak rapotnya di menu "Data Siswa".',
            },
            {
                title: '2️⃣ Pilih Siswa',
                description: 'Klik nama siswa untuk membuka profilnya.',
            },
            {
                title: '3️⃣ Klik Tombol Cetak',
                description: 'Di halaman profil siswa, cari tombol "Cetak Rapot" di bagian atas atau bawah.',
            },
            {
                title: '4️⃣ Simpan PDF',
                description: 'Rapot akan terbuka. Anda bisa download sebagai PDF atau langsung print.',
                tip: 'Pastikan semua nilai sudah diisi sebelum mencetak.',
            },
        ],
    },
    {
        id: 'pengaturan',
        title: '⚙️ Pengaturan & Profil',
        icon: <Settings className="w-8 h-8" />,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        category: 'dasar',
        keywords: ['pengaturan', 'profil', 'setting', 'akun', 'password'],
        steps: [
            {
                title: '1️⃣ Buka Pengaturan',
                description: 'Klik menu "Pengaturan" (gambar gerigi) di paling bawah menu kiri.',
            },
            {
                title: '2️⃣ Ubah Profil',
                description: 'Anda bisa ganti Foto, Nama, dan Password di sini.',
            },
            {
                title: '3️⃣ Mode Gelap/Terang',
                description: 'Ingin tampilan lebih nyaman di mata? Aktifkan "Mode Gelap".',
            },
            {
                title: '4️⃣ Simpan Perubahan',
                description: 'Jangan lupa klik tombol Simpan jika sudah selesai mengubah data.',
            },
        ],
    },
    {
        id: 'ekstrakurikuler',
        title: '🏆 Kelola Ekstrakurikuler',
        icon: <Award className="w-8 h-8" />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        category: 'lanjutan',
        keywords: ['ekskul', 'ekstrakurikuler', 'klub', 'kegiatan'],
        steps: [
            {
                title: '1️⃣ Buka Menu Ekstrakurikuler',
                description: 'Klik "Ekstrakurikuler" di menu sebelah kiri.',
            },
            {
                title: '2️⃣ Lihat/Tambah Kegiatan',
                description: 'Anda akan melihat daftar semua kegiatan ekskul. Klik "+ Tambah" untuk membuat kegiatan baru.',
            },
            {
                title: '3️⃣ Daftarkan Siswa',
                description: 'Pilih kegiatan, lalu klik tab "Anggota" untuk mendaftarkan siswa ke kegiatan tersebut.',
                tip: 'Anda juga bisa input nilai ekskul di tab "Nilai".',
            },
            {
                title: '4️⃣ Catat Presensi Ekskul',
                description: 'Gunakan tab "Presensi" untuk mencatat kehadiran siswa di kegiatan ekskul.',
            },
        ],
    },
    {
        id: 'pelanggaran',
        title: '⚠️ Catat Pelanggaran & Prestasi',
        icon: <Activity className="w-8 h-8" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        category: 'lanjutan',
        keywords: ['pelanggaran', 'prestasi', 'poin', 'kedisiplinan', 'penghargaan'],
        steps: [
            {
                title: '1️⃣ Buka Profil Siswa',
                description: 'Cari siswa di menu "Data Siswa", lalu klik namanya.',
            },
            {
                title: '2️⃣ Pilih Tab Pelanggaran/Prestasi',
                description: 'Di halaman profil siswa, klik tab "Pelanggaran" atau "Prestasi".',
            },
            {
                title: '3️⃣ Tambah Catatan',
                description: 'Klik tombol "+ Tambah" untuk mencatat pelanggaran atau prestasi baru.',
                tip: 'Isi tanggal, jenis, dan deskripsi dengan lengkap.',
            },
            {
                title: '4️⃣ Lihat Rekap',
                description: 'Rekap poin pelanggaran dan prestasi otomatis terhitung di bagian atas.',
            },
        ],
    },
    {
        id: 'analitik',
        title: '📈 Pahami Dashboard Analitik',
        icon: <BarChart3 className="w-8 h-8" />,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        category: 'lanjutan',
        keywords: ['analitik', 'statistik', 'grafik', 'chart', 'dashboard'],
        steps: [
            {
                title: '1️⃣ Buka Menu Analitik',
                description: 'Klik menu "Analitik" atau "Statistik" di menu sebelah kiri.',
            },
            {
                title: '2️⃣ Pilih Periode',
                description: 'Di bagian atas, pilih rentang waktu yang ingin dilihat (Minggu ini, Bulan ini, Semester).',
            },
            {
                title: '3️⃣ Baca Grafik',
                description: 'Grafik menunjukkan tren kehadiran, nilai rata-rata, dan performa siswa.',
                tip: 'Arahkan kursor ke grafik untuk melihat detail angka.',
            },
            {
                title: '4️⃣ Export Laporan',
                description: 'Klik tombol "Export" untuk menyimpan laporan analitik sebagai PDF.',
            },
        ],
    },
    {
        id: 'offline',
        title: '📴 Mode Offline',
        icon: <WifiOff className="w-8 h-8" />,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        category: 'lanjutan',
        keywords: ['offline', 'tanpa internet', 'sync', 'sinkronisasi'],
        steps: [
            {
                title: '1️⃣ Cara Kerja Offline',
                description: 'Aplikasi ini tetap bisa digunakan tanpa internet! Data disimpan di HP/komputer Anda.',
            },
            {
                title: '2️⃣ Indikator Status',
                description: 'Lihat pojok kanan atas. Jika ada ikon "Offline", berarti Anda sedang tidak terhubung internet.',
                tip: 'Tetap input data seperti biasa, tidak masalah!',
            },
            {
                title: '3️⃣ Sinkronisasi Otomatis',
                description: 'Saat internet kembali, data otomatis tersinkronisasi ke server. Tidak perlu melakukan apa-apa.',
            },
            {
                title: '4️⃣ Pastikan Data Tersimpan',
                description: 'Tunggu hingga muncul notifikasi "Data tersinkronisasi" untuk memastikan semua data sudah terupload.',
            },
        ],
    },
];

export const categoryTabs: CategoryTab[] = [
    { id: 'semua', label: 'Semua', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'dasar', label: 'Panduan Dasar', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'lanjutan', label: 'Fitur Lanjutan', icon: <Star className="w-4 h-4" /> },
    { id: 'faq', label: 'FAQ', icon: <MessageCircle className="w-4 h-4" /> },
];
