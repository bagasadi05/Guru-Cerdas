
/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for database operations
 * and the Google GenAI client for AI-powered features in the Portal Guru application.
 * 
 * @module services/supabase
 * @since 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // This will be generated from your Supabase schema
import { networkResilience } from './networkResilience';
import { addToQueue } from './offlineQueue';
import { logger } from './logger';

// --- IMPORTANT ---
// The credentials below have been provided to make the application runnable.
// In a production environment, use environment variables and avoid exposing
// server-only secrets to the client bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Network Resilience Fetch helpers
const getRequestPriority = (url: string): 'low' | 'normal' | 'high' | 'critical' => {
  if (url.includes('/auth/')) return 'critical';
  if (url.includes('/realtime')) return 'high';
  if (url.includes('/storage/')) return 'normal';
  if (url.includes('/analytics') || url.includes('/logs')) return 'low';
  return 'normal';
};

const getRetryCount = (url: string): number => {
  if (url.includes('/auth/')) return 5;
  if (url.includes('/realtime')) return 1;
  return 3;
};

const isMutationRequest = (method?: string): boolean => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase() || '');
};

const queueOfflineRequest = async (url: string, init?: RequestInit): Promise<void> => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const restIndex = pathParts.indexOf('rest');
    if (restIndex === -1) return;
    const tableIndex = restIndex + 2;
    const tableName = pathParts[tableIndex];
    
    if (!tableName) return;

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

    let payload = {};
    if (init?.body) {
      try {
        payload = JSON.parse(init.body as string);
      } catch (e) {
        logger.warn('Failed to parse request body for offline queue', 'ResilientSupabase', e);
      }
    }

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
};

const resilientSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  
  try {
    return await networkResilience.fetch(url, {
      ...init,
      priority: getRequestPriority(url),
      retries: getRetryCount(url),
      queueWhenOffline: true
    });
  } catch (error) {
    logger.error('Supabase request failed', error as Error, {
      url,
      method: init?.method || 'GET'
    });
    
    if (isMutationRequest(init?.method)) {
      await queueOfflineRequest(url, init);
      throw new Error('Request queued for offline processing');
    }
    
    throw error;
  }
};

/**
 * Supabase client instance for database operations.
 * 
 * This client provides type-safe access to the Portal Guru database through
 * Supabase's PostgreSQL backend. All database operations should use this client
 * to ensure proper authentication and Row Level Security (RLS) enforcement.
 * 
 * The client is configured with the Database type for full TypeScript type safety,
 * ensuring compile-time validation of table names, column types, and query results.
 * 
 * @example
 * ```typescript
 * // Fetch all students for the current user
 * const { data, error } = await supabase
 *   .from('students')
 *   .select('*')
 *   .eq('user_id', userId);
 * 
 * if (error) {
 *   console.error('Failed to fetch students:', error);
 * } else {
 *   console.log('Students:', data);
 * }
 * ```
 * 
 * @see {@link https://supabase.com/docs/reference/javascript/introduction} Supabase JS Client Documentation
 * @since 1.0.0
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: resilientSupabaseFetch
  }
});

// Centralized Google GenAI Client - DEPRECATED in favor of OpenRouter
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
// NOTE: Never read VITE_OPENROUTER_API_KEY here — key is server-side only.
const openRouterProxyUrl = import.meta.env.VITE_OPENROUTER_PROXY_URL || '';
// In local dev only: direct key fallback (never bundled in production builds)
const devApiKey = import.meta.env.DEV ? (import.meta.env.VITE_OPENROUTER_API_KEY || '') : '';

/**
 * Flag indicating whether AI features are enabled.
 * 
 * This boolean is true when a valid AI API key is configured,
 * allowing the application to use AI-powered features such as:
 * - Student performance analysis
 * - Automated report generation
 * - Intelligent insights and recommendations
 * 
 * Components should check this flag before attempting to use AI features
 * to gracefully degrade functionality when AI is unavailable.
 * 
 * @example
 * ```typescript
 * if (isAiEnabled) {
 *   const analysis = await generateStudentAnalysis(studentId);
 * } else {
 *   console.log('AI features are disabled');
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const isAiEnabled = !!openRouterProxyUrl || !!devApiKey;

if (!isAiEnabled) {
    logger.warn("AI API Keys are not set. AI features will not work.", "Supabase");
}

/**
 * Google GenAI client instance for AI-powered features.
 * @deprecated Use openRouterService instead for better free tier support.
 */
// export const ai = new GoogleGenAI({ apiKey }); - Removed to prevent usage

/**
 * Note on Offline Sync:
 * A robust offline strategy with Supabase might involve:
 * 1. Using a state management library like React Query or Zustand with a persistence layer (e.g., persist middleware with localStorage or IndexedDB).
 * 2. When offline, mutations (adds, updates, deletes) are queued locally.
 * 3. A service worker or a listener for the 'online' event detects when the connection is restored.
 * 4. The queue of mutations is then processed and sent to Supabase.
 * 5. Data is fetched from Supabase upon re-connecting to ensure local state is fresh.
 * This setup is advanced and beyond the scope of this single file generation.
 */
