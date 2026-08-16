import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { generateGeminiJson, generateGeminiContent, GeminiRateLimitError } from '../geminiService';
import { resetCircuitBreakers, clearAiCache } from '../../utils/aiConfig';

// ─── Helpers ──────────────────────────────────────────────────────

function okGeminiResponse(text = '{"ok":true}'): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  } as unknown as Response;
}

function rateLimitedResponse(retryAfter?: string): Response {
  return {
    ok: false,
    status: 429,
    text: async () => '{"error":{"code":429,"message":"Quota exceeded"}}',
    headers: retryAfter ? new Headers({ 'retry-after': retryAfter }) : new Headers(),
  } as unknown as Response;
}

function stubFetch(mockImpl?: (...args: unknown[]) => Promise<unknown>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(mockImpl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function lastFetchCall(fetchMock: ReturnType<typeof vi.fn>): {
  url: string;
  body: Record<string, unknown>;
} {
  const call = fetchMock.mock.calls.at(-1)!;
  const [calledUrl, init] = call;
  return { url: String(calledUrl), body: JSON.parse(String(init?.body ?? '{}')) };
}

// ─── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  resetCircuitBreakers();
  clearAiCache();
  vi.stubEnv('VITE_GEMINI_MODEL', '');
  // Default: proxy mode (production-like). Individual tests override.
  vi.stubEnv('VITE_GEMINI_PROXY_URL', '/api/gemini');
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe('geminiService — proxy mode', () => {
  it('posts to the proxy endpoint with the model in the body', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(okGeminiResponse('{"nama":"Budi"}')));
    vi.stubEnv('VITE_GEMINI_MODEL', 'gemini-2.0-flash');

    const result = await generateGeminiJson<{ nama: string }>('Buat data siswa unik-proxy-1', 'system prompt');

    expect(result).toEqual({ nama: 'Budi' });
    const { url, body } = lastFetchCall(fetchMock);
    expect(url).toBe('/api/gemini');
    expect(body.model).toBe('gemini-2.0-flash');
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'system prompt' }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After (60s) before retrying a 429', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(() => Promise.resolve(rateLimitedResponse('60')));
    fetchMock.mockResolvedValueOnce(rateLimitedResponse('60')).mockResolvedValueOnce(okGeminiResponse('{"ok":true}'));

    const promise = generateGeminiJson<{ ok: boolean }>('prompt retry-after-unik', undefined);

    // Let attempt 1 fail and enter the Retry-After sleep.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Retrying after only 1s must NOT have happened.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // After the full 60s window, attempt 2 fires.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const result = await promise;
    expect(result).toEqual({ ok: true });
  });

  it('exhausts MAX_RETRIES (3) on Gemini then falls back to Groq, which also fails', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(() => Promise.resolve(rateLimitedResponse()));

    const promise = generateGeminiJson<{ ok: boolean }>('prompt exhaust-unik', undefined);
    promise.catch(() => {}); // attach early to avoid unhandled-rejection warnings

    // Flush retry loop: 3 Gemini attempts with 5s/10s backoff, then Groq fallback
    // also 429s 3 times before giving up.
    await vi.advanceTimersByTimeAsync(120_000);
    await expect(promise).rejects.toThrow(/Semua provider AI gagal/);
    // Gemini: 3 calls, Groq: 3 calls (both hit the mocked 429 endpoint).
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('caps concurrent requests at MAX_CONCURRENT (2)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const fetchMock = stubFetch(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Slow the response so overlapping calls are observable.
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return okGeminiResponse('{"ok":true}');
    });

    const promises = Array.from({ length: 5 }, (_, i) =>
      generateGeminiJson<{ ok: boolean }>(`prompt concurrent-${i}-unik`)
    );

    // Let all 5 calls finish (queue releases them one at a time).
    await Promise.all(promises);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    // Without the queue cap, all 5 would have overlapped (maxInFlight === 5).
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});

describe('geminiService — direct mode (dev fallback)', () => {
  it('calls Google directly with the dev key when no proxy env is set', async () => {
    vi.stubEnv('DEV', true as any);
    vi.stubEnv('VITE_GEMINI_PROXY_URL', '');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'dev-key-123');
    const fetchMock = stubFetch(() => Promise.resolve(okGeminiResponse('{"ok":true}')));

    const result = await generateGeminiJson<{ ok: boolean }>('prompt direct-unik');
    expect(result).toEqual({ ok: true });

    const { url } = lastFetchCall(fetchMock);
    expect(url).toMatch(
      /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.0-flash:generateContent\?key=dev-key-123$/
    );
  });

  it('does not send the model in the body when calling Google directly', async () => {
    vi.stubEnv('DEV', true as any);
    vi.stubEnv('VITE_GEMINI_PROXY_URL', '');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'dev-key-123');
    const fetchMock = stubFetch(() => Promise.resolve(okGeminiResponse('{"ok":true}')));

    await generateGeminiJson<{ ok: boolean }>('prompt direct-body-unik');
    const { body } = lastFetchCall(fetchMock);
    expect(body.model).toBeUndefined();
  });
});

describe('GeminiRateLimitError', () => {
  it('carries the Retry-After hint', () => {
    const err = new GeminiRateLimitError('Rate limit exceeded: Gemini API 429', 42_000);
    expect(err.name).toBe('GeminiRateLimitError');
    expect(err.retryAfterMs).toBe(42_000);
  });
});

describe('generateGeminiContent cache + circuit', () => {
  it('returns cached responses without hitting the network', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(okGeminiResponse('{"ok":true}')));

    const messages = [{ role: 'user' as const, content: 'prompt cache-unik' }];
    const first = await generateGeminiContent(messages);
    const second = await generateGeminiContent(messages);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
