import {
    Trophy,
    GraduationCap,
    Music,
    Award,
    BookOpen,
    Sparkles,
    Medal,
} from 'lucide-react';
import {
    AchievementCategory,
    AchievementLevel,
    AchievementRank,
} from '../types/studentAchievement';

export const ACHIEVEMENT_CATEGORY_META = {
    akademik: {
        label: 'Akademik',
        icon: GraduationCap,
        color: 'indigo',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
        textClass: 'text-indigo-700 dark:text-indigo-400',
        borderClass: 'border-indigo-200 dark:border-indigo-900',
    },
    non_akademik: {
        label: 'Non-Akademik',
        icon: Sparkles,
        color: 'emerald',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-200 dark:border-emerald-900',
    },
    seni: {
        label: 'Seni',
        icon: Music,
        color: 'pink',
        bgClass: 'bg-pink-50 dark:bg-pink-950/30',
        textClass: 'text-pink-700 dark:text-pink-400',
        borderClass: 'border-pink-200 dark:border-pink-900',
    },
    olahraga: {
        label: 'Olahraga',
        icon: Trophy,
        color: 'amber',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-900',
    },
    keagamaan: {
        label: 'Keagamaan',
        icon: BookOpen,
        color: 'teal',
        bgClass: 'bg-teal-50 dark:bg-teal-950/30',
        textClass: 'text-teal-700 dark:text-teal-400',
        borderClass: 'border-teal-200 dark:border-teal-900',
    },
    lainnya: {
        label: 'Lainnya',
        icon: Award,
        color: 'slate',
        bgClass: 'bg-slate-50 dark:bg-slate-900/30',
        textClass: 'text-slate-700 dark:text-slate-400',
        borderClass: 'border-slate-200 dark:border-slate-800',
    },
} as const;

export const ACHIEVEMENT_LEVEL_META = {
    sekolah: { label: 'Sekolah', color: 'slate' },
    kecamatan: { label: 'Kecamatan', color: 'blue' },
    kabupaten_kota: { label: 'Kabupaten/Kota', color: 'amber' },
    provinsi: { label: 'Provinsi', color: 'orange' },
    nasional: { label: 'Nasional', color: 'red' },
    internasional: { label: 'Internasional', color: 'purple' },
} as const;

export const ACHIEVEMENT_RANK_META = {
    juara_1: { label: 'Juara 1', icon: Medal, color: 'text-yellow-500' },
    juara_2: { label: 'Juara 2', icon: Medal, color: 'text-slate-400' },
    juara_3: { label: 'Juara 3', icon: Medal, color: 'text-amber-600' },
    harapan: { label: 'Harapan', icon: Award, color: 'text-blue-500' },
    finalis: { label: 'Finalis', icon: Award, color: 'text-indigo-500' },
    partisipan: { label: 'Partisipan', icon: Award, color: 'text-slate-500' },
} as const;

export const getCategoryMeta = (category: AchievementCategory) => {
    return ACHIEVEMENT_CATEGORY_META[category] || ACHIEVEMENT_CATEGORY_META.lainnya;
};

export const getLevelLabel = (level: AchievementLevel) => {
    return ACHIEVEMENT_LEVEL_META[level]?.label || level;
};

export const getRankMeta = (rank: AchievementRank | null | undefined) => {
    if (!rank) return null;
    return ACHIEVEMENT_RANK_META[rank] || null;
};
