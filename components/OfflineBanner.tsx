import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { AlertTriangleIcon, RefreshCwIcon } from './Icons';

const OfflineBanner: React.FC = () => {
  const isOnline = useOfflineStatus();
  const { pendingCount, isSyncing, processQueue } = useSyncQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-3 text-center text-sm font-semibold z-50 flex items-center justify-center gap-3 animate-fade-in shadow-lg
        ${isOnline
          ? 'bg-indigo-600 text-white'
          : 'bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-black'
        }`}
      role="status"
    >
      {isOnline ? (
        <>
          <RefreshCwIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sedang menyinkronkan data...' : `${pendingCount} perubahan belum disinkronkan.`}</span>
          {!isSyncing && (
            <button
              onClick={() => processQueue()}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors"
            >
              Sinkronkan Sekarang
            </button>
          )}
        </>
      ) : (
        <>
          <AlertTriangleIcon className="w-5 h-5" />
          <span>Anda sedang offline. {pendingCount > 0 ? `${pendingCount} perubahan tersimpan lokal.` : 'Beberapa fitur mungkin dinonaktifkan.'}</span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
