import React, { useState } from 'react';
import {
    Users,
    Calendar,
    FileText,
    Clock,
    Search,
    Plus,
    Upload,
    RefreshCw,
    AlertCircle,
    Wifi,
    WifiOff,
    BookOpen,
    GraduationCap,
    ClipboardList,
    Sparkles,
    ArrowRight,
    HelpCircle
} from 'lucide-react';

/**
 * Empty States Components
 * Beautiful, engaging empty states with illustrations and clear CTAs
 */

// ============================================
// ANIMATED ILLUSTRATIONS
// ============================================

// Floating animation wrapper
const FloatingWrapper: React.FC<{ children: React.ReactNode; delay?: number }> = ({
    children,
    delay = 0
}) => (
    <div
        className="animate-float"
        style={{ animationDelay: `${delay}ms` }}
    >
        {children}
    </div>
);

// Empty students illustration
const StudentsIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        {/* Main circle background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 animate-pulse" />

        {/* Floating elements */}
        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper delay={0}>
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
            </FloatingWrapper>
            <FloatingWrapper delay={200}>
                <div className="absolute -top-1 right-2 w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                    <GraduationCap className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                </div>
            </FloatingWrapper>
            <FloatingWrapper delay={400}>
                <div className="absolute bottom-0 -left-1 w-7 h-7 rounded-full bg-pink-200 dark:bg-pink-800 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                </div>
            </FloatingWrapper>

            {/* Main icon */}
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-indigo-500" />
            </div>
        </div>
    </div>
);

// Empty calendar/attendance illustration
const CalendarIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper delay={100}>
                <div className="absolute -top-1 left-0 w-6 h-6 rounded-lg bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">H</span>
                </div>
            </FloatingWrapper>
            <FloatingWrapper delay={300}>
                <div className="absolute top-2 -right-2 w-6 h-6 rounded-lg bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">I</span>
                </div>
            </FloatingWrapper>
            <FloatingWrapper delay={500}>
                <div className="absolute -bottom-1 left-2 w-6 h-6 rounded-lg bg-sky-200 dark:bg-sky-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">S</span>
                </div>
            </FloatingWrapper>

            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <Calendar className="w-10 h-10 text-emerald-500" />
            </div>
        </div>
    </div>
);

// Empty tasks illustration
const TasksIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper delay={150}>
                <div className="absolute -top-2 left-4 w-5 h-5 rounded bg-amber-200 dark:bg-amber-800" />
            </FloatingWrapper>
            <FloatingWrapper delay={350}>
                <div className="absolute top-4 -right-1 w-4 h-4 rounded bg-orange-200 dark:bg-orange-800" />
            </FloatingWrapper>
            <FloatingWrapper delay={550}>
                <div className="absolute bottom-2 -left-2 w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800" />
            </FloatingWrapper>

            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <ClipboardList className="w-10 h-10 text-amber-500" />
            </div>
        </div>
    </div>
);

// Empty schedule illustration
const ScheduleIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper delay={0}>
                <div className="absolute -top-1 -left-1 w-7 h-7 rounded-lg bg-sky-200 dark:bg-sky-800 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
            </FloatingWrapper>
            <FloatingWrapper delay={250}>
                <div className="absolute top-0 right-0 w-6 h-6 rounded-lg bg-blue-200 dark:bg-blue-800" />
            </FloatingWrapper>

            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <Clock className="w-10 h-10 text-sky-500" />
            </div>
        </div>
    </div>
);

// Search no results illustration
const SearchIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800/50 dark:to-gray-800/50 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper delay={100}>
                <div className="absolute top-2 left-2 text-2xl opacity-30">?</div>
            </FloatingWrapper>
            <FloatingWrapper delay={300}>
                <div className="absolute bottom-4 right-4 text-xl opacity-20">?</div>
            </FloatingWrapper>

            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <Search className="w-10 h-10 text-slate-400" />
            </div>
        </div>
    </div>
);

// Error illustration
const ErrorIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
        </div>
    </div>
);

// Offline illustration
const OfflineIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-gray-200 dark:from-slate-700/50 dark:to-gray-700/50 animate-pulse" />

        <div className="relative w-40 h-40 flex items-center justify-center">
            <FloatingWrapper>
                <div className="absolute -top-2 right-4 opacity-30">
                    <Wifi className="w-6 h-6 text-slate-400" />
                </div>
            </FloatingWrapper>

            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <WifiOff className="w-10 h-10 text-slate-400" />
            </div>
        </div>
    </div>
);

// ============================================
// EMPTY STATE COMPONENT
// ============================================

type EmptyStateType = 'students' | 'attendance' | 'tasks' | 'schedule' | 'search' | 'error' | 'offline' | 'generic';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
    type?: EmptyStateType;
    title: string;
    description: string;
    primaryAction?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
    showHint?: boolean;
    hintText?: string;
    className?: string;
    customIllustration?: React.ReactNode;
}

