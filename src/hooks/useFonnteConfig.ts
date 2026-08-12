import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { sendWhatsApp } from '../services/fonnteService';
import { useToast } from './useToast';

export interface FonnteConfig {
  adminPhone: string;
  enabled: boolean;
  dailyReportTime: string;
}

const STORAGE_KEY = 'guru_cerdas_fonnte_config';
const DEFAULT_CONFIG: FonnteConfig = {
  adminPhone: '',
  enabled: false,
  dailyReportTime: '17:00',
};

/**
 * Fetch Fonnte config from Supabase — readable by ANY authenticated user
 * (even non-admin) so notification dispatch works from teacher browsers.
 */
export async function fetchFonnteConfig(): Promise<FonnteConfig> {
  try {
    const { data, error } = await (supabase as any)
      .rpc('get_fonnte_config');

    if (error || !data) return DEFAULT_CONFIG;

    const raw = data as unknown as Partial<FonnteConfig>;
    if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG;

    return {
      adminPhone: raw.adminPhone || '',
      enabled: raw.enabled === true,
      dailyReportTime: raw.dailyReportTime || '17:00',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useFonnteConfig() {
  const { user } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState<FonnteConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    if (!user) return;
    fetchFonnteConfig().then(serverConfig => {
      setConfig(prev => {
        // Server adalah sumber kebenaran; cache lokal hanya mengisi yang kosong.
        // (Sebelumnya `prev` menang, sehingga config basi di localStorage
        //  menimpa config global dan berbalik saat keystroke berikutnya.)
        const merged = { ...DEFAULT_CONFIG, ...prev, ...serverConfig };
        return merged;
      });
    });
  }, [user]);

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
      return next;
    });

    // Perubahan jam kirim → sesuaikan jadwal pg_cron (WIB → UTC) via RPC admin.
    // Tanpa ini picker hanya label: jadwal cron membaca key terpisah.
    if (partial.dailyReportTime) {
      supabase
        .rpc('set_daily_report_schedule', { p_time: partial.dailyReportTime })
        .then(({ error }) => {
          if (error) console.warn('Failed to update daily report schedule', error);
        });
    }
  }, []);

  const sendTest = useCallback(async (testMessage?: string): Promise<boolean> => {
    if (!config.adminPhone) {
      toast.warning('Nomor WhatsApp admin belum diisi.');
      return false;
    }

    const result = await sendWhatsApp({
      target: config.adminPhone,
      message: testMessage || '✅ *Guru Cerdas* — Uji coba notifikasi WhatsApp berhasil! Sistem terhubung.',
    });

    if (result.ok) {
      toast.success('Pesan uji coba terkirim! Cek WhatsApp Anda.');
    } else {
      toast.error(`Gagal mengirim: ${result.error || 'Tidak diketahui'}`);
    }

    return result.ok;
  }, [config.adminPhone, toast]);

  return {
    config,
    updateConfig,
    sendTest,
    adminPhone: config.adminPhone,
    enabled: config.enabled && !!config.adminPhone,
  };
}
