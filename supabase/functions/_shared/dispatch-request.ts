export type DispatchMode = 'all' | 'task-due-check' | 'scheduled-check' | 'instant' | 'test';
export interface DispatchBody {
  mode: DispatchMode; dryRun: boolean; event?: string; student_id?: string | null;
  subscriptionId?: string; payload?: { title: string; body: string };
}
export const dispatchCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate the internal dispatcher boundary before performing any work. */
export function parseDispatchBody(value: unknown): DispatchBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  const body = value as Record<string, unknown>;
  const mode = body.mode ?? 'all';
  if (typeof mode !== 'string' || !['all', 'task-due-check', 'scheduled-check', 'instant', 'test'].includes(mode)) throw new Error('Invalid mode');
  if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') throw new Error('dryRun must be boolean');
  const result: DispatchBody = { mode: mode as DispatchMode, dryRun: body.dryRun === true };
  if (mode === 'test') {
    if (typeof body.subscriptionId !== 'string' || !UUID.test(body.subscriptionId)) throw new Error('A subscriptionId is required for test mode');
    result.subscriptionId = body.subscriptionId;
  }
  if (mode === 'instant') {
    if (typeof body.event !== 'string' || !body.event.trim()) throw new Error('An event is required');
    if (body.student_id != null && (typeof body.student_id !== 'string' || !UUID.test(body.student_id))) throw new Error('Invalid student_id');
    const payload = body.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.title !== 'string' || !payload.title.trim()
      || typeof payload.body !== 'string' || !payload.body.trim()) throw new Error('A title and body are required');
    result.event = body.event;
    result.student_id = body.student_id as string | null | undefined;
    result.payload = { title: payload.title, body: payload.body };
  }
  return result;
}

/** Handle authenticated dispatch and return database failures as HTTP errors. */
export async function handleDispatchRequest(req: Request, deps: {
  authorize: (req: Request) => Promise<boolean>;
  configured: boolean;
  run: (body: DispatchBody) => Promise<Record<string, unknown>>;
}): Promise<Response> {
  const response = (value: unknown, status: number) => new Response(JSON.stringify(value), {
    status, headers: { ...dispatchCorsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: dispatchCorsHeaders });
  if (req.method !== 'POST') return response({ ok: false, error: 'Method not allowed' }, 405);
  try {
    if (!await deps.authorize(req)) return response({ ok: false, error: 'Unauthorized' }, 401);
    let body: DispatchBody;
    try { body = parseDispatchBody(await req.json()); }
    catch (error) { return response({ ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' }, 400); }
    if (!deps.configured) return response({ ok: false, error: 'VAPID keys not configured' }, 500);
    const stats = await deps.run(body);
    const failed = Number(stats.failedSends ?? 0) > 0;
    return response({ ok: !failed, dryRun: body.dryRun, stats }, failed ? 502 : 200);
  } catch (error) {
    console.error('dispatch-push failed:', error instanceof Error ? error.message : 'Unknown failure');
    return response({ ok: false, error: 'Dispatch failed; check server logs' }, 500);
  }
}
