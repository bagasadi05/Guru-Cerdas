/**
 * Pusat Pemulihan Data (Data Recovery Center)
 * 
 * Central page for data recovery operations:
 * - Quick stats from deletion audit
 * - Links to Sampah and Riwayat
 * - Backup download/upload
 * - Recent deletion history
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
    Database,
    Trash2,
    RotateCcw,
    History,
    Download,
    Upload,
    Loader2,
    AlertTriangle,
    Clock,
    CheckCircle2,
    ArrowRight,
    Shield,
    HardDrive,
    FileText,
    Users,
    BookOpen,
    ClipboardCheck,
    Award,
    GraduationCap,
    Calendar,
    MessageSquare,
    School,
    Megaphone,
    Settings,
    FolderKanban,
    BookMarked,
} from 'lucide-react';
import { getDeletionAuditStats, DeletionAuditStats } from '../../services/DeletionAuditService';
import { exportBackup, importBackup, downloadBackup } from '../../services/backupService';
import { supabase } from '../../services/supabase';

// Backup history component
const BackupHistorySection: React.FC = () => {
    const { data: backupRuns, isLoading } = useQuery({
        queryKey: ['backup-runs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('backup_runs')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(10);
            if (error) return [];
            return data ?? [];
        },
        staleTime: 60000,
    });

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Riwayat Backup Otomatis</h2>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!backupRuns || backupRuns.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Riwayat Backup Otomatis</h2>
            </div>
            <div className="space-y-3">
                {backupRuns.map((run: Record<string, unknown>) => {
                    const status = run.status as string;
                    const isSuccess = status === 'success';
                    const isRunning = status === 'running';
                    return (
                        <div
                            key={run.id as string}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSuccess ? 'bg-emerald-500/10 text-emerald-500' : isRunning ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {run.backup_key ? String(run.backup_key).split('/').pop() : 'Backup'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatRelativeTime(run.started_at as string)}
                                    {(run.total_rows as number) > 0 && ` • ${(run.total_rows as number).toLocaleString('id-ID')} rows`}
                                    {(run.size_bytes as number) > 0 && ` • ${((run.size_bytes as number) / 1024).toFixed(1)} KB`}
                                </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${isSuccess ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : isRunning ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                {isSuccess ? 'Berhasil' : isRunning ? 'Berjalan' : 'Gagal'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Entity config for table labels
const tableLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    students: { label: 'Siswa', icon: <Users className="w-4 h-4" /> },
    classes: { label: 'Kelas', icon: <BookOpen className="w-4 h-4" /> },
    attendance: { label: 'Absensi', icon: <ClipboardCheck className="w-4 h-4" /> },
    tasks: { label: 'Tugas', icon: <FileText className="w-4 h-4" /> },
    violations: { label: 'Pelanggaran', icon: <AlertTriangle className="w-4 h-4" /> },
    quiz_points: { label: 'Poin Kuis', icon: <Award className="w-4 h-4" /> },
    academic_records: { label: 'Nilai Akademik', icon: <GraduationCap className="w-4 h-4" /> },
    reports: { label: 'Laporan', icon: <FileText className="w-4 h-4" /> },
    schedules: { label: 'Jadwal', icon: <Calendar className="w-4 h-4" /> },
    communications: { label: 'Komunikasi', icon: <MessageSquare className="w-4 h-4" /> },
    homework: { label: 'PR', icon: <BookMarked className="w-4 h-4" /> },
    extracurriculars: { label: 'Ekstrakurikuler', icon: <FolderKanban className="w-4 h-4" /> },
    student_extracurriculars: { label: 'Siswa Ekskul', icon: <Users className="w-4 h-4" /> },
    student_achievements: { label: 'Prestasi', icon: <Award className="w-4 h-4" /> },
    student_development_analyses: { label: 'Analisis Perkembangan', icon: <GraduationCap className="w-4 h-4" /> },
    school_info: { label: 'Info Sekolah', icon: <School className="w-4 h-4" /> },
    announcements: { label: 'Pengumuman', icon: <Megaphone className="w-4 h-4" /> },
    academic_years: { label: 'Tahun Ajaran', icon: <Calendar className="w-4 h-4" /> },
    semesters: { label: 'Semester', icon: <Calendar className="w-4 h-4" /> },
    user_settings: { label: 'Pengaturan User', icon: <Settings className="w-4 h-4" /> },
    teacher_class_assignments: { label: 'Guru-Kelas', icon: <Users className="w-4 h-4" /> },
    user_roles: { label: 'Role User', icon: <Shield className="w-4 h-4" /> },
    extracurricular_attendance: { label: 'Absensi Ekskul', icon: <ClipboardCheck className="w-4 h-4" /> },
    extracurricular_grades: { label: 'Nilai Ekskul', icon: <Award className="w-4 h-4" /> },
    extracurricular_students: { label: 'Siswa Ekskul', icon: <Users className="w-4 h-4" /> },
};

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PemulihanPage: React.FC = () => {
    const { session } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Fetch deletion audit stats
    const { data: auditStats, isLoading: statsLoading } = useQuery({
        queryKey: ['deletion-audit-stats'],
        queryFn: getDeletionAuditStats,
        staleTime: 60000,
    });

    // Fetch recent deletions
    const { data: recentDeletions } = useQuery({
        queryKey: ['deletion-audit-recent'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deletion_audit')
                .select('*')
                .order('deleted_at', { ascending: false })
                .limit(10);
            if (error) return [];
            return data ?? [];
        },
        staleTime: 60000,
    });

    // Download backup mutation
    const downloadBackupMutation = useMutation({
        mutationFn: async () => {
            if (!session?.user?.id) throw new Error('Not authenticated');
            return exportBackup(session.user.id);
        },
        onSuccess: (blob) => {
            downloadBackup(blob);
            toast.success('Backup berhasil diunduh');
        },
        onError: () => {
            toast.error('Gagal mengunduh backup');
        },
    });

    // Import backup mutation
    const importBackupMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!session?.user?.id) throw new Error('Not authenticated');
            return importBackup(file, session.user.id);
        },
        onSuccess: () => {
            toast.success('Backup berhasil diimpor');
            setShowImportModal(false);
            setImportFile(null);
            queryClient.invalidateQueries({ queryKey: ['deletion-audit-stats'] });
        },
        onError: () => {
            toast.error('Gagal mengimpor backup');
        },
    });

    // Calculate stats
    const totalDeleted = auditStats?.totalDeleted ?? 0;
    const totalRestored = auditStats?.totalRestored ?? 0;
    const pendingRestore = totalDeleted - totalRestored;
    const perTableEntries = Object.entries(auditStats?.perTable ?? {});

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full pb-24 lg:pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Database className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                                    Pusat Pemulihan Data
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Kelola pemulihan data, backup, dan audit penghapusan
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalDeleted}</p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Dihapus</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <RotateCcw className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalRestored}</p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">Berhasil Dipulihkan</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingRestore}</p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">Menunggu Pemulihan</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{perTableEntries.length}</p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tabel Terdampak</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate('/sampah')}
                        className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Trash2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Sampah</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Lihat, pulihkan, atau hapus permanen data yang dihapus
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </button>

                    <button
                        onClick={() => navigate('/riwayat')}
                        className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <History className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Riwayat Aksi</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Lihat semua aksi yang dilakukan dan lakukan undo jika diperlukan
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                </div>

                {/* Backup Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-blue-500" />
                        Backup & Restore
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={() => downloadBackupMutation.mutate()}
                            disabled={downloadBackupMutation.isPending}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {downloadBackupMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Unduh Backup
                        </Button>
                        <Button
                            onClick={() => setShowImportModal(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import Backup
                        </Button>
                    </div>
                </div>

                {/* Per-Table Breakdown */}
                {perTableEntries.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-indigo-500" />
                            Breakdown per Tabel
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Tabel</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Dihapus</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Dipulihkan</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Sisa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {perTableEntries.map(([table, stats]) => {
                                        const cfg = tableLabels[table] ?? { label: table, icon: <Database className="w-4 h-4" /> };
                                        const remaining = stats.deleted - stats.restored;
                                        return (
                                            <tr key={table} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="py-3 px-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                                    <span className="text-slate-400">{cfg.icon}</span>
                                                    {cfg.label}
                                                </td>
                                                <td className="py-3 px-4 text-right text-red-500 font-medium">{stats.deleted}</td>
                                                <td className="py-3 px-4 text-right text-emerald-500 font-medium">{stats.restored}</td>
                                                <td className="py-3 px-4 text-right text-amber-500 font-medium">{remaining}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Deletions */}
                {recentDeletions && recentDeletions.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Penghapusan Terbaru
                        </h2>
                        <div className="space-y-3">
                            {recentDeletions.map((record) => {
                                const cfg = tableLabels[record.table_name] ?? { label: record.table_name, icon: <Database className="w-4 h-4" /> };
                                const isRestored = !!record.restored_at;
                                return (
                                    <div
                                        key={record.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRestored ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {isRestored ? <CheckCircle2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                {cfg.label} — <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{String(record.record_id).slice(0, 8)}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {formatRelativeTime(record.deleted_at)}
                                                {isRestored && ' • Dipulihkan'}
                                            </p>
                                        </div>
                                        {isRestored ? (
                                            <span className="px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">Dipulihkan</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">Dihapus</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Backup History */}
                <BackupHistorySection />

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p className="font-medium text-slate-900 dark:text-white mb-1">Tentang Pemulihan Data</p>
                            <p>
                                Data yang dihapus akan masuk ke Sampah dan disimpan selama 30 hari sebelum dihapus permanen.
                                Anda dapat memulihkan data kapan saja selama masih dalam periode tersebut.
                                Backup otomatis berjalan setiap hari jam 02:00 WIB ke Cloudflare R2 dengan retensi 30 hari.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                }}
                title="Import Backup"
                icon={<Upload className="w-5 h-5 text-blue-500" />}
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Pilih file backup JSON yang ingin diimport. Data akan ditambahkan ke database.
                    </p>

                    <div
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setImportFile(file);
                            }}
                        />
                        {importFile ? (
                            <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">{importFile.name}</span>
                            </div>
                        ) : (
                            <div className="text-slate-500 dark:text-slate-400">
                                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Klik untuk memilih file backup</p>
                                <p className="text-xs mt-1">Format: .json</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowImportModal(false);
                                setImportFile(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                if (importFile) importBackupMutation.mutate(importFile);
                            }}
                            disabled={!importFile || importBackupMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {importBackupMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Import Sekarang
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PemulihanPage;
