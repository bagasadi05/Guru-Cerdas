import React from 'react';
import {
    Activity,
    RefreshCw,
    Search,
    Loader2,
} from 'lucide-react';
import { AuditLog } from './types';

const LOG_PAGE_SIZE = 25;

interface ActivityLogsTabProps {
    activityLogs: AuditLog[];
    logsLoading: boolean;
    logSearchTerm: string;
    setLogSearchTerm: (term: string) => void;
    logPage: number;
    setLogPage: React.Dispatch<React.SetStateAction<number>>;
    logTotal: number;
    fetchActivityLogs: () => Promise<void>;
}

export const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({
    activityLogs,
    logsLoading,
    logSearchTerm,
    setLogSearchTerm,
    logPage,
    setLogPage,
    logTotal,
    fetchActivityLogs,
}) => {
    const logPageCount = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
    const logRangeStart = logTotal === 0 ? 0 : (logPage - 1) * LOG_PAGE_SIZE + 1;
    const logRangeEnd = logTotal === 0 ? 0 : Math.min(logRangeStart + activityLogs.length - 1, logTotal);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Activity size={20} className="text-indigo-500" />
                        Log Aktivitas
                    </h3>
                    <button
                        onClick={fetchActivityLogs}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        <RefreshCw size={16} />
                        Muat Ulang
                    </button>
                </div>
                <div className="mt-4 flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari log, pengguna, atau tabel..."
                            value={logSearchTerm}
                            onChange={(e) => {
                                setLogSearchTerm(e.target.value);
                                setLogPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">Riwayat semua aksi admin</p>
            </div>

            {logsLoading ? (
                <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                </div>
            ) : activityLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <Activity size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Belum ada log aktivitas</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3 text-left">Waktu</th>
                                <th className="px-6 py-3 text-left">Pengguna</th>
                                <th className="px-6 py-3 text-left">Aksi</th>
                                <th className="px-6 py-3 text-left">Tabel</th>
                                <th className="px-6 py-3 text-left">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {activityLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString('id-ID', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {log.user_email || 'Sistem'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                                            log.action === 'INSERT' || log.action === 'RESTORE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            log.action === 'UPDATE' || log.action === 'UPDATE_ROLE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            log.action === 'DELETE' || log.action === 'SOFT_DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                                        {log.table_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {log.record_id ? `ID: ${log.record_id.slice(0, 8)}...` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {!logsLoading && logTotal > 0 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10">
                    <p className="text-sm text-gray-500">
                        Menampilkan {logRangeStart}-{logRangeEnd} dari {logTotal}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                            disabled={logPage === 1 || logsLoading}
                            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                            Sebelumnya
                        </button>
                        <span className="text-sm text-gray-500">
                            Halaman {logPage} dari {logPageCount}
                        </span>
                        <button
                            onClick={() => setLogPage(prev => Math.min(logPageCount, prev + 1))}
                            disabled={logPage >= logPageCount || logsLoading}
                            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
