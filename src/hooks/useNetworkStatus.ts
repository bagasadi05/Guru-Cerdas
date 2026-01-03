/**
 * Network Status Hook
 * 
 * React hook for monitoring network status and connection quality.
 * Provides real-time updates on network connectivity, connection type,
 * and quality metrics.
 * 
 * @module hooks/useNetworkStatus
 * @since 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { networkResilience, NetworkStatus } from '../services/networkResilience';
import { logger } from '../services/logger';

// ============================================
// TYPES
// ============================================

export interface NetworkQuality {
  level: 'excellent' | 'good' | 'poor' | 'offline';
  description: string;
  color: string;
}

export interface ConnectionInfo extends NetworkStatus {
  quality: NetworkQuality;
  isSlowConnection: boolean;
  isSaveDataEnabled: boolean;
}

// ============================================
// NETWORK STATUS HOOK
// ============================================

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(networkResilience.getNetworkStatus());
  const [connectionHistory, setConnectionHistory] = useState<boolean[]>([]);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null);

  // Update connection history
  useEffect(() => {
    setConnectionHistory(prev => {
      const newHistory = [...prev, status.isOnline];
      // Keep only last 10 status changes
      return newHistory.slice(-10);
    });

    if (status.isOnline) {
      setLastOnlineTime(new Date());
    } else {
      setLastOfflineTime(new Date());
    }
  }, [status.isOnline]);

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = networkResilience.onStatusChange((newStatus) => {
      setStatus(newStatus);
      
      // Log significant status changes
      if (newStatus.isOnline !== status.isOnline) {
        logger.info(
          `Network status changed: ${newStatus.isOnline ? 'online' : 'offline'}`,
          'useNetworkStatus',
          { 
            previousStatus: status.isOnline,
            newStatus: newStatus.isOnline,
            effectiveType: newStatus.effectiveType,
            rtt: newStatus.rtt,
            downlink: newStatus.downlink
          }
        );
      }
    });

    return unsubscribe;
  }, [status.isOnline]);

  // Calculate network quality
  const getNetworkQuality = useCallback((): NetworkQuality => {
    if (!status.isOnline) {
      return {
        level: 'offline',
        description: 'Tidak ada koneksi',
        color: 'text-red-500'
      };
    }

    // If we have connection info, use it
    if (status.effectiveType) {
      switch (status.effectiveType) {
        case '4g':
          return {
            level: 'excellent',
            description: 'Koneksi sangat baik',
            color: 'text-green-500'
          };
        case '3g':
          return {
            level: 'good',
            description: 'Koneksi baik',
            color: 'text-blue-500'
          };
        case '2g':
        case 'slow-2g':
          return {
            level: 'poor',
            description: 'Koneksi lambat',
            color: 'text-yellow-500'
          };
        default:
          return {
            level: 'good',
            description: 'Koneksi stabil',
            color: 'text-blue-500'
          };
      }
    }

    // Fallback to RTT-based quality if available
    if (status.rtt !== undefined) {
      if (status.rtt < 100) {
        return {
          level: 'excellent',
          description: 'Koneksi sangat baik',
          color: 'text-green-500'
        };
      } else if (status.rtt < 300) {
        return {
          level: 'good',
          description: 'Koneksi baik',
          color: 'text-blue-500'
        };
      } else {
        return {
          level: 'poor',
          description: 'Koneksi lambat',
          color: 'text-yellow-500'
        };
      }
    }

    // Default to good if online but no detailed info
    return {
      level: 'good',
      description: 'Koneksi stabil',
      color: 'text-blue-500'
    };
  }, [status]);

  // Calculate connection stability
  const getConnectionStability = useCallback((): number => {
    if (connectionHistory.length < 2) return 1;
    
    const changes = connectionHistory.reduce((count, current, index) => {
      if (index === 0) return count;
      return current !== connectionHistory[index - 1] ? count + 1 : count;
    }, 0);
    
    // Stability is inverse of change frequency
    return Math.max(0, 1 - (changes / connectionHistory.length));
  }, [connectionHistory]);

  // Check if connection is slow
  const isSlowConnection = useCallback((): boolean => {
    if (!status.isOnline) return false;
    
    // Check effective type
    if (status.effectiveType === '2g' || status.effectiveType === 'slow-2g') {
      return true;
    }
    
    // Check downlink speed (< 1 Mbps is considered slow)
    if (status.downlink !== undefined && status.downlink < 1) {
      return true;
    }
    
    // Check RTT (> 500ms is considered slow)
    if (status.rtt !== undefined && status.rtt > 500) {
      return true;
    }
    
    return false;
  }, [status]);

  // Get comprehensive connection info
  const getConnectionInfo = useCallback((): ConnectionInfo => {
    return {
      ...status,
      quality: getNetworkQuality(),
      isSlowConnection: isSlowConnection(),
      isSaveDataEnabled: status.saveData || false
    };
  }, [status, getNetworkQuality, isSlowConnection]);

  // Calculate uptime percentage
  const getUptimePercentage = useCallback((): number => {
    if (connectionHistory.length === 0) return 100;
    
    const onlineCount = connectionHistory.filter(Boolean).length;
    return (onlineCount / connectionHistory.length) * 100;
  }, [connectionHistory]);

  // Get time since last status change
  const getTimeSinceLastChange = useCallback((): string => {
    const referenceTime = status.isOnline ? lastOnlineTime : lastOfflineTime;
    if (!referenceTime) return 'Tidak diketahui';
    
    const now = new Date();
    const diffMs = now.getTime() - referenceTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} hari yang lalu`;
    } else if (diffHours > 0) {
      return `${diffHours} jam yang lalu`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} menit yang lalu`;
    } else {
      return 'Baru saja';
    }
  }, [status.isOnline, lastOnlineTime, lastOfflineTime]);

  return {
    // Basic status
    isOnline: status.isOnline,
    status,
    
    // Enhanced info
    connectionInfo: getConnectionInfo(),
    quality: getNetworkQuality(),
    stability: getConnectionStability(),
    uptimePercentage: getUptimePercentage(),
    
    // Timing info
    lastOnlineTime,
    lastOfflineTime,
    timeSinceLastChange: getTimeSinceLastChange(),
    
    // Connection characteristics
    isSlowConnection: isSlowConnection(),
    isSaveDataEnabled: status.saveData || false,
    
    // History
    connectionHistory: [...connectionHistory],
    
    // Utility methods
    refresh: () => {
      // Force a status update
      setStatus(networkResilience.getNetworkStatus());
    }
  };
}

// ============================================
// NETWORK QUALITY HOOK
// ============================================

export function useNetworkQuality() {
  const { quality, isSlowConnection, isSaveDataEnabled } = useNetworkStatus();
  
  return {
    quality,
    isSlowConnection,
    isSaveDataEnabled,
    
    // Quality-based recommendations
    shouldReduceImageQuality: isSlowConnection || isSaveDataEnabled,
    shouldDisableAutoplay: isSlowConnection || isSaveDataEnabled,
    shouldShowLowBandwidthWarning: isSlowConnection,
    recommendedImageFormat: isSlowConnection ? 'webp' : 'auto',
    recommendedVideoQuality: isSlowConnection ? '480p' : 'auto'
  };
}

// ============================================
// CONNECTION STABILITY HOOK
// ============================================

export function useConnectionStability() {
  const { stability, connectionHistory, uptimePercentage } = useNetworkStatus();
  
  const isStable = stability > 0.8;
  const isUnstable = stability < 0.5;
  
  return {
    stability,
    isStable,
    isUnstable,
    uptimePercentage,
    connectionHistory,
    
    // Stability-based recommendations
    shouldEnableOfflineMode: isUnstable,
    shouldIncreaseRetryAttempts: isUnstable,
    shouldShowStabilityWarning: isUnstable && uptimePercentage < 90
  };
}

export default useNetworkStatus;