import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { BellIcon, ClockIcon, CheckSquareIcon, CalendarIcon } from '../Icons';
import { getPreferences, savePreferences, NotificationPreferences } from '../../services/NotificationService';
import { Select } from '../ui/Select';

type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ScheduleWithClassName = ScheduleRow & { className?: string };

const NotificationsSection: React.FC = () => {
    const { enableScheduleNotifications, disableScheduleNotifications, user, isNotificationsEnabled } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [taskPrefs, setTaskPrefs] = useState<NotificationPreferences>(getPreferences());

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

    const handleTaskPrefChange = (key: keyof NotificationPreferences, value: any) => {
        const newPrefs = { ...taskPrefs, [key]: value };
        setTaskPrefs(newPrefs);
        savePreferences(newPrefs);
        toast.success("Preferensi notifikasi disimpan.");
    };

    return (
        <div className="space-y-6">
            {/* Schedule Notifications */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Preferensi Notifikasi</CardTitle>
                    <CardDescription className="text-base">Kelola bagaimana Anda menerima pemberitahuan penting.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                    {/* Schedule Reminder */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 dark:text-white">Pengingat Jadwal Kelas</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan notifikasi browser 5 menit sebelum kelas dimulai.</p>
                            </div>
                        </div>
                        <Switch checked={isNotificationsEnabled} onChange={(e) => handleToggle(e.target.checked)} disabled={isLoading || !isOnline} className="data-[state=checked]:bg-indigo-600" />
                    </div>

                    {/* Task Reminders */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                <CheckSquareIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 dark:text-white">Pengingat Tugas</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan notifikasi saat tugas mendekati deadline.</p>
                            </div>
                        </div>
                        <Switch
                            checked={taskPrefs.taskReminders}
                            onChange={(e) => handleTaskPrefChange('taskReminders', e.target.checked)}
                            className="data-[state=checked]:bg-amber-600"
                        />
                    </div>

                    {/* Task Reminder Timing */}
                    {taskPrefs.taskReminders && (
                        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 ml-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Ingatkan Sebelum Deadline</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Berapa jam sebelum deadline untuk diingatkan.</p>
                                </div>
                            </div>
                            <Select
                                value={taskPrefs.taskReminderHours.toString()}
                                onChange={(e) => handleTaskPrefChange('taskReminderHours', parseInt(e.target.value))}
                                className="w-32"
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
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                <BellIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 dark:text-white">Pengingat Absensi</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Ingatkan untuk mengisi absensi harian.</p>
                            </div>
                        </div>
                        <Switch
                            checked={taskPrefs.attendanceReminders}
                            onChange={(e) => handleTaskPrefChange('attendanceReminders', e.target.checked)}
                            className="data-[state=checked]:bg-green-600"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default NotificationsSection;
