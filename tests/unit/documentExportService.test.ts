import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'token-123' } } })),
    },
  },
}));

import {
  DocumentExportError,
  fileNameFromDisposition,
  requestDocumentExport,
} from '../../src/services/documentExportService';

const request = {
  lessonPlanId: '7d1b8c1e-0000-4000-8000-000000000001',
  format: 'docx' as const,
  paperSize: 'F4' as const,
};

describe('requestDocumentExport', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends only the document ID, paper size, and variant with the session token', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Blob(['PK']), {
          status: 200,
          headers: {
            'Content-Disposition':
              "attachment; filename=\"Modul_Ajar_IPAS_Kelas4.docx\"; filename*=UTF-8''Modul_Ajar_IPAS_Kelas4.docx",
          },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestDocumentExport(request);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/document-export/docx');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-123' });
    expect(JSON.parse(init.body as string)).toEqual({
      lessonPlanId: request.lessonPlanId,
      paperSize: 'F4',
      variant: 'guru',
    });
    expect(result.fileName).toBe('Modul_Ajar_IPAS_Kelas4.docx');
  });

  it.each([
    [401, 'UNAUTHORIZED', 'UNAUTHORIZED', true],
    [403, 'FORBIDDEN', 'NOT_FOUND', false],
    [404, 'NOT_FOUND', 'NOT_FOUND', false],
    [429, 'RATE_LIMITED', 'RATE_LIMITED', true],
    [503, 'RENDERER_BUSY', 'RENDERER', true],
    [504, 'TIMEOUT', 'TIMEOUT', true],
  ])('maps HTTP %i (%s) to %s', async (status, serverCode, clientCode, retryable) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Pesan server', code: serverCode }), { status })),
    );

    const error = await requestDocumentExport(request).catch((e) => e);
    expect(error).toBeInstanceOf(DocumentExportError);
    expect(error.code).toBe(clientCode);
    expect(error.message).toBe('Pesan server');
    expect(error.retryable).toBe(retryable);
  });

  it('reports network failures separately', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = await requestDocumentExport(request).catch((e) => e);
    expect(error.code).toBe('NETWORK');
    expect(error.message).toMatch(/Koneksi terputus/);
  });

  it('falls back to a default message when the platform returns HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })));
    const error = await requestDocumentExport(request).catch((e) => e);
    expect(error.code).toBe('RENDERER');
    expect(error.message).toMatch(/Mesin pembuat dokumen/);
  });
});

describe('fileNameFromDisposition', () => {
  it('prefers the UTF-8 filename', () => {
    expect(
      fileNameFromDisposition(
        "attachment; filename=\"Modul_Ajar___Kelas4.pdf\"; filename*=UTF-8''Modul_Ajar_%D8%B9%D8%B1%D8%A8_Kelas4.pdf",
        'x.pdf',
      ),
    ).toBe('Modul_Ajar_عرب_Kelas4.pdf');
    expect(fileNameFromDisposition(null, 'fallback.pdf')).toBe('fallback.pdf');
  });
});
