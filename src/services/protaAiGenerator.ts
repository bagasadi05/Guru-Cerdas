/**
 * @fileoverview Drafts Prota chapters and learning objectives (TP) with AI for a subject
 * and grade that has no bundled chapter list.
 *
 * The model only proposes content (element, TP, topic, relative weight). Hours are always
 * computed locally from the Kaldik with `scaleTopicsToTargetJp`, so the totals stay exact
 * no matter what the model answers.
 *
 * @module services/protaAiGenerator
 */

import { generateGeminiJson, type AiRequestOptions } from './geminiService';
import type { CurriculumType, PhaseType, ProtaItem } from '../types/perangkatAjar';
import { scaleTopicsToTargetJp, type PresetTopicDefinition } from '../data/defaultProtaPresets';

export interface AiProtaRequest {
  subject: string;
  gradeLevel: string;
  phase?: PhaseType | null;
  curriculum: CurriculumType;
}

export interface AiProtaTopics {
  semester1: PresetTopicDefinition[];
  semester2: PresetTopicDefinition[];
}

const MIN_TOPICS = 2;
const MAX_TOPICS = 10;
const MAX_TEXT = 300;

const SYSTEM_INSTRUCTION =
  'Anda membantu guru di Indonesia menyusun Program Tahunan. Jawab hanya dengan JSON sesuai format. ' +
  'Gunakan Bahasa Indonesia baku. Jangan mengarang nomor regulasi atau judul buku yang tidak Anda yakini.';

function buildPrompt(req: AiProtaRequest): string {
  const isK13 = req.curriculum === 'K13';
  const phaseText = req.phase ? `Fase ${req.phase}` : 'fase sesuai kelas';
  return [
    `Susun daftar materi satu tahun ajaran untuk mata pelajaran "${req.subject}", ${req.gradeLevel} (${phaseText}),`,
    isK13
      ? 'Kurikulum 2013: tiap materi memuat KI (element), kode KD (code, contoh "KD 3.1 / 4.1"), uraian KD (tp), dan materi pokok (topic).'
      : 'Kurikulum Merdeka: tiap materi memuat elemen CP (element), kode TP (code, contoh "TP 4.1"), uraian tujuan pembelajaran yang dapat diukur (tp), dan lingkup materi atau judul bab (topic).',
    'Bagi menjadi semester 1 (Juli–Desember) dan semester 2 (Januari–Juni), masing-masing 3 sampai 6 materi, berurutan dari yang mendasar.',
    'weight adalah bobot relatif jam (1 = rata-rata, 1.5 = butuh lebih banyak waktu, 0.5 = singkat).',
    'Format: {"semester1":[{"element":"","code":"","tp":"","topic":"","weight":1}],"semester2":[...]}',
  ].join('\n');
}

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';

function normalizeSemester(raw: unknown, semester: 1 | 2, codePrefix: string, offset: number): PresetTopicDefinition[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Jawaban AI tidak memuat daftar materi semester ${semester}.`);
  }
  const topics = raw
    .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}))
    .map((entry) => ({
      element: clean(entry.element),
      code: clean(entry.code),
      tp: clean(entry.tp),
      topic: clean(entry.topic),
      weight: Number(entry.weight),
    }))
    .filter((entry) => entry.tp || entry.topic)
    .slice(0, MAX_TOPICS);

  if (topics.length < MIN_TOPICS) {
    throw new Error(`Jawaban AI untuk semester ${semester} terlalu sedikit. Coba lagi.`);
  }

  return topics.map((entry, i) => ({
    element: entry.element || '-',
    code: entry.code || `${codePrefix} ${offset + i + 1}`,
    tp: entry.tp || entry.topic,
    topic: entry.topic || entry.tp,
    relativeWeight: Number.isFinite(entry.weight) ? Math.min(3, Math.max(0.5, entry.weight)) : 1,
  }));
}

/** Validates and cleans a raw model answer. Exported for tests. */
export function parseAiProtaTopics(raw: unknown, curriculum: CurriculumType): AiProtaTopics {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefix = curriculum === 'K13' ? 'KD' : 'TP';
  const semester1 = normalizeSemester(data.semester1, 1, prefix, 0);
  const semester2 = normalizeSemester(data.semester2, 2, prefix, semester1.length);
  return { semester1, semester2 };
}

export async function generateProtaTopicsWithAi(
  req: AiProtaRequest,
  options: AiRequestOptions = {}
): Promise<AiProtaTopics> {
  const raw = await generateGeminiJson<unknown>(buildPrompt(req), SYSTEM_INSTRUCTION, 'general', options);
  return parseAiProtaTopics(raw, req.curriculum);
}

/** Turns AI topics into Prota items whose hours match each semester's target exactly. */
export function aiTopicsToProtaItems(
  topics: AiProtaTopics,
  targetJpSem1: number,
  targetJpSem2: number
): ProtaItem[] {
  const sem1 = scaleTopicsToTargetJp(topics.semester1, 1, targetJpSem1, 0);
  const sem2 = scaleTopicsToTargetJp(topics.semester2, 2, targetJpSem2, sem1.length);
  return [...sem1, ...sem2];
}
