import React from 'react';
import { GraduationCapIcon, CheckSquareIcon, ShieldAlertIcon, PrinterIcon, FileTextIcon, DownloadIcon, HeartIcon } from '../../Icons';
import { HelpCircle, Lightbulb, Mic, MessageSquare, FileCheck2, Star, Sparkles, Zap, ShieldCheck, Compass } from 'lucide-react';
import { InputMode } from './types';

export type CardAccent = 'emerald' | 'brand' | 'teal' | 'rose' | 'amber' | 'sky';

export interface ModeCardConfig {
    mode: InputMode;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    badge: string;
    accent: CardAccent;
    ctaLabel: string;
}

export const inputCards: ModeCardConfig[] = [
    {
        mode: 'subject_grade',
        title: 'Input Nilai Mapel',
        description: 'Input nilai harian/sumatif, Katrol Nilai & Import Excel.',
        icon: GraduationCapIcon,
        badge: 'Akademik',
        accent: 'emerald',
        ctaLabel: 'Input Nilai',
    },
    {
        mode: 'quiz',
        title: 'Input Poin Keaktifan',
        description: 'Beri +1 poin instan untuk siswa yang aktif di kelas.',
        icon: CheckSquareIcon,
        badge: 'Partisipasi +1',
        accent: 'amber',
        ctaLabel: 'Beri Poin',
    },
    {
        mode: 'attitude',
        title: 'Input Nilai Sikap',
        description: 'Catat pembiasaan positif penunjang Rapor BINTANG.',
        icon: HeartIcon,
        badge: 'Rapor BINTANG',
        accent: 'brand',
        ctaLabel: 'Catat Sikap',
    },
    {
        mode: 'violation',
        title: 'Input Pelanggaran',
        description: 'Catat poin kedisiplinan atau pelanggaran tata tertib.',
        icon: ShieldAlertIcon,
        badge: 'Kedisiplinan',
        accent: 'rose',
        ctaLabel: 'Catat Poin',
    },
];

export const exportCards: ModeCardConfig[] = [
    {
        mode: 'violation_export',
        title: 'Cetak Rapor Pelanggaran',
        description: 'Unduh rekap pelanggaran kelas dalam PDF atau Excel.',
        icon: DownloadIcon,
        badge: 'PDF & Excel',
        accent: 'rose',
        ctaLabel: 'Unduh Rekap',
    },
    {
        mode: 'bulk_report',
        title: 'Cetak Rapor Massal',
        description: 'Cetak rapor lengkap satu kelas sekaligus dalam satu file.',
        icon: PrinterIcon,
        badge: 'Dokumen Kelas',
        accent: 'brand',
        ctaLabel: 'Cetak Rapor',
    },
    {
        mode: 'academic_print',
        title: 'Cetak Nilai Akademik',
        description: 'Cetak lembar rekapitulasi nilai per mata pelajaran.',
        icon: FileTextIcon,
        badge: 'Rekap Mapel',
        accent: 'emerald',
        ctaLabel: 'Cetak Nilai',
    },
];


export const actionCards = [...inputCards, ...exportCards];

export interface QuizActivityCategory {
    value: string;
    label: string;
    icon: string;
    IconComponent: React.FC<{ className?: string }>;
}

export const QUIZ_ACTIVITY_CATEGORIES: QuizActivityCategory[] = [
    { value: 'bertanya', label: 'Bertanya', icon: '❓', IconComponent: HelpCircle },
    { value: 'menjawab', label: 'Menjawab', icon: '💡', IconComponent: Lightbulb },
    { value: 'presentasi', label: 'Presentasi', icon: '🎤', IconComponent: Mic },
    { value: 'diskusi', label: 'Diskusi', icon: '💬', IconComponent: MessageSquare },
    { value: 'tugas_tambahan', label: 'Tugas Tambahan', icon: '📝', IconComponent: FileCheck2 },
    { value: 'lainnya', label: 'Lainnya', icon: '⭐', IconComponent: Star },
];

