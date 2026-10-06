import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { ReleaseChangeType, ReleaseNote } from '../services/releaseNotes';

const TYPE_STYLE: Record<ReleaseChangeType, { label: string; className: string }> = {
    baru: { label: 'Baru', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    peningkatan: { label: 'Lebih baik', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
    perbaikan: { label: 'Perbaikan', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
};

function formatReleaseDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return date;
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface WhatsNewDialogProps {
    isOpen: boolean;
    /** 'update': a new version is waiting; 'updated': the app was just updated. */
    mode: 'update' | 'updated';
    releases: ReleaseNote[];
    onUpdate: () => void;
    onClose: () => void;
}

export const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ isOpen, mode, releases, onUpdate, onClose }) => {
    const title = mode === 'update' ? 'Versi baru tersedia' : 'Aplikasi sudah diperbarui';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={<Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                {releases.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {mode === 'update'
                            ? 'Ada versi baru aplikasi. Perbarui sekarang untuk memakai perbaikan terbaru.'
                            : 'Anda sekarang memakai versi terbaru aplikasi.'}
                    </p>
                ) : (
                    <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
                        {releases.map((release) => (
                            <section key={release.id} aria-label={release.title || release.id}>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatReleaseDate(release.date)}</p>
                                {release.title && (
                                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{release.title}</h3>
                                )}
                                <ul className="mt-2 space-y-2">
                                    {release.changes.map((change, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[change.type].className}`}>
                                                {TYPE_STYLE[change.type].label}
                                            </span>
                                            <span className="leading-relaxed">{change.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    {mode === 'update' ? (
                        <>
                            <Button type="button" variant="ghost" onClick={onClose} className="min-h-11">
                                Nanti
                            </Button>
                            <Button type="button" variant="primary" onClick={onUpdate} className="min-h-11 gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Perbarui sekarang
                            </Button>
                        </>
                    ) : (
                        <Button type="button" variant="primary" onClick={onClose} className="min-h-11">
                            Mengerti
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
