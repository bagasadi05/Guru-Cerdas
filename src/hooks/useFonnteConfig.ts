import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { sendWhatsApp } from '../services/fonnteService';
import { useToast } from './useToast';

export interface FonnteConfig {
  adminPhone: string;
  enabled: boolean;
  notifyQuiz: boolean;
  notifyGrade: boolean;
  notifyViolation: boolean;
}

const STORAGE_KEY = 'guru_cerdas_fonnte_config';
const DEFAULT_CONFIG: FonnteConfig = {
  adminPhone: '',
  enabled: false,
  notifyQuiz: true,
  notifyGrade: true,
  notifyViolation: true,
};

function loadConfig(): FonnteConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: FonnteConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useFonnteConfig() {
  const { user } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState<FonnteConfig>(loadConfig);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateConfig = useCallback((partial: Partial<FonnteConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      saveConfig(next);
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
