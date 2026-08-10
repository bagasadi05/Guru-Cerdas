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
    lessonPlan: {
        title: string;
        subtitle: string;
        step1: string;
        step2: string;
        step3: string;
        step4: string;
        step5: string;
        documentType: string;
        documentTypeModulAjar: string;
        documentTypeRpp: string;
        curriculumApproach: string;
        curriculumMerdeka: string;
        kurikulumBerbasisCinta: string;
        kurikulumHybrid: string;
        satuanPendidikan: string;
        tahunAjaran: string;
        semester: string;
        ganjil: string;
        genap: string;
        jenjang: string;
        kelas: string;
        fase: string;
        mataPelajaran: string;
        topikMateri: string;
        topicSuggestions: string;
        placeholderMapel: string;
        placeholderTopik: string;
        targetPeserta: string;
        targetReguler: string;
        targetKesulitan: string;
        targetCibi: string;
        kompetensiAwal: string;
        placeholderKompetensi: string;
        saranaPrasarana: string;
        placeholderSarana: string;
        cp: string;
        cpLookup: string;
        cpSearching: string;
        cpFromDb: string;
        cpNotFound: string;
        placeholderCp: string;
        profilPancasila: string;
        tujuanPembelajaran: string;
        placeholderTujuan: string;
        pertanyaanPemantik: string;
        placeholderPemantik: string;
        lkpd: string;
        placeholderLkpd: string;
        soalEvaluasi: string;
        placeholderEvaluasi: string;
        alokasiWaktu: string;
        pertemuan: string;
        jpPerTemu: string;
        durasi: string;
        modelPembelajaran: string;
        metodePembelajaran: string;
        pendahuluan: string;
        kegiatanInti: string;
        penutup: string;
        visualAlokasi: string;
        balancingAktif: string;
        rubricAsesmen: string;
        rubricDiskusi: string;
        rubricPresentasi: string;
        rubricSikap: string;
        rubricEmpty: string;
        rubricAddCustom: string;
        rubricHapus: string;
        rubricKriteria: string;
        rubricSangatBaik: string;
        rubricBaik: string;
        rubricCukup: string;
        rubricPerluBimbingan: string;
        manualContentNote: string;
        manualEditNote: string;
        preview: string;
        history: string;
        historyEmpty: string;
        historyLoading: string;
        historyTopik: string;
        historyKelas: string;
        performaGuru: string;
        lembarSiswa: string;
        previewEmpty: string;
        previewEmptyDesc: string;
        copy: string;
        copySuccess: string;
        pdf: string;
        word: string;
        saveSuccess: string;
        saveFailed: string;
        validateSubject: string;
        validateTopic: string;
        validateMapel: string;
        deleteConfirm: string;
        restoreSuccess: string;
        previous: string;
        next: string;
        create: string;
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
    lessonPlan: {
        title: 'Penyusun Modul Ajar / RPP',
        subtitle: 'Langkah {step} dari 5: Lengkapi form untuk menyusun dokumen.',
        step1: '1. Jenis Dokumen & Kurikulum',
        step2: '2. Identitas Pelajaran',
        step3: '3. Informasi Umum & Sarana',
        step4: '4. Capaian & Profil Pancasila',
        step5: '5. Alokasi Waktu & Model',
        documentType: 'Jenis Dokumen',
        documentTypeModulAjar: 'Modul Ajar',
        documentTypeRpp: 'RPP',
        curriculumApproach: 'Pendekatan Kurikulum',
        curriculumMerdeka: 'Merdeka',
        kurikulumBerbasisCinta: 'Berbasis Cinta',
        kurikulumHybrid: 'Hybrid',
        satuanPendidikan: 'Satuan Pendidikan',
        tahunAjaran: 'Tahun Ajaran',
        semester: 'Semester',
        ganjil: 'Ganjil',
        genap: 'Genap',
        jenjang: 'Jenjang',
        kelas: 'Kelas',
        fase: 'Fase',
        mataPelajaran: 'Mata Pelajaran',
        topikMateri: 'Topik / Materi Pokok',
        topicSuggestions: 'Saran Topik',
        placeholderMapel: 'Contoh: Matematika',
        placeholderTopik: 'Contoh: Penjumlahan Bilangan Cacah',
        targetPeserta: 'Target Peserta Didik',
        targetReguler: 'Reguler/Tipikal',
        targetKesulitan: 'Peserta Didik dengan Kesulitan Belajar',
        targetCibi: 'Peserta Didik Cerdas Istimewa/Bakat Istimewa (CIBI)',
        kompetensiAwal: 'Kompetensi Awal (Prasyarat)',
        placeholderKompetensi: 'Pengetahuan/keterampilan yang wajib dimiliki siswa sebelum mempelajari materi ini.',
        saranaPrasarana: 'Sarana, Prasarana & Media',
        placeholderSarana: 'Alat, bahan, media pembelajaran (Proyektor, LKPD, alat peraga, dll).',
        cp: 'Capaian Pembelajaran (CP)',
        cpLookup: 'Ambil CP dari Referensi',
        cpSearching: 'Mencari...',
        cpFromDb: 'Ambil CP dari Database',
        cpNotFound: 'Capaian Pembelajaran (CP) untuk mata pelajaran dan fase ini belum tersedia di database — silakan isi manual atau minta admin menambahkan.',
        placeholderCp: 'Capaian Pembelajaran dari Kurikulum.',
        profilPancasila: 'Profil Pelajar Pancasila',
        tujuanPembelajaran: 'Tujuan Pembelajaran (Satu per baris)',
        placeholderTujuan: 'Contoh:\n1. Siswa dapat memahami perkalian dasar.\n2. Siswa dapat menjawab soal cerita perkalian.',
        pertanyaanPemantik: 'Pertanyaan Pemantik (Satu per baris)',
        placeholderPemantik: 'Contoh:\nMengapa kita perlu mempelajari perkalian?\nBagaimana perkalian mempermudah hitungan kita?',
        lkpd: 'Tugas LKPD (Lembar Kerja Peserta Didik)',
        placeholderLkpd: 'Masukkan tugas/kegiatan kelompok atau mandiri...',
        soalEvaluasi: 'Soal Evaluasi Pengetahuan',
        placeholderEvaluasi: 'Masukkan butir-butir pertanyaan evaluasi...',
        alokasiWaktu: 'Alokasi Waktu',
        pertemuan: 'Pertemuan',
        jpPerTemu: 'JP / Pertemuan',
        durasi: 'Durasi (Menit)',
        modelPembelajaran: 'Model Pembelajaran',
        metodePembelajaran: 'Metode Pembelajaran',
        pendahuluan: '1. Pendahuluan',
        kegiatanInti: '2. Kegiatan Inti',
        penutup: '3. Penutup',
        visualAlokasi: 'Visual Alokasi Waktu',
        balancingAktif: 'Balancing Aktif',
        rubricAsesmen: 'Rubrik Asesmen Interaktif',
        rubricDiskusi: '+ Diskusi',
        rubricPresentasi: '+ Presentasi',
        rubricSikap: '+ Sikap',
        rubricEmpty: 'Belum ada rubrik penilaian. Klik salah satu templat di atas untuk menambahkan.',
        rubricAddCustom: '+ Tambah Kriteria Kustom',
        rubricHapus: 'Hapus',
        rubricKriteria: 'Kriteria Penilaian',
        rubricSangatBaik: 'Sangat Baik (4)',
        rubricBaik: 'Baik (3)',
        rubricCukup: 'Cukup (2)',
        rubricPerluBimbingan: 'Perlu Bimbingan (1)',
        manualContentNote: 'Semua konten disusun manual berdasarkan isian Anda.',
        manualEditNote: 'Dokumen dapat diedit kembali di panel pratinjau sebelum diekspor.',
        preview: 'Pratinjau',
        history: 'Riwayat Saya',
        historyEmpty: 'Anda belum memiliki riwayat pembuatan modul ajar.',
        historyLoading: 'Memuat riwayat pembuatan...',
        historyTopik: 'Topik:',
        historyKelas: 'Kelas',
        performaGuru: 'Perangkat Guru',
        lembarSiswa: 'Lembar Siswa Saja',
        previewEmpty: 'Siap Membuat Dokumen',
        previewEmptyDesc: 'Isi parameter lalu klik tombol {action} pada langkah ke-5.',
        copy: 'Salin Teks',
        copySuccess: 'Teks berhasil disalin!',
        pdf: 'PDF',
        word: 'Word',
        saveSuccess: 'Draf Modul Ajar berhasil disusun! Anda dapat mengedit isinya secara bebas pada panel pratinjau.',
        saveFailed: 'Gagal menyusun modul ajar: {message}',
        validateSubject: 'Mata Pelajaran dan Topik/Materi wajib diisi.',
        validateTopic: 'Isi Mata Pelajaran dan Topik dulu sebelum menggunakan AI.',
        validateMapel: 'Mohon isi Mata Pelajaran terlebih dahulu.',
        deleteConfirm: 'Apakah Anda yakin ingin menghapus dokumen ini dari riwayat?',
        restoreSuccess: 'Parameter modul ajar berhasil dipulihkan ke formulir!',
        previous: 'Sebelumnya',
        next: 'Selanjutnya',
        create: 'Buat {type}',
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
    lessonPlan: {
        title: 'Lesson Plan / RPP Creator',
        subtitle: 'Step {step} of 5: Fill in the form to create the document.',
        step1: '1. Document Type & Curriculum',
        step2: '2. Lesson Identity',
        step3: '3. General Info & Facilities',
        step4: '4. Learning Outcomes & Profile',
        step5: '5. Time Allocation & Model',
        documentType: 'Document Type',
        documentTypeModulAjar: 'Lesson Plan',
        documentTypeRpp: 'RPP',
        curriculumApproach: 'Curriculum Approach',
        curriculumMerdeka: 'Merdeka',
        kurikulumBerbasisCinta: 'Love-Based',
        kurikulumHybrid: 'Hybrid',
        satuanPendidikan: 'Education Unit',
        tahunAjaran: 'Academic Year',
        semester: 'Semester',
        ganjil: 'Odd',
        genap: 'Even',
        jenjang: 'Level',
        kelas: 'Grade',
        fase: 'Phase',
        mataPelajaran: 'Subject',
        topikMateri: 'Topic / Subject Matter',
        topicSuggestions: 'Topic Suggestions',
        placeholderMapel: 'Example: Mathematics',
        placeholderTopik: 'Example: Addition of Whole Numbers',
        targetPeserta: 'Student Target',
        targetReguler: 'Regular/Typical',
        targetKesulitan: 'Students with Learning Difficulties',
        targetCibi: 'Gifted/Talented Students (CIBI)',
        kompetensiAwal: 'Prior Knowledge (Prerequisite)',
        placeholderKompetensi: 'Required knowledge/skills students must have before learning this material.',
        saranaPrasarana: 'Facilities, Infrastructure & Media',
        placeholderSarana: 'Tools, materials, learning media (Projector, worksheets, teaching aids, etc.).',
        cp: 'Learning Outcomes (CP)',
        cpLookup: 'Get CP from Reference',
        cpSearching: 'Searching...',
        cpFromDb: 'Get CP from Database',
        cpNotFound: 'Learning Outcomes (CP) for this subject and phase are not yet available in the database — please fill manually or ask the admin to add them.',
        placeholderCp: 'Learning outcomes from the curriculum.',
        profilPancasila: 'Pancasila Student Profile',
        tujuanPembelajaran: 'Learning Objectives (One per line)',
        placeholderTujuan: 'Example:\n1. Students can understand basic multiplication.\n2. Students can solve multiplication word problems.',
        pertanyaanPemantik: 'Trigger Questions (One per line)',
        placeholderPemantik: 'Example:\nWhy do we need to learn multiplication?\nHow does multiplication make calculations easier?',
        lkpd: 'Student Worksheet (LKPD)',
        placeholderLkpd: 'Enter group or independent tasks/activities...',
        soalEvaluasi: 'Knowledge Evaluation Questions',
        placeholderEvaluasi: 'Enter evaluation question items...',
        alokasiWaktu: 'Time Allocation',
        pertemuan: 'Meetings',
        jpPerTemu: 'LH / Meeting',
        durasi: 'Duration (Minutes)',
        modelPembelajaran: 'Learning Model',
        metodePembelajaran: 'Teaching Methods',
        pendahuluan: '1. Introduction',
        kegiatanInti: '2. Core Activity',
        penutup: '3. Closing',
        visualAlokasi: 'Time Allocation Visual',
        balancingAktif: 'Active Balancing',
        rubricAsesmen: 'Interactive Assessment Rubric',
        rubricDiskusi: '+ Discussion',
        rubricPresentasi: '+ Presentation',
        rubricSikap: '+ Attitude',
        rubricEmpty: 'No rubric yet. Click one of the templates above to add.',
        rubricAddCustom: '+ Add Custom Criteria',
        rubricHapus: 'Delete',
        rubricKriteria: 'Assessment Criteria',
        rubricSangatBaik: 'Excellent (4)',
        rubricBaik: 'Good (3)',
        rubricCukup: 'Fair (2)',
        rubricPerluBimbingan: 'Needs Guidance (1)',
        manualContentNote: 'All content is manually compiled based on your input.',
        manualEditNote: 'Documents can be edited again in the preview panel before exporting.',
        preview: 'Preview',
        history: 'My History',
        historyEmpty: 'You have no lesson plan creation history yet.',
        historyLoading: 'Loading history...',
        historyTopik: 'Topic:',
        historyKelas: 'Grade',
        performaGuru: 'Teacher View',
        lembarSiswa: 'Student Sheet Only',
        previewEmpty: 'Ready to Create Document',
        previewEmptyDesc: 'Fill in the parameters then click the {action} button in step 5.',
        copy: 'Copy Text',
        copySuccess: 'Text copied!',
        pdf: 'PDF',
        word: 'Word',
        saveSuccess: 'Lesson plan draft created successfully! You can freely edit the content in the preview panel.',
        saveFailed: 'Failed to create lesson plan: {message}',
        validateSubject: 'Subject and Topic/Material must be filled in.',
        validateTopic: 'Fill in the Subject and Topic first before using AI.',
        validateMapel: 'Please fill in the Subject first.',
        deleteConfirm: 'Are you sure you want to delete this document from history?',
        restoreSuccess: 'Lesson plan parameters successfully restored to the form!',
        previous: 'Previous',
        next: 'Next',
        create: 'Create {type}',
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
