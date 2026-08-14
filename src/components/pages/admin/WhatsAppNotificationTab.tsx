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
    KeyRound,
    Eye,
    EyeOff,
    FileSpreadsheet,
    Radio,
    RefreshCw,
} from 'lucide-react';
import { useFonnteConfig } from '../../../hooks/useFonnteConfig';

/**
 * WhatsApp Notification Tab — Admin panel configuration for Fonnte WhatsApp Gateway.
 * Admin dapat mengaktifkan laporan harian yang dikirim setiap sore via WhatsApp
 * berisi ringkasan seluruh input guru hari itu.
 */
export const WhatsAppNotificationTab: React.FC = () => {
    const {
        config,
        updateConfig,
        sendTest,
        triggerDailyReport,
        deviceInfo,
        checkDeviceStatus,
        isCheckingDevice,
    } = useFonnteConfig();
    const [testSending, setTestSending] = useState(false);
    const [reportSending, setReportSending] = useState(false);
    const [showToken, setShowToken] = useState(false);

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
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MessageSquare size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifikasi WhatsApp (Fonnte Gateway)</h2>
                    <p className="text-sm text-gray-500">Admin menerima laporan harian via WhatsApp setiap sore.</p>
                </div>
            </div>

            {/* Device Connection Status Banner */}
            {config.token && (
                <div className={`rounded-2xl border p-5 transition-all ${
                    deviceInfo?.device_status === 'connect'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                }`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                deviceInfo?.device_status === 'connect'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                            }`}>
                                <Radio size={22} className={deviceInfo?.device_status === 'connect' ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        Status Koneksi WhatsApp: {deviceInfo?.device_status === 'connect' ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Terhubung (Connected)</span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">🔴 Terputus (Disconnected)</span>
                                        )}
                                    </h3>
                                </div>
                                {deviceInfo?.device_status === 'disconnect' ? (
                                    <div className="mt-1.5 text-sm text-amber-800 dark:text-amber-300">
                                        <p className="font-medium">⚠️ WhatsApp nomor pengirim ({deviceInfo.device || '0851...'}) belum terhubung ke Fonnte.</p>
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                            Silakan buka <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Fonnte.com</a> → Menu Device (<strong>{deviceInfo.name || 'guru-cerdas'}</strong>) → Klik tombol <strong>Connect / Scan QR</strong> menggunakan WhatsApp di HP Anda.
                                        </p>
                                    </div>
                                ) : deviceInfo ? (
                                    <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                                        <span>Nomor Pengirim: <strong>{deviceInfo.device || '-'}</strong> ({deviceInfo.name || 'Device'})</span>
                                        <span>Sisa Kuota: <strong>{deviceInfo.quota ?? '-'}</strong> pesan</span>
                                        <span>Masa Aktif: <strong>{deviceInfo.expired || '-'}</strong></span>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Memeriksa status perangkat ke Fonnte...</p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => checkDeviceStatus()}
                            disabled={isCheckingDevice}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 shrink-0 shadow-sm"
                            title="Cek ulang status koneksi ke Fonnte"
                        >
                            <RefreshCw size={14} className={isCheckingDevice ? 'animate-spin' : ''} />
                            {isCheckingDevice ? 'Mengecek...' : 'Cek Status'}
                        </button>
                    </div>
                </div>
            )}

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
                        onClick={() => updateConfig({ enabled: !config.enabled })}
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

            {/* Fonnte API Token */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <KeyRound size={20} className="text-gray-500" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Fonnte API Token / Device Token</p>
                        <p className="text-sm text-gray-500">Token gateway dari akun Fonnte Anda (tersimpan aman di server)</p>
                    </div>
                </div>
                <div className="relative">
                    <input
                        type={showToken ? 'text' : 'password'}
                        value={config.token || ''}
                        onChange={(e) => updateConfig({ token: e.target.value })}
                        placeholder="Contoh: abcd1234efgh5678..."
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title={showToken ? 'Sembunyikan Token' : 'Lihat Token'}
                    >
                        {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                    Dapatkan token dari dashboard <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">Fonnte.com</a> menu Device Settings.
                </p>
            </div>

            {/* Admin Phone */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Smartphone size={20} className="text-gray-500" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Nomor WhatsApp Admin</p>
                        <p className="text-sm text-gray-500">Nomor penerima laporan harian (format: 628xxx atau 08xxx)</p>
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
                <p className="mt-2 text-xs text-gray-400">Contoh: 6281234567890 (kode negara 62 atau awalan 08)</p>
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
                    Perubahan jam kirim diterapkan segera (jadwal pg_cron di Supabase diperbarui otomatis, WIB).
                </p>
            </div>

            {/* Actions & Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Aksi & Uji Koneksi</p>
                <p className="text-sm text-gray-500 mb-4">Kirim pesan uji coba atau kirim laporan harian hari ini sekarang secara manual.</p>
                
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSendTest}
                        disabled={testSending || !config.adminPhone}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
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
                        disabled={reportSending || !config.adminPhone}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        {reportSending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <FileSpreadsheet size={18} />
                        )}
                        {reportSending ? 'Mengirim Laporan...' : 'Kirim Laporan Harian Sekarang'}
                    </button>
                </div>

                {/* Status indicators */}
                <div className="mt-5 space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                        {config.token ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                            <XCircle size={16} className="text-amber-500" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                            {config.token ? 'Fonnte Token: Terkonfigurasi' : 'Fonnte Token: Belum diisi'}
                        </span>
                    </div>
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
                            Laporan harian otomatis {config.enabled ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                            Jadwal harian: Pukul {config.dailyReportTime} WIB
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
