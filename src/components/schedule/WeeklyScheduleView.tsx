import React from 'react';
import { useMemo } from 'react';
import { Database } from '../../services/database.types';
import { ClockIcon, UsersIcon } from '../Icons';

type ScheduleRow = Database['public']['Tables']['schedules']['Row'];

interface WeeklyScheduleViewProps {
    schedule: ScheduleRow[];
    onEdit: (item: ScheduleRow) => void;
    onIsiJurnal?: (item: ScheduleRow) => void;
}

const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const getColorForSubject = (subject: string): string => {
    if (!subject) return 'border-l-slate-400';
    const colors = [
        'border-l-blue-500',
        'border-l-green-500',
        'border-l-purple-500',
        'border-l-amber-500',
        'border-l-rose-500',
        'border-l-cyan-500',
        'border-l-indigo-500',
        'border-l-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({ schedule, onEdit, onIsiJurnal }) => {
    const scheduleByDay = useMemo(() => {
        const map = new Map<string, ScheduleRow[]>();
        daysOfWeek.forEach(day => map.set(day, []));
        schedule.forEach(item => {
            const list = map.get(item.day);
            if (list) list.push(item);
        });
        map.forEach(items => {
            if (items.length > 1) {
                items.sort((a, b) => a.start_time.localeCompare(b.start_time));
            }
        });
        return map;
    }, [schedule]);

    const hasSchedule = useMemo(() => Array.from(scheduleByDay.values()).some(list => list.length > 0), [scheduleByDay]);

    if (!hasSchedule) {
        return (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center bg-white dark:bg-[#0F172A] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                    <ClockIcon className="w-7 h-7 text-slate-400 dark:text-slate-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Belum Ada Jadwal Mingguan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto">
                    Tambahkan jadwal untuk melihat tampilan mingguan.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in-up">
            {daysOfWeek.map(day => {
                const daySchedule = scheduleByDay.get(day) || [];

                return (
                    <div key={day} className="flex flex-col gap-3">
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-center uppercase text-xs tracking-wider py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            {day}
                        </div>

                        {daySchedule.length === 0 ? (
                            <div className="h-24 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 text-sm">
                                Libur
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {daySchedule.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => onEdit(item)}
                                        className={`
                                            bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 
                                            hover:shadow-md transition-all cursor-pointer group
                                            border-l-4 ${getColorForSubject(item.subject)}
                                        `}
                                    >
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                                            <ClockIcon className="w-3 h-3" />
                                            <span className="text-xxs font-mono font-medium">{item.start_time}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-gray-100 text-sm leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.subject}
                                        </h4>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
                                                <UsersIcon className="w-3 h-3" />
                                                <span className="text-xxs font-medium">{item.class_id}</span>
                                            </div>
                                            {onIsiJurnal && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onIsiJurnal(item);
                                                    }}
                                                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                                >
                                                    Isi Jurnal
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