export const QUIZ_CATEGORY_DEFAULT_NAMES: Record<string, string> = {
    bertanya: 'Aktif bertanya di kelas',
    menjawab: 'Menjawab pertanyaan guru',
    presentasi: 'Presentasi tugas',
    diskusi: 'Aktif dalam diskusi',
    tugas_tambahan: 'Mengerjakan tugas tambahan',
    tugas: 'Mengerjakan tugas tambahan',
    lainnya: 'Partisipasi aktif',
};

export const QUIZ_ACTIVITY_SUGGESTIONS: Record<string, string[]> = {
    bertanya: ['Aktif bertanya di kelas', 'Bertanya saat diskusi', 'Mengajukan pertanyaan kritis'],
    menjawab: ['Menjawab pertanyaan guru', 'Berani menjawab di depan kelas', 'Membantu teman menjawab'],
    presentasi: ['Presentasi tugas kelompok', 'Presentasi individu', 'Mempresentasikan hasil diskusi'],
    diskusi: ['Aktif dalam diskusi kelompok', 'Memimpin diskusi', 'Memberikan pendapat'],
    tugas_tambahan: ['Mengerjakan soal tambahan', 'Membantu teman belajar', 'Proyek tambahan'],
    tugas: ['Mengerjakan soal tambahan', 'Membantu teman belajar', 'Proyek tambahan'],
    lainnya: ['Partisipasi aktif', 'Membantu guru', 'Inisiatif baik'],
};

export interface BintangAttitudeAspect {
    value: string;
    label: string;
    icon: string;
    IconComponent: React.FC<{ className?: string }>;
    menunjang: string;
    defaultActivity: string;
}

export const BINTANG_ATTITUDE_ASPECTS: BintangAttitudeAspect[] = [
    { value: 'Adab & Akhlak', label: 'Adab & Akhlak', icon: '🌟', IconComponent: Sparkles, menunjang: 'Menunjang Aspek Adab', defaultActivity: 'Adab & Kesantunan' },
    { value: 'Kedisiplinan & Sikap', label: 'Kedisiplinan & Sikap', icon: '⚡', IconComponent: Zap, menunjang: 'Menunjang Aspek Sikap', defaultActivity: 'Tertib & Disiplin' },
    { value: 'Kerapian & Kebersihan', label: 'Kerapian & Kebersihan', icon: '✨', IconComponent: ShieldCheck, menunjang: 'Menunjang Aspek Kerapian', defaultActivity: 'Menjaga Kebersihan Kelas' },
    { value: 'Pembiasaan Ibadah', label: 'Pembiasaan Ibadah', icon: '🕌', IconComponent: Compass, menunjang: 'Menunjang Karakter Ibadah', defaultActivity: 'Shalat Dhuha / Berjamaah' },
    { value: 'Keaktifan & Inisiatif', label: 'Keaktifan & Inisiatif', icon: '💡', IconComponent: Lightbulb, menunjang: 'Menunjang Keaktifan', defaultActivity: 'Inisiatif Positif di Kelas' },
];

export const ATTITUDE_SUGGESTIONS: Record<string, string[]> = {
    'Adab & Akhlak': ['Adab & Kesantunan', 'Menghormati Guru & Teman', 'Berkata Santun & Jujur', 'Membantu Teman'],
    'Kedisiplinan & Sikap': ['Tertib & Disiplin', 'Tepat Waktu Masuk Kelas', 'Patuh Tata Tertib', 'Tanggung Jawab Tugas'],
    'Kerapian & Kebersihan': ['Menjaga Kebersihan Kelas', 'Piket Kebersihan', 'Kerapian Meja & Seragam', 'Merawat Sarana Kelas'],
    'Pembiasaan Ibadah': ['Shalat Dhuha / Berjamaah', 'Tadarus Al-Qur\'an', 'Dzikir & Doa Bersama', 'Istiqamah Ibadah'],
    'Keaktifan & Inisiatif': ['Inisiatif Positif di Kelas', 'Membantu Guru', 'Berani Memimpin Teman', 'Partisipasi Aktif'],
};


