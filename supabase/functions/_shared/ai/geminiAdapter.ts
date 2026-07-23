import { AIProviderAdapter, GenerateResult } from './types.ts';
import { AIProviderError } from './errors.ts';

export class GeminiAdapter implements AIProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor() {
    const keysEnv = Deno.env.get('GEMINI_API_KEY') || '';
    const keysArray = keysEnv.split(',').map(k => k.trim()).filter(k => k);
    this.apiKey = keysArray.length > 0 ? keysArray[Math.floor(Math.random() * keysArray.length)] : '';
    this.model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
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
      throw new AIProviderError('unauthorized', 'GEMINI_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const payload = {
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          response_mime_type: 'application/json',
          response_schema: jsonSchema
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const rawJson = await response.json();
      const textResponse = rawJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        throw new AIProviderError('invalid_json', 'No valid text response from Gemini');
      }

      let data: T;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new AIProviderError('invalid_json', 'Failed to parse Gemini JSON response', e);
      }

      return {
        data,
        provider: 'gemini',
        model: this.model,
        inputTokens: rawJson?.usageMetadata?.promptTokenCount,
        outputTokens: rawJson?.usageMetadata?.candidatesTokenCount,
        cachedTokens: rawJson?.usageMetadata?.cachedContentTokenCount,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIProviderError('timeout', 'Gemini request timed out');
      }
      if (error.name === 'AIProviderError') {
        throw error;
      }
      throw new AIProviderError('unknown', 'Unknown Gemini error', error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response) {
    const errorBody = await response.text().catch(() => '');
    let code: import('./errors.ts').ErrorCode = 'unknown';

    if (response.status === 400) code = 'invalid_request';
    if (response.status === 401 || response.status === 403) code = 'unauthorized';
    if (response.status === 429) code = 'rate_limited';
    if (response.status >= 500) code = 'provider_unavailable';

    throw new AIProviderError(code, `Gemini API Error ${response.status}: ${errorBody}`);
  }
}
