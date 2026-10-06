import type { IncomingMessage, ServerResponse } from 'http';
import { authenticateRequest } from './_auth';
import {
  ExportDataError,
  buildExportFileName,
  contentDispositionAttachment,
  isExportVariant,
  isPaperSize,
  mapLessonPlanToExportData,
  type ExportFormat,
  type ExportVariant,
  type LessonPlanExportData,
  type LessonPlanRow,
  type PaperSize,
} from '../src/lib/modulAjarExport';

/**
 * Shared request pipeline for `POST /api/document-export/{pdf,docx}`.
 *
 * The client sends only `lessonPlanId` (plus paper size and variant). The row is
 * read with the caller's own JWT so Postgres RLS applies, and ownership is
 * checked again here before anything is rendered.
 */

export type ExportErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'EMPTY_DOCUMENT'
  | 'DOCUMENT_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'RENDERER_BUSY'
  | 'RENDERER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'RENDER_FAILED'
  | 'UPSTREAM_ERROR';

export class ExportHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ExportErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ExportHttpError';
  }
}

interface ExportRequest extends IncomingMessage {
  body?: unknown;
}

interface ExportResponse extends ServerResponse {
  status(statusCode: number): ExportResponse;
  json(jsonBody: unknown): void;
  send(body: string | Buffer): void;
}

export interface ExportRenderResult {
  body: Buffer;
  contentType: string;
}

export interface DocumentExportConfig {
  format: ExportFormat;
  /** Requests per user per minute on a single warm instance. */
  rateLimitPerMinute: number;
  render: (data: LessonPlanExportData) => Promise<ExportRenderResult>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 2_048;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, now = Date.now()): number {
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return 0;
  }
  if (entry.count >= limit) return Math.ceil((entry.resetAt - now) / 1000);
  entry.count += 1;
  return 0;
}

export function resetRateLimits(): void {
  rateLimitStore.clear();
}

export interface ParsedExportRequest {
  lessonPlanId: string;
  paperSize?: PaperSize;
  variant: ExportVariant;
}

export function parseExportRequestBody(raw: unknown): ParsedExportRequest {
  let body = raw;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) {
      throw new ExportHttpError(413, 'INVALID_REQUEST', 'Permintaan terlalu besar.');
    }
    try {
      body = JSON.parse(body);
    } catch {
      throw new ExportHttpError(400, 'INVALID_REQUEST', 'Format permintaan tidak valid.');
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ExportHttpError(400, 'INVALID_REQUEST', 'Format permintaan tidak valid.');
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    throw new ExportHttpError(413, 'INVALID_REQUEST', 'Permintaan terlalu besar.');
  }

  const { lessonPlanId, paperSize, variant } = body as Record<string, unknown>;
  if (typeof lessonPlanId !== 'string' || !UUID_PATTERN.test(lessonPlanId)) {
    throw new ExportHttpError(400, 'INVALID_REQUEST', 'ID dokumen tidak valid.');
  }
  if (paperSize !== undefined && !isPaperSize(paperSize)) {
    throw new ExportHttpError(400, 'INVALID_REQUEST', 'Ukuran kertas harus A4 atau F4.');
  }
  if (variant !== undefined && !isExportVariant(variant)) {
    throw new ExportHttpError(400, 'INVALID_REQUEST', 'Varian dokumen tidak valid.');
  }
  return { lessonPlanId, paperSize, variant: variant ?? 'guru' };
}

function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

export async function fetchOwnedLessonPlan(
  lessonPlanId: string,
  userId: string,
  accessToken: string,
): Promise<LessonPlanRow> {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) {
    throw new ExportHttpError(500, 'UPSTREAM_ERROR', 'Layanan ekspor belum dikonfigurasi.');
  }

  const query = new URLSearchParams({
    select: 'id,user_id,document_type,identity,components,generated_content',
    id: `eq.${lessonPlanId}`,
    deleted_at: 'is.null',
    limit: '1',
  });

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/lesson_plans?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ExportHttpError(502, 'UPSTREAM_ERROR', 'Gagal menghubungi database. Coba lagi.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new ExportHttpError(401, 'UNAUTHORIZED', 'Sesi berakhir. Silakan masuk kembali.');
  }
  if (!response.ok) {
    throw new ExportHttpError(502, 'UPSTREAM_ERROR', 'Gagal membaca dokumen dari database.');
  }

  const rows = (await response.json()) as LessonPlanRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) {
    throw new ExportHttpError(404, 'NOT_FOUND', 'Dokumen tidak ditemukan atau sudah dihapus.');
  }
  if (row.user_id !== userId) {
    throw new ExportHttpError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke dokumen ini.');
  }
  return row;
}

function sendError(res: ExportResponse, error: ExportHttpError): void {
  if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds));
  res.setHeader('Cache-Control', 'no-store');
  res.status(error.status).json({ error: error.message, code: error.code });
}

/** One JSON line per export attempt; Vercel log drains index these at info level. */
function auditLog(entry: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ event: 'document_export', ...entry }));
}

export function createDocumentExportHandler(config: DocumentExportConfig) {
  return async function handler(req: ExportRequest, res: ExportResponse): Promise<void> {
    const startedAt = Date.now();
    let userId: string | undefined;
    let lessonPlanId: string | undefined;

    try {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        throw new ExportHttpError(405, 'METHOD_NOT_ALLOWED', 'Metode tidak diizinkan.');
      }

      const token = bearerToken(req);
      const auth = await authenticateRequest(req, { allowDevWithoutAuth: false });
      if (!auth.authorized || !auth.userId || !token) {
        throw new ExportHttpError(401, 'UNAUTHORIZED', 'Sesi berakhir. Silakan masuk kembali.');
      }
      userId = auth.userId;

      const retryAfter = checkRateLimit(`${config.format}:${userId}`, config.rateLimitPerMinute);
      if (retryAfter > 0) {
        throw new ExportHttpError(429, 'RATE_LIMITED', 'Terlalu banyak permintaan ekspor. Tunggu sebentar.', retryAfter);
      }

      const request = parseExportRequestBody(req.body);
      lessonPlanId = request.lessonPlanId;

      const row = await fetchOwnedLessonPlan(request.lessonPlanId, userId, token);

      let data: LessonPlanExportData;
      try {
        data = mapLessonPlanToExportData(row, { paperSize: request.paperSize, variant: request.variant });
      } catch (error) {
        if (error instanceof ExportDataError) {
          throw new ExportHttpError(
            error.code === 'DOCUMENT_TOO_LARGE' ? 413 : 422,
            error.code,
            error.message,
          );
        }
        throw error;
      }

      const result = await config.render(data);
      const fileName = buildExportFileName(data.identity, config.format, data.variant);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', String(result.body.length));
      res.setHeader('Content-Disposition', contentDispositionAttachment(fileName));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(result.body);

      auditLog({
        outcome: 'success',
        format: config.format,
        userId,
        lessonPlanId,
        paperSize: data.paperSize,
        variant: data.variant,
        bytes: result.body.length,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const httpError =
        error instanceof ExportHttpError
          ? error
          : new ExportHttpError(500, 'RENDER_FAILED', 'Dokumen gagal dibuat. Coba lagi.');
      if (!(error instanceof ExportHttpError)) {
        console.error(`[document-export:${config.format}] unexpected failure`, error);
      }
      auditLog({
        outcome: 'failure',
        format: config.format,
        code: httpError.code,
        status: httpError.status,
        userId,
        lessonPlanId,
        durationMs: Date.now() - startedAt,
      });
      sendError(res, httpError);
    }
  };
}
