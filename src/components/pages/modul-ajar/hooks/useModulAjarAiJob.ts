import type { ModulAiUsage } from '../../../../services/modulAjarAiCache';
import { useEffect, useRef, useState } from 'react';
import { generateModulAjarAiContent, type ModulAjarPromptContext } from '../../../../services/modulAjarAiGenerator';
import { FormState } from '../types';

export type QueueStatus = 'idle' | 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed';

export function useModulAjarAiJob(
  formState: FormState,
  /** May be async; a rejection is reported through onError like a generation failure. */
  onSuccess: (resultJson: any, message: string, signal?: AbortSignal) => void | Promise<void>,
  onError: (errorMsg: string) => void,
  /** Teacher choices sent along with the prompt (class, CP, objectives, KBC). */
  getPromptContext?: () => ModulAjarPromptContext,
  onUsage?: (usage: ModulAiUsage) => void,
  onWarning?: (message: string) => void
) {
  const [jobStatus, setJobStatus] = useState<QueueStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** When the running job started (ms), for the elapsed time shown to the teacher. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // Each start gets a number; cancelling bumps it so a late answer is ignored.
  const runIdRef = useRef(0);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { controllerRef.current?.abort(); runIdRef.current++; }, []);
  const startJob = async (cachePolicy: 'reuse' | 'refresh' = 'reuse') => {
    if (controllerRef.current) return;
    if (isSubmitting || jobStatus === 'processing' || jobStatus === 'pending') return;

    if (!formState.mataPelajaran?.trim() || !formState.topik?.trim()) {
      onError('Mata pelajaran dan topik wajib diisi terlebih dahulu.');
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    const runId = ++runIdRef.current;
    const isCancelled = () => runId !== runIdRef.current;
    setIsSubmitting(true);
    setErrorMessage(null);
    setJobStatus('processing');
    setStartedAt(Date.now());

    try {
      // Fresh requests use the full teacher context and current validation contract.
      const aiResult = await generateModulAjarAiContent(
        formState.mataPelajaran.trim(),
        formState.topik.trim(),
        formState.fase || 'A',
        formState.modelPembelajaran,
        formState.metodePembelajaran,
        (cacheWarning) => {
          if (!isCancelled()) onError(cacheWarning);
        },
        { ...getPromptContext?.(), ...(cachePolicy === 'refresh' ? { reusableContent: undefined } : {}) },
        { cachePolicy, signal: controller.signal, onUsage, onWarning: warning => { if (!isCancelled()) (onWarning ?? onError)(warning); } }
      );
      if (isCancelled()) return;

      // Saving the document happens in onSuccess; only a saved document is "completed".
      await onSuccess(aiResult, 'Modul Ajar berhasil disusun oleh AI!', controller.signal);
      if (isCancelled()) return;
      setJobStatus('completed');
    } catch (e: any) {
      if (isCancelled()) return;
      console.error('[AI Modul Ajar] Generation error:', e);
      setJobStatus('failed');
      const msg = e.message || 'Gagal menyusun modul ajar dengan AI. Silakan coba lagi.';
      setErrorMessage(msg);
      onError(msg);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (!isCancelled()) {
        setIsSubmitting(false);
        setStartedAt(null);
      }
    }
  };

  /** Aborts pending requests and prevents later pipeline stages. */
  const cancelJob = () => {
    runIdRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setJobStatus('idle');
    setIsSubmitting(false);
    setStartedAt(null);
  };

  return {
    jobStatus,
    startJob,
    cancelJob,
    startedAt,
    errorMessage,
    isSubmitting,
    resetJob: () => {
      cancelJob();
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  };
}
