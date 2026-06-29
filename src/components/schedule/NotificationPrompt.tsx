import React from 'react';
import { BellIcon } from '../Icons';
import { Button } from '../ui/Button';

interface NotificationPromptProps {
    onEnable: () => Promise<void>;
    isLoading: boolean;
}

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({ onEnable, isLoading }) => {
    return (
        <div className="relative z-10 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-lg rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6 animate-fade-in">
            <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BellIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-white text-sm">Jangan Lewatkan Jadwal</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Aktifkan notifikasi untuk pengingat 5 menit sebelum kelas.</p>
                </div>
            </div>
            <Button onClick={onEnable} disabled={isLoading} size="sm" className="w-full sm:w-auto flex-shrink-0">
                {isLoading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
            </Button>
        </div>
    );
};
