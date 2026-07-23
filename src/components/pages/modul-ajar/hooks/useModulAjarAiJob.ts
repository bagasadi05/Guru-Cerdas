import { useState, useEffect, useRef } from 'react';
import { modulAjarAiService } from '../../../../services/modulAjarAiService';
import { generateAiFingerprint } from '../utils/aiFingerprint';
import { FormState } from '../types';

export type QueueStatus = 'idle' | 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed';

export function useModulAjarAiJob(
  formState: FormState,
  onSuccess: (resultJson: any, message: string) => void,
  onError: (errorMsg: string) => void
) {
  const [jobStatus, setJobStatus] = useState<QueueStatus>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  const getFingerprint = () => {
    if (!formState.mataPelajaran || !formState.topik) return '';
    return generateAiFingerprint({
      mapel: formState.mataPelajaran,
      fase: formState.fase,
      topik: formState.topik,
      modelUuid: formState.selectedModelId || 'unknown'
    });
  };

  // Recover active job on page load or when form identifiers change
  useEffect(() => {
    const fingerprint = getFingerprint();
    if (!fingerprint) return;

    let isMounted = true;
    (async () => {
      try {
        const activeJob = await modulAjarAiService.getActiveJobByFingerprint(fingerprint);
        if (activeJob && isMounted) {
          setCurrentJobId(activeJob.id);
          setJobStatus(activeJob.status as QueueStatus);
        }
      } catch (e) {
        console.warn('Error recovering job:', e);
      }
    })();

    return () => { isMounted = false; };
  }, [formState.mataPelajaran, formState.fase, formState.topik, formState.selectedModelId]);

  const startJob = async () => {
    if (isSubmitting || jobStatus === 'pending' || jobStatus === 'processing') return; // Prevent double-click
    setIsSubmitting(true);
    setErrorMessage(null);
    setJobStatus('pending');

    const fingerprint = getFingerprint();
    if (!fingerprint) {
      setIsSubmitting(false);
      setJobStatus('failed');
      onError('Mata pelajaran dan topik wajib diisi.');
      return;
    }
    
    try {
      // Check verified cache first
      const hasCache = await modulAjarAiService.checkCacheHit(fingerprint);
      if (hasCache) {
        setJobStatus('completed');
        setIsSubmitting(false);
        onSuccess(null, 'Cache hit: Data terverifikasi tersedia di database!');
        return;
      }

      // Check if there is an active job running for this fingerprint
      let job = await modulAjarAiService.getActiveJobByFingerprint(fingerprint);

      // If not, enqueue new job
      if (!job) {
        const inputJson = {
          mapel: formState.mataPelajaran,
          fase: formState.fase,
          topik: formState.topik,
          cp: formState.capaianPembelajaran,
          modelPenyampaian: formState.modelPembelajaran,
          modelUuid: formState.selectedModelId
        };

        job = await modulAjarAiService.enqueueJob({
          requestFingerprint: fingerprint,
          inputJson
        });
      }

      if (job) {
        setCurrentJobId(job.id);
        setJobStatus(job.status as QueueStatus);
        
        // Trigger worker manually to speed up cold-starts
        modulAjarAiService.triggerWorkerAsync();
      } else {
        throw new Error('Gagal membuat antrean AI.');
      }
    } catch (e: any) {
      setJobStatus('failed');
      setErrorMessage(e.message || 'Terjadi kesalahan sistem.');
      onError(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollStatus = async () => {
    if (!currentJobId) return;

    try {
      const job = await modulAjarAiService.getJobStatus(currentJobId);
      if (!job) return;

      setJobStatus(job.status as QueueStatus);

      if (job.status === 'completed') {
        stopPolling();
        onSuccess(job.result_json, 'Pembuatan Modul Ajar AI selesai!');
      } else if (job.status === 'failed' || job.status === 'cancelled') {
        stopPolling();
        const msg = job.error_detail || 'Job AI dibatalkan atau gagal diprose server.';
        setErrorMessage(msg);
        onError(msg);
      }
    } catch (err) {
      console.warn('Error polling job status:', err);
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (jobStatus === 'pending' || jobStatus === 'processing' || jobStatus === 'retry_wait') {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = window.setInterval(pollStatus, 3000);
      }
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [jobStatus, currentJobId]);

  return {
    jobStatus,
    startJob,
    errorMessage,
    isSubmitting,
    resetJob: () => {
      setJobStatus('idle');
      setCurrentJobId(null);
      setErrorMessage(null);
    }
  };
}
