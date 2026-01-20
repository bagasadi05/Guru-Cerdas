import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserCog,
    BookOpen,
    GraduationCap,
    Calendar,
    BarChart3,
    Clock,
    Megaphone,
    Settings,
    Database,
    Activity,
} from 'lucide-react';
import { SystemStats, TabType, StatCard } from './index';

interface OverviewTabProps {
    stats: SystemStats;
    statsLoading: boolean;
    onTabChange: (tab: TabType) => void;
}

/**
 * Overview Tab Component for Admin Dashboard
 * Displays system statistics, role distribution, and quick actions
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({
    stats,
    statsLoading,
    onTabChange,
}) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={<Users size={20} />}
                    label="Total Pengguna"
                    value={stats.totalUsers}
                    color="indigo"
                    loading={statsLoading}
                />
                <StatCard
                    icon={<BookOpen size={20} />}
                    label="Kelas"
                    value={stats.totalClasses}
                    color="blue"
                    loading={statsLoading}
                />
                <StatCard
                    icon={<GraduationCap size={20} />}
                    label="Siswa"
                    value={stats.totalStudents}
                    color="green"
                    loading={statsLoading}
                />
                <StatCard
                    icon={<Calendar size={20} />}
                    label="Absensi"
                    value={stats.totalAttendance}
                    color="orange"
                    loading={statsLoading}
                />
                <StatCard
                    icon={<BarChart3 size={20} />}
                    label="Nilai"
                    value={stats.totalGrades}
                    color="purple"
                    loading={statsLoading}
                />
                <StatCard
                    icon={<Clock size={20} />}
                    label="Tugas"
                    value={stats.totalTasks}
                    color="pink"
                    loading={statsLoading}
                />
            </div>

            {/* Role Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-indigo-500" />
                    Distribusi Peran Pengguna
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
                        <p className="text-sm text-purple-600/70">Admin</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-3xl font-bold text-blue-600">{stats.teachers}</p>
                        <p className="text-sm text-blue-600/70">Guru</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <p className="text-3xl font-bold text-green-600">{stats.students}</p>
                        <p className="text-sm text-green-600/70">Siswa</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Database size={20} className="text-indigo-500" />
                    Aksi Cepat
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={() => onTabChange('users')}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <UserCog size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                        <p className="font-medium text-sm">Kelola Pengguna</p>
                    </button>
                    <button
                        onClick={() => onTabChange('announcements')}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <Megaphone size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                        <p className="font-medium text-sm">Pengumuman</p>
                    </button>
                    <button
                        onClick={() => navigate('/analytics')}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <BarChart3 size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                        <p className="font-medium text-sm">Analitik</p>
                    </button>
                    <button
                        onClick={() => navigate('/pengaturan')}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <Settings size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                        <p className="font-medium text-sm">Pengaturan</p>
                    </button>
                </div>
            </div>
        </div>
    );
};
