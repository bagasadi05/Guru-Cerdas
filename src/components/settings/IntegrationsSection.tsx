import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { DownloadCloudIcon } from '../Icons';
import * as ics from 'ics';
import { SettingsCard } from './SettingsCard';

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

        const dayToICalDay: Record<string, 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'> = {
            'Senin': 'MO',
            'Selasa': 'TU',
            'Rabu': 'WE',
            'Kamis': 'TH',
            'Jumat': 'FR',
            'Sabtu': 'SA',
            'Minggu': 'SU',
        };
        const dayNameToIndex: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

        const invalidDays = scheduleData.filter(item => !dayToICalDay[item.day] || dayNameToIndex[item.day] === undefined);
        if (invalidDays.length > 0) {
            toast.warning(`Beberapa jadwal punya hari tidak dikenal dan diabaikan (${invalidDays.length}).`);
        }

        const events: ics.EventAttributes[] = scheduleData
            .filter(item => dayToICalDay[item.day] && dayNameToIndex[item.day] !== undefined)
            .map(item => {
                const icalDay = dayToICalDay[item.day];
            const [startHour, startMinute] = item.start_time.split(':').map(Number);
            const [endHour, endMinute] = item.end_time.split(':').map(Number);

            const now = new Date();
            const targetDayIndex = dayNameToIndex[item.day];
            const currentDayIndex = now.getDay();

            let dayDifference = targetDayIndex - currentDayIndex;
            if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)))) {
                dayDifference += 7;
            }

            const eventDate = new Date();
            eventDate.setDate(now.getDate() + dayDifference);

            const year = eventDate.getFullYear();
            const month = eventDate.getMonth() + 1;
            const day = eventDate.getDate();

            const recurrenceRule = `FREQ=WEEKLY;BYDAY=${icalDay}`;

            return {
                uid: `guru-pwa-${item.id}@myapp.com`,
                title: `${item.subject} (Kelas ${item.class_id})`,
                start: [year, month, day, startHour, startMinute],
                end: [year, month, day, endHour, endMinute],
                rrule: recurrenceRule,
                description: `Jadwal mengajar untuk kelas ${item.class_id}`,
                location: 'Sekolah',
                startOutputType: 'local',
                endOutputType: 'local',
            };
            });

        if (events.length === 0) {
            toast.warning("Tidak ada jadwal valid untuk diekspor.");
            return;
        }

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
        <SettingsCard className="overflow-hidden">
            <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Integrasi Eksternal</CardTitle>
                <CardDescription className="text-base">Hubungkan dan sinkronkan data Anda dengan layanan lain.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            <DownloadCloudIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white">Ekspor ke iCalendar (.ics)</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Unduh jadwal Anda untuk Google Calendar, Apple Calendar, atau Outlook.</p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" disabled={!isOnline} className="px-6 border-slate-200 hover:bg-white hover:text-green-600 transition-colors">
                        <DownloadCloudIcon className="w-4 h-4 mr-2" />
                        Ekspor
                    </Button>
                </div>
            </CardContent>
        </SettingsCard>
    );
};

export default IntegrationsSection;