const illustrationMap: Record<EmptyStateType, React.FC<{ className?: string }>> = {
    students: StudentsIllustration,
    attendance: CalendarIllustration,
    tasks: TasksIllustration,
    schedule: ScheduleIllustration,
    search: SearchIllustration,
    error: ErrorIllustration,
    offline: OfflineIllustration,
    generic: StudentsIllustration
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    type = 'generic',
    title,
    description,
    primaryAction,
    secondaryAction,
    showHint = false,
    hintText,
    className = '',
    customIllustration
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const Illustration = illustrationMap[type];

    return (
        <div
            className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Illustration */}
            <div className={`mb-8 transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}>
                {customIllustration || <Illustration className="w-40 h-40" />}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>

            {/* Description */}
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                {description}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        {primaryAction.icon || <Plus className="w-5 h-5" />}
                        {primaryAction.label}
                        <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </button>
                )}
                {secondaryAction && (
                    <button
                        onClick={secondaryAction.onClick}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                    >
                        {secondaryAction.icon}
                        {secondaryAction.label}
                    </button>
                )}
            </div>

            {/* Onboarding Hint */}
            {showHint && (
                <div className="mt-8 flex items-start gap-3 max-w-sm text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-lg">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Tips untuk memulai
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {hintText || 'Klik tombol di atas untuk menambahkan data pertama Anda.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// PRE-CONFIGURED EMPTY STATES
// ============================================

interface PresetEmptyStateProps {
    onAction?: () => void;
    onSecondaryAction?: () => void;
    showHint?: boolean;
    className?: string;
}

// Empty Students
export const EmptyStudents: React.FC<PresetEmptyStateProps> = ({
    onAction,
    onSecondaryAction,
    showHint = true,
    className
}) => (
    <EmptyState
        type="students"
        title="Belum Ada Data Siswa"
        description="Mulai dengan menambahkan siswa pertama ke kelas Anda, atau import data dari file Excel."
        primaryAction={onAction ? {
            label: 'Tambah Siswa',
            onClick: onAction,
            icon: <Plus className="w-5 h-5" />
        } : undefined}
        secondaryAction={onSecondaryAction ? {
            label: 'Import dari Excel',
            onClick: onSecondaryAction,
            icon: <Upload className="w-4 h-4" />
        } : undefined}
        showHint={showHint}
        hintText="Tambahkan siswa satu per satu, atau import banyak sekaligus dari file Excel."
        className={className}
    />
);

// Empty Attendance
export const EmptyAttendance: React.FC<PresetEmptyStateProps> = ({
    onAction,
    showHint = false,
    className
}) => (
    <EmptyState
        type="attendance"
        title="Belum Ada Data Absensi"
        description="Tidak ada data absensi untuk tanggal yang dipilih. Mulai mencatat kehadiran siswa."
        primaryAction={onAction ? {
            label: 'Isi Absensi',
            onClick: onAction,
            icon: <Calendar className="w-5 h-5" />
        } : undefined}
        showHint={showHint}
        className={className}
    />
);

// Empty Tasks
export const EmptyTasks: React.FC<PresetEmptyStateProps> = ({
    onAction,
    showHint = true,
    className
}) => (
    <EmptyState
        type="tasks"
        title="Tidak Ada Tugas"
        description="Belum ada tugas yang dibuat. Buat tugas pertama untuk mulai melacak pekerjaan Anda."
        primaryAction={onAction ? {
            label: 'Buat Tugas',
            onClick: onAction,
            icon: <Plus className="w-5 h-5" />
        } : undefined}
        showHint={showHint}
        hintText="Atur tugas Anda dengan deadline dan prioritas untuk produktivitas maksimal."
        className={className}
    />
);

// Empty Schedule
export const EmptySchedule: React.FC<PresetEmptyStateProps> = ({
    onAction,
    showHint = true,
    className
}) => (
    <EmptyState
        type="schedule"
        title="Jadwal Belum Dibuat"
        description="Belum ada jadwal pelajaran. Buat jadwal untuk mengatur kegiatan belajar mengajar."
        primaryAction={onAction ? {
            label: 'Tambah Jadwal',
            onClick: onAction,
            icon: <Plus className="w-5 h-5" />
        } : undefined}
        showHint={showHint}
        hintText="Jadwal akan membantu Anda mengatur waktu mengajar dengan efisien."
        className={className}
    />
);

// No Search Results
export const EmptySearchResults: React.FC<{
    query?: string;
    onClear?: () => void;
    className?: string;
}> = ({ query, onClear, className }) => (
    <EmptyState
        type="search"
        title="Tidak Ditemukan"
        description={query
            ? `Tidak ada hasil untuk "${query}". Coba kata kunci yang berbeda.`
            : 'Tidak ada hasil yang cocok dengan pencarian Anda.'
        }
        secondaryAction={onClear ? {
            label: 'Hapus Pencarian',
            onClick: onClear,
            icon: <RefreshCw className="w-4 h-4" />
        } : undefined}
        className={className}
    />
);

// Error State
export const EmptyError: React.FC<{
    message?: string;
    onRetry?: () => void;
    className?: string;
}> = ({ message, onRetry, className }) => (
    <EmptyState
        type="error"
        title="Terjadi Kesalahan"
        description={message || 'Gagal memuat data. Silakan coba lagi.'}
        primaryAction={onRetry ? {
            label: 'Coba Lagi',
            onClick: onRetry,
            icon: <RefreshCw className="w-5 h-5" />
        } : undefined}
        className={className}
    />
);

// Offline State
export const EmptyOffline: React.FC<{
    onRetry?: () => void;
    className?: string;
}> = ({ onRetry, className }) => (
    <EmptyState
        type="offline"
        title="Anda Sedang Offline"
        description="Tidak ada koneksi internet. Data akan disimpan dan disinkronkan saat online kembali."
        primaryAction={onRetry ? {
            label: 'Coba Lagi',
            onClick: onRetry,
            icon: <RefreshCw className="w-5 h-5" />
        } : undefined}
        className={className}
    />
);

// ============================================
// COMPACT EMPTY STATE
// ============================================

interface CompactEmptyStateProps {
    icon?: React.ReactNode;
    message: string;
    action?: EmptyStateAction;
    className?: string;
}

export const CompactEmptyState: React.FC<CompactEmptyStateProps> = ({
    icon,
    message,
    action,
    className = ''
}) => (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            {icon || <FileText className="w-6 h-6 text-slate-400" />}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{message}</p>
        {action && (
            <button
                onClick={action.onClick}
                className="text-sm text-indigo-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1"
            >
                {action.icon}
                {action.label}
            </button>
        )}
    </div>
);

// ============================================
// INLINE EMPTY STATE
// ============================================

interface InlineEmptyStateProps {
    message: string;
    action?: { label: string; onClick: () => void };
    className?: string;
}

export const InlineEmptyState: React.FC<InlineEmptyStateProps> = ({
    message,
    action,
    className = ''
}) => (
    <div className={`text-center py-4 px-3 ${className}`}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
            {message}
            {action && (
                <button
                    onClick={action.onClick}
                    className="ml-2 text-indigo-500 hover:text-indigo-600 font-medium"
                >
                    {action.label}
                </button>
            )}
        </p>
    </div>
);

// ============================================
// FIRST TIME USER EMPTY STATE
// ============================================

interface WelcomeEmptyStateProps {
    userName?: string;
    onGetStarted: () => void;
    onViewTutorial?: () => void;
    className?: string;
}

export const WelcomeEmptyState: React.FC<WelcomeEmptyStateProps> = ({
    userName,
    onGetStarted,
    onViewTutorial,
    className = ''
}) => (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
        {/* Welcome illustration */}
        <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
                <span className="text-5xl">👋</span>
            </div>
            <FloatingWrapper delay={200}>
                <div className="absolute -top-2 -right-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
            </FloatingWrapper>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Selamat Datang{userName ? `, ${userName}` : ''}!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Ini adalah pertama kalinya Anda menggunakan Portal Guru. Mari kita siapkan kelas Anda dalam beberapa langkah mudah.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
            <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all"
            >
                <Sparkles className="w-5 h-5" />
                Mulai Sekarang
            </button>
            {onViewTutorial && (
                <button
                    onClick={onViewTutorial}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                >
                    <HelpCircle className="w-5 h-5" />
                    Lihat Tutorial
                </button>
            )}
        </div>

        {/* Quick tips */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
            {[
                { icon: <Users className="w-5 h-5" />, title: 'Tambah Siswa', desc: 'Mulai dengan data siswa' },
                { icon: <Calendar className="w-5 h-5" />, title: 'Isi Absensi', desc: 'Catat kehadiran harian' },
                { icon: <ClipboardList className="w-5 h-5" />, title: 'Buat Tugas', desc: 'Kelola pekerjaan kelas' }
            ].map((tip, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                        {tip.icon}
                    </div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm">{tip.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tip.desc}</p>
                </div>
            ))}
        </div>
    </div>
);

// ============================================
// EXPORTS
// ============================================

export default {
    EmptyState,
    EmptyStudents,
    EmptyAttendance,
    EmptyTasks,
    EmptySchedule,
    EmptySearchResults,
    EmptyError,
    EmptyOffline,
    CompactEmptyState,
    InlineEmptyState,
    WelcomeEmptyState,
    // Illustrations
    StudentsIllustration,
    CalendarIllustration,
    TasksIllustration,
    ScheduleIllustration,
    SearchIllustration,
    ErrorIllustration,
    OfflineIllustration
};
