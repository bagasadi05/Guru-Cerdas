import React from 'react';
import { Button } from '../../../ui/Button';
import { InputMode } from '../types';

interface MassInputDraftBannerProps {
    mode: InputMode | null;
    offlineSaveState?: 'queued' | 'review' | null;
    offlineSaveMessage?: string | null;
    isQueuedSaveCurrent?: boolean;
    restoredDraft?: { savedAt: string | null; count: number } | null;
    isDirty: boolean;
    assessmentName?: string;
    onDiscardRestoredDraft?: () => void;
}

const formatDraftTime = (iso: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const sameDay = date.toDateString() === new Date().toDateString();
    return date.toLocaleString('id-ID', sameDay
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const MassInputDraftBanner: React.FC<MassInputDraftBannerProps> = ({
    mode,
    offlineSaveState,
    offlineSaveMessage,
    isQueuedSaveCurrent,
    restoredDraft,
    isDirty,
    assessmentName,
    onDiscardRestoredDraft,
}) => {
    if (mode !== 'subject_grade' || (!offlineSaveState && (!restoredDraft || !isDirty))) {
        return null;
    }

    return (
        <div
            role="status"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100"
        >
            <p>
                {offlineSaveState === 'review' ? (
                    <>
                        <span className="font-bold">Nilai belum terkirim.</span>{' '}
                        {offlineSaveMessage
                            ? `Penyimpanan offline ditolak: ${offlineSaveMessage} Periksa nilainya, lalu tekan Simpan lagi.`
                            : 'Sebagian nilai sudah diubah dari perangkat lain sejak Anda menyimpan offline. Tekan Simpan untuk melihat perbedaannya.'}
                    </>
                ) : offlineSaveState === 'queued' ? (
                    <>
                        <span className="font-bold">Menunggu koneksi.</span>{' '}
                        Nilai untuk {assessmentName || 'penilaian ini'} tersimpan di perangkat ini dan dikirim otomatis begitu online.
                        {!isQueuedSaveCurrent && ' Perubahan setelah itu belum ikut; tekan Simpan lagi untuk menyertakannya.'}
                    </>
                ) : (
                    <>
                        <span className="font-bold">Draf belum disimpan.</span>{' '}
                        {restoredDraft?.count} nilai untuk {assessmentName || 'penilaian ini'} dimuat dari perangkat ini
                        {formatDraftTime(restoredDraft?.savedAt ?? null) ? ` (terakhir diubah ${formatDraftTime(restoredDraft?.savedAt ?? null)})` : ''}.
                        {' '}Tekan Simpan agar nilainya tercatat.
                    </>
                )}
            </p>
            {onDiscardRestoredDraft && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDiscardRestoredDraft}
                    className="rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
                >
                    Buang draf
                </Button>
            )}
        </div>
    );
};
