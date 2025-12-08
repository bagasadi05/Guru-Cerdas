# Requirements Document: Redesign UI Input Nilai Cepat

## Introduction

Menu Input Nilai Cepat saat ini memiliki tampilan yang berbeda dengan menu-menu lainnya di aplikasi Portal Guru. Redesign ini bertujuan untuk menyeragamkan tampilan UI agar konsisten dengan design system yang sudah ada, meningkatkan user experience, dan menambahkan fitur-fitur yang kurang.

## Glossary

- **Portal Guru**: Aplikasi manajemen sekolah untuk guru
- **Input Nilai Cepat**: Fitur untuk memasukkan nilai akademik siswa secara massal dalam satu kelas
- **BulkGradeInputPage**: Halaman untuk input nilai cepat (versi sederhana)
- **MassInputPage**: Halaman untuk input massal multi-mode (nilai, poin, pelanggaran, dll)
- **Design System**: Sistem desain yang terdefinisi di DESIGN_SYSTEM.md
- **Glass Card**: Komponen card dengan efek glassmorphism
- **KKM**: Kriteria Ketuntasan Minimal (nilai minimum kelulusan)
- **Skeleton Loader**: Komponen loading placeholder
- **Toast**: Notifikasi popup singkat

## Requirements

### Requirement 1: Konsistensi Visual dengan Menu Lainnya

**User Story:** Sebagai guru, saya ingin tampilan Input Nilai Cepat konsisten dengan menu lainnya, sehingga saya merasa familiar dan tidak bingung saat menggunakan aplikasi.

#### Acceptance Criteria

1. WHEN guru membuka halaman Input Nilai Cepat THEN sistem SHALL menampilkan header dengan format yang sama seperti DashboardPage, StudentsPage, dan AttendancePage
2. WHEN halaman dimuat THEN sistem SHALL menggunakan glass-card component dengan rounded-3xl, border border-white/10, dan shadow-xl
3. WHEN halaman dimuat THEN sistem SHALL menggunakan color scheme indigo-purple gradient yang konsisten dengan aplikasi
4. WHEN halaman dimuat THEN sistem SHALL menggunakan spacing scale dari design system (p-4, p-6, gap-4, gap-6)
5. WHEN halaman dimuat THEN sistem SHALL menggunakan typography scale yang konsisten (text-3xl untuk h1, text-sm untuk description)

### Requirement 2: Header Section yang Konsisten

**User Story:** Sebagai guru, saya ingin header yang informatif dan konsisten, sehingga saya dapat dengan mudah memahami konteks halaman.

#### Acceptance Criteria

1. WHEN halaman dimuat THEN sistem SHALL menampilkan judul "Input Nilai Cepat" dengan font-serif, text-3xl md:text-4xl, font-bold
2. WHEN halaman dimuat THEN sistem SHALL menampilkan deskripsi singkat dengan text-gray-600 dark:text-gray-400
3. WHEN halaman dimuat THEN sistem SHALL menampilkan action buttons di kanan header (Import, Export, Keyboard Shortcuts)
4. WHEN halaman dimuat THEN sistem SHALL menggunakan flex flex-col md:flex-row untuk responsive layout
5. WHEN halaman dimuat THEN sistem SHALL menampilkan breadcrumb navigation di atas header

### Requirement 3: Configuration Card dengan Glassmorphism

**User Story:** Sebagai guru, saya ingin section pengaturan yang jelas dan menarik, sehingga saya dapat dengan mudah memilih kelas dan mata pelajaran.

#### Acceptance Criteria

1. WHEN halaman dimuat THEN sistem SHALL menampilkan configuration card dengan glass-card styling
2. WHEN halaman dimuat THEN sistem SHALL menggunakan gradient background (from-indigo-50 to-purple-50 dark:from-indigo-900/20)
3. WHEN halaman dimuat THEN sistem SHALL menampilkan icon untuk setiap field (GraduationCap, BookOpen, FileText)
4. WHEN halaman dimuat THEN sistem SHALL menggunakan Select component dengan rounded-xl dan proper focus states
5. WHEN halaman dimuat THEN sistem SHALL menampilkan collapsible configuration dengan smooth animation

### Requirement 4: Statistics Preview Card

**User Story:** Sebagai guru, saya ingin melihat statistik nilai sebelum menyimpan, sehingga saya dapat memvalidasi data yang diinput.

#### Acceptance Criteria

