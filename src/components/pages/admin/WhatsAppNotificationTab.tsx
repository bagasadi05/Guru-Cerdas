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
} from 'lucide-react';
import { useFonnteConfig } from '../../../hooks/useFonnteConfig';

/**
 * WhatsApp Notification Tab — Admin panel configuration for Fonnte WhatsApp Gateway.
 * Admin can set their WhatsApp number, toggle notification types, and test the connection.
 */
export const WhatsAppNotificationTab: React.FC = () => {
    const { config, updateConfig, sendTest } = useFonnteConfig();
    const [testSending, setTestSending] = useState(false);

    const handleSendTest = async () => {
        setTestSending(true);
        await sendTest();
        setTestSending(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MessageSquare size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifikasi WhatsApp</h2>
                    <p className="text-sm text-gray-500">Admin menerima notifikasi WhatsApp setiap guru menginput data.</p>
                </div>
            </div>

            {/* Main toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-500" />
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Aktifkan Notifikasi</p>
                            <p className="text-sm text-gray-500">Kirim notifikasi WhatsApp saat guru input data</p>
                        </div>
                    </div>
                    <button
                        onClick={() => updateConfig({ enabled: !config.enabled })}
                        className="focus:outline-none"
                        aria-label={config.enabled ? 'Nonaktifkan notifikasi' : 'Aktifkan notifikasi'}
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
                        <p className="text-sm text-gray-500">Nomor penerima notifikasi (format: 628xxx)</p>
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

            {/* Notification types */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <p className="font-medium text-gray-900 dark:text-white mb-4">Jenis Notifikasi</p>
                <div className="space-y-4">
                    {/* Quiz */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Poin Kuis / Keaktifan</p>
                            <p className="text-xs text-gray-400">Notifikasi saat guru input poin kuis siswa</p>
                        </div>
                        <button
                            onClick={() => updateConfig({ notifyQuiz: !config.notifyQuiz })}
                            className="focus:outline-none"
                            aria-label={config.notifyQuiz ? 'Nonaktifkan notifikasi kuis' : 'Aktifkan notifikasi kuis'}
                        >
                            {config.notifyQuiz ? (
                                <ToggleRight size={38} className="text-emerald-500" />
                            ) : (
                                <ToggleLeft size={38} className="text-gray-300 dark:text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Grade */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nilai Mata Pelajaran</p>
                            <p className="text-xs text-gray-400">Notifikasi saat guru input nilai akademik</p>
                        </div>
                        <button
                            onClick={() => updateConfig({ notifyGrade: !config.notifyGrade })}
                            className="focus:outline-none"
                            aria-label={config.notifyGrade ? 'Nonaktifkan notifikasi nilai' : 'Aktifkan notifikasi nilai'}
                        >
                            {config.notifyGrade ? (
                                <ToggleRight size={38} className="text-emerald-500" />
                            ) : (
                                <ToggleLeft size={38} className="text-gray-300 dark:text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Violation */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pelanggaran Siswa</p>
                            <p className="text-xs text-gray-400">Notifikasi saat guru mencatat pelanggaran</p>
                        </div>
                        <button
                            onClick={() => updateConfig({ notifyViolation: !config.notifyViolation })}
                            className="focus:outline-none"
                            aria-label={config.notifyViolation ? 'Nonaktifkan notifikasi pelanggaran' : 'Aktifkan notifikasi pelanggaran'}
                        >
                            {config.notifyViolation ? (
                                <ToggleRight size={38} className="text-emerald-500" />
                            ) : (
                                <ToggleLeft size={38} className="text-gray-300 dark:text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>
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
                            Notifikasi {config.enabled ? 'aktif' : 'nonaktif'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
