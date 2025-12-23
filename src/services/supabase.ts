
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
// import { GoogleGenAI } from '@google/genai';

// --- IMPORTANT ---
// The credentials below have been provided to make the application runnable.
// In a production environment, you should use environment variables
// (e.g., process.env.SUPABASE_URL) to keep your credentials secure.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Centralized Google GenAI Client - DEPRECATED in favor of OpenRouter
// Note: We use process.env.GEMINI_API_KEY because it is defined in vite.config.ts
const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const openRouterKey = process.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';

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
export const isAiEnabled = !!apiKey || !!openRouterKey;

if (!isAiEnabled) {
    console.warn("AI API Keys are not set. AI features will not work.");
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