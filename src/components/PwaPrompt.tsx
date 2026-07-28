import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { DownloadCloudIcon } from './Icons';
import { Share, PlusSquare, X } from 'lucide-react';
import { isIOSPWAInstalled } from '../utils/pushSubscription';
import { logger } from '../services/logger';

// This is a browser event type, so we declare it for TypeScript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

const PwaPrompt: React.FC = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  
  const [isIOSPrompt] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    return isIOS && !isIOSPWAInstalled();
  });

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    return isIOS && !isIOSPWAInstalled();
  });

  useEffect(() => {
    // 0. Force show prompt if URL has ?pwa=true parameter (useful for testing/preview)
    if (typeof window !== 'undefined' && window.location.search.includes('pwa=true')) {
      sessionStorage.removeItem('pwa-prompt-dismissed');
      setIsVisible(true);
    }

    // 1. Check if user dismissed prompt previously
    if (sessionStorage.getItem('pwa-prompt-dismissed') && !window.location.search.includes('pwa=true')) {
      return;
    }

    // 2. Check for iOS (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      return; // Do not register beforeinstallprompt on iOS
    }

    // 3. Android/Chrome native prompt & custom trigger event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleForceShow = () => {
      sessionStorage.removeItem('pwa-prompt-dismissed');
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('show-pwa-prompt', handleForceShow);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('show-pwa-prompt', handleForceShow);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) {
      return;
    }
    // Show the install prompt
    installPromptEvent.prompt();
    // Wait for the user to respond to the prompt
    installPromptEvent.userChoice.then((choiceResult) => {
      logger.info(
        choiceResult.outcome === 'accepted'
          ? 'User accepted the install prompt'
          : 'User dismissed the install prompt',
        'PwaPrompt',
      );
      setInstallPromptEvent(null);
      setIsVisible(false);
    });
  };

  const handleDismiss = () => {
      setIsVisible(false);
      sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-popover flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-slide-down">
    <div className="w-full sm:w-[520px] max-w-full">
      <div className="relative overflow-hidden bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-3.5 sm:p-4.5 border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        {/* Subtle background ambient glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top right close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors z-10"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {isIOSPrompt ? (
          /* iOS Prompt Variant */
          <div className="flex flex-col gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <DownloadCloudIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-base text-white tracking-tight flex items-center gap-2">
                  Install Portal Guru
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PWA</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                  Akses super cepat & bekerja offline tanpa Safari
                </p>
              </div>
            </div>

            <div className="bg-slate-800/90 rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-slate-200 border border-slate-700/60 flex items-center flex-wrap gap-1.5 leading-relaxed">
              <span>1. Tap ikon</span>
              <span className="inline-flex items-center gap-1 bg-slate-700/80 px-1.5 py-0.5 rounded text-emerald-400 font-medium">
                <Share className="w-3.5 h-3.5" /> Share
              </span>
              <span>2. Pilih</span>
              <span className="inline-flex items-center gap-1 bg-slate-700/80 px-1.5 py-0.5 rounded text-white font-medium">
                <PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Add to Home Screen
              </span>
            </div>
          </div>
        ) : (
          /* Android / Desktop Native Prompt Variant */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pr-6 sm:pr-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                <DownloadCloudIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-base text-white tracking-tight leading-snug">Install Aplikasi Portal</h4>
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 leading-none shrink-0">PWA</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-tight truncate sm:whitespace-normal">
                  Akses cepat, kerja offline, & notifikasi instan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 px-3 py-1.5 sm:py-2 rounded-xl font-medium"
              >
                Nanti
              </Button>
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center gap-1.5"
              >
                <DownloadCloudIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Install
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export const triggerPwaInstall = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('pwa-prompt-dismissed');
    window.dispatchEvent(new Event('show-pwa-prompt'));
  }
};

export default PwaPrompt;
