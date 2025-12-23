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
            <p>Fitur absensi memungkinkan Anda untuk mencatat kehadiran siswa dengan cepat. Ikuti langkah mudah di bawah ini.</p>
            
            <img src="/images/tutorials/attendance.png" alt="Tampilan Halaman Absensi" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Langkah-langkah:</h4>
            <ol class="space-y-2">
                <li><strong>1. Buka Menu Absensi</strong>
                    <br/>Klik menu "Rekap Absensi" di sidebar sebelah kiri (ikon kalender).</li>
                
                <li><strong>2. Pilih Tanggal & Kelas</strong>
                    <br/>Di bagian atas, pastikan tanggal sudah benar (default hari ini) dan pilih kelas yang ingin diabsen.</li>
                
                <li><strong>3. Tandai Status Kehadiran</strong> 
                    <br/>Untuk setiap siswa, klik tombol status yang sesuai:
                    <ul class="mt-2 text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <li class="flex items-center gap-2 mb-1"><span class="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold">H</span> <strong>Hadir</strong> - Siswa ada di kelas</li>
                        <li class="flex items-center gap-2 mb-1"><span class="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold">I</span> <strong>Izin</strong> - Siswa izin resmi</li>
                        <li class="flex items-center gap-2 mb-1"><span class="w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full text-xs font-bold">S</span> <strong>Sakit</strong> - Siswa sakit</li>
                        <li class="flex items-center gap-2 mb-1"><span class="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-xs font-bold">A</span> <strong>Alpha</strong> - Tanpa keterangan</li>
                    </ul>
                </li>
                
                <li><strong>4. Simpan Data</strong>
                    <br/>Setelah selesai, jangan lupa klik tombol <strong>"Simpan Perubahan Absensi"</strong> di pojok kanan bawah agar data tersimpan.</li>
            </ol>

            <div class="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl mt-4 border border-indigo-100 dark:border-indigo-800">
                <h4 class="text-indigo-800 dark:text-indigo-300 font-bold mb-2">Tips Cepat:</h4>
                <ul class="list-disc pl-4 text-indigo-700 dark:text-indigo-400">
                    <li>Ingin menandai semua siswa Hadir? Gunakan tombol <strong>"Semua Hadir"</strong> di bagian atas daftar.</li>
                    <li>Salah input? Anda bisa mengubahnya kapan saja dan simpan ulang.</li>
                </ul>
            </div>
        `
    },
    {
        id: 'tutorial-tambah-siswa',
        title: 'Menambah Data Siswa Baru',
        category: 'Tutorial',
        tags: ['siswa', 'tambah', 'data', 'registrasi'],
        content: `
            <h3>Panduan Menambah Siswa Baru</h3>
            <p>Berikut adalah cara mendaftarkan siswa baru ke dalam sistem Portal Guru.</p>

            <img src="/images/tutorials/students.png" alt="Halaman Data Siswa" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />
            
            <h4>Langkah 1: Masuk ke Menu Data Siswa</h4>
            <ol class="space-y-2">
                <li>Klik menu <strong>"Data Siswa"</strong> di sidebar (ikon orang).</li>
                <li>Anda akan melihat daftar seluruh siswa. Untuk menambah siswa baru, klik tombol <strong>"Siswa Baru"</strong> berwarna ungu di pojok kanan atas.</li>
            </ol>

            <br/>
            <img src="/images/tutorials/add-student.png" alt="Form Tambah Siswa" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Langkah 2: Mengisi Formulir</h4>
            <p>Akan muncul jendela formulir (seperti gambar di atas). Isi data-data berikut:</p>
            <ul class="list-disc pl-5 space-y-1 mb-4">
                <li><strong>Nama Lengkap:</strong> Nama panjang siswa sesuai akta.</li>
                <li><strong>NISN:</strong> Nomor Induk Siswa Nasional (wajib diisi).</li>
                <li><strong>Kelas:</strong> Pilih kelas siswa tersebut.</li>
                <li><strong>Data Orang Tua:</strong> Nama dan HP orang tua untuk keperluan komunikasi.</li>
            </ul>

            <h4>Langkah 3: Simpan</h4>
            <p>Setelah semua data terisi, klik tombol <strong>"Simpan"</strong> di bagian bawah formulir. Data siswa akan langsung muncul di daftar.</p>
        `
    },
    {
        id: 'tutorial-jadwal-pelajaran',
        title: 'Mengelola Jadwal Mata Pelajaran',
        category: 'Tutorial',
        tags: ['jadwal', 'mapel', 'mata pelajaran', 'schedule'],
        content: `
            <h3>Panduan Mengelola Jadwal Pelajaran</h3>
            <p>Atur jadwal pelajaran kelas Anda agar terorganisir dan mudah dipantau.</p>
            
            <img src="/images/tutorials/schedule.png" alt="Halaman Jadwal Pelajaran" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Cara Membuat Jadwal Baru:</h4>
            <ol class="space-y-3">
                <li><strong>1. Akses Menu Jadwal</strong>
                    <br/>Klik menu "Jadwal Mata Pelajaran" di sidebar kiri.</li>
                
                <li><strong>2. Pilih Kelas</strong>
                    <br/>Di bagian atas halaman, pilih kelas yang ingin Anda atur jadwalnya.</li>
                
                <li><strong>3. Tambah Jadwal</strong>
                    <br/>Klik tombol <strong>"Tambah Jadwal Baru"</strong>. Isi informasi seperti:
                    <ul class="list-disc pl-5 mt-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>Mata Pelajaran</li>
                        <li>Hari dan Jam</li>
                        <li>Ruangan (Opsional)</li>
                    </ul>
                </li>
                
                <li><strong>4. Simpan</strong>
                    <br/>Klik "Simpan" dan jadwal akan langsung muncul di kalender mingguan.</li>
            </ol>

            <div class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <h4 class="font-bold text-amber-800 dark:text-amber-400">Fitur Berguna:</h4>
                <p class="text-amber-700 dark:text-amber-500">Anda bisa <strong>Mencetak Jadwal (PDF)</strong> atau menyimpannya ke Kalender HP (Export ICS) dengan tombol tombol di sebelah kanan atas.</p>
            </div>
        `
    },
    {
        id: 'tutorial-input-nilai',
        title: 'Input dan Kelola Nilai Siswa',
        category: 'Tutorial',
        tags: ['nilai', 'rapor', 'assessment', 'grades'],
        content: `
            <h3>Panduan Input Nilai Siswa</h3>
            <p>Sistem ini memudahkan Anda mengelola nilai tugas, ulangan, hingga rapor.</p>
            
            <img src="/images/tutorials/grades.png" alt="Halaman Input Nilai" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Cara Input Nilai Per Siswa:</h4>
            <ol class="space-y-2">
                <li><strong>1. Buka Profil Siswa</strong>
                    <br/>Masuk menu "Data Siswa", cari nama siswa, dan klik tombol "Lihat Detail".</li>
                
                <li><strong>2. Pilih Tab Nilai</strong>
                    <br/>Klik pada tab <strong>"Nilai"</strong> (seperti gambar di atas).</li>
                
                <li><strong>3. Masukkan Nilai</strong>
                    <br/>Pilih mata pelajaran, jenis nilai (UH/UTS/UAS), dan masukkan angkanya.</li>
            </ol>

            <br/>
            <img src="/images/tutorials/bulk-grades.png" alt="Halaman Input Nilai Massal" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Ingin Input Nilai Sekaligus?</h4>
            <p>Gunakan menu <strong>"Input Nilai Cepat"</strong> di sidebar (gambar ke-2) untuk memasukkan nilai seluruh kelas sekaligus dalam bentuk tabel yang praktis.</p>
        `
    },
    {
        id: 'tutorial-tugas',
        title: 'Membuat dan Mengelola Tugas',
        category: 'Tutorial',
        tags: ['tugas', 'homework', 'assignment', 'manajemen'],
        content: `
            <h3>Panduan Manajemen Tugas</h3>
            <p>Berikan tugas kepada siswa dan pantau pengumpulannya dengan mudah.</p>
            
            <img src="/images/tutorials/tasks.png" alt="Halaman Manajemen Tugas" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Cara Membuat Tugas Baru:</h4>
            <ol class="space-y-3">
                <li><strong>1. Masuk Menu Tugas</strong>
                    <br/>Klik menu "Manajemen Tugas". Anda akan melihat daftar tugas yang aktif.</li>
                
                <li><strong>2. Buat Tugas</strong>
                    <br/>Klik tombol <strong>"Buat Tugas Baru"</strong>.</li>
                
                <li><strong>3. Isi Detail Tugas</strong>
                    <br/>Lengkapi informasi tugas:
                    <ul class="list-disc pl-5 mt-1">
                        <li><strong>Judul:</strong> Nama tugas yang jelas.</li>
                        <li><strong>Deskripsi:</strong> Instruksi pengerjaan tugas.</li>
                        <li><strong>Deadline:</strong> Tanggal terakhir pengumpulan.</li>
                    </ul>
                </li>
                
                <li><strong>4. Publish</strong>
                    <br/>Klik tombol "Publish". Tugas akan otomatis muncul di portal siswa dan mereka akan mendapat notifikasi.</li>
            </ol>
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
            <h3>Panduan Dashboard Analitik</h3>
            <p>Dashboard Analitik membantu Anda melihat perkembangan kelas dalam sekali pandang.</p>
            
            <img src="/images/tutorials/analytics.png" alt="Dashboard Analitik" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Mengenal Kartu Statistik:</h4>
            <ul class="grid gap-3 sm:grid-cols-2">
                <li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>👥 Total Siswa</strong>
                    <br/><span class="text-sm text-slate-500">Jumlah seluruh siswa yang Anda ajar.</span>
                </li>
                <li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>📊 Kehadiran Siswa</strong>
                    <br/><span class="text-sm text-slate-500">Persentase kehadiran rata-rata. Warna hijau berarti kehadiran bagus (>90%).</span>
                </li>
                <li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>🏠 Total Kelas</strong>
                    <br/><span class="text-sm text-slate-500">Jumlah kelas yang Anda kelola.</span>
                </li>
                <li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>✅ Tugas Selesai</strong>
                    <br/><span class="text-sm text-slate-500">Progress pengumpulan tugas oleh siswa.</span>
                </li>
            </ul>

            <h4 class="mt-4">Fitur Bantuan & Aksi Cepat:</h4>
            <ul class="list-disc pl-5">
                <li><strong>Tooltip (?):</strong> Arahkan mouse ke ikon tanda tanya di sebelah judul kartu untuk melihat penjelasan detail.</li>
                <li><strong>Tombol Aksi:</strong> Di bawah setiap kartu, ada link cepat (misal: "Lihat Daftar Siswa") untuk langsung menuju halaman terkait.</li>
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
            <p>Kirim pesan dan pengumuman kepada orang tua siswa langsung dari aplikasi.</p>
            
            <img src="/images/tutorials/communication.png" alt="Tab Komunikasi Siswa" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Cara Mengirim Pesan:</h4>
            <ol class="space-y-2">
                <li><strong>1. Cari Siswa</strong>
                    <br/>Buka menu "Data Siswa", cari siswa yang dituju, dan buka detailnya.</li>
                
                <li><strong>2. Buka Tab Komunikasi</strong>
                    <br/>Klik tab <strong>"Komunikasi"</strong> (ikon pesan).</li>
                
                <li><strong>3. Tulis Pesan</strong>
                    <br/>Ketik pesan Anda di kolom yang tersedia. Anda bisa memilih jenis pesan:
                    <ul class="list-disc pl-5 text-sm mt-1">
                        <li><strong>Pesan Pribadi:</strong> Hanya untuk orang tua siswa ini.</li>
                        <li><strong>Broadcast Kelas:</strong> Dikirim ke seluruh orang tua di kelas ini.</li>
                    </ul>
                </li>
                
                <li><strong>4. Kirim</strong>
                    <br/>Klik tombol Kirim. Orang tua akan menerima notifikasi di Portal Orang Tua mereka.</li>
            </ol>
        `
    },
    {
        id: 'guide-export-data',
        title: 'Export Data ke PDF dan Excel',
        category: 'Panduan',
        tags: ['export', 'pdf', 'excel', 'cetak', 'download'],
        content: `
            <h3>Panduan Export Data</h3>
            <p>Anda dapat mendownload data dalam format PDF (siap cetak) atau Excel (untuk diolah).</p>
            
            <div class="grid sm:grid-cols-2 gap-4 my-6">
                <div class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800">
                    <h4 class="font-bold flex items-center gap-2 mb-2"><span class="text-red-500">📄</span> PDF</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Cocok untuk dicetak langsung, ditempel di dinding, atau laporan fisik.</p>
                </div>
                <div class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800">
                    <h4 class="font-bold flex items-center gap-2 mb-2"><span class="text-green-500">📊</span> Excel</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Cocok jika Anda ingin mengolah data lebih lanjut, membuat grafik sendiri, atau backup.</p>
                </div>
            </div>

            <h4>Dimana Tombol Export?</h4>
            <ul class="space-y-2">
                <li><strong>Absensi:</strong> Menu Rekap Absensi → Pojok Kanan Atas.</li>
                <li><strong>Data Siswa:</strong> Menu Data Siswa → Tombol "Export" di atas tabel.</li>
                <li><strong>Nilai/Rapor:</strong> Halaman Detail Siswa → "Cetak Rapor".</li>
                <li><strong>Jadwal:</strong> Halaman Jadwal → Ikon Download di pojok kanan.</li>
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
            <p>Sesuaikan aplikasi dengan kenyamanan Anda.</p>
            
            <img src="/images/tutorials/settings.png" alt="Halaman Pengaturan" class="w-full rounded-xl shadow-md mb-6 border border-slate-200 dark:border-slate-700" />

            <h4>Menu Penting di Sini:</h4>
            <ul class="space-y-3">
                <li><strong>👤 Profil:</strong> Ganti foto profil guru, nama, dan email Anda.</li>
                <li><strong>🌙 Tampilan (Tema):</strong> Aktifkan <strong>Dark Mode</strong> (Mode Gelap) agar mata tidak cepat lelah saat bekerja malam hari.</li>
                <li><strong>🔔 Notifikasi:</strong> Atur kapan Anda ingin menerima pemberitahuan.</li>
                <li><strong>🔒 Keamanan:</strong> Ganti password akun Anda secara berkala di sini.</li>
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
