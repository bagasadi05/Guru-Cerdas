
import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import SmartInsightsPanel from './SmartInsightsPanel';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { UsersIcon, CalendarIcon, BarChart3Icon, TrendingUpIcon, AlertCircleIcon, Sparkles } from 'lucide-react';
import { AttendanceStats, AtRiskItem, Student } from './types';

interface OverviewTabProps {
    students: Student[];
    classes: any[];
    attendanceStats: AttendanceStats;
    taskStats: any;
    genderStats: any;
    atRiskStudents: AtRiskItem[];
    topPerformingStudents: {student: Student, avg: number}[];
}

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => {
    const colors: any = {
        indigo: 'from-indigo-500 to-purple-600',
        green: 'from-green-500 to-emerald-600',
        amber: 'from-amber-500 to-orange-600',
        blue: 'from-blue-500 to-cyan-600',
    };

    return (
        <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-lg">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full -translate-y-8 translate-x-8`} />
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors[color]}`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                {subtitle && (
                    <p className={`text-xs mt-2 font-medium ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
                        {subtitle}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
    students, classes, attendanceStats, taskStats, genderStats, atRiskStudents, topPerformingStudents 
}) => {
    const { userRole } = useAuth();
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'admin';
    // Generate AI Summary string
    const generateSummary = () => {
        if (students.length === 0) return { text: isLeadership ? "Belum ada data siswa di madrasah." : "Belum ada siswa di kelas Anda. Silakan tambahkan siswa terlebih dahulu.", mood: 'neutral' };
        
        let mood = 'neutral';
        let summaryText = `Saat ini terdapat ${students.length} siswa dalam ${classes.length} kelas aktif. `;

        if (attendanceStats.hadirRate >= 90) {
            mood = 'good';
            summaryText += "Tingkat kehadiran sangat luar biasa! ";
        } else if (attendanceStats.hadirRate < 75) {
            mood = 'warning';
            summaryText += "Tingkat kehadiran perlu diperhatikan. ";
        } else {
            summaryText += "Kehadiran berada dalam batas normal. ";
        }

        if (atRiskStudents.length > 0) {
            summaryText += `Namun, ada ${atRiskStudents.length} siswa yang mungkin butuh perhatian lebih. `;
            mood = mood === 'good' ? 'warning' : mood; // downgrade mood if there are at-risk students
        }

        if (topPerformingStudents.length > 0 && mood !== 'warning') {
            summaryText += "Banyak siswa yang menunjukkan prestasi membanggakan minggu ini! Pertahankan kinerja kelas yang baik ini.";
        }

        return { text: summaryText, mood };
    };

    const summary = generateSummary();

    return (
        <div className="space-y-6 animate-fade-in">
            {isLeadership && <SmartInsightsPanel />}
            {/* AI Summary Banner */}
            <div className={`p-5 rounded-2xl border-l-4 shadow-sm flex gap-4 items-start
                ${summary.mood === 'good' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 
                  summary.mood === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 
                  'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'}`}>
                <div className={`p-2.5 rounded-full ${summary.mood === 'good' ? 'bg-green-100 text-green-600' : summary.mood === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                        Kesimpulan Cerdas
                        <span className="text-xxs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase">AI Generated</span>
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {summary.text}
                    </p>
                </div>
            </div>

            {/* Top 4 Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Siswa" 
                    value={students.length} 
                    subtitle={`${genderStats.male} L, ${genderStats.female} P`}
                    icon={UsersIcon} color="indigo" 
                />
                <StatCard 
                    title="Tingkat Kehadiran" 
                    value={`${attendanceStats.hadirRate}%`} 
                    subtitle={`${attendanceStats.hadir} hadir dari ${attendanceStats.total}`}
                    icon={CalendarIcon} color="green" 
                    trend={attendanceStats.hadirRate >= 90 ? 'up' : 'down'}
                />
                <StatCard 
                    title="Kelas Aktif" 
                    value={classes.length} 
                    subtitle={isLeadership ? "Seluruh madrasah" : "Dikelola oleh Anda"}
                    icon={BarChart3Icon} color="blue" 
                />
                <StatCard 
                    title="Tugas Diselesaikan" 
                    value={`${taskStats.done}/${taskStats.total}`} 
                    subtitle={taskStats.overdue > 0 ? `${taskStats.overdue} terlambat` : 'Semua aman'}
                    icon={TrendingUpIcon} color={taskStats.overdue > 0 ? "amber" : "green"} 
                    trend={taskStats.overdue > 0 ? 'down' : 'up'}
                />
            </div>

            {/* Spotlight Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Needs Attention */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg border-t-4 border-t-rose-500 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <AlertCircleIcon className="w-5 h-5" />
                            Perlu Perhatian Cepat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {atRiskStudents.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {atRiskStudents.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                                                {item.student.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.student.name}</h4>
                                                <p className="text-xs text-slate-500">{item.details}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="text-xs min-h-[44px] sm:min-h-0" onClick={() => window.location.href = `/siswa/${item.student.id}`}>Lihat Detail</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                Semua siswa dalam kondisi baik!
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg border-t-4 border-t-green-500 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <TrendingUpIcon className="w-5 h-5" />
                            Bintang Kelas (Top 3)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {topPerformingStudents.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {topPerformingStudents.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.student.name}</h4>
                                                <p className="text-xs text-slate-500">Rata-rata Nilai: {item.avg.toFixed(1)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                Belum ada data nilai untuk menentukan bintang kelas.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};