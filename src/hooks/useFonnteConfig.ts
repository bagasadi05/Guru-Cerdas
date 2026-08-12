import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { sendWhatsApp } from '../services/fonnteService';
import { useToast } from './useToast';

export interface FonnteConfig {
  adminPhone: string;
  enabled: boolean;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
}

const STORAGE_KEY = 'guru_cerdas_fonnte_config';
const DEFAULT_CONFIG: FonnteConfig = {
  adminPhone: '',
  enabled: false,
  dailyReportEnabled: true,
  dailyReportTime: '17:00',
};

/**
 * Fetch Fonnte config from Supabase — usable by ANY authenticated user
 * (even non-admin) so that notification dispatch works from teacher browsers.
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
      dailyReportEnabled: raw.dailyReportEnabled !== false,
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
        const merged = { ...DEFAULT_CONFIG, ...serverConfig, ...prev };
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
