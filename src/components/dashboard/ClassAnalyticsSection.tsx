import React, { useMemo, useState } from 'react';
import { BarChartIcon, TrendingUpIcon, UsersIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardPanel } from './DashboardPanel';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ClassStats {
    classId: string;
    className: string;
    studentCount: number;
    averageGrade: number;
    attendanceRate: number;
}

interface MonthlyAttendance {
    month: string;
    percentage: number;
}

interface ClassAnalyticsSectionProps {
    classes: { id: string; name: string }[];
    students: { id: string; class_id: string | null }[];
    academicRecords: { student_id: string; score: number }[];
    attendanceRecords?: { student_id: string; status: string; date: string }[];
    defaultOpen?: boolean;
}

const extractGradeLevel = (name: string): string => {
    const match = name.match(/(?:Kelas\s+)?(\d+|[IVXLCDM]+)/i);
    return match ? match[1].toUpperCase() : 'Lainnya';
};

export const ClassAnalyticsSection: React.FC<ClassAnalyticsSectionProps> = ({
    classes,
    students,
    academicRecords,
    attendanceRecords,
    defaultOpen = false,
}) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [selectedGrade, setSelectedGrade] = useState<string>('Semua');

    // Fetch attendance as fallback if not provided or empty
    const { data: fetchedAttendance = [] } = useQuery({
        queryKey: ['class-analytics-attendance', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, status, date')
                .eq('user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as { student_id: string; status: string; date: string }[];
        },
        enabled: !!user && (!attendanceRecords || attendanceRecords.length === 0),
        staleTime: 5 * 60 * 1000,
    });

    const effectiveAttendance = attendanceRecords && attendanceRecords.length > 0
        ? attendanceRecords
        : fetchedAttendance;

    // Calculate class statistics
    const classStats = useMemo((): ClassStats[] => {
        return classes.map(cls => {
            const classStudents = students.filter(s => s.class_id === cls.id);
            const classStudentIds = new Set(classStudents.map(s => s.id));

            // Average grade
            const classGrades = academicRecords.filter(r => classStudentIds.has(r.student_id));
            const avgGrade = classGrades.length > 0
                ? Math.round(classGrades.reduce((sum, r) => sum + r.score, 0) / classGrades.length)
                : 0;

            // Attendance rate
            const classAttendance = effectiveAttendance.filter(r => classStudentIds.has(r.student_id));
            const presentCount = classAttendance.filter(r => r.status === 'Hadir').length;
            const attendanceRate = classAttendance.length > 0
                ? Math.round((presentCount / classAttendance.length) * 100)
                : 0;

            return {
                classId: cls.id,
                className: cls.name,
                studentCount: classStudents.length,
                averageGrade: avgGrade,
                attendanceRate: attendanceRate,
            };
        }).filter(c => c.studentCount > 0);
    }, [classes, students, academicRecords, effectiveAttendance]);

    // Available grade levels for filter chips
    const gradeLevels = useMemo(() => {
        const levels = new Set<string>();
        classStats.forEach(c => {
            levels.add(extractGradeLevel(c.className));
        });
        return Array.from(levels).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    }, [classStats]);

    // Filtered classes according to selected grade
    const filteredClassStats = useMemo(() => {
        if (selectedGrade === 'Semua') return classStats;
        return classStats.filter(c => extractGradeLevel(c.className) === selectedGrade);
    }, [classStats, selectedGrade]);

    // Calculate monthly attendance trend
    const monthlyAttendance = useMemo((): MonthlyAttendance[] => {
        const monthMap: Record<string, { present: number; total: number }> = {};

        effectiveAttendance.forEach(record => {
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthMap[monthKey]) {
                monthMap[monthKey] = { present: 0, total: 0 };
            }
            monthMap[monthKey].total++;
            if (record.status === 'Hadir') {
                monthMap[monthKey].present++;
            }
        });

        const months = Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6) // Last 6 months
            .map(([key, data]) => {
                const [, month] = key.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return {
                    month: monthNames[parseInt(month) - 1],
                    percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
                };
            });

        return months;
    }, [effectiveAttendance]);

    if (classStats.length === 0) {
        return null;
    }

    const maxGrade = Math.max(...classStats.map(c => c.averageGrade), 100);

    return (
        <DashboardPanel className="flex flex-col h-full">
            <button type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BarChartIcon className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Analisis Kelas</h3>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4">
                    {/* Grade Level Filter Chips */}
                    {gradeLevels.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
                            <button
                                type="button"
                                onClick={() => setSelectedGrade('Semua')}
                                className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                    selectedGrade === 'Semua'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Semua ({classStats.length})
                            </button>
                            {gradeLevels.map(grade => {
                                const count = classStats.filter(c => extractGradeLevel(c.className) === grade).length;
                                return (
                                    <button
                                        key={grade}
                                        type="button"
                                        onClick={() => setSelectedGrade(grade)}
                                        className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                            selectedGrade === grade
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        Kelas {grade} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Class Comparison Chart Content with constrained height and smooth scrolling */}
                    <div className="space-y-3 max-h-[340px] sm:max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredClassStats.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                Tidak ada data kelas untuk filter ini
                            </div>
                        ) : (
                            filteredClassStats.map((cls) => (
                                <div
                                    key={cls.classId}
                                    className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <UsersIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                            {cls.className}
                                            <span className="text-xs font-normal text-slate-400">({cls.studentCount} siswa)</span>
                                        </span>
                                    </div>

                                    {/* Grade Bar */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-24 shrink-0">
                                            Nilai Rata-rata
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(cls.averageGrade / maxGrade) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px] text-right">
                                            {cls.averageGrade > 0 ? cls.averageGrade : '-'}
                                        </span>
                                    </div>

                                    {/* Attendance Bar */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-24 shrink-0">
                                            Kehadiran
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                                style={{ width: `${cls.attendanceRate}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px] text-right">
                                            {cls.attendanceRate}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
                            <span className="text-xs text-slate-500">Rata-rata Nilai</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500" />
                            <span className="text-xs text-slate-500">Tingkat Kehadiran</span>
                        </div>
                    </div>

                    {/* Monthly Attendance Trend */}
                    {monthlyAttendance.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUpIcon className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Tren Kehadiran Bulanan</h3>
                            </div>

                            {/* Line Chart */}
                            <div className="relative h-40">
                                <svg className="w-full h-full" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="lineGradientMonth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map(val => (
                                        <line
                                            key={val}
                                            x1="0%"
                                            y1={`${100 - val}%`}
                                            x2="100%"
                                            y2={`${100 - val}%`}
                                            stroke="currentColor"
                                            strokeWidth="1"
                                            className="text-slate-100 dark:text-slate-800"
                                        />
                                    ))}

                                    {/* Area fill */}
                                    <path
                                        d={`
                                    M 0 ${100 - monthlyAttendance[0]?.percentage || 100}
                                    ${monthlyAttendance.map((m, i) => `L ${(i / Math.max(monthlyAttendance.length - 1, 1)) * 100} ${100 - m.percentage}`).join(' ')}
                                    L 100 100
                                    L 0 100
                                    Z
                                `}
                                        fill="url(#lineGradientMonth)"
                                        className="transform scale-y-[-1] origin-center"
                                    />

                                    {/* Line */}
                                    <polyline
                                        points={monthlyAttendance.map((m, i) =>
                                            `${(i / Math.max(monthlyAttendance.length - 1, 1)) * 100},${100 - m.percentage}`
                                        ).join(' ')}
                                        fill="none"
                                        stroke="rgb(16, 185, 129)"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* Points */}
                                    {monthlyAttendance.map((m, i) => (
                                        <circle
                                            key={i}
                                            cx={`${(i / Math.max(monthlyAttendance.length - 1, 1)) * 100}%`}
                                            cy={`${100 - m.percentage}%`}
                                            r="4"
                                            fill="white"
                                            stroke="rgb(16, 185, 129)"
                                            strokeWidth="2"
                                        />
                                    ))}
                                </svg>
                            </div>

                            {/* Labels */}
                            <div className="flex justify-between mt-2">
                                {monthlyAttendance.map((m, i) => (
                                    <div key={i} className="text-center">
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{m.month}</p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{m.percentage}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardPanel>
    );
};

export default ClassAnalyticsSection;
