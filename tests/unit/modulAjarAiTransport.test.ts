import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AiRequestError,
  aiBudget,
  geminiGenerationConfig,
  providerError,
  retryHint,
} from '../../src/lib/aiRequestPolicy';
import { geminiConfig, groqConfig, validBudget } from '../../api/_aiBudget';
vi.mock('../../src/services/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
}));
vi.mock('../../src/utils/aiConfig', () => ({
  isCircuitAllowed: () => true,
  isTransientError: () => false,
  getGeminiKeyCount: () => 1,
  getGroqKeyCount: () => 1,
  pickNextGeminiKey: () => 'test',
  pickNextGroqKey: () => 'test',
  getBackoffDelay: () => 1000,
  isRateLimitError: () => true,
  getCachedResponse: () => null,
  setCachedResponse: vi.fn(),
  recordCircuitSuccess: vi.fn(),
  recordCircuitFailure: vi.fn(),
}));
import { GeminiProvider } from '../../src/services/geminiService';
import { GroqProvider } from '../../src/services/groqService';
import { ProviderRouter } from '../../src/services/aiProvider';
const messages = [{ role: 'user' as const, content: 'Return JSON {}' }];
const geminiSuccess = () =>
  new Response(
    JSON.stringify({
      modelVersion: 'actual-gemini',
      candidates: [
        {
          content: { parts: [{ thought: true, text: 'private reasoning' }, { text: '{}' }] },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        totalTokenCount: 35,
      },
    }),
    { status: 200 },
  );
beforeEach(() => {
  vi.stubEnv('VITE_GEMINI_PROXY_URL', '/api/gemini');
  vi.stubEnv('VITE_GROQ_PROXY_URL', '/api/groq');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('Modul Ajar request budgets and provider metadata', () => {
  it('sets budgets for every operation and clamps long lessons', () => {
    expect(aiBudget('short')).toMatchObject({ output: 2048, thinking: 0 });
    expect(aiBudget('long').output).toBe(6144);
    expect(aiBudget('assessment').output).toBe(8192);
    expect(aiBudget('review')).toMatchObject({ output: 4096, groqOutput: 2048 });
    expect(aiBudget('lesson', 1).output).toBe(16384);
    expect(aiBudget('lesson', 20).output).toBe(32768);
    expect(geminiGenerationConfig('gemini-2.5-flash', 'short').thinkingConfig).toEqual({
      thinkingBudget: 0,
    });
    expect(geminiGenerationConfig('gemini-3-flash-preview', 'short').thinkingConfig).toEqual({
      thinkingLevel: 'minimal',
    });
  });
  it('overrides client token and reasoning settings at the proxy', () => {
    expect(validBudget({ budgetProfile: 'unknown' })).toBe(false);
    expect(validBudget({ meetings: 21 })).toBe(false);
    expect(
      geminiConfig({
        model: 'gemini-2.5-flash',
        budgetProfile: 'review',
        generationConfig: { maxOutputTokens: 999999 },
      }),
    ).toMatchObject({ maxOutputTokens: 4096 });
    expect(
      groqConfig({ model: 'openai/gpt-oss-20b', budgetProfile: 'lesson', max_tokens: 999999 }),
    ).toMatchObject({
      max_completion_tokens: 6144,
      reasoning_effort: 'low',
      include_reasoning: false,
      response_format: { type: 'json_object' },
    });
  });
  it('preserves actual Gemini model and usage, excludes thought text', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      geminiSuccess(),
    );
    vi.stubGlobal('fetch', fetchMock);
    const attempt = vi.fn();
    const result = await new GeminiProvider().generateContent(messages, 'gemini-2.5-flash', {
      budgetProfile: 'short',
      onAttempt: attempt,
    });
    expect(result.choices[0].message.content).toBe('{}');
    expect(result.metadata).toMatchObject({
      model: 'actual-gemini',
      usage: { input: 10, output: 20, reasoning: 5, total: 35 },
    });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).generationConfig).toMatchObject({
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });
  it('uses GPT-OSS low reasoning JSON mode and reports completion usage once', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            model: 'openai/gpt-oss-20b',
            choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              completion_tokens_details: { reasoning_tokens: 5 },
              total_tokens: 30,
            },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await new GroqProvider().generateContent(messages, 'openai/gpt-oss-20b', {
      budgetProfile: 'assessment',
    });
    expect(result.metadata?.usage.total).toBe(30);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      max_completion_tokens: 6144,
      reasoning_effort: 'low',
      include_reasoning: false,
    });
  });
  it('honors Retry-After and retryDelay without clamping to 10 seconds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"error":{"details":[{"retryDelay":"90s"}]}}', {
          status: 429,
          headers: { 'Retry-After': '60' },
        }),
      )
      .mockResolvedValueOnce(geminiSuccess());
    vi.stubGlobal('fetch', fetchMock);
    const result = new GeminiProvider().generateContent(messages, 'gemini-2.5-flash', {
      budgetProfile: 'short',
    });
    await vi.advanceTimersByTimeAsync(89000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('waits 60 seconds for a rate limit without a retry hint', () => {
    expect(providerError(429, '', null).retryAfterMs).toBe(60000);
    expect(retryHint('120', '{"retryDelay":"90s"}')).toBe(120000);
  });
  it.each([
    [429, 'requests per day quota exhausted', 'daily_quota'],
    [413, 'too large', 'too_large'],
  ] as const)('does not retry permanent quota or input errors', async (status, body, category) => {
    const fetchMock = vi.fn(async () => new Response(body, { status }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new GeminiProvider().generateContent(messages, 'gemini-2.5-flash', {
        budgetProfile: 'lesson',
      }),
    ).rejects.toMatchObject({ category });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects a truncated answer and retains its reported token usage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }],
              usageMetadata: { totalTokenCount: 2000 },
            }),
          ),
      ),
    );
    const attempt = vi.fn();
    await expect(
      new GeminiProvider().generateContent(messages, 'gemini-2.5-flash', {
        budgetProfile: 'lesson',
        onAttempt: attempt,
      }),
    ).rejects.toMatchObject({ category: 'truncated' });
    expect(attempt.mock.calls[0][0].usage.total).toBe(2000);
  });
  it('cancels a quota wait without sending the next provider call', async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const fetchMock = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = new GeminiProvider().generateContent(messages, 'gemini-2.5-flash', {
      budgetProfile: 'short',
      signal: abort.signal,
    });
    const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    abort.abort();
    await rejection;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('uses only one fallback attempt and never falls back after truncation or cancellation', async () => {
    const router = new ProviderRouter();
    const fallback = vi.fn(async () => ({ choices: [] }));
    const primary = vi.fn(async () => {
      throw new AiRequestError('rate', 'rate_limit');
    });
    router.register({ name: 'gemini', generateContent: primary });
    router.register({ name: 'groq', generateContent: fallback });
    await router.generateContent('modul-ajar', messages, { budgetProfile: 'lesson' });
    expect(fallback).toHaveBeenCalledWith(
      messages,
      'openai/gpt-oss-20b',
      expect.objectContaining({ maxAttempts: 1 }),
    );
    primary.mockRejectedValueOnce(new AiRequestError('truncated', 'truncated'));
    await expect(
      router.generateContent('modul-ajar', messages, { budgetProfile: 'lesson' }),
    ).rejects.toMatchObject({ category: 'truncated' });
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
