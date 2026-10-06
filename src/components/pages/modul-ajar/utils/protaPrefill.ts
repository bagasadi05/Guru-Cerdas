/**
 * Hands one Prota row to the Modul Ajar form: the Perangkat Ajar page writes it,
 * and the form reads it once on mount so a reload does not apply it again.
 */

import type { FormState } from '../types';

const PREFILL_KEY = 'guru_cerdas_modul_ajar_prefill_from_prota';
const DEFAULT_JP_PER_MEETING = 2;

export interface ProtaRowForModulAjar {
  subject: string;
  gradeLevel: string;
  phase?: string;
  academicYear: string;
  curriculum: 'MERDEKA' | 'K13';
  semesterNumber: 1 | 2;
  learningObjectiveCode: string;
  learningObjectiveText: string;
  coreTopic: string;
  targetJp: number;
}

/** "Bab 3: Pecahan Senilai" → "Pecahan Senilai"; a bare "Bab 3" has no topic to offer. */
const stripChapterPrefix = (topic: string) => {
  const stripped = topic.replace(/^(bab|unit|tema)\s*\d+\s*[:.-]\s*/i, '').trim();
  return /^(bab|unit|tema)\s*\d+$/i.test(stripped) ? '' : stripped;
};

export function buildModulAjarPrefill(row: ProtaRowForModulAjar): Partial<FormState> {
  const gradeMatch = row.gradeLevel.match(/(\d{1,2})/);
  const grade = gradeMatch ? Number(gradeMatch[1]) : NaN;
  const objective = [row.learningObjectiveCode, row.learningObjectiveText].filter(Boolean).join(' ');

  return {
    mataPelajaran: row.subject,
    ...(grade >= 1 && grade <= 6 ? { kelas: String(grade) } : {}),
    ...(row.phase ? { fase: row.phase } : {}),
    topik: stripChapterPrefix(row.coreTopic) || row.learningObjectiveText,
    tahunAjaran: row.academicYear,
    semester: row.semesterNumber === 2 ? 'Genap' : 'Ganjil',
    documentType: row.curriculum === 'K13' ? 'RPP' : 'Modul Ajar',
    manualTujuanPembelajaran: objective,
    jpPerPertemuan: DEFAULT_JP_PER_MEETING,
    jumlahPertemuan: Math.max(1, Math.ceil((row.targetJp || DEFAULT_JP_PER_MEETING) / DEFAULT_JP_PER_MEETING)),
  };
}

export function writeModulAjarPrefill(row: ProtaRowForModulAjar): void {
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(buildModulAjarPrefill(row)));
  } catch (_err) {
    void _err;
  }
}

/**
 * Reads the pending prefill without removing it: state initializers may run twice in
 * StrictMode. Call `clearModulAjarPrefill` from an effect once it has been applied.
 */
export function peekModulAjarPrefill(): Partial<FormState> | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<FormState>) : null;
  } catch {
    return null;
  }
}

export function clearModulAjarPrefill(): void {
  try {
    sessionStorage.removeItem(PREFILL_KEY);
  } catch (_err) {
    void _err;
  }
}
