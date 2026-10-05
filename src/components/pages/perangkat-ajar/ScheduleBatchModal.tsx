import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CalendarClock, X, Loader2 } from 'lucide-react';
import type { PlannedProta } from '../../../utils/protaSchedulePlanner';

interface ScheduleBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'loading' | 'error' | 'ready';
  plans: PlannedProta[];
  academicYear: string;
  isCreating: boolean;
  /** "2 / 5" while documents are being created. */
  progress?: { done: number; total: number } | null;
  onCreate: (keys: string[], useAi: boolean) => void;
}

export const ScheduleBatchModal: React.FC<ScheduleBatchModalProps> = ({
  isOpen,
  onClose,
  status,
  plans,
  academicYear,
  isCreating,
  progress,
  onCreate,
}) => {
  const [useAi, setUseAi] = useState(true);
  const missingKeys = (list: PlannedProta[]) => new Set(list.filter((p) => !p.exists).map((p) => p.key));
  const [selected, setSelected] = useState<Set<string>>(() => missingKeys(plans));
  const [selectionPlans, setSelectionPlans] = useState(plans);

  // Preselect everything that does not have a Prota yet whenever a new plan arrives.
  if (selectionPlans !== plans) {
    setSelectionPlans(plans);
    setSelected(missingKeys(plans));
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCreating, onClose]);

  const selectedCount = useMemo(
    () => plans.filter((p) => selected.has(p.key)).length,
    [plans, selected]
  );
  const selectedWithoutPreset = plans.filter((p) => selected.has(p.key) && !p.hasPreset).length;

  if (!isOpen || typeof document === 'undefined') return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-batch-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreating) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600 text-white shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="schedule-batch-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Buat Prota dari Jadwal Mengajar
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Satu Prota & Promes untuk tiap mapel dan kelas di jadwal Anda, tahun ajaran {academicYear}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            aria-label="Tutup"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
          {status === 'loading' && (
            <p className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Membaca jadwal mengajar...
            </p>
          )}

          {status === 'error' && (
            <p className="text-rose-600 dark:text-rose-400">
              Jadwal tidak bisa dibaca. Periksa koneksi lalu buka lagi.
            </p>
          )}

          {status === 'ready' && plans.length === 0 && (
            <p className="text-slate-600 dark:text-slate-300">
              Jadwal mengajar Anda masih kosong.{' '}
              <Link to="/jadwal" className="font-bold text-brand-600 dark:text-brand-400 underline underline-offset-2">
                Isi jadwal
              </Link>{' '}
              dulu, lalu kembali ke sini.
            </p>
          )}

          {status === 'ready' && plans.length > 0 && (
            <>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                JP per pekan dihitung dari durasi jadwal (1 JP = 35 menit SD/MI, 40 menit SMP, 45 menit SMA).
                Jam materi dan matriks Promes mengikuti Kaldik {academicYear}. Semua bisa diubah setelah dibuat.
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                {plans.map((plan) => (
                  <li key={plan.key}>
                    <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <input
                        type="checkbox"
                        checked={selected.has(plan.key)}
                        onChange={() => toggle(plan.key)}
                        disabled={isCreating}
                        className="mt-0.5"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <strong className="text-slate-900 dark:text-white">
                            {plan.subject} · {plan.gradeLevel}
                          </strong>
                          {plan.exists && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                              Sudah ada
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {[
                            plan.classNames.length > 0 ? plan.classNames.join(', ') : null,
                            `${plan.weeklyJp} JP/pekan`,
                            plan.hasPreset
                              ? 'daftar bab bawaan'
                              : useAi
                                ? 'TP disusun AI'
                                : 'kerangka 4 + 4 bab, isi TP sendiri',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {selectedWithoutPreset > 0 && (
                <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAi}
                    onChange={(e) => setUseAi(e.target.checked)}
                    disabled={isCreating}
                    className="mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-100">Susun TP dengan AI</strong>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      Untuk {selectedWithoutPreset} mapel tanpa daftar bab bawaan. Hasilnya draf; periksa dengan CP terbaru.
                      Kalau AI gagal, mapel itu memakai kerangka 4 + 4 bab.
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onCreate(plans.filter((p) => selected.has(p.key)).map((p) => p.key), useAi)}
            disabled={status !== 'ready' || selectedCount === 0 || isCreating}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isCreating
                ? progress
                  ? `Membuat ${progress.done + 1} dari ${progress.total}...`
                  : 'Membuat...'
                : `Buat ${selectedCount} Prota`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
