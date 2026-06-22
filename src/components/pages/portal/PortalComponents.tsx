/**
 * Parent Portal UI Components
 * 
 * Reusable UI components for the Parent Portal
 */

import React, { useEffect, useState, useCallback } from 'react';
import { BellIcon, GraduationCapIcon, LogoutIcon, SettingsIcon, UsersIcon } from '../../Icons';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { getStudentAvatar } from '../../../utils/avatarUtils';
import type { PortalStudentInfo, PortalAnnouncement, PortalData } from './types';
import { pushNotificationService } from '../../../services/PushNotificationService';

// ============================================
// GLASS CARD
// ============================================

export const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div
        className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/82 ${className}`}
        {...props}
    />
);

// ============================================
// ANNOUNCEMENTS TICKER
// ============================================

interface AnnouncementsTickerProps {
    announcements: PortalAnnouncement[];
}

export const AnnouncementsTicker: React.FC<AnnouncementsTickerProps> = ({ announcements }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (announcements.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % announcements.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [announcements.length]);

    if (!announcements.length) return null;

    return (
        <div className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-slate-100 sm:px-6">
                <BellIcon className="h-4 w-4 text-amber-300" />
                <div className="flex-1 overflow-hidden relative h-5">
                    {announcements.map((ann, idx) => (
                        <div
                            key={ann.id}
                            className={`absolute inset-0 flex items-center transition-all duration-500 transform ${idx === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                                }`}
                        >
                            <span className="mr-2 truncate text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                                [{new Date(ann.date || '').toLocaleDateString('id-ID')}]
                            </span>
                            <span className="truncate text-sm text-slate-100/90">
                                {ann.title}: {ann.content}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================
// SETTINGS MODAL
// ============================================

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: PortalData['student'];
    accessCode: string;
    onSave: (name: string, phone: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, student, accessCode, onSave }) => {
    const [name, setName] = useState(student.parent_name || '');
    const [phone, setPhone] = useState(student.parent_phone || '');
    const [isSaving, setIsSaving] = useState(false);

    // Push notification state
    const [pushSupported, setPushSupported] = useState(false);
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushError, setPushError] = useState<string | null>(null);

    const refreshPushStatus = useCallback(async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        const status = await pushNotificationService.getParentStatus(accessCode, student.id);
        setPushSubscribed(status.isSubscribed);
        if (status.error) setPushError(status.error);
    }, [accessCode, student.id]);

    useEffect(() => {
        if (!isOpen) return;
        setName(student.parent_name || '');
        setPhone(student.parent_phone || '');
        setPushError(null);
        const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        setPushSupported(supported);
        if (supported) refreshPushStatus();
    }, [isOpen, student.parent_name, student.parent_phone, refreshPushStatus]);

    const handleTogglePush = async () => {
        setPushError(null);
        setPushLoading(true);
        try {
            if (pushSubscribed) {
                const result = await pushNotificationService.disableForParent(accessCode, student.id);
                if (!result.ok) setPushError(result.error ?? 'Gagal menonaktifkan notifikasi.');
            } else {
                const result = await pushNotificationService.enableForParent(accessCode, student.id);
                if (!result.ok) setPushError(result.error ?? 'Gagal mengaktifkan notifikasi.');
            }
            await refreshPushStatus();
        } finally {
            setPushLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(name, phone);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Data Orang Tua">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama Orang Tua / Wali
                    </label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nomor WhatsApp (untuk notifikasi)
                    </label>
                    <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Pastikan nomor aktif untuk menerima notifikasi kehadiran siswa.
                    </p>
                </div>

                {/* Push Notification Toggle */}
                {pushSupported && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <BellIcon className="h-4 w-4 text-emerald-500" />
                                    Notifikasi Push
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {pushSubscribed
                                        ? 'Aktif di perangkat ini — nilai, absensi, dan pengumuman.'
                                        : 'Aktifkan untuk menerima info nilai & absensi secara real-time.'}
                                </p>
                            </div>
                            {/* Toggle Switch */}
                            <button
                                type="button"
                                role="switch"
                                aria-checked={pushSubscribed}
                                disabled={pushLoading}
                                onClick={handleTogglePush}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
                                    pushSubscribed
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                        pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        {pushError && (
                            <p className="text-xs text-red-500">{pushError}</p>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                        Batal
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// ============================================
// PORTAL HEADER
// ============================================

interface PortalHeaderProps {
    student: PortalStudentInfo;
    announcements: PortalAnnouncement[];
    onLogout: () => void;
    onSettingsClick: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
    student,
    announcements,
    onLogout,
    onSettingsClick
}) => (
    <header className="relative overflow-hidden bg-slate-950">
        <AnnouncementsTicker announcements={announcements} />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(135deg,_#0f172a_0%,_#16213c_45%,_#1e293b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.08]" />
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 px-4 pb-20 pt-4 sm:px-6 sm:pb-24 sm:pt-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100/90">
                            <GraduationCapIcon className="h-4 w-4 text-amber-300" />
                            Portal Wali Murid
                        </div>
                        <h1 className="mt-5 font-serif text-3xl leading-tight text-white sm:text-4xl">
                            Informasi akademik siswa dalam satu portal yang rapi dan resmi.
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200/80 sm:text-base">
                            Pantau perkembangan belajar, kehadiran, tugas, dan komunikasi sekolah dengan tampilan yang lebih jelas untuk wali murid.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        <Button
                            variant="ghost"
                            onClick={onSettingsClick}
                            className="rounded-xl border border-white/15 bg-white/10 px-4 text-white hover:bg-white/15"
                            aria-label="Pengaturan"
                        >
                            <SettingsIcon className="h-5 w-5 sm:mr-2" />
                            <span className="hidden sm:inline">Perbarui Data Wali</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onLogout}
                            className="rounded-xl border border-white/15 bg-white/10 px-4 text-white hover:bg-white/15"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="h-5 w-5 sm:mr-2" />
                            <span className="hidden sm:inline">Keluar Portal</span>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
                    <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 shadow-2xl backdrop-blur-md sm:p-7">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <img
                                src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name)}
                                alt={student.name}
                                className="h-20 w-20 rounded-[24px] border-4 border-white/20 object-cover shadow-xl bg-slate-200 sm:h-24 sm:w-24"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-200/70">Profil Siswa</p>
                                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{student.name}</h2>
                                <p className="mt-1 text-sm text-slate-200/80">
                                    Kelas {student.classes.name} • Akses aktif untuk wali murid
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-100">
                                        <UsersIcon className="h-3.5 w-3.5" />
                                        Siswa aktif
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100/85">
                                        Wali: {student.parent_name || 'Belum diperbarui'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-3 rounded-[28px] border border-white/12 bg-slate-950/30 p-5 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/65">Wali Terdaftar</p>
                            <p className="mt-2 text-lg font-semibold text-white">{student.parent_name || 'Silakan lengkapi data wali'}</p>
                            <p className="mt-1 text-sm text-slate-200/75">{student.parent_phone || 'Nomor WhatsApp belum diisi'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/65">Tujuan Portal</p>
                            <p className="mt-2 text-sm leading-6 text-slate-100/80">
                                Menyajikan ringkasan akademik, komunikasi guru, dan dokumen siswa dengan bahasa yang mudah dipahami wali murid.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, colorClass }) => (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {/* Decorative Background */}
        <div className={`absolute -top-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full opacity-20 ${colorClass.replace('bg-gradient-to-br', 'bg')}`} />
        <div className="relative z-10">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-3 sm:mb-4 flex items-center justify-center shadow-lg ${colorClass}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
        </div>
    </div>
);

export default {
    GlassCard,
    AnnouncementsTicker,
    SettingsModal,
    PortalHeader,
    StatCard,
};
