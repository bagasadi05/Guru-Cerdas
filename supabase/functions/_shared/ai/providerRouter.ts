import { AIProviderAdapter, GenerateResult } from './types.ts';
import { AIProviderError } from './errors.ts';
import { GeminiAdapter } from './geminiAdapter.ts';
import { z } from 'npm:zod';

export class ProviderRouter {
  private gemini: GeminiAdapter;

  constructor() {
    this.gemini = new GeminiAdapter();
  }

  /**
   * Generates structured data using Gemini AI.
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
      console.error('Gemini attempt failed:', error.message);
      throw error;
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
}
