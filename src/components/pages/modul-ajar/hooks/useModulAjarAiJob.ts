import { useState } from 'react';
import { modulAjarAiService } from '../../../../services/modulAjarAiService';
import { generateModulAjarAiContent, type ModulAjarPromptContext } from '../../../../services/modulAjarAiGenerator';
import { resolveModelId } from '../../../../services/modelIdResolver';
import { generateAiFingerprint } from '../utils/aiFingerprint';
import { FormState } from '../types';

export type QueueStatus = 'idle' | 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed';

export function useModulAjarAiJob(
  formState: FormState,
  /** May be async; a rejection is reported through onError like a generation failure. */
  onSuccess: (resultJson: any, message: string) => void | Promise<void>,
  onError: (errorMsg: string) => void,
  /** Teacher choices sent along with the prompt (class, CP, objectives, KBC). */
  getPromptContext?: () => ModulAjarPromptContext
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
      let hasCache = false;
      if (fingerprint) {
        try {
          hasCache = await modulAjarAiService.checkCacheHit(fingerprint);
        } catch {
          // Cache check is non-blocking, proceed to direct generation
        }
      }
      if (hasCache) {
        // Outside the cache-check try: a failed save must reach onError.
        await onSuccess(null, 'Data modul ajar terverifikasi tersedia di database!');
        setJobStatus('completed');
        return;
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
        },
        getPromptContext?.()
      );

      // Saving the document happens in onSuccess; only a saved document is "completed".
      await onSuccess(aiResult, 'Modul Ajar berhasil disusun oleh AI!');
      setJobStatus('completed');
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
