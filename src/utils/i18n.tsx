/**
 * Internationalization (i18n) System
 * 
 * Provides multi-language support for the Portal Guru application.
 * Default language: Indonesian (id)
 * Supported languages: Indonesian (id), English (en)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type SupportedLanguage = 'id' | 'en';

export interface TranslationKey {
    [key: string]: string | TranslationKey;
}

// ============================================
// INDONESIAN TRANSLATIONS (DEFAULT)
// ============================================

export const idTranslations: TranslationKey = {
    // Common
    common: {
        save: 'Simpan',
        cancel: 'Batal',
        delete: 'Hapus',
        edit: 'Edit',
        add: 'Tambah',
        search: 'Cari',
        filter: 'Filter',
        export: 'Ekspor',
        import: 'Impor',
        refresh: 'Muat Ulang',
        loading: 'Memuat...',
        error: 'Terjadi Kesalahan',
        success: 'Berhasil',
        confirm: 'Konfirmasi',
        close: 'Tutup',
        back: 'Kembali',
        next: 'Selanjutnya',
        previous: 'Sebelumnya',
        yes: 'Ya',
        no: 'Tidak',
        all: 'Semua',
        none: 'Tidak Ada',
        select: 'Pilih',
        required: 'Wajib diisi',
        optional: 'Opsional',
        actions: 'Aksi',
        details: 'Detail',
        view: 'Lihat',
        print: 'Cetak',
        download: 'Unduh',
    },

    // Navigation
    nav: {
        dashboard: 'Dashboard',
        students: 'Siswa',
        attendance: 'Kehadiran',
        schedule: 'Jadwal',
        tasks: 'Tugas',
        reports: 'Laporan',
        analytics: 'Analitik',
        settings: 'Pengaturan',
        logout: 'Keluar',
        profile: 'Profil',
    },

    // Dashboard
    dashboard: {
        welcome: 'Selamat Datang',
        todaySchedule: 'Jadwal Hari Ini',
        recentActivity: 'Aktivitas Terbaru',
        quickStats: 'Statistik Cepat',
        totalStudents: 'Total Siswa',
        totalClasses: 'Total Kelas',
        attendanceRate: 'Tingkat Kehadiran',
        pendingTasks: 'Tugas Tertunda',
    },

    // Students
    students: {
        title: 'Daftar Siswa',
        addStudent: 'Tambah Siswa',
        editStudent: 'Edit Siswa',
        deleteStudent: 'Hapus Siswa',
        studentName: 'Nama Siswa',
        className: 'Kelas',
        gender: 'Jenis Kelamin',
        male: 'Laki-laki',
        female: 'Perempuan',
        accessCode: 'Kode Akses',
        parentPhone: 'Nomor HP Orang Tua',
        noStudents: 'Belum ada siswa',
        searchPlaceholder: 'Cari siswa...',
        confirmDelete: 'Apakah Anda yakin ingin menghapus siswa ini?',
    },

    // Attendance
    attendance: {
        title: 'Kehadiran',
        present: 'Hadir',
        absent: 'Alpha',
        sick: 'Sakit',
        permission: 'Izin',
        markAttendance: 'Tandai Kehadiran',
        attendanceDate: 'Tanggal',
        selectDate: 'Pilih Tanggal',
        noAttendance: 'Belum ada data kehadiran',
        summary: 'Ringkasan Kehadiran',
    },

    // Schedule
    schedule: {
        title: 'Jadwal Pelajaran',
        addSchedule: 'Tambah Jadwal',
        subject: 'Mata Pelajaran',
        day: 'Hari',
        startTime: 'Waktu Mulai',
        endTime: 'Waktu Selesai',
        monday: 'Senin',
        tuesday: 'Selasa',
        wednesday: 'Rabu',
        thursday: 'Kamis',
        friday: 'Jumat',
        noSchedule: 'Tidak ada jadwal',
    },

    // Tasks
    tasks: {
        title: 'Daftar Tugas',
        addTask: 'Tambah Tugas',
        taskTitle: 'Judul Tugas',
        description: 'Deskripsi',
        dueDate: 'Tenggat',
        status: 'Status',
        todo: 'Belum Dikerjakan',
        inProgress: 'Sedang Dikerjakan',
        done: 'Selesai',
        noTasks: 'Belum ada tugas',
    },

    // Auth
    auth: {
        login: 'Masuk',
        logout: 'Keluar',
        email: 'Email',
        password: 'Kata Sandi',
        forgotPassword: 'Lupa Kata Sandi?',
        rememberMe: 'Ingat Saya',
        loginFailed: 'Email atau kata sandi salah',
        sessionExpired: 'Sesi Anda telah berakhir',
    },

    // Errors
    errors: {
        networkError: 'Koneksi terputus',
        serverError: 'Terjadi kesalahan server',
        notFound: 'Data tidak ditemukan',
        unauthorized: 'Akses ditolak',
        validationError: 'Data tidak valid',
        tryAgain: 'Coba Lagi',
    },

    // Offline
    offline: {
        banner: 'Anda sedang offline',
        pendingChanges: 'perubahan menunggu sinkronisasi',
        syncNow: 'Sinkronkan Sekarang',
        dataFromCache: 'Data dari cache',
        lastUpdated: 'Terakhir diperbarui',
    },

    // Accessibility
    a11y: {
        skipToContent: 'Lewati ke konten utama',
        menu: 'Menu',
        closeMenu: 'Tutup menu',
        openMenu: 'Buka menu',
        loading: 'Sedang memuat',
        expandSection: 'Buka bagian',
        collapseSection: 'Tutup bagian',
    },
};

// ============================================
// ENGLISH TRANSLATIONS
// ============================================

export const enTranslations: TranslationKey = {
    // Common
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        loading: 'Loading...',
        error: 'Error Occurred',
        success: 'Success',
        confirm: 'Confirm',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        yes: 'Yes',
        no: 'No',
        all: 'All',
        none: 'None',
        select: 'Select',
        required: 'Required',
        optional: 'Optional',
        actions: 'Actions',
        details: 'Details',
        view: 'View',
        print: 'Print',
        download: 'Download',
    },

    // Navigation
    nav: {
        dashboard: 'Dashboard',
        students: 'Students',
        attendance: 'Attendance',
        schedule: 'Schedule',
        tasks: 'Tasks',
        reports: 'Reports',
        analytics: 'Analytics',
        settings: 'Settings',
        logout: 'Logout',
        profile: 'Profile',
    },

    // Dashboard
    dashboard: {
        welcome: 'Welcome',
        todaySchedule: "Today's Schedule",
        recentActivity: 'Recent Activity',
        quickStats: 'Quick Stats',
        totalStudents: 'Total Students',
        totalClasses: 'Total Classes',
        attendanceRate: 'Attendance Rate',
        pendingTasks: 'Pending Tasks',
    },

    // Students
    students: {
        title: 'Student List',
        addStudent: 'Add Student',
        editStudent: 'Edit Student',
        deleteStudent: 'Delete Student',
        studentName: 'Student Name',
        className: 'Class',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        accessCode: 'Access Code',
        parentPhone: 'Parent Phone',
        noStudents: 'No students yet',
        searchPlaceholder: 'Search students...',
        confirmDelete: 'Are you sure you want to delete this student?',
    },

    // Attendance
    attendance: {
        title: 'Attendance',
        present: 'Present',
        absent: 'Absent',
        sick: 'Sick',
        permission: 'Permission',
        markAttendance: 'Mark Attendance',
        attendanceDate: 'Date',
        selectDate: 'Select Date',
        noAttendance: 'No attendance data',
        summary: 'Attendance Summary',
    },

    // Schedule
    schedule: {
        title: 'Class Schedule',
        addSchedule: 'Add Schedule',
        subject: 'Subject',
        day: 'Day',
        startTime: 'Start Time',
        endTime: 'End Time',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        noSchedule: 'No schedule',
    },

    // Tasks
    tasks: {
        title: 'Task List',
        addTask: 'Add Task',
        taskTitle: 'Task Title',
        description: 'Description',
        dueDate: 'Due Date',
        status: 'Status',
        todo: 'To Do',
        inProgress: 'In Progress',
        done: 'Done',
        noTasks: 'No tasks yet',
    },

    // Auth
    auth: {
        login: 'Login',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        rememberMe: 'Remember Me',
        loginFailed: 'Invalid email or password',
        sessionExpired: 'Your session has expired',
    },

    // Errors
    errors: {
        networkError: 'Connection lost',
        serverError: 'Server error occurred',
        notFound: 'Data not found',
        unauthorized: 'Access denied',
        validationError: 'Invalid data',
        tryAgain: 'Try Again',
    },

    // Offline
    offline: {
        banner: 'You are offline',
        pendingChanges: 'changes pending sync',
        syncNow: 'Sync Now',
        dataFromCache: 'Data from cache',
        lastUpdated: 'Last updated',
    },

    // Accessibility
    a11y: {
        skipToContent: 'Skip to main content',
        menu: 'Menu',
        closeMenu: 'Close menu',
        openMenu: 'Open menu',
        loading: 'Loading',
        expandSection: 'Expand section',
        collapseSection: 'Collapse section',
    },
};

// ============================================
// TRANSLATIONS MAP
// ============================================

const translations: Record<SupportedLanguage, TranslationKey> = {
    id: idTranslations,
    en: enTranslations,
};

// ============================================
// I18N CONTEXT
// ============================================

interface I18nContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    languages: { code: SupportedLanguage; name: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

// ============================================
// I18N PROVIDER
// ============================================

interface I18nProviderProps {
    children: ReactNode;
    defaultLanguage?: SupportedLanguage;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
    children,
    defaultLanguage = 'id',
}) => {
    const [language, setLanguageState] = useState<SupportedLanguage>(() => {
        // Try to get from localStorage
        const saved = localStorage.getItem('portal-guru-language');
        if (saved && (saved === 'id' || saved === 'en')) {
            return saved as SupportedLanguage;
        }
        return defaultLanguage;
    });

    // Save language preference
    useEffect(() => {
        localStorage.setItem('portal-guru-language', language);
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    const setLanguage = useCallback((lang: SupportedLanguage) => {
        setLanguageState(lang);
    }, []);

    // Translation function
    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: string | TranslationKey = translations[language];

        for (const k of keys) {
            if (typeof value === 'object' && value !== null && k in value) {
                value = value[k];
            } else {
                // Key not found, return the key itself
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation key is not a string: ${key}`);
            return key;
        }

        // Replace parameters
        if (params) {
            let result = value;
            for (const [param, val] of Object.entries(params)) {
                result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val));
            }
            return result;
        }

        return value;
    }, [language]);

    const languages = [
        { code: 'id' as SupportedLanguage, name: 'Bahasa Indonesia' },
        { code: 'en' as SupportedLanguage, name: 'English' },
    ];

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, languages }}>
            {children}
        </I18nContext.Provider>
    );
};

// ============================================
// HOOK
// ============================================

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
}

// ============================================
// LANGUAGE SELECTOR COMPONENT
// ============================================

interface LanguageSelectorProps {
    className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
    const { language, setLanguage, languages } = useTranslation();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className={`px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ${className}`}
            aria-label="Select language"
        >
            {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.name}
                </option>
            ))}
        </select>
    );
};

// ============================================
// TRANS COMPONENT (for JSX interpolation)
// ============================================

interface TransProps {
    i18nKey: string;
    components?: Record<string, React.ReactElement>;
    values?: Record<string, string | number>;
}

export const Trans: React.FC<TransProps> = ({ i18nKey, values }) => {
    const { t } = useTranslation();
    return <>{t(i18nKey, values)}</>;
};

export default {
    I18nProvider,
    useTranslation,
    LanguageSelector,
    Trans,
};
