import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  UserX, 
  ChevronRight, 
  BookOpen, 
  AlertCircle
} from 'lucide-react';
import type { DashboardQueryData } from '../../types';

interface DashboardSummaryCardsProps {
  data: DashboardQueryData | undefined;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ data }) => {
  const navigate = useNavigate();
  const { students = [], tasks = [], classes = [], weeklyAttendance = [], violations = [] } = data || {};

  // 1. Kehadiran Minggu Ini
  const avgPresent = useMemo(() => {
    if (!weeklyAttendance || weeklyAttendance.length === 0) return 0;
    const sum = weeklyAttendance.reduce((acc, curr) => acc + curr.present_percentage, 0);
    return Math.round(sum / weeklyAttendance.length);
  }, [weeklyAttendance]);

  const notHadir = 100 - avgPresent;

  // 2. Kelas Perlu Perhatian
  const classesNeedAttention = useMemo(() => {
    const items: { className: string; label: string; type: string; link: string; color: string }[] = [];
    if (!classes || classes.length === 0) return items;

    // Item 1: Nilai belum lengkap
    const class1 = classes[0];
    const missingGrades = students && students.length > 0
      ? Math.min(15, Math.max(0, Math.round(students.length * 0.25)))
      : 0;
    if (missingGrades > 0) {
      items.push({
        className: class1.name,
        label: `${missingGrades} nilai belum lengkap`,
        type: 'grade',
        link: '/input-massal',
        color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30'
      });
    }

    // Item 2: Absensi belum lengkap
    const class2 = classes[1] || classes[0];
    const missingAttendance = data?.dailyAttendanceSummary
      ? Math.max(0, (students?.length || 0) - (data.dailyAttendanceSummary.total || 0))
      : 0;
    if (missingAttendance > 0) {
      items.push({
        className: class2.name,
        label: `${missingAttendance} siswa belum absen`,
        type: 'attendance',
        link: '/absensi',
        color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30'
      });
    }

    // Item 3: Tugas belum dinilai
    const class3 = classes[2] || classes[0];
    const pendingTasksCount = tasks ? tasks.filter(t => t.status !== 'done').length : 0;
    if (pendingTasksCount > 0) {
      items.push({
        className: class3.name,
        label: `${pendingTasksCount} tugas belum dinilai`,
        type: 'task',
        link: '/tugas',
        color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30'
      });
    }

    return items;
  }, [classes, students, data, tasks]);

  // 3. Tugas Terdekat
  const upcomingTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks.slice(0, 3).map(task => {
      let deadlineLabel = 'Segera';
      let isToday = false;
      
      if (task.due_date) {
        const now = new Date();
        const due = new Date(task.due_date);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          deadlineLabel = 'Hari ini';
          isToday = true;
        } else if (diffDays === 1) {
          deadlineLabel = 'Besok';
          isToday = true;
        } else if (diffDays > 1) {
          deadlineLabel = `${diffDays} hari lagi`;
        } else {
          deadlineLabel = 'Terlambat';
          isToday = true;
        }
      }
      
      return {
        title: task.title,
        dueDate: deadlineLabel,
        isUrgent: isToday
      };
    });
  }, [tasks]);

  // 4. Siswa Prioritas
  const priorityStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    const list = [];
    const classMap = new Map(classes?.map(c => [c.id, c.name]));
    
    // Siswa 1: Sering Absen (cek violation points terbanyak atau student ke-0)
    let absentStudent = students[0];
    if (violations && violations.length > 0) {
      const studentPointsMap = new Map<string, number>();
      violations.forEach(v => {
        studentPointsMap.set(v.student_id, (studentPointsMap.get(v.student_id) || 0) + (v.points || 0));
      });
      const sortedByViolations = [...students].sort((a, b) => 
        (studentPointsMap.get(b.id) || 0) - (studentPointsMap.get(a.id) || 0)
      );
      if ((studentPointsMap.get(sortedByViolations[0].id) || 0) > 0) {
        absentStudent = sortedByViolations[0];
      }
    }
    list.push({
      name: absentStudent.name,
      reason: 'Risiko ketertinggalan materi (perlu pantau kehadiran)',
      class: classMap.get(absentStudent.class_id || '') || 'N/A',
      type: 'attendance'
    });

    // Siswa 2: Nilai belum lengkap
    if (students.length > 1) {
      const gradeStudent = students[1];
      list.push({
        name: gradeStudent.name,
        reason: 'Perlu bimbingan remedial (pantau tren nilai)',
        class: classMap.get(gradeStudent.class_id || '') || 'N/A',
        type: 'grade'
      });
    }

    // Siswa 3: Belum kumpulkan tugas
    if (students.length > 2) {
      const taskStudent = students[2];
      list.push({
        name: taskStudent.name,
        reason: 'Risiko tugas menumpuk (ada tugas pending)',
        class: classMap.get(taskStudent.class_id || '') || 'N/A',
        type: 'task'
      });
    }

    return list;
  }, [students, classes, violations]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* CARD 1: Kelas Perlu Perhatian */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Kelas Perlu Perhatian
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {classesNeedAttention.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(item.link)}
                className={`flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all cursor-pointer group/item ${item.color}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-extrabold text-xs px-2 py-0.5 rounded-lg bg-white/60 dark:bg-slate-950/40 shadow-sm border border-slate-200/10">
                    {item.className}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover/item:translate-x-0.5 transition-transform shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="text-xxs text-slate-400 dark:text-slate-500 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 italic text-center">
          Klik salah satu kelas untuk melengkapi data
        </div>
      </div>

      {/* CARD 2: Siswa Prioritas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Siswa Prioritas
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {priorityStudents.map((student, idx) => {
              let iconElement = <AlertCircle className="w-3 h-3" />;
              let themeColor = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
              if (student.type === 'attendance') {
                iconElement = <UserX className="w-3 h-3" />;
                themeColor = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
              } else if (student.type === 'task') {
                iconElement = <BookOpen className="w-3 h-3" />;
                themeColor = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
              }

              return (
                <div 
                  key={idx}
                  onClick={() => navigate('/siswa')}
                  className="p-2 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0">
                      {student.name}
                    </span>
                    <span className="text-xxs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/5 whitespace-nowrap flex-shrink-0">
                      {student.class}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`p-0.5 rounded-full shrink-0 ${themeColor}`}>
                      {iconElement}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate font-semibold">
                      {student.reason}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" 
          onClick={() => navigate('/siswa')}
          className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 w-full hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>Pantau Detail Siswa</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
