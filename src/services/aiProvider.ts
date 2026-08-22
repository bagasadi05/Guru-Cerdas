import { logger } from './logger';
import {
  isCircuitAllowed as baseIsCircuitAllowed,
  recordCircuitSuccess as baseRecordCircuitSuccess,
  recordCircuitFailure as baseRecordCircuitFailure,
} from '../utils/aiConfig';

// =============================================================================
// SHARED TYPES
// =============================================================================

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | null;
}

export interface GeminiResponse {
  choices: {
    message: GeminiMessage;
  }[];
}

// =============================================================================
// TASK CLASSIFICATION
// =============================================================================

export type AiTaskType =
  | 'teacher-report'
  | 'child-analysis'
  | 'modul-ajar'
  | 'grade-adjustment'
  | 'insight'
  | 'parse-values'
  | 'general';

export type AiProviderName = 'gemini' | 'groq';

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

export interface AiProvider {
  readonly name: AiProviderName;
  generateContent(messages: GeminiMessage[], model: string): Promise<GeminiResponse>;
}

// =============================================================================
// ROUTING CONFIG
// =============================================================================

interface RouteConfig {
  primary: AiProviderName;
  model: string;
}

const DEFAULT_GEMINI_MODEL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-1.5-flash';

const ROUTING: Record<AiTaskType, RouteConfig> = {
  'teacher-report':   { primary: 'gemini', model: DEFAULT_GEMINI_MODEL },
  'child-analysis':   { primary: 'gemini', model: DEFAULT_GEMINI_MODEL },
  'modul-ajar':       { primary: 'gemini', model: DEFAULT_GEMINI_MODEL },
  'grade-adjustment': { primary: 'groq',  model: 'llama-3.1-8b-instant' },
  insight:            { primary: 'groq',  model: 'llama-3.1-8b-instant' },
  'parse-values':     { primary: 'groq',  model: 'llama-3.1-8b-instant' },
  general:            { primary: 'gemini', model: DEFAULT_GEMINI_MODEL },
};

const FALLBACK_MODELS: Record<AiTaskType, string> = {
  'teacher-report':   'llama-3.3-70b-versatile',
  'child-analysis':   'llama-3.3-70b-versatile',
  'modul-ajar':       'llama-3.3-70b-versatile',
  'grade-adjustment': DEFAULT_GEMINI_MODEL,
  insight:            DEFAULT_GEMINI_MODEL,
  'parse-values':     DEFAULT_GEMINI_MODEL,
  general:            'llama-3.3-70b-versatile',
};

// =============================================================================
// PROVIDER ROUTER
// =============================================================================

export class ProviderRouter {
  private providers = new Map<AiProviderName, AiProvider>();

  register(provider: AiProvider): void {
    this.providers.set(provider.name, provider);
  }

  async generateContent(
    taskType: AiTaskType,
    messages: GeminiMessage[],
  ): Promise<GeminiResponse> {
    const route = ROUTING[taskType] || ROUTING.general;
    const primary = this.providers.get(route.primary);
    const fallbackName: AiProviderName = route.primary === 'gemini' ? 'groq' : 'gemini';
    const fallback = this.providers.get(fallbackName);

    // Try primary
    if (primary && baseIsCircuitAllowed(route.primary)) {
      try {
        const result = await primary.generateContent(messages, route.model);
        baseRecordCircuitSuccess(route.primary);
        return result;
      } catch (err: any) {
        logger.warn(`[AI Router] ${route.primary} failed: ${err.message}`, 'AI');
        baseRecordCircuitFailure(route.primary);
        if (!fallback || !baseIsCircuitAllowed(fallbackName)) {
          throw err;
        }
      }
    }

    // Try fallback
    if (fallback && baseIsCircuitAllowed(fallbackName)) {
      try {
        logger.info(`[AI Router] Falling back to ${fallbackName}`, 'AI');
        const fallbackModel = FALLBACK_MODELS[taskType] || FALLBACK_MODELS.general;
        const result = await fallback.generateContent(messages, fallbackModel);
        baseRecordCircuitSuccess(fallbackName);
        return result;
      } catch (err: any) {
        logger.warn(`[AI Router] ${fallbackName} fallback also failed: ${err.message}`, 'AI');
        baseRecordCircuitFailure(fallbackName);
        throw new Error(`Semua provider AI gagal. Silakan coba lagi nanti.`);
      }
    }

    throw new Error('Tidak ada provider AI yang tersedia saat ini.');
  }

  getPrimaryProvider(taskType: AiTaskType): AiProvider | undefined {
    const route = ROUTING[taskType] || ROUTING.general;
    return this.providers.get(route.primary);
  }

  getFallbackModel(taskType: AiTaskType): string {
    return FALLBACK_MODELS[taskType] || FALLBACK_MODELS.general;
  }

  getPrimaryModel(taskType: AiTaskType): string {
    const route = ROUTING[taskType] || ROUTING.general;
    return route.model;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const aiRouter = new ProviderRouter();
