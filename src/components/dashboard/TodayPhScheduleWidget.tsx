import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    CalendarCheck,
    Calendar,
    ChevronRight,
    Plus,
    Clock,
    BookOpen,
    GraduationCap,
    CheckCircle2,
    CalendarDays,
    ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSemester } from '../../contexts/SemesterContext';
import { formatLocalDate } from '../../hooks/dashboard/dashboardHelpers';
import { PhScheduleEngine } from '../schedule/engine/PhScheduleEngine';
import { normalizeSubjectDisplay } from '../schedule/engine/usePhScheduleDomain';
import { parseSubjectString } from '../schedule/PhScheduleFormModal';
import { Button } from '../ui/Button';
import type { PhScheduleRow } from '../../types';

export interface TodayPhScheduleClassItem {
    id: string;
    name: string;
}

export interface TodayPhScheduleWidgetProps {
    classes?: TodayPhScheduleClassItem[];
}

export const TodayPhScheduleWidget: React.FC<TodayPhScheduleWidgetProps> = ({ classes = [] }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeSemester } = useSemester();

    const todayStr = useMemo(() => formatLocalDate(new Date()), []);
    const sevenDaysLaterStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return formatLocalDate(d);
    }, []);

    // Create a fast class lookup map
    const classNameMap = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach((c) => map.set(c.id, c.name));
        return map;
    }, [classes]);

    const getClassName = useCallback(
        (classId: string) => classNameMap.get(classId) || 'Kelas',
        [classNameMap]
    );

    // Query PH schedules across all classes for the active semester
    const { data: rawSchedules = [], isLoading } = useQuery<PhScheduleRow[]>({
        queryKey: ['dashboard-ph-schedules', user?.id, activeSemester?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            let query = supabase
                .from('ph_schedules')
                .select('*')
                .is('deleted_at', null)
                .gte('date', todayStr)
                .lte('date', sevenDaysLaterStr)
                .order('date', { ascending: true })
                .order('period_label', { ascending: true });

            if (activeSemester?.id) {
                query = query.eq('semester_id', activeSemester.id);
            }

            const { data, error } = await query;
            if (error) {
                console.warn('[TodayPhScheduleWidget] Query error:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!user?.id,
        staleTime: 2 * 60 * 1000,
    });

    // Partition schedules into Today and Upcoming (within 7 days)
    const { todaySchedules, upcomingSchedules } = useMemo(() => {
        const todayItems: PhScheduleRow[] = [];
        const upcomingItems: PhScheduleRow[] = [];

        rawSchedules.forEach((s) => {
            if (s.date === todayStr) {
                todayItems.push(s);
            } else if (s.date > todayStr && s.date <= sevenDaysLaterStr) {
                upcomingItems.push(s);
            }
        });

        return { todaySchedules: todayItems, upcomingSchedules: upcomingItems };
    }, [rawSchedules, todayStr, sevenDaysLaterStr]);

    const totalAgendaCount = todaySchedules.length + upcomingSchedules.length;

    // Loading Skeleton
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                            <div className="w-48 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="w-32 h-3 rounded bg-slate-100 dark:bg-slate-850" />
                        </div>
                    </div>
                    <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
                    <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/8 via-brand-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Widget Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#00d284] flex items-center justify-center border border-emerald-500/30 shrink-0 shadow-sm">
                        <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                                Agenda Penilaian Harian (PH)
                            </h3>
                            {totalAgendaCount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                    {totalAgendaCount} Agenda
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Jadwal pelaksanaan asesmen harian hari ini & 7 hari mendatang
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/jadwal?tab=ph')}
                        className="rounded-xl text-xs font-semibold h-9 sm:h-9 px-3.5 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 group"
                    >
                        <span>Lihat Jadwal Lengkap</span>
                        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5 text-slate-400 group-hover:text-emerald-500" />
                    </Button>
                </div>
            </div>

            {/* Widget Body */}
            <div className="pt-4 relative z-10">
                {totalAgendaCount === 0 ? (
                    /* Empty State: Calm & Informative */
                    <div className="py-7 px-4 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
                            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                        </div>
                        <div className="max-w-md space-y-1">
                            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                                Tidak Ada Jadwal PH Terdekat
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Tidak ada agenda Penilaian Harian dalam 7 hari ke depan. Semua jadwal asesmen siswa berjalan terkendali.
                            </p>
                        </div>
                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                            <Button
                                size="sm"
                                onClick={() => navigate('/jadwal?tab=ph&action=add')}
                                className="rounded-xl text-xs font-bold h-9 min-h-[38px] px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
                                <span>+ Buat Jadwal PH Baru</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/jadwal?tab=ph')}
                                className="rounded-xl text-xs font-semibold h-9 min-h-[38px] px-3.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                                <span>Buka Kalender PH</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Populated State: Today + Upcoming */
                    <div className="space-y-4">
                        {/* Section A: HARI INI (Priority Focus) */}
                        {todaySchedules.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                    </span>
                                    <span className="text-xs font-black tracking-wider uppercase text-emerald-600 dark:text-[#00d284]">
                                        Hari Ini ({todaySchedules.length} Ujian)
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {todaySchedules.map((schedule) => {
                                        const { baseSubject, topic } = parseSubjectString(schedule.subject);
                                        const displaySubject = normalizeSubjectDisplay(baseSubject);
                                        const className = getClassName(schedule.class_id);

                                        return (
                                            <div
                                                key={schedule.id}
                                                onClick={() => navigate('/jadwal?tab=ph')}
                                                className="group relative p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-850 border-2 border-emerald-500/40 dark:border-emerald-500/30 hover:border-emerald-500 transition-all duration-200 shadow-sm flex flex-col justify-between cursor-pointer"
                                            >
                                                <div className="space-y-2.5">
                                                    {/* Header badges */}
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-xs">
                                                                Hari Ini
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                                                                <GraduationCap className="w-3.5 h-3.5" />
                                                                <span>{className}</span>
                                                            </span>
                                                        </div>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                            <span>Jam {schedule.period_label}</span>
                                                        </span>
                                                    </div>

                                                    {/* Subject & Topic */}
                                                    <div>
                                                        <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                            {displaySubject}
                                                        </h4>
                                                        {topic && (
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5 line-clamp-1">
                                                                <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                <span>Materi: {topic}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bottom Action Footer */}
                                                <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {PhScheduleEngine.formatDateHeading(schedule.date)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/jadwal?tab=ph')}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 group-hover:underline min-h-[36px]"
                                                    >
                                                        <span>Kelola Nilai & Detail</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Section B: MENDATANG (Upcoming in 7 Days) */}
                        {upcomingSchedules.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Mendatang ({upcomingSchedules.length} Ujian Pekan Ini)</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {upcomingSchedules.map((schedule) => {
                                        const { baseSubject, topic } = parseSubjectString(schedule.subject);
                                        const displaySubject = normalizeSubjectDisplay(baseSubject);
                                        const className = getClassName(schedule.class_id);
                                        const relativeLabel = PhScheduleEngine.getRelativeDateLabel(
                                            schedule.date,
                                            new Date()
                                        );

                                        return (
                                            <div
                                                key={schedule.id}
                                                onClick={() => navigate('/jadwal?tab=ph')}
                                                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-750 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
                                            >
                                                <div className="space-y-1.5">
                                                    {/* Top row: countdown badge & class */}
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                                                relativeLabel === 'Besok'
                                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                                                    : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                                                            }`}
                                                        >
                                                            {relativeLabel}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                            {className}
                                                        </span>
                                                    </div>

                                                    {/* Subject */}
                                                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                                                        {displaySubject}
                                                    </h5>

                                                    {/* Topic or Period */}
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        {topic ? topic : `Jam ${schedule.period_label}`}
                                                    </p>
                                                </div>

                                                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-750 flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>{PhScheduleEngine.formatDateHeading(schedule.date)}</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                                                        Jam {schedule.period_label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodayPhScheduleWidget;
