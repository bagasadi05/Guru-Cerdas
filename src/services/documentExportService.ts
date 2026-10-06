import { supabase } from './supabase';
import type { ExportFormat, ExportVariant, PaperSize } from '../lib/modulAjarExport/types';

/**
 * Client for `POST /api/document-export/{pdf,docx}`.
 * Only the lesson plan ID travels to the server; the server reads the stored document.
 */

export type DocumentExportErrorCode =
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'RENDERER'
  | 'INVALID'
  | 'UNKNOWN';

const CLIENT_TIMEOUT_MS = 45_000;

const DEFAULT_MESSAGES: Record<DocumentExportErrorCode, string> = {
  NETWORK: 'Koneksi terputus. Periksa internet Anda, lalu coba lagi.',
  UNAUTHORIZED: 'Sesi Anda berakhir. Masuk kembali, lalu coba lagi.',
  NOT_FOUND: 'Dokumen tidak ditemukan atau bukan milik Anda.',
  TIMEOUT: 'Pembuatan dokumen terlalu lama. Coba lagi, atau pakai Cetak.',
  RATE_LIMITED: 'Terlalu banyak unduhan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.',
  RENDERER: 'Mesin pembuat dokumen sedang bermasalah. Coba lagi, atau pakai Cetak.',
  INVALID: 'Dokumen tidak dapat diekspor.',
  UNKNOWN: 'Dokumen gagal diunduh. Coba lagi.',
};

export class DocumentExportError extends Error {
  constructor(
    public readonly code: DocumentExportErrorCode,
    message: string = DEFAULT_MESSAGES[code],
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DocumentExportError';
  }

  get retryable(): boolean {
    return this.code !== 'NOT_FOUND' && this.code !== 'INVALID';
  }
}

export interface DocumentExportRequest {
  lessonPlanId: string;
  format: ExportFormat;
  paperSize: PaperSize;
  variant?: ExportVariant;
}

export interface DocumentExportResult {
  blob: Blob;
  fileName: string;
}

export function isServerDocumentExportEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_SERVER_DOCUMENT_EXPORT === 'true';
}

function mapServerCode(status: number, code: unknown): DocumentExportErrorCode {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'UNAUTHORIZED';
    case 'FORBIDDEN':
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'RENDERER_BUSY':
    case 'RENDERER_UNAVAILABLE':
    case 'RENDER_FAILED':
    case 'UPSTREAM_ERROR':
      return 'RENDERER';
    case 'INVALID_REQUEST':
    case 'EMPTY_DOCUMENT':
    case 'DOCUMENT_TOO_LARGE':
      return 'INVALID';
    default:
      break;
  }
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403 || status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 504) return 'TIMEOUT';
  if (status >= 500) return 'RENDERER';
  return 'UNKNOWN';
}

export function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Fall through to the plain filename parameter.
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  return plain?.[1] ?? fallback;
}

export async function requestDocumentExport(request: DocumentExportRequest): Promise<DocumentExportResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new DocumentExportError('UNAUTHORIZED');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`/api/document-export/${request.format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        lessonPlanId: request.lessonPlanId,
        paperSize: request.paperSize,
        variant: request.variant ?? 'guru',
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new DocumentExportError(
      error instanceof DOMException && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
    );
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) {
    let payload: { error?: unknown; code?: unknown } = {};
    try {
      payload = await response.json();
    } catch {
      // Non-JSON error page from the platform (e.g. function crash).
    }
    const code = mapServerCode(response.status, payload.code);
    const message = typeof payload.error === 'string' && payload.error ? payload.error : undefined;
    throw new DocumentExportError(code, message, response.status);
  }

  const blob = await response.blob();
  const fallbackName = `Modul_Ajar.${request.format}`;
  return {
    blob,
    fileName: fileNameFromDisposition(response.headers.get('Content-Disposition'), fallbackName),
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
