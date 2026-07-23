// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderRouter } from '../../supabase/functions/_shared/ai/providerRouter';
import { AIProviderError } from '../../supabase/functions/_shared/ai/errors';
import { z } from 'zod';

const mockZodSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

describe('FASE 3 - AI Provider Router', () => {
  let router: ProviderRouter;
  let fetchMock: any;

  beforeEach(() => {
    // Set env vars
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    process.env.OPENROUTER_MODELS = 'model1,model2';

    // Mock Deno for Vitest (Node environment)
    (global as any).Deno = {
      env: {
        get: (key: string) => process.env[key]
      }
    };

    router = new ProviderRouter();
    
    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('should return successful result from Gemini directly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ success: true, message: 'From Gemini' }) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 }
      })
    });

    const result = await router.routeAIRequest({
      systemInstruction: 'sys',
      prompt: 'user',
      jsonSchema: {},
      zodSchema: mockZodSchema
    });

    expect(result.provider).toBe('gemini');
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('From Gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  it('should fallback to OpenRouter when Gemini returns 429 Rate Limited', async () => {
    // Gemini fails with 429
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded'
    });

    // OpenRouter succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ success: true, message: 'From OpenRouter' }) } }],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
        model: 'model1'
      })
    });

    const result = await router.routeAIRequest({
      systemInstruction: 'sys',
      prompt: 'user',
      jsonSchema: {},
      zodSchema: mockZodSchema
    });

    expect(result.provider).toBe('openrouter');
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('From OpenRouter');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('openrouter.ai');
  });

  it('should NOT fallback to OpenRouter when Gemini returns 401 Unauthorized (fail fast)', async () => {
    // Gemini fails with 401
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized API Key'
    });

    await expect(router.routeAIRequest({
      systemInstruction: 'sys',
      prompt: 'user',
      jsonSchema: {},
      zodSchema: mockZodSchema
    })).rejects.toThrowError(AIProviderError);

    try {
      await router.routeAIRequest({
        systemInstruction: 'sys', prompt: 'user', jsonSchema: {}, zodSchema: mockZodSchema
      });
    } catch (e: any) {
      expect(e.code).toBe('unauthorized');
    }

    // Since it fails fast, OpenRouter should not be called
    // Wait, the first reject counts as 1 call, the second call in try-catch counts as 1. Total 2 calls to Gemini.
    expect(fetchMock).toHaveBeenCalledTimes(2); 
    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(fetchMock.mock.calls[1][0]).toContain('generativelanguage.googleapis.com');
  });

  it('should fail with validation_failed if AI returns JSON that violates Zod schema', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ success: 'not_a_boolean', message: 'Wrong schema' }) }] } }]
      })
    });

    await expect(router.routeAIRequest({
      systemInstruction: 'sys',
      prompt: 'user',
      jsonSchema: {},
      zodSchema: mockZodSchema
    })).rejects.toThrowError(/validation/);
  });
});
