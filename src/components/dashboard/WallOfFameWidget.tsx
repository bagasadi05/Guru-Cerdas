import React, { useMemo } from 'react';
import { TrophyIcon, StarIcon } from '../Icons';
import type { DashboardQueryData } from '../../types';
import { getCategoryMeta } from '../../lib/achievementMeta';

interface WallOfFameWidgetProps {
  data: DashboardQueryData | undefined;
}

export const WallOfFameWidget: React.FC<WallOfFameWidgetProps> = ({ data }) => {
  const { achievements = [], students = [] } = data || {};

  // Group and sort students by achievement count
  const leaderBoard = useMemo(() => {
    if (achievements.length === 0 || students.length === 0) return [];

    const counts = new Map<string, { studentName: string; avatarUrl?: string | null; count: number; points: number }>();
    
    // Initialize counts for all students that have achievements
    achievements.forEach(ach => {
      const student = students.find(s => s.id === ach.student_id);
      if (!student) return;
      
      const existing = counts.get(ach.student_id) || {
        studentName: student.name,
        avatarUrl: student.avatar_url,
        count: 0,
        points: 0
      };

      existing.count += 1;
      existing.points += ach.points || 0;
      counts.set(ach.student_id, existing);
    });

    return Array.from(counts.entries())
      .map(([studentId, stats]) => ({
        studentId,
        ...stats
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.points - a.points;
      })
      .slice(0, 3); // Top 3
  }, [achievements, students]);

  // Recent highlights (latest 3 achievements)
  const recentHighlights = useMemo(() => {
    return [...achievements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [achievements]);

  if (achievements.length === 0) {
    return null; // Don't render widget if there are no achievements yet
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 flex items-center gap-2">
        <TrophyIcon className="w-5 h-5 text-amber-500 animate-bounce" />
        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">Wall of Fame</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Prestasi dan penghargaan siswa terpopuler</p>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        {/* Leaderboard list */}
        {leaderBoard.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prestasi Terbanyak</h4>
            <div className="space-y-2">
              {leaderBoard.map((item, index) => {
                const colors = [
                  'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 border-yellow-200 dark:border-yellow-900',
                  'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700',
                  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-900'
                ];
                return (
                  <div
                    key={item.studentId}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colors[index]}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {item.studentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg">
                        {item.count} Lomba
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center">
                        <StarIcon className="w-3 h-3 fill-current mr-0.5" />
                        {item.points} pt
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent highlights */}
        {recentHighlights.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prestasi Terbaru</h4>
            <div className="space-y-2">
              {recentHighlights.map(ach => {
                const catMeta = getCategoryMeta(ach.category);
                const CatIcon = catMeta.icon;
                const student = students.find(s => s.id === ach.student_id);
                return (
                  <div key={ach.id} className="flex gap-2">
                    <div className={`p-2 rounded-xl h-fit ${catMeta.bgClass} ${catMeta.textClass}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{ach.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {student?.name} • {new Date(ach.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
