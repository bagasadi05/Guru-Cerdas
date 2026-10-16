import { supabase } from './supabase';
import type { Json } from './database.types';
import {
  linkAbort,
  throwIfAborted,
  unknownUsage,
  type AiAttempt,
  type AiTokenUsage,
  type AiTransportOptions,
} from '../lib/aiRequestPolicy';

export const MODUL_AI_PROMPT_VERSION = 3;
export const MODUL_AI_CONTRACT_VERSION = 3;
export interface ModulAiUsage {
  operation: string;
  cacheHit: boolean;
  shared: boolean;
  attempts: AiAttempt[];
  tokens: AiTokenUsage;
  latencyMs: number;
  status: 'completed' | 'failed' | 'cancelled';
}
export interface ModulAiOptions {
  cachePolicy?: 'reuse' | 'refresh';
  signal?: AbortSignal;
  onUsage?: (usage: ModulAiUsage) => void;
  onWarning?: (message: string) => void;
  onArtifact?: (artifact: Record<string, unknown>) => void;
}
export function stableJson(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)]),
      );
    return item;
  };
  return JSON.stringify(canonical(value));
}
export async function modulAiFingerprint(operation: string, context: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(
    stableJson({
      operation,
      context,
      promptVersion: MODUL_AI_PROMPT_VERSION,
      contractVersion: MODUL_AI_CONTRACT_VERSION,
    }),
  );
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
interface RequestResult<T> {
  value: T;
  usage: ModulAiUsage;
}
interface Flight {
  promise: Promise<RequestResult<unknown>>;
  controller: AbortController;
  consumers: number;
}
const flights = new Map<string, Flight>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
async function storageRequest<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const unlink = linkAbort(signal, controller);
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeout);
    unlink();
  }
}
export function aggregateUsage(attempts: AiAttempt[]): AiTokenUsage {
  const keys = ['input', 'output', 'reasoning', 'total'] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      attempts.length && attempts.every((attempt) => attempt.usage[key] !== null)
        ? attempts.reduce((sum, attempt) => sum + attempt.usage[key]!, 0)
        : null,
    ]),
  ) as unknown as AiTokenUsage;
}
export async function runModulAiRequest<T>(
  operation: string,
  context: unknown,
  validate: (value: unknown) => value is T,
  generate: (transport: AiTransportOptions) => Promise<T>,
  options: ModulAiOptions = {},
): Promise<T> {
  throwIfAborted(options.signal);
  let owner: string | undefined;
  try {
    owner = (await supabase.auth.getSession()).data.session?.user.id;
  } catch {
    /* Session absence disables persistent storage. */
  }
  throwIfAborted(options.signal);
  const fingerprint = await modulAiFingerprint(operation, context);
  const key = `${owner ?? 'anonymous'}:${operation}:${fingerprint}:${options.cachePolicy ?? 'reuse'}`;
  let flight = flights.get(key);
  if (flight?.controller.signal.aborted) {
    flights.delete(key);
    flight = undefined;
  }
  const shared = !!flight;
  if (!flight) {
    const controller = new AbortController();
    const promise = execute(owner, operation, fingerprint, validate, generate, {
      ...options,
      signal: controller.signal,
    });
    flight = { controller, promise, consumers: 0 };
    flights.set(key, flight);
    const current = flight;
    void promise
      .finally(() => {
        if (flights.get(key) === current) flights.delete(key);
      })
      .catch(() => {});
  }
  flight.consumers++;
  const current = flight;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const detach = () => {
      options.signal?.removeEventListener('abort', abort);
      current.consumers--;
      if (!current.consumers) current.controller.abort();
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      detach();
      reject(new DOMException('Permintaan dibatalkan.', 'AbortError'));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) {
      abort();
      return;
    }
    void current.promise.then(
      (result) => {
        if (settled) return;
        settled = true;
        detach();
        options.onUsage?.(
          shared
            ? {
                ...result.usage,
                shared: true,
                attempts: [],
                tokens: { input: 0, output: 0, reasoning: 0, total: 0 },
              }
            : result.usage,
        );
        resolve(result.value as T);
      },
      (error) => {
        if (!settled) {
          settled = true;
          detach();
          reject(error);
        }
      },
    );
  });
}
async function execute<T>(
  owner: string | undefined,
  operation: string,
  fingerprint: string,
  validate: (value: unknown) => value is T,
  generate: (transport: AiTransportOptions) => Promise<T>,
  options: ModulAiOptions,
): Promise<RequestResult<T>> {
  const started = Date.now();
  const attempts: AiAttempt[] = [];
  let cacheHit = false;
  let status: ModulAiUsage['status'] = 'completed';
  let cacheWarned = false;
  const warn = () => {
    if (!cacheWarned && !options.signal?.aborted) {
      cacheWarned = true;
      options.onWarning?.('Cache pribadi belum tersedia. Hasil tetap dapat digunakan.');
    }
  };
  const summary = (): ModulAiUsage => ({
    operation,
    cacheHit,
    shared: false,
    attempts,
    tokens: cacheHit
      ? { input: 0, output: 0, reasoning: 0, total: 0 }
      : attempts.length
        ? aggregateUsage(attempts)
        : unknownUsage(),
    latencyMs: Date.now() - started,
    status,
  });
  try {
    if (owner && options.cachePolicy !== 'refresh') {
      try {
        const { data, error } = await storageRequest(
          (signal) =>
            supabase
              .from('modul_ajar_ai_cache')
              .select('content,prompt_version,contract_version,expires_at')
              .eq('user_id', owner)
              .eq('operation', operation)
              .eq('request_fingerprint', fingerprint)
              .gt('expires_at', new Date().toISOString())
              .abortSignal(signal)
              .maybeSingle(),
          options.signal,
        );
        throwIfAborted(options.signal);
        if (error) warn();
        if (
          data &&
          data.prompt_version === MODUL_AI_PROMPT_VERSION &&
          data.contract_version === MODUL_AI_CONTRACT_VERSION &&
          Date.parse(data.expires_at) > Date.now() &&
          validate(data.content)
        ) {
          cacheHit = true;
          return { value: data.content, usage: summary() };
        }
      } catch {
        throwIfAborted(options.signal);
        warn();
      }
    }
    throwIfAborted(options.signal);
    const value = await generate({
      signal: options.signal,
      onAttempt: (attempt) => attempts.push(attempt),
    });
    throwIfAborted(options.signal);
    if (!validate(value)) throw new Error('Hasil AI belum memenuhi kontrak validasi.');
    if (owner) {
      try {
        const now = Date.now();
        const { error } = await storageRequest(
          (signal) =>
            supabase
              .from('modul_ajar_ai_cache')
              .upsert(
                {
                  user_id: owner,
                  operation,
                  request_fingerprint: fingerprint,
                  prompt_version: MODUL_AI_PROMPT_VERSION,
                  contract_version: MODUL_AI_CONTRACT_VERSION,
                  content: JSON.parse(JSON.stringify(value)) as Json,
                  created_at: new Date(now).toISOString(),
                  expires_at: new Date(now + TTL_MS).toISOString(),
                },
                { onConflict: 'user_id,operation,request_fingerprint' },
              )
              .abortSignal(signal),
          options.signal,
        );
        if (error) warn();
      } catch {
        throwIfAborted(options.signal);
        warn();
      }
    }
    throwIfAborted(options.signal);
    return { value, usage: summary() };
  } catch (error) {
    status = options.signal?.aborted ? 'cancelled' : 'failed';
    options.onUsage?.(summary());
    throw error;
  } finally {
    if (owner) {
      const usage = summary();
      try {
        const { error } = await storageRequest((signal) =>
          supabase
            .from('modul_ajar_ai_usage')
            .insert({
              user_id: owner,
              operation,
              request_fingerprint: fingerprint,
              cache_hit: cacheHit,
              status,
              attempts: JSON.parse(JSON.stringify(attempts)) as Json,
              input_tokens: usage.tokens.input,
              output_tokens: usage.tokens.output,
              reasoning_tokens: usage.tokens.reasoning,
              total_tokens: usage.tokens.total,
              latency_ms: usage.latencyMs,
            })
            .abortSignal(signal),
        );
        if (error && !options.signal?.aborted)
          options.onWarning?.('Ringkasan pemakaian AI belum tersimpan.');
      } catch {
        if (!options.signal?.aborted)
          options.onWarning?.('Ringkasan pemakaian AI belum tersimpan.');
      }
    }
  }
}
