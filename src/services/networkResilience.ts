/**
 * Network Resilience Service
 * 
 * This module provides comprehensive network resilience features including:
 * - Exponential backoff retry logic
 * - Request queuing for offline scenarios
 * - Network status monitoring and user feedback
 * - Configurable timeout and retry policies for different request types
 * 
 * @module services/networkResilience
 * @since 2.0.0
 */

import { logger } from './logger';
import React from 'react';
import { errorReporter } from './errorHandling';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface NetworkRequestOptions extends Omit<RequestInit, 'priority'> {
  retries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  timeout?: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  queueWhenOffline?: boolean;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: NetworkRequestOptions;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  resolve: (value: Response) => void;
  reject: (reason: Error) => void;
}

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  retryCondition: (error: Error, attempt: number) => boolean;
}

// ============================================
// DEFAULT RETRY POLICIES
// ============================================

export const DEFAULT_RETRY_POLICIES: Record<string, RetryPolicy> = {
  default: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    exponentialBase: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Retry on network errors, timeouts, and 5xx server errors
      return error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.message.includes('timeout') ||
        (error as any).status >= 500;
    }
  },

  critical: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 16000,
    exponentialBase: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      return error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.message.includes('timeout') ||
        (error as any).status >= 500;
    }
  },

  background: {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      return error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        (error as any).status >= 500;
    }
  },

  realtime: {
    maxRetries: 1,
    initialDelay: 200,
    maxDelay: 1000,
    exponentialBase: 2,
    jitter: false,
    retryCondition: (error: Error) => {
      return error.name === 'TypeError' ||
        error.message.includes('fetch');
    }
  }
};

// ============================================
// NETWORK RESILIENCE SERVICE
// ============================================

