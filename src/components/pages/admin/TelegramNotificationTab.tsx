import React, { useState } from 'react';
import {
    MessageSquare,
    Send,
    Loader2,
    Bell,
    ToggleLeft,
    ToggleRight,
    CheckCircle2,
    XCircle,
    Smartphone,
    Clock,
} from 'lucide-react';
import { useTelegramConfig } from '../../../hooks/useTelegramConfig';

/**
 * Telegram Notification Tab — Admin panel configuration for Telegram bot.
 * Admin dapat mengaktifkan laporan harian yang dikirim setiap sore via Telegram
 * berisi ringkasan seluruh input guru hari itu.
 */
export const TelegramNotificationTab: React.FC = () => {
    const { config, updateConfig, sendTest, triggerDailyReport } = useTelegramConfig();
    const [testSending, setTestSending] = useState(false);
    const [reportSending, setReportSending] = useState(false);

    const handleSendTest = async () => {
        setTestSending(true);
        await sendTest();
        setTestSending(false);
    };

    const handleTriggerReport = async () => {
        setReportSending(true);
        await triggerDailyReport();
        setReportSending(false);
    };

    const timeOptions = [
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <MessageSquare size={22} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifikasi Telegram</h2>
                    <p className="text-sm text-gray-500">Admin menerima laporan harian via bot Telegram setiap sore.</p>
                </div>
            </div>

            {/* Main toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-500" />
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Aktifkan Laporan Harian</p>
                            <p className="text-sm text-gray-500">Kirim ringkasan input guru hari ini via Telegram</p>
                        </div>
                    </div>
                    <button
                        onClick={() => updateConfig({ enabled: !config.enabled })}
                        className="focus:outline-none"
                        aria-label={config.enabled ? 'Nonaktifkan laporan harian' : 'Aktifkan laporan harian'}
                    >
                        {config.enabled ? (
                            <ToggleRight size={44} className="text-sky-500" />
                        ) : (
                            <ToggleLeft size={44} className="text-gray-300 dark:text-gray-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Chat ID */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Smartphone size={20} className="text-gray-500" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Telegram Chat ID</p>
                        <p className="text-sm text-gray-500">ID penerima laporan harian (bisa angka positif untuk user, negatif untuk grup)</p>
                    </div>
                </div>
                <input
                    type="text"
                    value={config.chatId}
                    onChange={(e) => updateConfig({ chatId: e.target.value.replace(/[^\d-]/g, '') })}
                    placeholder="123456789"
                    maxLength={20}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
                <p className="mt-2 text-xs text-gray-400">
                    Cara mendapat Chat ID: kirim pesan apa pun ke bot <span className="font-mono">@userinfobot</span> di Telegram,
                    lalu salin angka "Id" yang ditampilkan bot.
                </p>
            </div>

            {/* Jam Pengiriman */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Clock size={20} className="text-gray-500" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Jam Pengiriman Laporan</p>
                        <p className="text-sm text-gray-500">Laporan dikirim setiap hari pada jam ini (WIB)</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {timeOptions.map((time) => (
                        <button
                            key={time}
                            onClick={() => updateConfig({ dailyReportTime: time })}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                config.dailyReportTime === time
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20'
                            }`}
                        >
                            {time} WIB
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    Perubahan jam kirim diterapkan segera (jadwal pg_cron diperbarui otomatis, WIB).
                </p>
            </div>

            {/* Test Button */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <p className="font-medium text-gray-900 dark:text-white mb-3">Uji Kirim Pesan</p>
                <p className="text-sm text-gray-500 mb-4">Kirim pesan uji coba ke chat ID di atas untuk memastikan koneksi berfungsi.</p>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSendTest}
                        disabled={testSending || !config.chatId}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        {testSending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                        {testSending ? 'Mengirim...' : 'Kirim Pesan Uji Coba'}
                    </button>
                    <button
                        onClick={handleTriggerReport}
                        disabled={reportSending || !config.chatId}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        {reportSending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Bell size={18} />
                        )}
                        {reportSending ? 'Mengirim...' : 'Kirim Laporan Harian Sekarang'}
                    </button>
                </div>

                {/* Status indicators */}
                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        {config.chatId ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                            <XCircle size={16} className="text-amber-500" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                            {config.chatId
                                ? `Chat ID: ${config.chatId}`
                                : 'Telegram chat ID belum diisi'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        {config.enabled ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                            <XCircle size={16} className="text-gray-400" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                            Laporan harian {config.enabled ? 'aktif' : 'nonaktif'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                            Dikirim setiap hari pukul {config.dailyReportTime} WIB
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
