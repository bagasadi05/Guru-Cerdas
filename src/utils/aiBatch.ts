import { generateOpenRouterJson } from '../services/openRouterService';

export interface StudentNoteInput {
  studentId: string;
  studentName: string;
  academicSummary: string;
}

interface BatchOptions {
  batchSize?: number;
  delayMs?: number;
  maxRetries?: number;
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
  const batchSize = opts.batchSize ?? 5;
  const delayMs = opts.delayMs ?? 2500;
  const maxRetries = opts.maxRetries ?? 4;

  const notes = new Map<string, string>();
  const batches: StudentNoteInput[][] = [];
  for (let i = 0; i < students.length; i += batchSize) {
    batches.push(students.slice(i, i + batchSize));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const compact = batch.map((s) => ({ id: s.studentId, nama: s.studentName, ringkasan: s.academicSummary.split('.')[0] }));
    const prompt = 'Buat catatan wali kelas SINGKAT (2-3 kalimat saja per siswa) untuk:\n' + JSON.stringify(compact) + '\n\nContoh output yang benar:\n"Ananda menunjukkan kemajuan baik dalam belajar. Terus tingkatkan semangat dan keaktifan di kelas."';

    let ok = false;
    for (let attempt = 1; attempt <= maxRetries && !ok; attempt++) {
      try {
        const parsed = await generateOpenRouterJson<{ notes: { studentId: string; teacherNote: string }[] }>(prompt, systemInstruction);
        (parsed.notes || []).forEach((item) => {
          let note = (item.teacherNote || '').replace(/\\n/g, ' ').trim();
          const sentences = note.split(/[.!?]+/).filter((x) => x.trim().length > 0);
          if (sentences.length > 3) note = sentences.slice(0, 3).join('. ').trim() + '.';
          if (note) notes.set(item.studentId, note);
        });
        ok = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRate = /429|sibuk|tidak tersedia|too many|rate/i.test(msg);
        if (attempt >= maxRetries) {
          console.warn('Batch catatan AI ' + (b + 1) + '/' + batches.length + ' gagal: ' + msg);
          break;
        }
        await sleep((isRate ? 5000 : 1500) * Math.pow(2, attempt - 1));
      }
    }

    batch.forEach((s) => {
      if (!notes.has(s.studentId)) {
        notes.set(s.studentId, 'Ananda ' + s.studentName + ' telah mengikuti seluruh kegiatan pembelajaran semester ini dengan baik. Tetap semangat belajar dan tingkatkan prestasi.');
      }
    });

    if (onProgress) onProgress(Math.min((b + 1) * batchSize, students.length), students.length);
    if (b < batches.length - 1) await sleep(delayMs);
  }

  return notes;
}