/**
 * Notification Sound Demo Component
 * 
 * A demo page to test all custom notification sounds
 * Can be temporarily added to routes for testing
 */

import React from 'react';
import { Bell, CheckCircle, XCircle, MessageCircle, Clock, Volume2 } from 'lucide-react';
import {
    playNotificationSound,
    playSuccessSound,
    playErrorSound,
    playMessageSound,
    playReminderSound,
} from '../../utils/notificationSound';
import { useSound } from '../../hooks/useSound';

const SoundButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
}> = ({ onClick, icon, label, description, color }) => (
    <button
        onClick={onClick}
        className={`
            flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700
            hover:border-${color}-500 hover:bg-${color}-50 dark:hover:bg-${color}-900/20
            transition-all duration-200 transform hover:scale-105 active:scale-95
        `}
        style={{ minWidth: '160px' }}
    >
        <div className={`p-4 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
            {icon}
        </div>
        <div className="text-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">{label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
    </button>
);

export const NotificationSoundDemo: React.FC = () => {
    const sound = useSound();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                        <Volume2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        🔔 Custom Notification Sounds
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Klik tombol di bawah untuk mendengar berbagai suara notifikasi Portal Guru
                    </p>
                </div>

                {/* Sound Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
                    <SoundButton
                        onClick={playNotificationSound}
                        icon={<Bell className="w-6 h-6" />}
                        label="Notification"
                        description="Ding-dong umum"
                        color="indigo"
                    />
                    <SoundButton
                        onClick={playSuccessSound}
                        icon={<CheckCircle className="w-6 h-6" />}
                        label="Success"
                        description="Aksi berhasil"
                        color="green"
                    />
                    <SoundButton
                        onClick={playErrorSound}
                        icon={<XCircle className="w-6 h-6" />}
                        label="Error"
                        description="Kesalahan/gagal"
                        color="red"
                    />
                    <SoundButton
                        onClick={playMessageSound}
                        icon={<MessageCircle className="w-6 h-6" />}
                        label="Message"
                        description="Pesan baru"
                        color="blue"
                    />
                    <SoundButton
                        onClick={playReminderSound}
                        icon={<Clock className="w-6 h-6" />}
                        label="Reminder"
                        description="Pengingat"
                        color="amber"
                    />
                </div>

                {/* Combined Sound + Haptic */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                        🎯 Sound + Haptic Feedback
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Kombinasi suara dan getaran untuk pengalaman yang lebih baik (pada perangkat mobile)
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={sound.playNotification}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                        >
                            🔔 Notification + Haptic
                        </button>
                        <button
                            onClick={sound.playSuccess}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            ✅ Success + Haptic
                        </button>
                        <button
                            onClick={sound.playError}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            ❌ Error + Haptic
                        </button>
                        <button
                            onClick={sound.playMessage}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            💬 Message + Haptic
                        </button>
                        <button
                            onClick={sound.playReminder}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                        >
                            ⏰ Reminder + Haptic
                        </button>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        ℹ️ Tentang Suara Notifikasi
                    </h3>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Suara dihasilkan menggunakan Web Audio API untuk kompatibilitas lintas platform</li>
                        <li>• Setiap jenis notifikasi memiliki nada dan karakter yang berbeda</li>
                        <li>• Pada perangkat mobile, suara dikombinasikan dengan haptic feedback</li>
                        <li>• Volume diatur agar nyaman dan tidak mengganggu</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default NotificationSoundDemo;
