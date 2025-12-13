import { HelpArticle } from '../components/OnboardingHelp';

/**
 * Comprehensive Help Articles for Portal Guru
 * Contains detailed guides, tutorials, FAQs, and tips for all major features
 */

export const helpArticles: HelpArticle[] = [
    // ============================================
    // TUTORIAL CATEGORY
    // ============================================
    {
        id: 'tutorial-input-absensi',
        title: 'Cara Input Absensi Siswa',
        category: 'Tutorial',
        tags: ['absensi', 'kehadiran', 'input', 'siswa'],
        content: `
            <h3>Panduan Lengkap Input Absensi</h3>
            <p>Fitur absensi memungkinkan Anda untuk mencatat kehadiran siswa dengan cepat dan efisien.</p>
            
            <h4>Langkah-langkah:</h4>
            <ol>
                <li><strong>Buka Menu Absensi</strong> - Klik menu "Rekap Absensi" di sidebar atau gunakan shortcut <code>Alt+A</code></li>
                <li><strong>Pilih Tanggal</strong> - Gunakan date picker untuk memilih tanggal absensi</li>
                <li><strong>Pilih Kelas</strong> - Pilih kelas yang akan diabsen dari dropdown</li>
                <li><strong>Tandai Status Kehadiran</strong> - Untuk setiap siswa, klik tombol status:
                    <ul>
                        <li><strong>H</strong> - Hadir (Present)</li>
                        <li><strong>I</strong> - Izin (Permit)</li>
                        <li><strong>S</strong> - Sakit (Sick)</li>
                        <li><strong>A</strong> - Alpha (Absent)</li>
                    </ul>
                </li>
                <li><strong>Simpan Perubahan</strong> - Klik tombol "Simpan Perubahan Absensi" di bagian bawah</li>
            </ol>

            <h4>Tips:</h4>
            <ul>
                <li>Gunakan fitur pencarian untuk menemukan siswa tertentu dengan cepat</li>
                <li>Status absensi akan otomatis tersimpan dan dapat dilihat di analytics</li>
                <li>Anda dapat mengubah absensi yang sudah disimpan kapan saja</li>
                <li>Data absensi dapat diekspor ke Excel untuk arsip</li>
            </ul>
        `
    },
    {
        id: 'tutorial-tambah-siswa',
        title: 'Menambah Data Siswa Baru',
        category: 'Tutorial',
        tags: ['siswa', 'tambah', 'data', 'registrasi'],
        content: `
            <h3>Panduan Menambah Siswa Baru</h3>
            <p>Kelola data siswa dengan mudah melalui menu Data Siswa.</p>
            
            <h4>Cara Menambah Siswa Baru:</h4>
            <ol>
                <li><strong>Buka Menu Data Siswa</strong> - Klik menu "Data Siswa" di sidebar</li>
                <li><strong>Klik Tombol Tambah</strong> - Klik tombol "Tambah Siswa Baru" di bagian atas</li>
                <li><strong>Isi Form Data Siswa</strong>:
                    <ul>
                        <li>Nama lengkap siswa (wajib)</li>
                        <li>NISN (Nomor Induk Siswa Nasional)</li>
                        <li>Kelas yang akan ditempati</li>
                        <li>Tanggal lahir</li>
                        <li>Jenis kelamin</li>
                        <li>Alamat lengkap</li>
                        <li>Nama orang tua/wali</li>
                        <li>Nomor kontak orang tua</li>
                    </ul>
                </li>
                <li><strong>Upload Foto (Opsional)</strong> - Tambahkan foto profil siswa</li>
                <li><strong>Simpan Data</strong> - Klik tombol "Simpan" untuk menyimpan data siswa</li>
            </ol>

            <h4>Mengedit Data Siswa:</h4>
            <ol>
                <li>Cari siswa menggunakan fitur pencarian</li>
                <li>Klik nama siswa untuk membuka detail</li>
                <li>Klik tombol "Edit" di halaman detail</li>
                <li>Ubah data yang diperlukan dan simpan</li>
            </ol>

            <h4>Catatan Penting:</h4>
            <ul>
                <li>NISN harus unik untuk setiap siswa</li>
                <li>Data siswa dapat dihapus melalui menu Sampah</li>
                <li>Foto siswa akan otomatis dikompresi untuk menghemat ruang penyimpanan</li>
                <li>Semua perubahan data akan tercatat di Riwayat Aksi</li>
            </ul>
        `
    },
    {
        id: 'tutorial-jadwal-pelajaran',
        title: 'Mengelola Jadwal Mata Pelajaran',
        category: 'Tutorial',
        tags: ['jadwal', 'mapel', 'mata pelajaran', 'schedule'],
        content: `
            <h3>Panduan Mengelola Jadwal Pelajaran</h3>
            <p>Buat dan kelola jadwal mata pelajaran untuk setiap kelas dengan mudah.</p>
            
            <h4>Membuat Jadwal Baru:</h4>
            <ol>
                <li><strong>Buka Menu Jadwal</strong> - Klik menu "Jadwal Mata Pelajaran" di sidebar</li>
                <li><strong>Pilih Kelas</strong> - Pilih kelas dari dropdown</li>
                <li><strong>Klik Tambah Jadwal</strong> - Klik tombol "Tambah Jadwal Baru"</li>
                <li><strong>Isi Detail Jadwal</strong>:
                    <ul>
                        <li>Nama mata pelajaran</li>
                        <li>Hari (Senin - Jumat)</li>
                        <li>Waktu mulai</li>
                        <li>Waktu selesai</li>
                        <li>Nama guru pengampu (opsional)</li>
                        <li>Ruangan (opsional)</li>
                    </ul>
                </li>
                <li><strong>Simpan Jadwal</strong> - Klik "Simpan" untuk menambahkan ke jadwal</li>
            </ol>

            <h4>Mengedit/Menghapus Jadwal:</h4>
            <ul>
                <li>Klik pada jadwal yang ingin diubah</li>
                <li>Pilih "Edit" untuk mengubah atau "Hapus" untuk menghapus</li>
                <li>Konfirmasi perubahan</li>
            </ul>

            <h4>Fitur Export:</h4>
            <ul>
                <li><strong>Export ke PDF</strong> - Cetak jadwal dalam format PDF</li>
                <li><strong>Export ke ICS</strong> - Import jadwal ke Google Calendar atau aplikasi kalender lainnya</li>
            </ul>

            <h4>Tips:</h4>
            <ul>
                <li>Gunakan warna berbeda untuk setiap mata pelajaran agar lebih mudah dibaca</li>
                <li>Jadwal dapat dilihat oleh orang tua melalui Portal Orang Tua</li>
                <li>Pastikan tidak ada jadwal yang bertabrakan waktu</li>
            </ul>
        `
    },
    {
        id: 'tutorial-input-nilai',
        title: 'Input dan Kelola Nilai Siswa',
        category: 'Tutorial',
        tags: ['nilai', 'rapor', 'assessment', 'grades'],
        content: `
            <h3>Panduan Input Nilai Siswa</h3>
            <p>Kelola nilai siswa untuk berbagai jenis penilaian dengan sistem yang fleksibel.</p>
            
            <h4>Cara Input Nilai:</h4>
            <ol>
                <li><strong>Buka Detail Siswa</strong> - Klik nama siswa dari menu Data Siswa</li>
                <li><strong>Pilih Tab Nilai</strong> - Klik tab "Nilai" di halaman detail</li>
                <li><strong>Pilih Mata Pelajaran</strong> - Pilih mata pelajaran yang akan dinilai</li>
                <li><strong>Pilih Jenis Penilaian</strong>:
                    <ul>
                        <li>Tugas Harian</li>
                        <li>Ulangan Harian (UH)</li>
                        <li>Ujian Tengah Semester (UTS)</li>
                        <li>Ujian Akhir Semester (UAS)</li>
                        <li>Praktik</li>
                        <li>Project</li>
                    </ul>
                </li>
                <li><strong>Masukkan Nilai</strong> - Input nilai (0-100)</li>
                <li><strong>Tambah Catatan (Opsional)</strong> - Berikan catatan untuk penilaian</li>
                <li><strong>Simpan</strong> - Klik "Simpan" untuk menyimpan nilai</li>
            </ol>

            <h4>Input Nilai Cepat (Bulk Input):</h4>
            <ol>
                <li>Buka menu "Input Nilai Cepat"</li>
                <li>Pilih kelas dan mata pelajaran</li>
                <li>Pilih jenis penilaian</li>
                <li>Input nilai untuk semua siswa sekaligus dalam format tabel</li>
                <li>Simpan semua nilai sekaligus</li>
            </ol>

            <h4>Melihat Rapor:</h4>
            <ul>
                <li>Buka detail siswa</li>
                <li>Klik tombol "Cetak Rapor"</li>
                <li>Rapor akan ditampilkan dalam format PDF</li>
                <li>Rapor dapat dicetak atau disimpan</li>
            </ul>

            <h4>Catatan:</h4>
            <ul>
                <li>Nilai otomatis dihitung rata-ratanya per mata pelajaran</li>
                <li>Grafik perkembangan nilai tersedia di halaman Analytics</li>
                <li>Orang tua dapat melihat nilai melalui Portal Orang Tua</li>
            </ul>
        `
    },
    {
        id: 'tutorial-tugas',
        title: 'Membuat dan Mengelola Tugas',
        category: 'Tutorial',
        tags: ['tugas', 'homework', 'assignment', 'manajemen'],
        content: `
            <h3>Panduan Manajemen Tugas</h3>
            <p>Buat, kelola, dan pantau tugas siswa dengan sistem manajemen tugas yang terintegrasi.</p>
            
            <h4>Membuat Tugas Baru:</h4>
            <ol>
                <li><strong>Buka Menu Tugas</strong> - Klik menu "Manajemen Tugas"</li>
                <li><strong>Klik Tambah Tugas</strong> - Klik tombol "Buat Tugas Baru"</li>
                <li><strong>Isi Detail Tugas</strong>:
                    <ul>
                        <li>Judul tugas</li>
                        <li>Deskripsi lengkap tugas</li>
                        <li>Mata pelajaran</li>
                        <li>Kelas tujuan</li>
                        <li>Batas waktu pengumpulan</li>
                        <li>Bobot nilai (opsional)</li>
                        <li>File lampiran (opsional)</li>
                    </ul>
                </li>
                <li><strong>Publish Tugas</strong> - Klik "Publish" untuk memberikan tugas ke siswa</li>
            </ol>

            <h4>Memantau Progress Tugas:</h4>
            <ul>
                <li>Lihat daftar tugas yang sudah dibuat</li>
                <li>Cek status pengumpulan (Sudah/Belum mengumpulkan)</li>
                <li>Lihat detail submission dari setiap siswa</li>
                <li>Berikan nilai dan feedback untuk setiap tugas</li>
            </ul>

            <h4>Mengedit/Menghapus Tugas:</h4>
            <ol>
                <li>Klik pada tugas yang ingin diubah</li>
                <li>Pilih opsi "Edit" atau "Hapus"</li>
                <li>Untuk tugas yang sudah dipublish, edit akan memberikan notifikasi ke siswa</li>
            </ol>

            <h4>Fitur Tambahan:</h4>
            <ul>
                <li><strong>Auto Reminder</strong> - Sistem otomatis mengirim reminder H-1 sebelum deadline</li>
                <li><strong>Late Submission</strong> - Tandai otomatis untuk tugas yang terlambat</li>
                <li><strong>Bulk Grading</strong> - Berikan nilai untuk banyak submission sekaligus</li>
                <li><strong>Template Tugas</strong> - Simpan tugas sebagai template untuk digunakan lagi</li>
            </ul>
        `
    },

    // ============================================
    // PANDUAN CATEGORY
    // ============================================
    {
        id: 'guide-analytics',
        title: 'Menggunakan Fitur Analytics',
        category: 'Panduan',
        tags: ['analytics', 'statistik', 'laporan', 'data'],
        content: `
            <h3>Panduan Fitur Analytics</h3>
            <p>Manfaatkan data analytics untuk mendapatkan insights mendalam tentang performa siswa dan kelas.</p>
            
            <h4>Overview Dashboard:</h4>
            <ul>
                <li><strong>Total Siswa</strong> - Jumlah total siswa aktif</li>
                <li><strong>Rata-rata Kehadiran</strong> - Persentase kehadiran keseluruhan</li>
                <li><strong>Rata-rata Nilai</strong> - Nilai rata-rata semua siswa</li>
                <li><strong>Tugas Pending</strong> - Jumlah tugas yang belum dikumpulkan</li>
            </ul>

            <h4>Grafik Kehadiran:</h4>
            <ul>
                <li>Visualisasi tren kehadiran per bulan</li>
                <li>Filter berdasarkan kelas atau periode waktu</li>
                <li>Identifikasi pola ketidakhadiran</li>
                <li>Export data untuk analisis lebih lanjut</li>
            </ul>

            <h4>Grafik Nilai:</h4>
            <ul>
                <li>Distribusi nilai per mata pelajaran</li>
                <li>Perbandingan performa antar kelas</li>
                <li>Tren perkembangan nilai siswa</li>
                <li>Identifikasi siswa yang perlu perhatian khusus</li>
            </ul>

            <h4>Laporan Kelas:</h4>
            <ul>
                <li>Ranking siswa per kelas</li>
                <li>Statistik mata pelajaran</li>
                <li>Analisis partisipasi dalam tugas</li>
                <li>Rekomendasi intervensi</li>
            </ul>

            <h4>Export Laporan:</h4>
            <ul>
                <li>Export ke PDF untuk presentasi</li>
                <li>Export ke Excel untuk analisis mendalam</li>
                <li>Pilih periode waktu custom</li>
                <li>Pilih data yang ingin diexport</li>
            </ul>
        `
    },
    {
        id: 'guide-komunikasi',
        title: 'Komunikasi dengan Orang Tua',
        category: 'Panduan',
        tags: ['komunikasi', 'orang tua', 'wali', 'chat', 'pesan'],
        content: `
            <h3>Panduan Komunikasi dengan Orang Tua</h3>
            <p>Sistem komunikasi terintegrasi untuk berkomunikasi efektif dengan orang tua/wali siswa.</p>
            
            <h4>Mengirim Pesan:</h4>
            <ol>
                <li><strong>Buka Detail Siswa</strong> - Klik nama siswa</li>
                <li><strong>Klik Tab Komunikasi</strong> - Pilih tab "Komunikasi"</li>
                <li><strong>Tulis Pesan</strong> - Ketik pesan yang ingin disampaikan</li>
                <li><strong>Kirim</strong> - Klik tombol kirim</li>
            </ol>

            <h4>Jenis Pesan:</h4>
            <ul>
                <li><strong>Pesan Individual</strong> - Pesan pribadi ke satu orang tua</li>
                <li><strong>Broadcast ke Kelas</strong> - Kirim pesan ke semua orang tua dalam satu kelas</li>
                <li><strong>Pengumuman Umum</strong> - Pengumuman untuk semua orang tua</li>
            </ul>

            <h4>Template Pesan:</h4>
            <ul>
                <li>Undangan rapat orang tua</li>
                <li>Pemberitahuan absensi</li>
                <li>Update perkembangan akademik</li>
                <li>Reminder pembayaran</li>
                <li>Buat template custom Anda sendiri</li>
            </ul>

            <h4>Notifikasi Real-time:</h4>
            <ul>
                <li>Notifikasi otomatis saat pesan baru masuk</li>
                <li>Indikator pesan belum dibaca</li>
                <li>History percakapan lengkap</li>
            </ul>

            <h4>Portal Orang Tua:</h4>
            <p>Orang tua dapat mengakses portal khusus untuk:</p>
            <ul>
                <li>Melihat absensi anak</li>
                <li>Melihat nilai dan rapor</li>
                <li>Melihat jadwal pelajaran</li>
                <li>Melihat tugas dan deadline</li>
                <li>Berkomunikasi dengan guru</li>
            </ul>
        `
    },
    {
        id: 'guide-export-data',
        title: 'Export Data ke PDF dan Excel',
        category: 'Panduan',
        tags: ['export', 'pdf', 'excel', 'cetak', 'download'],
        content: `
            <h3>Panduan Export Data</h3>
            <p>Export berbagai data ke format PDF dan Excel untuk arsip atau pelaporan.</p>
            
            <h4>Export Absensi:</h4>
            <ol>
                <li>Buka menu Rekap Absensi</li>
                <li>Pilih kelas dan periode waktu</li>
                <li>Klik tombol "Export"</li>
                <li>Pilih format (PDF atau Excel)</li>
                <li>File akan otomatis terdownload</li>
            </ol>

            <h4>Export Nilai/Rapor:</h4>
            <ol>
                <li>Buka detail siswa</li>
                <li>Klik "Cetak Rapor" untuk PDF</li>
                <li>Atau pilih "Export Nilai" untuk Excel</li>
                <li>Pilih semester/periode</li>
                <li>Download file</li>
            </ol>

            <h4>Export Jadwal:</h4>
            <ul>
                <li><strong>PDF</strong> - Format cetak untuk ditempel di kelas</li>
                <li><strong>ICS</strong> - Import ke Google Calendar atau aplikasi kalender</li>
            </ul>

            <h4>Export Data Siswa:</h4>
            <ol>
                <li>Buka menu Data Siswa</li>
                <li>Klik "Export Data"</li>
                <li>Pilih format Excel</li>
                <li>Pilih field yang ingin diexport</li>
                <li>Download file Excel</li>
            </ol>

            <h4>Bulk Export:</h4>
            <ul>
                <li>Export data semua siswa sekaligus</li>
                <li>Export rapor untuk satu kelas</li>
                <li>Export semua absensi dalam satu periode</li>
                <li>Customisasi field yang di-export</li>
            </ul>

            <h4>Tips:</h4>
            <ul>
                <li>File PDF cocok untuk dicetak atau dibagikan</li>
                <li>File Excel dapat diedit lebih lanjut</li>
                <li>Pastikan popup blocker tidak menghalangi download</li>
                <li>File tersimpan di folder Downloads browser</li>
            </ul>
        `
    },
    {
        id: 'guide-settings',
        title: 'Mengelola Pengaturan Sistem',
        category: 'Panduan',
        tags: ['pengaturan', 'settings', 'konfigurasi', 'preferensi'],
        content: `
            <h3>Panduan Pengaturan Sistem</h3>
            <p>Sesuaikan aplikasi Portal Guru sesuai dengan preferensi dan kebutuhan Anda.</p>
            
            <h4>Pengaturan Profil:</h4>
            <ul>
                <li>Ubah foto profil</li>
                <li>Update informasi personal</li>
                <li>Ganti password</li>
                <li>Update nomor kontak</li>
            </ul>

            <h4>Pengaturan Tampilan:</h4>
            <ul>
                <li><strong>Dark Mode</strong> - Aktifkan mode gelap untuk kenyamanan mata</li>
                <li><strong>Ukuran Font</strong> - Sesuaikan ukuran teks</li>
                <li><strong>Bahasa</strong> - Pilih bahasa interface</li>
                <li><strong>Warna Tema</strong> - Kustomisasi warna utama</li>
            </ul>

            <h4>Pengaturan Notifikasi:</h4>
            <ul>
                <li>Aktifkan/nonaktifkan notifikasi push</li>
                <li>Atur frekuensi email reminder</li>
                <li>Pilih jenis notifikasi yang diterima</li>
                <li>Atur jam notifikasi (don't disturb mode)</li>
            </ul>

            <h4>Pengaturan Kelas:</h4>
            <ul>
                <li>Tambah/edit nama kelas</li>
                <li>Atur kurikulum per kelas</li>
                <li>Tentukan wali kelas</li>
                <li>Set tahun ajaran</li>
            </ul>

            <h4>Backup & Restore:</h4>
            <ul>
                <li>Backup data secara manual atau otomatis</li>
                <li>Restore dari backup sebelumnya</li>
                <li>Export semua data untuk migrasi</li>
                <li>Sinkronisasi cloud (jika tersedia)</li>
            </ul>

            <h4>Keamanan:</h4>
            <ul>
                <li>Aktifkan two-factor authentication</li>
                <li>Lihat riwayat login</li>
                <li>Kelola sesi aktif</li>
                <li>Set auto-logout timeout</li>
            </ul>
        `
    },

    // ============================================
    // FAQ CATEGORY
    // ============================================
    {
        id: 'faq-umum',
        title: 'Pertanyaan yang Sering Diajukan (FAQ)',
        category: 'FAQ',
        tags: ['faq', 'pertanyaan', 'bantuan', 'troubleshoot'],
        content: `
            <h3>Frequently Asked Questions</h3>
            
            <h4>Q: Bagaimana cara reset password?</h4>
            <p>A: Klik "Lupa Password" di halaman login, masukkan email, dan ikuti instruksi yang dikirim ke email Anda.</p>

            <h4>Q: Apakah data aman?</h4>
            <p>A: Ya, semua data dienkripsi dan disimpan dengan aman. Kami menggunakan Supabase dengan enkripsi SSL/TLS dan backup otomatis.</p>

            <h4>Q: Bisakah saya mengakses aplikasi offline?</h4>
            <p>A: Ya, aplikasi ini adalah PWA (Progressive Web App) yang dapat berfungsi offline. Data akan tersinkronisasi otomatis saat koneksi kembali.</p>

            <h4>Q: Bagaimana cara menghapus data siswa?</h4>
            <p>A: Buka detail siswa, klik tombol "Hapus". Data akan dipindahkan ke Sampah dan dapat dipulihkan dalam 30 hari. Setelah 30 hari, data akan terhapus permanen.</p>

            <h4>Q: Apakah ada limit jumlah siswa?</h4>
            <p>A: Tidak ada limit jumlah siswa yang dapat Anda kelola dalam aplikasi ini.</p>

            <h4>Q: Bagaimana cara menghubungi support?</h4>
            <p>A: Anda dapat menghubungi support melalui email atau menggunakan form kontak di halaman Pengaturan.</p>

            <h4>Q: Apakah bisa mengimport data dari Excel?</h4>
            <p>A: Ya, fitur import dari Excel tersedia di menu Data Siswa. Pastikan format Excel sesuai dengan template yang disediakan.</p>

            <h4>Q: Bagaimana cara menginstall aplikasi di HP?</h4>
            <p>A: Buka aplikasi di browser HP, lalu pilih "Add to Home Screen" atau "Install App" dari menu browser. Aplikasi akan terinstall seperti aplikasi native.</p>

            <h4>Q: Apakah orang tua bisa edit data?</h4>
            <p>A: Tidak, orang tua hanya memiliki akses read-only melalui Portal Orang Tua. Hanya guru yang dapat mengedit data.</p>

            <h4>Q: Bagaimana cara membuat akun orang tua?</h4>
            <p>A: Akun orang tua dibuat otomatis saat Anda menambahkan siswa dengan email orang tua. Mereka akan menerima link untuk set password pertama kali.</p>
        `
    },

    // ============================================
    // TIPS CATEGORY
    // ============================================
    {
        id: 'tips-keyboard-shortcuts',
        title: 'Keyboard Shortcuts untuk Produktivitas',
        category: 'Tips',
        tags: ['keyboard', 'shortcut', 'pintasan', 'productivity'],
        content: `
            <h3>Pintasan Keyboard</h3>
            <p>Tingkatkan produktivitas dengan menggunakan keyboard shortcuts berikut:</p>
            
            <h4>Navigasi Umum:</h4>
            <ul>
                <li><code>Alt+D</code> - Buka Dashboard</li>
                <li><code>Alt+A</code> - Buka Rekap Absensi</li>
                <li><code>Alt+S</code> - Buka Data Siswa</li>
                <li><code>Alt+J</code> - Buka Jadwal</li>
                <li><code>Alt+T</code> - Buka Manajemen Tugas</li>
                <li><code>Ctrl+K</code> - Buka Global Search</li>
            </ul>

            <h4>Aksi Cepat:</h4>
            <ul>
                <li><code>Ctrl+N</code> - Tambah item baru (siswa/tugas/dll)</li>
                <li><code>Ctrl+S</code> - Simpan perubahan</li>
                <li><code>Ctrl+F</code> - Fokus ke search bar</li>
                <li><code>Esc</code> - Tutup modal/dialog</li>
                <li><code>?</code> - Tampilkan panel shortcuts (Shift+?)</li>
            </ul>

            <h4>Tips Lainnya:</h4>
            <ul>
                <li>Gunakan Tab untuk navigasi antar form field</li>
                <li>Enter untuk submit form</li>
                <li>Spasi untuk toggle checkbox</li>
                <li>Arrow keys untuk navigasi dalam dropdown</li>
            </ul>

            <h4>Customisasi:</h4>
            <p>Anda dapat mengatur shortcut custom di menu Pengaturan → Keyboard Shortcuts</p>
        `
    },
    {
        id: 'tips-best-practices',
        title: 'Best Practices Mengelola Data',
        category: 'Tips',
        tags: ['tips', 'best practice', 'manajemen', 'data'],
        content: `
            <h3>Best Practices untuk Portal Guru</h3>
            
            <h4>Manajemen Data:</h4>
            <ul>
                <li><strong>Backup Rutin</strong> - Lakukan backup data minimal seminggu sekali</li>
                <li><strong>Update Berkala</strong> - Selalu update data siswa saat ada perubahan</li>
                <li><strong>Verifikasi Data</strong> - Double-check data penting seperti NISN dan nilai</li>
                <li><strong>Arsip Lama</strong> - Pindahkan data siswa yang sudah lulus ke arsip</li>
            </ul>

            <h4>Input Absensi:</h4>
            <ul>
                <li>Input absensi setiap hari untuk data yang akurat</li>
                <li>Gunakan catatan untuk mencatat alasan ketidakhadiran</li>
                <li>Review rekap absensi mingguan untuk identifikasi masalah</li>
            </ul>

            <h4>Penilaian:</h4>
            <ul>
                <li>Input nilai segera setelah penilaian selesai</li>
                <li>Gunakan catatan untuk feedback konstruktif</li>
                <li>Review distribusi nilai untuk memastikan objektifitas</li>
                <li>Export nilai berkala untuk backup</li>
            </ul>

            <h4>Komunikasi:</h4>
            <ul>
                <li>Balas pesan orang tua maksimal 24 jam</li>
                <li>Gunakan template untuk pesan rutin</li>
                <li>Berikan update progress siswa secara berkala</li>
                <li>Profesional dan sopan dalam setiap komunikasi</li>
            </ul>

            <h4>Keamanan:</h4>
            <ul>
                <li>Jangan share password dengan orang lain</li>
                <li>Selalu logout saat menggunakan komputer umum</li>
                <li>Aktifkan two-factor authentication</li>
                <li>Review riwayat login secara berkala</li>
            </ul>

            <h4>Performance:</h4>
            <ul>
                <li>Hapus file/foto yang tidak terpakai untuk menghemat storage</li>
                <li>Gunakan fitur pencarian daripada scroll manual</li>
                <li>Manfaatkan keyboard shortcuts untuk efisiensi</li>
                <li>Gunakan bulk operations untuk aksi massal</li>
            </ul>
        `
    }
];

export default helpArticles;
