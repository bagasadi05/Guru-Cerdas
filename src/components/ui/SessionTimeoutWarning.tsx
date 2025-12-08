import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangleIcon, ClockIcon } from '../Icons';
import { formatTimeRemaining } from '../../hooks/useSessionTimeout';

interface SessionTimeoutWarningProps {
    isOpen: boolean;
    remainingSeconds: number;
    onExtend: () => void;
    onLogout: () => void;
}

/**
 * Modal warning for session timeout
 */
export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
    isOpen,
    remainingSeconds,
    onExtend,
    onLogout,
}) => {
    const formattedTime = formatTimeRemaining(remainingSeconds);
    const isUrgent = remainingSeconds <= 60;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onExtend}
            title="Sesi Akan Berakhir"
            icon={<AlertTriangleIcon className="w-6 h-6 text-amber-500" />}
        >
            <div className="space-y-6">
                {/* Timer Display */}
                <div className={`
                    flex flex-col items-center justify-center p-6 rounded-2xl
                    ${isUrgent
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    }
                `}>
                    <ClockIcon className={`w-12 h-12 mb-3 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                    <div className={`text-4xl font-bold font-mono ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formattedTime}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Waktu tersisa sebelum logout otomatis
                    </p>
                </div>

                {/* Warning Message */}
                <div className="text-center space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">
                        Anda tidak aktif selama beberapa waktu.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Untuk keamanan, sesi Anda akan berakhir secara otomatis.
                        Klik "Perpanjang Sesi" untuk melanjutkan.
                    </p>
                </div>

                {/* Unsaved Changes Warning */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Data yang belum disimpan akan hilang jika sesi berakhir
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={onLogout}
                        variant="outline"
                        className="flex-1 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                    >
                        Logout Sekarang
                    </Button>
                    <Button
                        onClick={onExtend}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Perpanjang Sesi
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SessionTimeoutWarning;
