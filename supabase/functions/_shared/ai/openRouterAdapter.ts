import { AIProviderAdapter, GenerateResult } from './types.ts';
import { AIProviderError } from './errors.ts';

export class OpenRouterAdapter implements AIProviderAdapter {
  private apiKey: string;
  private models: string[];

  constructor() {
    const keysEnv = Deno.env.get('OPENROUTER_API_KEY') || '';
    const keysArray = keysEnv.split(',').map(k => k.trim()).filter(k => k);
    this.apiKey = keysArray.length > 0 ? keysArray[Math.floor(Math.random() * keysArray.length)] : '';
    const modelsStr = Deno.env.get('OPENROUTER_MODELS') || 'google/gemini-flash-1.5';
    this.models = modelsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  async generateStructured<T>({
    systemInstruction,
    prompt,
    jsonSchema,
    timeoutMs,
  }: {
    systemInstruction: string;
    prompt: string;
    jsonSchema: object;
    timeoutMs: number;
  }): Promise<GenerateResult<T>> {
    if (!this.apiKey) {
      throw new AIProviderError('unauthorized', 'OPENROUTER_API_KEY is not configured');
    }
    if (this.models.length === 0) {
      throw new AIProviderError('invalid_request', 'OPENROUTER_MODELS is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      const payload = {
        model: this.models.length === 1 ? this.models[0] : undefined,
        models: this.models.length > 1 ? this.models : undefined,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'modul_ajar_schema',
            strict: true,
            schema: jsonSchema
          }
        },
        route: this.models.length > 1 ? 'fallback' : undefined,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://gurucerdas.app',
          'X-Title': 'Guru Cerdas'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const rawJson = await response.json();
      const textResponse = rawJson?.choices?.[0]?.message?.content;
      
      if (!textResponse) {
        throw new AIProviderError('invalid_json', 'No valid text response from OpenRouter');
      }

      let data: T;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new AIProviderError('invalid_json', 'Failed to parse OpenRouter JSON response', e);
      }

      return {
        data,
        provider: 'openrouter',
        model: rawJson?.model || this.models[0],
        requestId: rawJson?.id,
        inputTokens: rawJson?.usage?.prompt_tokens,
        outputTokens: rawJson?.usage?.completion_tokens,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIProviderError('timeout', 'OpenRouter request timed out');
      }
      if (error.name === 'AIProviderError') {
        throw error;
      }
      throw new AIProviderError('unknown', 'Unknown OpenRouter error', error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response) {
    const errorBody = await response.text().catch(() => '');
    let code: import('./errors.ts').ErrorCode = 'unknown';

    if (response.status === 400) code = 'invalid_request';
    if (response.status === 401 || response.status === 403) code = 'unauthorized';
    if (response.status === 402) code = 'payment_required';
    if (response.status === 429) code = 'rate_limited';
    if (response.status >= 500) code = 'provider_unavailable';

    throw new AIProviderError(code, `OpenRouter API Error ${response.status}: ${errorBody}`);
  }
}
