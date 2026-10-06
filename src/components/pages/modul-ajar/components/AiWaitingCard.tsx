import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { MotionDiv } from '../../../ui/MotionComponents';

interface AiWaitingCardProps {
  title: string;
  /** Start of the request (ms); shows the elapsed time when set. */
  startedAt?: number | null;
  onCancel?: () => void;
}

/** Overlay shown while the AI writes a document. No fake progress: real elapsed time only. */
export const AiWaitingCard: React.FC<AiWaitingCardProps> = ({ title, startedAt, onCancel }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : null;

  return (
    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-30 flex items-center justify-center p-6 text-center">
      <MotionDiv
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4"
      >
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-900/30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
          <Clock className="w-6 h-6 text-brand-500" />
        </div>
        <div className="space-y-1.5" role="status" aria-live="polite">
          <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Biasanya selesai dalam 20–60 detik.
            {elapsedSeconds !== null && ` Sudah ${elapsedSeconds} detik.`}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Batalkan
          </button>
        )}
      </MotionDiv>
    </div>
  );
};
