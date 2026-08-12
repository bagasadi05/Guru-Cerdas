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
import { useFonnteConfig } from '../../../hooks/useFonnteConfig';

/**
 * WhatsApp Notification Tab — Admin panel configuration for Fonnte WhatsApp Gateway.
 * Admin dapat mengaktifkan laporan harian yang dikirim setiap sore via WhatsApp
 * berisi ringkasan seluruh input guru hari itu.
 */
export const WhatsAppNotificationTab: React.FC = () => {
    const { config, updateConfig, sendTest } = useFonnteConfig();
    const [testSending, setTestSending] = useState(false);

    const handleSendTest = async () => {
        setTestSending(true);
        await sendTest();
        setTestSending(false);
    };

    const timeOptions = [
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MessageSquare size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifikasi WhatsApp</h2>
                    <p className="text-sm text-gray-500">Admin menerima laporan harian via WhatsApp setiap sore.</p>
                </div>
            </div>

            {/* Main toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-500" />
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Aktifkan Laporan Harian</p>
                            <p className="text-sm text-gray-500">Kirim ringkasan input guru hari ini via WhatsApp</p>
                        </div>
                    </div>
                    <button
                        onClick={() => updateConfig({ enabled: !config.enabled, dailyReportEnabled: !config.enabled })}
                        className="focus:outline-none"
                        aria-label={config.enabled ? 'Nonaktifkan laporan harian' : 'Aktifkan laporan harian'}
                    >
                        {config.enabled ? (
                            <ToggleRight size={44} className="text-emerald-500" />
                        ) : (
                            <ToggleLeft size={44} className="text-gray-300 dark:text-gray-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Admin Phone */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Smartphone size={20} className="text-gray-500" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Nomor WhatsApp Admin</p>
                        <p className="text-sm text-gray-500">Nomor penerima laporan harian (format: 628xxx)</p>
                    </div>
                </div>
                <input
                    type="text"
                    value={config.adminPhone}
                    onChange={(e) => updateConfig({ adminPhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="6281234567890"
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
                <p className="mt-2 text-xs text-gray-400">Contoh: 6281234567890 (kode negara tanpa +)</p>
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
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                        >
                            {time} WIB
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    ⚠️ Perubahan jam kirim akan diterapkan saat deploy ulang Edge Function.
                </p>
            </div>

            {/* Test Button */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <p className="font-medium text-gray-900 dark:text-white mb-3">Uji Kirim Pesan</p>
                <p className="text-sm text-gray-500 mb-4">Kirim pesan uji coba ke nomor WhatsApp admin untuk memastikan koneksi berfungsi.</p>
                <button
                    onClick={handleSendTest}
                    disabled={testSending || !config.adminPhone}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                    {testSending ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Send size={18} />
                    )}
                    {testSending ? 'Mengirim...' : 'Kirim Pesan Uji Coba'}
                </button>

                {/* Status indicators */}
                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        {config.adminPhone ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                            <XCircle size={16} className="text-amber-500" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                            {config.adminPhone
                                ? `Nomor admin: +${config.adminPhone}`
                                : 'Nomor WhatsApp admin belum diisi'}
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
