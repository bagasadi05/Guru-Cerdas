import React from 'react';
import { Button } from '../ui/Button';
import { BrainCircuitIcon, DownloadCloudIcon } from '../Icons';

interface AttendanceHeaderProps {
    onAnalyze: () => void;
    onExport: () => void;
    isOnline: boolean;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ onAnalyze, onExport, isOnline }) => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">Rekapitulasi Kehadiran</h1>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide">Manajemen data kehadiran peserta didik secara real-time.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={onAnalyze} variant="outline" disabled={!isOnline} className="flex-1 md:flex-none justify-center border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 tracking-wide">
                    <BrainCircuitIcon className="w-4 h-4 mr-2 text-indigo-500" />
                    Analisis Cerdas
                </Button>
                <Button onClick={onExport} variant="outline" className="flex-1 md:flex-none justify-center border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 tracking-wide">
                    <DownloadCloudIcon className="w-4 h-4 mr-2 text-slate-500" />
                    Ekspor Data
                </Button>
            </div>
        </header>
    );
};
