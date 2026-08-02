import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Available languages
export type Language = 'id' | 'en';
export type SupportedLanguage = Language;

// Translation value type - either a string or a nested object of translations
export type TranslationValue = string | { [key: string]: TranslationValue };
// Simplified translation key type
export type TranslationKey = TranslationValue;

// Translation structure.
//
// Scoped deliberately to the strings that are actually rendered: the four
// dashboard widgets (DashboardGreeting, GradeAuditWidget, ScheduleTimeline,
// TodayActionPanel) and ErrorBoundary. Sections for screens that never call
// useI18n() were dropped — they were unreachable text kept in sync by hand.
// Add a key back here when a component genuinely starts translating.
export interface Translations {
    common: {
        cancel: string;
        all: string;
    };
    nav: {
        dashboard: string;
    };
    errors: {
        general: string;
        tryAgain: string;
        contactSupport: string;
    };
    dashboard: {
        greetingMorning: string;
        greetingAfternoon: string;
        greetingEvening: string;
        greetingNight: string;
        cloudSyncActive: string;
        modeOffline: string;
        hidePanel: string;
        showPanel: string;
        noScheduleToday: string;
        enjoyFreeTime: string;
        inProgress: string;
        minutesRemaining: string;
        minutesUnit: string;
        gradeAuditTitle: string;
        gradeAuditSubtitle: string;
        allClasses: string;
        subject: string;
        completionProgress: string;
        gradedComplete: string;
        completeMissing: string;
        allGraded: string;
        allGradedDesc: string;
        selectSubject: string;
        selectSubjectDesc: string;
        actionsToday: string;
        actionsSubtitle: string;
        teacherPriority: string;
        attendanceIncomplete: string;
        taskOverdue: string;
        taskDueSoon: string;
        unreadMessages: string;
        gradeDropTrend: string;
        noUrgentActions: string;
        noUrgentDesc: string;
    };
}

// Indonesian translations
export const idTranslations: Translations = {
    common: {
        cancel: 'Batal',
        all: 'Semua',
    },
    nav: {
        dashboard: 'Beranda',
    },
    errors: {
        general: 'Terjadi kesalahan, silakan coba lagi',
        tryAgain: 'Coba Lagi',
        contactSupport: 'Hubungi dukungan jika masalah berlanjut',
    },
    dashboard: {
        greetingMorning: 'Selamat Pagi',
        greetingAfternoon: 'Selamat Siang',
        greetingEvening: 'Selamat Sore',
        greetingNight: 'Selamat Malam',
        cloudSyncActive: 'Cloud Sync Aktif',
        modeOffline: 'Mode Offline (Lokal)',
        hidePanel: 'Sembunyikan Panel',
        showPanel: 'Tampilkan Panel',
        noScheduleToday: 'Tidak ada jadwal hari ini.',
        enjoyFreeTime: 'Nikmati waktu luang Anda!',
        inProgress: 'Berjalan',
        minutesRemaining: 'menit lagi',
        minutesUnit: 'menit',
        gradeAuditTitle: 'Audit Nilai',
        gradeAuditSubtitle: 'Cek kelengkapan penilaian siswa',
        allClasses: 'Semua Kelas',
        subject: 'Mapel',
        completionProgress: 'Progres Kelengkapan',
        gradedComplete: 'Selesai Dinilai',
        completeMissing: 'Lengkapi',
        allGraded: 'Lengkap!',
        allGradedDesc: 'Semua siswa sudah dinilai',
        selectSubject: 'Pilih mapel untuk cek',
        selectSubjectDesc: 'Pilih mata pelajaran di atas untuk melihat kelengkapan nilai',
        actionsToday: 'Butuh Tindakan Hari Ini',
        actionsSubtitle: 'Ringkasan operasional yang perlu diputuskan tanpa membuka banyak menu.',
        teacherPriority: 'Prioritas Guru',
        attendanceIncomplete: 'Absensi belum lengkap',
        taskOverdue: 'Tugas melewati deadline',
        taskDueSoon: 'Tugas mendekati deadline',
        unreadMessages: 'Pesan wali belum dibaca',
        gradeDropTrend: 'Tren nilai menurun',
        noUrgentActions: 'Tidak ada tindakan mendesak',
        noUrgentDesc: 'Absensi, pesan wali, tugas, dan tren nilai tidak menunjukkan masalah utama hari ini.',
    },
};

