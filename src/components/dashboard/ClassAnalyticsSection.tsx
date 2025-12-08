import React, { useMemo } from 'react';
import { BarChartIcon, TrendingUpIcon, UsersIcon } from 'lucide-react';

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
    attendanceRecords: { student_id: string; status: string; date: string }[];
}

export const ClassAnalyticsSection: React.FC<ClassAnalyticsSectionProps> = ({
    classes,
    students,
    academicRecords,
    attendanceRecords,
}) => {
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
            const classAttendance = attendanceRecords.filter(r => classStudentIds.has(r.student_id));
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
    }, [classes, students, academicRecords, attendanceRecords]);

    // Calculate monthly attendance trend
    const monthlyAttendance = useMemo((): MonthlyAttendance[] => {
        const monthMap: Record<string, { present: number; total: number }> = {};

        attendanceRecords.forEach(record => {
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
                const [year, month] = key.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return {
                    month: monthNames[parseInt(month) - 1],
                    percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
                };
            });

        return months;
    }, [attendanceRecords]);

    if (classStats.length === 0) {
        return null;
    }

    const maxGrade = Math.max(...classStats.map(c => c.averageGrade), 100);

    return (
        <div className="space-y-6">
            {/* Class Comparison Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChartIcon className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Perbandingan Kelas</h3>
                </div>

                <div className="space-y-4">
                    {classStats.map((cls, index) => (
                        <div key={cls.classId} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    {cls.className}
                                    <span className="text-xs text-slate-400">({cls.studentCount} siswa)</span>
                                </span>
                            </div>

                            {/* Grade Bar */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 w-16">Rata-rata</span>
                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(cls.averageGrade / maxGrade) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-8 text-right">{cls.averageGrade}</span>
                            </div>

                            {/* Attendance Bar */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 w-16">Kehadiran</span>
                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                                        style={{ width: `${cls.attendanceRate}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-8 text-right">{cls.attendanceRate}%</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <span className="text-xs text-slate-500">Rata-rata Nilai</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-500" />
                        <span className="text-xs text-slate-500">Tingkat Kehadiran</span>
                    </div>
                </div>
            </div>

            {/* Monthly Attendance Trend */}
            {monthlyAttendance.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUpIcon className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">Tren Kehadiran Bulanan</h3>
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
    );
};

export default ClassAnalyticsSection;
