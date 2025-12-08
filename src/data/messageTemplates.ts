/**
 * Message Templates for Parent Communication
 * Pre-defined templates for common teacher-parent communications
 */

export interface MessageTemplate {
    id: string;
    category: 'academic' | 'behavior' | 'attendance' | 'general' | 'event';
    title: string;
    message: string;
    placeholders?: string[];
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
    // Academic Templates
    {
        id: 'academic-progress',
        category: 'academic',
        title: 'Perkembangan Akademik',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin memberikan informasi mengenai perkembangan akademik {{nama_siswa}} di kelas.\n\n{{pesan_detail}}\n\nTerima kasih atas perhatian dan kerjasamanya.\n\nHormat kami,\nGuru Kelas',
        placeholders: ['nama_siswa', 'pesan_detail']
    },
    {
        id: 'academic-improvement',
        category: 'academic',
        title: 'Perlu Peningkatan',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin menyampaikan bahwa {{nama_siswa}} memerlukan perhatian lebih dalam mata pelajaran tertentu.\n\nMohon kerjasamanya untuk membantu belajar di rumah.\n\nTerima kasih.',
        placeholders: ['nama_siswa']
    },
    {
        id: 'academic-excellent',
        category: 'academic',
        title: 'Prestasi Baik',
        message: 'Yth. Bapak/Ibu Wali,\n\nDengan bangga kami sampaikan bahwa {{nama_siswa}} menunjukkan prestasi yang sangat baik dalam pembelajaran.\n\nTerus semangat dan pertahankan!\n\nSalam hangat.',
        placeholders: ['nama_siswa']
    },

    // Behavior Templates
    {
        id: 'behavior-positive',
        category: 'behavior',
        title: 'Perilaku Positif',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin menyampaikan apresiasi atas perilaku positif {{nama_siswa}} di sekolah. {{nama_siswa}} menunjukkan sikap yang baik dan menjadi contoh bagi teman-temannya.\n\nTerima kasih atas didikan yang baik di rumah.',
        placeholders: ['nama_siswa']
    },
    {
        id: 'behavior-concern',
        category: 'behavior',
        title: 'Perhatian Perilaku',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin menyampaikan informasi mengenai perilaku {{nama_siswa}} yang perlu diperhatikan.\n\n{{detail_perilaku}}\n\nMohon kerjasamanya untuk memberikan arahan di rumah.\n\nTerima kasih.',
        placeholders: ['nama_siswa', 'detail_perilaku']
    },

    // Attendance Templates
    {
        id: 'attendance-absent',
        category: 'attendance',
        title: 'Konfirmasi Ketidakhadiran',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin mengonfirmasi bahwa {{nama_siswa}} tidak hadir di sekolah hari ini. Mohon informasikan alasan ketidakhadiran.\n\nTerima kasih.',
        placeholders: ['nama_siswa']
    },
    {
        id: 'attendance-late',
        category: 'attendance',
        title: 'Keterlambatan',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami ingin memberitahukan bahwa {{nama_siswa}} terlambat datang ke sekolah hari ini.\n\nMohon perhatiannya agar {{nama_siswa}} dapat hadir tepat waktu.\n\nTerima kasih.',
        placeholders: ['nama_siswa']
    },

    // General Templates
    {
        id: 'general-reminder',
        category: 'general',
        title: 'Pengingat Umum',
        message: 'Yth. Bapak/Ibu Wali,\n\nMohon perhatian untuk hal berikut:\n\n{{isi_pengingat}}\n\nTerima kasih atas kerjasamanya.',
        placeholders: ['isi_pengingat']
    },
    {
        id: 'general-thanks',
        category: 'general',
        title: 'Ucapan Terima Kasih',
        message: 'Yth. Bapak/Ibu Wali,\n\nTerima kasih atas partisipasi dan dukungan Anda terhadap kegiatan sekolah. Kerjasama Anda sangat berarti bagi perkembangan {{nama_siswa}}.\n\nSalam hangat.',
        placeholders: ['nama_siswa']
    },

    // Event Templates
    {
        id: 'event-meeting',
        category: 'event',
        title: 'Undangan Pertemuan',
        message: 'Yth. Bapak/Ibu Wali,\n\nDengan hormat, kami mengundang Bapak/Ibu untuk hadir dalam pertemuan orang tua yang akan dilaksanakan pada:\n\nHari/Tanggal: {{tanggal}}\nWaktu: {{waktu}}\nTempat: {{tempat}}\n\nKehadiran Bapak/Ibu sangat kami harapkan.\n\nTerima kasih.',
        placeholders: ['tanggal', 'waktu', 'tempat']
    },
    {
        id: 'event-activity',
        category: 'event',
        title: 'Informasi Kegiatan',
        message: 'Yth. Bapak/Ibu Wali,\n\nKami informasikan bahwa akan ada kegiatan {{nama_kegiatan}} yang akan dilaksanakan pada:\n\nHari/Tanggal: {{tanggal}}\n\nMohon persiapkan {{nama_siswa}} untuk mengikuti kegiatan tersebut.\n\nTerima kasih.',
        placeholders: ['nama_kegiatan', 'tanggal', 'nama_siswa']
    }
];

export const TEMPLATE_CATEGORIES = {
    academic: { label: 'Akademik', color: 'blue' },
    behavior: { label: 'Perilaku', color: 'purple' },
    attendance: { label: 'Kehadiran', color: 'amber' },
    general: { label: 'Umum', color: 'slate' },
    event: { label: 'Acara', color: 'green' }
};

/**
 * Replace placeholders in template with actual values
 */
export function applyTemplate(template: MessageTemplate, values: Record<string, string>): string {
    let result = template.message;

    Object.entries(values).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return result;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: MessageTemplate['category']): MessageTemplate[] {
    return MESSAGE_TEMPLATES.filter(t => t.category === category);
}