// English translations
export const enTranslations: Translations = {
    common: {
        cancel: 'Cancel',
        all: 'All',
    },
    nav: {
        dashboard: 'Dashboard',
    },
    errors: {
        general: 'An error occurred, please try again',
        tryAgain: 'Try Again',
        contactSupport: 'Contact support if the problem persists',
    },
    dashboard: {
        greetingMorning: 'Good Morning',
        greetingAfternoon: 'Good Afternoon',
        greetingEvening: 'Good Evening',
        greetingNight: 'Good Night',
        cloudSyncActive: 'Cloud Sync Active',
        modeOffline: 'Offline Mode (Local)',
        hidePanel: 'Hide Panel',
        showPanel: 'Show Panel',
        noScheduleToday: 'No schedule today.',
        enjoyFreeTime: 'Enjoy your free time!',
        inProgress: 'In Progress',
        minutesRemaining: 'min remaining',
        minutesUnit: 'min',
        gradeAuditTitle: 'Grade Audit',
        gradeAuditSubtitle: 'Check student grade completion',
        allClasses: 'All Classes',
        subject: 'Subject',
        completionProgress: 'Completion Progress',
        gradedComplete: 'Grading Complete',
        completeMissing: 'Complete',
        allGraded: 'Complete!',
        allGradedDesc: 'All students have been graded',
        selectSubject: 'Select a subject to check',
        selectSubjectDesc: 'Select a subject above to view grade completion',
        actionsToday: 'Actions Needed Today',
        actionsSubtitle: 'Operational summary that needs attention without opening multiple menus.',
        teacherPriority: 'Teacher Priority',
        attendanceIncomplete: 'Attendance incomplete',
        taskOverdue: 'Overdue tasks',
        taskDueSoon: 'Tasks approaching deadline',
        unreadMessages: 'Unread parent messages',
        gradeDropTrend: 'Declining grade trend',
        noUrgentActions: 'No urgent actions',
        noUrgentDesc: 'Attendance, parent messages, tasks, and grade trends show no major issues today.',
    },
};

const translations: Record<Language, Translations> = {
    id: idTranslations,
    en: enTranslations,
};

export interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    translate: (path: string, params?: Record<string, string | number>) => string;
    formatDate: (date: Date, format?: 'short' | 'long') => string;
    formatNumber: (num: number) => string;
    languages: { code: Language; label: string; nativeLabel: string; name: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export interface I18nProviderProps {
    children: ReactNode;
    defaultLanguage?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
    children,
    defaultLanguage = 'id',
}) => {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('portal-guru-language');
            if (saved && (saved === 'id' || saved === 'en')) {
                return saved as Language;
            }
        }
        return defaultLanguage;
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('portal-guru-language', lang);
        }
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.lang = lang;
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('lang', language);
        document.documentElement.lang = language;
    }, [language]);

    // Helper to get translation by dot path (e.g., 'common.save')
    const translate = useCallback((path: string, params?: Record<string, string | number>): string => {
        const keys = path.split('.');
        let result: unknown = translations[language];

        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = (result as Record<string, unknown>)[key];
            } else {
                console.warn(`Translation key not found: ${path}`);
                return path;
            }
        }

        if (typeof result !== 'string') {
            console.warn(`Translation key is not a string: ${path}`);
            return path;
        }

        // Replace parameters
        if (params) {
            return Object.entries(params).reduce((str, [key, value]) => {
                return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            }, result);
        }

        return result;
    }, [language]);

    const formatDate = useCallback((date: Date, format: 'short' | 'long' = 'short'): string => {
        const locale = language === 'id' ? 'id-ID' : 'en-US';
        const options: Intl.DateTimeFormatOptions = format === 'long'
            ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            : { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(locale, options);
    }, [language]);

    const formatNumber = useCallback((num: number): string => {
        const locale = language === 'id' ? 'id-ID' : 'en-US';
        return num.toLocaleString(locale);
    }, [language]);

    const availableLanguages = [
        { code: 'id' as Language, label: 'Indonesian', nativeLabel: 'Indonesia', name: 'Bahasa Indonesia' },
        { code: 'en' as Language, label: 'English', nativeLabel: 'English', name: 'English' },
    ];

    const value: I18nContextType = {
        language,
        setLanguage,
        t: translations[language],
        translate,
        formatDate,
        formatNumber,
        languages: availableLanguages,
    };

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};

// Shorthand hooks and aliases for backward compatibility
export const useTranslation = useI18n;
export const useTranslations = () => {
    const { t, translate } = useI18n();
    return { t, translate };
};

// Language selector component - enhanced
export interface LanguageSelectorProps {
    className?: string;
    variant?: 'select' | 'buttons';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    className = '',
    variant = 'select',
}) => {
    const { language, setLanguage, languages } = useI18n();

    if (variant === 'buttons') {
        return (
            <div className={`flex gap-2 ${className}`}>
                {languages.map((lang) => (
                    <button type="button"
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${language === lang.code
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }
                        `}
                        aria-pressed={language === lang.code}
                    >
                        {lang.nativeLabel}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className={`
                px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 
                bg-white dark:bg-slate-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500
                ${className}
            `}
            aria-label="Select language"
        >
            {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.code === 'id' ? '🇮🇩' : '🇬🇧'} {lang.nativeLabel}
                </option>
            ))}
        </select>
    );
};

// Trans component for inline translations
export interface TransProps {
    i18nKey?: string; // alias
    id?: string;      // alias
    components?: Record<string, React.ReactElement>;
    values?: Record<string, string | number>;
}

export const Trans: React.FC<TransProps> = ({ i18nKey, id, values }) => {
    const { translate } = useI18n();
    const key = i18nKey || id || '';
    return <>{translate(key, values)}</>;
};

export default {
    I18nProvider,
    useTranslation,
    useTranslations,
    useI18n,
    LanguageSelector,
    Trans,
};
