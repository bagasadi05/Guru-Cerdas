import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { validatePhDraft, type PhDraft } from './engine/phScheduleValidation';

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

export function PhBatchFormModal({ className, semester, existing, initialDate, pending, canManage, onClose, onSave }: Props) {
    const [drafts, setDrafts] = useState<PhDraft[]>([{ subject: '', date: initialDate, period_label: '1-2' }]);
    const change = (index: number, key: keyof PhDraft, value: string) => setDrafts((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
    const issues = drafts.map((draft, i) => validatePhDraft(draft, semester, [...existing, ...drafts.slice(0, i)]));
    return (
        <Modal isOpen maxWidth="max-w-4xl" onClose={() => { if (!pending) onClose(); }} title={`Tambah Massal PH - ${className}`}>
            <form onSubmit={(event) => { event.preventDefault(); if (!pending && canManage && issues.every((issue) => !issue)) onSave(drafts); }} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600 dark:text-slate-300">Isi tanggal, mata pelajaran, dan jam untuk setiap PH.</p><span className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">{drafts.length} / 20 jadwal</span></div>
                <fieldset disabled={pending || !canManage} className="space-y-4">
                    {drafts.map((draft, index) => (
                        <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Jadwal {index + 1}</h3><Button type="button" variant="ghost" className="min-h-11 min-w-11 text-slate-500 hover:text-rose-600" disabled={drafts.length === 1} onClick={() => setDrafts((items) => items.filter((_, i) => i !== index))} aria-label={`Hapus baris jadwal ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px]">
                                <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"><span>Tanggal</span><Input aria-label={`Tanggal jadwal ${index + 1}`} className="min-h-11" type="date" min={semester?.start_date} max={semester?.end_date} required value={draft.date} onChange={(e) => change(index, 'date', e.target.value)} /></label>
                                <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"><span>Mata pelajaran dan materi</span><Input aria-label={`Mata pelajaran jadwal ${index + 1}`} className="min-h-11" required placeholder="Matematika (Pecahan)" value={draft.subject} onChange={(e) => change(index, 'subject', e.target.value)} /></label>
                                <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"><span>Jam ke-</span><Input aria-label={`Jam jadwal ${index + 1}`} className="min-h-11" required placeholder="1-2" value={draft.period_label} onChange={(e) => change(index, 'period_label', e.target.value)} /></label>
                            </div>
                            {issues[index] && draft.subject.trim() && <p className="text-sm text-amber-700 dark:text-amber-300" role="status">{issues[index]}</p>}
                        </div>
                    ))}
                    <Button type="button" variant="outline" className="min-h-11 w-full border-dashed" disabled={drafts.length >= 20} onClick={() => setDrafts((items) => [...items, { subject: '', date: items[items.length - 1].date, period_label: '' }])}><Plus className="h-4 w-4" />Tambah baris</Button>
                </fieldset>
                <div className="sticky -bottom-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white py-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{issues.filter((issue) => !issue).length} dari {drafts.length} jadwal siap disimpan</p><div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onClose}>Batal</Button><Button type="submit" className="min-h-11" disabled={pending || !canManage || issues.some(Boolean)}>{pending ? 'Menyimpan…' : `Simpan ${drafts.length} jadwal`}</Button></div></div>
            </form>
        </Modal>
    );
}
