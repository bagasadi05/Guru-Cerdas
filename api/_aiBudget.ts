import type { IncomingMessage, ServerResponse } from 'http';

export type AiBudgetProfile = 'short' | 'long' | 'assessment' | 'review' | 'lesson';

export function aiBudget(profile: AiBudgetProfile, meetings = 1): {
  output: number;
  thinking: number;
  groqOutput: number;
} {
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

export function validBudget(body: Record<string, unknown>): boolean {
  return (
    (body.budgetProfile === undefined ||
      ['short', 'long', 'assessment', 'review', 'lesson'].includes(String(body.budgetProfile))) &&
    (body.meetings === undefined ||
      (typeof body.meetings === 'number' &&
        Number.isInteger(body.meetings) &&
        body.meetings >= 1 &&
        body.meetings <= 20))
  );
}

export function geminiConfig(body: {
  model: string;
  budgetProfile?: AiBudgetProfile;
  meetings?: number;
  generationConfig?: unknown;
}): unknown {
  if (!body.budgetProfile) return body.generationConfig;
  return geminiGenerationConfig(body.model, body.budgetProfile, body.meetings);
}

export function groqConfig(body: {
  model: string;
  budgetProfile?: AiBudgetProfile;
  meetings?: number;
  max_tokens?: number;
  response_format?: unknown;
}) {
  if (!body.budgetProfile)
    return {
      max_tokens: Math.min(32768, Math.max(1, Number(body.max_tokens) || 4096)),
      ...(body.response_format ? { response_format: body.response_format } : {}),
    };
  return {
    max_completion_tokens: aiBudget(body.budgetProfile, body.meetings).groqOutput,
    response_format: { type: 'json_object' },
    ...(body.model.startsWith('openai/gpt-oss')
      ? { reasoning_effort: 'low', include_reasoning: false }
      : {}),
  };
}

export function upstreamAbort(req: IncomingMessage, res: ServerResponse) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => {
    if (!res.writableEnded) controller.abort();
  };
  const timeout = setTimeout(abort, 55000);
  req.on?.('aborted', abort);
  res.on?.('close', close);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      req.off?.('aborted', abort);
      res.off?.('close', close);
    },
  };
}
