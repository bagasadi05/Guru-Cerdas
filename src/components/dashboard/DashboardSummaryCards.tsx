import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  UserX,
  ChevronRight,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import type { DashboardQueryData } from '../../types';

interface DashboardSummaryCardsProps {
  data: DashboardQueryData | undefined;
}

interface PriorityStudent {
  studentId: string;
  name: string;
  className: string;
  reason: string;
  type: 'attendance' | 'grade' | 'discipline';
  severity: 'high' | 'medium';
}

interface ClassAttentionItem {
  className: string;
  label: string;
  type: string;
  link: string;
  color: string;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ data }) => {
  const navigate = useNavigate();
  const { students = [], classes = [], violations = [], academicRecords = [] } = data || {};

  // Calculate real priority students based on actual data
  const priorityStudents = useMemo((): PriorityStudent[] => {
    if (!students || students.length === 0) return [];

    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const results: PriorityStudent[] = [];

    // Build student metrics
    const studentMetrics = students.map(student => {
      // Attendance: count alpha/izin/sakit
      const studentViolations = violations.filter(v => v.student_id === student.id);
      const totalViolationPoints = studentViolations.reduce((sum, v) => sum + (v.points || 0), 0);

      // Academic: calculate average
      const studentRecords = academicRecords.filter(r => r.student_id === student.id);
      const avgScore = studentRecords.length > 0
        ? Math.round(studentRecords.reduce((sum, r) => sum + r.score, 0) / studentRecords.length)
        : null;

      // Grade trend: compare recent vs older records
      let gradeDrop = 0;
      if (studentRecords.length >= 2) {
        const sorted = [...studentRecords].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const recent = sorted.slice(0, Math.ceil(sorted.length / 2));
        const older = sorted.slice(Math.ceil(sorted.length / 2));
        const recentAvg = recent.reduce((s, r) => s + r.score, 0) / recent.length;
        const olderAvg = older.reduce((s, r) => s + r.score, 0) / older.length;
        gradeDrop = Math.round(olderAvg - recentAvg);
      }

      return {
        student,
        className: classMap.get(student.class_id || '') || 'N/A',
        totalViolationPoints,
        avgScore,
        gradeDrop,
        recordCount: studentRecords.length,
      };
    });

    // 1. Students with high violation points (discipline risk)
    const highViolation = studentMetrics
      .filter(m => m.totalViolationPoints >= 10)
      .sort((a, b) => b.totalViolationPoints - a.totalViolationPoints);

    if (highViolation.length > 0) {
      const m = highViolation[0];
      results.push({
        studentId: m.student.id,
        name: m.student.name,
        className: m.className,
        reason: `${m.totalViolationPoints} poin pelanggaran tercatat`,
        type: 'discipline',
        severity: m.totalViolationPoints >= 25 ? 'high' : 'medium',
      });
    }

    // 2. Students with low average grades (academic risk)
    const lowGrades = studentMetrics
      .filter(m => m.avgScore !== null && m.avgScore < 70 && m.recordCount >= 2)
      .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

    if (lowGrades.length > 0) {
      const m = lowGrades[0];
      // Avoid duplicate student
      if (!results.find(r => r.studentId === m.student.id)) {
        results.push({
          studentId: m.student.id,
          name: m.student.name,
          className: m.className,
          reason: `Rata-rata nilai ${m.avgScore} — perlu remedial`,
          type: 'grade',
          severity: (m.avgScore ?? 0) < 60 ? 'high' : 'medium',
        });
      }
    }

    // 3. Students with significant grade drops
    const gradeDrops = studentMetrics
      .filter(m => m.gradeDrop >= 10)
      .sort((a, b) => b.gradeDrop - a.gradeDrop);

    if (gradeDrops.length > 0) {
      const m = gradeDrops[0];
      if (!results.find(r => r.studentId === m.student.id)) {
        results.push({
          studentId: m.student.id,
          name: m.student.name,
          className: m.className,
          reason: `Nilai turun ${m.gradeDrop} poin dari penilaian sebelumnya`,
          type: 'grade',
          severity: m.gradeDrop >= 15 ? 'high' : 'medium',
        });
      }
    }

    // Fill remaining slots with students who have any risk factor
    if (results.length < 3) {
      const remaining = studentMetrics
        .filter(m =>
          !results.find(r => r.studentId === m.student.id) &&
          (m.avgScore !== null && m.avgScore < 75 || m.totalViolationPoints > 0)
        )
        .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

      for (const m of remaining) {
        if (results.length >= 3) break;
        results.push({
          studentId: m.student.id,
          name: m.student.name,
          className: m.className,
          reason: m.avgScore !== null && m.avgScore < 75
            ? `Rata-rata ${m.avgScore}, perlu pemantauan`
            : `Memiliki ${m.totalViolationPoints} poin pelanggaran`,
          type: m.avgScore !== null && m.avgScore < 75 ? 'grade' : 'discipline',
          severity: 'medium',
        });
      }
    }

    return results;
  }, [students, classes, violations, academicRecords]);

  // Calculate real classes needing attention
  const classesNeedAttention = useMemo((): ClassAttentionItem[] => {
    const items: ClassAttentionItem[] = [];
    if (!classes || classes.length === 0) return items;

    // Check each class for issues
    classes.forEach(cls => {
      const classStudents = students.filter(s => s.class_id === cls.id);
      if (classStudents.length === 0) return;

      const classStudentIds = new Set(classStudents.map(s => s.id));

      // Check grade completeness
      const classRecords = academicRecords.filter(r => classStudentIds.has(r.student_id));
      const gradedStudentIds = new Set(classRecords.map(r => r.student_id));
      const missingGrades = classStudents.filter(s => !gradedStudentIds.has(s.id)).length;

      if (missingGrades > 0 && items.length < 3) {
        items.push({
          className: cls.name,
          label: `${missingGrades} siswa belum memiliki nilai`,
          type: 'grade',
          link: '/input-massal',
          color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30',
        });
      }

      // Check average grade
      if (classRecords.length >= 3) {
        const classAvg = Math.round(classRecords.reduce((s, r) => s + r.score, 0) / classRecords.length);
        if (classAvg < 70 && items.length < 3) {
          items.push({
            className: cls.name,
            label: `Rata-rata nilai ${classAvg} — di bawah KKTP`,
            type: 'grade',
            link: '/analytics',
            color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30',
          });
        }
      }

      // Check violations
      const classViolations = violations.filter(v => classStudentIds.has(v.student_id));
      if (classViolations.length >= 5 && items.length < 3) {
        items.push({
          className: cls.name,
          label: `${classViolations.length} pelanggaran tercatat`,
          type: 'discipline',
          link: '/analytics',
          color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30',
        });
      }
    });

    return items.slice(0, 3);
  }, [classes, students, academicRecords, violations]);

  const hasData = priorityStudents.length > 0 || classesNeedAttention.length > 0;

  if (!hasData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full items-stretch">
      {/* CARD 1: Kelas Perlu Perhatian */}
      {classesNeedAttention.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Kelas Perlu Perhatian
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 group-hover:scale-110 transition-transform">
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
      )}

      {/* CARD 2: Siswa Prioritas (real data) */}
      {priorityStudents.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Siswa Prioritas
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <UserX className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {priorityStudents.map((student) => {
                let iconElement = <AlertCircle className="w-3 h-3" />;
                let themeColor = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
                if (student.type === 'attendance') {
                  iconElement = <UserX className="w-3 h-3" />;
                  themeColor = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
                } else if (student.type === 'grade') {
                  iconElement = <TrendingDown className="w-3 h-3" />;
                  themeColor = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
                } else if (student.type === 'discipline') {
                  iconElement = <AlertTriangle className="w-3 h-3" />;
                  themeColor = 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
                }

                return (
                  <div
                    key={student.studentId}
                    onClick={() => navigate(`/siswa/${student.studentId}`)}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0">
                        {student.name}
                      </span>
                      <span className="text-xxs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/5 whitespace-nowrap flex-shrink-0">
                        {student.className}
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
            onClick={() => navigate('/analytics')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 w-full hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Lihat Analisis Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