1. WHEN guru mengisi nilai THEN sistem SHALL menampilkan preview card dengan statistik real-time
2. WHEN preview ditampilkan THEN sistem SHALL menampilkan rata-rata, nilai tertinggi, nilai terendah, dan jumlah siswa tuntas
3. WHEN preview ditampilkan THEN sistem SHALL menggunakan grid grid-cols-2 sm:grid-cols-4 gap-3
4. WHEN preview ditampilkan THEN sistem SHALL menggunakan color-coded cards (blue untuk rata-rata, green untuk tertinggi, orange untuk terendah, purple untuk tuntas)
5. WHEN preview ditampilkan THEN sistem SHALL menampilkan progress bar untuk ketuntasan dengan KKM threshold

### Requirement 5: Student List dengan Enhanced UX

**User Story:** Sebagai guru, saya ingin daftar siswa yang mudah dinavigasi dan diinput, sehingga saya dapat mengisi nilai dengan cepat dan akurat.

#### Acceptance Criteria

1. WHEN daftar siswa ditampilkan THEN sistem SHALL menggunakan table view untuk desktop dan card view untuk mobile
2. WHEN daftar siswa ditampilkan THEN sistem SHALL menampilkan avatar siswa dengan ring-2 ring-white/10
3. WHEN daftar siswa ditampilkan THEN sistem SHALL menggunakan hover effects (hover:bg-gray-100 dark:hover:bg-gray-800)
4. WHEN daftar siswa ditampilkan THEN sistem SHALL menampilkan color indicator untuk nilai (green >= KKM, amber 60-KKM, red < 60)
5. WHEN daftar siswa ditampilkan THEN sistem SHALL menampilkan validation feedback real-time untuk setiap input

### Requirement 6: Quick Actions Toolbar

**User Story:** Sebagai guru, saya ingin aksi cepat untuk mengisi nilai, sehingga saya dapat menghemat waktu saat input massal.

#### Acceptance Criteria

1. WHEN toolbar ditampilkan THEN sistem SHALL menampilkan button "Bulk Fill" untuk mengisi semua nilai kosong
2. WHEN toolbar ditampilkan THEN sistem SHALL menampilkan button "Fill All" untuk mengisi semua siswa dengan nilai tertentu
3. WHEN toolbar ditampilkan THEN sistem SHALL menampilkan button "Clear All" untuk menghapus semua nilai
4. WHEN toolbar ditampilkan THEN sistem SHALL menampilkan button "Import Excel" untuk import dari file
5. WHEN toolbar ditampilkan THEN sistem SHALL menggunakan flex flex-wrap gap-2 untuk responsive layout

### Requirement 7: Keyboard Navigation Support

**User Story:** Sebagai guru, saya ingin navigasi keyboard yang efisien, sehingga saya dapat mengisi nilai tanpa menggunakan mouse.

#### Acceptance Criteria

1. WHEN guru menekan Tab THEN sistem SHALL memindahkan focus ke input nilai siswa berikutnya
2. WHEN guru menekan Shift+Tab THEN sistem SHALL memindahkan focus ke input nilai siswa sebelumnya
3. WHEN guru menekan Enter THEN sistem SHALL memindahkan focus ke input nilai siswa berikutnya
4. WHEN guru menekan Ctrl+S THEN sistem SHALL menyimpan semua nilai yang telah diinput
5. WHEN guru menekan Escape THEN sistem SHALL menghilangkan focus dari input aktif

### Requirement 8: Import dari Excel/CSV

**User Story:** Sebagai guru, saya ingin mengimport nilai dari Excel, sehingga saya tidak perlu mengetik manual satu per satu.

#### Acceptance Criteria

1. WHEN guru klik "Import Excel" THEN sistem SHALL membuka modal import dengan drag & drop area
2. WHEN file di-upload THEN sistem SHALL memvalidasi format file (xlsx, csv)
3. WHEN file valid THEN sistem SHALL menampilkan preview data dengan mapping columns
4. WHEN guru konfirmasi import THEN sistem SHALL mengisi nilai sesuai dengan mapping nama siswa
5. WHEN import selesai THEN sistem SHALL menampilkan toast dengan jumlah nilai yang berhasil diimport

### Requirement 9: Export Template Excel

**User Story:** Sebagai guru, saya ingin mendownload template Excel, sehingga saya dapat mengisi nilai offline dan import kembali.

#### Acceptance Criteria

1. WHEN guru klik "Export Template" THEN sistem SHALL generate file Excel dengan kolom No, Nama Siswa, Nilai
2. WHEN template di-generate THEN sistem SHALL mengisi kolom Nama Siswa dengan data siswa dari kelas terpilih
3. WHEN template di-generate THEN sistem SHALL menambahkan data validation untuk kolom Nilai (0-100)
4. WHEN template di-generate THEN sistem SHALL menambahkan header dengan nama kelas dan mata pelajaran
5. WHEN template di-generate THEN sistem SHALL mendownload file dengan nama "Template_Nilai_{Kelas}_{Mapel}.xlsx"

