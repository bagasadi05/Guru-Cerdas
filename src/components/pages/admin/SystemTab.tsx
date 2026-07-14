import React from 'react';
import {
    Database,
    Server,
    Shield,
    CheckCircle2,
    Cpu,
    RefreshCw,
    HardDrive,
    Users,
    Trash2,
    Activity,
    TrendingUp,
    Clock,
    BarChart3,
} from 'lucide-react';
import { SystemStats, SystemHealth } from './types';

interface SystemTabProps {
    systemHealth: SystemHealth;
    checkSystemHealth: () => Promise<void>;
    stats: SystemStats;
    deletedTotal: number;
    logTotal: number;
}

export const SystemTab: React.FC<SystemTabProps> = ({
    systemHealth,
    checkSystemHealth,
    stats,
    deletedTotal,
    logTotal,
}) => {
    const totalRecords = stats.totalUsers + stats.totalStudents + stats.totalAttendance + stats.totalGrades + stats.totalTasks;
    const distributionMax = Math.max(stats.totalStudents, stats.totalAttendance, stats.totalGrades, stats.totalTasks);

    return (
        <div className="space-y-6">
            {/* Health Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                systemHealth.database === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                systemHealth.database === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                <Database size={24} className={`${
                                    systemHealth.database === 'healthy' ? 'text-emerald-600' :
                                    systemHealth.database === 'degraded' ? 'text-amber-600' :
                                    'text-red-600'
                                }`} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Database</p>
                                <p className="text-xs text-gray-500">Supabase PostgreSQL</p>
                                <p className="text-xs text-gray-500">
                                    Latensi {systemHealth.databaseLatencyMs !== null ? `${systemHealth.databaseLatencyMs} ms` : '-'}
                                </p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            systemHealth.database === 'healthy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            systemHealth.database === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                systemHealth.database === 'healthy' ? 'bg-emerald-500' :
                                systemHealth.database === 'degraded' ? 'bg-amber-500' :
                                'bg-red-500'
                            }`} />
                            {systemHealth.database === 'healthy' ? 'Sehat' : systemHealth.database === 'degraded' ? 'Lambat' : 'Offline'}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                systemHealth.api === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                systemHealth.api === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                <Server size={24} className={`${
                                    systemHealth.api === 'healthy' ? 'text-emerald-600' :
                                    systemHealth.api === 'degraded' ? 'text-amber-600' :
                                    'text-red-600'
                                }`} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">API Supabase</p>
                                <p className="text-xs text-gray-500">Auth dan REST</p>
                                <p className="text-xs text-gray-500">
                                    Latensi {systemHealth.apiLatencyMs !== null ? `${systemHealth.apiLatencyMs} ms` : '-'}
                                </p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            systemHealth.api === 'healthy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            systemHealth.api === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                systemHealth.api === 'healthy' ? 'bg-emerald-500' :
                                systemHealth.api === 'degraded' ? 'bg-amber-500' :
                                'bg-red-500'
                            }`} />
                            {systemHealth.api === 'healthy' ? 'Sehat' : systemHealth.api === 'degraded' ? 'Lambat' : 'Offline'}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Shield size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Keamanan</p>
                                <p className="text-xs text-gray-500">RLS Aktif</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            Terlindungi
                        </div>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Cpu size={20} className="text-indigo-500" />
                        Informasi Sistem
                    </h3>
                    <button type="button"
                        onClick={checkSystemHealth}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        <RefreshCw size={14} />
                        Cek Kesehatan
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <HardDrive size={16} className="text-gray-400" />
                                Total Rekaman
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                {totalRecords.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Users size={16} className="text-gray-400" />
                                Pengguna Aktif
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">{stats.totalUsers}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Trash2 size={16} className="text-gray-400" />
                                Pengguna Terhapus
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">{deletedTotal}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Activity size={16} className="text-gray-400" />
                                Log Aktivitas
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">{logTotal}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <TrendingUp size={16} className="text-gray-400" />
                                Versi Aplikasi
                            </span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">v2.0.0</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                Cek Kesehatan Terakhir
                            </span>
                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                                {systemHealth.lastChecked ? systemHealth.lastChecked.toLocaleTimeString('id-ID') : 'Belum Pernah'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-indigo-500" />
                    Distribusi Data
                </h3>
                <div className="space-y-4">
                    {[
                        { label: 'Siswa', value: stats.totalStudents, max: distributionMax, color: 'bg-blue-500' },
                        { label: 'Absensi', value: stats.totalAttendance, max: distributionMax, color: 'bg-emerald-500' },
                        { label: 'Nilai', value: stats.totalGrades, max: distributionMax, color: 'bg-purple-500' },
                        { label: 'Tugas', value: stats.totalTasks, max: distributionMax, color: 'bg-orange-500' },
                    ].map(item => (
                        <div key={item.label} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                    style={{ width: item.max > 0 ? `${(item.value / item.max) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default SystemTab;
