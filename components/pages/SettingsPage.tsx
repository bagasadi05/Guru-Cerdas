

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Modal } from '../ui/Modal';
import { UserCircleIcon, PaletteIcon, BellIcon, ShieldIcon, CameraIcon, SunIcon, MoonIcon, CheckCircleIcon, LinkIcon, DownloadCloudIcon } from '../Icons';
import * as ics from 'ics';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { optimizeImage } from '../utils/image';


type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type ScheduleWithClassName = ScheduleRow & { className?: string };

const ProfileSection: React.FC = () => {
    const { user, updateUser } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [name, setName] = useState(user?.name || '');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(user?.name || '');
    }, [user]);

    const handleAvatarUpload = async (file: File) => {
        if (!user) return;
        setUploading(true);

        try {
            const optimizedBlob = await optimizeImage(file, { maxWidth: 300, quality: 0.8 });
            const optimizedFile = new File([optimizedBlob], `${user.id}-avatar.jpg`, { type: 'image/jpeg' });

            const filePath = `${user.id}/avatar-${new Date().getTime()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('teacher_assets')
                .upload(filePath, optimizedFile, {
                    cacheControl: '3600',
                    upsert: true, // Upsert to overwrite if a file with the same name exists (e.g. retry)
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: publicUrlData } = supabase.storage
                .from('teacher_assets')
                .getPublicUrl(filePath);

            if (publicUrlData.publicUrl) {
                const { error: updateUserError } = await updateUser({ avatar_url: publicUrlData.publicUrl });
                if (updateUserError) {
                    throw updateUserError;
                } else {
                    toast.success("Foto profil berhasil diperbarui!");
                }
            } else {
                throw new Error("Tidak bisa mendapatkan URL publik untuk foto.");
            }

        } catch (error: any) {
            toast.error(`Gagal mengunggah foto: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleAvatarUpload(file);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await updateUser({ name });
        if (error) {
            toast.error(`Gagal memperbarui profil: ${error.message}`);
        } else {
            toast.success("Profil berhasil diperbarui!");
        }
    };

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Profil Pengguna</CardTitle>
                <CardDescription className="text-base">Perbarui informasi profil dan foto identitas Anda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <form onSubmit={handleProfileSubmit} className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full opacity-70 blur group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative">
                                <img
                                    key={user?.avatarUrl}
                                    src={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}`}
                                    alt="Avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-inner"
                                />
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" disabled={uploading} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !isOnline} className="absolute bottom-0 right-0 p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:scale-110 hover:shadow-purple-500/50 transition-all duration-300" aria-label="Ubah foto profil">
                                    {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CameraIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {user?.email}
                            </p>
                            <div className="pt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                    Guru / Pengajar
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="Masukkan nama lengkap Anda"
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="submit" disabled={!isOnline} className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

const AppearanceSection: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Tampilan Aplikasi</CardTitle>
                <CardDescription className="text-base">Sesuaikan tema aplikasi dengan preferensi visual Anda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button
                        onClick={() => setTheme('light')}
                        className={`
                            group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                            ${theme === 'light'
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 ring-4 ring-indigo-500/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/50'
                            }
                        `}
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                <SunIcon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className={`font-bold text-lg ${theme === 'light' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Terang</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan cerah dan bersih untuk siang hari.</p>
                            </div>
                        </div>
                        {theme === 'light' && (
                            <div className="absolute top-4 right-4 text-indigo-500 animate-scale-in">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={`
                            group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                            ${theme === 'dark'
                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 ring-4 ring-purple-500/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-slate-800/50'
                            }
                        `}
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                <MoonIcon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className={`font-bold text-lg ${theme === 'dark' ? 'text-purple-900 dark:text-purple-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Gelap</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan elegan dan nyaman untuk malam hari.</p>
                            </div>
                        </div>
                        {theme === 'dark' && (
                            <div className="absolute top-4 right-4 text-purple-500 animate-scale-in">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                        )}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

const NotificationsSection: React.FC = () => {
    const { enableScheduleNotifications, disableScheduleNotifications, user, isNotificationsEnabled } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [isLoading, setIsLoading] = useState(false);

    const { data: scheduleData } = useQuery({
        queryKey: ['scheduleWithClasses', user?.id],
        queryFn: async () => {
            const { data: schedule, error: scheduleError } = await supabase
                .from('schedules')
                .select('*')
                .eq('user_id', user!.id);

            const { data: classes, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id);

            if (scheduleError || classesError) {
                throw scheduleError || classesError;
            }

            const classMap = new Map(classes.map(c => [c.id, c.name]));

            return schedule.map(item => ({
                ...item,
                className: classMap.get(item.class_id) || item.class_id
            }));
        },
        enabled: !!user
    });

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        if (checked) {
            if (!scheduleData || scheduleData.length === 0) {
                toast.warning("Tidak ada data jadwal untuk notifikasi.");
                setIsLoading(false);
                return;
            }
            const success = await enableScheduleNotifications(scheduleData as ScheduleWithClassName[]);
            if (success) {
                toast.success("Notifikasi jadwal diaktifkan!");
            } else {
                toast.error("Gagal mengaktifkan notifikasi.");
            }
        } else {
            await disableScheduleNotifications();
            toast.info("Notifikasi jadwal dinonaktifkan.");
        }
        setIsLoading(false);
    };

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Preferensi Notifikasi</CardTitle>
                <CardDescription className="text-base">Kelola bagaimana Anda menerima pemberitahuan penting.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <BellIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white">Pengingat Jadwal Kelas</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan notifikasi browser 5 menit sebelum kelas dimulai.</p>
                        </div>
                    </div>
                    <Switch checked={isNotificationsEnabled} onChange={(e) => handleToggle(e.target.checked)} disabled={isLoading || !isOnline} className="data-[state=checked]:bg-indigo-600" />
                </div>
            </CardContent>
        </Card>
    );
};

const IntegrationsSection: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();

    const { data: scheduleData } = useQuery({
        queryKey: ['scheduleForICS', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('user_id', user!.id);
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const handleExport = () => {
        if (!scheduleData || scheduleData.length === 0) {
            toast.warning("Tidak ada jadwal untuk diekspor.");
            return;
        }

        // Map Indonesian day names to iCalendar BYDAY values
        const dayToICalDay: Record<string, 'MO' | 'TU' | 'WE' | 'TH' | 'FR'> = {
            'Senin': 'MO',
            'Selasa': 'TU',
            'Rabu': 'WE',
            'Kamis': 'TH',
            'Jumat': 'FR',
        };
        const dayNameToIndex: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

        const events: ics.EventAttributes[] = scheduleData.map(item => {
            const [startHour, startMinute] = item.start_time.split(':').map(Number);
            const [endHour, endMinute] = item.end_time.split(':').map(Number);

            // Find the date of the next occurrence of the specified day
            const now = new Date();
            const targetDayIndex = dayNameToIndex[item.day];
            const currentDayIndex = now.getDay();

            let dayDifference = targetDayIndex - currentDayIndex;
            // If the day has already passed this week, schedule it for next week.
            if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)))) {
                dayDifference += 7;
            }

            const eventDate = new Date();
            eventDate.setDate(now.getDate() + dayDifference);

            const year = eventDate.getFullYear();
            const month = eventDate.getMonth() + 1;
            const day = eventDate.getDate();

            // The recurrence rule should be specific to the day of the event
            const recurrenceRule = `FREQ=WEEKLY;BYDAY=${dayToICalDay[item.day]}`;

            return {
                uid: `guru-pwa-${item.id}@myapp.com`, // Unique ID for each event
                title: `${item.subject} (Kelas ${item.class_id})`,
                start: [year, month, day, startHour, startMinute],
                end: [year, month, day, endHour, endMinute],
                rrule: recurrenceRule,
                description: `Jadwal mengajar untuk kelas ${item.class_id}`,
                location: 'Sekolah',
                startOutputType: 'local', // Explicitly set timezone handling
                endOutputType: 'local',
            };
        });

        ics.createEvents(events, (error, value) => {
            if (error) {
                toast.error("Gagal membuat file kalender.");
                console.error(error);
                return;
            }
            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'jadwal_mengajar.ics';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("File kalender berhasil diunduh!");
        });
    };

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Integrasi Eksternal</CardTitle>
                <CardDescription className="text-base">Hubungkan dan sinkronkan data Anda dengan layanan lain.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <DownloadCloudIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white">Ekspor ke iCalendar (.ics)</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Unduh jadwal Anda untuk Google Calendar, Apple Calendar, atau Outlook.</p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" disabled={!isOnline} className="border-slate-200 hover:bg-white hover:text-purple-600 transition-colors">
                        <DownloadCloudIcon className="w-4 h-4 mr-2" />
                        Ekspor
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


const AccountSection: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { updateUser } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Password tidak cocok.");
            return;
        }
        if (password.length < 6) {
            toast.error("Password minimal harus 6 karakter.");
            return;
        }
        const { error } = await updateUser({ password });
        if (error) {
            toast.error(`Gagal mengubah password: ${error.message}`);
        } else {
            toast.success("Password berhasil diubah!");
            setPassword('');
            setConfirmPassword('');
        }
    };

    const handleDeleteAccount = async () => {
        const { error } = await supabase.rpc('delete_user_account', {});
        if (error) {
            toast.error(`Gagal menghapus akun: ${error.message}`);
        } else {
            toast.success("Akun berhasil dihapus. Anda akan logout.");
            await queryClient.clear();
            onLogout();
        }
        setDeleteModalOpen(false);
    };

    return (
        <>
            <div className="space-y-8">
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Keamanan Akun</CardTitle>
                        <CardDescription className="text-base">Perbarui kata sandi dan amankan akun Anda.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password Baru</label>
                                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 dark:border-slate-700" placeholder="Minimal 6 karakter" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Konfirmasi Password Baru</label>
                                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 dark:border-slate-700" placeholder="Ulangi password baru" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={!isOnline} className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
                                    Perbarui Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 dark:bg-red-900/10 backdrop-blur-md border-red-200 dark:border-red-900/30 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-red-100 dark:border-red-900/20 pb-6">
                        <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <ShieldIcon className="w-6 h-6" />
                            Zona Berbahaya
                        </CardTitle>
                        <CardDescription className="text-red-600/70 dark:text-red-400/70 text-base">Tindakan di area ini berisiko tinggi dan tidak dapat dibatalkan.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <div>
                                <p className="font-bold text-lg text-red-700 dark:text-red-300">Hapus Akun Permanen</p>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Menghapus seluruh data siswa, nilai, dan laporan Anda dari sistem.</p>
                            </div>
                            <Button variant="destructive" onClick={() => setDeleteModalOpen(true)} disabled={!isOnline} className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20">
                                Hapus Akun Saya
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Konfirmasi Penghapusan Akun">
                <div className="space-y-4">
                    <p>Ini adalah tindakan permanen. Semua data siswa, laporan, dan jadwal Anda akan hilang. Untuk melanjutkan, ketik <strong className="text-red-500">HAPUS</strong> di bawah ini.</p>
                    <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="HAPUS" />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'HAPUS' || !isOnline}>
                            Saya Mengerti, Hapus Akun Saya
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};


const SettingsPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const navItems = [
        { id: 'profile', label: 'Profil', icon: UserCircleIcon }, { id: 'appearance', label: 'Tampilan', icon: PaletteIcon },
        { id: 'notifications', label: 'Notifikasi', icon: BellIcon }, { id: 'integrations', label: 'Integrasi', icon: LinkIcon },
        { id: 'account', label: 'Akun & Keamanan', icon: ShieldIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSection />;
            case 'appearance': return <AppearanceSection />;
            case 'notifications': return <NotificationsSection />;
            case 'integrations': return <IntegrationsSection />;
            case 'account': return <AccountSection onLogout={logout} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950/50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Premium Header */}
                <header className="relative p-8 md:p-12 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl shadow-indigo-900/20 overflow-hidden isolate">
                    {/* Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent -z-10"></div>

                    <div className="relative z-10 animate-fade-in-up">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-indigo-200">
                            Pengaturan
                        </h1>
                        <p className="mt-4 text-indigo-100/80 text-lg max-w-2xl leading-relaxed">
                            Kelola profil, tampilan, dan preferensi notifikasi Anda dengan pengalaman yang lebih personal.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <aside className="lg:col-span-3 space-y-4">
                        <nav className="flex flex-wrap lg:flex-col gap-2 p-2 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        group flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden
                                        ${activeTab === item.id
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                                    {activeTab === item.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <main className="lg:col-span-9">
                        <div key={activeTab} className="transition-all duration-500 animate-fade-in">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;