class NetworkResilienceService {
  private requestQueue: QueuedRequest[] = [];
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine };
  private statusListeners: ((status: NetworkStatus) => void)[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeNetworkMonitoring();
    this.startQueueProcessor();
  }

  // ============================================
  // NETWORK STATUS MONITORING
  // ============================================

  private initializeNetworkMonitoring(): void {
    // Basic online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Enhanced network information (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.updateNetworkInfo(connection);
        connection.addEventListener('change', () => {
          this.updateNetworkInfo(connection);
        });
      }
    }

    // Initial status update
    this.updateNetworkStatus();
  }

  private handleOnline(): void {
    logger.info('Network connection restored', 'NetworkResilience');
    this.updateNetworkStatus();
    this.processQueue();
  }

  private handleOffline(): void {
    logger.warn('Network connection lost', 'NetworkResilience');
    this.updateNetworkStatus();
  }

  private updateNetworkInfo(connection: any): void {
    this.networkStatus = {
      ...this.networkStatus,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
    this.notifyStatusListeners();
  }

  private updateNetworkStatus(): void {
    this.networkStatus = {
      ...this.networkStatus,
      isOnline: navigator.onLine
    };
    this.notifyStatusListeners();
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Subscribe to network status changes
   */
  public onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.statusListeners.push(callback);
    // Immediately call with current status
    callback(this.networkStatus);

    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Enhanced fetch with retry logic and offline queuing
   */
  public async fetch(url: string, options: NetworkRequestOptions = {}): Promise<Response> {
    const {
      retries = DEFAULT_RETRY_POLICIES.default.maxRetries,
      retryDelay = DEFAULT_RETRY_POLICIES.default.initialDelay,
      maxRetryDelay = DEFAULT_RETRY_POLICIES.default.maxDelay,
      timeout = 30000,
      exponentialBackoff = true,
      retryCondition = DEFAULT_RETRY_POLICIES.default.retryCondition,
      onRetry,
      priority = 'normal',
      queueWhenOffline = true,
      ...fetchOptions
    } = options;

    // If offline and queuing is enabled, add to queue
    if (!this.networkStatus.isOnline && queueWhenOffline) {
      return this.queueRequest(url, options);
    }

    // Execute request with retry logic
    return this.executeWithRetry(url, {
      ...fetchOptions,
      retries,
      retryDelay,
      maxRetryDelay,
      timeout,
      exponentialBackoff,
      retryCondition,
      onRetry,
      priority
    });
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  private async executeWithRetry(url: string, options: NetworkRequestOptions): Promise<Response> {
    const {
      retries = 3,
      retryDelay = 1000,
      maxRetryDelay = 8000,
      timeout = 30000,
      exponentialBackoff = true,
      retryCondition = DEFAULT_RETRY_POLICIES.default.retryCondition,
      onRetry,
      priority,
      ...fetchOptions
    } = options;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).response = response;
          throw error;
        }

        // Success - log if this was a retry
        if (attempt > 0) {
          logger.info(`Request succeeded after ${attempt} retries`, 'NetworkResilience', {
            url,
            attempt,
            status: response.status
          });
        }

        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Log the error
        errorReporter.report(lastError, {
          component: 'NetworkResilience',
          action: 'fetch',
          metadata: { url, attempt, maxRetries: retries }
        });

        // Check if we should retry
        if (attempt < retries && retryCondition(lastError, attempt)) {
          const delay = this.calculateRetryDelay(attempt, retryDelay, maxRetryDelay, exponentialBackoff);

          logger.warn(`Request failed, retrying in ${delay}ms`, 'NetworkResilience', {
            url,
            attempt: attempt + 1,
            totalRetries: retries,
            error: lastError.message
          });

          // Call retry callback if provided
          onRetry?.(attempt + 1, lastError, delay);

          // Wait before retry
          await this.delay(delay);
        } else {
          // No more retries or error is not retryable
          break;
        }
      }
    }

    // All retries exhausted
    logger.error(`Request failed after ${retries} retries`, 'NetworkResilience', {
      url,
      error: lastError.message
    });

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    exponentialBackoff: boolean
  ): number {
    let delay = baseDelay;

    if (exponentialBackoff) {
      delay = baseDelay * Math.pow(2, attempt);
    }

    // Apply jitter (±25% randomization)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;

    // Ensure delay doesn't exceed maximum
    return Math.min(delay, maxDelay);
  }

  /**
   * Queue request for later execution when offline
   */
  private queueRequest(url: string, options: NetworkRequestOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: crypto.randomUUID(),
        url,
        options,
        timestamp: Date.now(),
        priority: options.priority || 'normal',
        retryCount: 0,
        maxRetries: options.retries || 3,
        resolve,
        reject
      };

      // Insert based on priority
      this.insertByPriority(queuedRequest);

      logger.info('Request queued for offline execution', 'NetworkResilience', {
        url,
        priority: queuedRequest.priority,
        queueSize: this.requestQueue.length
      });
    });
  }

  /**
   * Insert request into queue based on priority
   */
  private insertByPriority(request: QueuedRequest): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const requestPriority = priorityOrder[request.priority];

    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuedPriority = priorityOrder[this.requestQueue[i].priority];
      if (requestPriority < queuedPriority) {
        insertIndex = i;
        break;
      }
    }

    this.requestQueue.splice(insertIndex, 0, request);
  }

  /**
   * Process queued requests when network is available
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.networkStatus.isOnline || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    logger.info(`Processing ${this.requestQueue.length} queued requests`, 'NetworkResilience');

    const processedRequests: string[] = [];

    while (this.requestQueue.length > 0 && this.networkStatus.isOnline) {
      const request = this.requestQueue.shift()!;

      try {
        const response = await this.executeWithRetry(request.url, request.options);
        request.resolve(response);
        processedRequests.push(request.id);

        logger.info('Queued request processed successfully', 'NetworkResilience', {
          url: request.url,
          queuedAt: new Date(request.timestamp).toISOString()
        });

      } catch (error) {
        request.retryCount++;

        if (request.retryCount < request.maxRetries) {
          // Re-queue for retry
          this.insertByPriority(request);
          logger.warn('Queued request failed, re-queuing for retry', 'NetworkResilience', {
            url: request.url,
            retryCount: request.retryCount,
            maxRetries: request.maxRetries
          });
        } else {
          // Max retries reached, reject the promise
          request.reject(error instanceof Error ? error : new Error('Unknown error'));
          logger.error('Queued request failed after max retries', 'NetworkResilience', {
            url: request.url,
            retryCount: request.retryCount
          });
        }
      }

      // Small delay between requests to avoid overwhelming the server
      await this.delay(100);
    }

    this.isProcessingQueue = false;

    if (processedRequests.length > 0) {
      logger.info(`Processed ${processedRequests.length} queued requests`, 'NetworkResilience');
    }
  }

  /**
   * Start the queue processor that runs periodically
   */
  private startQueueProcessor(): void {
    // Process queue every 30 seconds when online
    setInterval(() => {
      if (this.networkStatus.isOnline) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): { total: number; byPriority: Record<string, number> } {
    const byPriority = { critical: 0, high: 0, normal: 0, low: 0 };

    this.requestQueue.forEach(request => {
      byPriority[request.priority]++;
    });

    return {
      total: this.requestQueue.length,
      byPriority
    };
  }

  /**
   * Clear the request queue
   */
  public clearQueue(): void {
    // Reject all pending requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });

    this.requestQueue = [];
    logger.info('Request queue cleared', 'NetworkResilience');
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a fetch wrapper with predefined retry policy
   */
  public createFetchWrapper(policyName: keyof typeof DEFAULT_RETRY_POLICIES) {
    const policy = DEFAULT_RETRY_POLICIES[policyName];

    return (url: string, options: Omit<NetworkRequestOptions, keyof RetryPolicy> = {}) => {
      return this.fetch(url, {
        ...options,
        retries: policy.maxRetries,
        retryDelay: policy.initialDelay,
        maxRetryDelay: policy.maxDelay,
        exponentialBackoff: true,
        retryCondition: policy.retryCondition
      });
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const networkResilience = new NetworkResilienceService();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Enhanced fetch with default retry policy
 */
export const resilientFetch = (url: string, options?: NetworkRequestOptions) => {
  return networkResilience.fetch(url, options);
};

/**
 * Create specialized fetch functions for different use cases
 */
export const criticalFetch = networkResilience.createFetchWrapper('critical');
export const backgroundFetch = networkResilience.createFetchWrapper('background');
export const realtimeFetch = networkResilience.createFetchWrapper('realtime');

/**
 * Hook for React components to monitor network status
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState<NetworkStatus>(networkResilience.getNetworkStatus());

  React.useEffect(() => {
    return networkResilience.onStatusChange(setStatus);
  }, []);

  return status;
};

// Note: React import will be added when this is used in a React component context


export default networkResilience;