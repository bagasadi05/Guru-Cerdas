import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { DownloadCloudIcon } from './Icons';
import { Share, PlusSquare, X } from 'lucide-react';
import { isIOSPWAInstalled } from '../utils/pushSubscription';

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
    // 1. Check if user dismissed prompt previously
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
      return;
    }

    // 2. Check for iOS (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      return; // Do not register beforeinstallprompt on iOS
    }

    // 3. Android/Chrome native prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
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
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-lg z-popover animate-slide-up">
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 dark:from-purple-600 dark:to-blue-600 backdrop-blur-xl text-white rounded-2xl shadow-[0_10px_40px_rgba(2,132,199,0.3)] dark:shadow-[0_10px_40px_rgba(147,51,234,0.3)] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-white/20">
        
        {/* iOS Prompt Variant */}
        {isIOSPrompt ? (
          <div className="flex flex-col w-full">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DownloadCloudIcon className="w-6 h-6"/>
                </div>
                <div>
                  <p className="font-bold text-base">Install Aplikasi Portal Guru</p>
                  <p className="text-xs text-white/90 mt-0.5">Agar bekerja offline tanpa Safari</p>
                </div>
              </div>
              <button type="button" onClick={handleDismiss} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            
            <div className="bg-black/20 rounded-xl p-3 mt-2 text-sm text-white flex items-center gap-2">
              <span>Tap ikon</span> 
              <Share className="w-4 h-4 mx-0.5 text-sky-200" /> 
              <span>(Share) di bawah layar, lalu pilih</span>
              <PlusSquare className="w-4 h-4 mx-0.5 text-sky-200" />
              <span className="font-semibold">Add to Home Screen</span>
            </div>
          </div>
        ) : (
          /* Android / Native Prompt Variant */
          <>
            <div className="flex items-center gap-3 flex-1 w-full">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DownloadCloudIcon className="w-6 h-6"/>
              </div>
              <div className="flex-grow min-w-0 pr-4">
                <p className="font-bold text-base leading-tight">Install Aplikasi Portal Guru</p>
                <p className="text-xs sm:text-sm text-white/90 mt-1 leading-snug">Akses super cepat, bekerja offline, notifikasi instan</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-white/20">Nanti</Button>
                <Button size="sm" onClick={handleInstallClick} className="flex-1 sm:flex-none bg-white text-sky-600 dark:text-purple-600 hover:bg-white/90 font-semibold shadow-md">Install</Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default PwaPrompt;
