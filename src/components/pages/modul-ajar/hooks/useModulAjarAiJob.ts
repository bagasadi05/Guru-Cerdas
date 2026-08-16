import { useState } from 'react';
import { modulAjarAiService } from '../../../../services/modulAjarAiService';
import { generateModulAjarAiContent } from '../../../../services/modulAjarAiGenerator';
import { resolveModelId } from '../../../../services/modelIdResolver';
import { generateAiFingerprint } from '../utils/aiFingerprint';
import { FormState } from '../types';

export type QueueStatus = 'idle' | 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed';

export function useModulAjarAiJob(
  formState: FormState,
  onSuccess: (resultJson: any, message: string) => void,
  onError: (errorMsg: string) => void
) {
  const [jobStatus, setJobStatus] = useState<QueueStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFingerprint = async () => {
    if (!formState.mataPelajaran || !formState.topik) return '';
    const resolvedModelId = await resolveModelId(formState.selectedModelId);
    return generateAiFingerprint({
      mapel: formState.mataPelajaran,
      fase: formState.fase,
      topik: formState.topik,
      modelUuid: resolvedModelId || 'unknown'
    });
  };

  const startJob = async () => {
    if (isSubmitting || jobStatus === 'processing' || jobStatus === 'pending') return;

    if (!formState.mataPelajaran?.trim() || !formState.topik?.trim()) {
      onError('Mata pelajaran dan topik wajib diisi terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setJobStatus('processing');

    try {
      // 1. Check verified cache in bank data first
      const fingerprint = await getFingerprint();
      if (fingerprint) {
        try {
          const hasCache = await modulAjarAiService.checkCacheHit(fingerprint);
          if (hasCache) {
            setJobStatus('completed');
            setIsSubmitting(false);
            onSuccess(null, 'Data modul ajar terverifikasi tersedia di database!');
            return;
          }
        } catch {
          // Cache check is non-blocking, proceed to direct generation
        }
      }

      // 2. Direct real-time AI Generation
      const aiResult = await generateModulAjarAiContent(
        formState.mataPelajaran.trim(),
        formState.topik.trim(),
        formState.fase || 'A',
        formState.modelPembelajaran,
        formState.metodePembelajaran,
        (cacheWarning) => {
          console.warn('[AI Cache Notice]:', cacheWarning);
        }
      );

      setJobStatus('completed');
      onSuccess(aiResult, 'Modul Ajar berhasil disusun oleh AI!');
    } catch (e: any) {
      console.error('[AI Modul Ajar] Generation error:', e);
      setJobStatus('failed');
      const msg = e.message || 'Gagal menyusun modul ajar dengan AI. Silakan coba lagi.';
      setErrorMessage(msg);
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    jobStatus,
    startJob,
    errorMessage,
    isSubmitting,
    resetJob: () => {
      setJobStatus('idle');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  };
}
