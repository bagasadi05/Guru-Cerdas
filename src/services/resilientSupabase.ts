/**
 * Resilient Supabase Client
 * 
 * Enhanced Supabase client wrapper that integrates with the network resilience service
 * to provide automatic retry logic, offline queuing, and improved error handling
 * for all database operations.
 * 
 * @module services/resilientSupabase
 * @since 2.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { networkResilience, NetworkRequestOptions } from './networkResilience';
import { addToQueue } from './offlineQueue';
import { logger } from './logger';

// ============================================
// TYPES
// ============================================

interface ResilientSupabaseOptions {
  enableOfflineQueue?: boolean;
  defaultRetryPolicy?: 'default' | 'critical' | 'background' | 'realtime';
  enableNetworkResilience?: boolean;
}

interface QueryOptions extends NetworkRequestOptions {
  skipQueue?: boolean;
  cacheKey?: string;
}

// ============================================
// RESILIENT SUPABASE CLIENT
// ============================================

class ResilientSupabaseClient {
  private client: SupabaseClient<Database>;
  private options: Required<ResilientSupabaseOptions>;

  constructor(
    url: string, 
    key: string, 
    options: ResilientSupabaseOptions = {}
  ) {
    this.client = createClient<Database>(url, key);
    this.options = {
      enableOfflineQueue: true,
      defaultRetryPolicy: 'default',
      enableNetworkResilience: true,
      ...options
    };

    // Override the client's fetch function to use network resilience
    if (this.options.enableNetworkResilience) {
      this.setupNetworkResilience();
    }
  }

  // ============================================
  // NETWORK RESILIENCE SETUP
  // ============================================

  private setupNetworkResilience(): void {
    // Store original fetch
    const originalFetch = globalThis.fetch;

    // Override global fetch for Supabase requests
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if this is a Supabase request
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (url.includes(supabaseUrl)) {
        try {
          return await networkResilience.fetch(url, {
            ...init,
            priority: this.getRequestPriority(url),
            retries: this.getRetryCount(url),
            queueWhenOffline: this.options.enableOfflineQueue
          });
        } catch (error) {
          // Log the error and potentially queue for offline
          logger.error('Supabase request failed', error as Error, {
            url,
            method: init?.method || 'GET'
          });
          
          // If offline queuing is enabled and this is a mutation, queue it
          if (this.options.enableOfflineQueue && this.isMutationRequest(init?.method)) {
            await this.queueOfflineRequest(url, init);
            throw new Error('Request queued for offline processing');
          }
          
          throw error;
        }
      }
      
      // Use original fetch for non-Supabase requests
      return originalFetch(input, init);
    };
  }

  private getRequestPriority(url: string): 'low' | 'normal' | 'high' | 'critical' {
    // Authentication requests are critical
    if (url.includes('/auth/')) return 'critical';
    
    // Real-time subscriptions are high priority
    if (url.includes('/realtime')) return 'high';
    
    // File uploads are normal priority
    if (url.includes('/storage/')) return 'normal';
    
    // Analytics and logs are low priority
    if (url.includes('/analytics') || url.includes('/logs')) return 'low';
    
    // Default to normal
    return 'normal';
  }

  private getRetryCount(url: string): number {
    // Critical operations get more retries
    if (url.includes('/auth/')) return 5;
    
    // Real-time gets fewer retries (fail fast)
    if (url.includes('/realtime')) return 1;
    
    // Default retry count
    return 3;
  }

  private isMutationRequest(method?: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase() || '');
  }

  private async queueOfflineRequest(url: string, init?: RequestInit): Promise<void> {
    try {
      // Parse the request to extract table and operation info
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Extract table name (assuming /rest/v1/table_name pattern)
      const tableIndex = pathParts.indexOf('rest') + 2;
      const tableName = pathParts[tableIndex];
      
      if (!tableName) return;

      // Determine operation type
      let operation: 'upsert' | 'insert' | 'update' | 'delete' = 'insert';
      const method = init?.method?.toUpperCase();
      
      switch (method) {
        case 'POST':
          operation = urlObj.searchParams.has('on_conflict') ? 'upsert' : 'insert';
          break;
        case 'PATCH':
          operation = 'update';
          break;
        case 'DELETE':
          operation = 'delete';
          break;
      }

      // Extract payload from request body
      let payload = {};
      if (init?.body) {
        try {
          payload = JSON.parse(init.body as string);
        } catch (e) {
          logger.warn('Failed to parse request body for offline queue', e as Error);
        }
      }

      // Add to offline queue
      await addToQueue({
        table: tableName as keyof Database['public']['Tables'],
        operation,
        payload,
        onConflict: urlObj.searchParams.get('on_conflict') || undefined
      });

      logger.info('Request queued for offline processing', 'ResilientSupabase', {
        table: tableName,
        operation,
        url
      });

    } catch (error) {
      logger.error('Failed to queue offline request', error as Error, { url });
    }
  }

  // ============================================
  // ENHANCED QUERY METHODS
  // ============================================

  /**
   * Enhanced from() method with retry and offline support
   */
  public from<T extends keyof Database['public']['Tables']>(
    table: T,
    options: QueryOptions = {}
  ) {
    const baseQuery = this.client.from(table);
    
    // Return enhanced query builder
    return {
      ...baseQuery,
      
      // Override select with caching support
      select: (columns?: string, options_?: { count?: 'exact' | 'planned' | 'estimated' }) => {
        const query = baseQuery.select(columns, options_);
        
        // Add caching metadata
        if (options.cacheKey) {
          (query as any)._cacheKey = options.cacheKey;
        }
        
        return query;
      },
      
      // Override insert with offline queue support
      insert: async (values: any, options_?: { count?: 'exact' | 'planned' | 'estimated' }) => {
        try {
          return await baseQuery.insert(values, options_);
        } catch (error) {
          // If offline and queuing enabled, add to queue
          if (!navigator.onLine && this.options.enableOfflineQueue && !options.skipQueue) {
            await addToQueue({
              table,
              operation: 'insert',
              payload: values
            });
            
            // Return a mock success response
            return {
              data: Array.isArray(values) ? values : [values],
              error: null,
              count: Array.isArray(values) ? values.length : 1,
              status: 201,
              statusText: 'Queued for offline processing'
            };
          }
          throw error;
        }
      },
      
      // Override update with offline queue support
      update: async (values: any, options_?: { count?: 'exact' | 'planned' | 'estimated' }) => {
        try {
          return await baseQuery.update(values, options_);
        } catch (error) {
          if (!navigator.onLine && this.options.enableOfflineQueue && !options.skipQueue) {
            await addToQueue({
              table,
              operation: 'update',
              payload: values
            });
            
            return {
              data: [values],
              error: null,
              count: 1,
              status: 200,
              statusText: 'Queued for offline processing'
            };
          }
          throw error;
        }
      },
      
      // Override upsert with offline queue support
      upsert: async (
        values: any, 
        options_?: { 
          onConflict?: string;
          count?: 'exact' | 'planned' | 'estimated';
        }
      ) => {
        try {
          return await baseQuery.upsert(values, options_);
        } catch (error) {
          if (!navigator.onLine && this.options.enableOfflineQueue && !options.skipQueue) {
            await addToQueue({
              table,
              operation: 'upsert',
              payload: values,
              onConflict: options_?.onConflict
            });
            
            return {
              data: Array.isArray(values) ? values : [values],
              error: null,
              count: Array.isArray(values) ? values.length : 1,
              status: 201,
              statusText: 'Queued for offline processing'
            };
          }
          throw error;
        }
      },
      
      // Override delete with offline queue support
      delete: async (options_?: { count?: 'exact' | 'planned' | 'estimated' }) => {
        const deleteQuery = baseQuery.delete(options_);
        
        // We need to capture the filter conditions for offline queue
        // This is a simplified approach - in practice, you'd need to capture
        // the full query state including filters
        return {
          ...deleteQuery,
          
          // Override eq, in, etc. to capture filter conditions
          eq: (column: string, value: any) => {
            const filteredQuery = deleteQuery.eq(column, value);
            
            // Override the execution
            const originalThen = filteredQuery.then;
            filteredQuery.then = async function(onfulfilled, onrejected) {
              try {
                return await originalThen.call(this, onfulfilled, onrejected);
              } catch (error) {
                if (!navigator.onLine && !options.skipQueue) {
                  await addToQueue({
                    table,
                    operation: 'delete',
                    payload: { [column]: value }
                  });
                  
                  const result = {
                    data: null,
                    error: null,
                    count: 0,
                    status: 200,
                    statusText: 'Queued for offline processing'
                  };
                  
                  return onfulfilled ? onfulfilled(result) : result;
                }
                return onrejected ? onrejected(error) : Promise.reject(error);
              }
            };
            
            return filteredQuery;
          }
        };
      }
    };
  }

  // ============================================
  // PASS-THROUGH METHODS
  // ============================================

  /**
   * Auth methods (pass-through to original client)
   */
  public get auth() {
    return this.client.auth;
  }

  /**
   * Storage methods (pass-through to original client)
   */
  public get storage() {
    return this.client.storage;
  }

  /**
   * Realtime methods (pass-through to original client)
   */
  public get realtime() {
    return this.client.realtime;
  }

  /**
   * RPC methods with retry support
   */
  public async rpc<T>(
    fn: string,
    args?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await this.client.rpc(fn, args);
    } catch (error) {
      logger.error('RPC call failed', error as Error, { function: fn, args });
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get the underlying Supabase client
   */
  public getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Check if offline queue is enabled
   */
  public isOfflineQueueEnabled(): boolean {
    return this.options.enableOfflineQueue;
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<ResilientSupabaseOptions> {
    return { ...this.options };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createResilientSupabaseClient(
  url: string,
  key: string,
  options?: ResilientSupabaseOptions
): ResilientSupabaseClient {
  return new ResilientSupabaseClient(url, key, options);
}

// ============================================
// DEFAULT INSTANCE
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const resilientSupabase = createResilientSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    enableOfflineQueue: true,
    defaultRetryPolicy: 'default',
    enableNetworkResilience: true
  }
);

export default resilientSupabase;