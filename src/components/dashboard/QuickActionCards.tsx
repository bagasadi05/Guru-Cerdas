/**
 * Quick Action Cards Component
 *
 * Provides quick access shortcuts to common teacher tasks
 * Redesigned with premium glassmorphism, dynamic gradients and hover effects.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheckIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckSquareIcon,
} from '../Icons';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  glowColor: string;
  iconBg: string;
  iconColor: string;
  count?: number;
  urgent?: boolean;
}

interface QuickActionCardsProps {
  pendingGrades?: number;
  incompleteTasks?: number;
}

export const QuickActionCards: React.FC<QuickActionCardsProps> = ({
  pendingGrades = 0,
  incompleteTasks = 0,
}) => {
  

  const quickActions: QuickAction[] = [
    {
      id: 'attendance',
      title: 'Isi Absensi',
      description: 'Catat kehadiran siswa hari ini',
      icon: <ClipboardCheckIcon />,
      link: '/absensi',
      glowColor: 'from-emerald-400/20 to-teal-400/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      urgent: false,
    },
    {
      id: 'input-nilai',
      title: 'Input Nilai',
      description: 'Masukkan nilai siswa dengan cepat',
      icon: <TrendingUpIcon />,
      link: '/input-massal',
      glowColor: 'from-blue-400/20 to-blue-600/20',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      count: pendingGrades,
      urgent: pendingGrades > 10,
    },
    {
      id: 'tasks',
      title: 'Tugas & To-Do',
      description: 'Pantau tugas siswa dan reminder',
      icon: <CheckSquareIcon />,
      link: '/tugas',
      glowColor: 'from-orange-400/20 to-amber-400/20',
      iconBg: 'bg-orange-100 dark:bg-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      count: incompleteTasks,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-500/20">
          <ClockIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Aksi Cepat
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            to={action.link}
            className="group relative flex flex-col items-start h-full p-6 lg:p-8 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative z-10 flex flex-col w-full">
              <div className="flex items-center justify-between mb-4 w-full">
                {/* Icon Container */}
                <div className={`p-4 rounded-2xl ${action.iconBg} ${action.iconColor} shadow-xs transition-transform duration-300 group-hover:scale-105`}>
                  {React.cloneElement(action.icon as React.ReactElement, { className: 'w-6 h-6' })}
                </div>

                {/* Badges */}
                {action.count !== undefined && action.count > 0 && (
                  <div className="relative">
                    {action.urgent && (
                      <span className="absolute -inset-1 rounded-full bg-red-400 dark:bg-red-500 opacity-50 animate-ping"></span>
                    )}
                    <div
                      className={`relative flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full text-xs font-bold text-white shadow-sm ${
                        action.urgent 
                          ? 'bg-rose-600' 
                          : 'bg-brand-600'
                      }`}
                    >
                      {action.count}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-300 ${
                'text-lg'
              }`}>
                {action.title}
              </h3>
              
              <p className={`font-medium text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-300 ${
                'text-sm'
              }`}>
                {action.description}
              </p>
            </div>
            
            {/* Decorative arrow showing hover state */}
            <div className="absolute bottom-5 right-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
              <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

