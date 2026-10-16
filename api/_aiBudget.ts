import type { IncomingMessage, ServerResponse } from 'http';
import { aiBudget, geminiGenerationConfig, type AiBudgetProfile } from '../src/lib/aiRequestPolicy';
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
