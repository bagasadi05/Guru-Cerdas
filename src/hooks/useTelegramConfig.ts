import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { sendTelegram } from '../services/telegramService';
import { useToast } from './useToast';

export interface TelegramConfig {
  chatId: string;
  enabled: boolean;
  dailyReportTime: string;
}

const STORAGE_KEY = 'guru_cerdas_telegram_config';
const DEFAULT_CONFIG: TelegramConfig = {
  chatId: '',
  enabled: false,
  dailyReportTime: '17:00',
};

/**
 * Fetch Telegram config from Supabase — global app_config (bukan per-user).
 * RPC get_telegram_config() di-gate ke admin / service_role / postgres;
 * hook ini hanya dipakai di halaman admin (TelegramNotificationTab).
 */
export async function fetchTelegramConfig(): Promise<TelegramConfig> {
  try {
    const { data, error } = await (supabase as any)
      .rpc('get_telegram_config');

    if (error || !data) return DEFAULT_CONFIG;

    const raw = data as unknown as Partial<TelegramConfig>;
    if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG;

    return {
      chatId: raw.chatId || '',
      enabled: raw.enabled === true,
      dailyReportTime: raw.dailyReportTime || '17:00',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useTelegramConfig() {
  const { user } = useAuth();
  const toast = useToast();

  const [config, setConfig] = useState<TelegramConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Ref untuk config terbaru agar callback stabil (tanpa dependency state)
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Muat config dari server saat user tersedia
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchTelegramConfig().then(serverConfig => {
      if (!active) return;
      setConfig(prev => ({ ...DEFAULT_CONFIG, ...prev, ...serverConfig }));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const updateConfig = useCallback((partial: Partial<TelegramConfig>) => {
    // Hitung state baru sekali, lalu pakai untuk localStorage + RPC persist
    const next = { ...configRef.current, ...partial };
    configRef.current = next;
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Persist ke app_config (global) via RPC security definer
    supabase
      .rpc('set_app_config', {
        p_key: 'telegram_config',
        p_value: JSON.stringify(next),
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to sync telegram config to Supabase', error);
      });

    // Perubahan jam kirim → sesuaikan jadwal pg_cron (WIB → UTC) via RPC admin.
    if (partial.dailyReportTime) {
      supabase
        .rpc('set_daily_report_schedule', { p_time: partial.dailyReportTime })
        .then(({ error }) => {
          if (error) console.warn('Failed to update daily report schedule', error);
        });
    }
  }, []);

  const sendTest = useCallback(async (testMessage?: string): Promise<boolean> => {
    if (!config.chatId) {
      toast.warning('Telegram chat ID belum diisi.');
      return false;
    }

    const result = await sendTelegram({
      chatId: config.chatId,
      message: testMessage || '✅ *Guru Cerdas* — Uji coba notifikasi Telegram berhasil! Sistem terhubung.',
    });

    if (result.ok) {
      toast.success('Pesan uji coba terkirim! Cek Telegram Anda.');
    } else {
      toast.error(`Gagal mengirim: ${result.error || 'Tidak diketahui'}`);
    }

    return result.ok;
  }, [config.chatId, toast]);

  const triggerDailyReport = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-report', {
        body: { force: true },
      });

      if (!error && data?.success !== false) {
        toast.success(data?.message || 'Laporan harian berhasil dikirim ke Telegram!');
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
    chatId: config.chatId,
    enabled: config.enabled && !!config.chatId,
  };
}
