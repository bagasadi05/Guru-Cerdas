import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { BrainCircuitIcon, DownloadCloudIcon } from '../Icons';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';

interface AttendanceHeaderProps {
    onAnalyze: () => void;
    onExport: () => void;
    isOnline: boolean;
}

// Analysis and export are occasional, so they sit behind one menu and the
// class, date and student list stay near the top of the screen.
export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ onAnalyze, onExport, isOnline }) => {
    const { language } = useI18n();
    return (
        <header className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
            <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-slate-900 dark:text-white">
                    Absensi
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {attendanceCopy[language].guidance}
                </p>
            </div>
            <DropdownMenu>
                <DropdownTrigger aria-label="Pilihan lain absensi" className="!min-h-11 !min-w-11 !h-11 !w-11 !p-0 !rounded-xl shrink-0">
                    <MoreHorizontal className="h-5 w-5" />
                </DropdownTrigger>
                <DropdownContent align="right">
                    <DropdownItem className="min-h-11" icon={<BrainCircuitIcon className="w-4 h-4" />} onClick={onAnalyze} disabled={!isOnline}>
                        Analisis kehadiran dengan AI
                    </DropdownItem>
                    <DropdownItem className="min-h-11" icon={<DownloadCloudIcon className="w-4 h-4" />} onClick={onExport}>
                        Ekspor Data
                    </DropdownItem>
                </DropdownContent>
            </DropdownMenu>
        </header>
    );
};
