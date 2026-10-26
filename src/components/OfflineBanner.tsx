import React from 'react';
import { useNativeNetwork } from '../hooks/useNativeNetwork';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { AlertTriangleIcon, RefreshCwIcon } from './Icons';

export const OfflineBanner: React.FC = () => {
  const { isConnected: isOnline } = useNativeNetwork();
  const { pendingCount, isSyncing, processQueue } = useSyncQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-16 lg:bottom-0 left-0 right-0 p-3 text-center text-xs sm:text-sm font-semibold z-40 flex items-center justify-center gap-3 animate-fade-in shadow-lg backdrop-blur-md transition-all
        ${isOnline
          ? 'bg-emerald-600/95 text-white'
          : 'bg-amber-500/95 text-amber-950 dark:bg-amber-600/95 dark:text-amber-50'
        }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <RefreshCwIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sedang menyinkronkan data ke server...' : `${pendingCount} perubahan tersimpan offline belum disinkronkan.`}</span>
          {!isSyncing && (
            <button
              type="button"
              onClick={() => processQueue()}
              className="min-h-[38px] px-3.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Sinkronkan Sekarang
            </button>
          )}
        </>
      ) : (
        <>
          <AlertTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-800 dark:text-amber-200" />
          <span>
            Mode Offline.{' '}
            {pendingCount > 0
              ? `${pendingCount} perubahan aman tersimpan di perangkat ini.`
              : 'Data dari cache tetap dapat dibaca.'}
          </span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
