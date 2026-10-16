import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';

interface AttendanceFloatingSaveBarProps {
    isDirty: boolean;
    viewMode: string;
    handleSave: () => void;
    isSaving: boolean;
    isOnline: boolean;
}

export const AttendanceFloatingSaveBar: React.FC<AttendanceFloatingSaveBarProps> = ({
    isDirty,
    viewMode,
    handleSave,
    isSaving,
    isOnline,
}) => {
    const { language } = useI18n();
    const copy = attendanceCopy[language];
    if (!isDirty || viewMode !== 'list' || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 inset-x-0 z-50 pointer-events-none flex justify-center lg:pl-72 px-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
            <div className="pointer-events-auto shadow-xl bg-slate-900 dark:bg-slate-800 text-white px-4 sm:px-6 py-3 rounded-2xl flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 border border-slate-700/80 dark:border-slate-600 max-w-sm sm:max-w-[95vw]">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-semibold tracking-tight">
                        {copy.unsaved}
                    </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-white/20" />
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="default"
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 !min-h-11 !h-11 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            {copy.saving}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={14} />
                            {isOnline ? copy.save : copy.offline}
                        </>
                    )}
                </Button>
            </div>
        </div>,
        document.body
    );
};
