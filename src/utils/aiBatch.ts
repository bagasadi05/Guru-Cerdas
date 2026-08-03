import { generateGeminiJson } from '../services/geminiService';
import { getBackoffDelay, isRateLimitError, isTransientError } from './aiConfig';

export interface StudentNoteInput {
  studentId: string;
  studentName: string;
  academicSummary: string;
}

interface BatchOptions {
  /** Jumlah siswa per batch (default: 3 — lebih kecil untuk hindari rate limit) */
  batchSize?: number;
  /** Delay awal antar batch (default: 3000ms) */
  delayMs?: number;
  /** Maksimal retry per batch (default: 4) */
  maxRetries?: number;
  /** Adaptif: auto-small batch jika banyak error (default: true) */
  adaptive?: boolean;
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Generate short teacher report notes for many students WITHOUT overwhelming
 * the AI provider. Splits students into small sequential batches, spaces them
 * out, and retries each batch with exponential backoff on rate-limit (HTTP 429)
 * errors. Any student left without a note gets a safe fallback so bulk report
 * printing never fails wholesale.
 */
export async function generateTeacherNotesBatched(
  students: StudentNoteInput[],
  systemInstruction: string,
  onProgress?: (done: number, total: number) => void,
  opts: BatchOptions = {}
): Promise<Map<string, string>> {
  const initialBatchSize = opts.batchSize ?? 3;
  const initialDelay = opts.delayMs ?? 3000;
  const maxRetries = opts.maxRetries ?? 4;
  const adaptive = opts.adaptive ?? true;

  // Adaptive state: turunkan batch size jika banyak error
  let consecutiveErrors = 0;
  let currentBatchSize = initialBatchSize;
  let currentDelay = initialDelay;

  const notes = new Map<string, string>();
  const batches: StudentNoteInput[][] = [];
  for (let i = 0; i < students.length; i += currentBatchSize) {
    batches.push(students.slice(i, i + currentBatchSize));
  }

  let totalProcessed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const compact = batch.map((s) => ({ id: s.studentId, nama: s.studentName, ringkasan: s.academicSummary.split('.')[0] }));
    const prompt = 'Buat catatan wali kelas SINGKAT (2-3 kalimat saja per siswa) untuk:\n' + JSON.stringify(compact) + '\n\nContoh output yang benar:\n"Ananda menunjukkan kemajuan baik dalam belajar. Terus tingkatkan semangat dan keaktifan di kelas."';

    let ok = false;
    for (let attempt = 1; attempt <= maxRetries && !ok; attempt++) {
      try {
        const parsed = await generateGeminiJson<{ notes: { studentId: string; teacherNote: string }[] }>(prompt, systemInstruction);
        (parsed.notes || []).forEach((item) => {
          let note = (item.teacherNote || '').replace(/\\n/g, ' ').trim();
          const sentences = note.split(/[.!?]+/).filter((x) => x.trim().length > 0);
          if (sentences.length > 3) note = sentences.slice(0, 3).join('. ').trim() + '.';
          if (note) notes.set(item.studentId, note);
        });
        ok = true;
        if (adaptive) {
          consecutiveErrors = Math.max(0, consecutiveErrors - 1);
          if (consecutiveErrors === 0 && currentBatchSize < initialBatchSize) {
            currentBatchSize = Math.min(initialBatchSize, currentBatchSize + 1);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRate = isRateLimitError(err);
        const isTransient = isTransientError(err);

        if (adaptive && isRate) {
          consecutiveErrors++;
          if (consecutiveErrors >= 2) {
            currentBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
            currentDelay = Math.min(10000, currentDelay * 1.5);
          }
        }

        if (attempt >= maxRetries || !isTransient) {
          console.warn('[aiBatch] Batch ' + (b + 1) + '/' + batches.length + ' gagal setelah ' + attempt + ' percobaan: ' + msg);
          break;
        }

        const delay = getBackoffDelay(attempt, isRate ? 5000 : 1500);
        await sleep(delay);
      }
    }

    batch.forEach((s) => {
      if (!notes.has(s.studentId)) {
        notes.set(s.studentId, 'Ananda ' + s.studentName + ' telah mengikuti seluruh kegiatan pembelajaran semester ini dengan baik. Tetap semangat belajar dan tingkatkan prestasi.');
      }
    });

    totalProcessed += batch.length;
    if (onProgress) onProgress(totalProcessed, students.length);

    if (b < batches.length - 1) {
      await sleep(currentDelay);
    }
  }

  return notes;
}