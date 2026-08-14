import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { sendWhatsApp } from '../services/fonnteService';
import { useToast } from './useToast';

export interface FonnteConfig {
  adminPhone: string;
  enabled: boolean;
  dailyReportTime: string;
  token?: string;
}

export interface FonnteDeviceStatus {
  device?: string;
  device_status?: 'connect' | 'disconnect';
  expired?: string;
  messages?: number;
  name?: string;
  package?: string;
  quota?: string | number;
  status?: boolean;
  reason?: string;
}

const STORAGE_KEY = 'guru_cerdas_fonnte_config';
const DEFAULT_CONFIG: FonnteConfig = {
  adminPhone: '',
  enabled: false,
  dailyReportTime: '17:00',
  token: '',
};


/**
 * Fetch Fonnte config from Supabase — global app_config (bukan per-user).
 * RPC get_fonnte_config() di-gate ke admin / service_role / postgres;
 * hook ini hanya dipakai di halaman admin (WhatsAppNotificationTab).
 */
export async function fetchFonnteConfig(): Promise<FonnteConfig> {
  try {
    const { data, error } = await (supabase as any)
      .rpc('get_fonnte_config');

    if (error || !data) return DEFAULT_CONFIG;

    const raw = data as unknown as Partial<FonnteConfig>;
    if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG;

    // Baca juga fonnte_token jika ada
    let serverToken = raw.token || '';
    if (!serverToken) {
      const { data: dbToken } = await (supabase as any).rpc('get_app_config', { p_key: 'fonnte_token' });
      if (typeof dbToken === 'string' && dbToken.trim()) {
        serverToken = dbToken.trim();
      }
    }

    return {
      adminPhone: raw.adminPhone || '',
      enabled: raw.enabled === true,
      dailyReportTime: raw.dailyReportTime || '17:00',
      token: serverToken,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useFonnteConfig() {
  const { user } = useAuth();
  const toast = useToast();
  const [deviceInfo, setDeviceInfo] = useState<FonnteDeviceStatus | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);

  const [config, setConfig] = useState<FonnteConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const checkDeviceStatus = useCallback(async (tokenToUse?: string): Promise<FonnteDeviceStatus | null> => {
    const token = tokenToUse || config.token;
    if (!token) return null;
    setIsCheckingDevice(true);
    try {
      const { data, error } = await supabase.functions.invoke('fonnte-proxy', {
        body: { action: 'device' },
      });

      if (!error && data) {
        const deviceData: FonnteDeviceStatus = data;
        setDeviceInfo(deviceData);
        return deviceData;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsCheckingDevice(false);
    }
  }, [config.token]);

  useEffect(() => {
    if (!user) return;
    fetchFonnteConfig().then(serverConfig => {
      setConfig(prev => {
        const merged = { ...DEFAULT_CONFIG, ...prev, ...serverConfig };
        if (merged.token) {
          checkDeviceStatus(merged.token);
        }
        return merged;
      });
    });
  }, [user, checkDeviceStatus]);

  const updateConfig = useCallback((partial: Partial<FonnteConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Persist ke app_config (global) via RPC security definer
      supabase
        .rpc('set_app_config', {
          p_key: 'fonnte_config',
          p_value: JSON.stringify(next),
        })
        .then(({ error }) => {
          if (error) console.warn('Failed to sync fonnte config to Supabase', error);
        });

      if (partial.token !== undefined) {
        supabase
          .rpc('set_app_config', {
            p_key: 'fonnte_token',
            p_value: partial.token.trim(),
          })
          .then(({ error }) => {
            if (error) console.warn('Failed to sync fonnte token to Supabase', error);
          });
        if (partial.token.trim()) {
          checkDeviceStatus(partial.token.trim());
        }
      }

      return next;
    });

    // Perubahan jam kirim → sesuaikan jadwal pg_cron (WIB → UTC) via RPC admin.
    if (partial.dailyReportTime) {
      supabase
        .rpc('set_daily_report_schedule', { p_time: partial.dailyReportTime })
        .then(({ error }) => {
          if (error) console.warn('Failed to update daily report schedule', error);
        });
    }
  }, [checkDeviceStatus]);

  const sendTest = useCallback(async (testMessage?: string): Promise<boolean> => {
    if (!config.adminPhone) {
      toast.warning('Nomor WhatsApp admin belum diisi.');
      return false;
    }

    const result = await sendWhatsApp({
      target: config.adminPhone,
      message: testMessage || '✅ *Guru Cerdas* — Uji coba notifikasi WhatsApp berhasil! Sistem terhubung.',
      token: config.token,
    });

    if (result.ok) {
      toast.success('Pesan uji coba terkirim! Cek WhatsApp Anda.');
    } else {
      toast.error(`Gagal mengirim: ${result.error || 'Tidak diketahui'}`);
    }

    return result.ok;
  }, [config.adminPhone, config.token, toast]);

  const triggerDailyReport = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-report', {
        body: { force: true },
      });

      if (!error && data?.success !== false) {
        toast.success(data?.message || 'Laporan harian berhasil dikirim ke WhatsApp!');
        return { ok: true, message: data?.message || 'Success' };
      } else {
        const errMsg = error?.message || data?.error || data?.message || 'Gagal mengirim laporan harian';
        toast.error(`Gagal mengirim laporan: ${errMsg}`);
        return { ok: false, message: errMsg };
      }
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghubungi server';
      toast.error(`Error: ${msg}`);
      return { ok: false, message: msg };
    }
  }, [toast]);

  return {
    config,
    updateConfig,
    sendTest,
    triggerDailyReport,
    checkDeviceStatus,
    deviceInfo,
    isCheckingDevice,
    adminPhone: config.adminPhone,
    enabled: config.enabled && !!config.adminPhone,
  };
}
