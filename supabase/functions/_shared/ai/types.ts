export type AIProvider = 'gemini' | 'openrouter';

export type GenerateResult<T> = {
  data: T;
  provider: AIProvider;
  model: string;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
};

export interface AIProviderAdapter {
  generateStructured<T>(args: {
    systemInstruction: string;
    prompt: string;
    jsonSchema: object;
    timeoutMs: number;
  }): Promise<GenerateResult<T>>;
}
