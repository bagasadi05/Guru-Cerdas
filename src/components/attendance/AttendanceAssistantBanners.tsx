import React, { useState } from 'react';
import { CalendarClock, ChevronDown, Loader2, XIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';
import { getMondayOfWeek } from '../../services/attendanceAutoFillService';

interface AttendanceAssistantBannersProps {
    className?: string;
    missingWeekdays: { date: string; formattedDate: string }[];
    isAssistantDismissed: boolean;
    setIsAssistantDismissed: (dismissed: boolean) => void;
    handleAutoFillWeekdays: () => Promise<void> | void;
    isAutoFilling: boolean;
    isCurrentDateAutoFilled: boolean;
    isAutoFillBannerDismissed: boolean;
    setIsAutoFillBannerDismissed: (dismissed: boolean) => void;
}

export const AttendanceAssistantBanners: React.FC<AttendanceAssistantBannersProps> = ({
    className, missingWeekdays, isAssistantDismissed, setIsAssistantDismissed,
    handleAutoFillWeekdays, isAutoFilling, isCurrentDateAutoFilled,
    isAutoFillBannerDismissed, setIsAutoFillBannerDismissed,
}) => {
    const { language } = useI18n();
    const copy = attendanceCopy[language];
    const [expanded, setExpanded] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const lastDate = missingWeekdays.at(-1)?.date;
    const range = lastDate ? `${getMondayOfWeek(lastDate)} — ${lastDate}` : '';
    return <>
        {missingWeekdays.length > 0 && !isAssistantDismissed && (
            <section className="mb-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1 p-1 sm:p-2">
                    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}
                        className="flex flex-1 min-w-0 items-center gap-2 min-h-11 px-1 text-left text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
                        <CalendarClock size={18} className="shrink-0" aria-hidden="true" />
                        <span>{copy.missing.replace('{count}', String(missingWeekdays.length))}<span className="sr-only">. {copy.showMissing}</span></span>
                        <ChevronDown size={16} className={`ml-auto shrink-0 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setIsAssistantDismissed(true)} aria-label={copy.closeReminder}
                        className="flex items-center justify-center w-11 h-11 shrink-0 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"><XIcon size={18} /></button>
                </div>
                {expanded && <div className="px-3 pb-3 text-xs space-y-3">
                    <p>{missingWeekdays.map(day => day.formattedDate).join(', ')}</p>
                    <p>{copy.missingHelp}</p>
                    <Button onClick={() => setConfirming(true)} disabled={isAutoFilling} className="!min-h-11 !h-auto py-2 w-full sm:w-auto">
                        {isAutoFilling ? <><Loader2 size={16} className="animate-spin mr-2" />{copy.filling}</> : copy.fillMissing.replace('{count}', String(missingWeekdays.length))}
                    </Button>
                </div>}
            </section>
        )}
        {isCurrentDateAutoFilled && !isAutoFillBannerDismissed && <div className="mb-3 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={18} className="shrink-0" /><span className="flex-1">{copy.autoFilled}</span>
            <button type="button" onClick={() => setIsAutoFillBannerDismissed(true)} aria-label={copy.closeNotice}
                className="flex items-center justify-center w-11 h-11 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><XIcon size={18} /></button>
        </div>}
        <Modal isOpen={confirming} onClose={() => setConfirming(false)} title={copy.fillTitle}>
            <div className="space-y-4">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{className}<br />{range}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{copy.fillRange}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{copy.fillDescription}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="secondary" onClick={() => setConfirming(false)}>{copy.cancel}</Button>
                    <Button disabled={isAutoFilling || !lastDate} onClick={() => { setConfirming(false); void handleAutoFillWeekdays(); }} className="!h-auto !min-h-11 py-2">{copy.fillConfirm}</Button>
                </div>
            </div>
        </Modal>
    </>;
};