### Requirement 10: Autosave Draft

**User Story:** Sebagai guru, saya ingin nilai yang sedang diinput tersimpan otomatis, sehingga saya tidak kehilangan data jika browser tertutup.

#### Acceptance Criteria

1. WHEN guru mengisi nilai THEN sistem SHALL menyimpan draft ke localStorage setiap 30 detik
2. WHEN guru membuka halaman kembali THEN sistem SHALL mendeteksi draft yang tersimpan
3. WHEN draft terdeteksi THEN sistem SHALL menampilkan modal konfirmasi untuk restore draft
4. WHEN guru pilih restore THEN sistem SHALL mengisi nilai sesuai dengan draft yang tersimpan
5. WHEN guru berhasil save THEN sistem SHALL menghapus draft dari localStorage

### Requirement 11: Validation dan Error Handling

**User Story:** Sebagai guru, saya ingin validasi yang jelas, sehingga saya dapat memperbaiki kesalahan input dengan mudah.

#### Acceptance Criteria

1. WHEN guru input nilai di luar range 0-100 THEN sistem SHALL menampilkan error message di bawah input
2. WHEN guru input nilai < KKM THEN sistem SHALL menampilkan warning indicator (amber color)
3. WHEN guru input nilai yang sudah ada THEN sistem SHALL menampilkan konfirmasi overwrite
4. WHEN guru save dengan nilai kosong THEN sistem SHALL menampilkan konfirmasi untuk mengisi sisanya dengan nilai default
5. WHEN terjadi error saat save THEN sistem SHALL menampilkan toast error dengan pesan yang actionable

### Requirement 12: Loading States dan Skeleton

**User Story:** Sebagai guru, saya ingin feedback visual saat loading, sehingga saya tahu sistem sedang memproses.

#### Acceptance Criteria

1. WHEN halaman loading THEN sistem SHALL menampilkan skeleton loader untuk configuration card
2. WHEN halaman loading THEN sistem SHALL menampilkan skeleton loader untuk student list (5 rows)
3. WHEN save in progress THEN sistem SHALL menampilkan loading spinner di button dengan text "Menyimpan..."
4. WHEN save in progress THEN sistem SHALL disable semua input dan button
5. WHEN save selesai THEN sistem SHALL menampilkan success animation (confetti atau checkmark)

### Requirement 13: Responsive Design

**User Story:** Sebagai guru, saya ingin tampilan yang optimal di semua device, sehingga saya dapat menggunakan aplikasi di desktop maupun mobile.

#### Acceptance Criteria

1. WHEN dibuka di mobile THEN sistem SHALL menggunakan card view untuk student list
2. WHEN dibuka di mobile THEN sistem SHALL menggunakan bottom sheet untuk quick actions
3. WHEN dibuka di mobile THEN sistem SHALL menggunakan sticky header untuk configuration
4. WHEN dibuka di tablet THEN sistem SHALL menggunakan grid layout 2 columns untuk stats
5. WHEN dibuka di desktop THEN sistem SHALL menggunakan table view dengan fixed header

### Requirement 14: Accessibility

**User Story:** Sebagai guru dengan disabilitas, saya ingin aplikasi yang accessible, sehingga saya dapat menggunakan aplikasi dengan assistive technology.

#### Acceptance Criteria

1. WHEN halaman dimuat THEN sistem SHALL menambahkan proper ARIA labels untuk semua input
2. WHEN halaman dimuat THEN sistem SHALL menambahkan role="table" untuk student list
3. WHEN focus pada input THEN sistem SHALL menampilkan focus ring yang jelas (ring-2 ring-indigo-500)
4. WHEN error terjadi THEN sistem SHALL mengumumkan error via screen reader
5. WHEN save berhasil THEN sistem SHALL mengumumkan success via screen reader

### Requirement 15: Performance Optimization

**User Story:** Sebagai guru dengan kelas besar, saya ingin aplikasi yang responsif, sehingga saya dapat mengisi nilai untuk 50+ siswa tanpa lag.

#### Acceptance Criteria

1. WHEN kelas memiliki > 30 siswa THEN sistem SHALL menggunakan virtualization untuk render list
2. WHEN guru mengetik nilai THEN sistem SHALL menggunakan debouncing (300ms) untuk validation
3. WHEN halaman dimuat THEN sistem SHALL menggunakan lazy loading untuk avatar images
4. WHEN save dipanggil THEN sistem SHALL menggunakan optimistic updates untuk UI
5. WHEN data di-fetch THEN sistem SHALL menggunakan caching dengan React Query

