/**
 * @fileoverview SchoolStatsGrid — Leadership Dashboard Statistics Widget
 *
 * Displays school-wide metrics (total students, classes, teachers, attendance)
 * for leadership roles. Self-contained component with its own data fetching,
 * following the same visual pattern as the teacher StatsGrid.
 *
 * @module components/dashboard/SchoolStatsGrid
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useGlobalAnalytics } from '../../hooks/useGlobalAnalytics';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { Building2, BarChart3, ShieldCheck, LayoutGrid } from 'lucide-react';
import { MotionDiv } from '../ui/MotionComponents';
import { staggerContainerVariants, statsCardVariants } from '../../utils/animations';

// =============================================================================
// TYPES
// =============================================================================

interface SchoolStats {
  totalStudents: number;
  totalClasses: number;
  totalTeachers: number;
}

interface StatCardData {
  label: string;
  value: number | string;
  icon: React.FC<{ className?: string }>;
  link: string;
  color: string;
  subValue: string;
  statusLabel: string;
  tone: 'indigo' | 'emerald' | 'violet' | 'amber';
}

// =============================================================================
// COMPONENT
// =============================================================================

const SchoolStatsGrid: React.FC = () => {
  const { data: analytics, loading: analyticsLoading } = useGlobalAnalytics();
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolStats = async () => {
      try {
        const [stuRes, clsRes, tchRes] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('classes').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_archived', false),
          supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).in('role', ['guru', 'wali_kelas', 'kepala_madrasah', 'waka_kesiswaan', 'waka_kurikulum', 'admin']),
        ]);
        setStats({
          totalStudents: stuRes.count ?? 0,
          totalClasses: clsRes.count ?? 0,
          totalTeachers: tchRes.count ?? 0,
        });
      } catch {
        setStats({ totalStudents: 0, totalClasses: 0, totalTeachers: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolStats();
  }, []);

  const isLoading = loading || analyticsLoading;
  const attendancePct = analytics && analytics.todayAttendance.total > 0
    ? Math.round((analytics.todayAttendance.present / analytics.todayAttendance.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-3xl bg-white/80 dark:bg-slate-900/60 p-6 animate-pulse border border-slate-200/80 dark:border-slate-700/60">
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 mb-4" />
            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards: StatCardData[] = [
    {
      label: 'Total Siswa',
      value: stats?.totalStudents ?? 0,
      icon: Building2,
      link: '/siswa',
      color: 'from-indigo-500 to-blue-600',
      subValue: `${stats?.totalClasses ?? 0} kelas aktif`,
      statusLabel: (stats?.totalStudents ?? 0) > 0 ? 'Aktif' : 'Kosong',
      tone: 'indigo',
    },
    {
      label: 'Kehadiran Hari Ini',
      value: `${attendancePct}%`,
      icon: BarChart3,
      link: '/absensi',
      color: attendancePct >= 85 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-orange-600',
      subValue: analytics ? `${analytics.todayAttendance.present}/${analytics.todayAttendance.total} hadir` : '0/0 hadir',
      statusLabel: attendancePct >= 85 ? 'Baik' : attendancePct >= 70 ? 'Cukup' : 'Kritis',
      tone: attendancePct >= 85 ? 'emerald' : attendancePct >= 70 ? 'violet' : 'amber',
    },
    {
      label: 'Total Guru',
      value: stats?.totalTeachers ?? 0,
      icon: ShieldCheck,
      link: '/admin',
      color: 'from-violet-500 to-purple-600',
      subValue: 'Tenaga pendidik aktif',
      statusLabel: (stats?.totalTeachers ?? 0) > 0 ? 'Siap' : 'Kosong',
      tone: 'violet',
    },
    {
      label: 'Kelas Aktif',
      value: stats?.totalClasses ?? 0,
      icon: LayoutGrid,
      link: '/analytics',
      color: 'from-amber-500 to-orange-600',
      subValue: 'Tersebar di seluruh madrasah',
      statusLabel: (stats?.totalClasses ?? 0) > 0 ? 'Aktif' : 'Kosong',
      tone: 'amber',
    },
  ];

  return (
    <MotionDiv
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {cards.map((card, index) => (
        <MotionDiv
          key={card.label}
          variants={statsCardVariants}
          whileHover="hover"
          custom={index}
        >
          <Link to={card.link} className="group block h-full">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 h-full flex flex-col justify-between relative overflow-hidden border transition-all duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-hover:-translate-y-1 border-indigo-200/40 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(79,70,229,0.04)] group-hover:border-indigo-500/20">
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Header: Icon + Badge */}
              <div className="relative z-10 mb-4 sm:mb-6 flex items-start justify-between gap-2 sm:gap-3">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br ${card.color} shadow-sm text-white transform group-hover:scale-105 transition-transform duration-300`}>
                  <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`max-w-[108px] truncate rounded-full px-2.5 py-1 text-xxs font-bold uppercase tracking-[0.12em] ${getToneBadgeClass(card.tone)}`}>
                  {card.statusLabel}
                </span>
              </div>

              {/* Value & Label */}
              <div className="relative z-10">
                <span className="block font-extrabold text-slate-900 dark:text-white leading-none text-2xl sm:text-3xl">
                  {typeof card.value === 'number' ? (
                    <AnimatedCounter value={card.value} duration={1500} />
                  ) : (
                    card.value
                  )}
                </span>
                <span className="block font-bold text-slate-500 dark:text-slate-400 mt-2 text-xs sm:text-sm">
                  {card.label}
                </span>
              </div>

              {/* Sub-value */}
              {card.subValue && (
                <div className="relative z-10 mt-3">
                  <p className="font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block text-xs">
                    {card.subValue}
                  </p>
                </div>
              )}

              {/* Attendance progress bar */}
              {card.label === 'Kehadiran Hari Ini' && (
                <div className="relative z-10 mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                     role="progressbar"
                     aria-valuenow={attendancePct}
                     aria-valuemin={0}
                     aria-valuemax={100}
                     aria-label={`Tingkat kehadiran: ${attendancePct}%`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${card.color}`}
                    style={{ width: `${Math.min(Math.max(attendancePct, 0), 100)}%` }}
                  />
                </div>
              )}
            </div>
          </Link>
        </MotionDiv>
      ))}
    </MotionDiv>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

const getToneBadgeClass = (tone: StatCardData['tone']): string => {
  switch (tone) {
    case 'indigo':
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    case 'violet':
      return 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300';
    case 'amber':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    default:
      return 'bg-slate-50 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300';
  }
};

export default SchoolStatsGrid;
