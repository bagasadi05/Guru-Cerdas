/**
 * Fonnte WhatsApp Gateway Service
 *
 * Sends WhatsApp notifications via the serverless proxy at /api/fonnte.
 * Token stays server-side — never exposed to client.
 */

import { logger } from './logger';

const FONNTE_PROXY_URL = '/api/fonnte';

export interface FonnteSendParams {
  target: string;
  message: string;
}

export async function sendWhatsApp(params: FonnteSendParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(FONNTE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: params.target, message: params.message }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let detail = body;
      try { const j = JSON.parse(body); detail = j.error || j.message || body; } catch {}
      logger.warn('Fonnte send failed', 'FonnteService', { status: response.status, detail });
      return { ok: false, error: detail };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('Fonnte network error', 'FonnteService', { error: msg });
    return { ok: false, error: msg };
  }
}

export interface InputNotificationParams {
  mode: string;
  teacherName: string;
  className: string;
  studentCount: number;
  quizName?: string;
  subject?: string;
  assessmentName?: string;
  violationDesc?: string;
}

function buildInputMessage(params: InputNotificationParams): string {
  const { mode, teacherName, className, studentCount } = params;

  switch (mode) {
    case 'quiz':
      return `📊 *${teacherName}* baru saja input poin kuis *${params.quizName || 'Kuis'}* untuk ${studentCount} siswa di kelas *${className}*.`;

    case 'subject_grade':
      return `📝 *${teacherName}* baru saja input nilai *${params.subject || ''}* - *${params.assessmentName || ''}* untuk ${studentCount} siswa di kelas *${className}*.`;

    case 'violation':
      return `⚠️ *${teacherName}* baru saja mencatat ${studentCount} pelanggaran *"${params.violationDesc || 'Pelanggaran'}"* di kelas *${className}*.`;

    default:
      return `📌 *${teacherName}* baru saja menginput data untuk ${studentCount} siswa di kelas *${className}*.`;
  }
}

export async function sendInputNotification(
  params: InputNotificationParams,
  adminPhone: string,
): Promise<boolean> {
  if (!adminPhone) return false;

  const message = buildInputMessage(params);
  const result = await sendWhatsApp({ target: adminPhone, message });

  if (result.ok) {
    logger.info('WhatsApp notification sent', 'FonnteService', { mode: params.mode, teacher: params.teacherName });
  }

  return result.ok;
}
