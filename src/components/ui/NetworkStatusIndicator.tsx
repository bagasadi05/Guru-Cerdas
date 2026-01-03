/**
 * Network Status Indicator Component
 * 
 * Displays current network status with visual indicators and user feedback.
 * Shows connection quality, provides offline notifications, and displays
 * queue status for pending requests.
 * 
 * @module components/ui/NetworkStatusIndicator
 * @since 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNetworkStatus, useNetworkQuality } from '../../hooks/useNetworkStatus';
import { networkResilience } from '../../services/networkResilience';

// ============================================
// TYPES
// ============================================

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  showQueueStatus?: boolean;
  className?: string;
  position?: 'top' | 'bottom';
}

interface QueueStats {
  total: number;
  byPriority: Record<string, number>;
}

// ============================================
// NETWORK STATUS INDICATOR
// ============================================

export function NetworkStatusIndicator({
  showDetails = false,
  showQueueStatus = true,
  className = '',
  position = 'top'
}: NetworkStatusIndicatorProps) {
  const { isOnline, quality, connectionInfo, timeSinceLastChange } = useNetworkStatus();
  const { shouldShowLowBandwidthWarning } = useNetworkQuality();
  const [queueStats, setQueueStats] = useState<QueueStats>({ total: 0, byPriority: {} });
  const [showDetails_, setShowDetails] = useState(false);

  // Update queue stats periodically
  useEffect(() => {
    const updateQueueStats = () => {
      setQueueStats(networkResilience.getQueueStats());
    };

    updateQueueStats();
    const interval = setInterval(updateQueueStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide details after 5 seconds
  useEffect(() => {
    if (showDetails_) {
      const timer = setTimeout(() => setShowDetails(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showDetails_]);

  const getStatusIcon = () => {
    if (!isOnline) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-600 font-medium">Offline</span>
        </div>
      );
    }

    const qualityColors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      poor: 'bg-yellow-500',
      offline: 'bg-red-500'
    };

    return (
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 ${qualityColors[quality.level]} rounded-full`}></div>
        <span className={`text-xs font-medium ${quality.color}`}>
          {quality.level === 'excellent' && 'Sangat Baik'}
          {quality.level === 'good' && 'Baik'}
          {quality.level === 'poor' && 'Lambat'}
        </span>
      </div>
    );
  };

  const getConnectionBars = () => {
    const bars = [];
    const maxBars = 4;
    let activeBars = 0;

    if (isOnline) {
      switch (quality.level) {
        case 'excellent':
          activeBars = 4;
          break;
        case 'good':
          activeBars = 3;
          break;
        case 'poor':
          activeBars = 2;
          break;
        default:
          activeBars = 1;
      }
    }

    for (let i = 0; i < maxBars; i++) {
      bars.push(
        <div
          key={i}
          className={`w-1 bg-current transition-opacity duration-200 ${
            i < activeBars ? 'opacity-100' : 'opacity-30'
          }`}
          style={{ height: `${(i + 1) * 3 + 2}px` }}
        />
      );
    }

    return (
      <div className={`flex items-end space-x-0.5 ${quality.color}`}>
        {bars}
      </div>
    );
  };

  if (!isOnline && queueStats.total === 0 && !showDetails) {
    return null; // Don't show if offline with no queued requests and details not requested
  }

  return (
    <div className={`${className} ${position === 'bottom' ? 'fixed bottom-4 right-4' : ''}`}>
      {/* Main Status Indicator */}
      <div
        className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowDetails(!showDetails_)}
      >
        {getConnectionBars()}
        {getStatusIcon()}
        
        {showQueueStatus && queueStats.total > 0 && (
          <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
            <span>{queueStats.total}</span>
          </div>
        )}
      </div>

      {/* Detailed Status Panel */}
      {(showDetails || showDetails_) && (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-64 z-50">
          <div className="space-y-3">
            {/* Connection Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Status Koneksi
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`text-sm font-medium ${quality.color}`}>
                  {isOnline ? 'Terhubung' : 'Terputus'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Kualitas:</span>
                <span className={`text-sm font-medium ${quality.color}`}>
                  {quality.description}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Terakhir berubah:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {timeSinceLastChange}
                </span>
              </div>
            </div>

            {/* Technical Details */}
            {connectionInfo.effectiveType && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Detail Teknis
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tipe:</span>
                    <span className="text-gray-900 dark:text-gray-100 uppercase">
                      {connectionInfo.effectiveType}
                    </span>
                  </div>
                  {connectionInfo.downlink && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Kecepatan:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {connectionInfo.downlink.toFixed(1)} Mbps
                      </span>
                    </div>
                  )}
                  {connectionInfo.rtt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Latensi:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {connectionInfo.rtt}ms
                      </span>
                    </div>
                  )}
                  {connectionInfo.saveData && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Hemat Data:</span>
                      <span className="text-green-600 dark:text-green-400">Aktif</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Queue Status */}
            {queueStats.total > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Antrian Request
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="text-gray-900 dark:text-gray-100">{queueStats.total}</span>
                  </div>
                  {Object.entries(queueStats.byPriority).map(([priority, count]) => (
                    count > 0 && (
                      <div key={priority} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {priority}:
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Low Bandwidth Warning */}
            {shouldShowLowBandwidthWarning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2">
                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      Koneksi Lambat
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Beberapa fitur mungkin terbatas untuk menghemat bandwidth.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// OFFLINE BANNER
// ============================================

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
      !isOnline || showReconnected ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>Koneksi pulih - Data akan disinkronkan</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Tidak ada koneksi internet - Mode offline aktif</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SIMPLE STATUS DOT
// ============================================

export function NetworkStatusDot({ className = '' }: { className?: string }) {
  const { isOnline, quality } = useNetworkStatus();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    
    switch (quality.level) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'poor':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div 
      className={`w-2 h-2 rounded-full ${getStatusColor()} ${
        !isOnline ? 'animate-pulse' : ''
      } ${className}`}
      title={isOnline ? quality.description : 'Offline'}
    />
  );
}

export default NetworkStatusIndicator;