import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { AlertCircleIcon, BellIcon, CheckCircleIcon, ClockIcon, CheckSquareIcon, CalendarIcon, RefreshCwIcon } from '../Icons';
import { PlayCircle, Upload, Volume, Volume2, SendIcon } from 'lucide-react';
import { getPreferences, getUnreadCount, savePreferences, NotificationPreferences } from '../../services/NotificationService';
import { pushNotificationService, type PushStatusResult } from '../../services/PushNotificationService';
import { logger } from '../../services/logger';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import {
    SOUND_OPTIONS,
    getScheduleSound,
    setScheduleSound,
    getCustomSoundUrl,
    setCustomSound,
    clearCustomSound,
    previewSound,
    getSoundVolume,
    setSoundVolume,
    SoundType
} from '../../services/notificationSoundSettings';
import { SettingsCard } from './SettingsCard';



const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

const NotificationsSection: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [taskPrefs, setTaskPrefs] = useState<NotificationPreferences>(getPreferences());
    const [pushStatus, setPushStatus] = useState<PushStatusResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    // Sound picker state
    const [selectedSound, setSelectedSound] = useState<SoundType>('default');
    const [volume, setVolume] = useState(0.7);
    const [hasCustomSound, setHasCustomSound] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshNotificationStatus = useCallback(async () => {
        try {
            const status = await pushNotificationService.getStatus(user?.id ?? null);
            setPushStatus(status);
        } catch (err) {
            logger.warn('Failed to refresh push status', 'NotificationsSection', err);
        }
    }, [user?.id]);

    useEffect(() => {
        let isMounted = true;

        const loadSoundPreferences = async () => {
            try {
                const [sound, savedVolume, customSoundUrl] = await Promise.all([
                    getScheduleSound(),
                    getSoundVolume(),
                    getCustomSoundUrl(),
                ]);

                if (!isMounted) return;
                setSelectedSound(sound);
                setVolume(savedVolume);
                setHasCustomSound(Boolean(customSoundUrl));
            } catch (error) {
                console.error('Failed to load notification sound preferences:', error);
            }
        };

        void loadSoundPreferences();
        void refreshNotificationStatus();

        return () => {
            isMounted = false;
        };
    }, [refreshNotificationStatus]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refreshNotificationStatus();
        }, 0);
        window.addEventListener('portal-guru-notifications-updated', refreshNotificationStatus);
        window.addEventListener('focus', refreshNotificationStatus);
        window.addEventListener('push-status-changed', refreshNotificationStatus);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('portal-guru-notifications-updated', refreshNotificationStatus);
            window.removeEventListener('focus', refreshNotificationStatus);
            window.removeEventListener('push-status-changed', refreshNotificationStatus);
        };
    }, [refreshNotificationStatus]);

    const { data: _scheduleData } = useQuery({
        queryKey: ['scheduleWithClasses', user?.id],
        queryFn: async () => {
            const { data: schedule, error: scheduleError } = await supabase
                .from('schedules')
                .select('*')
                .eq('user_id', user!.id);

            const { data: classes, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id)
                .is('deleted_at', null);

            if (scheduleError || classesError) {
                throw scheduleError || classesError;
            }

            const classMap = new Map(classes.map(c => [c.id, c.name]));

            return (schedule || []).map(item => ({
                ...item,
                className: item.class_id ? (classMap.get(item.class_id) || item.class_id) : undefined
            }));
        },
        enabled: !!user
    });

    const handleToggle = async (checked: boolean) => {
        if (!user) {
            toast.error('Silakan login terlebih dahulu.');
            return;
        }
        setIsLoading(true);
        try {
            if (checked) {
                const status = await pushNotificationService.enable(user.id);
                setPushStatus(status);
                if (status.permission === 'granted' && status.subscribed) {
                    toast.success('Notifikasi push diaktifkan!');
                } else if (status.permission === 'denied') {
                    toast.error('Izin notifikasi diblokir. Buka Settings browser untuk mengizinkan.');
                } else {
                    toast.warning('Notifikasi belum sepenuhnya aktif. Coba lagi.');
                }
            } else {
                const status = await pushNotificationService.disable(user.id);
                setPushStatus(status);
                toast.info('Notifikasi push dinonaktifkan.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
            toast.error(message);
            logger.error('Push toggle failed', err as Error, undefined, 'NotificationsSection');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestPush = async () => {
        if (!user) {
            toast.error('Login dulu untuk tes push.');
            return;
        }
        if (!pushStatus?.subscribed) {
            toast.warning('Aktifkan notifikasi dulu.');
            return;
        }
        setIsTesting(true);
        try {
            // Show a local notification via the SW to confirm the chain works.
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification('Tes Notifikasi - MI Al Irsyad', {
                body: 'Kalau kamu melihat ini, notifikasi push berfungsi di device ini. Pesan sebenarnya akan dikirim dari server.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                tag: 'test-push',
                requireInteraction: false,
            });
            toast.success('Notifikasi tes ditampilkan.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Gagal menampilkan tes.';
            toast.error(message);
        } finally {
            setIsTesting(false);
        }
    };

    const handleTaskPrefChange = (key: keyof NotificationPreferences, value: NotificationPreferences[keyof NotificationPreferences]) => {
        const newPrefs = { ...taskPrefs, [key]: value };
        setTaskPrefs(newPrefs);
        savePreferences(newPrefs);
        toast.success("Preferensi notifikasi disimpan.");
    };

    const handleSoundSelect = (soundId: SoundType) => {
        setSelectedSound(soundId);
        void setScheduleSound(soundId);
        toast.success(`Nada notifikasi diubah ke "${SOUND_OPTIONS.find(s => s.id === soundId)?.name}"`);
    };

    const handlePreviewSound = (soundId: SoundType) => {
        previewSound(soundId);
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        void setSoundVolume(newVolume);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await setCustomSound(file);
            setHasCustomSound(true);
            setSelectedSound('custom');
            void setScheduleSound('custom');
            toast.success("Nada custom berhasil diupload!");
            // Preview the uploaded sound
            setTimeout(() => previewSound('custom'), 500);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal upload file");
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearCustomSound = () => {
        void clearCustomSound();
        setHasCustomSound(false);
        if (selectedSound === 'custom') {
            setSelectedSound('default');
            void setScheduleSound('default');
        }
        toast.info("Nada custom dihapus");
    };

    const permission = pushStatus?.permission ?? 'default';
    const subscribed = !!pushStatus?.subscribed;
    const serverRegistered = !!pushStatus?.serverRegistered;
    const enabled = !!pushStatus?.enabled;
    const unsupported = pushStatus !== null && !pushStatus.supported;

    const statusCards = [
        {
            label: 'Izin Browser',
            value: permission === 'granted'
                ? 'Diizinkan'
                : permission === 'default'
                    ? 'Belum diminta'
                    : permission === 'denied'
                        ? 'Diblokir'
                        : 'Tidak didukung',
            healthy: permission === 'granted',
        },
        {
            label: 'Push Subscription',
            value: unsupported
                ? 'Tidak didukung'
                : subscribed
                    ? serverRegistered
                        ? 'Aktif & terdaftar'
                        : 'Aktif (belum disinkronkan)'
                    : 'Belum subscribe',
            healthy: subscribed && serverRegistered,
        },
        {
            label: 'Status User',
            value: enabled ? 'Aktif' : 'Nonaktif',
            healthy: enabled,
        },
        {
            label: 'Belum Dibaca',
            value: `${getUnreadCount()}`,
            healthy: getUnreadCount() === 0,
        },
    ];

    return (
        <div className="space-y-6">
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-emerald-600 dark:from-sky-400 dark:to-emerald-400">
                                Status Sistem Notifikasi
                            </CardTitle>
                            <CardDescription className="text-base">
                                Pantau izin browser, subscription push, dan jumlah notifikasi yang belum dibaca.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleTestPush()}
                                disabled={isTesting || !subscribed}
                            >
                                <SendIcon className="w-4 h-4 mr-2" />
                                Tes Push
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void refreshNotificationStatus()}>
                                <RefreshCwIcon className="w-4 h-4 mr-2" />
                                Periksa
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 sm:pt-8 space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        {statusCards.map((item) => (
                            <div
                                key={item.label}
                                className={`rounded-2xl border p-4 ${item.healthy
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100'
                                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-75">{item.label}</p>
                                    {item.healthy ? <CheckCircleIcon className="h-4 w-4" /> : <AlertCircleIcon className="h-4 w-4" />}
                                </div>
                                <p className="mt-3 text-lg font-bold">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    {unsupported && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                            Browser ini tidak mendukung Web Push API. Notifikasi in-app tetap berfungsi.
                        </div>
                    )}
                    {isIOS && !pushStatus?.iOSPWA && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                            <strong>Pengguna iPhone/iPad:</strong> untuk menerima notifikasi push, install aplikasi ini ke Home Screen (Share → Add to Home Screen), kemudian buka dari ikon Home Screen.
                        </div>
                    )}
                    {!isOnline && (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
                            Anda sedang offline. Perubahan preferensi akan dikirim otomatis saat online kembali.
                        </div>
                    )}
                </CardContent>
            </SettingsCard>

            {/* Schedule Notifications */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Preferensi Notifikasi</CardTitle>
                    <CardDescription className="text-base">Kelola bagaimana Anda menerima pemberitahuan penting.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 sm:pt-8 space-y-3 sm:space-y-4">
                    {/* Push Master Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">Notifikasi Push</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    Terima pengingat jadwal &amp; tugas langsung di HP, bahkan saat aplikasi ditutup.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={enabled}
                            onChange={(e) => handleToggle(e.target.checked)}
                            disabled={isLoading || !isOnline || unsupported}
                            className="data-[state=checked]:bg-green-600 flex-shrink-0"
                        />
                    </div>

                    {/* Task Reminders */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                <CheckSquareIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">Pengingat Tugas</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Notifikasi saat tugas mendekati deadline.</p>
                            </div>
                        </div>
                        <Switch
                            checked={taskPrefs.taskReminders}
                            onChange={(e) => handleTaskPrefChange('taskReminders', e.target.checked)}
                            className="data-[state=checked]:bg-amber-600 flex-shrink-0"
                        />
                    </div>

                    {/* Task Reminder Timing */}
                    {taskPrefs.taskReminders && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 sm:ml-8 ml-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 sm:p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex-shrink-0">
                                    <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-white">Ingatkan Sebelum Deadline</p>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Waktu pengingatan sebelum deadline.</p>
                                </div>
                            </div>
                            <Select
                                value={taskPrefs.taskReminderHours.toString()}
                                onChange={(e) => handleTaskPrefChange('taskReminderHours', parseInt(e.target.value))}
                                className="w-full sm:w-32 flex-shrink-0"
                            >
                                <option value="6">6 jam</option>
                                <option value="12">12 jam</option>
                                <option value="24">24 jam</option>
                                <option value="48">48 jam</option>
                                <option value="72">72 jam</option>
                            </Select>
                        </div>
                    )}

                    {/* Attendance Reminders */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">Pengingat Absensi</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Ingatkan mengisi absensi harian.</p>
                            </div>
                        </div>
                        <Switch
                            checked={taskPrefs.attendanceReminders}
                            onChange={(e) => handleTaskPrefChange('attendanceReminders', e.target.checked)}
                            className="data-[state=checked]:bg-green-600 flex-shrink-0"
                        />
                    </div>
                </CardContent>
            </SettingsCard>

            {/* Notification Sound Picker */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
                        Nada Notifikasi
                    </CardTitle>
                    <CardDescription className="text-base">
                        Pilih nada yang akan diputar saat menerima notifikasi jadwal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 sm:pt-8 space-y-6">
                    {/* Volume Control */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            {volume > 0.5 ? <Volume2 className="w-5 h-5" /> : <Volume className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm text-slate-900 dark:text-white mb-2">Volume Notifikasi</p>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                        </div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-12 text-right">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>

                    {/* Sound Options Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {SOUND_OPTIONS.map((sound) => {
                                const isSelected = selectedSound === sound.id;
                                const isCustomDisabled = sound.id === 'custom' && !hasCustomSound;

                                const handleClick = () => {
                                    if (isCustomDisabled) return;
                                    handleSoundSelect(sound.id);
                                };

                                return (
                                    <div
                                        key={sound.id}
                                        className={`
                                        relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group
                                        ${isSelected
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg shadow-green-500/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-slate-800'
                                            }
                                        ${isCustomDisabled ? 'opacity-50' : ''}
                                    `}
                                        onClick={handleClick}
                                    >
                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}

                                        <div className="text-center">
                                            <span className="text-2xl block mb-2">{sound.icon}</span>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{sound.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sound.description}</p>
                                        </div>

                                        {/* Preview button for built-in sounds */}
                                        {sound.id !== 'none' && sound.id !== 'custom' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreviewSound(sound.id);
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Preview suara"
                                            >
                                                <PlayCircle className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Custom sound upload button */}
                                        {sound.id === 'custom' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fileInputRef.current?.click();
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                                title="Upload audio"
                                            >
                                                <Upload className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* Custom sound management */}
                    {hasCustomSound && (
                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎵</span>
                                <div>
                                    <p className="font-medium text-sm text-slate-900 dark:text-white">Custom Sound Aktif</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">File audio tersimpan di browser</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewSound('custom')}
                                    className="text-green-600 dark:text-green-400"
                                >
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    Test
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearCustomSound}
                                    className="text-red-600 dark:text-red-400"
                                >
                                    Hapus
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {/* Info note */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        💡 Tip: Upload file audio MP3, WAV, atau OGG (maks. 1MB) untuk nada custom
                    </p>
                </CardContent>
            </SettingsCard>
        </div>
    );
};

export default NotificationsSection;
