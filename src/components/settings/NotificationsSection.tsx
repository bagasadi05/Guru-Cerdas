import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { BellIcon, ClockIcon, CheckSquareIcon, CalendarIcon } from '../Icons';
import { PlayCircle, Upload, Volume, Volume2, Smartphone } from 'lucide-react';
import { getPreferences, savePreferences, NotificationPreferences } from '../../services/NotificationService';
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
import { Capacitor } from '@capacitor/core';
import { SettingsCard } from './SettingsCard';

type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ScheduleWithClassName = ScheduleRow & { className?: string };

const loadRingtonePicker = async () => {
    const module = await import('../../plugins/RingtonePicker');
    return module.default;
};

const NotificationsSection: React.FC = () => {
    const { enableScheduleNotifications, disableScheduleNotifications, user, isNotificationsEnabled } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [taskPrefs, setTaskPrefs] = useState<NotificationPreferences>(getPreferences());

    // Sound picker state
    const [selectedSound, setSelectedSound] = useState<SoundType>(getScheduleSound());
    const [volume, setVolume] = useState(getSoundVolume());
    const [hasCustomSound, setHasCustomSound] = useState(!!getCustomSoundUrl());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // System ringtone state (for Android native picker)
    const [systemRingtoneTitle, setSystemRingtoneTitle] = useState<string | null>(
        localStorage.getItem('portal_guru_system_ringtone_title')
    );
    const [systemRingtoneUri, setSystemRingtoneUri] = useState<string | null>(
        localStorage.getItem('portal_guru_system_ringtone_uri')
    );
    const isAndroid = Capacitor.getPlatform() === 'android';

    // Handler for opening native ringtone picker (Android only)
    const handleSystemRingtoneSelect = async () => {
        if (!isAndroid) {
            toast.warning("Fitur ini hanya tersedia di Android");
            return;
        }

        try {
            const ringtonePicker = await loadRingtonePicker();
            const result = await ringtonePicker.openPicker({
                type: 'notification',
                title: 'Pilih Nada Notifikasi',
                currentUri: systemRingtoneUri || undefined,
            });

            if (!result.cancelled) {
                if (result.isSilent) {
                    setSelectedSound('none');
                    setScheduleSound('none');
                    toast.info("Notifikasi diatur ke mode diam");
                } else if (result.uri) {
                    setSystemRingtoneUri(result.uri);
                    setSystemRingtoneTitle(result.title || 'System Sound');
                    localStorage.setItem('portal_guru_system_ringtone_uri', result.uri);
                    localStorage.setItem('portal_guru_system_ringtone_title', result.title || 'System Sound');

                    setSelectedSound('system');
                    setScheduleSound('system');
                    toast.success(`Nada dipilih: ${result.title}`);

                    // Preview the selected ringtone
                    ringtonePicker.previewSound({ uri: result.uri });
                }
            }
        } catch (error) {
            console.error('Error opening ringtone picker:', error);
            toast.error("Gagal membuka pemilih ringtone");
        }
    };

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
                .eq('user_id', user!.id)
                .is('deleted_at', null);

            if (scheduleError || classesError) {
                throw scheduleError || classesError;
            }

            const classMap = new Map(classes.map(c => [c.id, c.name]));

            return schedule.map(item => ({
                ...item,
                className: item.class_id ? (classMap.get(item.class_id) || item.class_id) : undefined
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

    const handleTaskPrefChange = (key: keyof NotificationPreferences, value: any) => {
        const newPrefs = { ...taskPrefs, [key]: value };
        setTaskPrefs(newPrefs);
        savePreferences(newPrefs);
        toast.success("Preferensi notifikasi disimpan.");
    };

    const handleSoundSelect = (soundId: SoundType) => {
        setSelectedSound(soundId);
        setScheduleSound(soundId);
        toast.success(`Nada notifikasi diubah ke "${SOUND_OPTIONS.find(s => s.id === soundId)?.name}"`);
    };

    const handlePreviewSound = (soundId: SoundType) => {
        previewSound(soundId);
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        setSoundVolume(newVolume);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await setCustomSound(file);
            setHasCustomSound(true);
            setSelectedSound('custom');
            setScheduleSound('custom');
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
        clearCustomSound();
        setHasCustomSound(false);
        if (selectedSound === 'custom') {
            setSelectedSound('default');
            setScheduleSound('default');
        }
        toast.info("Nada custom dihapus");
    };

    return (
        <div className="space-y-6">
            {/* Schedule Notifications */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Preferensi Notifikasi</CardTitle>
                    <CardDescription className="text-base">Kelola bagaimana Anda menerima pemberitahuan penting.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 sm:pt-8 space-y-3 sm:space-y-4">
                    {/* Schedule Reminder */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">Pengingat Jadwal Kelas</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Notifikasi 5 menit sebelum kelas.</p>
                            </div>
                        </div>
                        <Switch checked={isNotificationsEnabled} onChange={(e) => handleToggle(e.target.checked)} disabled={isLoading || !isOnline} className="data-[state=checked]:bg-green-600 flex-shrink-0" />
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
                        {SOUND_OPTIONS
                            .filter(sound => sound.id !== 'system' || isAndroid) // Only show system on Android
                            .map((sound) => {
                                const isSelected = selectedSound === sound.id;
                                const isCustomDisabled = sound.id === 'custom' && !hasCustomSound;
                                const isSystemSound = sound.id === 'system';

                                const handleClick = () => {
                                    if (isCustomDisabled) return;
                                    if (isSystemSound) {
                                        handleSystemRingtoneSelect();
                                    } else {
                                        handleSoundSelect(sound.id);
                                    }
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
                                            {/* Show selected system ringtone name */}
                                            {isSystemSound && systemRingtoneTitle && isSelected ? (
                                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 truncate">
                                                    {systemRingtoneTitle}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sound.description}</p>
                                            )}
                                        </div>

                                        {/* Preview button for built-in sounds */}
                                        {sound.id !== 'none' && sound.id !== 'custom' && sound.id !== 'system' && (
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

                                        {/* System ringtone picker button */}
                                        {isSystemSound && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSystemRingtoneSelect();
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                                title="Pilih dari ringtone sistem"
                                            >
                                                <Smartphone className="w-4 h-4" />
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
