import { AIProviderAdapter, GenerateResult } from './types.ts';
import { AIProviderError } from './errors.ts';
import { GeminiAdapter } from './geminiAdapter.ts';
import { OpenRouterAdapter } from './openRouterAdapter.ts';
import { z } from 'npm:zod';

export class ProviderRouter {
  private gemini: GeminiAdapter;
  private openRouter: OpenRouterAdapter;

  constructor() {
    this.gemini = new GeminiAdapter();
    this.openRouter = new OpenRouterAdapter();
  }

  /**
   * Tries Gemini first, then falls back to OpenRouter if Gemini fails with a transient error.
   */
  async routeAIRequest<T>({
    systemInstruction,
    prompt,
    jsonSchema,
    zodSchema,
    timeoutMs = 35000,
  }: {
    systemInstruction: string;
    prompt: string;
    jsonSchema: object;
    zodSchema: z.ZodType<T>;
    timeoutMs?: number;
  }): Promise<GenerateResult<T>> {
    let result: GenerateResult<any>;

    try {
      result = await this.gemini.generateStructured({
        systemInstruction,
        prompt,
        jsonSchema,
        timeoutMs,
      });
    } catch (error: any) {
      console.warn('Gemini attempt failed:', error.message);
      
      const shouldFallback = this.shouldFallbackToOpenRouter(error);
      if (!shouldFallback) {
        throw error;
      }

      console.log('Falling back to OpenRouter...');
      // Fallback attempt
      result = await this.openRouter.generateStructured({
        systemInstruction,
        prompt,
        jsonSchema,
        timeoutMs,
      });
    }

    // Validate structured output with Zod
    try {
      const parsedData = zodSchema.parse(result.data);
      result.data = parsedData;
      return result;
    } catch (zodError) {
      throw new AIProviderError('validation_failed', 'AI output failed Zod schema validation', zodError);
    }
  }

  private shouldFallbackToOpenRouter(error: any): boolean {
    if (error.name === 'AIProviderError') {
      const fatalCodes = ['invalid_request', 'unauthorized', 'forbidden'];
      if (fatalCodes.includes(error.code)) {
        return false; // Do not fallback if config/auth is wrong or prompt is fundamentally invalid
      }
      return true; // Fallback on rate_limited, timeout, provider_unavailable, invalid_json
    }
    return true; // Fallback on unknown errors
  }
}
