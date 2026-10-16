export type AiBudgetProfile = 'short' | 'long' | 'assessment' | 'review' | 'lesson';
export type AiErrorCategory =
  | 'rate_limit'
  | 'daily_quota'
  | 'too_large'
  | 'truncated'
  | 'request'
  | 'network'
  | 'configuration';
export interface AiTokenUsage {
  input: number | null;
  output: number | null;
  reasoning: number | null;
  total: number | null;
}
export interface AiAttempt {
  provider: 'gemini' | 'groq';
  model: string;
  latencyMs: number;
  status: 'completed' | 'failed' | 'cancelled';
  usage: AiTokenUsage;
  errorCategory?: AiErrorCategory;
}
export interface AiTransportOptions {
  signal?: AbortSignal;
  budgetProfile?: AiBudgetProfile;
  meetings?: number;
  maxAttempts?: number;
  onAttempt?: (attempt: AiAttempt) => void;
}
export class AiRequestError extends Error {
  fallbackAvailable?: boolean;
  constructor(
    message: string,
    public category: AiErrorCategory,
    public retryAfterMs = 0,
  ) {
    super(message);
    this.name = 'AiRequestError';
  }
}
export const unknownUsage = (): AiTokenUsage => ({
  input: null,
  output: null,
  reasoning: null,
  total: null,
});
export function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Permintaan dibatalkan.', 'AbortError');
}
export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Permintaan dibatalkan.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export function linkAbort(
  signal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  throwIfAborted(signal);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  return () => signal?.removeEventListener('abort', abort);
}
export function aiBudget(profile: AiBudgetProfile, meetings = 1) {
  const output = {
    short: 2048,
    long: 6144,
    assessment: 8192,
    review: 4096,
    lesson: Math.min(32768, 16384 + 2048 * (Math.max(1, Math.min(20, meetings)) - 1)),
  }[profile];
  return {
    output,
    thinking: ['assessment', 'review', 'lesson'].includes(profile) ? 1024 : 0,
    groqOutput: profile === 'review' ? 2048 : Math.min(output, 6144),
  };
}
export function geminiGenerationConfig(model: string, profile: AiBudgetProfile, meetings?: number) {
  const budget = aiBudget(profile, meetings);
  const thinkingConfig = /^gemini-3/.test(model)
    ? { thinkingLevel: budget.thinking || !/flash/.test(model) ? 'low' : 'minimal' }
    : /^gemini-2\.5/.test(model)
      ? { thinkingBudget: /pro/.test(model) ? Math.max(128, budget.thinking) : budget.thinking }
      : undefined;
  return {
    temperature: 0.4,
    responseMimeType: 'application/json',
    maxOutputTokens: budget.output,
    ...(thinkingConfig ? { thinkingConfig } : {}),
  };
}
export function retryHint(header: string | null, body = ''): number {
  const seconds = Number(header);
  const headerMs =
    header && Number.isFinite(seconds)
      ? Math.max(0, seconds * 1000)
      : header
        ? Math.max(0, Date.parse(header) - Date.now()) || 0
        : 0;
  const delay = body.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  return Math.max(headerMs, delay ? Number(delay[1]) * 1000 : 0);
}
export function providerError(
  status: number,
  body: string,
  retryAfter: string | null,
): AiRequestError {
  if (/not configured|API_KEY_INVALID|invalid api key/i.test(body))
    return new AiRequestError(
      'API key provider AI belum dikonfigurasi dengan benar.',
      'configuration',
    );
  if (status === 413 || /request_too_large|request too large|context_length_exceeded/i.test(body))
    return new AiRequestError(
      'Input AI terlalu besar. Kurangi materi atau jumlah pertemuan.',
      'too_large',
    );
  if (
    status === 429 &&
    /per.?day|requests.?per.?day|tokens.?per.?day|daily|\bRPD\b|\bTPD\b/i.test(body)
  )
    return new AiRequestError(
      'Kuota AI harian habis. Coba setelah kuota diperbarui.',
      'daily_quota',
    );
  if (status === 429)
    return new AiRequestError(
      'Batas AI per menit tercapai.',
      'rate_limit',
      retryHint(retryAfter, body) || 60000,
    );
  return new AiRequestError(`Layanan AI gagal (${status}).`, status >= 500 ? 'network' : 'request');
}
export function canRetry(error: unknown): boolean {
  return error instanceof AiRequestError
    ? ['rate_limit', 'network'].includes(error.category)
    : !(error instanceof Error && error.name === 'AbortError');
}
export function canFallback(error: unknown): boolean {
  return (
    !(error instanceof Error && error.name === 'AbortError') &&
    !(
      error instanceof AiRequestError &&
      (error.fallbackAvailable === false ||
        ['too_large', 'truncated', 'request'].includes(error.category))
    )
  );
}
