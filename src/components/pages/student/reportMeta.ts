export const REPORT_CATEGORIES = {
    akademik: { label: 'Akademik', color: 'blue', icon: '📚', description: 'Catatan terkait pembelajaran & nilai' },
    perilaku: { label: 'Perilaku', color: 'orange', icon: '👤', description: 'Catatan sikap & perilaku siswa' },
    kesehatan: { label: 'Kesehatan', color: 'green', icon: '🏥', description: 'Catatan kondisi kesehatan' },
    prestasi: { label: 'Prestasi', color: 'purple', icon: '🏆', description: 'Pencapaian & prestasi siswa' },
    lainnya: { label: 'Lainnya', color: 'gray', icon: '📝', description: 'Catatan umum lainnya' },
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export const COMMON_TAGS = [
    'penting', 'mendesak', 'positif', 'perlu-perhatian', 'follow-up',
    'diskusi-ortu', 'bimbingan', 'konseling', 'remedial', 'pengayaan'
] as const;
