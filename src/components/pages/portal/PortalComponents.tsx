/**
 * Parent Portal UI Components
 * 
 * Reusable UI components for the Parent Portal
 */

import React, { useEffect, useState } from 'react';
import { BellIcon, GraduationCapIcon, LogoutIcon, SettingsIcon, UsersIcon } from '../../Icons';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { getStudentAvatar } from '../../../utils/avatarUtils';
import type { PortalStudentInfo, PortalAnnouncement, PortalData } from './types';

// ============================================
// GLASS CARD
// ============================================

export const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div
        className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl ${className}`}
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
        <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
                <BellIcon className="w-4 h-4 text-amber-500 animate-pulse" />
                <div className="flex-1 overflow-hidden relative h-5">
                    {announcements.map((ann, idx) => (
                        <div
                            key={ann.id}
                            className={`absolute inset-0 flex items-center transition-all duration-500 transform ${idx === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                                }`}
                        >
                            <span className="text-sm font-medium text-amber-500 truncate mr-2">
                                [{new Date(ann.date || '').toLocaleDateString('id-ID')}]
                            </span>
                            <span className="text-sm text-amber-100 truncate">
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
    onSave: (name: string, phone: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, student, onSave }) => {
    const [name, setName] = useState(student.parent_name || '');
    const [phone, setPhone] = useState(student.parent_phone || '');
    const [isSaving, setIsSaving] = useState(false);

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
    <header className="relative overflow-hidden bg-slate-900">
        <AnnouncementsTicker announcements={announcements} />

        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                            <GraduationCapIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Portal Orang Tua</h1>
                            <p className="text-xs sm:text-sm text-white/70">Pantau perkembangan belajar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={onSettingsClick}
                            className="text-white hover:bg-white/20 rounded-xl px-4"
                            aria-label="Pengaturan"
                        >
                            <SettingsIcon className="w-5 h-5 sm:mr-2" />
                            <span className="hidden sm:inline">Pengaturan</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onLogout}
                            className="text-white hover:bg-white/20 rounded-xl px-4"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="w-5 h-5 mr-2" />
                            <span className="hidden sm:inline">Keluar</span>
                        </Button>
                    </div>
                </div>

                {/* Student Profile Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
                    <div className="flex items-center gap-4">
                        <img
                            src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name)}
                            alt={student.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-3 border-white/50 shadow-xl bg-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{student.name}</h2>
                            <p className="text-white/80 text-sm sm:text-base">Kelas {student.classes.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-xs text-white/90">
                                    <UsersIcon className="w-3 h-3" />
                                    Siswa Aktif
                                </span>
                            </div>
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
    <div className="group relative p-4 sm:p-6 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
