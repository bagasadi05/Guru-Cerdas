import { AnnouncementTemplate } from './types';

/**
 * Pre-defined announcement templates for quick creation
 */
export const announcementTemplates: AnnouncementTemplate[] = [
    {
        id: 'semester-break',
        title: 'Libur Semester Ganjil',
        content: 'Libur semester ganjil akan dimulai pada tanggal 20 Desember 2024 sampai 5 Januari 2025. Selamat berlibur!',
        audience_type: 'all',
        category: 'Akademik',
        icon: 'calendar'
    },
    {
        id: 'exam-schedule',
        title: 'Jadwal Ujian Semester',
        content: 'Ujian Akhir Semester akan dilaksanakan mulai tanggal 15-22 Desember 2024. Harap siswa mempersiapkan diri dengan baik.',
        audience_type: 'students',
        category: 'Akademik',
        icon: 'clipboard-check'
    },
    {
        id: 'report-card',
        title: 'Pengambilan Rapor',
        content: 'Pengambilan rapor semester ganjil dilaksanakan pada tanggal 19 Desember 2024. Harap orang tua hadir tepat waktu.',
        audience_type: 'parents',
        category: 'Akademik',
        icon: 'file-text'
    },
    {
        id: 'parent-meeting',
        title: 'Rapat Wali Murid',
        content: 'Rapat wali murid akan dilaksanakan pada hari Sabtu, 14 Desember 2024 pukul 09.00 WIB. Kehadiran wali murid sangat diharapkan.',
        audience_type: 'parents',
        category: 'Umum',
        icon: 'users'
    },
    {
        id: 'vaccination',
        title: 'Vaksinasi Siswa',
        content: 'Akan diadakan vaksinasi booster untuk seluruh siswa pada tanggal 10 Januari 2025. Harap orang tua hadir mendampingi.',
        audience_type: 'all',
        category: 'Kesehatan',
        icon: 'heart-pulse'
    },
    {
        id: 'field-trip',
        title: 'Study Tour',
        content: 'Study tour ke museum nasional akan dilaksanakan pada tanggal 25 Januari 2025. Biaya Rp 150.000 per siswa.',
        audience_type: 'all',
        category: 'Kegiatan',
        icon: 'bus'
    },
    {
        id: 'teacher-training',
        title: 'Pelatihan Guru',
        content: 'Pelatihan pengembangan metode pembelajaran akan dilaksanakan pada 5-7 Januari 2025. Semua guru wajib hadir.',
        audience_type: 'teachers',
        category: 'Profesional',
        icon: 'graduation-cap'
    },
    {
        id: 'extracurricular',
        title: 'Pendaftaran Ekstrakurikuler',
        content: 'Pendaftaran ekstrakurikuler semester genap dibuka mulai 8-15 Januari 2025. Silakan daftar melalui wali kelas.',
        audience_type: 'students',
        category: 'Kegiatan',
        icon: 'trophy'
    },
    {
        id: 'payment-reminder',
        title: 'Pembayaran SPP',
        content: 'Mohon segera menyelesaikan pembayaran SPP bulan ini paling lambat tanggal 10. Terima kasih atas kerjasamanya.',
        audience_type: 'parents',
        category: 'Administrasi',
        icon: 'credit-card'
    },
    {
        id: 'independence-day',
        title: 'Peringatan Hari Kemerdekaan',
        content: 'Dalam rangka memperingati Hari Kemerdekaan RI, akan diadakan upacara dan lomba-lomba pada 17 Agustus 2025.',
        audience_type: 'all',
        category: 'Kegiatan',
        icon: 'flag'
    }
];
