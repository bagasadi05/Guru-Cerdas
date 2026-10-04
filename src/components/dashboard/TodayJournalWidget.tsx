import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, ChevronRight, ClipboardPenLine } from 'lucide-react';
import type { TodayJournalStatus } from '../../hooks/useTodayJournalStatus';

interface TodayJournalWidgetProps {
  status?: TodayJournalStatus;
}

/** Displays today's teaching-journal progress and links to unfinished entries. */
export const TodayJournalWidget: React.FC<TodayJournalWidgetProps> = ({ status }) => {
  const navigate = useNavigate();
  const totalSlots = status?.totalSlots ?? 0;
  const filled = status?.filled ?? 0;
  const unfilledItems = status?.items.filter((item) => !item.isFilled) ?? [];
  const completion = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

  const openJournal = (schedule: TodayJournalStatus['items'][number]['schedule']) => {
    const params = new URLSearchParams({
      subject: schedule.subject,
      scheduleId: schedule.id,
      action: 'add',
    });

    if (schedule.class_id) {
      params.set('classId', schedule.class_id);
    }

    navigate(`/jurnal?${params.toString()}`);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-white">Jurnal Mengajar Hari Ini</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {totalSlots > 0 ? `${filled} dari ${totalSlots} jam sudah dicatat` : 'Belum ada jam mengajar hari ini'}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${unfilledItems.length > 0
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        }`}>
          {totalSlots > 0 ? `${completion}% selesai` : 'Tidak ada agenda'}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {totalSlots > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${completion}%` }}
              role="progressbar"
              aria-label="Progres jurnal mengajar hari ini"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            />
          </div>
        )}

        {unfilledItems.length > 0 ? (
          <div className="space-y-2">
            {unfilledItems.slice(0, 2).map(({ schedule }) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => openJournal(schedule)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{schedule.subject}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
                  Isi jurnal <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
            {unfilledItems.length > 2 && (
              <button
                type="button"
                onClick={() => navigate('/jurnal')}
                className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"
              >
                Lihat {unfilledItems.length - 2} jurnal lainnya <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {totalSlots > 0 ? 'Semua jurnal mengajar hari ini sudah lengkap.' : 'Gunakan waktu ini untuk menyiapkan pembelajaran berikutnya.'}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/jurnal')}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
        >
          <ClipboardPenLine className="h-4 w-4" /> Buka semua jurnal
        </button>
      </div>
    </section>
  );
};

export default TodayJournalWidget;
