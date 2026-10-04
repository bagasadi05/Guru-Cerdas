import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { hasQueuedGrades, syncQueuedGrades } from '../services/queuedGradeSync';

const joinLabels = (labels: string[]) => labels.length <= 2
    ? labels.join(' dan ')
    : `${labels.slice(0, 2).join(', ')}, dan ${labels.length - 2} lainnya`;

/**
 * Sends grade saves made offline as soon as the device is back online, on
 * any page of the teacher app — not only while Input Massal is open.
 */
export function useQueuedGradeSync() {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const run = async () => {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            if (!hasQueuedGrades(user.id)) return;
            const result = await syncQueuedGrades(user);
            if (cancelled) return;
            if (result.saved.length > 0) {
                toast.success(`Nilai yang disimpan saat offline sudah terkirim: ${joinLabels(result.saved)}.`);
                queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
                queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
            }
            if (result.needsReview.length > 0) {
                toast.warning(`Nilai ${joinLabels(result.needsReview)} belum terkirim karena perlu ditinjau. Buka Input Massal, pilih penilaiannya, lalu tekan Simpan.`);
            }
        };

        const onVisible = () => { if (document.visibilityState === 'visible') run(); };
        run();
        window.addEventListener('online', run);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            window.removeEventListener('online', run);
            document.removeEventListener('visibilitychange', onVisible);
        };
        // Re-run only when the account changes; toast and queryClient are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
}
