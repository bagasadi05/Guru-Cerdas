import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExportHttpError,
  createDocumentExportHandler,
  parseExportRequestBody,
  resetRateLimits,
  type DocumentExportConfig,
} from '../../api/_documentExport';

const LESSON_PLAN_ID = '7d1b8c1e-0000-4000-8000-000000000001';
const OWNER_ID = 'owner-user';

interface CapturedResponse {
  statusCode: number;
  headers: Record<string, string>;
  jsonBody?: { error: string; code: string };
  sentBody?: Buffer | string;
}

function makeReq(overrides: { method?: string; token?: string | null; body?: unknown } = {}) {
  const token = overrides.token === undefined ? 'valid-token' : overrides.token;
  return {
    method: overrides.method ?? 'POST',
    headers: {
      host: 'guru-cerdas.my.id',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: overrides.body ?? { lessonPlanId: LESSON_PLAN_ID, paperSize: 'A4' },
  } as never;
}

function makeRes() {
  const captured: CapturedResponse = { statusCode: 200, headers: {} };
  const res = {
    setHeader: (name: string, value: string) => {
      captured.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(body: CapturedResponse['jsonBody']) {
      captured.jsonBody = body;
    },
    send(body: Buffer | string) {
      captured.sentBody = body;
    },
  };
  return { res: res as never, captured };
}

function mockSupabase(rows: unknown[] | 'auth-fail', userId = OWNER_ID) {
  return vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.includes('/auth/v1/user')) {
      if (rows === 'auth-fail') return new Response('{}', { status: 401 });
      return new Response(JSON.stringify({ id: userId }), { status: 200 });
    }
    if (url.includes('/rest/v1/lesson_plans')) {
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

const storedRow = {
  id: LESSON_PLAN_ID,
  user_id: OWNER_ID,
  document_type: 'Modul Ajar',
  identity: { mapel: 'IPAS', kelas: '4' },
  components: { paperSize: 'F4' },
  generated_content: '<p>Isi modul</p>',
};

describe('createDocumentExportHandler', () => {
  let render: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createDocumentExportHandler>;

  beforeEach(() => {
    resetRateLimits();
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    render = vi.fn(async () => ({ body: Buffer.from('%PDF-1.7'), contentType: 'application/pdf' }));
    handler = createDocumentExportHandler({
      format: 'pdf',
      rateLimitPerMinute: 3,
      render: render as unknown as DocumentExportConfig['render'],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('streams the rendered file with attachment headers', async () => {
    vi.stubGlobal('fetch', mockSupabase([storedRow]));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);

    expect(captured.statusCode).toBe(200);
    expect(captured.headers['content-type']).toBe('application/pdf');
    expect(captured.headers['content-disposition']).toContain('filename="Modul_Ajar_IPAS_Kelas4.pdf"');
    expect(captured.headers['cache-control']).toBe('no-store');
    expect(captured.sentBody?.toString()).toBe('%PDF-1.7');
    expect(render.mock.calls[0][0]).toMatchObject({ paperSize: 'A4', variant: 'guru' });
  });

  it('queries lesson_plans with the caller token so RLS applies', async () => {
    const fetchMock = mockSupabase([storedRow]);
    vi.stubGlobal('fetch', fetchMock);
    await handler(makeReq(), makeRes().res);

    const restCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/rest/v1/'));
    expect(restCall?.[0]).toContain(`id=eq.${LESSON_PLAN_ID}`);
    expect(restCall?.[0]).toContain('deleted_at=is.null');
    expect((restCall?.[1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer valid-token' });
  });

  it('rejects requests without a session, even on localhost', async () => {
    vi.stubGlobal('fetch', mockSupabase([storedRow]));
    const { res, captured } = makeRes();
    await handler({ ...(makeReq({ token: null }) as object), headers: { host: 'localhost:3000' } } as never, res);
    expect(captured.statusCode).toBe(401);
    expect(captured.jsonBody?.code).toBe('UNAUTHORIZED');
    expect(render).not.toHaveBeenCalled();
  });

  it('refuses documents owned by another user', async () => {
    vi.stubGlobal('fetch', mockSupabase([{ ...storedRow, user_id: 'someone-else' }]));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(403);
    expect(render).not.toHaveBeenCalled();
  });

  it('returns 404 when RLS hides the row', async () => {
    vi.stubGlobal('fetch', mockSupabase([]));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(404);
    expect(captured.jsonBody?.code).toBe('NOT_FOUND');
  });

  it('returns 422 for a stored document without content', async () => {
    vi.stubGlobal('fetch', mockSupabase([{ ...storedRow, generated_content: null }]));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(422);
    expect(captured.jsonBody?.code).toBe('EMPTY_DOCUMENT');
  });

  it('only accepts POST', async () => {
    const { res, captured } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(captured.statusCode).toBe(405);
    expect(captured.headers.allow).toBe('POST');
  });

  it('rate limits per user', async () => {
    vi.stubGlobal('fetch', mockSupabase([storedRow]));
    for (let i = 0; i < 3; i += 1) await handler(makeReq(), makeRes().res);
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(429);
    expect(Number(captured.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('passes renderer errors through with their status and code', async () => {
    vi.stubGlobal('fetch', mockSupabase([storedRow]));
    render.mockRejectedValueOnce(new ExportHttpError(504, 'TIMEOUT', 'Pembuatan PDF melebihi batas waktu.'));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(504);
    expect(captured.jsonBody).toEqual({ error: 'Pembuatan PDF melebihi batas waktu.', code: 'TIMEOUT' });
  });

  it('hides unexpected renderer errors behind a generic message', async () => {
    vi.stubGlobal('fetch', mockSupabase([storedRow]));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render.mockRejectedValueOnce(new Error('chromium crashed at 0xdeadbeef'));
    const { res, captured } = makeRes();
    await handler(makeReq(), res);
    expect(captured.statusCode).toBe(500);
    expect(captured.jsonBody?.code).toBe('RENDER_FAILED');
    expect(captured.jsonBody?.error).not.toContain('0xdeadbeef');
  });
});

describe('parseExportRequestBody', () => {
  it('validates the ID, paper size, and variant', () => {
    expect(parseExportRequestBody({ lessonPlanId: LESSON_PLAN_ID })).toEqual({
      lessonPlanId: LESSON_PLAN_ID,
      paperSize: undefined,
      variant: 'guru',
    });
    expect(() => parseExportRequestBody({ lessonPlanId: '1 OR 1=1' })).toThrow(ExportHttpError);
    expect(() => parseExportRequestBody({ lessonPlanId: LESSON_PLAN_ID, paperSize: 'Letter' })).toThrow(
      ExportHttpError,
    );
    expect(() => parseExportRequestBody({ lessonPlanId: LESSON_PLAN_ID, variant: 'admin' })).toThrow(
      ExportHttpError,
    );
  });

  it('rejects raw HTML payloads by size', () => {
    expect(() =>
      parseExportRequestBody({ lessonPlanId: LESSON_PLAN_ID, html: '<p>x</p>'.repeat(1_000) }),
    ).toThrow(/terlalu besar/);
  });
});
