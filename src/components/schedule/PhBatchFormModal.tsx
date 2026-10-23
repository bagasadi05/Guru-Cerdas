import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Layers, AlertTriangle } from 'lucide-react';
import {
    MAX_ASH_PER_DAY,
    findNextAvailableAshDate,
    getSameDaySchedules,
    validatePhDraft,
    type PhDraft,
} from './engine/phScheduleValidation';

interface Props {
    className: string;
    semester?: { start_date: string; end_date: string };
    existing: PhDraft[];
    initialDate: string;
    pending: boolean;
    canManage: boolean;
    onClose: () => void;
    onSave: (drafts: PhDraft[]) => void;
}

export function PhBatchFormModal({
    className,
    semester,
    existing,
    initialDate,
    pending,
    canManage,
    onClose,
    onSave,
}: Props) {
    const [drafts, setDrafts] = useState<PhDraft[]>([
        { subject: '', date: initialDate, period_label: '1-2' },
    ]);

    const change = (index: number, key: keyof PhDraft, value: string) =>
        setDrafts((items) =>
            items.map((item, i) => (i === index ? { ...item, [key]: value } : item))
        );

    const issues = drafts.map((draft, i) =>
        validatePhDraft(draft, semester, [...existing, ...drafts.slice(0, i)])
    );

    const validCount = issues.filter((issue) => !issue).length;

    return (
        <Modal
            isOpen
            maxWidth="max-w-4xl"
            onClose={() => {
                if (!pending) onClose();
            }}
            title={`Tambah Massal ASH - ${className}`}
            icon={
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Layers className="w-5 h-5 stroke-[2.2]" />
                </div>
            }
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!pending && canManage && issues.every((issue) => !issue)) {
                        onSave(drafts);
                    }
                }}
                className="space-y-4 pt-1"
            >
                {/* Header Description & Counter */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Isi tanggal, mata pelajaran, dan jam untuk setiap ASH sekaligus (maksimal {MAX_ASH_PER_DAY} ASH per hari).
                    </p>
                    <span className="rounded-xl bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                        {drafts.length} / 20 jadwal
                    </span>
                </div>

                {/* Drafts List */}
                <fieldset disabled={pending || !canManage} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                    {drafts.map((draft, index) => (
                        <div
                            key={index}
                            className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-850/50 shadow-2xs transition-colors"
                        >
                            {/* Row Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white dark:bg-brand-600">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Jadwal ASH #{index + 1}
                                    </h3>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="!h-9 !w-9 !min-h-9 !min-w-9 !p-0 text-slate-400 hover:text-rose-600 rounded-lg dark:hover:text-rose-400"
                                    disabled={drafts.length === 1}
                                    onClick={() => setDrafts((items) => items.filter((_, i) => i !== index))}
                                    aria-label={`Hapus baris jadwal ${index + 1}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Inputs: Desktop 3 cols, Mobile stacked with Mapel first then Date+Period side-by-side */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[180px_minmax(0,1fr)_120px]">
                                {/* Tanggal */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Tanggal <span className="text-brand-500">*</span>
                                    </label>
                                    <Input
                                        aria-label={`Tanggal jadwal ${index + 1}`}
                                        className="h-11 rounded-xl bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium"
                                        type="date"
                                        min={semester?.start_date}
                                        max={semester?.end_date}
                                        required
                                        value={draft.date}
                                        onChange={(e) => change(index, 'date', e.target.value)}
                                    />
                                </div>

                                {/* Mata Pelajaran & Materi */}
                                <div className="space-y-1 sm:col-span-2 md:col-span-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Mata Pelajaran dan Materi <span className="text-brand-500">*</span>
                                    </label>
                                    <Input
                                        aria-label={`Mata pelajaran jadwal ${index + 1}`}
                                        className="h-11 rounded-xl bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium"
                                        required
                                        placeholder="cth. Matematika (Pecahan)"
                                        value={draft.subject}
                                        onChange={(e) => change(index, 'subject', e.target.value)}
                                    />
                                </div>

                                {/* Jam ke- */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Jam ke- <span className="text-brand-500">*</span>
                                    </label>
                                    <Input
                                        aria-label={`Jam jadwal ${index + 1}`}
                                        className="h-11 rounded-xl bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium"
                                        required
                                        placeholder="cth. 1-2"
                                        value={draft.period_label}
                                        onChange={(e) => change(index, 'period_label', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row Validation Issue */}
                            {issues[index] && (draft.subject.trim() || issues[index]?.includes('Maksimal')) && (
                                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                    <p role="status">{issues[index]}</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Row Button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full gap-2 rounded-xl border-dashed border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-brand-700 hover:border-brand-500 hover:bg-brand-50/50 dark:text-brand-300 dark:hover:bg-brand-950/30"
                        disabled={drafts.length >= 20}
                        onClick={() =>
                            setDrafts((items) => {
                                const lastDate = items[items.length - 1].date;
                                const combined = [...existing, ...items];
                                const sameDayCount = getSameDaySchedules(lastDate, combined).length;
                                const nextDate =
                                    sameDayCount >= MAX_ASH_PER_DAY
                                        ? findNextAvailableAshDate(lastDate, combined, undefined, semester?.end_date) || lastDate
                                        : lastDate;
                                return [
                                    ...items,
                                    {
                                        subject: '',
                                        date: nextDate,
                                        period_label: '',
                                    },
                                ];
                            })
                        }
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah baris jadwal</span>
                    </Button>
                </fieldset>

                {/* Sticky Footer Bar */}
                <div className="sticky -bottom-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 backdrop-blur-sm py-3 dark:border-slate-800 dark:bg-slate-900/95">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-900 dark:text-white">{validCount}</span> dari {drafts.length} jadwal siap disimpan
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 flex-1 sm:flex-initial rounded-xl font-semibold"
                            disabled={pending}
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="min-h-11 flex-1 sm:flex-initial rounded-xl !bg-brand-700 hover:!bg-brand-800 text-white font-bold shadow-xs"
                            disabled={pending || !canManage || issues.some(Boolean)}
                        >
                            {pending ? 'Menyimpan…' : `Simpan ${drafts.length} jadwal`}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
