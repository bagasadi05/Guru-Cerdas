import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Available languages
export type Language = 'id' | 'en';
export type SupportedLanguage = Language;

// Translation value type - either a string or a nested object of translations
export type TranslationValue = string | { [key: string]: TranslationValue };
// Simplified translation key type
export type TranslationKey = TranslationValue;

// Translation structure - comprehensive
export interface Translations {
    common: {
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        add: string;
        search: string;
        loading: string;
        error: string;
        success: string;
        confirm: string;
        close: string;
        back: string;
        next: string;
        all: string;
        none: string;
        yes: string;
        no: string;
        submit: string;
        reset: string;
        filter: string;
        sort: string;
        export: string;
        import: string;
        download: string;
        upload: string;
        refresh: string;
        view: string;
        more: string;
        less: string;
        details: string;
        required: string;
        optional: string;
        actions: string;
        status: string;
        date: string;
        time: string;
        name: string;
        description: string;
        notes: string;
        total: string;
        empty: string;
        notFound: string;
    };
    nav: {
        dashboard: string;
        attendance: string;
        students: string;
        schedule: string;
        tasks: string;
        massInput: string;
        settings: string;
        logout: string;
        profile: string;
        help: string;
    };
    auth: {
        login: string;
        logout: string;
        signup: string;
        email: string;
        password: string;
        confirmPassword: string;
        forgotPassword: string;
        resetPassword: string;
        rememberMe: string;
        welcomeBack: string;
        createAccount: string;
        noAccount: string;
        hasAccount: string;
        invalidCredentials: string;
        sessionExpired: string;
        accessCode: string;
        enterAccessCode: string;
    };
    attendance: {
        title: string;
        subtitle: string;
        present: string;
        sick: string;
        permission: string;
        absent: string;
        saveChanges: string;
        exportPdf: string;
        exportExcel: string;
        noStudents: string;
        markAllPresent: string;
        markAllAbsent: string;
        aiAnalysis: string;
        qrCode: string;
        selectClass: string;
        selectDate: string;
        todayAttendance: string;
        weeklyReport: string;
        monthlyReport: string;
        attendanceRate: string;
        lastUpdated: string;
        savedSuccess: string;
        noChanges: string;
    };
    students: {
        title: string;
        subtitle: string;
        addStudent: string;
        editStudent: string;
        deleteStudent: string;
        studentName: string;
        className: string;
        gender: string;
        male: string;
        female: string;
        manageClasses: string;
        exportExcel: string;
        noStudents: string;
        accessCode: string;
        generateCode: string;
        copyCode: string;
        codeCopied: string;
        parentPhone: string;
        avatar: string;
        totalStudents: string;
        searchPlaceholder: string;
        confirmDelete: string;
        addedSuccess: string;
        updatedSuccess: string;
        deletedSuccess: string;
    };
    classes: {
        title: string;
        addClass: string;
        editClass: string;
        deleteClass: string;
        className: string;
        noClasses: string;
        totalClasses: string;
        studentsCount: string;
        confirmDelete: string;
        addedSuccess: string;
        updatedSuccess: string;
        deletedSuccess: string;
    };
    tasks: {
        title: string;
        subtitle: string;
        addTask: string;
        editTask: string;
        deleteTask: string;
        taskTitle: string;
        taskDescription: string;
        pending: string;
        inProgress: string;
        completed: string;
        dueDate: string;
        noDeadline: string;
        noTasks: string;
        overdue: string;
        dueToday: string;
        dueTomorrow: string;
        priority: string;
        low: string;
        medium: string;
        high: string;
        markComplete: string;
        markIncomplete: string;
        addedSuccess: string;
        updatedSuccess: string;
        deletedSuccess: string;
    };
    schedule: {
        title: string;
        subtitle: string;
        addSchedule: string;
        editSchedule: string;
        deleteSchedule: string;
        subject: string;
        day: string;
        startTime: string;
        endTime: string;
        noSchedule: string;
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
        addedSuccess: string;
        updatedSuccess: string;
        deletedSuccess: string;
    };
    settings: {
        title: string;
        profile: string;
        appearance: string;
        notifications: string;
        integrations: string;
        account: string;
        language: string;
        theme: string;
        darkMode: string;
        lightMode: string;
        systemTheme: string;
        privacy: string;
        security: string;
        changePassword: string;
        deleteAccount: string;
        exportData: string;
        savedSuccess: string;
    };
    notifications: {
        title: string;
        noNotifications: string;
        markAllRead: string;
        clearAll: string;
        newMessage: string;
        newStudent: string;
        newTask: string;
        reminder: string;
        warning: string;
        info: string;
    };
    validation: {
        required: string;
        email: string;
        minLength: string;
        maxLength: string;
        passwordMatch: string;
        invalidFormat: string;
        invalidDate: string;
        invalidTime: string;
        mustBeNumber: string;
        mustBePositive: string;
    };
    errors: {
        general: string;
        network: string;
        notFound: string;
        unauthorized: string;
        forbidden: string;
        serverError: string;
        timeout: string;
        offline: string;
        tryAgain: string;
        contactSupport: string;
    };
    time: {
        justNow: string;
        minutesAgo: string;
        hoursAgo: string;
        daysAgo: string;
        weeksAgo: string;
        monthsAgo: string;
        yearsAgo: string;
        today: string;
        yesterday: string;
        tomorrow: string;
        thisWeek: string;
        lastWeek: string;
        thisMonth: string;
        lastMonth: string;
    };
    parentPortal: {
        title: string;
        welcome: string;
        childInfo: string;
        attendanceHistory: string;
        grades: string;
        reports: string;
        messages: string;
        sendMessage: string;
        noMessages: string;
        contactTeacher: string;
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

// Indonesian translations (default) - complete
export const idTranslations: Translations = {
    common: {
        save: 'Simpan',
        cancel: 'Batal',
        delete: 'Hapus',
        edit: 'Edit',
        add: 'Tambah',
        search: 'Cari',
        loading: 'Memuat...',
        error: 'Terjadi kesalahan',
        success: 'Berhasil',
        confirm: 'Konfirmasi',
        close: 'Tutup',
        back: 'Kembali',
        next: 'Selanjutnya',
        all: 'Semua',
        none: 'Tidak ada',
        yes: 'Ya',
        no: 'Tidak',
        submit: 'Kirim',
        reset: 'Reset',
        filter: 'Filter',
        sort: 'Urutkan',
        export: 'Ekspor',
        import: 'Impor',
        download: 'Unduh',
        upload: 'Unggah',
        refresh: 'Segarkan',
        view: 'Lihat',
        more: 'Lebih banyak',
        less: 'Lebih sedikit',
        details: 'Detail',
        required: 'Wajib',
        optional: 'Opsional',
        actions: 'Aksi',
        status: 'Status',
        date: 'Tanggal',
        time: 'Waktu',
        name: 'Nama',
        description: 'Deskripsi',
        notes: 'Catatan',
        total: 'Total',
        empty: 'Kosong',
        notFound: 'Tidak ditemukan',
    },
    nav: {
        dashboard: 'Beranda',
        attendance: 'Rekap Absensi',
        students: 'Data Siswa',
        schedule: 'Jadwal Pelajaran',
        tasks: 'Manajemen Tugas',
        massInput: 'Input Nilai Cepat',
        settings: 'Pengaturan Sistem',
        logout: 'Keluar',
        profile: 'Profil',
        help: 'Bantuan',
    },
    auth: {
        login: 'Masuk',
        logout: 'Keluar',
        signup: 'Daftar',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Konfirmasi Password',
        forgotPassword: 'Lupa Password?',
        resetPassword: 'Reset Password',
        rememberMe: 'Ingat Saya',
        welcomeBack: 'Selamat Datang Kembali',
        createAccount: 'Buat Akun Baru',
        noAccount: 'Belum punya akun?',
        hasAccount: 'Sudah punya akun?',
        invalidCredentials: 'Email atau password salah',
        sessionExpired: 'Sesi telah berakhir, silakan login kembali',
        accessCode: 'Kode Akses',
        enterAccessCode: 'Masukkan kode akses 6 digit',
    },
    attendance: {
        title: 'Rekap Absensi',
        subtitle: 'Kelola kehadiran siswa',
        present: 'Hadir',
        sick: 'Sakit',
        permission: 'Izin',
        absent: 'Alpha',
        saveChanges: 'Simpan Perubahan',
        exportPdf: 'Ekspor PDF',
        exportExcel: 'Ekspor Excel',
        noStudents: 'Pilih kelas untuk memulai absensi',
        markAllPresent: 'Semua Hadir',
        markAllAbsent: 'Semua Alpha',
        aiAnalysis: 'Analisis AI',
        qrCode: 'QR Code',
        selectClass: 'Pilih Kelas',
        selectDate: 'Pilih Tanggal',
        todayAttendance: 'Absensi Hari Ini',
        weeklyReport: 'Laporan Mingguan',
        monthlyReport: 'Laporan Bulanan',
        attendanceRate: 'Tingkat Kehadiran',
        lastUpdated: 'Terakhir diperbarui',
        savedSuccess: 'Absensi berhasil disimpan',
        noChanges: 'Tidak ada perubahan',
    },
    students: {
        title: 'Data Siswa',
        subtitle: 'Kelola data siswa, kelas, dan kode akses',
        addStudent: 'Tambah Siswa',
        editStudent: 'Edit Siswa',
        deleteStudent: 'Hapus Siswa',
        studentName: 'Nama Siswa',
        className: 'Kelas',
        gender: 'Jenis Kelamin',
        male: 'Laki-laki',
        female: 'Perempuan',
        manageClasses: 'Kelola Kelas',
        exportExcel: 'Ekspor Excel',
        noStudents: 'Belum ada siswa',
        accessCode: 'Kode Akses',
        generateCode: 'Generate Kode',
        copyCode: 'Salin Kode',
        codeCopied: 'Kode berhasil disalin',
        parentPhone: 'No. HP Orang Tua',
        avatar: 'Foto',
        totalStudents: 'Total Siswa',
        searchPlaceholder: 'Cari nama siswa...',
        confirmDelete: 'Yakin ingin menghapus siswa ini?',
        addedSuccess: 'Siswa berhasil ditambahkan',
        updatedSuccess: 'Data siswa berhasil diperbarui',
        deletedSuccess: 'Siswa berhasil dihapus',
    },
    classes: {
        title: 'Kelola Kelas',
        addClass: 'Tambah Kelas',
        editClass: 'Edit Kelas',
        deleteClass: 'Hapus Kelas',
        className: 'Nama Kelas',
        noClasses: 'Belum ada kelas',
        totalClasses: 'Total Kelas',
        studentsCount: 'Jumlah Siswa',
        confirmDelete: 'Yakin ingin menghapus kelas ini?',
        addedSuccess: 'Kelas berhasil ditambahkan',
        updatedSuccess: 'Kelas berhasil diperbarui',
        deletedSuccess: 'Kelas berhasil dihapus',
    },
    tasks: {
        title: 'Manajemen Tugas',
        subtitle: 'Kelola prioritas dan tenggat waktu',
        addTask: 'Tambah Tugas',
        editTask: 'Edit Tugas',
        deleteTask: 'Hapus Tugas',
        taskTitle: 'Judul Tugas',
        taskDescription: 'Deskripsi',
        pending: 'Pending',
        inProgress: 'Dalam Proses',
        completed: 'Selesai',
        dueDate: 'Tenggat',
        noDeadline: 'Tanpa Tenggat',
        noTasks: 'Tidak ada tugas',
        overdue: 'Terlambat',
        dueToday: 'Hari Ini',
        dueTomorrow: 'Besok',
        priority: 'Prioritas',
        low: 'Rendah',
        medium: 'Sedang',
        high: 'Tinggi',
        markComplete: 'Tandai Selesai',
        markIncomplete: 'Tandai Belum Selesai',
        addedSuccess: 'Tugas berhasil ditambahkan',
        updatedSuccess: 'Tugas berhasil diperbarui',
        deletedSuccess: 'Tugas berhasil dihapus',
    },
    schedule: {
        title: 'Jadwal Pelajaran',
        subtitle: 'Kelola jadwal mata pelajaran',
        addSchedule: 'Tambah Jadwal',
        editSchedule: 'Edit Jadwal',
        deleteSchedule: 'Hapus Jadwal',
        subject: 'Mata Pelajaran',
        day: 'Hari',
        startTime: 'Jam Mulai',
        endTime: 'Jam Selesai',
        noSchedule: 'Belum ada jadwal',
        monday: 'Senin',
        tuesday: 'Selasa',
        wednesday: 'Rabu',
        thursday: 'Kamis',
        friday: 'Jumat',
        saturday: 'Sabtu',
        sunday: 'Minggu',
        addedSuccess: 'Jadwal berhasil ditambahkan',
        updatedSuccess: 'Jadwal berhasil diperbarui',
        deletedSuccess: 'Jadwal berhasil dihapus',
    },
    settings: {
        title: 'Pengaturan',
        profile: 'Profil',
        appearance: 'Tampilan',
        notifications: 'Notifikasi',
        integrations: 'Integrasi',
        account: 'Akun & Keamanan',
        language: 'Bahasa',
        theme: 'Tema',
        darkMode: 'Mode Gelap',
        lightMode: 'Mode Terang',
        systemTheme: 'Ikuti Sistem',
        privacy: 'Privasi',
        security: 'Keamanan',
        changePassword: 'Ganti Password',
        deleteAccount: 'Hapus Akun',
        exportData: 'Ekspor Data',
        savedSuccess: 'Pengaturan berhasil disimpan',
    },
    notifications: {
        title: 'Notifikasi',
        noNotifications: 'Tidak ada notifikasi',
        markAllRead: 'Tandai Semua Dibaca',
        clearAll: 'Hapus Semua',
        newMessage: 'Pesan baru',
        newStudent: 'Siswa baru ditambahkan',
        newTask: 'Tugas baru',
        reminder: 'Pengingat',
        warning: 'Peringatan',
        info: 'Informasi',
    },
    validation: {
        required: 'Field ini wajib diisi',
        email: 'Format email tidak valid',
        minLength: 'Minimal {min} karakter',
        maxLength: 'Maksimal {max} karakter',
        passwordMatch: 'Password tidak cocok',
        invalidFormat: 'Format tidak valid',
        invalidDate: 'Tanggal tidak valid',
        invalidTime: 'Waktu tidak valid',
        mustBeNumber: 'Harus berupa angka',
        mustBePositive: 'Harus berupa angka positif',
    },
    errors: {
        general: 'Terjadi kesalahan, silakan coba lagi',
        network: 'Kesalahan jaringan, periksa koneksi internet',
        notFound: 'Data tidak ditemukan',
        unauthorized: 'Anda tidak memiliki akses',
        forbidden: 'Akses ditolak',
        serverError: 'Terjadi kesalahan pada server',
        timeout: 'Permintaan timeout, silakan coba lagi',
        offline: 'Anda sedang offline',
        tryAgain: 'Coba Lagi',
        contactSupport: 'Hubungi dukungan jika masalah berlanjut',
    },
    time: {
        justNow: 'Baru saja',
        minutesAgo: '{n} menit yang lalu',
        hoursAgo: '{n} jam yang lalu',
        daysAgo: '{n} hari yang lalu',
        weeksAgo: '{n} minggu yang lalu',
        monthsAgo: '{n} bulan yang lalu',
        yearsAgo: '{n} tahun yang lalu',
        today: 'Hari Ini',
        yesterday: 'Kemarin',
        tomorrow: 'Besok',
        thisWeek: 'Minggu Ini',
        lastWeek: 'Minggu Lalu',
        thisMonth: 'Bulan Ini',
        lastMonth: 'Bulan Lalu',
    },
    parentPortal: {
        title: 'Portal Orang Tua',
        welcome: 'Selamat Datang di Portal Orang Tua',
        childInfo: 'Informasi Anak',
        attendanceHistory: 'Riwayat Kehadiran',
        grades: 'Nilai',
        reports: 'Laporan',
        messages: 'Pesan',
        sendMessage: 'Kirim Pesan',
        noMessages: 'Belum ada pesan',
        contactTeacher: 'Hubungi Guru',
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

// English translations - complete
export const enTranslations: Translations = {
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        loading: 'Loading...',
        error: 'An error occurred',
        success: 'Success',
        confirm: 'Confirm',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        all: 'All',
        none: 'None',
        yes: 'Yes',
        no: 'No',
        submit: 'Submit',
        reset: 'Reset',
        filter: 'Filter',
        sort: 'Sort',
        export: 'Export',
        import: 'Import',
        download: 'Download',
        upload: 'Upload',
        refresh: 'Refresh',
        view: 'View',
        more: 'More',
        less: 'Less',
        details: 'Details',
        required: 'Required',
        optional: 'Optional',
        actions: 'Actions',
        status: 'Status',
        date: 'Date',
        time: 'Time',
        name: 'Name',
        description: 'Description',
        notes: 'Notes',
        total: 'Total',
        empty: 'Empty',
        notFound: 'Not found',
    },
    nav: {
        dashboard: 'Dashboard',
        attendance: 'Attendance',
        students: 'Students',
        schedule: 'Schedule',
        tasks: 'Tasks',
        massInput: 'Quick Grade Input',
        settings: 'Settings',
        logout: 'Logout',
        profile: 'Profile',
        help: 'Help',
    },
    auth: {
        login: 'Login',
        logout: 'Logout',
        signup: 'Sign Up',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        rememberMe: 'Remember Me',
        welcomeBack: 'Welcome Back',
        createAccount: 'Create New Account',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        invalidCredentials: 'Invalid email or password',
        sessionExpired: 'Session expired, please login again',
        accessCode: 'Access Code',
        enterAccessCode: 'Enter 6-digit access code',
    },
    attendance: {
        title: 'Attendance',
        subtitle: 'Manage student attendance',
        present: 'Present',
        sick: 'Sick',
        permission: 'Permission',
        absent: 'Absent',
        saveChanges: 'Save Changes',
        exportPdf: 'Export PDF',
        exportExcel: 'Export Excel',
        noStudents: 'Select a class to start',
        markAllPresent: 'Mark All Present',
        markAllAbsent: 'Mark All Absent',
        aiAnalysis: 'AI Analysis',
        qrCode: 'QR Code',
        selectClass: 'Select Class',
        selectDate: 'Select Date',
        todayAttendance: "Today's Attendance",
        weeklyReport: 'Weekly Report',
        monthlyReport: 'Monthly Report',
        attendanceRate: 'Attendance Rate',
        lastUpdated: 'Last updated',
        savedSuccess: 'Attendance saved successfully',
        noChanges: 'No changes',
    },
    students: {
        title: 'Students',
        subtitle: 'Manage students, classes, and access codes',
        addStudent: 'Add Student',
        editStudent: 'Edit Student',
        deleteStudent: 'Delete Student',
        studentName: 'Student Name',
        className: 'Class',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        manageClasses: 'Manage Classes',
        exportExcel: 'Export Excel',
        noStudents: 'No students yet',
        accessCode: 'Access Code',
        generateCode: 'Generate Code',
        copyCode: 'Copy Code',
        codeCopied: 'Code copied successfully',
        parentPhone: 'Parent Phone',
        avatar: 'Photo',
        totalStudents: 'Total Students',
        searchPlaceholder: 'Search student name...',
        confirmDelete: 'Are you sure you want to delete this student?',
        addedSuccess: 'Student added successfully',
        updatedSuccess: 'Student updated successfully',
        deletedSuccess: 'Student deleted successfully',
    },
    classes: {
        title: 'Manage Classes',
        addClass: 'Add Class',
        editClass: 'Edit Class',
        deleteClass: 'Delete Class',
        className: 'Class Name',
        noClasses: 'No classes yet',
        totalClasses: 'Total Classes',
        studentsCount: 'Students Count',
        confirmDelete: 'Are you sure you want to delete this class?',
        addedSuccess: 'Class added successfully',
        updatedSuccess: 'Class updated successfully',
        deletedSuccess: 'Class deleted successfully',
    },
    tasks: {
        title: 'Task Management',
        subtitle: 'Manage priorities and deadlines',
        addTask: 'Add Task',
        editTask: 'Edit Task',
        deleteTask: 'Delete Task',
        taskTitle: 'Task Title',
        taskDescription: 'Description',
        pending: 'Pending',
        inProgress: 'In Progress',
        completed: 'Completed',
        dueDate: 'Due Date',
        noDeadline: 'No Deadline',
        noTasks: 'No tasks',
        overdue: 'Overdue',
        dueToday: 'Due Today',
        dueTomorrow: 'Due Tomorrow',
        priority: 'Priority',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        markComplete: 'Mark Complete',
        markIncomplete: 'Mark Incomplete',
        addedSuccess: 'Task added successfully',
        updatedSuccess: 'Task updated successfully',
        deletedSuccess: 'Task deleted successfully',
    },
    schedule: {
        title: 'Schedule',
        subtitle: 'Manage class schedule',
        addSchedule: 'Add Schedule',
        editSchedule: 'Edit Schedule',
        deleteSchedule: 'Delete Schedule',
        subject: 'Subject',
        day: 'Day',
        startTime: 'Start Time',
        endTime: 'End Time',
        noSchedule: 'No schedule yet',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
        addedSuccess: 'Schedule added successfully',
        updatedSuccess: 'Schedule updated successfully',
        deletedSuccess: 'Schedule deleted successfully',
    },
    settings: {
        title: 'Settings',
        profile: 'Profile',
        appearance: 'Appearance',
        notifications: 'Notifications',
        integrations: 'Integrations',
        account: 'Account & Security',
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        systemTheme: 'System',
        privacy: 'Privacy',
        security: 'Security',
        changePassword: 'Change Password',
        deleteAccount: 'Delete Account',
        exportData: 'Export Data',
        savedSuccess: 'Settings saved successfully',
    },
    notifications: {
        title: 'Notifications',
        noNotifications: 'No notifications',
        markAllRead: 'Mark All Read',
        clearAll: 'Clear All',
        newMessage: 'New message',
        newStudent: 'New student added',
        newTask: 'New task',
        reminder: 'Reminder',
        warning: 'Warning',
        info: 'Info',
    },
    validation: {
        required: 'This field is required',
        email: 'Invalid email format',
        minLength: 'Minimum {min} characters',
        maxLength: 'Maximum {max} characters',
        passwordMatch: 'Passwords do not match',
        invalidFormat: 'Invalid format',
        invalidDate: 'Invalid date',
        invalidTime: 'Invalid time',
        mustBeNumber: 'Must be a number',
        mustBePositive: 'Must be a positive number',
    },
    errors: {
        general: 'An error occurred, please try again',
        network: 'Network error, check your internet connection',
        notFound: 'Not found',
        unauthorized: 'You are not authorized',
        forbidden: 'Access denied',
        serverError: 'Server error occurred',
        timeout: 'Request timeout, please try again',
        offline: 'You are offline',
        tryAgain: 'Try Again',
        contactSupport: 'Contact support if the problem persists',
    },
    time: {
        justNow: 'Just now',
        minutesAgo: '{n} minutes ago',
        hoursAgo: '{n} hours ago',
        daysAgo: '{n} days ago',
        weeksAgo: '{n} weeks ago',
        monthsAgo: '{n} months ago',
        yearsAgo: '{n} years ago',
        today: 'Today',
        yesterday: 'Yesterday',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
    },
    parentPortal: {
        title: 'Parent Portal',
        welcome: 'Welcome to Parent Portal',
        childInfo: 'Child Information',
        attendanceHistory: 'Attendance History',
        grades: 'Grades',
        reports: 'Reports',
        messages: 'Messages',
        sendMessage: 'Send Message',
        noMessages: 'No messages yet',
        contactTeacher: 'Contact Teacher',
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
    formatRelativeTime: (date: Date) => string;
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

    const formatRelativeTime = useCallback((date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        const t = translations[language].time;

        if (diffMins < 1) return t.justNow;
        if (diffMins < 60) return t.minutesAgo.replace('{n}', String(diffMins));
        if (diffHours < 24) return t.hoursAgo.replace('{n}', String(diffHours));
        if (diffDays < 7) return t.daysAgo.replace('{n}', String(diffDays));
        if (diffWeeks < 4) return t.weeksAgo.replace('{n}', String(diffWeeks));
        if (diffMonths < 12) return t.monthsAgo.replace('{n}', String(diffMonths));
        return t.yearsAgo.replace('{n}', String(diffYears));
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
        formatRelativeTime,
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
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${language === lang.code
                                ? 'bg-indigo-600 text-white'
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
                focus:outline-none focus:ring-2 focus:ring-indigo-500
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
