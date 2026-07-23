import { supabase } from './supabase';

export interface EnqueueAiJobParams {
  requestFingerprint: string;
  inputJson: Record<string, any>;
}

export interface AiJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed' | 'cancelled';
  error_code?: string;
  error_detail?: string;
  result_json?: any;
}

export const modulAjarAiService = {
  /**
   * Cek apakah fingerprint sudah ada di cache (ref_boilerplate_topik)
   */
  async checkCacheHit(fingerprint: string): Promise<boolean> {
    const { data, error } = await (supabase as any)
      .from('ref_boilerplate_topik')
      .select('id')
      .eq('request_fingerprint', fingerprint)
      .in('content_status', ['draft_ai', 'draft_manual', 'verified'])
      .maybeSingle();

    if (error) {
      console.error('Error checking cache:', error);
      return false;
    }
    return !!data;
  },

  /**
   * Mengantrekan job baru via RPC, dan me-return job object-nya
   */
  async enqueueJob({ requestFingerprint, inputJson }: EnqueueAiJobParams): Promise<AiJobStatus | null> {
    const { data, error } = await (supabase as any).rpc('enqueue_modul_ajar_ai_job', {
      p_input_json: inputJson,
      p_request_fingerprint: requestFingerprint,
    });

    if (error) {
      console.error('Error enqueuing AI job:', error);
      throw error;
    }

    return data as AiJobStatus;
  },

  /**
   * Panggil Edge Function untuk memicu background processing segera (opsional jika cron tidak cukup cepat)
   */
  async triggerWorkerAsync(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/modul-ajar-ai-worker`;
      
      // Fire and forget (jangan di-await jika kita tak ingin memblokir UI)
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }).catch(e => console.warn('Worker trigger warning:', e));
    } catch (e) {
      console.warn('Worker trigger warning:', e);
    }
  },

  /**
   * Mengambil status terbaru job dari database
   */
  async getJobStatus(jobId: string): Promise<AiJobStatus | null> {
    const { data, error } = await (supabase as any)
      .from('ai_content_jobs')
      .select('id, status, error_code, error_detail, result_json')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job status:', error);
      return null;
    }
    return data as AiJobStatus;
  },
  
  /**
   * Mencari job aktif (pending, processing, retry_wait) yang terikat dengan fingerprint ini
   */
  async getActiveJobByFingerprint(fingerprint: string): Promise<AiJobStatus | null> {
    const { data, error } = await (supabase as any)
      .from('ai_content_jobs')
      .select('id, status, error_code, error_detail, result_json')
      .eq('request_fingerprint', fingerprint)
      .in('status', ['pending', 'processing', 'retry_wait'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) return null;
    return data as AiJobStatus;
  }
};
