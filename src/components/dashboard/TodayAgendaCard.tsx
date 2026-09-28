/**
 * @fileoverview Today Agenda Card Component
 *
 * Combines today's teaching schedule (Jadwal Mengajar) and today's/upcoming
 * daily assessment schedule (Jadwal PH) into a unified, interactive tabbed card.
 *
 * @module components/dashboard/TodayAgendaCard
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronRight,
  Plus,
  Clock,
  GraduationCap,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSemester } from '../../contexts/SemesterContext';
import { formatLocalDate } from '../../hooks/dashboard/dashboardHelpers';
import { normalizeSubjectDisplay } from '../schedule/engine/usePhScheduleDomain';
import { parseSubjectString } from '../schedule/PhScheduleFormModal';
import { Button } from '../ui/Button';
import ScheduleTimeline from './ScheduleTimeline';
import type { PhScheduleRow } from '../../types';

export interface TodayAgendaScheduleItem {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  class_id?: string | null;
  className: string | null;
}

export interface TodayAgendaClassItem {
  id: string;
  name: string;
}

export interface TodayAgendaCardProps {
  schedule: TodayAgendaScheduleItem[];
  currentTime: Date;
  classes?: TodayAgendaClassItem[];
}

export const TodayAgendaCard: React.FC<TodayAgendaCardProps> = ({
  schedule,
  currentTime,
  classes = [],
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSemester } = useSemester();
  const [activeTab, setActiveTab] = useState<'mengajar' | 'ph'>('mengajar');

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const sevenDaysLaterStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatLocalDate(d);
  }, []);

  // Fast class name lookup
  const classNameMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  const getClassName = useCallback(
    (classId: string) => classNameMap.get(classId) || 'Kelas',
    [classNameMap]
  );

  // Query PH schedules
  const { data: rawPhSchedules = [], isLoading: isPhLoading } = useQuery<PhScheduleRow[]>({
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
        console.warn('[TodayAgendaCard] Query error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Partition PH schedules
  const { todayPhSchedules, upcomingPhSchedules } = useMemo(() => {
    const todayItems: PhScheduleRow[] = [];
    const upcomingItems: PhScheduleRow[] = [];

    rawPhSchedules.forEach((s) => {
      if (s.date === todayStr) {
        todayItems.push(s);
      } else if (s.date > todayStr && s.date <= sevenDaysLaterStr) {
        upcomingItems.push(s);
      }
    });

    return { todayPhSchedules: todayItems, upcomingPhSchedules: upcomingItems };
  }, [rawPhSchedules, todayStr, sevenDaysLaterStr]);

  const phCount = todayPhSchedules.length + upcomingPhSchedules.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden transition-all duration-200">
      {/* Card Header with Tab Switcher */}
      <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20 shrink-0 shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                Agenda Hari Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Jadwal mengajar dan agenda penilaian
              </p>
            </div>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('mengajar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'mengajar'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Jadwal Mengajar</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'mengajar'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300'
                    : 'bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {schedule.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'ph'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Jadwal PH</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  todayPhSchedules.length > 0
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : activeTab === 'ph'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {phCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[460px] custom-scrollbar p-4">
        {activeTab === 'mengajar' ? (
          <div>
            {schedule.length > 0 ? (
              <ScheduleTimeline schedule={schedule} currentTime={currentTime} />
            ) : (
              <div className="py-12 px-4 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/80 dark:border-brand-800/60 shadow-xs">
                  <BookOpen className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Tidak Ada Jadwal Mengajar Hari Ini
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Nikmati waktu luang Anda atau gunakan untuk persiapan materi modul ajar dan penilaian.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isPhLoading ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : phCount === 0 ? (
              <div className="py-10 px-4 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                  <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Tidak Ada Jadwal PH Terdekat
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tidak ada agenda Penilaian Harian dalam 7 hari ke depan. Semua rencana asesmen terkendali.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/jadwal?tab=ph&action=add')}
                  className="rounded-xl text-xs font-bold h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer active:scale-95 duration-150"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  + Buat Jadwal PH
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Today's PH */}
                {todayPhSchedules.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Hari Ini ({todayPhSchedules.length} Ujian)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {todayPhSchedules.map((scheduleItem) => {
                        const { baseSubject, topic } = parseSubjectString(scheduleItem.subject);
                        const displaySubject = normalizeSubjectDisplay(baseSubject);
                        const clsName = getClassName(scheduleItem.class_id);

                        return (
                          <div
                            key={scheduleItem.id}
                            onClick={() => navigate('/jadwal?tab=ph')}
                            className="group p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-500 transition-all duration-150 cursor-pointer shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                                    Hari Ini
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40">
                                    <GraduationCap className="w-3 h-3" />
                                    <span>{clsName}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Jam {scheduleItem.period_label}</span>
                                  </span>
                                </div>
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {displaySubject}
                                </h5>
                                {topic && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                                    Topik: {topic}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upcoming PH */}
                {upcomingPhSchedules.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Mendatang (7 Hari ke Depan)
                    </span>

                    <div className="space-y-2">
                      {upcomingPhSchedules.map((scheduleItem) => {
                        const { baseSubject, topic } = parseSubjectString(scheduleItem.subject);
                        const displaySubject = normalizeSubjectDisplay(baseSubject);
                        const clsName = getClassName(scheduleItem.class_id);

                        return (
                          <div
                            key={scheduleItem.id}
                            onClick={() => navigate('/jadwal?tab=ph')}
                            className="group p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-400 transition-all duration-150 cursor-pointer shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                    {scheduleItem.date}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <GraduationCap className="w-3 h-3 text-slate-400" />
                                    <span>{clsName}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Jam {scheduleItem.period_label}
                                  </span>
                                </div>
                                <h5 className="font-bold text-sm text-slate-800 dark:text-white mt-1.5 group-hover:text-brand-600 transition-colors">
                                  {displaySubject}
                                </h5>
                                {topic && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                    Topik: {topic}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
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
        )}
      </div>

      {/* Card Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(activeTab === 'mengajar' ? '/jadwal?tab=mengajar' : '/jadwal?tab=ph')
          }
          className="text-xs font-semibold rounded-xl h-8 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-brand-600 cursor-pointer active:scale-95 duration-150"
        >
          <span>{activeTab === 'mengajar' ? 'Buka Jadwal Mengajar' : 'Buka Kalender PH'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
        </Button>

        {activeTab === 'ph' && (
          <Button
            size="sm"
            onClick={() => navigate('/jadwal?tab=ph&action=add')}
            className="text-xs font-bold rounded-xl h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 duration-150"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Tambah PH
          </Button>
        )}
      </div>
    </div>
  );
};

export default TodayAgendaCard;
